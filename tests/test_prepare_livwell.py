import numpy as np
import pandas as pd

from scripts.prepare_livwell import compute_zscores, survey_years


def test_country_year_population_scores_and_orientation():
    df = pd.DataFrame({"country_code": ["A"] * 6 + ["B"] * 3,
                       "year": [2000] * 3 + [2001] * 3 + [2000] * 3,
                       "wealth": [1, 2, 6, 20, 40, 90, 2, 9, 10],
                       "drought": [1, 2, 6, 20, 40, 90, 2, 9, 10]})
    scores = compute_zscores(df, ["wealth", "drought"], ["drought"])
    for indices in df.groupby(["country_code", "year"]).groups.values():
        group = scores.loc[indices]
        np.testing.assert_allclose(group.mean(), 0, atol=1e-12)
        np.testing.assert_allclose(group.std(ddof=0), 1)
    np.testing.assert_allclose(scores.drought, -scores.wealth)
    assert scores.drought.iloc[0] > 0


def test_single_constant_and_missing_values():
    df = pd.DataFrame({"country_code": ["A", "B", "B", "B"], "year": [2000] * 4,
                       "value": [10, 2, 4, np.nan], "constant": [2, 2, 2, 2],
                       "one_valid": [1, 2, np.nan, np.nan]})
    scores = compute_zscores(df, ["value", "constant", "one_valid"], [])
    assert scores.iloc[0].isna().all()
    assert scores.constant.isna().all()
    assert scores.one_valid.isna().all()
    assert pd.isna(scores.value.iloc[3])
    np.testing.assert_allclose(scores.value.iloc[1:3], [-1, 1])


def test_survey_years_sorted_unique_by_country():
    df = pd.DataFrame({"country_code": ["A", "A", "A", "B", "A"],
                       "year": [2002, 2000, 2002, 1999, np.nan]})
    assert survey_years(df) == {"A": [2000, 2002], "B": [1999]}
