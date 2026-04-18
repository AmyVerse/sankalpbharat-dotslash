"""
ESGAudit Data Ingestion API
============================
FastAPI service that processes uploaded supply chain zip files:
1. Extracts and classifies files (images, text, CSV, XLS, PDF)
2. Sends unstructured data (images, text, PDFs) to Gemini API for extraction
3. Uses Gemini to normalize CSV/XLS column names to match our database schema
4. Runs the EPA-based carbon calculation engine (heuristics from data_ingestion.md)
5. POSTs structured results to the Node.js backend for Postgres storage

EPA Emission Factors Source: GHG Emission Factors Hub (Jan 2025)
"""
import os
import re
import json
import shutil
import zipfile
import tempfile
import traceback
from pathlib import Path
from typing import Optional

import pandas as pd
import numpy as np
import requests
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import uvicorn

load_dotenv()

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent.resolve()
EMISSION_FACTORS_DIR = SCRIPT_DIR / "emission_factors"
NODE_BACKEND_URL = os.getenv("NODE_BACKEND_URL", "http://localhost:5000/api")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-1.5-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key="

# ---------------------------------------------------------------------------
# Load ALL EPA emission factor lookup tables (from ghg-emission-factors-hub-2025)
# ---------------------------------------------------------------------------
def _load_factors():
    transport = pd.read_csv(EMISSION_FACTORS_DIR / "transport_emission_factors.csv")
    intl_grid = pd.read_csv(EMISSION_FACTORS_DIR / "international_grid_factors.csv")
    us_grid = pd.read_csv(EMISSION_FACTORS_DIR / "electricity_grid_factors.csv")
    combustion = pd.read_csv(EMISSION_FACTORS_DIR / "stationary_combustion_factors.csv")
    return transport, intl_grid, us_grid, combustion

TRANSPORT_FACTORS, INTL_GRID_FACTORS, US_GRID_FACTORS, COMBUSTION_FACTORS = _load_factors()

# Map US states to eGRID subregion codes (most common mappings)
STATE_TO_EGRID = {
    "California": "CAMX", "Oregon": "NWPP", "Washington": "NWPP",
    "Texas": "ERCT", "New York": "NYCW", "Florida": "FRCC",
    "Ohio": "RFCW", "Michigan": "RFCM", "Illinois": "RFCW",
    "Pennsylvania": "RFCE", "Virginia": "SRVC", "North Carolina": "SRVC",
    "Georgia": "SRSO", "Tennessee": "SRTV", "Alabama": "SRSO",
    "Arizona": "AZNM", "Nevada": "AZNM", "Colorado": "RMPA",
    "New Jersey": "RFCE", "Massachusetts": "NEWE", "Connecticut": "NEWE",
    "Indiana": "RFCW", "Missouri": "SRMW", "Wisconsin": "MROE",
    "Minnesota": "MROW", "Iowa": "MROW", "Alaska": "AKGD",
    "Hawaii": "HIOA", "Puerto Rico": "PRMS",
}

# Map our logistics modes to EPA vehicle types (ton-mile based)
MODE_TO_EPA = {
    "Truck": "Medium- and Heavy-Duty TruckC",
    "Rail": "Rail",
    "Ship": "Waterborne Craft",
    "Air": "Aircraft",
}

def get_transport_co2e(mode: str, distance_km: float, weight_tons: float) -> float:
    """Calculate transport CO2e using EPA Scope 3 factors (Table 8).
    Converts km to miles, metric tons to short tons."""
    epa_type = MODE_TO_EPA.get(mode, "Medium- and Heavy-Duty TruckC")
    row = TRANSPORT_FACTORS[TRANSPORT_FACTORS["vehicle_type"] == epa_type]
    if row.empty:
        return 0.0
    factor = float(row.iloc[0]["co2e_kg_per_unit"])  # kg CO2e per short ton-mile
    distance_miles = distance_km * 0.621371
    weight_short_tons = weight_tons * 1.10231
    return round(factor * distance_miles * weight_short_tons, 2)

def get_grid_intensity(country: str, state: str = "") -> float:
    """Get grid carbon intensity (kgCO2/kWh) for a country.
    For USA, uses EPA eGRID subregional data if state is provided."""
    # Use precise eGRID subregion for US suppliers
    if country.upper() in ("USA", "US", "UNITED STATES") and state:
        egrid_code = STATE_TO_EGRID.get(state)
        if egrid_code:
            row = US_GRID_FACTORS[US_GRID_FACTORS["subregion_code"] == egrid_code]
            if not row.empty:
                return float(row.iloc[0]["co2e_kg_per_kwh"])
        # Fallback to US average from eGRID
        us_avg = US_GRID_FACTORS[US_GRID_FACTORS["subregion_code"] == "US Average"]
        if not us_avg.empty:
            return float(us_avg.iloc[0]["co2e_kg_per_kwh"])
    
    # International grid factors (IEA)
    row = INTL_GRID_FACTORS[INTL_GRID_FACTORS["country"].str.lower() == country.lower()]
    if not row.empty:
        return float(row.iloc[0]["co2_kg_per_kwh"])
    return 0.50  # Global average fallback

