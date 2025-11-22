import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import { fetchTLEData, tleToCSML } from "@/lib/tleUtils";

// Set Cesium Ion token from environment variable
const cesiumToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
if (cesiumToken) {
  Cesium.Ion.defaultAccessToken = cesiumToken;
}

interface CesiumViewerProps {
  noradId?: string; // NORAD catalog ID for TLE lookup
  czmlData?: any;
  onEntityClick?: (entity: any) => void;
}

export const CesiumViewer = ({ noradId = "40069", czmlData, onEntityClick }: CesiumViewerProps) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const cesiumViewerRef = useRef<Cesium.Viewer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewerRef.current || cesiumViewerRef.current) return;

    // Initialize Cesium Viewer
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
    } as any);

    cesiumViewerRef.current = viewer;

    // Set dark space theme with visible Earth
    viewer.scene.backgroundColor = Cesium.Color.BLACK;
    viewer.scene.globe.show = true;
    viewer.scene.skyBox.show = true;
    viewer.scene.sun.show = true;

    // Camera settings for orbital view showing Earth and satellites
    // viewer.camera.setView({
    //   destination: Cesium.Cartesian3.fromDegrees(0.0, 30.0, 12000000.0),
    //   orientation: {
    //     heading: 0.0,
    //     pitch: -Cesium.Math.PI_OVER_FOUR,
    //     roll: 0.0,
    //   },
    // });

    // Load TLE data and generate CZML
    const loadSatelliteData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (czmlData) {
          // Use provided CZML data
          const dataSource = new Cesium.CzmlDataSource();
          await dataSource.load(czmlData);
          viewer.dataSources.add(dataSource);
          setIsLoading(false);
        } else {
          // Fetch TLE data from CelesTrak
          console.log(`Fetching TLE data for NORAD ID: ${noradId}`);
          const tleData = await fetchTLEData(noradId);

          if (tleData) {
            console.log(`TLE data loaded: ${tleData.name}`);

            // Generate CZML from TLE for next 90 minutes (one orbit period approximately)
            const startTime = new Date();
            const czml = tleToCSML(tleData, startTime, 180);

            const dataSource = new Cesium.CzmlDataSource();
            await dataSource.load(czml);
            viewer.dataSources.add(dataSource);

            // Enable clock animation
            viewer.clock.startTime = Cesium.JulianDate.fromDate(startTime);
            viewer.clock.currentTime = Cesium.JulianDate.fromDate(startTime);
            viewer.clock.stopTime = Cesium.JulianDate.fromDate(new Date(startTime.getTime() + 180 * 60000));
            viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
            viewer.clock.multiplier = 60; // 60x speed
            viewer.clock.shouldAnimate = true;

            setIsLoading(false);
          } else {
            setError("Failed to load TLE data");
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error("Error loading satellite data:", err);
        setError("Error loading satellite data");
        setIsLoading(false);
      }
    };

    loadSatelliteData();

    // Handle entity clicks
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: any) => {
      const pickedObject = viewer.scene.pick(click.position);
      if (Cesium.defined(pickedObject) && pickedObject.id) {
        if (onEntityClick) {
          onEntityClick(pickedObject.id);
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      if (cesiumViewerRef.current) {
        cesiumViewerRef.current.destroy();
        cesiumViewerRef.current = null;
      }
    };
  }, [czmlData, onEntityClick, noradId]);

  return (
    <div className="relative w-full h-full">
      <div ref={viewerRef} className="absolute inset-0 rounded-lg overflow-hidden" />
      <div className="absolute top-4 left-4 mission-panel px-3 py-2 text-sm">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground">Loading TLE Data...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-risk-high" />
            <span className="text-risk-high">{error}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground">Live Tracking - CelesTrak TLE</span>
          </div>
        )}
      </div>
    </div>
  );
};
