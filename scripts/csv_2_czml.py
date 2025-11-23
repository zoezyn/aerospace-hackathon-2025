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
import math
import os
from datetime import datetime, timezone
from collections import defaultdict
from typing import Dict, Optional, Tuple

# Earth's radius in meters
EARTH_RADIUS = 6378137.0

def load_conjunctions_data(conjunctions_path: str) -> Tuple[Dict[int, str], Dict[int, str]]:
    """
    Load conjunctions data and return a mapping of catalog numbers to alert levels.
    Returns two dictionaries: one for sat1 and one for sat2.
    """
    sat1_alerts = {}
    sat2_alerts = {}
    
    try:
        with open(conjunctions_path, 'r') as f:
            conjunctions = json.load(f)
            
        for entry in conjunctions:
            sat1_catalog = entry.get('sat1', {}).get('catalog')
            sat2_catalog = entry.get('sat2', {}).get('catalog')
            alert_level = entry.get('alert_level', 'GREEN')
            
            if sat1_catalog is not None:
                sat1_alerts[sat1_catalog] = alert_level
            if sat2_catalog is not None:
                sat2_alerts[sat2_catalog] = alert_level
                
    except Exception as e:
        print(f"Warning: Could not load conjunctions data: {e}")
    
    return sat1_alerts, sat2_alerts


def parse_iso8601(t):
    """Parse ISO time and ensure UTC Z format."""
    # Remove any existing timezone offset
    if '+' in t:
        t = t.split('+')[0]
    elif 'Z' in t:
        t = t.replace('Z', '')
    # Parse as naive datetime and set timezone to UTC
    return datetime.fromisoformat(t).replace(tzinfo=timezone.utc)

def cartesian_to_geodetic(x, y, z):
    """Convert Cartesian coordinates (meters) to geodetic coordinates (degrees, meters)."""
    # Convert to WGS84 ellipsoid coordinates
    a = 6378137.0  # WGS84 semi-major axis
    f = 1 / 298.257223563  # WGS84 flattening
    b = a * (1 - f)  # semi-minor axis
    e2 = 1 - (b / a) ** 2  # square of eccentricity
    
    # Calculate longitude (in radians)
    lon = math.atan2(y, x)
    
    # Calculate latitude using Bowring's method
    p = math.sqrt(x**2 + y**2)
    theta = math.atan2(z * a, p * b)
    lat = math.atan2(z + (e2 * b * math.sin(theta)**3), 
                    p - (e2 * a * math.cos(theta)**3))
    
    # Calculate height above ellipsoid
    N = a / math.sqrt(1 - e2 * math.sin(lat)**2)
    h = (p / math.cos(lat)) - N
    
    # Convert to degrees
    lat_deg = math.degrees(lat)
    lon_deg = math.degrees(lon)
    
    return lon_deg, lat_deg, h


def get_alert_color(alert_level, alpha=255):
    """Return RGBA color based on alert level."""
    print(f"Alert level: {alert_level}")
    if alert_level.upper() == 'RED':
        return [255, 0, 0, alpha]  # Red
    elif alert_level.upper() == 'YELLOW':
        return [255, 255, 0, alpha]  # Yellow
    else:
        return [0, 255, 0, alpha]  # Default to green for any other case

