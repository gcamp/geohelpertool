import React, { useRef, useState, useEffect } from 'react';
import './Sidebar.css';
import { useLayerContext } from '../hooks/useLayerContextHook';
import { parseMultiFormat, detectDataType } from '../utils/geoJsonParser';
import { LayerType } from '../types/layer';
import { useNotification } from './NotificationContainer';
// @ts-ignore - Used in type annotations
import type { GeoJSON } from 'geojson';

interface SidebarProps {
  isVisible?: boolean;
  onFitToLayers?: () => void;
  onWidthChange?: (width: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isVisible = true, onFitToLayers, onWidthChange }) => {
  const { state, actions } = useLayerContext();
  const { showSuccess, showError } = useNotification();
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [layerContent, setLayerContent] = useState<Record<string, string>>({});
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

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

  // Listen for custom events to store original layer content
  useEffect(() => {
    const handleStoreLayerContent = (event: CustomEvent) => {
      const { content } = event.detail;
      // Find the most recently added layer
      if (state.layers.length > 0) {
        const mostRecentLayer = state.layers[state.layers.length - 1];
        setLayerContent(prev => ({ ...prev, [mostRecentLayer.id]: content }));
      }
    };

    window.addEventListener('storeLayerContent', handleStoreLayerContent as EventListener);
    
    return () => {
      window.removeEventListener('storeLayerContent', handleStoreLayerContent as EventListener);
    };
  }, [state.layers]);

  // Resize functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 250;
      const maxWidth = window.innerWidth * 0.6;
      
      const finalWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setSidebarWidth(finalWidth);
      onWidthChange?.(finalWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Store layer content when layers are added (fallback for when original content isn't available)
  useEffect(() => {
    // Find the most recently added layer and store its content if needed
    if (state.layers.length > 0) {
      const recentLayer = state.layers[state.layers.length - 1];
      if (!layerContent[recentLayer.id]) {
        // Initialize with empty content or try to serialize the GeoJSON
        const content = recentLayer.data.features.length > 0 
          ? JSON.stringify(recentLayer.data, null, 2) 
          : '';
        setLayerContent(prev => ({ ...prev, [recentLayer.id]: content }));
      }
    }
  }, [state.layers.length, layerContent]);

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    if (!dropZoneRef.current?.contains(event.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    const textData = event.dataTransfer.getData('text/plain');

    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
            const layerName = `${file.name} ${new Date().toLocaleTimeString()}`;
            
            // Determine the layer type based on detected data type first
            const detectedType = detectDataType(content);
            let layerType = LayerType.GEOJSON;
            let layerOptions = {};
            
            if (detectedType === 'latlng') layerType = LayerType.COORDINATES;
            else if (detectedType === 'wkt') layerType = LayerType.WKT;
            else if (detectedType === 'polyline') {
              layerType = LayerType.POLYLINE;
              // Auto-detect if forward slash unescaping should be enabled
              layerOptions = { unescapeForwardSlashes: content.indexOf('//') !== -1 };
            }
            
            // Parse with the appropriate options
            const parseOptions = detectedType === 'polyline' ? { unescapeForwardSlashes: layerOptions.unescapeForwardSlashes } : undefined;
            const parseResult = parseMultiFormat(content, parseOptions);
            
            if (parseResult.success && parseResult.data) {
              const featureCollection = convertToFeatureCollection(parseResult.data);
              actions.addLayer(featureCollection, layerType, layerOptions, layerName);
              showSuccess('Layer Added Successfully', `File "${file.name}" has been added to the map`);
            } else {
              // Add layer anyway, but as empty/invisible
              const emptyFeatureCollection: GeoJSON.FeatureCollection = {
                type: 'FeatureCollection',
                features: []
              };
              actions.addLayer(emptyFeatureCollection, LayerType.GEOJSON, {}, layerName);
              showError('Layer Added with Errors', `File "${file.name}" was added but contains errors: ${parseResult.error}`);
            }
            
            // Store the original content for editing
            setTimeout(() => {
              const mostRecentLayer = state.layers[state.layers.length - 1];
              if (mostRecentLayer) {
                setLayerContent(prev => ({ ...prev, [mostRecentLayer.id]: content }));
              }
            }, 100);
          }
        };
        reader.readAsText(file);
      });
    } else if (textData) {
      const layerName = `Dropped Layer ${new Date().toLocaleTimeString()}`;
      
      // Determine the layer type based on detected data type first
      const detectedType = detectDataType(textData);
      let layerType = LayerType.GEOJSON;
      let layerOptions = {};
      
      if (detectedType === 'latlng') layerType = LayerType.COORDINATES;
      else if (detectedType === 'wkt') layerType = LayerType.WKT;
      else if (detectedType === 'polyline') {
        layerType = LayerType.POLYLINE;
        // Auto-detect if forward slash unescaping should be enabled
        layerOptions = { unescapeForwardSlashes: textData.indexOf('//') !== -1 };
      }
      
      // Parse with the appropriate options
      const parseOptions = detectedType === 'polyline' ? { unescapeForwardSlashes: layerOptions.unescapeForwardSlashes } : undefined;
      const parseResult = parseMultiFormat(textData, parseOptions);
      
      if (parseResult.success && parseResult.data) {
        const featureCollection = convertToFeatureCollection(parseResult.data);
        actions.addLayer(featureCollection, layerType, layerOptions, layerName);
        showSuccess('Layer Added Successfully', 'Dropped data has been added to the map');
      } else {
        // Add layer anyway, but as empty/invisible
        const emptyFeatureCollection: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: []
        };
        actions.addLayer(emptyFeatureCollection, LayerType.GEOJSON, {}, layerName);
        showError('Layer Added with Errors', `Dropped data was added but contains errors: ${parseResult.error}`);
      }
      
      // Store the original content for editing
      setTimeout(() => {
        const mostRecentLayer = state.layers[state.layers.length - 1];
        if (mostRecentLayer) {
          setLayerContent(prev => ({ ...prev, [mostRecentLayer.id]: textData }));
        }
      }, 100);
    }
  };

  return (
    <div 
      ref={sidebarRef}
      className={`sidebar ${isVisible ? 'sidebar-visible' : 'sidebar-hidden'}`}
      style={{ width: `${sidebarWidth}px` }}
    >
      <div 
        className="resize-handle"
        onMouseDown={handleMouseDown}
        style={{ cursor: isResizing ? 'ew-resize' : 'ew-resize' }}
      />
      <div className="sidebar-content">
        <div className="sidebar-header">
          <h2 className="sidebar-title">GeoHelper Tool</h2>
          <p className="sidebar-subtitle">Layer Management</p>
        </div>
        
        <div className="sidebar-section">
          <h3 className="section-title">Upload Files</h3>
          <div className="instruction-block">
            <div 
              ref={dropZoneRef}
              className={`instruction-item drop-zone ${isDragOver ? 'drag-over' : ''}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <span className="instruction-icon">📁</span>
              <div className="instruction-text">
                <strong>Drag & Drop</strong>
                <p>{isDragOver ? 'Drop files here!' : 'Drag files here'}</p>
              </div>
            </div>
            <div className="instruction-item">
              <span className="instruction-icon">📋</span>
              <div className="instruction-text">
                <strong>Paste Data</strong>
                <p>Paste Data anywhere to add stuff</p>
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="section-title">Supported Formats</h3>
          <div className="format-list">
            <span className="format-tag">GeoJSON</span>
            <span className="format-tag">KML</span>
            <span className="format-tag">GPX</span>
            <span className="format-tag">Shapefile</span>
            <span className="format-tag">CSV</span>
          </div>
        </div>


        <div className="sidebar-section">
          <div className="section-header">
            <h3 className="section-title">Layers</h3>
            {state.layers.length > 0 && onFitToLayers && (
              <button
                onClick={onFitToLayers}
                className="fit-layers-btn"
                title="Fit map to show all layers"
              >
                🎯
              </button>
            )}
          </div>
          <div className={`layers-container ${state.layers.length === 0 ? 'empty' : 'has-layers'}`}>
            {state.layers.length === 0 ? (
              <p className="empty-state">No layers added yet</p>
            ) : (
              <div className="layers-list">
                {state.layers.map((layer) => (
                  <div key={layer.id} className="layer-item">
                    <div className="layer-header">
                      <div className="layer-info">
                        <h4 className="layer-name">{layer.name}</h4>
                        <p className="layer-type">{layer.type}</p>
                      </div>
                      <div className="layer-actions">
                        <button
                          onClick={() => actions.toggleVisibility(layer.id)}
                          className={`visibility-btn ${layer.visibility ? 'visible' : 'hidden'}`}
                        >
                          {layer.visibility ? '👁️' : '🙈'}
                        </button>
                        <button
                          onClick={() => actions.removeLayer(layer.id)}
                          className="remove-btn"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div className="layer-content">
                      <textarea
                        value={layerContent[layer.id] || ''}
                        onChange={(e) => {
                          const newContent = e.target.value;
                          setLayerContent(prev => ({ ...prev, [layer.id]: newContent }));
                        }}
                        onBlur={(e) => {
                          const newContent = e.target.value;
                          
                          // Update layer when focus is lost
                          if (newContent.trim()) {
                            // Determine the layer type based on detected data type first
                            const detectedType = detectDataType(newContent);
                            let layerType = LayerType.GEOJSON;
                            let layerOptions = { ...layer.options };
                            
                            if (detectedType === 'latlng') layerType = LayerType.COORDINATES;
                            else if (detectedType === 'wkt') layerType = LayerType.WKT;
                            else if (detectedType === 'polyline') {
                              layerType = LayerType.POLYLINE;
                              // Auto-detect and update forward slash unescaping option
                              layerOptions.unescapeForwardSlashes = newContent.indexOf('//') !== -1;
                            }
                            
                            // Parse with the appropriate options
                            const parseOptions = detectedType === 'polyline' ? { unescapeForwardSlashes: layerOptions.unescapeForwardSlashes } : undefined;
                            const parseResult = parseMultiFormat(newContent, parseOptions);
                            
                            if (parseResult.success && parseResult.data) {
                              const featureCollection = convertToFeatureCollection(parseResult.data);
                              
                              actions.updateLayer(layer.id, { 
                                data: featureCollection,
                                type: layerType,
                                options: layerOptions
                              });
                            } else {
                              showError('Parse Error', parseResult.error || 'Failed to parse updated content');
                            }
                          }
                        }}
                        placeholder="Enter GeoJSON, WKT, or other supported format..."
                        className="layer-content-editor inline"
                        rows={4}
                      />
                    </div>
                    
                    {/* Layer Options */}
                    {layer.type === LayerType.COORDINATES && (
                      <div className="layer-options">
                        <h4 className="options-title">Options</h4>
                        <div className="option-item">
                          <label className="option-label">
                            <input
                              type="checkbox"
                              checked={layer.options.reverseCoordinates || false}
                              onChange={(e) => {
                                const newOptions = { ...layer.options, reverseCoordinates: e.target.checked };
                                actions.updateLayer(layer.id, { options: newOptions });
                                
                                // Re-parse the original content and apply coordinate reversal
                                const currentContent = layerContent[layer.id];
                                if (currentContent && currentContent.trim()) {
                                  // Parse the original content to get coordinates in their original format
                                  const numbers = currentContent.match(/-?\d+\.?\d*/g);
                                  if (numbers && numbers.length >= 2 && numbers.length % 2 === 0) {
                                    const coordinates: number[][] = [];
                                    
                                    // Process numbers in pairs, applying reversal based on checkbox state
                                    for (let i = 0; i < numbers.length; i += 2) {
                                      const first = parseFloat(numbers[i]);
                                      const second = parseFloat(numbers[i + 1]);
                                      
                                      if (e.target.checked) {
                                        // If reversing, treat first as lng, second as lat -> [lng, lat] for GeoJSON
                                        coordinates.push([first, second]);
                                      } else {
                                        // If not reversing, treat first as lat, second as lng -> [lng, lat] for GeoJSON
                                        coordinates.push([second, first]);
                                      }
                                    }
                                    
                                    // Create new FeatureCollection with updated coordinates
                                    const features = coordinates.map((coord, index) => ({
                                      type: 'Feature' as const,
                                      geometry: {
                                        type: 'Point' as const,
                                        coordinates: coord
                                      },
                                      properties: {
                                        index: index + 1
                                      }
                                    }));
                                    
                                    const featureCollection = {
                                      type: 'FeatureCollection' as const,
                                      features
                                    };
                                    
                                    actions.updateLayer(layer.id, { data: featureCollection });
                                    showSuccess('Coordinates Updated', 'Coordinate order has been ' + (e.target.checked ? 'reversed' : 'restored'));
                                    
                                    // Recenter map to fit all layers after coordinate change
                                    if (onFitToLayers) {
                                      setTimeout(() => {
                                        onFitToLayers();
                                      }, 100);
                                    }
                                  }
                                }
                              }}
                            />
                            <span className="option-text">Reverse Lat/Lng Order</span>
                          </label>
                        </div>
                      </div>
                    )}
                    
                    {/* Polyline Options */}
                    {layer.type === LayerType.POLYLINE && (
                      <div className="layer-options">
                        <h4 className="options-title">Options</h4>
                        <div className="option-item">
                          <label className="option-label">
                            <input
                              type="checkbox"
                              checked={layer.options.unescapeForwardSlashes || false}
                              onChange={(e) => {
                                const newOptions = { ...layer.options, unescapeForwardSlashes: e.target.checked };
                                actions.updateLayer(layer.id, { options: newOptions });
                                
                                // Re-parse the original content with updated unescape option
                                const currentContent = layerContent[layer.id];
                                if (currentContent && currentContent.trim()) {
                                  const parseResult = parseMultiFormat(currentContent, { 
                                    unescapeForwardSlashes: e.target.checked 
                                  });
                                  if (parseResult.success && parseResult.data) {
                                    const featureCollection = convertToFeatureCollection(parseResult.data);
                                    actions.updateLayer(layer.id, { data: featureCollection });
                                    showSuccess('Polyline Updated', 'Forward slash escaping has been ' + (e.target.checked ? 'removed' : 'preserved'));
                                    
                                    // Recenter map to fit all layers after polyline change
                                    if (onFitToLayers) {
                                      setTimeout(() => {
                                        onFitToLayers();
                                      }, 100);
                                    }
                                  } else {
                                    showError('Parse Error', parseResult.error || 'Failed to parse updated polyline');
                                  }
                                }
                              }}
                            />
                            <span className="option-text">Remove Forward Slash Escaping</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;