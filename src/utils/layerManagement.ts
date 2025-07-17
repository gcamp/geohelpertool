import { LayerType, ColorPalette } from '../types/layer';
import type { Layer, LayerState, LayerAction, LayerOptions } from '../types/layer';
import { generateUniqueLayerId, getNextColor, generateLayerName } from './layerUtils';
// @ts-expect-error - Used in type annotations
import type { GeoJSON } from 'geojson';

/**
 * Layer state reducer for managing layer state
 */
export const layerReducer = (state: LayerState, action: LayerAction): LayerState => {
  switch (action.type) {
    case 'ADD_LAYER': {
      const newLayer: Layer = {
        id: generateUniqueLayerId(state.layers),
        ...action.payload,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return {
        ...state,
        layers: [...state.layers, newLayer],
        layerCount: state.layerCount + 1
      };
    }
    
    case 'REMOVE_LAYER': {
      const filteredLayers = state.layers.filter(layer => layer.id !== action.payload.id);
      return {
        ...state,
        layers: filteredLayers,
        activeLayerId: state.activeLayerId === action.payload.id ? null : state.activeLayerId
      };
    }
    
    case 'UPDATE_LAYER': {
      return {
        ...state,
        layers: state.layers.map(layer =>
          layer.id === action.payload.id
            ? { ...layer, ...action.payload.updates, updatedAt: new Date() }
            : layer
        )
      };
    }
    
    case 'TOGGLE_VISIBILITY': {
      return {
        ...state,
        layers: state.layers.map(layer =>
          layer.id === action.payload.id
            ? { ...layer, visibility: !layer.visibility, updatedAt: new Date() }
            : layer
        )
      };
    }
    
    case 'UPDATE_COLOR': {
      return {
        ...state,
        layers: state.layers.map(layer =>
          layer.id === action.payload.id
            ? { ...layer, color: action.payload.color, updatedAt: new Date() }
            : layer
        )
      };
    }
    
    case 'UPDATE_OPTIONS': {
      return {
        ...state,
        layers: state.layers.map(layer =>
          layer.id === action.payload.id
            ? { 
                ...layer, 
                options: { ...layer.options, ...action.payload.options },
                updatedAt: new Date()
              }
            : layer
        )
      };
    }
    
    case 'SET_ACTIVE_LAYER': {
      return {
        ...state,
        activeLayerId: action.payload.id
      };
    }
    
    case 'CLEAR_LAYERS': {
      return {
        layers: [],
        activeLayerId: null,
        layerCount: 0
      };
    }
    
    default:
      return state;
  }
};

/**
 * Initial layer state
 */
export const initialLayerState: LayerState = {
  layers: [],
  activeLayerId: null,
  layerCount: 0
};

/**
 * Layer management functions
 */
export const layerManagement = {
  /**
   * Add a new layer
   */
  addLayer: (
    data: GeoJSON.FeatureCollection,
    type: LayerType,
    options: LayerOptions = {},
    name?: string,
    existingLayers: Layer[] = [],
    originalContent?: string
  ): Omit<Layer, 'id' | 'createdAt' | 'updatedAt'> => {
    const color = getNextColor(existingLayers);
    const layerName = name || generateLayerName(type, existingLayers.length);
    
    return {
      data,
      originalContent,
      color,
      visibility: true,
      type,
      options: {
        strokeWidth: 2,
        strokeOpacity: 1,
        fillOpacity: 0.3,
        pointRadius: 5,
        showLabels: false,
        ...options
      },
      name: layerName
    };
  },

  /**
   * Validate layer ID exists
   */
  validateLayerId: (id: string, layers: Layer[]): boolean => {
    return layers.some(layer => layer.id === id);
  },

  /**
   * Get layer by ID
   */
  getLayerById: (id: string, layers: Layer[]): Layer | undefined => {
    return layers.find(layer => layer.id === id);
  },

  /**
   * Get visible layers
   */
  getVisibleLayers: (layers: Layer[]): Layer[] => {
    return layers.filter(layer => layer.visibility);
  },

  /**
   * Get layers by type
   */
  getLayersByType: (type: LayerType, layers: Layer[]): Layer[] => {
    return layers.filter(layer => layer.type === type);
  },

  /**
   * Update layer name
   */
  updateLayerName: (id: string, name: string): { id: string; updates: Partial<Layer> } => {
    return {
      id,
      updates: { name }
    };
  },

  /**
   * Validate color value
   */
  validateColor: (color: string): boolean => {
    return Object.values(ColorPalette).includes(color as ColorPalette);
  },

  /**
   * Get available colors (unused colors)
   */
  getAvailableColors: (layers: Layer[]): ColorPalette[] => {
    const usedColors = layers.map(layer => layer.color);
    return Object.values(ColorPalette).filter(color => !usedColors.includes(color));
  },

  /**
   * Export layers to JSON
   */
  exportLayers: (layers: Layer[]): string => {
    return JSON.stringify(layers, null, 2);
  },

  /**
   * Import layers from JSON
   */
  importLayers: (jsonString: string): Layer[] => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid layer data format');
      }
      
      return parsed.map(layer => ({
        ...layer,
        createdAt: new Date(layer.createdAt),
        updatedAt: new Date(layer.updatedAt)
      }));
    } catch (error) {
      throw new Error(`Failed to import layers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};