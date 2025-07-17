import type { LayerState, ColorPalette, LayerType } from '../types/layer';

const STORAGE_KEY = 'geohelper-layers';

export interface StoredLayer {
  id: string;
  data: GeoJSON.FeatureCollection;
  originalContent?: string;
  color: string;
  visibility: boolean;
  type: string;
  options: Record<string, unknown>;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredLayerState {
  layers: StoredLayer[];
  activeLayerId: string | null;
  layerCount: number;
  version: number;
}

export const saveLayersToStorage = (layerState: LayerState): void => {
  try {
    const storedState: StoredLayerState = {
      layers: layerState.layers.map(layer => ({
        id: layer.id,
        data: layer.data,
        originalContent: layer.originalContent,
        color: layer.color,
        visibility: layer.visibility,
        type: layer.type,
        options: layer.options,
        name: layer.name,
        createdAt: layer.createdAt.toISOString(),
        updatedAt: layer.updatedAt.toISOString()
      })),
      activeLayerId: layerState.activeLayerId,
      layerCount: layerState.layerCount,
      version: 1
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedState));
  } catch (error) {
    console.error('Failed to save layers to localStorage:', error);
  }
};

export const loadLayersFromStorage = (): LayerState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    
    const storedState: StoredLayerState = JSON.parse(stored);
    
    if (!storedState.version || storedState.version < 1) {
      return null;
    }
    
    const loadedState = {
      layers: storedState.layers.map(layer => ({
        id: layer.id,
        data: layer.data,
        originalContent: layer.originalContent,
        color: layer.color as ColorPalette,
        visibility: layer.visibility,
        type: layer.type as LayerType,
        options: layer.options,
        name: layer.name,
        createdAt: new Date(layer.createdAt),
        updatedAt: new Date(layer.updatedAt)
      })),
      activeLayerId: storedState.activeLayerId,
      layerCount: storedState.layerCount
    };
    
    return loadedState;
  } catch (error) {
    console.error('Failed to load layers from localStorage:', error);
    return null;
  }
};

export const clearLayersFromStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear layers from localStorage:', error);
  }
};