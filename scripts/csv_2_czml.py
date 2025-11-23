#!/usr/bin/env python3
"""
csv_to_czml.py

Convert satellite time-series CSV (x_km, y_km, z_km) into CZML.

Input CSV columns required:
    satellite_name, time, x_km, y_km, z_km

Optional columns (ignored unless needed):
    vx_km_s, vy_km_s, vz_km_s, altitude_km

Usage:
    python csv_to_czml.py input.csv output.czml
"""

import csv
import json
import sys
from datetime import datetime, timezone
from collections import defaultdict


def parse_iso8601(t):
    """Parse ISO time and ensure UTC Z format."""
    if t.endswith("Z"):
        return datetime.fromisoformat(t.replace("Z", "+00:00"))
    return datetime.fromisoformat(t).replace(tzinfo=timezone.utc)


def csv_to_czml(input_csv, output_czml):

    # satellites[sat_name] = list of (time_dt, x_m, y_m, z_m)
    satellites = defaultdict(list)

    with open(input_csv, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:

            sat = row["satellite_name"]
            time_dt = parse_iso8601(row["time"])

            # Convert km → meters
            x = float(row["x_km"]) * 1000.0
            y = float(row["y_km"]) * 1000.0
            z = float(row["z_km"]) * 1000.0

            satellites[sat].append((time_dt, x, y, z))

    # Begin CZML output
    czml = [
        {
            "id": "document",
            "name": "Satellite Time Series",
            "version": "1.0"
        }
    ]

    # Build packet for each satellite
    for sat_name, samples in satellites.items():

        # Sort by timestamp
        samples.sort(key=lambda x: x[0])
        epoch = samples[0][0]

        # Build cartesian array: [dt, x, y, z, dt2, x2, y2, z2, ...]
        cartesian = []
        for t, x, y, z in samples:
            dt = (t - epoch).total_seconds()
            cartesian.extend([dt, x, y, z])

        availability = (
            epoch.isoformat().replace("+00:00", "Z")
            + "/"
            + samples[-1][0].isoformat().replace("+00:00", "Z")
        )

        packet = {
            "id": sat_name,
            "name": sat_name,
            "availability": availability,
            "position": {
                "epoch": epoch.isoformat().replace("+00:00", "Z"),
                "cartesian": cartesian,
                "interpolationAlgorithm": "LAGRANGE",
                "interpolationDegree": 1
            },
            "point": {
                "pixelSize": 10
            }
        }

        czml.append(packet)

    # Save CZML
    with open(output_czml, "w") as f:
        json.dump(czml, f, indent=2)

    print(f"✓ CZML written to: {output_czml}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python csv_to_czml.py input.csv output.czml")
        sys.exit(1)

    csv_to_czml(sys.argv[1], sys.argv[2])
