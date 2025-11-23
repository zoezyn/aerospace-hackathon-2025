#!/usr/bin/env python3
"""
SGP4 Satellite Propagator with GP Data API Support

Fetches GP data from Space-Track API and propagates using SGP4.

Requirements:
    pip install sgp4 numpy requests

Usage:
    # Set environment variables or pass credentials
    export SPACETRACK_USER="your_email"
    export SPACETRACK_PASS="your_password"
    python sgp4_gp_api.py
"""

import csv
import os
import requests
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Tuple, Dict, Optional

from sgp4.api import Satrec, jday, WGS84
import numpy as np


class SpaceTrackClient:
    """Client for Space-Track.org API."""

    BASE_URL = "https://www.space-track.org"
    LOGIN_URL = f"{BASE_URL}/ajaxauth/login"
    QUERY_URL = f"{BASE_URL}/basicspacedata/query"

    def __init__(self, username: str, password: str):
        self.username = "piyushbhansali8@gmail.com"
        self.password = "Qwertyuiop12345"
        self.session = requests.Session()
        self._authenticated = False

    def authenticate(self) -> bool:
        """Login to Space-Track."""
        credentials = {
            "identity": self.username,
            "password": self.password
        }
        response = self.session.post(self.LOGIN_URL, data=credentials)
        self._authenticated = response.status_code == 200
        if self._authenticated:
            print("Successfully authenticated with Space-Track")
        else:
            print(f"Authentication failed: {response.status_code}")
        return self._authenticated

    def fetch_gp(self, query: str) -> List[dict]:
        """Fetch GP data with a query string."""
        if not self._authenticated:
            self.authenticate()

        url = f"{self.QUERY_URL}/{query}"
        response = self.session.get(url)
        response.raise_for_status()
        return response.json()

    def fetch_active_satellites(self) -> List[dict]:
        """Fetch all active satellites/payloads (non-decayed)."""
        query = "class/gp/OBJECT_TYPE/PAYLOAD/DECAY_DATE/null-val/orderby/NORAD_CAT_ID/format/json"
        return self.fetch_gp(query)

    def fetch_by_norad_ids(self, norad_ids: List[int]) -> List[dict]:
        """Fetch GP data for specific NORAD IDs."""
        ids_str = ",".join(str(i) for i in norad_ids)
        query = f"class/gp/NORAD_CAT_ID/{ids_str}/format/json"
        return self.fetch_gp(query)

    def fetch_by_name(self, name_pattern: str, limit: int = 100) -> List[dict]:
        """Fetch GP data by object name pattern (use ~~ for wildcard)."""
        query = f"class/gp/OBJECT_NAME/~~{name_pattern}/orderby/NORAD_CAT_ID/limit/{limit}/format/json"
        return self.fetch_gp(query)

    def fetch_recent_launches(self, days: int = 30) -> List[dict]:
        """Fetch satellites launched in the last N days."""
        query = f"class/gp/LAUNCH_DATE/>now-{days}/orderby/LAUNCH_DATE desc/format/json"
        return self.fetch_gp(query)

    def fetch_debris(self) -> List[dict]:
        """Fetch all tracked debris (non-decayed)."""
        query = "class/gp/OBJECT_TYPE/DEBRIS/DECAY_DATE/null-val/orderby/NORAD_CAT_ID/format/json"
        return self.fetch_gp(query)

    def fetch_rocket_bodies(self) -> List[dict]:
        """Fetch all tracked rocket bodies (non-decayed)."""
        query = "class/gp/OBJECT_TYPE/ROCKET BODY/DECAY_DATE/null-val/orderby/NORAD_CAT_ID/format/json"
        return self.fetch_gp(query)

    def fetch_by_object_type(self, object_type: str) -> List[dict]:
        """Fetch by object type: PAYLOAD, DEBRIS, ROCKET BODY, UNKNOWN."""
        query = f"class/gp/OBJECT_TYPE/{object_type}/DECAY_DATE/null-val/orderby/NORAD_CAT_ID/format/json"
        return self.fetch_gp(query)


