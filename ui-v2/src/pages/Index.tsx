import { useState, useEffect, useRef } from "react";
import { TopBar } from "@/components/TopBar";
import { SatelliteInfo } from "@/components/SatelliteInfo";
import { ConjunctionList } from "@/components/ConjunctionList";
import { ConjunctionTable } from "@/components/ConjunctionTable";
import { FilterControls } from "@/components/FilterControls";
import { TimelineControl } from "@/components/TimelineControl";
import { CesiumViewer, type CesiumViewerRef } from "@/components/CesiumViewer";
import { useConjunctions } from "@/hooks/useConjunctions";
import { useSatelliteData } from "@/hooks/useSatelliteData";
import { CzmlDataSource } from "cesium";

const Index = () => {
  const cesiumViewerRef = useRef<CesiumViewerRef>(null);
  const [selectedConjunction, setSelectedConjunction] = useState<number | null>(null);
  const [targetSatellite, setTargetSatellite] = useState<string>('ISS (ZARYA)');
  const [timeWindow, setTimeWindow] = useState<string>('24');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toLocaleString());
  
  const [filters, setFilters] = useState({
    showHigh: true,
    showMedium: true,
    showLow: true,
    maxDistance: 100, // Default to maximum value (100 km)
  });
  
  const { conjunctions = [], loading, error } = useConjunctions();
  
  // Get the currently selected conjunction
  const currentConjunction = selectedConjunction !== null ? conjunctions[selectedConjunction] : null;
  
  // Filter conjunctions based on alert level
  const filteredConjunctions = conjunctions.filter(conj => {
    if (!conj) return false;
    if (conj.alert_level === 'RED' && !filters.showHigh) return false;
    if (conj.alert_level === 'YELLOW' && !filters.showMedium) return false;
    if (conj.alert_level === 'GREEN' && !filters.showLow) return false;
    if (filters.maxDistance > 0 && conj.distance_km > filters.maxDistance) return false;
    return true;
  });
  
  // Load ISS satellite data
  const [issData, issLoading, issError] = useSatelliteData();

  // Calculate satellite data based on conjunctions and ISS data
  const satelliteData = {
    name: currentConjunction?.sat1?.name || (issData?.name || "ISS (ZARYA)"),
    catalogNumber: currentConjunction?.sat1?.catalog || (issData?.noradId || 25544),
    inclination: currentConjunction?.sat1?.position?.y || (issData?.orbitalParameters?.inclination || 51.64),
    // @ts-ignore - These properties are used but not in the Satellite type
    perigee: currentConjunction?.sat1?.perigee || Math.round((1 - (issData?.orbitalParameters?.eccentricity || 0.0004)) * 6778 - 6371) || 408,
    // @ts-ignore - These properties are used but not in the Satellite type
    apogee: currentConjunction?.sat1?.apogee || Math.round((1 + (issData?.orbitalParameters?.eccentricity || 0.0004)) * 6778 - 6371) || 418,
    lastUpdate: currentConjunction?.tca_time 
      ? new Date(currentConjunction.tca_time).toLocaleString() 
      : new Date().toLocaleString(),
    closestApproach: {
      distance: filteredConjunctions[0]?.distance_km || 0,
      risk: (filteredConjunctions[0]?.alert_level?.toLowerCase() as 'high' | 'medium' | 'low' | undefined) || 'low',
      time: filteredConjunctions[0]?.tca_time || null,
      secondarySatellite: filteredConjunctions[0]?.sat2?.name || 'Unknown'
    },
    conjunctionCount: filteredConjunctions.length,
    crew: {
      current: issData?.crew?.current || 7,
      capacity: issData?.crew?.capacity || 7,
      expedition: issData?.crew?.expedition || 70
    },
    physicalParameters: issData?.physicalParameters || {
      mass: 419725,
      length: 109,
      width: 73,
      height: 20,
      pressurizedVolume: 916
    },
    tle: issData?.tle || [
      "ISS (ZARYA)",
      "1 25544U 98067A   25325.83510273  .00014642  00000+0  27370-3 0  9994",
      "2 25544  51.6324 245.9468 0003994 153.9795 206.1394 15.48969112539610"
    ],
  };
  
  const handleSelectConjunction = (index: number) => {
    setSelectedConjunction(index);
    
    // Focus on the selected satellite in the Cesium viewer
    const conjunction = filteredConjunctions[index];
    if (conjunction && cesiumViewerRef.current) {
      // Try to focus on the primary satellite first, then the secondary one
      const catalogNumber = conjunction.sat2?.catalog || conjunction.sat1?.catalog;
      if (catalogNumber) {
        cesiumViewerRef.current.focusOnEntity(catalogNumber.toString());
      }
    }
  };

  const handleRefresh = () => {
    setLastUpdate(new Date().toLocaleString());
    // In a real app, you would trigger a data refetch here
    // For now, we'll just update the lastUpdate timestamp
  };

  const handleEntityClick = (entity: any) => {
    console.log("Entity clicked:", entity);
  };

  const handleJumpToEvent = (eventId: string) => {
    console.log("Jumping to event:", eventId);
    // Find the index of the conjunction with this catalog number
    const index = conjunctions.findIndex(c => c?.sat1?.catalog?.toString() === eventId);
    if (index !== -1) {
      setSelectedConjunction(index);
    }
  };

  // Auto-refresh simulation (every 5 minutes in production)
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate data refresh
      console.log("Auto-refresh triggered");
    }, 300000); // 5 minutes

  }, []);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopBar 
        targetSatellite={targetSatellite}
        onTargetChange={setTargetSatellite}
        timeWindow={timeWindow}
        onTimeWindowChange={setTimeWindow}
        lastUpdate={lastUpdate}
        onRefresh={handleRefresh}
        autoRefresh={autoRefresh}
      />

      <div className="flex-1 flex flex-col h-0">
        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden px-4 pb-2">
          {/* Cesium Viewer - takes most of the space */}
          <div className="flex-1 rounded-lg overflow-hidden border">
            <CesiumViewer 
              ref={cesiumViewerRef}
              onEntityClick={handleEntityClick} 
              filteredConjunctions={filteredConjunctions}
              refreshTrigger={filters.minDistance} // Trigger refresh when minDistance changes
            />
          </div>

          {/* Right Panel - fixed width, scrollable */}
          <div className="w-96 ml-4 flex flex-col">
            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              <SatelliteInfo data={satelliteData} />
              <FilterControls
                filters={filters}
                onFilterChange={setFilters}
              />
              
              {loading && (
                <div className="p-4 text-center text-muted-foreground">
                  Loading conjunction data...
                </div>
              )}
              
              {error && (
                <div className="p-4 text-center text-destructive">
                  Error loading conjunction data: {error.message}
                </div>
              )}
              
              <div className="flex-1 overflow-y-auto">
                <div className="flex justify-between items-center mb-4 px-4">
                  <h2 className="text-lg font-semibold">Conjunctions</h2>
                  <ConjunctionTable 
                    conjunctions={filteredConjunctions}
                    onSelectConjunction={handleSelectConjunction}
                  />
                </div>
                {!loading && !error && (
                  <ConjunctionList 
                    conjunctions={filteredConjunctions}
                    onSelectConjunction={handleSelectConjunction}
                    selectedIndex={selectedConjunction}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline at the bottom */}
        <div className="mt-4 px-4">
          <TimelineControl
            events={filteredConjunctions.map((c, index) => ({
              id: `${c.sat1.catalog}-${c.sat2.catalog}-${new Date(c.tca_time).getTime()}-${index}`,
              time: c.tca_time,
              risk: c.alert_level.toLowerCase() as 'high' | 'medium' | 'low'
            }))}
            currentTime={Date.now() / 1000}
            timeWindow={Number(timeWindow)}
            onTimeChange={() => {}}
            onJumpToEvent={(eventId) => {
              // Extract the catalog number from the event ID
              const catalog = eventId.split('-')[0];
              handleJumpToEvent(catalog);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
