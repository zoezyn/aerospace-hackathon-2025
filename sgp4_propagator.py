#!/usr/bin/env python3
"""
SGP4 Satellite Propagator

This script implements SGP4 orbital propagation using TLE data.

Requirements:
    pip install sgp4 numpy

Usage:
    python sgp4_propagator.py
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Tuple, Optional, Dict

from sgp4.api import Satrec, jday
import numpy as np


class TLEData:
    """Represents a single TLE record."""

    def __init__(self, name: str, line1: str, line2: str):
        self.name = name.strip()
        self.line1 = line1.strip()
        self.line2 = line2.strip()
        self.satellite = Satrec.twoline2rv(self.line1, self.line2)
        self.catalog_number = int(line1[2:7])

    def __repr__(self):
        return f"TLEData(name='{self.name}', catalog={self.catalog_number})"


class SGP4Propagator:
    """SGP4 Propagator for satellite position and velocity calculation."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.satellites: Dict[int, TLEData] = {}
        self.satellites_by_name: Dict[str, TLEData] = {}

    def load_tle_file(self, filename: str) -> int:
        """Load TLE data from a .TLE file."""
        filepath = self.data_dir / filename
        count = 0

        with open(filepath, 'r') as f:
            lines = f.readlines()

        i = 0
        while i < len(lines) - 2:
            name = lines[i].strip()
            line1 = lines[i + 1].strip()
            line2 = lines[i + 2].strip()

            if line1.startswith('1 ') and line2.startswith('2 '):
                try:
                    tle = TLEData(name, line1, line2)
                    self.satellites[tle.catalog_number] = tle
                    self.satellites_by_name[tle.name] = tle
                    count += 1
                except Exception as e:
                    print(f"Warning: Failed to parse TLE for {name}: {e}")
                i += 3
            else:
                i += 1

        print(f"Loaded {count} satellites from {filename}")
        return count

    def propagate(self, satellite: TLEData, dt: datetime) -> Tuple[np.ndarray, np.ndarray]:
        """
        Propagate a satellite to a specific datetime.

        Returns:
            Tuple of (position, velocity) in km and km/s (TEME frame)
        """
        jd, fr = jday(dt.year, dt.month, dt.day,
                      dt.hour, dt.minute, dt.second + dt.microsecond / 1e6)

        error, position, velocity = satellite.satellite.sgp4(jd, fr)

        if error != 0:
            raise ValueError(f"SGP4 propagation error code: {error}")

        return np.array(position), np.array(velocity)

    def propagate_range(self, satellite: TLEData,
                       start_time: datetime,
                       end_time: datetime,
                       step_minutes: float = 1.0) -> List[Dict]:
        """Propagate a satellite over a time range."""
        results = []
        current_time = start_time
        step = timedelta(minutes=step_minutes)

        while current_time <= end_time:
            try:
                pos, vel = self.propagate(satellite, current_time)
                results.append({
                    'time': current_time.isoformat(),
                    'position_km': pos.tolist(),
                    'velocity_km_s': vel.tolist(),
                    'altitude_km': np.linalg.norm(pos) - 6371.0
                })
            except ValueError as e:
                print(f"Warning: Propagation failed at {current_time}: {e}")

            current_time += step

        return results

    def get_satellite_by_name(self, name: str) -> Optional[TLEData]:
        """Get satellite by name (exact match)."""
        return self.satellites_by_name.get(name)

    def get_satellite_by_catalog(self, catalog_number: int) -> Optional[TLEData]:
        """Get satellite by NORAD catalog number."""
        return self.satellites.get(catalog_number)

    def search_satellites(self, query: str) -> List[TLEData]:
        """Search satellites by partial name match."""
        query_lower = query.lower()
        return [sat for sat in self.satellites.values()
                if query_lower in sat.name.lower()]


def main():
    """Main demonstration of SGP4 propagation."""

    print("=" * 60)
    print("SGP4 Satellite Propagator")
    print("=" * 60)

    # Initialize and load data
    propagator = SGP4Propagator(data_dir="data")
    propagator.load_tle_file("satellite_active.TLE")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    print(f"\nCurrent UTC: {now.isoformat()}")

    # Example: Propagate ISS
    print("\n--- ISS Position ---")
    iss_results = propagator.search_satellites("ISS")
    if iss_results:
        iss = iss_results[0]
        print(f"Satellite: {iss.name} (#{iss.catalog_number})")

        pos, vel = propagator.propagate(iss, now)
        print(f"Position (km): X={pos[0]:,.2f}, Y={pos[1]:,.2f}, Z={pos[2]:,.2f}")
        print(f"Velocity (km/s): Vx={vel[0]:.4f}, Vy={vel[1]:.4f}, Vz={vel[2]:.4f}")
        print(f"Altitude: {np.linalg.norm(pos) - 6371:.2f} km")

    # Propagate ALL satellites for 72 hours at 1-hour intervals
    print("\n--- All Satellites: 72-Hour Propagation (1-hour steps) ---")
    print(f"Total satellites: {len(propagator.satellites)}")

    import csv
    output_file = "data/all_satellites_72h.csv"

    # Generate time steps (72 hours, 1-hour intervals = 73 points)
    time_steps = []
    current = now
    for _ in range(73):
        time_steps.append(current)
        current += timedelta(hours=1)

    print(f"Time range: {time_steps[0].isoformat()} to {time_steps[-1].isoformat()}")
    print(f"Total time points: {len(time_steps)}")

    # Write all satellite states to CSV
    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['satellite_name', 'catalog_number', 'time', 'x_km', 'y_km', 'z_km',
                        'vx_km_s', 'vy_km_s', 'vz_km_s', 'altitude_km'])

        total_rows = 0
        failed_count = 0

        for idx, (cat_num, sat) in enumerate(propagator.satellites.items()):
            if (idx + 1) % 1000 == 0:
                print(f"Processing satellite {idx + 1}/{len(propagator.satellites)}...")

            for dt in time_steps:
                try:
                    pos, vel = propagator.propagate(sat, dt)
                    writer.writerow([
                        sat.name,
                        cat_num,
                        dt.isoformat(),
                        pos[0], pos[1], pos[2],
                        vel[0], vel[1], vel[2],
                        np.linalg.norm(pos) - 6371.0
                    ])
                    total_rows += 1
                except ValueError:
                    failed_count += 1

    print(f"Saved {total_rows} data points to {output_file}")
    if failed_count > 0:
        print(f"Failed propagations: {failed_count}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
