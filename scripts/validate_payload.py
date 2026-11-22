"""Check a deterministic random sample against source CSV using plain NumPy."""
import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]


def validate(source_dir, output_dir):
    payload = json.loads((output_dir / "values.json").read_text())
    geometry = json.loads((output_dir / "regions.geojson").read_text())
    ids = {feature["properties"]["region_id"] for feature in geometry["features"]}
    errors = [f"Missing geometry: {record['id']}" for record in payload["records"] if record["id"] not in ids]
    indicators = payload["indicators"]
    source = pd.read_csv(source_dir / "livwell_lin_interpolated.csv",
                         usecols=["country_code", "region_num_harmonized", "year", *[i["code"] for i in indicators]])
    source["id"] = source.country_code + "-" + source.region_num_harmonized.astype(int).astype(str)
    indexed = source.set_index(["id", "year"])
    count = len(payload["records"]) * len(indicators)
    samples = np.random.default_rng(679).choice(count, size=min(200, count), replace=False)
    for sample in samples:
        record = payload["records"][int(sample) // len(indicators)]
        indicator = indicators[int(sample) % len(indicators)]
        row = indexed.loc[(record["id"], record["y"])]
        values = source.loc[(source.country_code == row.country_code) & (source.year == record["y"]), indicator["code"]].to_numpy(dtype=float)
        values = values[np.isfinite(values)]
        x = row[indicator["code"]]
        std = np.std(values, ddof=0) if len(values) else 0
        expected = None if len(values) < 2 or std == 0 or not np.isfinite(x) else float((x - np.mean(values)) / std)
        if expected is not None and not indicator["higherIsBetter"]:
            expected = -expected
        actual = record["z"][indicator["key"]]
        if (expected is None) != (actual is None) or (expected is not None and (not np.isfinite(actual) or abs(expected - actual) > 1e-2)):
            errors.append(f"{record['id']} {record['y']} {indicator['key']}: expected {expected}, got {actual}")
    print(f"Checked {len(samples)} random z-scores and {len(payload['records'])} record geometry references: {len(errors)} mismatches")
    for error in errors[:20]:
        print(error)
    return bool(errors)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=ROOT / "LivWell")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "public" / "data")
    args = parser.parse_args()
    raise SystemExit(validate(args.source_dir, args.output_dir))
