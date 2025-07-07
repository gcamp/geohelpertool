import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import type { Layer } from '../types/layer';
import { getMapLayerColor } from './colorPalette';

export interface MapSourceConfig {
  id: string;
  type: 'geojson';
  data: GeoJSON.FeatureCollection;
}

export interface MapLayerConfig {
  id: string;
  sourceId: string;
  type: 'circle' | 'line' | 'fill';
  geometryType: 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon';
  paint: Record<string, any>;
  layout: Record<string, any>;
  filter?: ['==', '$type', string];
}

export interface LayerGroup {
  sourceId: string;
  layerIds: string[];
  geometryTypes: string[];
}

export class MapLayerManager {
  private map: MapLibreMap;
  private layerGroups: Map<string, LayerGroup> = new Map();

  constructor(map: MapLibreMap) {
    this.map = map;
  }

  /**
   * Add a new source and its associated layers to the map
   */
  addSource(layerId: string, data: GeoJSON.FeatureCollection): void {
    const sourceId = `layer-source-${layerId}`;
    
    if (this.map.getSource(sourceId)) {
      throw new Error(`Source ${sourceId} already exists`);
    }

    this.map.addSource(sourceId, {
      type: 'geojson',
      data
    });

    this.layerGroups.set(layerId, {
      sourceId,
      layerIds: [],
      geometryTypes: []
    });
  }

  /**
   * Remove a source and all its associated layers from the map
   */
  removeSource(layerId: string): void {
    const layerGroup = this.layerGroups.get(layerId);
    if (!layerGroup) return;

    // Remove all layers first
    layerGroup.layerIds.forEach(id => {
      if (this.map.getLayer(id)) {
        this.map.removeLayer(id);
      }
    });

    // Remove source
    if (this.map.getSource(layerGroup.sourceId)) {
      this.map.removeSource(layerGroup.sourceId);
    }

    this.layerGroups.delete(layerId);
  }

  /**
   * Update source data
   */
  updateSource(layerId: string, data: GeoJSON.FeatureCollection): void {
    const layerGroup = this.layerGroups.get(layerId);
    if (!layerGroup) {
      throw new Error(`Layer group ${layerId} not found`);
    }

    const source = this.map.getSource(layerGroup.sourceId) as GeoJSONSource;
    if (!source || source.type !== 'geojson') {
      throw new Error(`GeoJSON source ${layerGroup.sourceId} not found`);
    }

    source.setData(data);
  }

  /**
   * Add map layers based on geometry types present in the data
   */
  addLayers(layerId: string, layer: Layer): void {
    const layerGroup = this.layerGroups.get(layerId);
    if (!layerGroup) {
      throw new Error(`Layer group ${layerId} not found`);
    }

    const geometryTypes = this.getGeometryTypes(layer.data);
    const useGeoJsonStyles = this.hasGeoJsonStyles(layer.data);

    geometryTypes.forEach(geometryType => {
      if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
        // Handle polygon/multipolygon fill layer
        const fillConfig = this.createLayerConfig(
          layerId,
          layerGroup.sourceId,
          geometryType,
          layer,
          useGeoJsonStyles
        );

        if (!this.map.getLayer(fillConfig.id)) {
          this.map.addLayer({
            id: fillConfig.id,
            type: 'fill',
            source: layerGroup.sourceId,
            filter: fillConfig.filter,
            paint: fillConfig.paint,
            layout: fillConfig.layout
          });
          layerGroup.layerIds.push(fillConfig.id);
        }

        // Handle polygon/multipolygon stroke layer
        const strokeConfig = this.createPolygonStrokeConfig(
          layerId,
          layerGroup.sourceId,
          layer,
          useGeoJsonStyles,
          geometryType
        );

        if (!this.map.getLayer(strokeConfig.id)) {
          this.map.addLayer({
            id: strokeConfig.id,
            type: 'line',
            source: layerGroup.sourceId,
            filter: strokeConfig.filter,
            paint: strokeConfig.paint,
            layout: strokeConfig.layout
          });
          layerGroup.layerIds.push(strokeConfig.id);
        }
      } else {
        // Handle point and line layers
        const mapLayerConfig = this.createLayerConfig(
          layerId,
          layerGroup.sourceId,
          geometryType,
          layer,
          useGeoJsonStyles
        );

        if (!this.map.getLayer(mapLayerConfig.id)) {
          if (mapLayerConfig.type === 'circle') {
            this.map.addLayer({
              id: mapLayerConfig.id,
              type: 'circle',
              source: layerGroup.sourceId,
              filter: mapLayerConfig.filter,
              paint: mapLayerConfig.paint,
              layout: mapLayerConfig.layout
            });
          } else if (mapLayerConfig.type === 'line') {
            this.map.addLayer({
              id: mapLayerConfig.id,
              type: 'line',
              source: layerGroup.sourceId,
              filter: mapLayerConfig.filter,
              paint: mapLayerConfig.paint,
              layout: mapLayerConfig.layout
            });
          }
          layerGroup.layerIds.push(mapLayerConfig.id);
        }
      }
    });