class GPData:
    """Represents a single GP (General Perturbations) record."""

    def __init__(self, gp_record: dict):
        self.raw = gp_record
        self.name = gp_record.get('OBJECT_NAME', 'UNKNOWN').strip()
        self.catalog_number = int(gp_record.get('NORAD_CAT_ID', 0))
        self.object_id = gp_record.get('OBJECT_ID', '')
        self.epoch = gp_record.get('EPOCH', '')
        self.satellite = self._create_satellite(gp_record)

    def _create_satellite(self, gp: dict) -> Satrec:
        """Create SGP4 satellite object from GP data."""
        sat = Satrec()

        # Parse epoch
        epoch_str = gp['EPOCH']
        # Handle various datetime formats
        if epoch_str.endswith('Z'):
            epoch_dt = datetime.fromisoformat(epoch_str.replace('Z', '+00:00'))
        elif '+' in epoch_str or epoch_str.count('-') > 2:
            epoch_dt = datetime.fromisoformat(epoch_str)
        else:
            epoch_dt = datetime.fromisoformat(epoch_str).replace(tzinfo=timezone.utc)

        # Convert epoch to days since 1949 December 31 00:00 UT
        epoch_1949 = datetime(1949, 12, 31, 0, 0, 0, tzinfo=timezone.utc)
        # Ensure epoch_dt is timezone-aware
        if epoch_dt.tzinfo is None:
            epoch_dt = epoch_dt.replace(tzinfo=timezone.utc)
        epoch_days = (epoch_dt - epoch_1949).total_seconds() / 86400.0

        # Get orbital elements (convert degrees to radians)
        inclo = np.radians(float(gp.get('INCLINATION', 0)))
        nodeo = np.radians(float(gp.get('RA_OF_ASC_NODE', 0)))
        ecco = float(gp.get('ECCENTRICITY', 0))
        argpo = np.radians(float(gp.get('ARG_OF_PERICENTER', 0)))
        mo = np.radians(float(gp.get('MEAN_ANOMALY', 0)))

        # Mean motion: convert rev/day to rad/min
        mean_motion_revday = float(gp.get('MEAN_MOTION', 0))
        no_kozai = mean_motion_revday * (2 * np.pi / 1440.0)

        # Drag and derivatives
        bstar = float(gp.get('BSTAR', 0))
        ndot = float(gp.get('MEAN_MOTION_DOT', 0))
        nddot = float(gp.get('MEAN_MOTION_DDOT', 0))

        # Initialize SGP4
        sat.sgp4init(
            WGS84,
            'i',
            self.catalog_number,
            epoch_days,
            bstar,
            ndot,
            nddot,
            ecco,
            argpo,
            inclo,
            mo,
            no_kozai,
            nodeo
        )

        return sat

    def __repr__(self):
        return f"GPData(name='{self.name}', catalog={self.catalog_number})"


