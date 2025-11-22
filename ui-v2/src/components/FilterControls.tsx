import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Filter } from "lucide-react";

interface FilterControlsProps {
  filters: {
    showHigh: boolean;
    showMedium: boolean;
    showLow: boolean;
    minDistance: number;
  };
  onFilterChange: (filters: any) => void;
}

export const FilterControls = ({ filters, onFilterChange }: FilterControlsProps) => {
  return (
    <Card className="mission-panel p-4 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Filter className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Filters</h2>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Risk Levels</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="high"
                checked={filters.showHigh}
                onCheckedChange={(checked) =>
                  onFilterChange({ ...filters, showHigh: checked })
                }
              />
              <label
                htmlFor="high"
                className="text-sm cursor-pointer flex items-center gap-2"
              >
                <div className="w-3 h-3 rounded-full bg-risk-high"></div>
                High Risk
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="medium"
                checked={filters.showMedium}
                onCheckedChange={(checked) =>
                  onFilterChange({ ...filters, showMedium: checked })
                }
              />
              <label
                htmlFor="medium"
                className="text-sm cursor-pointer flex items-center gap-2"
              >
                <div className="w-3 h-3 rounded-full bg-risk-medium"></div>
                Medium Risk
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="low"
                checked={filters.showLow}
                onCheckedChange={(checked) =>
                  onFilterChange({ ...filters, showLow: checked })
                }
              />
              <label
                htmlFor="low"
                className="text-sm cursor-pointer flex items-center gap-2"
              >
                <div className="w-3 h-3 rounded-full bg-risk-low"></div>
                Low Risk
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Min Distance Threshold
          </Label>
          <div className="flex items-center gap-3">
            <Slider
              value={[filters.minDistance]}
              onValueChange={(value) =>
                onFilterChange({ ...filters, minDistance: value[0] })
              }
              min={0}
              max={10}
              step={0.1}
              className="flex-1"
            />
            <span className="telemetry-text text-sm w-16 text-right">
              {filters.minDistance.toFixed(1)} km
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
