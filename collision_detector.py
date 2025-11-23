#!/usr/bin/env python3
"""
Satellite Collision Detection System using Brent's Method Optimization.

Uses scipy's minimize_scalar with Brent's method to find minimum distances
between satellites. The time window is segmented into 4-hour windows to
capture multiple close approaches per satellite pair.

Alert Levels:
    RED:    < 10 km  - High risk
    YELLOW: 10-25 km - Medium risk
    GREEN:  25-50 km - Low risk
"""

import csv
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Tuple
from dataclasses import dataclass
from enum import Enum
import numpy as np

from sgp4_gp_api import SGP4PropagatorGP, GPData


class AlertLevel(Enum):
    """Alert level based on close approach distance."""
    RED = "RED"        # < 10 km - High risk
    YELLOW = "YELLOW"  # 10-25 km - Medium risk
    GREEN = "GREEN"    # 25-50 km - Low risk


@dataclass
class CloseApproach:
    """Represents a close approach event between two satellites."""
    tca: datetime                              # Time of Closest Approach
    sat1_name: str
    sat1_catalog: int
    sat2_name: str
    sat2_catalog: int
    distance_km: float                         # Minimum distance at TCA
    sat1_position: Tuple[float, float, float]  # Position at TCA (km)
    sat2_position: Tuple[float, float, float]  # Position at TCA (km)
    sat1_velocity: Tuple[float, float, float]  # Velocity at TCA (km/s)
    sat2_velocity: Tuple[float, float, float]  # Velocity at TCA (km/s)
    relative_velocity_km_s: float              # Relative velocity at TCA

    @property
    def alert_level(self) -> AlertLevel:
        """Determine alert level based on distance."""
        if self.distance_km < 10.0:
            return AlertLevel.RED
        elif self.distance_km < 25.0:
            return AlertLevel.YELLOW
        else:
            return AlertLevel.GREEN

    @property
    def alert_symbol(self) -> str:
        """Get symbol for alert level."""
        symbols = {
            AlertLevel.RED: "[!!!]",
            AlertLevel.YELLOW: "[!!]",
            AlertLevel.GREEN: "[OK]"
        }
        return symbols[self.alert_level]


