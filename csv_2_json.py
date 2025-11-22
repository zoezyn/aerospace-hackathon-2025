import pandas as pd
import json

df = pd.read_csv("data/Collision Warnings Data.csv")

records = []
for _, row in df.iterrows():
    record = {
        "alert_level": row.alert_level,
        "tca_time": row.tca_time,
        "distance_km": row.distance_km,
        "relative_velocity_km_s": row.relative_velocity_km_s,
        "sat1": {
            "name": row.sat1_name,
            "catalog": row.sat1_catalog,
            "position": {"x": row.sat1_x, "y": row.sat1_y, "z": row.sat1_z},
            "velocity": {"vx": row.sat1_vx, "vy": row.sat1_vy, "vz": row.sat1_vz},
        },
        "sat2": {
            "name": row.sat2_name,
            "catalog": row.sat2_catalog,
            "position": {"x": row.sat2_x, "y": row.sat2_y, "z": row.sat2_z},
            "velocity": {"vx": row.sat2_vx, "vy": row.sat2_vy, "vz": row.sat2_vz},
        }
    }
    records.append(record)

with open("data/conjunctions_nested.json", "w") as f:
    json.dump(records, f, indent=2)
