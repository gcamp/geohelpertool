import { useContext } from 'react';
import type { UseLayerStateReturn } from './useLayerState';
import { LayerContext } from '../contexts/LayerContext';

/**
 * Hook to use layer context
 */
export const useLayerContext = (): UseLayerStateReturn => {
  const context = useContext(LayerContext);
  
  if (context === undefined) {
    throw new Error('useLayerContext must be used within a LayerProvider');
  }
  
  return context;
};