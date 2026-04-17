from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Dict, Any
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from dataclean import clean_file

app = FastAPI(title="Data Cleaning API", version="1.0.0")

OUTPUT_DIR = Path("cleaned_outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

# In-memory store for cleaning metadata keyed by job ID.
CLEANING_JOBS: Dict[str, Dict[str, Any]] = {}


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


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
