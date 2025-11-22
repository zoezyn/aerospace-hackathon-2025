import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Satellite } from "lucide-react";

interface SatelliteData {
  name: string;
  catalogNumber: number;
  inclination: number;
  perigee: number;
  apogee: number;
  lastUpdate: string;
  closestApproach: {
    distance: number;
    risk: "high" | "medium" | "low";
  };
  conjunctionCount: number;
}

interface SatelliteInfoProps {
  data: SatelliteData;
}

export const SatelliteInfo = ({ data }: SatelliteInfoProps) => {
  const getRiskBadgeClass = (risk: string) => {
    switch (risk) {
      case "high":
        return "risk-badge-high";
      case "medium":
        return "risk-badge-medium";
      case "low":
        return "risk-badge-low";
      default:
        return "";
    }
  };

  return (
    <Card className="mission-panel p-4 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Satellite className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Target Satellite</h2>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-2xl font-bold">{data.name}</div>
          <div className="text-sm text-muted-foreground">
            Catalog #{data.catalogNumber}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Inclination</div>
            <div className="telemetry-text text-lg">{data.inclination}°</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Perigee</div>
            <div className="telemetry-text text-lg">{data.perigee} km</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Apogee</div>
            <div className="telemetry-text text-lg">{data.apogee} km</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Last Update</div>
            <div className="text-xs font-mono">{data.lastUpdate}</div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-border space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Closest Approach</span>
          <span className={getRiskBadgeClass(data.closestApproach.risk)}>
            {data.closestApproach.risk.toUpperCase()}
          </span>
        </div>
        <div className="telemetry-text text-2xl font-bold">
          {data.closestApproach.distance.toFixed(2)} km
        </div>
      </div>

      <div className="pt-3 border-t border-border">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Conjunctions in Window</span>
          <Badge variant="secondary" className="text-lg font-bold">
            {data.conjunctionCount}
          </Badge>
        </div>
      </div>
    </Card>
  );
};
