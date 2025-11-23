import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";

// Set Cesium Ion token from environment variable
const cesiumToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
if (cesiumToken) {
  Cesium.Ion.defaultAccessToken = cesiumToken;
}

import { Conjunction } from './ConjunctionList';

interface CesiumViewerProps {
  noradId?: string; // NORAD catalog ID for TLE lookup
  czmlData?: any;   // Optional CZML data to load
  filteredConjunctions?: Conjunction[]; // Filtered conjunctions to display
  onEntityClick?: (entity: any) => void;
  refreshTrigger?: number; // Increment to force a refresh
}

export const CesiumViewer = ({ 
  noradId = "40069", 
  czmlData, 
  filteredConjunctions = [],
  onEntityClick, 
  refreshTrigger = 0 
}: CesiumViewerProps) => {
  const cesiumViewerRef = useRef<Cesium.Viewer | null>(null);
  const dataSourceRef = useRef<Cesium.CzmlDataSource | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toISOString());

  // Initialize Cesium viewer once on mount
  useEffect(() => {
    if (!viewerRef.current || cesiumViewerRef.current) return;

    const viewer = new Cesium.Viewer(viewerRef.current, {
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false,
      scene3DOnly: true,
      selectionIndicator: false,
      infoBox: false
    } as any);

    cesiumViewerRef.current = viewer;

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
    };
  }, []);

  const extractCatalogFromId = (id: string) => {
    const match = id.match(/\((\d+)\)$/);
    return match ? match[1] : null;
  };

  // Apply filters to CZML data
  const applyFiltersToCzml = (czml: any, conjunctions: Conjunction[] = []) => {
    if (!czml || conjunctions.length === 0) return czml;
    
    // Create a set of catalog numbers that should be visible
    const visibleCatalogs = new Set<string>();
    conjunctions.forEach(conj => {
      // Convert catalog numbers to strings since CZML IDs are strings
      visibleCatalogs.add(conj.sat1.catalog.toString());
      visibleCatalogs.add(conj.sat2.catalog.toString());
    });

    // Filter the CZML packets to only include visible satellites
    if (Array.isArray(czml)) {
      return czml.filter((packet: any) => {
        if (packet.id === "document" || packet.clock) return true;
    
        const catalog = extractCatalogFromId(packet.id);
        return catalog && visibleCatalogs.has(catalog);
      });
    }    
    return czml;
  };

  // Load CZML data when component mounts or refreshTrigger changes
  useEffect(() => {
    const loadData = async () => {
      if (!cesiumViewerRef.current) return;
      
      const viewer = cesiumViewerRef.current;
      setIsLoading(true);
      setError(null);

      try {
        // Remove existing data source if it exists
        if (dataSourceRef.current) {
          viewer.dataSources.remove(dataSourceRef.current);
          dataSourceRef.current = null;
        }

        // Use provided CZML data if available, otherwise load from file
        let dataSource;
        if (czmlData) {
          // Apply filters to the CZML data
          const filteredCzml = applyFiltersToCzml(czmlData, filteredConjunctions);
          // Load from provided CZML data
          dataSource = await Cesium.CzmlDataSource.load(filteredCzml);
        } else {
          // Fallback to loading from file
          const czmlPath = "/data/output.czml";
          console.log(`Loading CZML from: ${czmlPath}`);
          const response = await fetch(czmlPath);
          const czml = await response.json();
          const filteredCzml = applyFiltersToCzml(czml, filteredConjunctions);
          if (dataSourceRef.current) {
            viewer.dataSources.remove(dataSourceRef.current, true); // true = destroy
            dataSourceRef.current = null;
          }

          dataSource = await Cesium.CzmlDataSource.load(filteredCzml, {
            sourceUri: document.baseURI
          });
        }
        
        dataSourceRef.current = dataSource;
        await viewer.dataSources.add(dataSource);

        // Set up clock for animation
        const startTime = new Date();
        viewer.clock.startTime = Cesium.JulianDate.fromDate(startTime);
        viewer.clock.currentTime = Cesium.JulianDate.fromDate(startTime);
        viewer.clock.stopTime = Cesium.JulianDate.fromDate(
          new Date(startTime.getTime() + 180 * 60000)
        );
        viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
        viewer.clock.multiplier = 2;
        viewer.clock.shouldAnimate = true;

        // Zoom to the data
        await viewer.zoomTo(dataSource);
        
        setLastUpdate(new Date().toISOString());
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading satellite data:", err);
        setError("Error loading satellite data");
        setIsLoading(false);
      }
    };

    // Only load data if we have a viewer
    if (cesiumViewerRef.current) {
      loadData();
    }
  }, [refreshTrigger, czmlData, filteredConjunctions]); // Reload when refreshTrigger, czmlData, or filteredConjunctions changes

  return (
    <div className="relative w-full h-full">
      <div ref={viewerRef} className="absolute inset-0 rounded-lg overflow-hidden" />
      <div className="absolute top-4 left-4 mission-panel px-3 py-2 text-sm bg-background/80 backdrop-blur-sm rounded-lg">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-foreground">Loading satellite data...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-red-500">{error}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-foreground">Live Tracking Active</span>
            </div>
            {lastUpdate && (
              <div className="text-xs text-muted-foreground">
                Last updated: {new Date(lastUpdate).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
