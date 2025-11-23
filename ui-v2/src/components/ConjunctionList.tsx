import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useState } from "react";

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Velocity {
  vx: number;
  vy: number;
  vz: number;
}

export interface Satellite {
  name: string;
  catalog: number;
  position: Position;
  velocity: Velocity;
}

export interface Conjunction {
  alert_level: 'RED' | 'YELLOW' | 'GREEN' | string;
  tca_time: string;
  distance_km: number;
  relative_velocity_km_s: number;
  sat1: Satellite;
  sat2: Satellite;
}

interface ConjunctionListProps {
  conjunctions: Conjunction[];
  onSelectConjunction: (index: number) => void;
  selectedIndex?: number | null;
}

export const ConjunctionList = ({ 
  conjunctions, 
  onSelectConjunction,
  selectedIndex = null 
}: ConjunctionListProps) => {
  const getRiskColor = (alertLevel: string) => {
    switch (alertLevel) {
      case 'RED':
        return 'text-risk-high border-risk-high bg-risk-high/10';
      case 'YELLOW':
        return 'text-risk-medium border-risk-medium bg-risk-medium/10';
      case 'GREEN':
      default:
        return 'text-risk-low border-risk-low bg-risk-low/10';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card className="mission-panel p-4 space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <AlertTriangle className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Conjunctions</h2>
      </div>

      <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
        {conjunctions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No conjunction data available
          </div>
        ) : (
          conjunctions.map((conj, index) => (
            <div
              key={`${conj.sat1.catalog}-${conj.sat2.catalog}-${conj.tca_time}-${index}`}
              onClick={() => onSelectConjunction(index)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedIndex === index 
                  ? 'bg-muted/80 border-primary' 
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold line-clamp-1">
                      {conj.sat2.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getRiskColor(conj.alert_level)}`}
                    >
                      {conj.alert_level}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Catalog IDs: {conj.sat1.catalog} & {conj.sat2.catalog}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">TCA (UTC)</div>
                  <div className="font-medium text-sm">
                    {formatDate(conj.tca_time)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Distance</div>
                  <div className="font-medium text-sm">
                    {conj.distance_km.toFixed(2)} km
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Relative Velocity</div>
                  <div className="font-medium text-sm">
                    {conj.relative_velocity_km_s.toFixed(2)} km/s
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
