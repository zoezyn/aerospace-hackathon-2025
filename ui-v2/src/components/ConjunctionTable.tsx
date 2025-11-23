import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { AlertTriangle, Mail } from "lucide-react";
import { Conjunction } from "./ConjunctionList";

interface ConjunctionTableProps {
  conjunctions: Conjunction[];
  onSelectConjunction: (index: number) => void;
}

export const ConjunctionTable = ({ 
  conjunctions, 
  onSelectConjunction 
}: ConjunctionTableProps) => {
  const getRiskColor = (alertLevel: string) => {
    switch (alertLevel) {
      case 'RED':
        return 'bg-risk-high/20 text-risk-high';
      case 'YELLOW':
        return 'bg-risk-medium/20 text-risk-medium';
      case 'GREEN':
        return 'bg-risk-low/20 text-risk-low';
      default:
        return 'bg-muted/50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="ml-2">
          <Mail className="w-4 h-4 mr-2" />
            Send Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conjunctions Overview</DialogTitle>
        </DialogHeader>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alert Level</TableHead>
                <TableHead>TCA Time</TableHead>
                <TableHead>Distance (km)</TableHead>
                <TableHead>Relative Velocity (km/s)</TableHead>
                <TableHead>Satellite 1</TableHead>
                <TableHead>Satellite 2</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conjunctions.map((conj, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Badge 
                      className={`${getRiskColor(conj.alert_level)}`}
                      variant="outline"
                    >
                      {conj.alert_level}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(conj.tca_time)}</TableCell>
                  <TableCell>{conj.distance_km.toFixed(2)}</TableCell>
                  <TableCell>{conj.relative_velocity_km_s.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{conj.sat1.name}</div>
                    <div className="text-sm text-muted-foreground">CAT: {conj.sat1.catalog}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{conj.sat2.name}</div>
                    <div className="text-sm text-muted-foreground">CAT: {conj.sat2.catalog}</div>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        const subject = `Conjunction Alert: ${conj.sat1.name} & ${conj.sat2.name}`;
                        const body = `Conjunction Alert Details:

Alert Level: ${conj.alert_level}
TCA Time: ${new Date(conj.tca_time).toLocaleString()}
Distance: ${conj.distance_km.toFixed(2)} km
Relative Velocity: ${conj.relative_velocity_km_s.toFixed(2)} km/s

Satellite 1:
- Name: ${conj.sat1.name}
- Catalog: ${conj.sat1.catalog}
- Position: (${conj.sat1.position.x.toFixed(2)}, ${conj.sat1.position.y.toFixed(2)}, ${conj.sat1.position.z.toFixed(2)})
- Velocity: (${conj.sat1.velocity.vx.toFixed(2)}, ${conj.sat1.velocity.vy.toFixed(2)}, ${conj.sat1.velocity.vz.toFixed(2)})

Satellite 2:
- Name: ${conj.sat2.name}
- Catalog: ${conj.sat2.catalog}
- Position: (${conj.sat2.position.x.toFixed(2)}, ${conj.sat2.position.y.toFixed(2)}, ${conj.sat2.position.z.toFixed(2)})
- Velocity: (${conj.sat2.velocity.vx.toFixed(2)}, ${conj.sat2.velocity.vy.toFixed(2)}, ${conj.sat2.velocity.vz.toFixed(2)})`;
                        
                        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      }}
                    >
                      Send Alert
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};
