import { useState, useEffect } from 'react';

interface SatelliteData {
  name: string;
  noradId: number;
  tle: string[];
  metadata: {
    internationalDesignator: string;
    launchDate: string;
    type: string;
    country: string;
    operator: string;
    purpose: string;
  };
  orbitalParameters: {
    inclination: number;
    raan: number;
    eccentricity: number;
    argumentOfPerigee: number;
    meanAnomaly: number;
    meanMotion: number;
    revolutionNumberAtEpoch: number;
    orbitType: string;
  };
  physicalParameters: {
    mass: number;
    length: number;
    width: number;
    height: number;
    pressurizedVolume: number;
  };
  crew: {
    current: number;
    capacity: number;
    expedition: number;
  };
  status: string;
}

export const useSatelliteData = (): [SatelliteData | null, boolean, Error | null] => {
  const [data, setData] = useState<SatelliteData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/data/iss_target.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch satellite data'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return [data, loading, error];
};
