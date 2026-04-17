import json
import tempfile
from pathlib import Path
from typing import Any, Dict, Tuple

import gradio as gr
import pandas as pd
import requests
from requests import exceptions as req_exc

from dataclean import clean_file

API_BASE_URL = "http://127.0.0.1:8000"
SCENARIO_DEFAULT = {
    "baseline_emissions_kg": 1250,
    "baseline_cost_usd": 82000,
    "action_type": "swap",
    "swap_tier_level": 2,
    "supplier_cost_delta": -1200,
    "supplier_emission_idx_delta": -0.08,
    "regional_tax_penalty": 450,
    "affected_region_code": 3,
    "predicted_cost_change": 0,
    "predicted_emission_change": 0,
}
FORECAST_DEFAULT = {
    "lag_1_emission": 43,
    "lag_2_emission": 45,
    "lag_3_emission": 44,
    "production_next": 150,
    "diesel_next": 30,
    "month": 7,
}


def run_cleaning(uploaded_file: str, dataset_type: str) -> Tuple[pd.DataFrame, str, str]:
    if not uploaded_file:
        return pd.DataFrame(), "Please upload a file.", ""

    path = Path(uploaded_file)
    try:
        with path.open("rb") as file_handle:
            response = requests.post(
                f"{API_BASE_URL}/clean/upload",
                files={"file": (path.name, file_handle)},
                data={"dataset_type": dataset_type or "generic"},
                timeout=120,
            )
    except req_exc.RequestException:
        # Fallback mode: allow Gradio testing even when API server is offline.
        clean_df, report = clean_file(str(path), dataset_type=dataset_type or "generic")
        output_name = f"{path.stem}_cleaned.csv"
        temp_output = Path(tempfile.gettempdir()) / output_name
        clean_df.to_csv(temp_output, index=False)
        report_text = json.dumps(report, indent=2)
        return clean_df.head(10), report_text, str(temp_output)

    if response.status_code != 200:
        try:
            detail = response.json().get("detail", response.text)
        except Exception:
            detail = response.text
        return pd.DataFrame(), f"API error: {detail}", ""

    payload: Dict[str, Any] = response.json()
    preview = pd.DataFrame(payload.get("preview", []))
    report_text = json.dumps(payload.get("report", {}), indent=2)

    download_url = payload.get("download_url")
    if not download_url:
        return preview, report_text, ""

    download_response = requests.get(f"{API_BASE_URL}{download_url}", timeout=120)
    if download_response.status_code != 200:
        return preview, report_text, ""

    output_name = payload.get("output_name", "cleaned_output.csv")
    temp_output = Path(tempfile.gettempdir()) / output_name
    temp_output.write_bytes(download_response.content)

    return preview, report_text, str(temp_output)


def _predict(endpoint: str, json_text: str) -> str:
    try:
        features = json.loads(json_text)
    except Exception as exc:
        return f"Invalid JSON: {exc}"

    if not isinstance(features, dict) or not features:
        return "Features must be a non-empty JSON object"

    try:
        response = requests.post(
            f"{API_BASE_URL}{endpoint}",
            json={"features": features},
            timeout=120,
        )
    except req_exc.RequestException as exc:
        return f"API unavailable: {exc}"

    try:
        payload = response.json()
    except Exception:
        payload = {"raw": response.text}

    return json.dumps(payload, indent=2)


def run_scenario_prediction(features_json: str) -> str:
    return _predict("/predict/scenario", features_json)


def run_forecast_prediction(features_json: str) -> str:
    return _predict("/predict/forecast", features_json)


with gr.Blocks(title="Data Cleaner Test UI") as demo:
    gr.Markdown("# ESG Data Service Test UI")
    with gr.Tab("Data Cleaning"):
        gr.Markdown("Upload CSV/XLS/XLSX, run cleaning API, and download cleaned CSV.")

        file_input = gr.File(label="Upload data file", type="filepath")
        dataset_type_input = gr.Textbox(label="Dataset type", value="generic")

        run_button = gr.Button("Clean File")

        preview_output = gr.Dataframe(label="Cleaned Preview")
        report_output = gr.Code(label="Cleaning Report", language="json")
        download_output = gr.File(label="Download Cleaned CSV")

        run_button.click(
            fn=run_cleaning,
            inputs=[file_input, dataset_type_input],
            outputs=[preview_output, report_output, download_output],
        )

    with gr.Tab("Scenario Prediction"):
        scenario_features = gr.Code(
            value=json.dumps(SCENARIO_DEFAULT, indent=2),
            label="Scenario features JSON",
            language="json",
        )
        scenario_button = gr.Button("Predict Scenario")
        scenario_output = gr.Code(label="Scenario Output", language="json")
        scenario_button.click(run_scenario_prediction, inputs=[scenario_features], outputs=[scenario_output])

    with gr.Tab("Forecast Prediction"):
        forecast_features = gr.Code(
            value=json.dumps(FORECAST_DEFAULT, indent=2),
            label="Forecast features JSON",
            language="json",
        )
        forecast_button = gr.Button("Predict Forecast")
        forecast_output = gr.Code(label="Forecast Output", language="json")
        forecast_button.click(run_forecast_prediction, inputs=[forecast_features], outputs=[forecast_output])


if __name__ == "__main__":
    demo.launch(server_name="127.0.0.1", server_port=7860)