class SGP4PropagatorGP:
    """SGP4 Propagator with Space-Track GP API support."""

    def __init__(self, username: Optional[str] = None, password: Optional[str] = None):
        self.satellites: Dict[int, GPData] = {}
        self.satellites_by_name: Dict[str, GPData] = {}

        # Get credentials from params or environment
        self.username = username or os.environ.get("SPACETRACK_USER", "")
        self.password = password or os.environ.get("SPACETRACK_PASS", "")
        self.client: Optional[SpaceTrackClient] = None

    def _get_client(self) -> SpaceTrackClient:
        """Get or create Space-Track client."""
        if self.client is None:
            if not self.username or not self.password:
                raise ValueError(
                    "Space-Track credentials required. Set SPACETRACK_USER and SPACETRACK_PASS "
                    "environment variables or pass username/password to constructor."
                )
            self.client = SpaceTrackClient(self.username, self.password)
        return self.client

    def _load_gp_list(self, gp_list: List[dict]) -> int:
        """Load GP records into satellites dict."""
        count = 0
        for gp_record in gp_list:
            try:
                gp = GPData(gp_record)
                self.satellites[gp.catalog_number] = gp
                self.satellites_by_name[gp.name] = gp
                count += 1
            except Exception as e:
                print(f"Warning: Failed to parse GP for {gp_record.get('OBJECT_NAME', 'UNKNOWN')}: {e}")
        return count

    def fetch_active_satellites(self) -> int:
        """Fetch all active (non-decayed) satellites from Space-Track."""
        print("Fetching active satellites from Space-Track...")
        client = self._get_client()
        gp_list = client.fetch_active_satellites()
        count = self._load_gp_list(gp_list)
        print(f"Loaded {count} active satellites")
        return count

    def fetch_by_norad_ids(self, norad_ids: List[int]) -> int:
        """Fetch GP data for specific NORAD catalog IDs."""
        print(f"Fetching {len(norad_ids)} satellites by NORAD ID...")
        client = self._get_client()
        gp_list = client.fetch_by_norad_ids(norad_ids)
        count = self._load_gp_list(gp_list)
        print(f"Loaded {count} satellites")
        return count

    def fetch_by_name(self, name_pattern: str, limit: int = 100) -> int:
        """Fetch GP data by name pattern (e.g., 'STARLINK', 'ISS')."""
        print(f"Fetching satellites matching '{name_pattern}'...")
        client = self._get_client()
        gp_list = client.fetch_by_name(name_pattern, limit)
        count = self._load_gp_list(gp_list)
        print(f"Loaded {count} satellites")
        return count

    def fetch_recent_launches(self, days: int = 30) -> int:
        """Fetch satellites launched in the last N days."""
        print(f"Fetching satellites launched in last {days} days...")
        client = self._get_client()
        gp_list = client.fetch_recent_launches(days)
        count = self._load_gp_list(gp_list)
        print(f"Loaded {count} satellites")
        return count

    def fetch_debris(self) -> int:
        """Fetch all tracked debris from Space-Track."""
        print("Fetching debris from Space-Track...")
        client = self._get_client()
        gp_list = client.fetch_debris()
        count = self._load_gp_list(gp_list)
        print(f"Loaded {count} debris objects")
        return count

    def fetch_rocket_bodies(self) -> int:
        """Fetch all tracked rocket bodies from Space-Track."""
        print("Fetching rocket bodies from Space-Track...")
        client = self._get_client()
        gp_list = client.fetch_rocket_bodies()
        count = self._load_gp_list(gp_list)
        print(f"Loaded {count} rocket bodies")
        return count

    def fetch_all_objects(self) -> int:
        """Fetch all tracked objects: satellites, debris, and rocket bodies."""
        print("Fetching all tracked objects from Space-Track...")
        total = 0
        total += self.fetch_active_satellites()
        total += self.fetch_debris()
        total += self.fetch_rocket_bodies()
        print(f"Total objects loaded: {len(self.satellites)}")
        return len(self.satellites)

    def propagate(self, satellite: GPData, dt: datetime) -> Tuple[np.ndarray, np.ndarray]:
        """Propagate a satellite to a specific datetime."""
        jd, fr = jday(dt.year, dt.month, dt.day,
                      dt.hour, dt.minute, dt.second + dt.microsecond / 1e6)

        error, position, velocity = satellite.satellite.sgp4(jd, fr)

        if error != 0:
            raise ValueError(f"SGP4 propagation error code: {error}")

        return np.array(position), np.array(velocity)

    def propagate_all(self, hours: int = 72, step_minutes: int = 60, output_file: str = "data/all_satellites_gp.csv"):
        """Propagate all satellites and save to CSV.

        Args:
            hours: Duration to propagate in hours
            step_minutes: Time step in minutes (default 60 = 1 hour)
            output_file: Output CSV file path
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        total_minutes = hours * 60
        num_steps = total_minutes // step_minutes + 1
        time_steps = [now + timedelta(minutes=m * step_minutes) for m in range(num_steps)]

        print(f"\nPropagating {len(self.satellites)} satellites for {hours} hours...")
        print(f"Time step: {step_minutes} minutes ({num_steps} time points)")
        print(f"Time range: {time_steps[0].isoformat()} to {time_steps[-1].isoformat()}")

        with open(output_file, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['satellite_name', 'catalog_number', 'time', 'x_km', 'y_km', 'z_km',
                            'vx_km_s', 'vy_km_s', 'vz_km_s', 'altitude_km'])

            total_rows = 0
            failed_count = 0

            for idx, (cat_num, sat) in enumerate(self.satellites.items()):
                if (idx + 1) % 1000 == 0:
                    print(f"Processing satellite {idx + 1}/{len(self.satellites)}...")

                for dt in time_steps:
                    try:
                        pos, vel = self.propagate(sat, dt)
                        writer.writerow([
                            sat.name, cat_num, dt.isoformat(),
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

    def search_satellites(self, query: str) -> List[GPData]:
        """Search satellites by partial name match."""
        query_lower = query.lower()
        return [sat for sat in self.satellites.values() if query_lower in sat.name.lower()]

    def generate_trajectory_csv(self, hours: int = 24, step_minutes: int = 5,
                                 output_file: str = "data/trajectories_24h_5min.csv",
                                 include_debris: bool = False,
                                 include_rocket_bodies: bool = False):
        """
        Fetch data from Space-Track and generate trajectory CSV with specified timestep.

        Args:
            hours: Duration to propagate in hours (default: 24)
            step_minutes: Time step in minutes (default: 5)
            output_file: Output CSV file path
            include_debris: Whether to include debris objects
            include_rocket_bodies: Whether to include rocket bodies
        """
        print("=" * 60)
        print(f"TRAJECTORY GENERATION ({hours}h, {step_minutes}-min step)")
        print("=" * 60)

        # Fetch data from Space-Track
        print("\n[1/2] Fetching data from Space-Track...")
        self.fetch_active_satellites()

        if include_debris:
            self.fetch_debris()

        if include_rocket_bodies:
            self.fetch_rocket_bodies()

        print(f"Total objects loaded: {len(self.satellites)}")

        # Propagate and save
        print(f"\n[2/2] Propagating {len(self.satellites)} objects...")
        self.propagate_all(hours=hours, step_minutes=step_minutes, output_file=output_file)

        print("\n" + "=" * 60)
        print("COMPLETE")
        print("=" * 60)
        print(f"Output file: {output_file}")
        print(f"Time range: {hours} hours")
        print(f"Time step: {step_minutes} minutes")
        print(f"Objects tracked: {len(self.satellites)}")
        print("=" * 60)


def main():
    print("=" * 60)
    print("SGP4 Propagator with Space-Track GP API")
    print("=" * 60)

    # Check for credentials
    username = os.environ.get("SPACETRACK_USER")
    password = os.environ.get("SPACETRACK_PASS")

    if not username or not password:
        print("\nSpace-Track credentials not found!")
        print("Please set environment variables:")
        print("  export SPACETRACK_USER='your_email'")
        print("  export SPACETRACK_PASS='your_password'")
        print("\nRegister at: https://www.space-track.org")
        return

    propagator = SGP4PropagatorGP(username, password)

    # Fetch active satellites from Space-Track
    propagator.fetch_active_satellites()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    print(f"\nCurrent UTC: {now.isoformat()}")

    # ISS Example
    print("\n--- ISS Position ---")
    iss = propagator.satellites.get(25544)
    if iss:
        pos, vel = propagator.propagate(iss, now)
        print(f"Satellite: {iss.name} (#{iss.catalog_number})")
        print(f"Position (km): X={pos[0]:,.2f}, Y={pos[1]:,.2f}, Z={pos[2]:,.2f}")
        print(f"Velocity (km/s): Vx={vel[0]:.4f}, Vy={vel[1]:.4f}, Vz={vel[2]:.4f}")
        print(f"Altitude: {np.linalg.norm(pos) - 6371:.2f} km")

    # Propagate all for 24 hours with 5-minute timestep
    propagator.propagate_all(hours=24, step_minutes=5, output_file="data/satellites_24h_5min.csv")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
