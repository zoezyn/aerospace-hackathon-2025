import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
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

interface CesiumViewerRef {
  focusOnEntity: (catalogNumber: string) => void;
}

const CesiumViewer = forwardRef<CesiumViewerRef, CesiumViewerProps>(({ 
  noradId = "40069", 
  czmlData, 
  filteredConjunctions = [],
  onEntityClick, 
  refreshTrigger = 0
}, ref) => {
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
        viewer.clock.multiplier = 40;
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

  // Set up hover handler
  useEffect(() => {
    const viewer = cesiumViewerRef.current;
    if (!viewer) return;

    const tooltip = document.getElementById("hover-tooltip");
    if (!tooltip) return;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((movement: any) => {
      const picked = viewer.scene.pick(movement.endPosition);

      if (Cesium.defined(picked) && picked.id) {
        const entity = picked.id;
        const properties = entity.properties;
        
        // Get satellite name and catalog number from entity properties or ID
        const name = entity.name || properties?.name?.getValue() || 'Unknown';
        const catalog = properties?.catalog_number?.getValue() || 
                       properties?.catalogNumber?.getValue() || 
                       entity.id || 'N/A';
        
        // Get position and time data
        const now = Cesium.JulianDate.now();
        const currentTime = Cesium.JulianDate.toDate(now);
        
        let altitude = '';
        let positionInfo = '';
        
        if (entity.position) {
          try {
            // Get position in ECEF coordinates (x, y, z in meters)
            const position = entity.position.getValue(now);
            
            // Get cartographic position (longitude, latitude, height)
            const cartographic = Cesium.Cartographic.fromCartesian(position);
            
            if (cartographic) {
              // Convert to degrees and km for display
              const longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4);
              const latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4);
              const height = (cartographic.height / 1000).toFixed(1);
              
              altitude = `${height} km`;
              
              // Format position information
              positionInfo = `
                <div class="mt-1 pt-1 border-t border-gray-600">
                  <div class="text-xs text-gray-300">Position (ECI):</div>
                  <div class="grid grid-cols-3 gap-1 text-xs">
                    <div>X: ${(position.x / 1000).toFixed(1)} km</div>
                    <div>Y: ${(position.y / 1000).toFixed(1)} km</div>
                    <div>Z: ${(position.z / 1000).toFixed(1)} km</div>
                  </div>
                  <div class="mt-1 text-xs text-gray-300">
                    Lat: ${latitude}°<br/>
                    Lon: ${longitude}°
                  </div>
                </div>
              `;
            }
          } catch (e) {
            console.warn('Error getting position data:', e);
          }
        }

        // Format time
        const formattedTime = currentTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });

        // Update tooltip content
        tooltip.innerHTML = `
          <div class="font-semibold">${name}</div>
          <div class="text-xs text-gray-300">${formattedTime} UTC</div>
          <div class="mt-1">
            <span class="text-gray-300">Catalog:</span> ${catalog}<br/>
            ${altitude ? `<span class="text-gray-300">Alt:</span> ${altitude}` : ''}
          </div>
          ${positionInfo}
        `;

        // Position tooltip near cursor
        tooltip.style.left = `${movement.endPosition.x + 15}px`;
        tooltip.style.top = `${movement.endPosition.y + 15}px`;
        tooltip.style.opacity = '1';
      } else {
        tooltip.style.opacity = '0';
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    return () => {
      if (!handler.isDestroyed()) {
        handler.destroy();
      }
    };
  }, []);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    focusOnEntity: (catalogNumber: string) => {
      const viewer = cesiumViewerRef.current;
      if (!viewer) return;

      // Find the entity with matching catalog number
      viewer.dataSources.get(0)?.entities.values.some(entity => {
        const entityCatalog = entity.id || 
                             entity.properties?.catalogNumber?.getValue() || 
                             '';
        // Convert both to strings for comparison
        const entityCatalogStr = entityCatalog?.toString() || '';
        const catalogNumberStr = catalogNumber.toString();

        // Check if the entity's catalog number contains the target catalog number
        if (entityCatalogStr.includes(catalogNumberStr)) {
          // Get the tooltip element
          const tooltip = document.getElementById("hover-tooltip");
          
          // Fly to the entity with a smooth animation
          const flyToPromise = viewer.flyTo(entity, {
            offset: new Cesium.HeadingPitchRange(
              0,
              Cesium.Math.toRadians(-60), // view angle
              50000000                    // distance: 5,000 km
            ),
            duration: 1.5
          });

          // Use the promise to handle completion
          flyToPromise.then(() => {
            // Show tooltip after the fly-to animation completes
            if (tooltip) {
              const name = entity.name || entity.id || 'Unknown';
              const catalog = entity.properties?.catalogNumber?.getValue() || entityCatalogStr || 'N/A';
              
              // Position tooltip near the entity
              const position = Cesium.SceneTransforms.worldToWindowCoordinates(
                viewer.scene,
                entity.position.getValue(Cesium.JulianDate.now())
              );
              
              if (position) {
                // Get additional satellite data if available
                const altitude = entity.position ? 
                  (() => {
                    try {
                      const cartographic = Cesium.Cartographic.fromCartesian(
                        entity.position.getValue(Cesium.JulianDate.now())
                      );
                      return cartographic ? `${(cartographic.height / 1000).toFixed(1)} km` : 'N/A';
                    } catch {
                      return 'N/A';
                    }
                  })() : 'N/A';

                // Get velocity if available
                const velocity = entity.velocity ? 
                  (() => {
                    try {
                      const vel = entity.velocity.getValue(Cesium.JulianDate.now());
                      return vel ? `${Cesium.Cartesian3.magnitude(vel).toFixed(1)} m/s` : 'N/A';
                    } catch {
                      return 'N/A';
                    }
                  })() : 'N/A';

                tooltip.innerHTML = `
                  <div class="font-semibold text-base">${name}</div>
                  <div class="text-xs text-gray-400 mb-1">${new Date().toLocaleTimeString()} UTC</div>
                  
                  <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div class="text-gray-300">Catalog:</div>
                    <div class="text-right">${catalog}</div>
                    
                    <div class="text-gray-300">Altitude:</div>
                    <div class="text-right">${altitude}</div>
                    
                  </div>
                  
                  ${entity.description ? `
                    <div class="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
                      ${entity.description}
                    </div>
                  ` : ''}
                `;
                
                tooltip.style.left = `${position.x + 15}px`;
                tooltip.style.top = `${position.y + 15}px`;
                tooltip.style.opacity = '1';
                
                // Hide tooltip after 3 seconds
                setTimeout(() => {
                  tooltip.style.opacity = '0';
                }, 3000);
              }
            }
          });
          
          // Highlight the entity
          viewer.selectedEntity = entity;
          
          return true; // Stop searching
        }
        return false;
      });
    }
  }));

  return (
    <div className="relative w-full h-full">
      <div ref={viewerRef} className="absolute inset-0 rounded-lg overflow-hidden" />
      {/* Tooltip element */}
      <div
        id="hover-tooltip"
        className="absolute px-3 py-2 bg-black/90 text-white text-sm rounded pointer-events-none opacity-0 transition-all duration-100 z-50 max-w-xs break-words shadow-lg backdrop-blur-sm border border-gray-700"
      ></div>
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
});

CesiumViewer.displayName = 'CesiumViewer';

export { CesiumViewer };
export type { CesiumViewerRef };
