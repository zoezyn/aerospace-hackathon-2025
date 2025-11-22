import { Satellite, RefreshCw, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TopBarProps {
  targetSatellite: string;
  onTargetChange: (value: string) => void;
  timeWindow: string;
  onTimeWindowChange: (value: string) => void;
  lastUpdate: string;
  onRefresh: () => void;
  autoRefresh: boolean;
}

export const TopBar = ({
  targetSatellite,
  onTargetChange,
  timeWindow,
  onTimeWindowChange,
  lastUpdate,
  onRefresh,
  autoRefresh,
}: TopBarProps) => {
  return (
    <header className="h-16 bg-panel-bg border-b border-panel-border px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Satellite className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold tracking-wide uppercase">
          Space Debris Encounter Predictor
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Target:</label>
          <Select value={targetSatellite} onValueChange={onTargetChange}>
            <SelectTrigger className="w-48 bg-muted border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sentinel-2a">Sentinel-2A</SelectItem>
              <SelectItem value="iss">ISS</SelectItem>
              <SelectItem value="hubble">Hubble Space Telescope</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Window:</label>
          <Select value={timeWindow} onValueChange={onTimeWindowChange}>
            <SelectTrigger className="w-32 bg-muted border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24">24h</SelectItem>
              <SelectItem value="48">48h</SelectItem>
              <SelectItem value="72">72h</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="gap-2 border-border hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Last update:</span>
            <span className="text-xs font-mono text-telemetry">{lastUpdate}</span>
          </div>
          {autoRefresh && (
            <Badge variant="outline" className="ml-2 border-primary text-primary">
              Auto-refresh: 5m
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
};