def csv_to_czml(input_csv, output_czml, conjunctions_path=None):
    # Load conjunctions data if path is provided
    sat1_alerts, sat2_alerts = {}, {}
    if conjunctions_path and os.path.exists(conjunctions_path):
        sat1_alerts, sat2_alerts = load_conjunctions_data(conjunctions_path)
    
    # satellites[sat_name] = list of (time_dt, x_m, y_m, z_m, catalog_number, alert_level)
    satellites = defaultdict(list)

    with open(input_csv, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sat = row["satellite_name"]
            time_dt = parse_iso8601(row["time"])
            
            # Extract catalog number if it exists, otherwise use a hash of the name
            catalog_number = row.get("catalog_number", str(abs(hash(sat)))[:6])
            
            # Convert km → meters
            x = float(row["x_km"]) * 1000.0
            y = float(row["y_km"]) * 1000.0
            z = float(row["z_km"]) * 1000.0

            # Get alert level from conjunctions data if available, otherwise from CSV or default to 'GREEN'
            alert_level = 'GREEN'
            
            # Try to get catalog number as int for lookup
            try:
                catalog_int = int(catalog_number)
                # Check in sat1_alerts first, then sat2_alerts
                alert_level = sat1_alerts.get(catalog_int, 
                                           sat2_alerts.get(catalog_int, 
                                                         row.get('alert_level', 'GREEN')))
            except (ValueError, TypeError):
                # If catalog number can't be converted to int, use the one from CSV or default
                alert_level = row.get('alert_level', 'GREEN')
                
            satellites[sat].append((time_dt, x, y, z, catalog_number, alert_level))

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
        # Get the catalog number and alert level from the first sample
        catalog_number = samples[0][4]  # 4th index is catalog_number
        alert_level = samples[0][5]  # 5th index is alert_level
        alert_color = get_alert_color(alert_level)
        
        # Sort by timestamp
        samples.sort(key=lambda x: x[0])
        epoch = samples[0][0]

        # Prepare cartographic degrees arrays for position and polyline
        cartographic_degrees = []
        polyline_positions = []
        
        for t, x, y, z, _, _ in samples:
            # Convert cartesian to geodetic coordinates
            lon, lat, height = cartesian_to_geodetic(x, y, z)
            
            # Add to cartographic degrees for position
            cartographic_degrees.extend([
                t.isoformat().replace("+00:00", "Z"),
                lon, lat, height
            ])
            
            # Add to polyline positions
            polyline_positions.extend([lon, lat, height])

        availability = (
            epoch.isoformat().replace("+00:00", "Z")
            + "/"
            + samples[-1][0].isoformat().replace("+00:00", "Z")
        )

        # Get short name for label (first word or first 3 characters of name)
        short_name = sat_name.split()[0] if ' ' in sat_name else sat_name[:3]
        
        packet = {
            "id": f"{sat_name} ({catalog_number})",
            "name": sat_name,
            "catalog_number": catalog_number,
            "availability": availability,
            "position": {
                "cartographicDegrees": cartographic_degrees
            },
            "point": {
                "pixelSize": 10,
                "color": {
                    "rgba": alert_color
                },
                "outlineColor": {
                    "rgba": [255, 255, 255, 255]  # White outline
                },
                "outlineWidth": 1
            },
            "polyline": {
                "positions": {
                    "cartographicDegrees": polyline_positions
                },
                "material": {
                    "solidColor": {
                        "color": {
                            "rgba": get_alert_color(alert_level, 128)  # 50% opacity
                        }
                    }
                },
                "width": 1,
                "clampToGround": False
            },
            "label": {
                "text": short_name,
                "font": "12pt Lucida Console",
                "horizontalOrigin": "LEFT",
                "verticalOrigin": "TOP",
                "pixelOffset": [12, 0],
                "fillColor": {
                    "rgba": alert_color
                },
                "outlineColor": {
                    "rgba": alert_color
                },
                "outlineWidth": 1
            }
        }

        czml.append(packet)

    # Save CZML
    with open(output_czml, "w") as f:
        json.dump(czml, f, indent=2)

    print(f"✓ CZML written to: {output_czml}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Convert satellite position CSV to CZML format')
    parser.add_argument('input_csv', help='Input CSV file with satellite positions')
    parser.add_argument('output_czml', help='Output CZML file')
    parser.add_argument('--conjunctions', '-c', help='Path to conjunctions_nested.json file (optional)', 
                       default='data/conjunctions_nested.json')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input_csv):
        print(f"Error: Input file '{args.input_csv}' not found")
        sys.exit(1)
        
    csv_to_czml(args.input_csv, args.output_czml, args.conjunctions)
