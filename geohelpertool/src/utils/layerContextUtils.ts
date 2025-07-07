import React from 'react';
import type { UseLayerStateReturn } from '../hooks/useLayerState';

/**
 * Hook to use layer context - moved here for fast refresh compatibility
 */
export const useLayerContext = (context: UseLayerStateReturn | undefined): UseLayerStateReturn => {
  if (context === undefined) {
    throw new Error('useLayerContext must be used within a LayerProvider');
  }
  
  return context;
};

/**
 * HOC for components that need layer context
 */
export const withLayerContext = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  const WrappedComponent: React.FC<P> = (props) => {
    // This will be handled by the component that uses it
    return React.createElement(Component, props);
  };
  
  WrappedComponent.displayName = `withLayerContext(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};