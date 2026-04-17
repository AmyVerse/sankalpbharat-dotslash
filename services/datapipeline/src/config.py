from pathlib import Path

SERVICE_NAME = "ESG ML Prediction Service"
SERVICE_VERSION = "1.1.0"

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
SCENARIO_MODEL_PCT_PATH = MODELS_DIR / "scenario_model_pct.pkl"
SCENARIO_MODEL_PATH = MODELS_DIR / "scenario_model.pkl"
FORECAST_MODEL_PATH = MODELS_DIR / "forecast_model.pkl"

SCENARIO_MODEL_ACTIVE_PATH = (
	SCENARIO_MODEL_PCT_PATH if SCENARIO_MODEL_PCT_PATH.exists() else SCENARIO_MODEL_PATH
)

OUTPUT_DIR = BASE_DIR / "cleaned_outputs"
OUTPUT_DIR.mkdir(exist_ok=True)
