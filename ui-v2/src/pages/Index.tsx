import { useState, useEffect } from "react";
import { TopBar } from "@/components/TopBar";
import { SatelliteInfo } from "@/components/SatelliteInfo";
import { ConjunctionList } from "@/components/ConjunctionList";
import { FilterControls } from "@/components/FilterControls";
import { TimelineControl } from "@/components/TimelineControl";
import { CesiumViewer } from "@/components/CesiumViewer";

const Index = () => {
  const [targetSatellite, setTargetSatellite] = useState("sentinel-2a");
  const [timeWindow, setTimeWindow] = useState("72");
  const [currentTime, setCurrentTime] = useState(Date.now() / 1000);
  const [selectedConjunction, setSelectedConjunction] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    showHigh: true,
    showMedium: true,
    showLow: true,
    minDistance: 0,
  });

  // Sample data
  const satelliteData = {
    name: "Sentinel-2A",
    catalogNumber: 40069,
    inclination: 98.6,
    perigee: 786,
    apogee: 786,
    lastUpdate: "12:00:05 UTC",
    closestApproach: {
      distance: 0.82,
      risk: "high" as const,
    },
    conjunctionCount: 7,
  };

  const conjunctions = [
    {
      id: "conj-1",
      debrisId: "12345",
      objectType: "Rocket Body Fragment",
      distance: 0.82,
      time: "2025-11-22T14:35:00Z",
      risk: "high" as const,
      relativeVelocity: [-5.1, 1.2, 7.8],
      lastUpdate: "11:55:00 UTC",
    },
    {
      id: "conj-2",
      debrisId: "23456",
      objectType: "Debris Fragment",
      distance: 2.15,
      time: "2025-11-22T18:20:00Z",
      risk: "medium" as const,
      relativeVelocity: [-3.2, 0.8, 5.1],
      lastUpdate: "11:58:00 UTC",
    },
    {
      id: "conj-3",
      debrisId: "34567",
      objectType: "Satellite Debris",
      distance: 4.50,
      time: "2025-11-23T02:45:00Z",
      risk: "low" as const,
      relativeVelocity: [-2.1, 0.3, 3.2],
      lastUpdate: "12:01:00 UTC",
    },
    {
      id: "conj-4",
      debrisId: "45678",
      objectType: "Paint Fleck",
      distance: 1.25,
      time: "2025-11-23T08:15:00Z",
      risk: "medium" as const,
      relativeVelocity: [-4.5, 1.5, 6.8],
      lastUpdate: "11:52:00 UTC",
    },
    {
      id: "conj-5",
      debrisId: "56789",
      objectType: "Solar Panel Fragment",
      distance: 0.95,
      time: "2025-11-23T16:30:00Z",
      risk: "high" as const,
      relativeVelocity: [-6.2, 2.1, 8.5],
      lastUpdate: "11:57:00 UTC",
    },
  ];

  const timelineEvents = conjunctions.map((c) => ({
    id: c.id,
    time: c.time,
    risk: c.risk,
  }));

  const handleRefresh = () => {
    console.log("Refreshing data...");
    // In real implementation, fetch new CZML data
  };

  const handleEntityClick = (entity: any) => {
    console.log("Entity clicked:", entity);
  };

  const handleJumpToEvent = (eventId: string) => {
    console.log("Jumping to event:", eventId);
    setSelectedConjunction(eventId);
  };

  // Auto-refresh simulation (every 5 minutes in production)
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate data refresh
      console.log("Auto-refresh triggered");
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-space-dark">
      <TopBar
        targetSatellite={targetSatellite}
        onTargetChange={setTargetSatellite}
        timeWindow={timeWindow}
        onTimeWindowChange={setTimeWindow}
        lastUpdate="12:00:05 UTC"
        onRefresh={handleRefresh}
        autoRefresh={true}
      />

      <div className="flex-1 flex gap-4 p-4">
        {/* Main Cesium Viewer */}
        <div className="flex-1 mission-panel overflow-hidden">
          <CesiumViewer onEntityClick={handleEntityClick} />
        </div>

        {/* Right Info Panel */}
        <div className="w-96 space-y-4 overflow-y-auto">
          <SatelliteInfo data={satelliteData} />
          <FilterControls filters={filters} onFilterChange={setFilters} />
          <ConjunctionList
            conjunctions={conjunctions}
            onSelectConjunction={setSelectedConjunction}
          />
        </div>
      </div>

      {/* Bottom Timeline */}
      <div className="p-4 pt-0">
        <TimelineControl
          events={timelineEvents}
          currentTime={currentTime}
          onTimeChange={setCurrentTime}
          onJumpToEvent={handleJumpToEvent}
        />
      </div>
    </div>
  );
};

export default Index;
