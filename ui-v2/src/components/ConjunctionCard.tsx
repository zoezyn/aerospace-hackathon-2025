import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Position {
  x: number;
  y: number;
  z: number;
}

interface Velocity {
  vx: number;
  vy: number;
  vz: number;
}

interface Satellite {
  name: string;
  catalog: number;
  position: Position;
  velocity: Velocity;
}

export interface Conjunction {
  alert_level: string;
  tca_time: string;
  distance_km: number;
  relative_velocity_km_s: number;
  sat1: Satellite;
  sat2: Satellite;
}

interface ConjunctionCardProps {
  conjunction: Conjunction;
  onClick?: () => void;
}

export function ConjunctionCard({ conjunction, onClick }: ConjunctionCardProps) {
  const getAlertVariant = (level: string) => {
    switch (level) {
      case 'RED':
        return 'destructive';
      case 'YELLOW':
        return 'default'; // Changed from 'warning' to 'default'
      default:
        return 'outline';
    }
  };

  return (
    <Card 
      className="mb-4 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">
            {conjunction.sat1.name} & {conjunction.sat2.name}
          </CardTitle>
          <Badge variant={getAlertVariant(conjunction.alert_level)}>
            {conjunction.alert_level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">TCA Time</h4>
            <p>{new Date(conjunction.tca_time).toLocaleString()}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Distance</h4>
            <p>{conjunction.distance_km.toFixed(2)} km</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Relative Velocity</h4>
            <p>{conjunction.relative_velocity_km_s.toFixed(2)} km/s</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Catalog IDs</h4>
            <p>{conjunction.sat1.catalog} & {conjunction.sat2.catalog}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
