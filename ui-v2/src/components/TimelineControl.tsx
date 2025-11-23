import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

interface TimelineEvent {
  id: string;
  time: string;
  risk: "high" | "medium" | "low";
}

interface TimelineControlProps {
  events: TimelineEvent[];
  currentTime: number;
  timeWindow: number; // in hours
  onTimeChange: (time: number) => void;
  onJumpToEvent: (eventId: string) => void;
}

export const TimelineControl = ({
  events,
  currentTime,
  timeWindow = 72, // default to 72 hours
  onTimeChange,
  onJumpToEvent,
}: TimelineControlProps) => {
  const maxTime = timeWindow * 3600; // Convert hours to seconds
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const cycleSpeed = () => {
    const speeds = [1, 2, 10];
    const currentIndex = speeds.indexOf(speed);
    setSpeed(speeds[(currentIndex + 1) % speeds.length]);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "bg-risk-high";
      case "medium":
        return "bg-risk-medium";
      case "low":
        return "bg-risk-low";
      default:
        return "bg-muted";
    }
  };

  return (
    <Card className="mission-panel p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onTimeChange(Math.max(0, currentTime - 3600))}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="h-10 w-10 bg-primary hover:bg-primary/90"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onTimeChange(currentTime + 3600)}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={cycleSpeed}
            >
              {speed}x
            </Button>
          </div>

          <div className="text-sm">
            <span className="text-muted-foreground">Simulation Time: </span>
            <span className="telemetry-text font-semibold">
              {new Date(currentTime * 1000).toUTCString()}
            </span>
          </div>
        </div>

        <div className="relative">
          <Slider
            value={[currentTime]}
            onValueChange={(value) => onTimeChange(value[0])}
            min={0}
            max={maxTime}
            step={60}
            className="w-full"
          />
          <div className="absolute top-0 left-0 right-0 h-2 flex items-center pointer-events-none">
            {events.map((event, index) => {
              const eventTime = new Date(event.time).getTime() / 1000;
              const position = (eventTime / maxTime) * 100;
              return (
                <div
                  key={event.id}
                  className={`absolute w-3 h-3 rounded-full ${getRiskColor(
                    event.risk
                  )} cursor-pointer pointer-events-auto`}
                  style={{ left: `${position}%`, transform: "translateX(-50%)" }}
                  onClick={() => onJumpToEvent(event.id)}
                  title={`${event.risk} risk event at ${event.time}`}
                />
              );
            })}
          </div>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>T+0h</span>
          {timeWindow > 24 && <span>T+24h</span>}
          {timeWindow > 48 && <span>T+48h</span>}
          {timeWindow > 72 && <span>T+72h</span>}
          <span>T+{timeWindow}h</span>
        </div>
      </div>
    </Card>
  );
};
