import { useReducer, useCallback, useMemo, useEffect, useState } from 'react';
import { LayerType, ColorPalette } from '../types/layer';
import type { Layer, LayerOptions, LayerState } from '../types/layer';
import { layerReducer, initialLayerState, layerManagement } from '../utils/layerManagement';
import { saveLayersToStorage, loadLayersFromStorage, clearLayersFromStorage } from '../utils/localStorage';
// @ts-ignore - Used in type annotations
import type { GeoJSON } from 'geojson';

/**
 * Custom hook for layer state management
 */
export const useLayerState = () => {
  // Initialize state by loading from localStorage first
  const getInitialState = (): LayerState => {
    const savedState = loadLayersFromStorage();
    return savedState || initialLayerState;
  };

  const [state, dispatch] = useReducer(layerReducer, getInitialState());
  const [isInitialized, setIsInitialized] = useState(false);

  // Mark as initialized after first render
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Save layers to localStorage whenever state changes (but not during initialization)
  useEffect(() => {
    if (isInitialized) {
      saveLayersToStorage(state);
    }
  }, [state, isInitialized]);

  /**
   * Action creators with useCallback for stable references
   */
  const addLayer = useCallback((
    data: GeoJSON.FeatureCollection,
    type: LayerType,
    options?: LayerOptions,
    name?: string,
    originalContent?: string
  ) => {
    const layerData = layerManagement.addLayer(data, type, options, name, state.layers, originalContent);
    dispatch({ type: 'ADD_LAYER', payload: layerData });
  }, [state.layers]);

  const removeLayer = useCallback((id: string) => {
    if (layerManagement.validateLayerId(id, state.layers)) {
      dispatch({ type: 'REMOVE_LAYER', payload: { id } });
    } else {
      console.warn(`Layer with id ${id} not found`);
    }
  }, [state.layers]);

  const updateLayer = useCallback((id: string, updates: Partial<Layer>) => {
    if (layerManagement.validateLayerId(id, state.layers)) {
      dispatch({ type: 'UPDATE_LAYER', payload: { id, updates } });
    } else {
      console.warn(`Layer with id ${id} not found`);
    }
  }, [state.layers]);

  const toggleVisibility = useCallback((id: string) => {
    if (layerManagement.validateLayerId(id, state.layers)) {
      dispatch({ type: 'TOGGLE_VISIBILITY', payload: { id } });
    } else {
      console.warn(`Layer with id ${id} not found`);
    }
  }, [state.layers]);

  const updateColor = useCallback((id: string, color: ColorPalette) => {
    if (layerManagement.validateLayerId(id, state.layers)) {
      if (layerManagement.validateColor(color)) {
        dispatch({ type: 'UPDATE_COLOR', payload: { id, color } });
      } else {
        console.warn(`Invalid color: ${color}`);
      }
    } else {
      console.warn(`Layer with id ${id} not found`);
    }
  }, [state.layers]);

  const updateOptions = useCallback((id: string, options: Partial<LayerOptions>) => {
    if (layerManagement.validateLayerId(id, state.layers)) {
      dispatch({ type: 'UPDATE_OPTIONS', payload: { id, options } });
    } else {
      console.warn(`Layer with id ${id} not found`);
    }
  }, [state.layers]);

  const setActiveLayer = useCallback((id: string | null) => {
    if (id === null || layerManagement.validateLayerId(id, state.layers)) {
      dispatch({ type: 'SET_ACTIVE_LAYER', payload: { id } });
    } else {
      console.warn(`Layer with id ${id} not found`);
    }
  }, [state.layers]);

  const clearLayers = useCallback(() => {
    dispatch({ type: 'CLEAR_LAYERS' });
    clearLayersFromStorage();
  }, []);

  const updateLayerName = useCallback((id: string, name: string) => {
    if (layerManagement.validateLayerId(id, state.layers)) {
      const updatePayload = layerManagement.updateLayerName(id, name);
      dispatch({ type: 'UPDATE_LAYER', payload: updatePayload });
    } else {
      console.warn(`Layer with id ${id} not found`);
    }
  }, [state.layers]);

  const actions = useMemo(() => ({
    addLayer,
    removeLayer,
    updateLayer,
    updateLayerName,
    toggleVisibility,
    updateColor,
    updateOptions,
    setActiveLayer,
    clearLayers
  }), [addLayer, removeLayer, updateLayer, updateLayerName, toggleVisibility, updateColor, updateOptions, setActiveLayer, clearLayers]);

  /**
   * Computed values
   */
  const computed = useMemo(() => ({
    visibleLayers: layerManagement.getVisibleLayers(state.layers),
    activeLayer: state.activeLayerId 
      ? layerManagement.getLayerById(state.activeLayerId, state.layers) 
      : null,
    availableColors: layerManagement.getAvailableColors(state.layers),
    hasLayers: state.layers.length > 0,
    layersByType: (type: LayerType) => layerManagement.getLayersByType(type, state.layers)
  }), [state.layers, state.activeLayerId]);

  /**
   * Utility functions
   */
  const utils = useMemo(() => ({
    exportLayers: () => layerManagement.exportLayers(state.layers),
    importLayers: (jsonString: string) => {
      try {
        const layers = layerManagement.importLayers(jsonString);
        dispatch({ type: 'CLEAR_LAYERS' });
        layers.forEach(layer => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...layerData } = layer;
          dispatch({ type: 'ADD_LAYER', payload: layerData });
        });
      } catch (error) {
        console.error('Failed to import layers:', error);
        throw error;
      }
    },
    getLayerById: (id: string) => layerManagement.getLayerById(id, state.layers),
    validateLayerId: (id: string) => layerManagement.validateLayerId(id, state.layers)
  }), [state.layers]);

  return {
    state,
    actions,
    computed,
    utils
  };
};

/**
 * Type for the hook return value
 */
export type UseLayerStateReturn = ReturnType<typeof useLayerState>;