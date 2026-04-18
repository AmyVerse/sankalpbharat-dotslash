import os
import zipfile
import shutil
from pathlib import Path

source_zip = Path("test_data.zip")
target_zip = Path("mini_test_data.zip")
extract_dir = Path("tmp_extract_mini")

if not source_zip.exists():
    print(f"Error: {source_zip} not found!")
    exit(1)

print(f"Extracting {source_zip}...")
extract_dir.mkdir(exist_ok=True)

with zipfile.ZipFile(source_zip, 'r') as zf:
    zf.extractall(extract_dir)

# Find all invoices (txt files, usually RAW_INV*.txt or similar)
# We will keep the first 5 invoices and delete the rest
invoices = list(extract_dir.rglob("*.txt"))

keep_count = 5
if len(invoices) > keep_count:
    print(f"Found {len(invoices)} invoices. Keeping {keep_count} and deleting the rest...")
    for inv in invoices[keep_count:]:
        inv.unlink()
else:
    print(f"Found only {len(invoices)} invoices, keeping all of them.")

# Create the new mini zip
print(f"Repackaging into {target_zip}...")
with zipfile.ZipFile(target_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for file_path in extract_dir.rglob("*"):
        if file_path.is_file():
            # Keep relative structure
            arcname = file_path.relative_to(extract_dir)
            zf.write(file_path, arcname)

# Cleanup temp folder
shutil.rmtree(extract_dir)

print(f"Successfully created {target_zip} ({target_zip.stat().st_size / 1024 / 1024:.2f} MB)")
