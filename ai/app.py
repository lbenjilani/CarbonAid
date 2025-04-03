# Imports
import pandas as pd
import matplotlib.pyplot as plt

# Load the dataset
df = pd.read_csv("ai/data/uk_gas.csv", sep=';')

# --- BASIC EDA ---

# Preview the first few rows
print("Preview of the dataset:")
print(df.head())

# Show basic info about data types and missing values
print("\nDataset Info:")
print(df.info())

# Strip column names of whitespace
df.columns = df.columns.str.strip()

# Check for duplicate rows
duplicates = df.duplicated().sum()
print(f"\nNumber of duplicate rows: {duplicates}")

# Display summary of non-numeric columns
print("\nUnique values in categorical columns:")
for col in df.columns[:3]:
    print(f"{col}: {df[col].unique()}")

# Identify year columns (assumed to start from 4th column)
year_columns = df.columns[3:]

# Convert year columns to numeric (handling coercion for errors)
df[year_columns] = df[year_columns].apply(pd.to_numeric, errors='coerce')

# Summary of missing values per column
print("\nMissing values per column:")
print(df.isna().sum())

# --- CLEANSING & ADDITIONAL METADATA ---

# Add zero and missing counts per row
df['Zero_Count'] = (df[year_columns] == 0).sum(axis=1)
df['Missing_Count'] = df[year_columns].isna().sum(axis=1)

# Count rows where all year values are 0 or NaN
all_zero_or_nan_rows = df[year_columns].apply(lambda row: ((row == 0) | (row.isna()))).all(axis=1).sum()
print(f"\nRows with all values as 0 or NaN: {all_zero_or_nan_rows}")

# Drop rows with no meaningful data if needed
df = df[~((df[year_columns] == 0) | (df[year_columns].isna())).all(axis=1)]

# Replace 0s with NaN if you want to exclude them from analysis
df_no_zeros = df.copy()
df_no_zeros[year_columns] = df_no_zeros[year_columns].replace(0, pd.NA)

# Generate descriptive stats (excluding zeros)
print("\nDescriptive statistics (excluding 0s):")
print(df_no_zeros[year_columns].describe())

# Optional: save the cleaned version
# df.to_csv("ai/data/uk_gas_cleaned.csv", sep=';', index=False)

# --- FILTER & VISUALIZATION FOR MOSTLY-ZERO ROWS ---

# Filter rows that have mostly 0.0 values but NOT all the same value
def is_mostly_zeros(row, threshold=0.7):
    zero_ratio = (row == 0).sum() / len(row)
    unique_vals = row.dropna().unique()
    return zero_ratio >= threshold and len(unique_vals) > 1

# Create boolean mask
mostly_zeros_mask = df[year_columns].apply(is_mostly_zeros, axis=1)

# Filtered DataFrame
filtered_df = df[mostly_zeros_mask]
filtered_rows = filtered_df[year_columns]

# --- Console Output of Filtered Categories ---
print("\nFiltered rows (mostly 0.0 values but not flat lines):\n")
for _, row in filtered_df.iterrows():
    print(" > ", " | ".join(str(row[col]) for col in df.columns[:3]))

print(f"\nTotal rows matching criteria: {len(filtered_df)}")

# --- Plot ---
plt.figure(figsize=(14, 8))

for _, row in filtered_rows.iterrows():
    values = row.values.astype(float)
    min_val, max_val = values.min(), values.max()
    if max_val > min_val:
        values = (values - min_val) / (max_val - min_val)
    plt.plot(year_columns, values, alpha=0.5)

plt.title("Filtered Time Series: Mostly Zeros but Not Constant")
plt.xlabel("Year")
plt.ylabel("Normalized Emissions")
plt.xticks(rotation=45)
plt.grid(True)
plt.tight_layout()
plt.show()
