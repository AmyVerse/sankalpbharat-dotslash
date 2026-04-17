from typing import Any

import numpy as np


def to_json_safe(value: Any) -> Any:
    if isinstance(value, (np.floating, float, int, np.integer)):
        return float(value)
    if isinstance(value, np.ndarray):
        return [to_json_safe(item) for item in value.tolist()]
    if isinstance(value, dict):
        return {k: to_json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_json_safe(item) for item in value]
    return value
