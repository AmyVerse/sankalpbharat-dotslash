import joblib
import numpy as np
import pandas as pd
from src.config import FORECAST_MODEL_PATH


class ForecastInferenceError(Exception):
    pass


# --------------------------------------------------
# LOAD MODEL ON STARTUP
# --------------------------------------------------
bundle = joblib.load(str(FORECAST_MODEL_PATH))

lgbm = bundle["lightgbm"]
cat = bundle["catboost"]
meta = bundle["meta_model"]
features = bundle["features"]


# --------------------------------------------------
# BUILD NEXT STEP FEATURES
# history_rows = list of dict rows
# --------------------------------------------------
def build_features(history_rows):
    df = pd.DataFrame(history_rows).sort_values("year").reset_index(drop=True)

    if len(df) < 5:
        raise ValueError("Need at least 5 historical rows")

    last = df.iloc[-1]
    prev = df.iloc[-2]

    row = {
        "year": int(last["year"]) + 1,
        "value_added": float(last["value_added"]),
        "employment": float(last["employment"]),
        "energy_total": float(last["energy_total"]),

        "ghg_lag_1": float(df.iloc[-1]["ghg"]),
        "ghg_lag_2": float(df.iloc[-2]["ghg"]),
        "ghg_lag_3": float(df.iloc[-3]["ghg"]),
        "ghg_lag_5": float(df.iloc[-5]["ghg"]),

        "va_lag_1": float(df.iloc[-1]["value_added"]),
        "va_lag_2": float(df.iloc[-2]["value_added"]),
        "va_lag_3": float(df.iloc[-3]["value_added"]),
        "va_lag_5": float(df.iloc[-5]["value_added"]),

        "en_lag_1": float(df.iloc[-1]["energy_total"]),
        "en_lag_2": float(df.iloc[-2]["energy_total"]),
        "en_lag_3": float(df.iloc[-3]["energy_total"]),
        "en_lag_5": float(df.iloc[-5]["energy_total"]),
    }

    ghg_vals = np.asarray(df["ghg"].values, dtype=float)

    row["ghg_roll_mean_3"] = float(ghg_vals[-3:].mean())
    row["ghg_roll_std_3"] = float(ghg_vals[-3:].std())

    row["ghg_roll_mean_5"] = float(ghg_vals[-5:].mean())
    row["ghg_roll_std_5"] = float(ghg_vals[-5:].std())

    row["ghg_yoy"] = (
        (last["ghg"] - prev["ghg"]) /
        (prev["ghg"] + 1e-9)
    )

    row["va_yoy"] = (
        (last["value_added"] - prev["value_added"]) /
        (prev["value_added"] + 1e-9)
    )

    row["en_yoy"] = (
        (last["energy_total"] - prev["energy_total"]) /
        (prev["energy_total"] + 1e-9)
    )

    row["log_value_added"] = np.log1p(last["value_added"])
    row["log_employment"] = np.log1p(last["employment"])
    row["log_energy_total"] = np.log1p(last["energy_total"])

    # exact reference encodings
    row["region_code"] = 0
    row["sector_code"] = 0
    row["year_idx"] = row["year"] - 1995

    X = pd.DataFrame([row])

    for col in features:
        if col not in X.columns:
            X[col] = 0.0

    X = X[features]
    return X, row["year"]


# --------------------------------------------------
# PREDICT ONE STEP
# --------------------------------------------------
def predict_one(history_rows):
    X, next_year = build_features(history_rows)

    p1 = float(lgbm.predict(X)[0])
    p2 = float(cat.predict(X)[0])

    meta_X = np.array([[p1, p2]])

    pred_log = float(meta.predict(meta_X)[0])
    pred_real = float(np.expm1(pred_log))

    return next_year, pred_real


# --------------------------------------------------
# MULTI YEAR FORECAST
# --------------------------------------------------
def forecast(history_rows, forecast_years):
    rows = history_rows.copy()
    outputs = []

    for _ in range(forecast_years):
        next_year, pred = predict_one(rows)

        outputs.append({
            "year": int(next_year),
            "forecast_ghg": pred
        })

        last = rows[-1]

        rows.append({
            "year": int(next_year),
            "value_added": float(last["value_added"]),
            "employment": float(last["employment"]),
            "ghg": float(pred),
            "energy_total": float(last["energy_total"])
        })

    return outputs


def load_model():
    return bundle


def predict_next_step(feature_row, model_bundle):
    local_lgbm = model_bundle["lightgbm"]
    local_cat = model_bundle["catboost"]
    local_meta = model_bundle["meta_model"]
    local_features = model_bundle["features"]

    X = feature_row.copy()
    for col in local_features:
        if col not in X.columns:
            X[col] = 0.0
    X = X[local_features]

    p1 = float(local_lgbm.predict(X)[0])
    p2 = float(local_cat.predict(X)[0])
    meta_X = np.array([[p1, p2]])
    pred_log = float(local_meta.predict(meta_X)[0])
    return float(np.expm1(pred_log))