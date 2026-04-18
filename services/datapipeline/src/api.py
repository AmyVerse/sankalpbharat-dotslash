import logging
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any, Dict
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from src.config import (
    FORECAST_MODEL_PATH,
    OUTPUT_DIR,
    SCENARIO_MODEL_ACTIVE_PATH,
    SERVICE_NAME,
    SERVICE_VERSION,
)
from dataclean import clean_file
from src.forecast_inference import forecast
from src.model_loader import ModelRegistry
from src.predictor import PredictionError, predict_forecast, predict_scenario
from src.schemas import FeaturesPayload, ForecastPayload, ScenarioFeaturesPayload

logging.basicConfig(level=logging.INFO)

app = FastAPI(title=SERVICE_NAME, version=SERVICE_VERSION)

CLEANING_JOBS: Dict[str, Dict[str, Any]] = {}
MODEL_REGISTRY = ModelRegistry(
    {
        "scenario": SCENARIO_MODEL_ACTIVE_PATH,
        "forecast": FORECAST_MODEL_PATH,
    }
)
MODEL_REGISTRY.load_all()


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"status": "ok", "models_loaded": MODEL_REGISTRY.models_loaded()}


@app.get("/meta")
def meta() -> Dict[str, Any]:
    return {
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
        "loaded_models": MODEL_REGISTRY.loaded_models(),
        "model_errors": MODEL_REGISTRY.missing_or_failed_models(),
    }


@app.post("/predict/scenario")
def predict_scenario_endpoint(payload: ScenarioFeaturesPayload) -> Dict[str, Any]:
    try:
        predictions = predict_scenario(payload.features, MODEL_REGISTRY)
    except PredictionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logging.exception("Unexpected scenario prediction error")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

    return {"status": "success", "predictions": predictions}


@app.post("/predict/forecast")
def predict_forecast_endpoint(payload: FeaturesPayload) -> Dict[str, Any]:
    try:
        prediction = predict_forecast(payload.features, MODEL_REGISTRY)
    except PredictionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logging.exception("Unexpected forecast prediction error")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

    return {"status": "success", "prediction": prediction}


@app.post("/forecast")
def forecast_endpoint(payload: ForecastPayload) -> Dict[str, Any]:
    try:
        history_rows = [row.model_dump() for row in payload.history]
        forecasts = forecast(history_rows, payload.forecast_years)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logging.exception("Unexpected forecast inference error")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

    return {
        "region": payload.region,
        "sector": payload.sector,
        "forecasts": forecasts,
    }


@app.post("/clean/upload")
async def clean_upload(
    file: UploadFile = File(...),
    dataset_type: str = Form("generic"),
) -> Dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    ext = Path(file.filename).suffix.lower()
    if ext not in {".csv", ".xlsx", ".xls"}:
        raise HTTPException(status_code=400, detail="Only CSV/XLS/XLSX files are supported")

    with NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(await file.read())
        tmp_path = Path(tmp.name)

    try:
        clean_df, report = clean_file(str(tmp_path), dataset_type=dataset_type)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Cleaning failed: {exc}") from exc
    finally:
        tmp_path.unlink(missing_ok=True)

    output_name = f"{Path(file.filename).stem}_cleaned.csv"
    job_id = str(uuid4())
    output_path = OUTPUT_DIR / f"{job_id}_{output_name}"
    clean_df.to_csv(output_path, index=False)

    CLEANING_JOBS[job_id] = {
        "output_path": str(output_path),
        "output_name": output_name,
        "report": report,
        "rows": int(len(clean_df)),
        "columns": list(clean_df.columns),
        "preview": clean_df.head(10).to_dict(orient="records"),
    }

    return {
        "job_id": job_id,
        "output_name": output_name,
        "rows": CLEANING_JOBS[job_id]["rows"],
        "columns": CLEANING_JOBS[job_id]["columns"],
        "preview": CLEANING_JOBS[job_id]["preview"],
        "report": report,
        "download_url": f"/clean/download/{job_id}",
    }


@app.get("/clean/download/{job_id}")
def download_cleaned_file(job_id: str) -> FileResponse:
    job = CLEANING_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Unknown job_id")

    output_path = Path(job["output_path"])
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Cleaned file not found")

    return FileResponse(path=output_path, media_type="text/csv", filename=job["output_name"])
