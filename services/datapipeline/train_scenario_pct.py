from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import List

import joblib
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

INPUT_FEATURES: List[str] = [
    "baseline_emissions_kg",
    "baseline_cost_usd",
    "action_type",
    "swap_tier_level",
    "supplier_cost_delta_pct",
    "supplier_emission_delta_pct",
    "regional_tax_penalty_pct",
    "affected_region_code",
]

TARGET_COLUMNS: List[str] = [
    "predicted_cost_change_pct",
    "predicted_emission_change_pct",
]

CATEGORICAL_FEATURES = ["action_type"]
NUMERIC_FEATURES = [c for c in INPUT_FEATURES if c not in CATEGORICAL_FEATURES]


def _build_pipeline() -> Pipeline:
    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, NUMERIC_FEATURES),
            ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ]
    )

    # Tree depth / leaf settings provide regularization for stable percentage outputs.
    model = MultiOutputRegressor(
        RandomForestRegressor(
            n_estimators=400,
            max_depth=10,
            min_samples_leaf=3,
            random_state=42,
            n_jobs=-1,
        )
    )

    return Pipeline(steps=[("prep", preprocessor), ("model", model)])


def _validate_dataset(df: pd.DataFrame) -> None:
    missing_inputs = sorted(set(INPUT_FEATURES) - set(df.columns))
    missing_targets = sorted(set(TARGET_COLUMNS) - set(df.columns))

    if missing_inputs:
        raise ValueError(f"Dataset missing required input columns: {missing_inputs}")
    if missing_targets:
        raise ValueError(f"Dataset missing required target columns: {missing_targets}")


def _save_metrics_report(y_true: pd.DataFrame, y_pred: pd.DataFrame, output_dir: Path) -> None:
    metrics = {}
    for col in TARGET_COLUMNS:
        metrics[col] = {
            "mae": float(mean_absolute_error(y_true[col], y_pred[col])),
            "rmse": float(mean_squared_error(y_true[col], y_pred[col]) ** 0.5),
            "r2": float(r2_score(y_true[col], y_pred[col])),
        }

    metrics_path = output_dir / "scenario_pct_metrics.json"
    metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")


def _save_eval_plots(y_true: pd.DataFrame, y_pred: pd.DataFrame, output_dir: Path) -> None:
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    for idx, col in enumerate(TARGET_COLUMNS):
        ax = axes[idx]
        ax.scatter(y_true[col], y_pred[col], alpha=0.45, s=18)
        mn = min(y_true[col].min(), y_pred[col].min())
        mx = max(y_true[col].max(), y_pred[col].max())
        ax.plot([mn, mx], [mn, mx], linestyle="--")
        ax.set_title(f"Actual vs Predicted: {col}")
        ax.set_xlabel("Actual")
        ax.set_ylabel("Predicted")

    plt.tight_layout()
    fig.savefig(output_dir / "scenario_pct_actual_vs_pred.png", dpi=200)
    plt.close(fig)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train percentage-based scenario model")
    parser.add_argument("--data", required=True, help="Path to training dataset CSV")
    parser.add_argument(
        "--output-model",
        default="models/scenario_model_pct.pkl",
        help="Where to save the trained model",
    )
    parser.add_argument(
        "--output-dir",
        default="cleaned_outputs",
        help="Directory for metrics and plots",
    )
    parser.add_argument("--test-size", type=float, default=0.2)
    args = parser.parse_args()

    data_path = Path(args.data)
    output_model = Path(args.output_model)
    output_dir = Path(args.output_dir)
    output_model.parent.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(data_path)
    _validate_dataset(df)

    X = df[INPUT_FEATURES].copy()
    y = df[TARGET_COLUMNS].copy()

    # Keep optional derived absolute columns out of training targets.
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=args.test_size,
        random_state=42,
    )

    pipeline = _build_pipeline()
    pipeline.fit(X_train, y_train)

    y_pred_np = pipeline.predict(X_test)
    y_pred = pd.DataFrame(y_pred_np, columns=TARGET_COLUMNS, index=y_test.index)

    _save_metrics_report(y_test, y_pred, output_dir)
    _save_eval_plots(y_test, y_pred, output_dir)

    joblib.dump(pipeline, output_model)
    print(f"Saved percentage-based scenario model to: {output_model}")
    print(f"Saved metrics and plots to: {output_dir}")


if __name__ == "__main__":
    main()
