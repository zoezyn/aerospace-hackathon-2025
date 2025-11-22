import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Conjunction {
  id: string;
  debrisId: string;
  objectType: string;
  distance: number;
  time: string;
  risk: "high" | "medium" | "low";
  relativeVelocity: number[];
  lastUpdate: string;
}

interface ConjunctionListProps {
  conjunctions: Conjunction[];
  onSelectConjunction: (id: string) => void;
}

export const ConjunctionList = ({ conjunctions, onSelectConjunction }: ConjunctionListProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "text-risk-high border-risk-high bg-risk-high/10";
      case "medium":
        return "text-risk-medium border-risk-medium bg-risk-medium/10";
      case "low":
        return "text-risk-low border-risk-low bg-risk-low/10";
      default:
        return "";
    }
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelectConjunction(id);
  };

  return (
    <Card className="mission-panel p-4 space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <AlertTriangle className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Conjunctions</h2>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {conjunctions.map((conj) => (
          <div
            key={conj.id}
            onClick={() => handleSelect(conj.id)}
            className={`p-3 rounded-lg border cursor-pointer smooth-transition hover:bg-muted/50 ${
              selectedId === conj.id ? "bg-muted border-primary" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-semibold">{conj.debrisId}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getRiskColor(conj.risk)}`}
                  >
                    {conj.risk}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">{conj.objectType}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Distance</div>
                <div className="telemetry-text font-semibold">
                  {conj.distance.toFixed(2)} km
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">TCA</div>
                <div className="text-xs font-mono">
                  {new Date(conj.time).toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="mt-2 text-xs text-muted-foreground">
              Updated: {conj.lastUpdate}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