def get_combustion_factor(fuel_type: str) -> dict:
    """Get stationary combustion emission factor for a fuel type (EPA Table 1).
    Returns dict with co2_kg_per_mmbtu and heat_content."""
    # Try exact match first, then fuzzy
    for _, row in COMBUSTION_FACTORS.iterrows():
        if fuel_type.lower() in str(row["fuel_type"]).lower():
            return {
                "fuel_type": row["fuel_type"],
                "heat_content_mmbtu": float(row["heat_content_mmbtu_per_short_ton"]),
                "co2_kg_per_mmbtu": float(row["co2_kg_per_mmbtu"]),
                "ch4_g_per_mmbtu": float(row["ch4_g_per_mmbtu"]),
                "n2o_g_per_mmbtu": float(row["n2o_g_per_mmbtu"]),
            }
    return None

def calculate_combustion_emission(fuel_type: str, quantity_tons: float) -> float:
    """Calculate Scope 1 CO2e from on-site fuel combustion using EPA Table 1.
    E_comb = Quantity × HeatContent × CO2_Factor + GWP adjustments for CH4/N2O
    quantity_tons: short tons of fuel burned."""
    factor = get_combustion_factor(fuel_type)
    if not factor:
        return 0.0
    heat = quantity_tons * factor["heat_content_mmbtu"]
    co2 = heat * factor["co2_kg_per_mmbtu"]
    ch4_co2e = heat * factor["ch4_g_per_mmbtu"] / 1000 * 28     # GWP CH4 = 28
    n2o_co2e = heat * factor["n2o_g_per_mmbtu"] / 1000 * 265    # GWP N2O = 265
    return round(co2 + ch4_co2e + n2o_co2e, 2)

# ---------------------------------------------------------------------------
# Industry intensity coefficients (from data_ingestion.md Section 3.1)
# ---------------------------------------------------------------------------
INDUSTRY_INTENSITY = {
    "Footwear": 1.85,   # kWh/worker (heavy: molding, heat presses)
    "Apparel": 1.10,    # kWh/worker (assembly, sewing)
    "Equipment": 1.50,  # kWh/worker (mixed)
    "Materials": 1.30,  # kWh/worker (processing)
}

# Material carbon intensity (from data_ingestion.md Section 3.2)
MATERIAL_INTENSITY = {
    "Virgin Nylon": 12.0,
    "Virgin Polyester": 9.5,
    "Recycled Polyester": 3.2,
    "Virgin Cotton": 5.9,
    "Organic Cotton": 3.8,
    "Recycled Nylon": 4.1,
    "Synthetic Leather": 7.8,
    "Natural Leather": 17.0,
    "Rubber": 3.1,
    "Steel": 1.85,
    "Aluminum": 8.2,
    "Plastics": 3.5,
}

CIRCULARITY_KEYWORDS = {
    "recycled": 0.30,
    "rPET": 0.30,
    "organic": 0.20,
    "circular": 0.30,
    "nike forward": 0.75,
    "sustainable": 0.15,
    "bio-based": 0.25,
    "reclaimed": 0.35,
}

# ---------------------------------------------------------------------------
# Gemini API helper
# ---------------------------------------------------------------------------
import time

