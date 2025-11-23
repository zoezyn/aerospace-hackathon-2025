#!/usr/bin/env python3
"""
Satellite Collision Detection System - Brent's Method

This script uses Brent's method optimization to find close approaches
between a target satellite and other objects (satellites, debris, rocket bodies).

Features:
- Uses Space-Track API to fetch current TLE/GP data
- Segments time window into 4-hour blocks for thorough search
- Finds minimum distance in each segment using Brent's method
- Alert levels: RED (<10km), YELLOW (10-25km), GREEN (25-50km)
"""

import argparse
import csv
import sys
from datetime import datetime, timedelta, timezone

import numpy as np

from sgp4_gp_api import SGP4PropagatorGP
from collision_detector import CollisionDetector


def save_trajectories_csv(propagator, hours: int = 24, step_minutes: int = 5,
                          output_file: str = "data/trajectories_24h_5min.csv"):
    """
    Save satellite trajectory data to CSV file.

    Args:
        propagator: SGP4PropagatorGP instance with loaded satellites
        hours: Duration to propagate in hours (default: 24)
        step_minutes: Time step in minutes (default: 5)
        output_file: Output CSV file path
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    total_minutes = hours * 60
    num_steps = total_minutes // step_minutes + 1
    time_steps = [now + timedelta(minutes=m * step_minutes) for m in range(num_steps)]

    print(f"\nGenerating trajectory CSV ({hours}h, {step_minutes}-min step)...")
    print(f"Time range: {time_steps[0].isoformat()} to {time_steps[-1].isoformat()}")
    print(f"Time points: {num_steps}")

    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['satellite_name', 'catalog_number', 'time', 'x_km', 'y_km', 'z_km',
                        'vx_km_s', 'vy_km_s', 'vz_km_s', 'altitude_km'])

        total_rows = 0
        failed_count = 0

        for idx, (cat_num, sat) in enumerate(propagator.satellites.items()):
            if (idx + 1) % 1000 == 0:
                print(f"  Processing satellite {idx + 1}/{len(propagator.satellites)}...")

            for dt in time_steps:
                try:
                    pos, vel = propagator.propagate(sat, dt)
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


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Satellite Collision Detection using Brent's Method Optimization",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Detect close approaches for ISS
    python run_collision_detection.py --target 25544

    # Detect for a Starlink satellite with debris included
    python run_collision_detection.py --target 44714 --include-debris

    # Include all objects (satellites, debris, rocket bodies)
    python run_collision_detection.py --target 25544 --hours 48 --all-objects
        """
    )

    parser.add_argument(
        "--threshold", "-t",
        type=float,
        default=50.0,
        help="Distance threshold in km for close approach detection (default: 50.0 to capture RED/YELLOW/GREEN alerts)"
    )

    parser.add_argument(
        "--hours", "-H",
        type=int,
        default=72,
        help="Number of hours to search (default: 72)"
    )

    parser.add_argument(
        "--screening-threshold", "-S",
        type=float,
        default=100.0,
        help="Screening threshold in km to collect minima (default: 100.0)"
    )

    parser.add_argument(
        "--max-epoch-age", "-e",
        type=float,
        default=1.0,
        help="Maximum TLE epoch age in days (default: 1.0)"
    )

    parser.add_argument(
        "--min-distance", "-m",
        type=float,
        default=0.1,
        help="Minimum distance in km to exclude docked/co-located objects (default: 0.1)"
    )

    parser.add_argument(
        "--output", "-o",
        type=str,
        default="data/collision_warnings.csv",
        help="Output CSV file path (default: data/collision_warnings.csv)"
    )

    parser.add_argument(
        "--include-debris", "-d",
        action="store_true",
        help="Include debris objects in collision detection"
    )

    parser.add_argument(
        "--include-rocket-bodies", "-r",
        action="store_true",
        help="Include rocket bodies in collision detection"
    )

    parser.add_argument(
        "--all-objects", "-a",
        action="store_true",
        help="Include all objects: satellites, debris, and rocket bodies"
    )

    parser.add_argument(
        "--target", "-T",
        type=int,
        default=None,
        required=True,
        help="NORAD catalog number of target satellite (e.g., 25544 for ISS)"
    )

    parser.add_argument(
        "--target-name",
        type=str,
        default=None,
        help="Name of target satellite to track (e.g., 'ISS' or 'STARLINK-1234')"
    )

    parser.add_argument(
        "--export-trajectories",
        action="store_true",
        help="Export all satellite trajectories to CSV file"
    )

    parser.add_argument(
        "--trajectory-output",
        type=str,
        default="data/trajectories_24h_5min.csv",
        help="Output file for trajectory data (default: data/trajectories_24h_5min.csv)"
    )

    parser.add_argument(
        "--trajectory-hours",
        type=int,
        default=24,
        help="Hours to propagate for trajectory export (default: 24)"
    )

    parser.add_argument(
        "--trajectory-step",
        type=int,
        default=5,
        help="Time step in minutes for trajectory export (default: 5)"
    )

    return parser.parse_args()


