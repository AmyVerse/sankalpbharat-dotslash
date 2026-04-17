# ESG Data Cleaning + Percentage-Based Prediction Service

This service combines:

1. Data cleaning APIs for CSV/XLS/XLSX uploads.
2. Scenario/forecast ML prediction APIs for a What-If engine.

The scenario pipeline now supports **percentage-based targets** for better stability and realism, then reconstructs absolute deltas during inference.

## Why Move to Percentage Targets

Absolute-target models can produce unstable magnitudes when baseline values vary widely.
Training on percentage deltas improves:

- numerical stability during optimization
- realism across small and large baseline entities
- trust and interpretability (relative effects are easier to reason about)

At inference time, percentage predictions are converted back into absolute changes using the request baselines.

## Current Architecture

- [api.py](api.py): compatibility entrypoint exposing FastAPI app from `src/api.py`.
- [src/api.py](src/api.py): all API routes.
- [src/model_loader.py](src/model_loader.py): model registry + loading errors.
- [src/predictor.py](src/predictor.py): scenario/forecast inference logic.
- [src/schemas.py](src/schemas.py): request validation rules.
- [src/config.py](src/config.py): paths and service constants.
- [gradio_app.py](gradio_app.py): test UI for cleaning + prediction.
- [train_scenario_pct.py](train_scenario_pct.py): percentage-target training script.

## Scenario Dataset Schema (Final)

### Inputs

- `baseline_emissions_kg`
- `baseline_cost_usd`
- `action_type`
- `swap_tier_level`
- `supplier_cost_delta_pct`
- `supplier_emission_delta_pct`
- `regional_tax_penalty_pct`
- `affected_region_code`

### Training Targets

- `predicted_cost_change_pct`
- `predicted_emission_change_pct`

### Optional Derived Columns (Not Targets)

- `predicted_cost_change`
- `predicted_emission_change`

## Training: Percentage Model

Use [train_scenario_pct.py](train_scenario_pct.py).

What it does:

- uses the new input schema
- trains on percentage targets only
- keeps preprocessor + split + metrics/plots workflow
- saves model artifact to `models/scenario_model_pct.pkl`
- writes metrics and evaluation plots to `cleaned_outputs/`

Run example:

```bash
python train_scenario_pct.py --data path/to/scenario_training.csv
```

Output files:

- `models/scenario_model_pct.pkl`
- `cleaned_outputs/scenario_pct_metrics.json`
- `cleaned_outputs/scenario_pct_actual_vs_pred.png`

## Model Artifact Selection

In [src/config.py](src/config.py), the active scenario model path is:

1. `models/scenario_model_pct.pkl` if present
2. otherwise fallback to `models/scenario_model.pkl`

This keeps old deployments functional while enabling the new percentage model.

## Inference Behavior

Scenario inference in [src/predictor.py](src/predictor.py):

1. Normalize aliases and action enum.
2. Run model prediction.
3. If model output looks percentage-based, compute absolute values:
   - `predicted_cost_change = predicted_cost_change_pct * baseline_cost_usd`
   - `predicted_emission_change = predicted_emission_change_pct * baseline_emissions_kg`
4. If model output looks like legacy absolute values, return absolutes and back-compute pct values for compatibility.

## API Contracts

### `POST /predict/scenario`

Request body:

```json
{
  "features": {
    "baseline_emissions_kg": 1250,
    "baseline_cost_usd": 82000,
    "action_type": "SUPPLIER_SWAP",
    "swap_tier_level": 2,
    "supplier_cost_delta_pct": -0.06,
    "supplier_emission_delta_pct": -0.04,
    "regional_tax_penalty_pct": 0.02,
    "affected_region_code": 3
  }
}
```

Response body:

```json
{
  "status": "success",
  "predictions": {
    "predicted_cost_change_pct": -0.06,
    "predicted_cost_change": -4920,
    "predicted_emission_change_pct": -0.04,
    "predicted_emission_change": -50
  }
}
```

### `POST /predict/forecast`

Remains backward-compatible with the previous generic numeric feature payload and returns `next_emission`.

### Health and Metadata

- `GET /health`: liveness + `models_loaded`.
- `GET /meta`: loaded models and detailed model load errors.

## Validation Rules (Scenario)

Implemented in [src/schemas.py](src/schemas.py):

- required fields must be present
- `action_type` must be one of:
  - `SUPPLIER_SWAP`
  - `POLICY_CHANGE`
  - `MIXED`
- percentage fields must be numeric and in sensible range `[-1.0, 1.0]`
- feature values must be scalar types

## Backward Compatibility

Scenario alias mapping is supported for old clients:

- `supplier_cost_delta` -> `supplier_cost_delta_pct`
- `supplier_emission_idx_delta` -> `supplier_emission_delta_pct`
- `regional_tax_penalty` -> `regional_tax_penalty_pct`

This mapping is supported in validation and inference normalization.

Legacy model behavior compatibility:

- If old `scenario_model.pkl` is active and emits absolute values, API still responds with both pct + absolute outputs.

## Gradio Integration

Scenario defaults in [gradio_app.py](gradio_app.py) are updated to percentage-input schema.

Run:

```bash
python gradio_app.py
```

## Setup and Run

Install dependencies:

```bash
pip install -r requirements.txt
```

Run API:

```bash
uvicorn api:app --host 127.0.0.1 --port 8000 --reload
```

## Migration Notes

1. Train and export new model as `models/scenario_model_pct.pkl`.
2. Keep old `models/scenario_model.pkl` during transition.
3. Move clients to new pct input field names.
4. Keep aliases enabled until all old clients are migrated.
5. Verify via `/meta` that active scenario model loads correctly.

## Quick Verification

```bash
curl -X POST "http://127.0.0.1:8000/predict/scenario" \
  -H "Content-Type: application/json" \
  -d '{"features":{"baseline_emissions_kg":1250,"baseline_cost_usd":82000,"action_type":"SUPPLIER_SWAP","swap_tier_level":2,"supplier_cost_delta_pct":-0.06,"supplier_emission_delta_pct":-0.04,"regional_tax_penalty_pct":0.02,"affected_region_code":3}}'
```

Expected: success response with both percentage and absolute prediction fields.
