from typing import Any, Dict

from pydantic import BaseModel, Field, field_validator


SCENARIO_REQUIRED_FIELDS = {
    "baseline_emissions_kg",
    "baseline_cost_usd",
    "action_type",
    "swap_tier_level",
    "supplier_cost_delta_pct",
    "supplier_emission_delta_pct",
    "regional_tax_penalty_pct",
    "affected_region_code",
}

SCENARIO_FIELD_ALIASES = {
    "supplier_cost_delta": "supplier_cost_delta_pct",
    "supplier_emission_idx_delta": "supplier_emission_delta_pct",
    "regional_tax_penalty": "regional_tax_penalty_pct",
}

ACTION_TYPE_VALUES = {"SUPPLIER_SWAP", "POLICY_CHANGE", "MIXED"}
PERCENTAGE_FIELDS = {
    "supplier_cost_delta_pct",
    "supplier_emission_delta_pct",
    "regional_tax_penalty_pct",
}
MIN_PCT = -1.0
MAX_PCT = 1.0


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
    @field_validator("features")
    @classmethod
    def validate_scenario_features(cls, value: Dict[str, Any]) -> Dict[str, Any]:
        normalized = dict(value)
        for old_name, new_name in SCENARIO_FIELD_ALIASES.items():
            if new_name not in normalized and old_name in normalized:
                normalized[new_name] = normalized[old_name]

        missing = sorted(SCENARIO_REQUIRED_FIELDS - set(normalized.keys()))
        if missing:
            raise ValueError(f"missing required fields: {missing}")

        action_type = str(normalized["action_type"]).upper()
        if action_type not in ACTION_TYPE_VALUES:
            raise ValueError(
                "feature 'action_type' must be one of: SUPPLIER_SWAP, POLICY_CHANGE, MIXED"
            )

        for pct_key in PERCENTAGE_FIELDS:
            pct_val = normalized[pct_key]
            if not isinstance(pct_val, (int, float)):
                raise ValueError(f"feature '{pct_key}' must be numeric")
            if not (MIN_PCT <= float(pct_val) <= MAX_PCT):
                raise ValueError(
                    f"feature '{pct_key}' must be between {MIN_PCT} and {MAX_PCT}"
                )

        return value
