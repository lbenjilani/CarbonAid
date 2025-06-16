# 📦 Imports
import os
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# 🗂️ Load & Clean
df = pd.read_csv("ai/data/uk_gas.csv", sep=';')
df.columns = df.columns.str.strip()
year_cols = df.columns[3:]
df[year_cols] = df[year_cols].apply(pd.to_numeric, errors='coerce')
df_no_zeros = df.copy()
df_no_zeros[year_cols] = df_no_zeros[year_cols].replace(0, pd.NA)

# 📁 Ensure img/ folder exists
img_dir = "ai/img"
os.makedirs(img_dir, exist_ok=True)

# 📊 Basic Info
print("▶️ Preview:\n", df.head())
print("\nℹ️ Info:\n"); df.info()
print("\n🧮 Duplicates:", df.duplicated().sum())
print("\n🔢 Unique values in categorical columns:")
for col in df.columns[:3]:
    print(f"{col}: {df[col].nunique()} values")

# 🧼 Row Analysis
df['Zero_Count'] = (df[year_cols] == 0).sum(axis=1)
df['Missing_Count'] = df[year_cols].isna().sum(axis=1)
all_zero_or_nan_rows = df[year_cols].apply(lambda r: ((r == 0) | (r.isna()))).all(axis=1).sum()
print(f"\n❌ Rows with all 0 or NaN: {all_zero_or_nan_rows}")
df = df[~((df[year_cols] == 0) | (df[year_cols].isna())).all(axis=1)]

# 📈 Yearly Totals
total_by_year = df[year_cols].sum()
plt.figure(figsize=(14, 6))
sns.lineplot(x=total_by_year.index, y=total_by_year.values)
plt.title("Total Emissions Over Time (All Categories)")
plt.xlabel("Year")
plt.ylabel("Total Emissions")
plt.grid(True)
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig(os.path.join(img_dir, "total_emissions_over_time.png"), dpi=300)  # Save before showing
plt.show()  # Show after saving

# 🏛️ Sector Count
plt.figure(figsize=(10, 6))
df['TES sector'].value_counts().plot(kind='barh')
plt.title("Record Count per TES Sector")
plt.xlabel("Count")
plt.tight_layout()
plt.savefig(os.path.join(img_dir, "sector_record_count.png"), dpi=300)  # Save before showing
plt.show()  # Show after saving

# 🏷️ Category Count (Top 20)
plt.figure(figsize=(10, 6))
df['TES category'].value_counts().head(20).plot(kind='barh')
plt.title("Top 20 TES Categories")
plt.xlabel("Count")
plt.tight_layout()
plt.savefig(os.path.join(img_dir, "top20_tes_categories.png"), dpi=300)  # Save before showing
plt.show()  # Show after saving

# 🔥 Grand Total Trend
grand = df[df["TES sector"] == "Grand total"][year_cols].T
grand.columns = ["Emissions"]
grand.index.name = "Year"
grand.reset_index(inplace=True)
grand["Year"] = grand["Year"].astype(int)

plt.figure(figsize=(14, 6))
sns.lineplot(data=grand, x="Year", y="Emissions")
plt.title("UK Grand Total Emissions Trend")
plt.ylabel("Emissions")
plt.grid(True)
plt.tight_layout()
plt.savefig(os.path.join(img_dir, "uk_grand_total_emissions.png"), dpi=300)  # Save before showing
plt.show()  # Show after saving

# 🔄 Year-on-Year Change Analysis
delta = df_no_zeros[year_cols].diff(axis=1)
df['Mean_YoY_Change'] = delta.mean(axis=1)
df['Std_YoY_Change'] = delta.std(axis=1)

top_changers = df[['TES sector', 'TES category', 'Mean_YoY_Change', 'Std_YoY_Change']]\
    .sort_values(by='Std_YoY_Change', ascending=False).head(10)

print("\n📉 Top 10 Volatile Categories (High Std Dev in YoY):")
print(top_changers)
