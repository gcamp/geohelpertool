import React, { createContext } from 'react';
import type { ReactNode } from 'react';
import { useLayerState } from '../hooks/useLayerState';
import type { UseLayerStateReturn } from '../hooks/useLayerState';

/**
 * Layer context type
 */
type LayerContextType = UseLayerStateReturn;

/**
 * Layer context
 */
export const LayerContext = createContext<LayerContextType | undefined>(undefined);

/**
 * Layer provider props
 */
interface LayerProviderProps {
  children: ReactNode;
}

/**
 * Layer provider component
 */
export const LayerProvider: React.FC<LayerProviderProps> = ({ children }) => {
  const layerState = useLayerState();

  return (
    <LayerContext.Provider value={layerState}>
      {children}
    </LayerContext.Provider>
  );
};