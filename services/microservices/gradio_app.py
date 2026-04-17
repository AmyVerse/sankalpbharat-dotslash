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


with gr.Blocks(title="Data Cleaner Test UI") as demo:
    gr.Markdown("# Data Cleaner Test UI")
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


if __name__ == "__main__":
    demo.launch(server_name="127.0.0.1", server_port=7860)