    layerGroup.geometryTypes = geometryTypes;
  }

  /**
   * Remove layers for a specific layer group
   */
  removeLayers(layerId: string): void {
    const layerGroup = this.layerGroups.get(layerId);
    if (!layerGroup) return;

    layerGroup.layerIds.forEach(id => {
      if (this.map.getLayer(id)) {
        this.map.removeLayer(id);
      }
    });

    layerGroup.layerIds = [];
    layerGroup.geometryTypes = [];
  }

  /**
   * Update layer visibility
   */
  updateLayerVisibility(layerId: string, visible: boolean): void {
    const layerGroup = this.layerGroups.get(layerId);
    if (!layerGroup) return;

    const visibility = visible ? 'visible' : 'none';
    layerGroup.layerIds.forEach(id => {
      if (this.map.getLayer(id)) {
        this.map.setLayoutProperty(id, 'visibility', visibility);
      }
    });
  }

  /**
   * Update layer styling by recreating layers
   */
  updateLayerStyle(layerId: string, layer: Layer): void {
    // Remove existing layers
    this.removeLayers(layerId);
    
    // Add layers with new styling
    this.addLayers(layerId, layer);
  }

  /**
   * Move layer to a different z-index position
   */
  moveLayer(layerId: string, beforeLayerId?: string): void {
    const layerGroup = this.layerGroups.get(layerId);
    if (!layerGroup) return;

    layerGroup.layerIds.forEach(id => {
      if (this.map.getLayer(id)) {
        this.map.moveLayer(id, beforeLayerId);
      }
    });
  }

  /**
   * Get all sources currently managed
   */
  getSources(): string[] {
    return Array.from(this.layerGroups.keys());
  }

  /**
   * Get layer group information
   */
  getLayerGroup(layerId: string): LayerGroup | undefined {
    return this.layerGroups.get(layerId);
  }

  /**
   * Check if a source exists
   */
  hasSource(layerId: string): boolean {
    return this.layerGroups.has(layerId);
  }

  /**
   * Cleanup all managed sources and layers
   */
  cleanup(): void {
    Array.from(this.layerGroups.keys()).forEach(layerId => {
      this.removeSource(layerId);
    });
  }

  private getGeometryTypes(data: GeoJSON.FeatureCollection): string[] {
    const types = new Set<string>();
    
    data.features.forEach(feature => {
      if (feature.geometry) {
        types.add(feature.geometry.type);
      }
    });

    return Array.from(types);
  }

  private hasGeoJsonStyles(data: GeoJSON.FeatureCollection): boolean {
    return data.features.some(feature => 
      feature.properties && (
        feature.properties.fill ||
        feature.properties.stroke ||
        feature.properties['fill-color'] ||
        feature.properties['stroke-color']
      )
    );
  }

  private createLayerConfig(
    layerId: string,
    sourceId: string,
    geometryType: string,
    layer: Layer,
    useGeoJsonStyles: boolean
  ): MapLayerConfig {
    const baseId = `layer-${layerId}`;
    
    switch (geometryType) {
      case 'Point':
        return {
          id: `${baseId}-points`,
          sourceId,
          type: 'circle',
          geometryType: 'Point',
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-radius': layer.options.pointRadius || 6,
            'circle-color': useGeoJsonStyles 
              ? ['case', ['has', 'fill'], ['get', 'fill'], ['has', 'fill-color'], ['get', 'fill-color'], getMapLayerColor(layer.color)]
              : getMapLayerColor(layer.color),
            'circle-stroke-color': useGeoJsonStyles
              ? ['case', ['has', 'stroke'], ['get', 'stroke'], ['has', 'stroke-color'], ['get', 'stroke-color'], getMapLayerColor(layer.color)]
              : getMapLayerColor(layer.color),
            'circle-stroke-width': layer.options.strokeWidth || 1,
            'circle-opacity': layer.options.fillOpacity || 0.8
          },
          layout: {
            'visibility': layer.visibility ? 'visible' : 'none'
          }
        };

      case 'LineString':
        return {
          id: `${baseId}-lines`,
          sourceId,
          type: 'line',
          geometryType: 'LineString',
          filter: ['==', '$type', 'LineString'],
          paint: {
            'line-color': useGeoJsonStyles
              ? ['case', ['has', 'stroke'], ['get', 'stroke'], ['has', 'stroke-color'], ['get', 'stroke-color'], getMapLayerColor(layer.color)]
              : getMapLayerColor(layer.color),
            'line-width': layer.options.strokeWidth || 2,
            'line-opacity': layer.options.strokeOpacity || 1
          },
          layout: {
            'visibility': layer.visibility ? 'visible' : 'none'
          }
        };

      case 'Polygon':
      case 'MultiPolygon':
        // For polygons and multipolygons, we need both fill and stroke layers
        // This returns the fill layer config; stroke is handled separately
        // Note: MapLibre treats MultiPolygon as Polygon in $type filters
        return {
          id: `${baseId}-fills`,
          sourceId,
          type: 'fill',
          geometryType: geometryType as 'Polygon',
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'fill-color': useGeoJsonStyles
              ? ['case', ['has', 'fill'], ['get', 'fill'], ['has', 'fill-color'], ['get', 'fill-color'], getMapLayerColor(layer.color, 0.3)]
              : getMapLayerColor(layer.color, 0.3),
            'fill-opacity': layer.options.fillOpacity || 0.3
          },
          layout: {
            'visibility': layer.visibility ? 'visible' : 'none'
          }
        };

      default:
        throw new Error(`Unsupported geometry type: ${geometryType}`);
    }
  }

  private createPolygonStrokeConfig(
    layerId: string,
    sourceId: string,
    layer: Layer,
    useGeoJsonStyles: boolean,
    geometryType: string = 'Polygon'
  ): MapLayerConfig {
    const baseId = `layer-${layerId}`;
    
    return {
      id: `${baseId}-strokes`,
      sourceId,
      type: 'line',
      geometryType: geometryType as 'Polygon',
      filter: ['==', '$type', 'Polygon'], // MapLibre treats MultiPolygon as Polygon in $type filters
      paint: {
        'line-color': useGeoJsonStyles
          ? ['case', ['has', 'stroke'], ['get', 'stroke'], ['has', 'stroke-color'], ['get', 'stroke-color'], getMapLayerColor(layer.color)]
          : getMapLayerColor(layer.color),
        'line-width': layer.options.strokeWidth || 2,
        'line-opacity': layer.options.strokeOpacity || 1
      },
      layout: {
        'visibility': layer.visibility ? 'visible' : 'none'
      }
    };
  }
}