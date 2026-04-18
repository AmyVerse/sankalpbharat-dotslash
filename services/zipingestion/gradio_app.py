import json
import socket
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
    "action_type": "SUPPLIER_SWAP",
    "swap_tier_level": 2,
    "supplier_cost_delta_pct": -0.06,
    "supplier_emission_delta_pct": -0.04,
    "regional_tax_penalty_pct": 0.02,
    "affected_region_code": 3,
}
FORECAST_DEFAULT = {
    "region": "AT",
    "sector": "Wheat",
    "history": [
        {
            "year": 2014,
            "value_added": 450,
            "employment": 18,
            "ghg": 390000000,
            "energy_total": 1950,
        },
        {
            "year": 2015,
            "value_added": 470,
            "employment": 19,
            "ghg": 403000000,
            "energy_total": 2000,
        },
        {
            "year": 2016,
            "value_added": 490,
            "employment": 19.5,
            "ghg": 408000000,
            "energy_total": 2050,
        },
        {
            "year": 2017,
            "value_added": 500,
            "employment": 20,
            "ghg": 410000000,
            "energy_total": 2100,
        },
        {
            "year": 2018,
            "value_added": 520,
            "employment": 21,
            "ghg": 420000000,
            "energy_total": 2200,
        },
        {
            "year": 2019,
            "value_added": 540,
            "employment": 22,
            "ghg": 430000000,
            "energy_total": 2300,
        },
    ],
    "forecast_years": 7,
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
    try:
        payload = json.loads(features_json)
    except Exception as exc:
        return f"Invalid JSON: {exc}"

    if not isinstance(payload, dict) or not {"region", "sector", "history", "forecast_years"}.issubset(payload.keys()):
        return "Forecast payload must include region, sector, history, and forecast_years"

    try:
        response = requests.post(f"{API_BASE_URL}/forecast", json=payload, timeout=120)
    except req_exc.RequestException as exc:
        return f"API unavailable: {exc}"

    try:
        body = response.json()
    except Exception:
        body = {"raw": response.text}

    return json.dumps(body, indent=2)


def _find_free_port(start: int = 7860, end: int = 7880) -> int:
    for port in range(start, end + 1):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                return port
    raise OSError(f"Cannot find empty port in range: {start}-{end}")


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
    server_port = _find_free_port(7860, 7880)
    demo.launch(server_name="127.0.0.1", server_port=server_port)
