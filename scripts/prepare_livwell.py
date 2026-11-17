"""Export yearly LivWell region profiles with country-year z-scores."""

import argparse
import json
import math
import re
import sys
from pathlib import Path

import geopandas as gpd
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public" / "data"
YEARS = range(1990, 2020)
REGION_KEYS = ["country_code", "region_num_harmonized"]
INDICATORS = {
    "WL_wealth_mean": "household_wealth",
    "HL_health_insur_p": "health_insurance_coverage",
    "drought_spei03_n1_share12": "drought_month_share_12m",
    "DP_decide_health_p": "health_decision_participation",
    "ED_litt_p": "literacy",
    "EI_elec_p": "household_electricity",
    "HH_water_high_p": "household_high_quality_water",
    "HH_toilet_high_p": "household_high_quality_toilet",
    "WK_working_p": "women_currently_working",
    "RH_contr_modern_p": "modern_contraceptive_use",
}


def compute_zscores(df, fields, flip):
    """Return aligned score columns, using available regions and population std."""
    groups = df.groupby(["country_code", "year"])[list(fields)]
    std = groups.transform("std", ddof=0)
    valid = (groups.transform("count") >= 2) & (std > 0)
    scores = (df[list(fields)] - groups.transform("mean")) / std.where(valid)
    scores[list(flip)] *= -1
    return scores


def survey_years(raw_df) -> dict[str, list[int]]:
    """Collect distinct survey years for each country without mutating input."""
    return {
        str(code): sorted({int(y) for y in group["year"].dropna()})
        for code, group in raw_df.dropna(subset=["country_code"]).groupby("country_code")
    }


def rounded(value, digits=3):
    if isinstance(value, dict):
        return {k: rounded(v, digits) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [rounded(v, digits) for v in value]
    if isinstance(value, float):
        return round(value, digits) if math.isfinite(value) else None
    return value


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")


def prepare_livwell(source_dir: Path, output_dir: Path) -> None:
    observations = pd.read_csv(
        source_dir / "livwell_lin_interpolated.csv",
        usecols=[*REGION_KEYS, "country_name", "region_name_harmonized", "year", *INDICATORS],
        dtype={"country_code": "string", "region_num_harmonized": "Int64"},
    )
    observations = observations.loc[observations["year"].isin(YEARS)].rename(
        columns={**INDICATORS, "region_name_harmonized": "region_name"}
    )
    if observations[REGION_KEYS].isna().any().any():
        raise ValueError("LivWell observations contain missing region identifiers.")
    if observations.duplicated([*REGION_KEYS, "year"]).any():
        raise ValueError("LivWell observations contain duplicate country-region-year rows.")
    fields = list(INDICATORS.values())
    observations[fields] = observations[fields].apply(pd.to_numeric)
    observations["region_id"] = observations["country_code"] + "-" + observations["region_num_harmonized"].astype(str)
    observations = observations.sort_values(["region_id", "year"]).reset_index(drop=True)
    scores = compute_zscores(observations, fields, ["drought_month_share_12m"])
    surveys = survey_years(pd.read_csv(source_dir / "livwell.csv", usecols=["country_code", "year"]))
    boundaries = gpd.read_file(source_dir / "harmonized_boundaries.gpkg", layer="harmonized_boundaries", columns=REGION_KEYS)
    boundaries["region_num_harmonized"] = boundaries["region_num_harmonized"].astype("Int64")
    boundaries = boundaries.dropna(subset=[*REGION_KEYS, "geometry"])
    boundaries = boundaries.loc[~boundaries.geometry.is_empty].copy()
    boundaries.geometry = boundaries.geometry.make_valid()
    boundaries = boundaries.dissolve(by=REGION_KEYS, as_index=False).to_crs("EPSG:4326")
    metadata = observations.drop_duplicates(REGION_KEYS)[[*REGION_KEYS, "region_id", "region_name", "country_name"]]
    regions = boundaries.merge(metadata, on=REGION_KEYS, how="inner", validate="one_to_one")
    if set(observations.region_id) != set(regions.region_id):
        missing_ids = sorted(set(observations.region_id) - set(regions.region_id))
        print(f"Omitting regions without boundaries: {missing_ids}", file=sys.stderr)
    countries = []
    for code, group in regions.groupby("country_code"):
        countries.append(dict(code=str(code), name=group.country_name.iloc[0], surveyYears=surveys.get(str(code), []), bbox=group.total_bounds.tolist()))
    regions.geometry = regions.geometry.simplify(0.01, preserve_topology=True)
    regions = regions[["region_id", "region_name", "country_code", "country_name", "geometry"]].sort_values("region_id")
    geometry = rounded(json.loads(regions.to_json(drop_id=True)), 4)
    descriptions = pd.read_csv(source_dir / "indicators.csv").set_index("indicator_code").indicator_description.to_dict()
    labels = dict(re.findall(r'([a-z_0-9]+): "([^"\n]+)"', (ROOT / "components" / "metrics.ts").read_text()))
    indicators = [dict(key=key, code=code, label=labels[key], description=descriptions[code], unit="index" if key == "household_wealth" else "share" if key == "drought_month_share_12m" else "%", higherIsBetter=key != "drought_month_share_12m") for code, key in INDICATORS.items()]
    baselines = {}
    for (country, year), means in observations.groupby(["country_code", "year"])[fields].mean().iterrows():
        baselines.setdefault(str(country), {})[int(year)] = means.to_dict()
    region_ids = set(regions.region_id)
    records = [dict(id=row.region_id, y=int(row.year), m=int(row.year) in surveys.get(str(row.country_code), []), v={key: getattr(row, key) for key in fields}, z=scores.iloc[i].to_dict()) for i, row in enumerate(observations.itertuples(index=False)) if row.region_id in region_ids]
    payload = rounded(dict(years=list(YEARS), indicators=indicators, countries=countries, baselines=baselines, records=records))
    output_dir.mkdir(parents=True, exist_ok=True)
    write_json(output_dir / "regions.geojson", geometry)
    write_json(output_dir / "values.json", payload)
    for stale in [output_dir / "mock-regions.geojson", *output_dir.glob("data_*.geojson")]:
        stale.unlink(missing_ok=True)
    print(f"Exported {len(regions)} regions and {len(records)} region-years")
    for name in ["regions.geojson", "values.json"]:
        print(f"{name}: {(output_dir / name).stat().st_size:,} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=ROOT / "LivWell")
    parser.add_argument("--output-dir", type=Path, default=DATA_DIR)
    args = parser.parse_args()
    prepare_livwell(args.source_dir, args.output_dir)