class CollisionDetector:
    """
    Collision detector using Brent's method numerical optimization.

    Uses segmented time windows with Brent's method to find minimum
    distances between satellite pairs. Features:
    - Divides time window into 4-hour segments
    - Finds minimum distance in each segment using Brent's method
    - Filters out docked/co-located objects (< min_distance_km)
    - Classifies results by alert level (RED/YELLOW/GREEN)
    """

    def __init__(self, propagator: SGP4PropagatorGP, threshold_km: float = 5.0,
                 max_epoch_age_days: float = 1.0, min_distance_km: float = 0.1):
        self.propagator = propagator
        self.threshold_km = threshold_km
        self.max_epoch_age_days = max_epoch_age_days
        self.min_distance_km = min_distance_km  # Filter out docked/co-located objects
        self.close_approaches: List[CloseApproach] = []
        self.filtered_satellites: Dict[int, GPData] = {}

    def _parse_epoch(self, epoch_str: str) -> datetime:
        """Parse epoch string to datetime."""
        if epoch_str.endswith('Z'):
            return datetime.fromisoformat(epoch_str.replace('Z', '+00:00'))
        elif '+' in epoch_str or epoch_str.count('-') > 2:
            return datetime.fromisoformat(epoch_str)
        else:
            return datetime.fromisoformat(epoch_str).replace(tzinfo=timezone.utc)

    def filter_satellites_by_epoch(self, reference_time: datetime) -> int:
        """Filter satellites to only include those with recent TLE data."""
        self.filtered_satellites = {}
        ref_time_aware = reference_time.replace(tzinfo=timezone.utc) if reference_time.tzinfo is None else reference_time

        skipped = 0
        for cat_num, sat in self.propagator.satellites.items():
            try:
                epoch_dt = self._parse_epoch(sat.epoch)
                age_days = (ref_time_aware - epoch_dt).total_seconds() / 86400.0

                if age_days <= self.max_epoch_age_days:
                    self.filtered_satellites[cat_num] = sat
                else:
                    skipped += 1
            except Exception:
                skipped += 1

        print(f"Filtered satellites: {len(self.filtered_satellites)} (skipped {skipped} with epoch > {self.max_epoch_age_days} day(s) old)")
        return len(self.filtered_satellites)

    def _find_minimum_distance_brent(self, target_sat: GPData, other_sat: GPData,
                                      start_time: datetime, duration_seconds: float,
                                      screening_threshold_km: float) -> List[Tuple[float, float]]:
        """
        Find minimum distance between two satellites using Brent's method.

        Divides the time window into segments and finds the minimum in each segment
        to capture multiple close approaches.

        Returns list of (offset_seconds, distance) tuples.
        """
        from scipy.optimize import minimize_scalar

        all_minima = []

        def distance_at_offset(offset_seconds):
            """Distance function for optimizer."""
            t = start_time + timedelta(seconds=offset_seconds)
            try:
                pos1, _ = self.propagator.propagate(target_sat, t)
                pos2, _ = self.propagator.propagate(other_sat, t)
                return np.linalg.norm(pos1 - pos2)
            except ValueError:
                return float('inf')

        # Strategy: Divide time window into segments and find minimum in each
        # This ensures we don't miss minima in different parts of the window
        # Use 4-hour segments to catch orbital period variations (~90 min for LEO)
        segment_hours = 4
        num_segments = max(1, int(duration_seconds / 3600 / segment_hours))
        segment_size = duration_seconds / num_segments

        for i in range(num_segments):
            segment_start = i * segment_size
            segment_end = (i + 1) * segment_size

            # Use bounded scalar optimization (Brent's method) - reliable and fast
            try:
                result = minimize_scalar(
                    distance_at_offset,
                    bounds=(segment_start, segment_end),
                    method='bounded',
                    options={'xatol': 1.0}  # 1 second tolerance
                )

                if result.fun < screening_threshold_km:
                    all_minima.append((result.x, result.fun))
            except Exception:
                continue

        return all_minima

    def _remove_duplicate_minima(self, minima: List[Tuple[float, float]],
                                  threshold_seconds: float = 300) -> List[Tuple[float, float]]:
        """Remove duplicate minima within threshold_seconds. Keep smallest distance."""
        if not minima:
            return []

        sorted_minima = sorted(minima, key=lambda x: x[0])
        unique = []
        current_group = [sorted_minima[0]]

        for i in range(1, len(sorted_minima)):
            if sorted_minima[i][0] - current_group[-1][0] <= threshold_seconds:
                current_group.append(sorted_minima[i])
            else:
                unique.append(min(current_group, key=lambda x: x[1]))
                current_group = [sorted_minima[i]]

        if current_group:
            unique.append(min(current_group, key=lambda x: x[1]))

        return unique

    def scan_for_target(self, target_catalog: int, start_time: datetime,
                        hours: int = 72,
                        screening_threshold_km: float = 100.0) -> List[CloseApproach]:
        """
        Scan for ALL close approaches to target using Brent's method.

        Args:
            target_catalog: NORAD catalog number of target satellite
            start_time: Start of search window
            hours: Duration to search (default 72 hours)
            screening_threshold_km: Collect minima below this distance (default 100 km)

        Returns:
            List of CloseApproach objects for all detected close approaches
        """
        self.close_approaches = []
        self.filter_satellites_by_epoch(start_time)

        # Use filtered satellites, but fall back to all if filter is too strict
        satellites_to_use = self.filtered_satellites if self.filtered_satellites else self.propagator.satellites

        # Check if target is in filtered set, if not check original set
        if target_catalog not in satellites_to_use:
            if target_catalog in self.propagator.satellites:
                print(f"WARNING: Target {target_catalog} excluded by epoch filter, adding it back")
                satellites_to_use[target_catalog] = self.propagator.satellites[target_catalog]
            else:
                print(f"ERROR: Target satellite {target_catalog} not found!")
                return []

        target_sat = satellites_to_use[target_catalog]
        other_objects = {k: v for k, v in satellites_to_use.items() if k != target_catalog}

        # Debug: show how many objects we're actually checking
        if len(other_objects) == 0:
            print(f"WARNING: No other objects to check! Try increasing --max-epoch-age")
            print(f"Total satellites in propagator: {len(self.propagator.satellites)}")
        duration_seconds = hours * 3600

        print(f"\n{'='*60}")
        print("BRENT METHOD COLLISION DETECTION")
        print(f"{'='*60}")
        print(f"Target: {target_sat.name} (#{target_catalog})")
        print(f"Distance range: {self.min_distance_km} - {self.threshold_km} km")
        print(f"  (Objects < {self.min_distance_km} km excluded as docked/co-located)")
        print(f"Time range: {start_time.isoformat()} to {(start_time + timedelta(hours=hours)).isoformat()}")
        print(f"Segments: {max(1, hours // 4)} x 4-hour windows")
        print(f"Objects to check: {len(other_objects)}")
        print(f"{'='*60}")

        print("\nScanning", end="", flush=True)

        total_minima_found = 0
        min_distance_seen = float('inf')

        for idx, (other_catalog, other_sat) in enumerate(other_objects.items()):
            if idx % 100 == 0:
                print(".", end="", flush=True)

            # Find all minima using Brent's method (segmented)
            all_minima = self._find_minimum_distance_brent(
                target_sat, other_sat, start_time, duration_seconds,
                screening_threshold_km
            )

            # Track statistics (exclude docked objects from min distance tracking)
            if all_minima:
                total_minima_found += len(all_minima)
                # Find min distance excluding docked objects
                non_docked = [m[1] for m in all_minima if m[1] >= self.min_distance_km]
                if non_docked:
                    min_dist = min(non_docked)
                    if min_dist < min_distance_seen:
                        min_distance_seen = min_dist

            # Remove duplicates and filter
            unique_minima = self._remove_duplicate_minima(all_minima)

            # Create CloseApproach objects for minima below threshold
            for offset_seconds, _ in unique_minima:
                tca = start_time + timedelta(seconds=offset_seconds)
                try:
                    pos1, vel1 = self.propagator.propagate(target_sat, tca)
                    pos2, vel2 = self.propagator.propagate(other_sat, tca)
                    distance = np.linalg.norm(pos1 - pos2)

                    # Filter: must be within threshold but above minimum (exclude docked objects)
                    if self.min_distance_km <= distance <= self.threshold_km:
                        self.close_approaches.append(CloseApproach(
                            tca=tca,
                            sat1_name=target_sat.name,
                            sat1_catalog=target_catalog,
                            sat2_name=other_sat.name,
                            sat2_catalog=other_catalog,
                            distance_km=distance,
                            sat1_position=tuple(pos1),
                            sat2_position=tuple(pos2),
                            sat1_velocity=tuple(vel1),
                            sat2_velocity=tuple(vel2),
                            relative_velocity_km_s=np.linalg.norm(vel1 - vel2)
                        ))
                except ValueError:
                    continue

        print(" Done!")

        # Debug statistics
        print(f"\nScan statistics:")
        print(f"  Total minima found (< {screening_threshold_km} km): {total_minima_found}")
        if min_distance_seen == float('inf'):
            print(f"  Minimum distance seen (non-docked): No non-docked objects found within {screening_threshold_km} km")
        else:
            print(f"  Minimum distance seen (non-docked): {min_distance_seen:.2f} km")
        print(f"  Close approaches ({self.min_distance_km}-{self.threshold_km} km): {len(self.close_approaches)}")

        # Count by alert level
        red_alerts = [a for a in self.close_approaches if a.alert_level == AlertLevel.RED]
        yellow_alerts = [a for a in self.close_approaches if a.alert_level == AlertLevel.YELLOW]
        green_alerts = [a for a in self.close_approaches if a.alert_level == AlertLevel.GREEN]

        print(f"\n{'='*60}")
        print("ALERT SUMMARY")
        print(f"{'='*60}")
        print(f"  [!!!] RED    (< 10 km):   {len(red_alerts)} approaches")
        print(f"  [!!]  YELLOW (10-25 km):  {len(yellow_alerts)} approaches")
        print(f"  [OK]  GREEN  (25-50 km):  {len(green_alerts)} approaches")
        print(f"  TOTAL:                   {len(self.close_approaches)} approaches")
        print(f"{'='*60}")

        # Print all alerts sorted by distance
        if self.close_approaches:
            self._print_alerts()

        return self.close_approaches

    def _print_alerts(self):
        """Print all alerts grouped by level."""
        red_alerts = [a for a in self.close_approaches if a.alert_level == AlertLevel.RED]
        yellow_alerts = [a for a in self.close_approaches if a.alert_level == AlertLevel.YELLOW]
        green_alerts = [a for a in self.close_approaches if a.alert_level == AlertLevel.GREEN]

        if red_alerts:
            print(f"\n{'='*70}")
            print("[!!!] RED ALERTS - HIGH RISK (< 10 km)")
            print(f"{'='*70}")
            print(f"{'Alert':<7} {'Distance':<12} {'TCA Time':<24} {'Rel Vel':<10} {'Object':<18}")
            print("-" * 70)
            for a in sorted(red_alerts, key=lambda x: x.distance_km):
                print(f"{a.alert_symbol:<7} {a.distance_km:>6.3f} km   "
                      f"{a.tca.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}   "
                      f"{a.relative_velocity_km_s:>6.2f} km/s  {a.sat2_name[:17]}")

        if yellow_alerts:
            print(f"\n{'='*70}")
            print("[!!] YELLOW ALERTS - MEDIUM RISK (10-25 km)")
            print(f"{'='*70}")
            print(f"{'Alert':<7} {'Distance':<12} {'TCA Time':<24} {'Rel Vel':<10} {'Object':<18}")
            print("-" * 70)
            for a in sorted(yellow_alerts, key=lambda x: x.distance_km):
                print(f"{a.alert_symbol:<7} {a.distance_km:>6.3f} km   "
                      f"{a.tca.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}   "
                      f"{a.relative_velocity_km_s:>6.2f} km/s  {a.sat2_name[:17]}")

        if green_alerts:
            print(f"\n{'='*70}")
            print("[OK] GREEN ALERTS - LOW RISK (25-50 km)")
            print(f"{'='*70}")
            print(f"{'Alert':<7} {'Distance':<12} {'TCA Time':<24} {'Rel Vel':<10} {'Object':<18}")
            print("-" * 70)
            for a in sorted(green_alerts, key=lambda x: x.distance_km)[:10]:  # Show top 10
                print(f"{a.alert_symbol:<7} {a.distance_km:>6.3f} km   "
                      f"{a.tca.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}   "
                      f"{a.relative_velocity_km_s:>6.2f} km/s  {a.sat2_name[:17]}")
            if len(green_alerts) > 10:
                print(f"  ... and {len(green_alerts) - 10} more green alerts")

    def save_results(self, output_file: str = "data/collision_warnings.csv"):
        """Save close approaches to CSV file with alert levels."""
        with open(output_file, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                'alert_level', 'tca_time', 'sat1_name', 'sat1_catalog', 'sat2_name', 'sat2_catalog',
                'distance_km', 'relative_velocity_km_s',
                'sat1_x', 'sat1_y', 'sat1_z', 'sat2_x', 'sat2_y', 'sat2_z',
                'sat1_vx', 'sat1_vy', 'sat1_vz', 'sat2_vx', 'sat2_vy', 'sat2_vz'
            ])

            # Sort by alert level priority (RED first, then YELLOW, then GREEN)
            level_order = {AlertLevel.RED: 0, AlertLevel.YELLOW: 1, AlertLevel.GREEN: 2}
            sorted_approaches = sorted(self.close_approaches,
                                        key=lambda a: (level_order[a.alert_level], a.distance_km))

            for a in sorted_approaches:
                writer.writerow([
                    a.alert_level.value, a.tca.isoformat(), a.sat1_name, a.sat1_catalog,
                    a.sat2_name, a.sat2_catalog,
                    f"{a.distance_km:.6f}", f"{a.relative_velocity_km_s:.4f}",
                    f"{a.sat1_position[0]:.4f}", f"{a.sat1_position[1]:.4f}", f"{a.sat1_position[2]:.4f}",
                    f"{a.sat2_position[0]:.4f}", f"{a.sat2_position[1]:.4f}", f"{a.sat2_position[2]:.4f}",
                    f"{a.sat1_velocity[0]:.6f}", f"{a.sat1_velocity[1]:.6f}", f"{a.sat1_velocity[2]:.6f}",
                    f"{a.sat2_velocity[0]:.6f}", f"{a.sat2_velocity[1]:.6f}", f"{a.sat2_velocity[2]:.6f}"
                ])

        red_count = sum(1 for a in self.close_approaches if a.alert_level == AlertLevel.RED)
        yellow_count = sum(1 for a in self.close_approaches if a.alert_level == AlertLevel.YELLOW)
        green_count = sum(1 for a in self.close_approaches if a.alert_level == AlertLevel.GREEN)
        print(f"Saved {len(self.close_approaches)} close approaches to {output_file}")
        print(f"  RED: {red_count}, YELLOW: {yellow_count}, GREEN: {green_count}")

    def print_summary(self):
        """Print summary of collision detection results with alert level statistics."""
        if not self.close_approaches:
            print("\nNo close approaches detected.")
            return

        # Group by alert level
        red_alerts = [a for a in self.close_approaches if a.alert_level == AlertLevel.RED]
        yellow_alerts = [a for a in self.close_approaches if a.alert_level == AlertLevel.YELLOW]
        green_alerts = [a for a in self.close_approaches if a.alert_level == AlertLevel.GREEN]

        distances = [a.distance_km for a in self.close_approaches]
        velocities = [a.relative_velocity_km_s for a in self.close_approaches]

        print(f"\n{'='*70}")
        print("COLLISION DETECTION SUMMARY")
        print(f"{'='*70}")
        print(f"Threshold: {self.threshold_km} km")
        print(f"Total close approaches: {len(self.close_approaches)}")

        print(f"\n{'='*70}")
        print("ALERT LEVEL BREAKDOWN")
        print(f"{'='*70}")
        print(f"  [!!!] RED    (< 10 km):   {len(red_alerts):>5} approaches")
        print(f"  [!!]  YELLOW (10-25 km):  {len(yellow_alerts):>5} approaches")
        print(f"  [OK]  GREEN  (25-50 km):  {len(green_alerts):>5} approaches")
        print(f"  {'─'*35}")
        print(f"        TOTAL:             {len(self.close_approaches):>5} approaches")

        # Sort by alert level priority, then distance
        level_order = {AlertLevel.RED: 0, AlertLevel.YELLOW: 1, AlertLevel.GREEN: 2}
        sorted_approaches = sorted(self.close_approaches,
                                    key=lambda a: (level_order[a.alert_level], a.distance_km))

        print(f"\n{'='*70}")
        print("TOP 20 CLOSEST APPROACHES")
        print(f"{'='*70}")
        print(f"{'Alert':<7} {'Distance':<12} {'TCA Time':<24} {'Rel Vel':<10} {'Object':<15}")
        print("-" * 70)

        for a in sorted_approaches[:20]:
            print(f"{a.alert_symbol:<7} {a.distance_km:>6.3f} km   "
                  f"{a.tca.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}   "
                  f"{a.relative_velocity_km_s:>6.2f} km/s  {a.sat2_name[:14]}")

        print(f"\n{'='*70}")
        print("STATISTICS")
        print(f"{'='*70}")
        print(f"Distance - Min: {min(distances):.6f} km, Max: {max(distances):.6f} km, Avg: {np.mean(distances):.6f} km")
        print(f"Velocity - Min: {min(velocities):.4f} km/s, Max: {max(velocities):.4f} km/s, Avg: {np.mean(velocities):.4f} km/s")
