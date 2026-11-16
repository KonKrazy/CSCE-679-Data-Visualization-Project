"""Export yearly LivWell region profiles with country-year z-scores."""

import argparse
import sys
from pathlib import Path

import geopandas as gpd
import pandas as pd


DATA_DIR = Path(__file__).resolve().parents[1] / "public" / "data"
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
    groups = observations.groupby(["country_code", "year"])[fields]
    means = groups.transform("mean")
    std_devs = groups.transform("std", ddof=0)
    # Each region contributes equally. Undefined z-scores become JSON null.
    deltas = (observations[fields] - means) / std_devs.where(std_devs > 0)
    observations = observations.join(deltas.add_suffix("_delta"))

    boundaries = gpd.read_file(
        source_dir / "harmonized_boundaries.gpkg",
        layer="harmonized_boundaries",
        columns=REGION_KEYS,
    ).to_crs("EPSG:4326")
    boundaries["region_num_harmonized"] = boundaries["region_num_harmonized"].astype("Int64")
    boundaries = boundaries.dropna(subset=[*REGION_KEYS, "geometry"])
    boundaries = boundaries.loc[~boundaries.geometry.is_empty].copy()
    boundaries.geometry = boundaries.geometry.make_valid()
    # A harmonized region can have multiple boundary records across surveys.
    boundaries = boundaries.dissolve(by=REGION_KEYS, as_index=False)

    joined = observations.merge(boundaries, on=REGION_KEYS, how="left", validate="many_to_one")
    missing = joined["geometry"].isna()
    if missing.any():
        print(
            f"{missing.sum()} region-year rows lack boundaries and will have null geometry.",
            file=sys.stderr,
        )
    joined["region_id"] = joined["country_code"] + "-" + joined["region_num_harmonized"].astype(str)
    features = gpd.GeoDataFrame(joined, geometry="geometry", crs=boundaries.crs)

    output_dir.mkdir(parents=True, exist_ok=True)
    for year in YEARS:
        yearly = features.loc[features["year"].eq(year)].sort_values("region_id")
        (output_dir / f"data_{year}.geojson").write_text(
            yearly.to_json(na="null", drop_id=True, ensure_ascii=False),
            encoding="utf-8",
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=DATA_DIR / "LivWell")
    parser.add_argument("--output-dir", type=Path, default=DATA_DIR)
    args = parser.parse_args()
    prepare_livwell(args.source_dir, args.output_dir)
