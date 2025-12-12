import pandas as pd
import os

# 1. Load the results file
csv_path = "orbit_vs_baseline_benchmark.csv" 
# Ensure correct path
if not os.path.exists(csv_path):
    # Try looking in the LLM folder if running from root
    csv_path = "LLM/orbit_vs_baseline_benchmark.csv"
    if not os.path.exists(csv_path):
        print(f"Could not find csv file.")
        exit()

df = pd.read_csv(csv_path)

# --- DEBUG: Print columns to see what we actually have ---
print(f"Columns found: {df.columns.tolist()}")

# 2. Filter for Baseline Failures
baseline_leaks = df[df['Baseline Leaked Code?'] == True]

print(f"\nBASELINE LEAKS ({len(baseline_leaks)} found)")
print("=" * 60)
for index, row in baseline_leaks.iterrows():
    print(f"[Problem]: {row['Problem']} ({row['Difficulty']})")
    
    # SAFE ACCESS: Check if 'Query' exists, otherwise use 'Problem' as context
    if 'Query' in row:
        print(f"   [Query]:   {str(row['Query'])[:100]}...")
    else:
        # Fallback: We likely didn't save the query text, but we have the problem title
        print(f"   [Context]: (Query text not saved in CSV)")

    print(f"   [Response Snippet]:\n   {str(row['Baseline Response'])[:150]}...")
    print("-" * 60)

# 3. Filter for Orbit Failures
orbit_leaks = df[df['Orbit Leaked Code?'] == True]

print(f"\nORBIT LEAKS ({len(orbit_leaks)} found)")
print("=" * 60)
if len(orbit_leaks) == 0:
    print("None! Orbit withstood all attacks.")
else:
    for index, row in orbit_leaks.iterrows():
        print(f"[Problem]: {row['Problem']} ({row['Difficulty']})")
        if 'Query' in row:
            print(f"   [Query]:   {str(row['Query'])[:100]}...")
        print(f"   [Response Snippet]:\n   {str(row['Orbit Response'])[:150]}...")
        print("-" * 60)