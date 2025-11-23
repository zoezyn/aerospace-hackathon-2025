from sgp4.api import Satrec, jday
from datetime import datetime, timedelta, timezone
import pandas as pd
import os
import math

# Your filter list of sat2_catalog IDs
FILTER_IDS = [
    25544,
    26441,
    34400,
    41340,
    44747,
    45535,
    45641,
    46117,
    46326,
    46457,
    46699,
    46744,
    47576,
    50032,
    51061,
    52161,
    52747,
    53077,
    54092,
    55861,
    58262,
    58306,
    58308,
    58565,
    59130,
    59140,
    60491,
    60502,
    60520,
    60567,
    60568,
    64814,
    65410,
    65518,
    65613,
    66007,
    66021,
]

EARTH_RADIUS_KM = 6371.0

def parse_tle_file(tle_path):
    """Read TLE file, return list of (name, line1, line2) tuples"""
    sats = []
    with open(tle_path, 'r') as f:
        lines = [line.strip() for line in f if line.strip()]
    if len(lines) % 3 != 0:
        raise ValueError("TLE file does not have multiples of 3 lines.")
    for i in range(0, len(lines), 3):
        name = lines[i]
        line1 = lines[i+1]
        line2 = lines[i+2]
        sats.append((name, line1, line2))
    return sats

def extract_sat2_catalog_from_name(name, line2=None):
    import re
    
    # First, try to extract from the TLE line 2 if provided (most reliable)
    if line2 and line2.startswith('2'):
        try:
            # The first number after '2 ' is the catalog number
            catalog_num = int(line2[2:7].strip())
            return catalog_num
        except (ValueError, IndexError):
            pass
    
    # Fallback to name-based extraction
    # Try to find a 5-digit number in the name (common format)
    match = re.search(r'\b(\d{5})\b', name)
    if match:
        return int(match.group(1))
    
    # Try to find a number after a dash (e.g., STARLINK-1234)
    match = re.search(r'[-_](\d{2,})$', name.strip())
    if match:
        num = int(match.group(1))
        if num < 1000:  # If it's a small number, it's likely part of a larger catalog
            return num + 50000  # Add an offset to avoid conflicts
        return num
    
    # Try to find any number in the name as a last resort
    match = re.search(r'(\d+)', name)
    if match:
        return int(match.group(1))
        
    return None

def propagate_tle(name, line1, line2, start_dt, hours=72, dt_seconds=60):
    sat = Satrec.twoline2rv(line1, line2)
    n_steps = int((hours * 3600) // dt_seconds) + 1
    rows = []
    for i in range(n_steps):
        cur_dt = start_dt + timedelta(seconds=i * dt_seconds)
        jd, fr = jday(cur_dt.year, cur_dt.month, cur_dt.day,
                      cur_dt.hour, cur_dt.minute, cur_dt.second + cur_dt.microsecond * 1e-6)
        e, r, v = sat.sgp4(jd, fr)
        if e != 0:
            rows.append({
                "satellite_name": name,
                "catalog_number": None,
                "time": cur_dt.isoformat() + "Z",
                "x_km": None, "y_km": None, "z_km": None,
                "vx_km_s": None, "vy_km_s": None, "vz_km_s": None,
                "altitude_km": None,
                "error_code": e
            })
        else:
            altitude = math.sqrt(r[0]**2 + r[1]**2 + r[2]**2) - EARTH_RADIUS_KM
            rows.append({
                "satellite_name": name,
                "catalog_number": None,  # to be filled outside this func
                "time": cur_dt.isoformat() + "Z",
                "x_km": r[0], "y_km": r[1], "z_km": r[2],
                "vx_km_s": v[0], "vy_km_s": v[1], "vz_km_s": v[2],
                "altitude_km": altitude,
                "error_code": 0
            })
    return rows

def main():
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Construct absolute paths
    data_dir = os.path.join(script_dir, "..", "data")
    tle_path = os.path.join(data_dir, "satellite_active.TLE")
    output_folder = os.path.join(script_dir, "..", "data")
    
    os.makedirs(output_folder, exist_ok=True)

    try:
        sats = parse_tle_file(tle_path)
        print(f"Successfully loaded TLE file: {tle_path}")
    except FileNotFoundError:
        print(f"Error: Could not find TLE file at {tle_path}")
        print("Please ensure the file exists and the path is correct.")
        return
    start_dt = datetime.now(timezone.utc)

    filtered_sats = []
    for (name, line1, line2) in sats:
        sat2_catalog = extract_sat2_catalog_from_name(name, line2)
        if sat2_catalog is None:
            print(f"Warning: Could not extract catalog number from '{name}', skipping.")
            continue
        if sat2_catalog in FILTER_IDS:
            filtered_sats.append((name, line1, line2, sat2_catalog))
            print(f"Including {name} (catalog {sat2_catalog})")
        else:
            print(f"Skipping {name} (catalog {sat2_catalog}) not in filter list.")

    all_data = []
    
    for (name, line1, line2, catalog_number) in filtered_sats:
        print(f"Processing {name} (catalog {catalog_number})")
        data = propagate_tle(name, line1, line2, start_dt, hours=72, dt_seconds=60)
        # Fill catalog_number into each row
        for row in data:
            row["catalog_number"] = catalog_number
        all_data.extend(data)
    
    # Create a single DataFrame with all data
    if all_data:
        df = pd.DataFrame(all_data)
        
        # Reorder columns for the output
        df = df[[
            "satellite_name", "catalog_number", "time",
            "x_km", "y_km", "z_km",
            "vx_km_s", "vy_km_s", "vz_km_s",
            "altitude_km"
        ]]
        
        # Create output filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        out_file = os.path.join(output_folder, f"satellite_positions_{timestamp}.csv")
        df.to_csv(out_file, index=True)
        print(f"\nSaved all satellite data to {out_file}")
        print(f"Total positions: {len(df)}")
        print(f"Unique satellites: {df['satellite_name'].nunique()}")
    else:
        print("No data to save. No satellites matched the filter criteria.")

if __name__ == "__main__":
    main()