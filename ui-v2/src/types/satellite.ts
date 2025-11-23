export type RiskLevel = 'high' | 'medium' | 'low';

export interface Satellite {
  name: string;
  noradId?: number;
  catalogNumber?: number | string;
  perigee?: number;
  apogee?: number;
  orbitalParameters?: {
    inclination: number;
    eccentricity: number;
    perigee?: number;
    apogee?: number;
  };
  crew?: {
    current: number;
    capacity: number;
    expedition: number;
  };
  physicalParameters?: {
    mass: number;
    length: number;
    width: number;
    height: number;
    pressurizedVolume: number;
  };
  tle?: string[];
}

export interface SatelliteData {
  name: string;
  catalogNumber: string;
  inclination: number;
  perigee: number;
  apogee: number;
  lastUpdate: string;
  closestApproach: {
    distance: number;
    risk: RiskLevel;
    time: string | null;
    secondarySatellite: string;
  };
  conjunctionCount: number;
  crew: {
    current: number;
    capacity: number;
    expedition: number;
  };
  physicalParameters: {
    mass: number;
    length: number;
    width: number;
    height: number;
    pressurizedVolume: number;
  };
  tle?: string[];
}
