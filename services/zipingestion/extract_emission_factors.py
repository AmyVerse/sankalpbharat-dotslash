"""
Extract EPA GHG Emission Factor tables from the raw Excel file
into clean, easy-to-use CSV lookup files for the ingestion pipeline.

Source: EPA Emission Factors for Greenhouse Gas Inventories (Jan 2025)
"""
import pandas as pd
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
GHG_FILE = os.path.join(SCRIPT_DIR, 'ghg-emission-factors-hub-2025.xlsx')
OUT_DIR = os.path.join(SCRIPT_DIR, 'emission_factors')
os.makedirs(OUT_DIR, exist_ok=True)

df = pd.read_excel(GHG_FILE, 'Emission Factors Hub', header=None)

# ============================================================
# 1. Table 8: Scope 3 Freight Transport Factors
# Rows 420-427 in the raw sheet
# ============================================================
transport_data = []
for i in range(421, 428):
    row = df.iloc[i]
    vehicle = str(row[2]).strip() if pd.notna(row[2]) else ''
    co2 = row[3] if pd.notna(row[3]) else 0
    ch4 = row[4] if pd.notna(row[4]) else 0
    n2o = row[5] if pd.notna(row[5]) else 0
    unit = str(row[6]).strip() if pd.notna(row[6]) else ''
    if vehicle and unit:
        # Convert to CO2e using GWP: CH4=28, N2O=265
        co2e = float(co2) + (float(ch4) / 1000 * 28) + (float(n2o) / 1000 * 265)
        transport_data.append({
            'vehicle_type': vehicle,
            'co2_kg_per_unit': float(co2),
            'ch4_g_per_unit': float(ch4),
            'n2o_g_per_unit': float(n2o),
            'co2e_kg_per_unit': round(co2e, 6),
            'unit': unit
        })

transport_df = pd.DataFrame(transport_data)
transport_df.to_csv(os.path.join(OUT_DIR, 'transport_emission_factors.csv'), index=False)
print(f'✓ transport_emission_factors.csv ({len(transport_df)} rows)')
print(transport_df.to_string(index=False))

# ============================================================
# 2. Table 6: US Electricity Grid Factors (eGRID 2023)
# Rows 336-365 in the raw sheet
# ============================================================
grid_data = []
for i in range(338, 366):
    row = df.iloc[i]
    acronym = str(row[0]).strip() if pd.notna(row[0]) else str(row[2]).strip() if pd.notna(row[2]) else ''
    name = str(row[1]).strip() if pd.notna(row[1]) else str(row[3]).strip() if pd.notna(row[3]) else ''
    # Try to get values from the row
    vals = [x for x in row.tolist() if pd.notna(x)]
    if len(vals) >= 4 and acronym:
        # Columns: Acronym, Name, CO2 (lb/MWh), CH4 (lb/MWh), N2O (lb/MWh), ...
        try:
            co2_lb = float(vals[2]) if len(vals) > 2 else 0
            ch4_lb = float(vals[3]) if len(vals) > 3 else 0
            n2o_lb = float(vals[4]) if len(vals) > 4 else 0
            # Convert lb/MWh to kg/kWh: 1 lb = 0.453592 kg, 1 MWh = 1000 kWh
            co2_kg_kwh = co2_lb * 0.453592 / 1000
            co2e_kg_kwh = (co2_lb + ch4_lb * 28 + n2o_lb * 265) * 0.453592 / 1000
            grid_data.append({
                'subregion_code': acronym,
                'subregion_name': name,
                'co2_lb_per_mwh': co2_lb,
                'ch4_lb_per_mwh': ch4_lb,
                'n2o_lb_per_mwh': n2o_lb,
                'co2_kg_per_kwh': round(co2_kg_kwh, 6),
                'co2e_kg_per_kwh': round(co2e_kg_kwh, 6),
            })
        except (ValueError, TypeError):
            pass

grid_df = pd.DataFrame(grid_data)
grid_df.to_csv(os.path.join(OUT_DIR, 'electricity_grid_factors.csv'), index=False)
print(f'\n✓ electricity_grid_factors.csv ({len(grid_df)} rows)')
print(grid_df.head(5).to_string(index=False))

# ============================================================
# 3. Table 1: Stationary Combustion (Fuel factors)
# Rows 13-29 in the raw sheet
# ============================================================
fuel_data = []
for i in range(15, 30):
    row = df.iloc[i]
    vals = [x for x in row.tolist() if pd.notna(x)]
    if len(vals) >= 5:
        try:
            fuel_data.append({
                'fuel_type': str(vals[0]).strip(),
                'heat_content_mmbtu_per_short_ton': float(vals[1]),
                'co2_kg_per_mmbtu': float(vals[2]),
                'ch4_g_per_mmbtu': float(vals[3]),
                'n2o_g_per_mmbtu': float(vals[4]),
                'co2_kg_per_short_ton': float(vals[5]) if len(vals) > 5 else None,
            })
        except (ValueError, TypeError):
            pass