def call_gemini(prompt: str, api_key: str) -> str:
    """Call Gemini API with a text prompt, return text response."""
    if not api_key:
        print("[Gemini] No API key provided, skipping.")
        return "{}"
    
    start_time = time.time()
    print(f"[Gemini] Sending API request ({len(prompt)} chars)...")
    
    try:
        resp = requests.post(
            GEMINI_URL + api_key,
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 4096}
            },
            timeout=30
        )
        elapsed = (time.time() - start_time) * 1000
        print(f"[Gemini] Returned in {elapsed:.0f}ms with status {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"[Gemini] Error: {resp.status_code} {resp.text[:200]}")
            return "{}"
        
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except requests.exceptions.Timeout:
        elapsed = (time.time() - start_time) * 1000
        print(f"[Gemini] TIMEOUT after {elapsed:.0f}ms")
        return "{}"
    except Exception as e:
        elapsed = (time.time() - start_time) * 1000
        print(f"[Gemini] EXCEPTION after {elapsed:.0f}ms: {str(e)}")
        return "{}"

def gemini_extract_invoice(text: str, api_key: str) -> dict:
    """Use Gemini to extract structured data from raw invoice text."""
    prompt = f"""Extract structured supply chain data from this invoice/document. 
Return ONLY a JSON object with these fields (use null for missing):
{{
  "supplier_name": "",
  "origin_city": "",
  "origin_country": "",
  "material_type": "",
  "hsn_code": "",
  "net_weight_kg": 0,
  "total_value_usd": 0,
  "tier_level": 1,
  "parent_group": "",
  "is_recycled": false,
  "sustainability_keywords": []
}}

Document:
{text}"""
    raw = call_gemini(prompt, api_key)
    # Clean markdown fencing
    raw = re.sub(r'```json\s*', '', raw)
    raw = re.sub(r'```\s*', '', raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}

def gemini_normalize_columns(columns: list, api_key: str) -> dict:
    """Use Gemini to map messy column names to our standard schema."""
    prompt = f"""You are a data engineer. Map these CSV column names to our standard database schema.
    
Input columns: {json.dumps(columns)}

Our standard schema fields:
- factory_name, category, product_type, brand, parent_group, address, city, state, zip, country, region, workers, female_workers, line_workers, migrant_workers, vendor, headcount, compliance_status, audit_sector, org_name, region_code

Return ONLY a JSON object mapping input column names to standard names. Use null for columns that don't map to anything.
Example: {{"Factory_Name": "factory_name", "Total Workers": "workers", "RandomCol": null}}"""
    raw = call_gemini(prompt, api_key)
    raw = re.sub(r'```json\s*', '', raw)
    raw = re.sub(r'```\s*', '', raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


# ---------------------------------------------------------------------------
# Carbon Calculation Engine
# ---------------------------------------------------------------------------
def calculate_manufacturing_emission(workers: int, product_type: str, country: str, state: str = "") -> float:
    """E_mfg = Workers × Industry_Intensity × Grid_Intensity (from data_ingestion.md 3.1)
    Uses EPA eGRID subregional data for US, IEA for international."""
    intensity = INDUSTRY_INTENSITY.get(product_type, 1.30)
    grid = get_grid_intensity(country, state)
    return round(workers * intensity * grid, 2)

def calculate_shadow_tax(weight_kg: float, material_type: str, keywords: list, carbon_price: float = 100.0) -> float:
    """T_shadow = Mass × Base_Intensity × (1 - R_circ) × Carbon_Price (from data_ingestion.md 3.2)"""
    base_intensity = MATERIAL_INTENSITY.get(material_type, 5.0)
    
    # Calculate circularity credit from keywords
    r_circ = 0.0
    for kw, credit in CIRCULARITY_KEYWORDS.items():
        if any(kw.lower() in k.lower() for k in keywords):
            r_circ = max(r_circ, credit)
    
    weight_tons = weight_kg / 1000
    return round(weight_tons * base_intensity * (1 - r_circ) * carbon_price, 2)


# ---------------------------------------------------------------------------
# File Processing Pipeline
# ---------------------------------------------------------------------------
def classify_file(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext in ('.png', '.jpg', '.jpeg', '.webp', '.bmp'):
        return 'image'
    elif ext in ('.csv',):
        return 'csv'
    elif ext in ('.xls', '.xlsx'):
        return 'excel'
    elif ext in ('.txt',):
        return 'text'
    elif ext in ('.pdf',):
        return 'pdf'
    return 'unknown'

def process_text_invoice(filepath: Path, api_key: str) -> dict:
    """Process a raw text invoice using Gemini extraction."""
    text = filepath.read_text(encoding='utf-8', errors='replace')
    extracted = gemini_extract_invoice(text, api_key)
    if not extracted:
        return {}
    
    # Calculate shadow tax if weight and material info available
    weight = extracted.get('net_weight_kg', 0) or 0
    material = extracted.get('material_type', '')
    keywords = extracted.get('sustainability_keywords', [])
    is_recycled = extracted.get('is_recycled', False)
    if is_recycled and 'recycled' not in [k.lower() for k in keywords]:
        keywords.append('recycled')
    
    extracted['shadow_tax_usd'] = calculate_shadow_tax(weight, material, keywords)
    extracted['source_file'] = filepath.name
    extracted['extraction_method'] = 'gemini_nlp'
    return extracted

def process_csv(filepath: Path, api_key: str) -> dict:
    """Process a CSV file: normalize columns, run carbon calculations."""
    try:
        df = pd.read_csv(filepath, encoding='utf-8', on_bad_lines='skip')
    except Exception:
        try:
            df = pd.read_csv(filepath, encoding='latin-1', on_bad_lines='skip')
        except Exception as e:
            return {"error": str(e), "source_file": filepath.name}
    
    original_columns = df.columns.tolist()
    
    # Use Gemini to normalize column names
    column_map = gemini_normalize_columns(original_columns, api_key)
    if column_map:
        rename = {k: v for k, v in column_map.items() if v is not None}
        df = df.rename(columns=rename)
    
    # Run carbon calculations on factory data if workers column exists
    records = []
    workers_col = next((c for c in df.columns if c in ('workers', 'headcount', 'Workers', 'Headcount')), None)
    country_col = next((c for c in df.columns if c in ('country', 'Country')), None)
    product_col = next((c for c in df.columns if c in ('product_type', 'Product_Type', 'category', 'Category')), None)
    name_col = next((c for c in df.columns if c in ('factory_name', 'Factory_Name', 'vendor', 'Vendor', 'org_name', 'Org_Name')), None)
    
    for _, row in df.iterrows():
        record = row.to_dict()
        # Clean NaN values
        record = {k: (None if pd.isna(v) else v) for k, v in record.items()}
        
        if workers_col and country_col:
            workers = int(row.get(workers_col, 0) or 0)
            country = str(row.get(country_col, '') or '')
            product = str(row.get(product_col, 'Apparel') or 'Apparel')
            state_col = next((c for c in df.columns if c in ('state', 'State')), None)
            state = str(row.get(state_col, '') or '') if state_col else ''
            
            if workers > 0:
                record['estimated_emissions_kgco2'] = calculate_manufacturing_emission(
                    workers, product, country, state
                )
                record['grid_intensity_kgco2_kwh'] = get_grid_intensity(country, state)
                record['industry_intensity_kwh'] = INDUSTRY_INTENSITY.get(product, 1.30)
                # Flag eGRID subregion used for US suppliers
                if country.upper() in ('USA', 'US', 'UNITED STATES') and state:
                    egrid = STATE_TO_EGRID.get(state, 'US Average')
                    record['egrid_subregion'] = egrid
        
        records.append(record)
    
    return {
        "source_file": filepath.name,
        "original_columns": original_columns,
        "normalized_columns": df.columns.tolist(),
        "column_mapping": column_map,
        "row_count": len(records),
        "records": records,  # All records needed for DB population
        "total_records": len(records),
        "processing_method": "gemini_column_norm + epa_heuristics"
    }

def process_excel(filepath: Path, api_key: str) -> dict:
    """Process an Excel file same as CSV after reading."""
    try:
        df = pd.read_excel(filepath)
        # Save as temp CSV and reuse CSV pipeline
        tmp_csv = filepath.with_suffix('.csv')
        df.to_csv(tmp_csv, index=False)
        result = process_csv(tmp_csv, api_key)
        tmp_csv.unlink(missing_ok=True)
        return result
    except Exception as e:
        return {"error": str(e), "source_file": filepath.name}


# ---------------------------------------------------------------------------
# Special CSV Detectors & Processors
# ---------------------------------------------------------------------------
def detect_special_csv(filepath: Path) -> str:
    """Detect if a CSV is one of our known special formats by reading headers."""
    try:
        df = pd.read_csv(filepath, nrows=0)
        cols = set(c.strip() for c in df.columns)
        if 'Shipment_ID' in cols and 'Origin_Factory' in cols:
            return 'transport'
        if 'Alternative_ID' in cols and 'Replaces_ID' in cols:
            return 'alternatives'
    except Exception:
        pass
    return 'generic'

def process_transport_csv(filepath: Path) -> list:
    """Process transport_logistics.csv into structured shipment records."""
    df = pd.read_csv(filepath)
    records = []
    for _, row in df.iterrows():
        mode = str(row.get('Mode', 'Truck'))
        dist = float(row.get('Distance_KM', 0) or 0)
        weight = float(row.get('Weight_Tons', 0) or 0)
        records.append({
            'shipment_id': str(row.get('Shipment_ID', '')),
            'origin_factory': str(row.get('Origin_Factory', '')),
            'origin_country': str(row.get('Origin_Country', '')),
            'destination_factory': str(row.get('Destination_Factory', '')),
            'destination_country': str(row.get('Destination_Country', '')),
            'mode': mode,
            'distance_km': dist,
            'weight_tons': weight,
            'cost_usd': float(row.get('Cost_USD', 0) or 0),
            'shipment_date': str(row.get('Shipment_Date', '2026-01-01')),
            'co2e_kg_original': float(row.get('CO2e_KG', 0) or 0),
            'co2e_kg_epa': get_transport_co2e(mode, dist, weight),
            'product_type': str(row.get('Product_Type', '')),
        })
    return records

def process_alternatives_csv(filepath: Path) -> list:
    """Process alternatives.csv into structured alternative-supplier records."""
    df = pd.read_csv(filepath)
    records = []
    for _, row in df.iterrows():
        workers = int(row.get('Workers', 0) or 0)
        country = str(row.get('Country', '') or '')
        product = str(row.get('Product_Type', 'Apparel') or 'Apparel')
        records.append({
            'alternative_id': str(row.get('Alternative_ID', '')),
            'replaces_id': str(row.get('Replaces_ID', '')),
            'factory_name': str(row.get('Factory_Name', '')),
            'category': str(row.get('Category', '')),
            'product_type': product,
            'tier_level': int(row.get('Tier_Level', 1) or 1),
            'criticality': str(row.get('Criticality', 'medium')),
            'city': str(row.get('City', '')),
            'country': country,
            'region': str(row.get('Region', '')),
            'workers': workers,
            'esg_score': float(row.get('ESG_Score', 0) or 0),
            'recycled': str(row.get('Recycled', 'false')).lower() == 'true',
            'logistics_mode': str(row.get('Logistics_Mode', 'Truck')),
            'distance_km': float(row.get('Distance_KM', 0) or 0),
            'weight_ton': float(row.get('Weight_Ton', 0) or 0),
            'emission_factor': float(row.get('Emission_Factor', 0) or 0),
            'logistics_cost': float(row.get('Logistics_Cost', 0) or 0),
            'reason': str(row.get('Reason', '')),
            'estimated_mfg_co2e': calculate_manufacturing_emission(workers, product, country),
        })
    return records


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Node.js Backend Integration
# ---------------------------------------------------------------------------
def post_to_node(model: str, data: dict, session: requests.Session = None) -> dict:
    """POST a record to the Node.js backend. Returns response JSON or error dict."""
    try:
        req_func = session.post if session else requests.post
        resp = req_func(f"{NODE_BACKEND_URL}/{model}", json=data, timeout=15)
        if resp.status_code in (200, 201):
            return resp.json()
        return {"error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        return {"error": str(e)}

def post_batch_to_node(model: str, items: list, session: requests.Session) -> list:
    """POST multiple records to the batch endpoint. Returns list of response dicts."""
    if not items:
        return []
    try:
        resp = session.post(f"{NODE_BACKEND_URL}/batch/{model}", json=items, timeout=30)
        if resp.status_code in (200, 201):
            return resp.json()
        print(f"[ERROR] Batch post failed for {model}: {resp.text[:200]}")
        return []
    except Exception as e:
        print(f"[ERROR] Batch post exception for {model}: {e}")
        return []

def populate_database(
    suppliers: dict,
    plants: dict,
    materials: dict,
    transport_records: list,
    invoice_emissions: list,
) -> dict:
    """
    Push all collected entities to the Node.js backend using Batch POSTs.
    """
    from datetime import date
    today = date.today().isoformat()
    
    session = requests.Session()

    db = {
        "suppliers_created": 0,
        "plants_created": 0,
        "materials_created": 0,
        "supply_links_created": 0,
        "logistics_created": 0,
        "emissions_created": 0,
        "errors": [],
    }
    supplier_ids = {}
    plant_ids = {}
    material_ids = {}

    # Phase 1: Suppliers (Batch)
    print(f"[DB] Batch creating {len(suppliers)} suppliers (capped to 15 as requested)...")
    supplier_payloads = []
    supplier_keys = []
    
    # Cap to exactly 15 suppliers
    capped_suppliers = dict(list(suppliers.items())[:15])
    
    for key, data in capped_suppliers.items():
        supplier_payloads.append({
            "name": data["name"],
            "category": data.get("category", "General"),
            "country": data.get("country", ""),
            "criticality_level": data.get("criticality_level", "medium"),
            "tier_level": data.get("tier_level", 1),
            "active": True,
        })
        supplier_keys.append(key)
        
    created_suppliers = post_batch_to_node("supplier", supplier_payloads, session)
    for i, res in enumerate(created_suppliers):
        if "id" in res:
            supplier_ids[supplier_keys[i]] = res["id"]
            db["suppliers_created"] += 1

    # Phase 2: Plants (Batch)
    print(f"[DB] Batch creating {len(plants)} plants...")
    plant_payloads = []
    plant_keys = []
    for key, data in plants.items():
        plant_payloads.append({
            "name": data["name"],
            "city": data.get("city", ""),
            "country": data.get("country", ""),
            "business_unit": data.get("business_unit", ""),
        })
        plant_keys.append(key)
        
    created_plants = post_batch_to_node("plant", plant_payloads, session)
    for i, res in enumerate(created_plants):
        if "id" in res:
            plant_ids[plant_keys[i]] = res["id"]
            db["plants_created"] += 1

    # Phase 3: Materials (Batch)
    print(f"[DB] Batch creating {len(materials)} materials...")
    material_payloads = []
    material_keys = []
    for key, data in materials.items():
        material_payloads.append({
            "name": data["name"],
            "category": data.get("category", data["name"]),
            "is_recycled": data.get("is_recycled", False),
            "base_carbon_index": float(data.get("base_carbon_index", 5.0)),
        })
        material_keys.append(key)
        
    created_materials = post_batch_to_node("material", material_payloads, session)
    for i, res in enumerate(created_materials):
        if "id" in res:
            material_ids[material_keys[i]] = res["id"]
            db["materials_created"] += 1

    # Phase 4: SupplyLinks (create edges between entities)
    # We need at least one material_id to create links
    if material_ids and (supplier_ids or plant_ids):
        print(f"[DB] Creating SupplyLinks between plants and suppliers...")
        
        # Get first material ID for all links
        first_material_id = next(iter(material_ids.values()), None)
        
        supply_link_payloads = []
        
        # Get suppliers by tier level
        tier1_suppliers = [k for k, v in suppliers.items() if v.get("tier_level", 1) == 1]
        tier2_suppliers = [k for k, v in suppliers.items() if v.get("tier_level", 1) == 2]
        tier3_suppliers = [k for k, v in suppliers.items() if v.get("tier_level", 1) >= 3]
        
        # Get actual IDs for each tier
        tier1_ids = [supplier_ids[k] for k in tier1_suppliers if k in supplier_ids]
        tier2_ids = [supplier_ids[k] for k in tier2_suppliers if k in supplier_ids]
        tier3_ids = [supplier_ids[k] for k in tier3_suppliers if k in supplier_ids]
        
        # Connect plants to MULTIPLE tier 1 suppliers (branching from each plant)
        plant_ids_list = list(plant_ids.values())
        for plant_id in plant_ids_list:
            # Each plant connects to 2-3 tier 1 suppliers
            for j, supp_id in enumerate(tier1_ids[:3]):
                supply_link_payloads.append({
                    "from_supplier_id": supp_id,
                    "to_plant_id": plant_id,
                    "material_id": first_material_id,
                    "quantity": 1000 + (j * 100),
                    "unit": "kg",
                    "lead_time_days": 7 + j,
                })
        
        # Connect EACH tier 1 supplier to MULTIPLE tier 2 suppliers (fan-out)
        for i, t1_id in enumerate(tier1_ids):
            # Each tier 1 gets 2-3 tier 2 suppliers feeding into it
            t2_subset = tier2_ids[i*3:(i*3)+3] if tier2_ids else []
            for j, t2_id in enumerate(t2_subset):
                supply_link_payloads.append({
                    "from_supplier_id": t2_id,
                    "to_supplier_id": t1_id,
                    "material_id": first_material_id,
                    "quantity": 500 + (j * 50),
                    "unit": "kg",
                    "lead_time_days": 14 + j,
                })
        
        # Connect EACH tier 2 supplier to MULTIPLE tier 3 suppliers (fan-out)
        for i, t2_id in enumerate(tier2_ids):
            # Each tier 2 gets 2-3 tier 3 suppliers feeding into it
            t3_subset = tier3_ids[i*3:(i*3)+3] if tier3_ids else []
            for j, t3_id in enumerate(t3_subset):
                supply_link_payloads.append({
                    "from_supplier_id": t3_id,
                    "to_supplier_id": t2_id,
                    "material_id": first_material_id,
                    "quantity": 300 + (j * 30),
                    "unit": "kg",
                    "lead_time_days": 21 + j,
                })
        
        if supply_link_payloads:
            created_links = post_batch_to_node("supplyLink", supply_link_payloads, session)
            db["supply_links_created"] = len(created_links)
            print(f"[DB] Created {len(created_links)} supply links")

    # Skip Phase 5 (Logistics) and Phase 6 (Emissions) - only create core graph entities
    
    session.close()
    
    print(f"[DB] Done. {db['suppliers_created']} suppliers, {db['plants_created']} plants, "
          f"{db['materials_created']} materials, {db.get('supply_links_created', 0)} supply links.")
    return db


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="ESGAudit Data Ingestion Pipeline",
    version="2.0.0",
    description="Multimodal supply chain data ingestion → EPA carbon calculations → database population"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health():
    return {"status": "ok", "service": "data-ingestion-pipeline", "version": "2.0.0"}

@app.get("/emission-factors")
def get_emission_factors():
    """Return ALL loaded EPA emission factor tables from ghg-emission-factors-hub-2025."""
    return {
        "transport_factors": TRANSPORT_FACTORS.to_dict(orient="records"),
        "international_grid_factors": INTL_GRID_FACTORS.to_dict(orient="records"),
        "us_egrid_factors": US_GRID_FACTORS.to_dict(orient="records"),
        "stationary_combustion_factors": COMBUSTION_FACTORS.to_dict(orient="records"),
        "industry_intensity": INDUSTRY_INTENSITY,
        "material_intensity": MATERIAL_INTENSITY,
        "circularity_keywords": CIRCULARITY_KEYWORDS,
    }


@app.post("/ingest")
async def ingest_zip(
    file: UploadFile = File(...),
    gemini_key: Optional[str] = None,
    push_to_db: Optional[str] = None,
):
    """
    Main ingestion endpoint.
    Accepts a ZIP of supply chain data → processes all files →
    populates the Node.js/Postgres database automatically.

    Flow:
      1. Extract ZIP, classify every file
      2. Text invoices  → Gemini NLP extraction → shadow tax
      3. CSVs           → detect special types (transport / alternatives / generic)
      4. XLS            → convert to CSV → same pipeline
      5. Collect all entities (suppliers, plants, materials)
      6. Push to DB in FK-dependency order
    """
    api_key = gemini_key or GEMINI_API_KEY

    if not file.filename or not file.filename.endswith('.zip'):
        raise HTTPException(400, "Please upload a .zip file")

    tmp_dir = Path(tempfile.mkdtemp(prefix="esgaudit_"))
    zip_path = tmp_dir / file.filename

    try:
        content = await file.read()
        zip_path.write_bytes(content)

        extract_dir = tmp_dir / "extracted"
        with zipfile.ZipFile(zip_path, 'r') as zf:
            zf.extractall(extract_dir)

        # ============================================================
        # Collection buckets (keyed by UPPER-CASE name for dedup)
        # ============================================================
        suppliers = {}          # NAME -> {supplier fields + workers/emissions}
        plants = {}             # NAME -> {plant fields}
        materials = {}          # NAME -> {material fields}
        transport_records = []  # raw transport shipment dicts
        invoice_records = []    # raw Gemini-extracted invoice dicts
        alt_records = []        # alternative supplier dicts

        processing_log = {
            "files_processed": 0,
            "invoices_parsed": 0,
            "csv_processed": 0,
            "excel_processed": 0,
            "images_detected": [],
            "pdfs_detected": [],
            "errors": [],
        }

        emission_totals = {
            "total_manufacturing_co2e_kg": 0.0,
            "total_shadow_tax_usd": 0.0,
            "total_transport_co2e_kg": 0.0,
            "unique_suppliers": 0,
        }

        # ============================================================
        # PHASE 1: Walk all files, extract & collect entities
        # ============================================================
        generic_csv_paths = []

        for root, dirs, files_list in os.walk(extract_dir):
            for fname in files_list:
                if fname.startswith('.') or fname.startswith('__'):
                    continue

                fpath = Path(root) / fname
                ftype = classify_file(fname)
                processing_log["files_processed"] += 1

                try:
                    # --------------------------------------------------
                    # TEXT INVOICES (RAW_INV_*.txt, inv.txt)
                    # --------------------------------------------------
                    if ftype == 'text':
                        invoice = process_text_invoice(fpath, api_key)
                        if invoice:
                            invoice_records.append(invoice)
                            processing_log["invoices_parsed"] += 1
                            shadow = invoice.get("shadow_tax_usd", 0) or 0
                            emission_totals["total_shadow_tax_usd"] += shadow

                            # Collect supplier
                            name = invoice.get("supplier_name", "")
                            if name:
                                key = name.strip().upper()
                                suppliers[key] = {
                                    "name": name,
                                    "category": "MATERIALS",
                                    "country": invoice.get("origin_country", ""),
                                    "tier_level": int(invoice.get("tier_level", 2) or 2),
                                    "criticality_level": "medium",
                                    "workers": 0,
                                    "product_type": "Materials",
                                    "estimated_mfg_co2e": 0,
                                }

                            # Collect material
                            mat = invoice.get("material_type", "")
                            if mat:
                                mat_key = mat.strip().upper()
                                is_recycled = invoice.get("is_recycled", False)
                                materials[mat_key] = {
                                    "name": mat,
                                    "category": mat,
                                    "is_recycled": is_recycled,
                                    "base_carbon_index": MATERIAL_INTENSITY.get(mat, 5.0),
                                }

                    # --------------------------------------------------
                    # CSV FILES (detect special types first)
                    # --------------------------------------------------
                    elif ftype == 'csv':
                        special = detect_special_csv(fpath)

                        if special == 'transport':
                            transport_records = process_transport_csv(fpath)
                            for rec in transport_records:
                                emission_totals["total_transport_co2e_kg"] += rec["co2e_kg_epa"]
                                okey = rec["origin_factory"].strip().upper()
                                if okey and okey not in suppliers:
                                    suppliers[okey] = {
                                        "name": rec["origin_factory"],
                                        "category": rec["product_type"] or "General",
                                        "country": rec["origin_country"],
                                        "tier_level": 1,
                                        "criticality_level": "medium",
                                        "workers": 0,
                                        "product_type": rec["product_type"] or "General",
                                        "estimated_mfg_co2e": 0,
                                    }
                                dkey = rec["destination_factory"].strip().upper()
                                if dkey:
                                    plants[dkey] = {
                                        "name": rec["destination_factory"],
                                        "city": "",
                                        "country": rec["destination_country"],
                                        "business_unit": "Nike",
                                    }

                        elif special == 'alternatives':
                            alt_records = process_alternatives_csv(fpath)
                            for rec in alt_records:
                                akey = rec["factory_name"].strip().upper()
                                suppliers[akey] = {
                                    "name": rec["factory_name"],
                                    "category": rec["category"],
                                    "country": rec["country"],
                                    "tier_level": rec["tier_level"],
                                    "criticality_level": rec["criticality"],
                                    "workers": rec["workers"],
                                    "product_type": rec["product_type"],
                                    "estimated_mfg_co2e": rec["estimated_mfg_co2e"],
                                }
                                emission_totals["total_manufacturing_co2e_kg"] += rec["estimated_mfg_co2e"]

                        else:
                            # Queue generic CSV for concurrent processing
                            generic_csv_paths.append(fpath)

                    # --------------------------------------------------
                    # EXCEL (XLS/XLSX) – convert to CSV pipeline
                    # --------------------------------------------------
                    elif ftype == 'excel':
                        xls_result = process_excel(fpath, api_key)
                        processing_log["excel_processed"] += 1
                        for rec in xls_result.get("records", []):
                            name = (rec.get("factory_name") or rec.get("Factory_Name")
                                    or rec.get("vendor") or rec.get("Vendor") or "")
                            if not name:
                                continue
                            key = str(name).strip().upper()
                            workers = int(rec.get("workers") or rec.get("Workers")
                                          or rec.get("headcount") or rec.get("Headcount") or 0)
                            country = str(rec.get("country") or rec.get("Country") or "")
                            product = str(rec.get("product_type") or rec.get("Product_Type")
                                          or rec.get("category") or rec.get("Category") or "General")

                            mfg_co2e = 0.0
                            if workers > 0:
                                mfg_co2e = calculate_manufacturing_emission(workers, product, country)
                                emission_totals["total_manufacturing_co2e_kg"] += mfg_co2e

                            existing = suppliers.get(key)
                            if not existing or workers > existing.get("workers", 0):
                                suppliers[key] = {
                                    "name": name,
                                    "category": product,
                                    "country": country,
                                    "tier_level": 1,
                                    "criticality_level": "medium",
                                    "workers": workers,
                                    "product_type": product,
                                    "estimated_mfg_co2e": mfg_co2e,
                                }

                    # --------------------------------------------------
                    # IMAGES & PDFs – log for future processing
                    # --------------------------------------------------
                    elif ftype == 'image':
                        processing_log["images_detected"].append(fname)
                    elif ftype == 'pdf':
                        processing_log["pdfs_detected"].append(fname)

                except Exception as e:
                    processing_log["errors"].append({
                        "file": fname,
                        "error": str(e),
                        "traceback": traceback.format_exc()
                    })

        # ============================================================
        # PHASE 1.5: Concurrent execution for Generic CSVs (Gemini bottleneck bypass)
        # ============================================================
        import concurrent.futures
        if generic_csv_paths:
            print(f"[DB] Concurrently processing {len(generic_csv_paths)} generalized CSVs via Gemini...")
            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
                future_to_path = {executor.submit(process_csv, p, api_key): p for p in generic_csv_paths}
                for future in concurrent.futures.as_completed(future_to_path):
                    fpath = future_to_path[future]
                    try:
                        csv_result = future.result()
                        if "error" in csv_result:
                            processing_log["errors"].append({"file": fpath.name, "error": csv_result["error"]})
                            continue
                            
                        processing_log["csv_processed"] += 1
                        for rec in csv_result.get("records", []):
                            name = (rec.get("factory_name") or rec.get("Factory_Name")
                                    or rec.get("vendor") or rec.get("Vendor")
                                    or rec.get("org_name") or rec.get("Org_Name") or "")
                            if not name:
                                continue
                            key = str(name).strip().upper()
                            workers = int(rec.get("workers") or rec.get("Workers")
                                          or rec.get("headcount") or rec.get("Headcount") or 0)
                            country = str(rec.get("country") or rec.get("Country") or "")
                            product = str(rec.get("product_type") or rec.get("Product_Type")
                                          or rec.get("category") or rec.get("Category") or "General")
                            state = str(rec.get("state") or rec.get("State") or "")

                            mfg_co2e = 0.0
                            if workers > 0:
                                mfg_co2e = calculate_manufacturing_emission(workers, product, country, state)
                                emission_totals["total_manufacturing_co2e_kg"] += mfg_co2e

                            # Keep richest data (prefer entry with more workers)
                            existing = suppliers.get(key)
                            if not existing or workers > existing.get("workers", 0):
                                suppliers[key] = {
                                    "name": name,
                                    "category": product,
                                    "country": country,
                                    "tier_level": int(rec.get("tier_level", 1) or 1),
                                    "criticality_level": "medium",
                                    "workers": workers,
                                    "product_type": product,
                                    "state": state,
                                    "estimated_mfg_co2e": mfg_co2e,
                                }
                    except Exception as exc:
                        processing_log["errors"].append({"file": fpath.name, "error": str(exc)})

        emission_totals["unique_suppliers"] = len(suppliers)
        emission_totals["total_manufacturing_co2e_kg"] = round(emission_totals["total_manufacturing_co2e_kg"], 2)
        emission_totals["total_shadow_tax_usd"] = round(emission_totals["total_shadow_tax_usd"], 2)
        emission_totals["total_transport_co2e_kg"] = round(emission_totals["total_transport_co2e_kg"], 2)

        # ============================================================
        # PHASE 2: Populate database (suppliers → plants → materials → logistics → emissions)
        # ============================================================
        db_results = populate_database(
            suppliers=suppliers,
            plants=plants,
            materials=materials,
            transport_records=transport_records,
            invoice_emissions=invoice_records,
        )

        return JSONResponse(content={
            "status": "completed",
            "processing": processing_log,
            "emission_summary": emission_totals,
            "entities_collected": {
                "suppliers": len(suppliers),
                "plants": len(plants),
                "materials": len(materials),
                "transport_shipments": len(transport_records),
                "invoices": len(invoice_records),
                "alternatives": len(alt_records),
            },
            "database": db_results,
        })

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@app.post("/calculate/transport")
def calc_transport(mode: str = "Truck", distance_km: float = 100, weight_tons: float = 10):
    """Calculate transport emission for a single shipment using EPA factors."""
    co2e = get_transport_co2e(mode, distance_km, weight_tons)
    epa_type = MODE_TO_EPA.get(mode, "Medium- and Heavy-Duty TruckC")
    row = TRANSPORT_FACTORS[TRANSPORT_FACTORS["vehicle_type"] == epa_type]
    factor = float(row.iloc[0]["co2e_kg_per_unit"]) if not row.empty else 0
    return {
        "mode": mode,
        "epa_vehicle_type": epa_type,
        "epa_factor_kg_per_ton_mile": factor,
        "distance_km": distance_km,
        "distance_miles": round(distance_km * 0.621371, 2),
        "weight_metric_tons": weight_tons,
        "weight_short_tons": round(weight_tons * 1.10231, 2),
        "co2e_kg": co2e,
        "co2e_tons": round(co2e / 1000, 4),
        "source": "EPA GHG Emission Factors Hub 2025, Table 8"
    }

@app.post("/calculate/manufacturing")
def calc_manufacturing(workers: int = 1000, product_type: str = "Apparel", country: str = "Vietnam", state: str = ""):
    """Calculate manufacturing emission for a facility using EPA grid + heuristics.
    For US facilities, provide state for eGRID subregional accuracy."""
    co2e = calculate_manufacturing_emission(workers, product_type, country, state)
    grid_val = get_grid_intensity(country, state)
    result = {
        "workers": workers,
        "product_type": product_type,
        "country": country,
        "industry_intensity_kwh_per_worker": INDUSTRY_INTENSITY.get(product_type, 1.30),
        "grid_intensity_kgco2_per_kwh": grid_val,
        "estimated_co2e_kg": co2e,
        "estimated_co2e_tons": round(co2e / 1000, 4),
        "formula": "Workers × Industry_Intensity × Grid_Intensity",
        "source": "EPA eGRID 2023 + IEA International Grid Factors"
    }
    if state and country.upper() in ("USA", "US", "UNITED STATES"):
        result["egrid_subregion"] = STATE_TO_EGRID.get(state, "US Average")
        result["source"] = f"EPA eGRID 2023 subregion: {result['egrid_subregion']}"
    return result

@app.post("/calculate/combustion")
def calc_combustion(fuel_type: str = "Bituminous", quantity_short_tons: float = 100):
    """Calculate Scope 1 CO2e from on-site stationary combustion (EPA Table 1).
    Uses fuel heat content and emission factors from ghg-emission-factors-hub-2025."""
    co2e = calculate_combustion_emission(fuel_type, quantity_short_tons)
    factor = get_combustion_factor(fuel_type)
    if not factor:
        return {"error": f"Fuel type '{fuel_type}' not found", "available_fuels": COMBUSTION_FACTORS["fuel_type"].tolist()}
    return {
        "fuel_type": factor["fuel_type"],
        "quantity_short_tons": quantity_short_tons,
        "heat_content_mmbtu_per_short_ton": factor["heat_content_mmbtu"],
        "total_heat_mmbtu": round(quantity_short_tons * factor["heat_content_mmbtu"], 2),
        "co2_factor_kg_per_mmbtu": factor["co2_kg_per_mmbtu"],
        "ch4_factor_g_per_mmbtu": factor["ch4_g_per_mmbtu"],
        "n2o_factor_g_per_mmbtu": factor["n2o_g_per_mmbtu"],
        "estimated_co2e_kg": co2e,
        "estimated_co2e_tons": round(co2e / 1000, 4),
        "scope": 1,
        "formula": "Qty × HeatContent × (CO2 + CH4×GWP28 + N2O×GWP265)",
        "source": "EPA GHG Emission Factors Hub 2025, Table 1 (Stationary Combustion)"
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
