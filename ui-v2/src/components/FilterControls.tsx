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
    maxDistance: number; // 0-50 km
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
                  onFilterChange({ ...filters, showLow: !!checked })
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

        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <Label htmlFor="distance" className="text-sm text-muted-foreground">
                Maximum Distance
              </Label>
              <span className="text-sm text-muted-foreground">
                {filters.maxDistance} km
              </span>
            </div>
            <Slider
              id="distance"
              min={0}
              max={100}
              step={1}
              value={[filters.maxDistance]}
              onValueChange={(value) =>
                onFilterChange({ ...filters, maxDistance: value[0] })
              }
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0 km</span>
              <span>100 km</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
