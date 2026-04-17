from typing import Any, Dict

from pydantic import BaseModel, Field, field_validator


class FeaturesPayload(BaseModel):
    features: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("features")
    @classmethod
    def validate_features(cls, value: Dict[str, Any]) -> Dict[str, Any]:
        if not value:
            raise ValueError("features must be a non-empty object")
        for key, item in value.items():
            if not isinstance(item, (int, float, str, bool)):
                raise ValueError(f"feature '{key}' must be a scalar value")
        return value