def main():
    """Main entry point for collision detection system."""
    print("\n" + "=" * 70)
    print("   SATELLITE COLLISION DETECTION SYSTEM (BRENT METHOD)")
    print("=" * 70)

    # Parse command line arguments
    args = parse_args()

    # Credentials (hardcoded as per previous implementation)
    username = "piyushbhansali8@gmail.com"
    password = "Qwertyuiop12345"

    # Determine what to fetch
    include_debris = args.include_debris or args.all_objects
    include_rocket_bodies = args.include_rocket_bodies or args.all_objects

    # Print configuration
    print("\n" + "=" * 70)
    print("CONFIGURATION")
    print("=" * 70)
    print(f"  Distance threshold:      {args.threshold} km")
    print(f"  Min distance (docked):   {args.min_distance} km")
    print(f"  Screening threshold:     {args.screening_threshold} km")
    print(f"  Search duration:         {args.hours} hours")
    print(f"  Optimization method:     Brent (segmented 4-hour windows)")
    print(f"  Max TLE epoch age:       {args.max_epoch_age} day(s)")
    print(f"  Include debris:          {include_debris}")
    print(f"  Include rocket bodies:   {include_rocket_bodies}")
    print(f"  Output file:             {args.output}")
    print("=" * 70)

    # Step 1: Initialize propagator and fetch data
    print("\n[1/4] Fetching data from Space-Track...")
    propagator = SGP4PropagatorGP(username, password)

    try:
        # Always fetch active satellites
        propagator.fetch_active_satellites()

        # Optionally fetch debris
        if include_debris:
            propagator.fetch_debris()

        # Optionally fetch rocket bodies
        if include_rocket_bodies:
            propagator.fetch_rocket_bodies()

        print(f"Total objects loaded: {len(propagator.satellites)}")

    except Exception as e:
        print(f"\nERROR: Failed to fetch data: {e}")
        sys.exit(1)

    if not propagator.satellites:
        print("\nERROR: No satellites loaded!")
        sys.exit(1)

    # Export trajectories if requested
    if args.export_trajectories:
        print("\n[1.5/4] Exporting trajectory data...")
        save_trajectories_csv(
            propagator,
            hours=args.trajectory_hours,
            step_minutes=args.trajectory_step,
            output_file=args.trajectory_output
        )

    # Step 2: Initialize collision detector
    print("\n[2/4] Initializing collision detector...")
    detector = CollisionDetector(
        propagator=propagator,
        threshold_km=args.threshold,
        max_epoch_age_days=args.max_epoch_age,
        min_distance_km=args.min_distance
    )

    # Step 3: Run collision detection with Brent method
    print("\n[3/4] Running Brent method collision detection...")
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Determine target satellite
    target_catalog = args.target

    # If target name provided, find the catalog number
    if args.target_name and not target_catalog:
        for cat_num, sat in propagator.satellites.items():
            if args.target_name.upper() in sat.name.upper():
                target_catalog = cat_num
                print(f"Found target: {sat.name} (#{cat_num})")
                break
        if not target_catalog:
            print(f"ERROR: Could not find satellite matching '{args.target_name}'")
            sys.exit(1)

    # Run Brent method collision detection
    detector.scan_for_target(
        target_catalog=target_catalog,
        start_time=now,
        hours=args.hours,
        screening_threshold_km=args.screening_threshold
    )

    # Step 4: Save results and print summary
    print("\n[4/4] Saving results...")
    detector.save_results(args.output)
    detector.print_summary()

    # Final status
    unique_objects = len(set(a.sat2_catalog for a in detector.close_approaches))
    print("\n" + "=" * 70)
    print("COMPLETE")
    print("=" * 70)
    print(f"  Results saved to: {args.output}")
    print(f"  Total close approaches: {len(detector.close_approaches)}")
    print(f"  Target satellite: #{target_catalog}")
    print(f"  Unique objects at risk: {unique_objects}")
    print("=" * 70 + "\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
