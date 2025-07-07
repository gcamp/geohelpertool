import { LayerType, ColorPalette } from '../types/layer';
import type { Layer } from '../types/layer';

/**
 * Generates a unique layer ID
 * Uses timestamp + random number for uniqueness
 */
export const generateLayerId = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `layer_${timestamp}_${random}`;
};

/**
 * Validates that a layer ID is unique within the existing layers
 */
export const validateLayerId = (id: string, existingLayers: Layer[]): boolean => {
  return !existingLayers.some(layer => layer.id === id);
};

/**
 * Generates a unique layer ID that doesn't conflict with existing layers
 */
export const generateUniqueLayerId = (existingLayers: Layer[]): string => {
  let id = generateLayerId();
  let attempts = 0;
  const maxAttempts = 100;
  
  while (!validateLayerId(id, existingLayers) && attempts < maxAttempts) {
    id = generateLayerId();
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Unable to generate unique layer ID after maximum attempts');
  }
  
  return id;
};

/**
 * Gets the next available color from the color palette
 */
export const getNextColor = (existingLayers: Layer[]): ColorPalette => {
  const colors = Object.values(ColorPalette);
  const usedColors = existingLayers.map(layer => layer.color);
  
  // Find first unused color
  for (const color of colors) {
    if (!usedColors.includes(color)) {
      return color;
    }
  }
  
  // If all colors are used, cycle through them
  return colors[existingLayers.length % colors.length];
};

/**
 * Detects layer type from file extension or content
 */
export const detectLayerType = (filename?: string, content?: string): LayerType => {
  if (filename) {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'geojson':
      case 'json':
        return LayerType.GEOJSON;
      case 'kml':
        return LayerType.KML;
      case 'gpx':
        return LayerType.GPX;
      case 'shp':
        return LayerType.SHAPEFILE;
      case 'csv':
        return LayerType.CSV;
      default:
        return LayerType.GEOJSON;
    }
  }
  
  if (content) {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return LayerType.GEOJSON;
    }
    if (trimmed.startsWith('<?xml') || trimmed.includes('<kml')) {
      return LayerType.KML;
    }
    if (trimmed.startsWith('<?xml') || trimmed.includes('<gpx')) {
      return LayerType.GPX;
    }
  }
  
  return LayerType.GEOJSON;
};

/**
 * Generates a default layer name based on type and index
 */
export const generateLayerName = (type: LayerType, index: number): string => {
  const typeNames = {
    [LayerType.GEOJSON]: 'GeoJSON',
    [LayerType.KML]: 'KML',
    [LayerType.GPX]: 'GPX',
    [LayerType.SHAPEFILE]: 'Shapefile',
    [LayerType.CSV]: 'CSV'
  };
  
  return `${typeNames[type]} Layer ${index + 1}`;
};