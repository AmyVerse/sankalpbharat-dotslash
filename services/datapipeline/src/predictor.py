from typing import Any, Dict

import pandas as pd

from src.model_loader import ModelRegistry
from src.utils import to_json_safe


class PredictionError(Exception):
    pass


def _predict_with_model(model: Any, features: Dict[str, Any]) -> Any:
    input_df = pd.DataFrame([features])
    if hasattr(model, "predict"):
        return model.predict(input_df)
    if callable(model):
        return model(input_df)
    raise PredictionError("Loaded model object is not callable and has no predict method")


def predict_scenario(features: Dict[str, Any], registry: ModelRegistry) -> Dict[str, float]:
    model = registry.get("scenario")
    if model is None:
        raise PredictionError(registry.get_error("scenario") or "scenario model is not loaded")

    raw = _predict_with_model(model, features)
    output = to_json_safe(raw)

    # Supports scalar, [x], or [x, y, z] model outputs.
    if isinstance(output, list) and output:
        first = output[0]
        if isinstance(first, list):
            values = first
        else:
            values = output
    else:
        values = [output]

    if len(values) >= 3:
        predicted_cost_change, predicted_emission_change, predicted_energy_change = values[0], values[1], values[2]
    elif len(values) == 2:
        predicted_cost_change, predicted_emission_change = values[0], values[1]
        predicted_energy_change = 0.0
    elif len(values) == 1:
        predicted_cost_change = values[0]
        predicted_emission_change = values[0]
        predicted_energy_change = values[0]
    else:
        raise PredictionError("scenario prediction output format is unsupported")

    return {
        "predicted_cost_change": float(predicted_cost_change),
        "predicted_emission_change": float(predicted_emission_change),
        "predicted_energy_change": float(predicted_energy_change),
    }


def predict_forecast(features: Dict[str, Any], registry: ModelRegistry) -> Dict[str, float]:
    model = registry.get("forecast")
    if model is None:
        raise PredictionError(registry.get_error("forecast") or "forecast model is not loaded")

    raw = _predict_with_model(model, features)
    output = to_json_safe(raw)

    if isinstance(output, list) and output:
        first = output[0]
        if isinstance(first, list) and first:
            value = first[0]
        else:
            value = first
    else:
        value = output

    return {"next_emission": float(value)}
