import pandas as pd
import numpy as np
from pathlib import Path
import re

COLUMN_SYNONYMS = {
    'supplier_name':['supplier','vendor','vendor_name','suppliername'],
    'quantity':['qty','quantity','units','volume'],
    'amount':['amount','price','value','total','amt'],
    'purchase_date':['date','txn_date','purchase_dt','invoice_date'],
    'plant_id':['plant','plant_code','site_id'],
    'cost':['expense','cost','charges'],
    'record_date':['record_date','usage_date']
}

def normalize_name(col):
    return re.sub(r'[^a-z0-9_]+','',col.strip().lower().replace(' ','_'))

def auto_map_columns(df):
    rename_map = {}
    for col in df.columns:
        n = normalize_name(col)
        for std, vals in COLUMN_SYNONYMS.items():
            if n == std or n in vals:
                rename_map[col] = std
                break
    return df.rename(columns=rename_map)

class EnterpriseCleaner:
    DATASET_SCHEMAS = {
        'operational': {'required':['plant_id','quantity','record_date'], 'allowed':{}},
        'financial': {'required':['amount','purchase_date'], 'allowed':{}},
        'emissions': {'required':['scope','co2e','record_date'], 'allowed':{'scope':[1,2,3]}},
        'generic': {'required':[], 'allowed':{}}
    }
    def __init__(self, df, dataset_type='generic', source_file='upload.csv'):
        self.df = auto_map_columns(df.copy())
        self.dataset_type = dataset_type if dataset_type in self.DATASET_SCHEMAS else 'generic'
        self.source_file = source_file
        self.rejected_rows = []
        self.report = {'rows_before':len(df),'rows_after':0,'duplicates_removed':0,'filled':{},'outliers':{},'warnings':[]}
    def standardize(self):
        self.df.columns = [normalize_name(c) for c in self.df.columns]
    def validate_schema(self):
        req = self.DATASET_SCHEMAS[self.dataset_type]['required']
        miss = [c for c in req if c not in self.df.columns]
        if miss:
            raise ValueError(f'Missing required columns: {miss}')
    def parse_dirty_numeric(self, x):
        if pd.isna(x):
            return np.nan
        if isinstance(x, (int, float, np.number)):
            return x
        s = str(x).strip().replace(',', '')
        s = re.sub(r'[$₹€%]', '', s)
        try:
            return float(s)
        except Exception:
            return np.nan
    def convert_types(self):
        for c in self.df.columns:
            if 'date' in c:
                self.df[c] = pd.to_datetime(self.df[c], errors='coerce')
            elif self.df[c].dtype == 'object':
                parsed = self.df[c].map(self.parse_dirty_numeric)
                threshold = max(1, int(0.8 * self.df[c].notna().sum()))
                if parsed.notna().sum() >= threshold:
                    self.df[c] = parsed
    def remove_empty_and_duplicates(self):
        self.df = self.df.dropna(how='all')
        before = len(self.df)
        self.df = self.df.drop_duplicates()
        self.report['duplicates_removed'] = before - len(self.df)
    def fill_missing(self):
        for c in self.df.columns:
            miss = int(self.df[c].isna().sum())
            if miss == 0:
                continue
            ratio = miss / len(self.df)
            if ratio > 0.8:
                self.report['warnings'].append(f'{c} mostly missing')
                continue
            if pd.api.types.is_numeric_dtype(self.df[c]):
                val = self.df[c].median() if abs(self.df[c].dropna().skew()) > 1 else self.df[c].mean()
                self.df[c] = self.df[c].fillna(val)
            elif pd.api.types.is_datetime64_any_dtype(self.df[c]):
                self.df[c] = self.df[c].ffill()
            else:
                mode = self.df[c].mode()
                self.df[c] = self.df[c].fillna(mode.iloc[0] if not mode.empty else 'Unknown')
            self.report['filled'][c] = miss
    def group_impute(self):
        if 'plant_id' not in self.df.columns:
            return
        for c in self.df.select_dtypes(include=np.number).columns:
            self.df[c] = self.df.groupby('plant_id')[c].transform(lambda x: x.fillna(x.median()))
            self.df[c] = self.df[c].fillna(self.df[c].median())
    def detect_outliers(self):
        for c in self.df.select_dtypes(include=np.number).columns:
            q1, q3 = self.df[c].quantile([0.25,0.75])
            iqr = q3 - q1
            low, high = q1 - 1.5*iqr, q3 + 1.5*iqr
            mask = (self.df[c] < low) | (self.df[c] > high)
            self.report['outliers'][c] = int(mask.sum())
            self.df[c] = self.df[c].clip(low, high)
    def validate_allowed(self):
        for c, vals in self.DATASET_SCHEMAS[self.dataset_type]['allowed'].items():
            if c in self.df.columns:
                bad = ~self.df[c].isin(vals)
                if bad.any():
                    self.rejected_rows.append(self.df[bad].assign(reject_reason=f'invalid_{c}'))
                    self.df = self.df[~bad]
    def business_rules(self):
        for c in ['quantity','amount','cost','co2e']:
            if c in self.df.columns:
                bad = self.df[c].fillna(0) < 0
                if bad.any():
                    self.rejected_rows.append(self.df[bad].assign(reject_reason=f'negative_{c}'))
                    self.df = self.df[~bad]
        for c in self.df.columns:
            if 'date' in c:
                bad = self.df[c].notna() & (self.df[c] > pd.Timestamp.now())
                if bad.any():
                    self.rejected_rows.append(self.df[bad].assign(reject_reason='future_date'))
                    self.df = self.df[~bad]
    def add_lineage(self):
        self.df['source_file'] = self.source_file
        self.df['processed_at'] = pd.Timestamp.now()
        self.df['pipeline_version'] = 'v2'
    def run(self):
        self.standardize()
        self.validate_schema()
        self.convert_types()
        self.remove_empty_and_duplicates()
        self.fill_missing()
        self.group_impute()
        self.detect_outliers()
        self.validate_allowed()
        self.business_rules()
        self.add_lineage()
        rejected = pd.concat(self.rejected_rows, ignore_index=True) if self.rejected_rows else pd.DataFrame()
        self.report['rows_after'] = len(self.df)
        self.report['rejected_rows'] = len(rejected)
        return self.df, rejected, self.report

def load_file(path):
    ext = Path(path).suffix.lower()
    return pd.read_csv(path) if ext == '.csv' else pd.read_excel(path)


def clean_file(path, dataset_type='generic'):
    df = load_file(path)
    clean_df, _rejected_df, report = EnterpriseCleaner(df, dataset_type, Path(path).name).run()
    return clean_df, report

if __name__ == '__main__':
    df = load_file('sample.csv')
    clean_df, rejected_df, report = EnterpriseCleaner(df, 'generic', 'sample.csv').run()
    print(clean_df.head())
    print(rejected_df.head())
    print(report)