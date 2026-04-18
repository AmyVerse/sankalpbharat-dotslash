from typing import Any, Dict

import pandas as pd

from src.forecast_inference import ForecastInferenceError, load_model as load_forecast_model, predict_next_step
from src.model_loader import ModelRegistry
from src.utils import to_json_safe


ACTION_TYPE_VALUES = {"SUPPLIER_SWAP", "POLICY_CHANGE", "MIXED"}
SCENARIO_FIELD_ALIASES = {
    "supplier_cost_delta": "supplier_cost_delta_pct",
    "supplier_emission_idx_delta": "supplier_emission_delta_pct",
    "regional_tax_penalty": "regional_tax_penalty_pct",
}

SCENARIO_REVERSE_ALIASES = {
    "supplier_cost_delta_pct": "supplier_cost_delta",
    "supplier_emission_delta_pct": "supplier_emission_idx_delta",
    "regional_tax_penalty_pct": "regional_tax_penalty",
}


class PredictionError(Exception):
    pass


def _predict_with_model(model: Any, features: Dict[str, Any]) -> Any:
    input_df = pd.DataFrame([features])
    if hasattr(model, "predict"):
        return model.predict(input_df)
    if callable(model):
        return model(input_df)
    raise PredictionError("Loaded model object is not callable and has no predict method")


def _normalize_scenario_features(features: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(features)
    for old_name, new_name in SCENARIO_FIELD_ALIASES.items():
        if new_name not in normalized and old_name in normalized:
            normalized[new_name] = normalized[old_name]

    # Also populate legacy column names so old pickled pipelines still work.
    for new_name, old_name in SCENARIO_REVERSE_ALIASES.items():
        if old_name not in normalized and new_name in normalized:
            normalized[old_name] = normalized[new_name]

    action_type = str(normalized.get("action_type", "")).upper()
    if action_type not in ACTION_TYPE_VALUES:
        raise PredictionError(
            "feature 'action_type' must be one of: SUPPLIER_SWAP, POLICY_CHANGE, MIXED"
        )
    normalized["action_type"] = action_type
    return normalized


def predict_scenario(features: Dict[str, Any], registry: ModelRegistry) -> Dict[str, float]:
    model = registry.get("scenario")
    if model is None:
        raise PredictionError(registry.get_error("scenario") or "scenario model is not loaded")

    normalized_features = _normalize_scenario_features(features)

    if "baseline_cost_usd" not in normalized_features or "baseline_emissions_kg" not in normalized_features:
        raise PredictionError("baseline_cost_usd and baseline_emissions_kg are required")

    baseline_cost = float(normalized_features["baseline_cost_usd"])
    baseline_emissions = float(normalized_features["baseline_emissions_kg"])

    raw = _predict_with_model(model, normalized_features)
    output = to_json_safe(raw)

    # Extract values: handle scalar, [x], or [[x, y]] model outputs.
    values: list[Any] = []
    if isinstance(output, list) and output:
        first = output[0]
        if isinstance(first, list):
            values = first
        else:
            values = output
    else:
        values = [output]

    if len(values) == 2:
        first = float(values[0])
        second = float(values[1])
    elif len(values) == 1:
        first = float(values[0])
        second = float(values[0])
    else:
        raise PredictionError("scenario prediction output format is unsupported")

    # Backward compatibility: if legacy absolute model is loaded, convert to pct.
    if abs(first) <= 1.5 and abs(second) <= 1.5:
        predicted_cost_change_pct = first
        predicted_emission_change_pct = second
        predicted_cost_change = predicted_cost_change_pct * baseline_cost
        predicted_emission_change = predicted_emission_change_pct * baseline_emissions
    else:
        predicted_cost_change = first
        predicted_emission_change = second
        predicted_cost_change_pct = (
            predicted_cost_change / baseline_cost if baseline_cost != 0 else 0.0
        )
        predicted_emission_change_pct = (
            predicted_emission_change / baseline_emissions if baseline_emissions != 0 else 0.0
        )

    return {
        "predicted_cost_change_pct": float(predicted_cost_change_pct),
        "predicted_cost_change": float(predicted_cost_change),
        "predicted_emission_change_pct": float(predicted_emission_change_pct),
        "predicted_emission_change": float(predicted_emission_change),
    }


def predict_forecast(features: Dict[str, Any], registry: ModelRegistry) -> Dict[str, float]:
    model = registry.get("forecast")
    if model is None:
        raise PredictionError(registry.get_error("forecast") or "forecast model is not loaded")

    # Legacy support: if the registered forecast artifact is a callable model, use the old path.
    if hasattr(model, "predict") or callable(model):
        raw = _predict_with_model(model, features)
        output = to_json_safe(raw)
        value: Any = output
        if isinstance(output, list) and output:
            first = output[0]
            if isinstance(first, list) and first:
                value = first[0]
            else:
                value = first
        return {"next_emission": float(value)}

    try:
        bundle = load_forecast_model()
        feature_row = pd.DataFrame([features])
        next_emission = predict_next_step(feature_row, bundle)
    except ForecastInferenceError as exc:
        raise PredictionError(str(exc)) from exc
    except Exception as exc:
        raise PredictionError(f"forecast prediction failed: {exc}") from exc

    return {"next_emission": float(next_emission)}
