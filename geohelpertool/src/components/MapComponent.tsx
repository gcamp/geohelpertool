import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import Map, { NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapComponent.css';
import { useLayerContext } from '../hooks/useLayerContextHook';
import { detectAndParseLayer } from '../utils/layerTypeDetector';
import { useNotification } from './NotificationContainer';
import { MapLayerManager } from '../utils/mapLayerManager';
import bbox from '@turf/bbox';
// @ts-ignore - Used in type annotations
import type { GeoJSON } from 'geojson';
import type { MapRef } from 'react-map-gl/maplibre';
import type { Layer } from '../types/layer';

interface MapComponentProps {
  initialViewState?: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  sidebarVisible?: boolean;
  sidebarWidth?: number;
}

export interface MapComponentRef {
  fitMapToLayers: () => void;
}

const MapComponent = forwardRef<MapComponentRef, MapComponentProps>(({ 
  initialViewState = {
    latitude: 45.5017,
    longitude: -73.5673,
    zoom: 10
  },
  sidebarVisible = true,
  sidebarWidth = 320
}, ref) => {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerManagerRef = useRef<MapLayerManager | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const { state, actions } = useLayerContext();
  const { showSuccess, showError } = useNotification();

  const fitMapToLayers = () => {
    const map = mapRef.current?.getMap();
    if (!map || state.layers.length === 0) return;

    try {
      // Combine all layer data into one feature collection
      const allFeatures: GeoJSON.Feature[] = [];
      state.layers.forEach(layer => {
        if (layer.data && layer.data.features) {
          allFeatures.push(...layer.data.features);
        }
      });

      if (allFeatures.length === 0) return;

      const combinedFeatureCollection: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: allFeatures
      };

      // Calculate bounding box
      const [minLng, minLat, maxLng, maxLat] = bbox(combinedFeatureCollection);
      
      // Validate latitude values before fitting map
      if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) {
        throw new Error(`Invalid latitude values: minLat=${minLat}, maxLat=${maxLat}. Latitude must be between -90 and 90.`);
      }
      
      // Validate longitude values  
      if (minLng < -180 || minLng > 180 || maxLng < -180 || maxLng > 180) {
        throw new Error(`Invalid longitude values: minLng=${minLng}, maxLng=${maxLng}. Longitude must be between -180 and 180.`);
      }
      
      // Add padding to account for sidebar and general spacing
      const generalPadding = 50; // General padding around the bounds
      
      // Calculate right padding based on sidebar visibility and width
      const rightPadding = sidebarVisible ? sidebarWidth + generalPadding : generalPadding;
      
      // Fit the map to the bounds with asymmetric padding
      map.fitBounds([
        [minLng, minLat],
        [maxLng, maxLat]
      ], {
        padding: {
          top: generalPadding,
          bottom: generalPadding,
          left: generalPadding,
          right: rightPadding // Extra space for sidebar when visible
        },
        duration: 1000, // Animation duration in ms
        maxZoom: 16 // Don't zoom in too much for small features
      });
    } catch (error) {
      console.error('Error fitting map to layers:', error);
      showError('Error fitting map to layers', `${error}`);
    }
  };

  // Expose the fitMapToLayers function to parent components
  useImperativeHandle(ref, () => ({
    fitMapToLayers
  }));

  const convertToFeatureCollection = (geoJson: GeoJSON.GeoJSON): GeoJSON.FeatureCollection => {
    if (geoJson.type === 'FeatureCollection') {
      return geoJson as GeoJSON.FeatureCollection;
    } else if (geoJson.type === 'Feature') {
      return {
        type: 'FeatureCollection',
        features: [geoJson as GeoJSON.Feature]
      };
    } else {
      return {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: geoJson as GeoJSON.Geometry,
          properties: {}
        }]
      };
    }
  };

  const addMapLayer = (layer: Layer) => {
    const layerManager = layerManagerRef.current;
    const map = mapRef.current?.getMap();
    
    if (!layerManager && !map) {
      return;
    }

    // Fallback to old method if layer manager not ready
    if (!layerManager && map) {
      addMapLayerFallback(layer);
      return;
    }

    try {
      if (!layerManager!.hasSource(layer.id)) {
        layerManager!.addSource(layer.id, layer.data);
      }
      layerManager!.addLayers(layer.id, layer);
    } catch (error) {
      console.error('Error adding layer to map:', error);
    }
  };

  const addMapLayerFallback = (layer: Layer) => {
    const map = mapRef.current?.getMap();
    if (!map) {
      return;
    }

    const sourceId = `layer-source-${layer.id}`;
    const layerId = `layer-${layer.id}`;

    try {
      // Add source if it doesn't exist
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: layer.data
        });
      }

      // For now using simple blue color in fallback

      // Handle different geometry types
      const hasPoints = layer.data.features.some(f => f.geometry.type === 'Point');
      const hasLines = layer.data.features.some(f => f.geometry.type === 'LineString');
      const hasPolygons = layer.data.features.some(f => f.geometry.type === 'Polygon');

      // Add point layer if needed
      if (hasPoints) {
        const pointLayerId = `${layerId}-points`;
        if (!map.getLayer(pointLayerId)) {
          map.addLayer({
            id: pointLayerId,
            type: 'circle',
            source: sourceId,
            filter: ['==', '$type', 'Point'],
            paint: {
              'circle-radius': layer.options.pointRadius || 6,
              'circle-color': '#3388ff',
              'circle-stroke-color': '#3388ff',
              'circle-stroke-width': layer.options.strokeWidth || 1,
              'circle-opacity': layer.options.fillOpacity || 0.8
            },
            layout: {
              'visibility': layer.visibility ? 'visible' : 'none'
            }
          });
        }
      }

      // Add line layer if needed
      if (hasLines) {
        const lineLayerId = `${layerId}-lines`;
        if (!map.getLayer(lineLayerId)) {
          map.addLayer({
            id: lineLayerId,
            type: 'line',
            source: sourceId,
            filter: ['==', '$type', 'LineString'],
            paint: {
              'line-color': '#3388ff',
              'line-width': layer.options.strokeWidth || 2,
              'line-opacity': layer.options.strokeOpacity || 1
            },
            layout: {
              'visibility': layer.visibility ? 'visible' : 'none'
            }
          });
        }
      }

      // Add polygon layer if needed
      if (hasPolygons) {
        const fillLayerId = `${layerId}-fills`;
        const strokeLayerId = `${layerId}-strokes`;
        
        if (!map.getLayer(fillLayerId)) {
          map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
            filter: ['==', '$type', 'Polygon'],
            paint: {
              'fill-color': '#3388ff',
              'fill-opacity': layer.options.fillOpacity || 0.3
            },
            layout: {
              'visibility': layer.visibility ? 'visible' : 'none'
            }
          });
        }
        
        if (!map.getLayer(strokeLayerId)) {
          map.addLayer({
            id: strokeLayerId,
            type: 'line',
            source: sourceId,
            filter: ['==', '$type', 'Polygon'],
            paint: {
              'line-color': '#3388ff',
              'line-width': layer.options.strokeWidth || 2,
              'line-opacity': layer.options.strokeOpacity || 1
            },
            layout: {
              'visibility': layer.visibility ? 'visible' : 'none'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error adding layer to map (fallback):', error);
    }
  };

  const removeMapLayer = (layerId: string) => {
    const layerManager = layerManagerRef.current;
    if (!layerManager) return;

    try {
      layerManager.removeSource(layerId);
    } catch (error) {
      console.error('Error removing layer from map:', error);
    }
  };

  const updateLayerVisibility = (layerId: string, visible: boolean) => {
    const layerManager = layerManagerRef.current;
    if (!layerManager) return;

    try {
      layerManager.updateLayerVisibility(layerId, visible);
    } catch (error) {
      console.error('Error updating layer visibility:', error);
    }
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      // Check if the paste target is a text input or textarea that should handle its own paste
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        // Allow native paste behavior for form inputs
        return;
      }

      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      const text = clipboardData.getData('text/plain');
      if (!text.trim()) return;

      event.preventDefault();

      // Determine the layer type and parse data
      const { layerType, layerOptions, parseResult } = detectAndParseLayer(text);
      
      if (parseResult.success && parseResult.data) {
        const layerName = 'Pasted Layer';
        const featureCollection = convertToFeatureCollection(parseResult.data);
        actions.addLayer(featureCollection, layerType, layerOptions, layerName, text);
        showSuccess('Layer Added Successfully', 'Pasted data has been added to the map');
      } else {
        console.error('Failed to parse pasted data:', parseResult.error);
        showError('Failed to Parse Data', parseResult.error || 'Unknown error occurred while parsing the pasted data');
      }
    };


    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [actions]);

  // Effect to initialize layer manager when map is loaded
  useEffect(() => {
    const checkAndInitMap = () => {
      const map = mapRef.current?.getMap();
      if (!map) {
        return false;
      }

      const handleMapLoad = () => {
        layerManagerRef.current = new MapLayerManager(map);
        setIsMapReady(true);
      };

      if (map.loaded()) {
        handleMapLoad();
        return true;
      } else {
        map.on('load', handleMapLoad);
        return true;
      }
    };

    // Try immediately
    if (checkAndInitMap()) {
      return () => {
        const map = mapRef.current?.getMap();
        if (map) {
          layerManagerRef.current?.cleanup();
        }
        setIsMapReady(false);
      };
    }

    // If map not ready, keep checking
    const interval = setInterval(() => {
      if (checkAndInitMap()) {
        clearInterval(interval);
      }
    }, 100);

    // Also try with a longer delay as final fallback
    const timeout = setTimeout(() => {
      clearInterval(interval);
      const map = mapRef.current?.getMap();
      if (map && !layerManagerRef.current) {
        if (map.loaded()) {
          layerManagerRef.current = new MapLayerManager(map);
          setIsMapReady(true);
        } else {
          map.on('load', () => {
            layerManagerRef.current = new MapLayerManager(map);
            setIsMapReady(true);
          });
        }
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      layerManagerRef.current?.cleanup();
      setIsMapReady(false);
    };
  }, []);

  // Effect to sync layers with map
  useEffect(() => {
    const layerManager = layerManagerRef.current;
    const map = mapRef.current?.getMap();
    
    console.log('Layer sync effect triggered:', {
      layersCount: state.layers.length,
      isMapReady,
      hasLayerManager: !!layerManager,
      hasMap: !!map
    });
    
    if (!layerManager && !map) {
      console.log('No layer manager or map available, skipping sync');
      return;
    }

    if (!layerManager && map) {
      // Fallback: sync using direct map operations
      console.log('Using fallback direct map operations for', state.layers.length, 'layers');
      state.layers.forEach(layer => {
        const sourceId = `layer-source-${layer.id}`;
        if (!map.getSource(sourceId)) {
          console.log('Adding layer via fallback:', layer.id);
          addMapLayer(layer);
        }
      });
      return;
    }

    // Add new layers
    console.log('Using layer manager to sync', state.layers.length, 'layers');
    state.layers.forEach(layer => {
      if (!layerManager!.hasSource(layer.id)) {
        console.log('Adding layer via layer manager:', layer.id);
        addMapLayer(layer);
      }
    });

    // Remove layers that no longer exist
    const currentSources = layerManager!.getSources();
    currentSources.forEach(sourceId => {
      if (!state.layers.find(layer => layer.id === sourceId)) {
        removeMapLayer(sourceId);
      }
    });
  }, [state.layers, isMapReady]);

  // Effect to sync layer visibility
  useEffect(() => {
    if (!layerManagerRef.current) return;
    
    state.layers.forEach(layer => {
      updateLayerVisibility(layer.id, layer.visibility);
    });
  }, [state.layers.map(layer => `${layer.id}-${layer.visibility}`).join(','), isMapReady]);

  // Effect to sync layer colors and styles
  useEffect(() => {
    const layerManager = layerManagerRef.current;
    if (!layerManager) return;

    state.layers.forEach(layer => {
      if (layerManager.hasSource(layer.id)) {
        layerManager.updateLayerStyle(layer.id, layer);
      }
    });
  }, [state.layers.map(layer => `${layer.id}-${layer.color}-${JSON.stringify(layer.options)}`).join(','), isMapReady]);

  // Effect to update layer data when it changes
  useEffect(() => {
    const layerManager = layerManagerRef.current;
    if (!layerManager) return;

    state.layers.forEach(layer => {
      if (layerManager.hasSource(layer.id)) {
        layerManager.updateSource(layer.id, layer.data);
      }
    });
  }, [state.layers.map(layer => `${layer.id}-${JSON.stringify(layer.data)}`).join(','), isMapReady]);

  // Effect to fit map to layers when layers are added
  useEffect(() => {
    // Only fit if we have layers and map is ready
    if (state.layers.length > 0) {
      const timer = setTimeout(() => {
        fitMapToLayers();
      }, 100); // Small delay to ensure layers are rendered
      
      return () => clearTimeout(timer);
    }
  }, [state.layers.length]); // Only trigger when layer count changes

  return (
    <div ref={containerRef} className="map-container">
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >
        <NavigationControl position="top-right" style={{ zIndex: 1000 }} />
        <ScaleControl position="bottom-left" />
      </Map>
    </div>
  );
});

MapComponent.displayName = 'MapComponent';

export default MapComponent;