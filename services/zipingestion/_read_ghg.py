import pandas as pd

xl = pd.ExcelFile(r'../../ghg-emission-factors-hub-2025(1).xlsx')
df = pd.read_excel(xl, 'Emission Factors Hub', header=None)

# Table 8: Scope 3 Transportation (rows ~418-430)
print('=== TABLE 8: Scope 3 Transport (rows 418-428) ===')
for i in range(418, 430):
    vals = [str(x) for x in df.iloc[i].tolist() if pd.notna(x)]
    if vals:
        print(f'Row {i}: {" | ".join(vals)}')

# Table 6: Electricity (rows ~333-370)
print('\n\n=== TABLE 6: Electricity / eGRID (rows 333-370) ===')
for i in range(333, 375):
    vals = [str(x) for x in df.iloc[i].tolist() if pd.notna(x)]
    if vals:
        print(f'Row {i}: {" | ".join(vals)}')

# Also check what's right after Table 8 header
print('\n\n=== Detailed Table 8 area (rows 418-428) ===')
for i in range(418, 430):
    print(f'Row {i}: {df.iloc[i].tolist()}')
