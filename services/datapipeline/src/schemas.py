from typing import Any, Dict, List
from pydantic import BaseModel, Field, field_validator


ACTION_TYPE_VALUES = {"SUPPLIER_SWAP", "POLICY_CHANGE", "MIXED"}
SCENARIO_FIELD_ALIASES = {
    "supplier_cost_delta": "supplier_cost_delta_pct",
    "supplier_emission_idx_delta": "supplier_emission_delta_pct",
    "regional_tax_penalty": "regional_tax_penalty_pct",
}

class ForecastHistoryRow(BaseModel):
    year: int = Field(..., ge=1900, le=2200)
    value_added: float
    employment: float
    ghg: float
    energy_total: float

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


class ScenarioFeaturesPayload(FeaturesPayload):
    pass


class ForecastPayload(BaseModel):
    region: str = Field(..., min_length=1, max_length=16)
    sector: str = Field(..., min_length=1, max_length=128)
    history: List[ForecastHistoryRow] = Field(default_factory=list)
    forecast_years: int

    @field_validator("region", "sector")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be empty")
        return stripped