fuel_df = pd.DataFrame(fuel_data)
fuel_df.to_csv(os.path.join(OUT_DIR, 'stationary_combustion_factors.csv'), index=False)
print(f'\n✓ stationary_combustion_factors.csv ({len(fuel_df)} rows)')
print(fuel_df.to_string(index=False))

# ============================================================
# 4. Custom: International Grid Intensity Lookup
#    (Not in EPA file - these are IEA/regional averages for
#     non-US countries used in our supply chain)
# ============================================================
intl_grid = pd.DataFrame([
    {'country': 'Vietnam', 'region': 'SE ASIA', 'co2_kg_per_kwh': 0.58, 'source': 'IEA 2023'},
    {'country': 'China', 'region': 'N ASIA', 'co2_kg_per_kwh': 0.55, 'source': 'IEA 2023'},
    {'country': 'Indonesia', 'region': 'S ASIA', 'co2_kg_per_kwh': 0.72, 'source': 'IEA 2023'},
    {'country': 'India', 'region': 'S ASIA', 'co2_kg_per_kwh': 0.71, 'source': 'CEA India 2023'},
    {'country': 'Thailand', 'region': 'SE ASIA', 'co2_kg_per_kwh': 0.49, 'source': 'IEA 2023'},
    {'country': 'South Korea', 'region': 'N ASIA', 'co2_kg_per_kwh': 0.42, 'source': 'IEA 2023'},
    {'country': 'Taiwan', 'region': 'N ASIA', 'co2_kg_per_kwh': 0.50, 'source': 'IEA 2023'},
    {'country': 'Japan', 'region': 'N ASIA', 'co2_kg_per_kwh': 0.46, 'source': 'IEA 2023'},
    {'country': 'Sri Lanka', 'region': 'S ASIA', 'co2_kg_per_kwh': 0.38, 'source': 'IEA 2023'},
    {'country': 'Pakistan', 'region': 'S ASIA', 'co2_kg_per_kwh': 0.45, 'source': 'IEA 2023'},
    {'country': 'Cambodia', 'region': 'SE ASIA', 'co2_kg_per_kwh': 0.65, 'source': 'IEA 2023'},
    {'country': 'Bangladesh', 'region': 'S ASIA', 'co2_kg_per_kwh': 0.58, 'source': 'IEA 2023'},
    {'country': 'Brazil', 'region': 'AMERICAS', 'co2_kg_per_kwh': 0.10, 'source': 'IEA 2023'},
    {'country': 'Turkey', 'region': 'EMEA', 'co2_kg_per_kwh': 0.42, 'source': 'IEA 2023'},
    {'country': 'Egypt', 'region': 'EMEA', 'co2_kg_per_kwh': 0.49, 'source': 'IEA 2023'},
    {'country': 'Jordan', 'region': 'EMEA', 'co2_kg_per_kwh': 0.52, 'source': 'IEA 2023'},
    {'country': 'USA', 'region': 'AMERICAS', 'co2_kg_per_kwh': 0.35, 'source': 'EPA eGRID 2023'},
    {'country': 'Mexico', 'region': 'AMERICAS', 'co2_kg_per_kwh': 0.42, 'source': 'IEA 2023'},
    {'country': 'Honduras', 'region': 'AMERICAS', 'co2_kg_per_kwh': 0.40, 'source': 'IEA 2023'},
    {'country': 'El Salvador', 'region': 'AMERICAS', 'co2_kg_per_kwh': 0.28, 'source': 'IEA 2023'},
    {'country': 'Guatemala', 'region': 'AMERICAS', 'co2_kg_per_kwh': 0.35, 'source': 'IEA 2023'},
    {'country': 'Philippines', 'region': 'N ASIA', 'co2_kg_per_kwh': 0.60, 'source': 'IEA 2023'},
    {'country': 'Malaysia', 'region': 'S ASIA', 'co2_kg_per_kwh': 0.58, 'source': 'IEA 2023'},
    {'country': 'Georgia', 'region': 'EMEA', 'co2_kg_per_kwh': 0.15, 'source': 'IEA 2023'},
    {'country': 'Italy', 'region': 'EMEA', 'co2_kg_per_kwh': 0.26, 'source': 'IEA 2023'},
    {'country': 'Argentina', 'region': 'AMERICAS', 'co2_kg_per_kwh': 0.31, 'source': 'IEA 2023'},
    {'country': 'Nicaragua', 'region': 'AMERICAS', 'co2_kg_per_kwh': 0.35, 'source': 'IEA 2023'},
    {'country': 'Laos', 'region': 'SE ASIA', 'co2_kg_per_kwh': 0.30, 'source': 'IEA 2023'},
    {'country': 'Moldova', 'region': 'EMEA', 'co2_kg_per_kwh': 0.48, 'source': 'IEA 2023'},
])
intl_grid.to_csv(os.path.join(OUT_DIR, 'international_grid_factors.csv'), index=False)
print(f'\n✓ international_grid_factors.csv ({len(intl_grid)} rows)')

print('\n✅ All emission factor lookup tables extracted successfully.')
print(f'   Output directory: {OUT_DIR}')
