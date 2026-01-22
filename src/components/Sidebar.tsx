import React, { useRef, useState, useEffect } from 'react';
import './Sidebar.css';
import { useLayerContext } from '../hooks/useLayerContextHook';
import { parseMultiFormat } from '../utils/geoJsonParser';
import { detectAndParseLayer } from '../utils/layerTypeDetector';
import { LayerType, ColorPalette } from '../types/layer';
import type { Layer } from '../types/layer';
import { useNotification } from '../contexts/NotificationContext';
// @ts-expect-error - Used in type annotations
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
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [colorDropdownOpen, setColorDropdownOpen] = useState<string | null>(null);

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

  const hasLineStringGeometry = (layer: Layer): boolean => {
    return layer.data.features.some(
      feature => feature.geometry?.type === 'LineString' || feature.geometry?.type === 'MultiLineString'
    );
  };


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
  }, [isResizing, onWidthChange]);


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
            
            // Determine the layer type and parse data
            const { layerType, layerOptions, parseResult } = detectAndParseLayer(content);
            
            if (parseResult.success && parseResult.data) {
              const featureCollection = convertToFeatureCollection(parseResult.data);
              actions.addLayer(featureCollection, layerType, layerOptions, layerName, content);
              showSuccess('Layer Added Successfully', `File "${file.name}" has been added to the map`);
            } else {
              // Add layer anyway, but as empty/invisible
              const emptyFeatureCollection: GeoJSON.FeatureCollection = {
                type: 'FeatureCollection',
                features: []
              };
              actions.addLayer(emptyFeatureCollection, LayerType.GEOJSON, {}, layerName, content);
              showError('Layer Added with Errors', `File "${file.name}" was added but contains errors: ${parseResult.error}`);
            }
          }
        };
        reader.readAsText(file);
      });
    } else if (textData) {
      const layerName = `Dropped Layer ${new Date().toLocaleTimeString()}`;
      
      // Determine the layer type and parse data
      const { layerType, layerOptions, parseResult } = detectAndParseLayer(textData);
      
      if (parseResult.success && parseResult.data) {
        const featureCollection = convertToFeatureCollection(parseResult.data);
        actions.addLayer(featureCollection, layerType, layerOptions, layerName, textData);
        showSuccess('Layer Added Successfully', 'Dropped data has been added to the map');
      } else {
        // Add layer anyway, but as empty/invisible
        const emptyFeatureCollection: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: []
        };
        actions.addLayer(emptyFeatureCollection, LayerType.GEOJSON, {}, layerName, textData);
        showError('Layer Added with Errors', `Dropped data was added but contains errors: ${parseResult.error}`);
      }
    }
  };

  const handleEditLayerName = (layerId: string, currentName: string) => {
    setEditingLayerId(layerId);
    setEditingName(currentName);
  };

  const handleSaveLayerName = (layerId: string) => {
    if (editingName.trim()) {
      actions.updateLayerName(layerId, editingName.trim());
    }
    setEditingLayerId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingLayerId(null);
    setEditingName('');
  };

  const handleKeyPress = (event: React.KeyboardEvent, layerId: string) => {
    if (event.key === 'Enter') {
      handleSaveLayerName(layerId);
    } else if (event.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleColorChange = (layerId: string, color: ColorPalette) => {
    actions.updateColor(layerId, color);
    setColorDropdownOpen(null);
  };

  const getColorOptions = () => {
    return Object.entries(ColorPalette).map(([key, value]) => ({
      key,
      value,
      emoji: value
    }));
  };

  const handleGradientToggle = (layerId: string, enabled: boolean) => {
    actions.updateOptions(layerId, { gradientMode: enabled });
  };

  const handleProgressSliderChange = (layerId: string, value: number) => {
    actions.updateOptions(layerId, { progressSlider: value });
  };

  // Close color dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorDropdownOpen && !(event.target as Element).closest('.color-pill-container')) {
        setColorDropdownOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [colorDropdownOpen]);


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
          <p className="sidebar-subtitle">Display GeoJSON, encoded polyline, KML, anything that looks like a coordoinates on the map</p>
        </div>
        
        <div className="sidebar-section">
          <h3 className="section-title">Add data</h3>
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
          <div className="section-header">
            <h3 className="section-title">Layers</h3>
            {state.layers.length > 0 && (
              <div className="layer-actions-header">
                {onFitToLayers && (
                  <button
                    onClick={onFitToLayers}
                    className="fit-layers-btn"
                    title="Fit map to show all layers"
                  >
                    🎯
                  </button>
                )}
                <button
                  onClick={() => actions.clearLayers()}
                  className="remove-all-layers-btn"
                  title="Remove all layers"
                >
                  🗑️
                </button>
              </div>
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
                        {editingLayerId === layer.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => handleSaveLayerName(layer.id)}
                            onKeyDown={(e) => handleKeyPress(e, layer.id)}
                            className="layer-name-input"
                            autoFocus
                          />
                        ) : (
                          <h4 
                            className="layer-name" 
                            onClick={() => handleEditLayerName(layer.id, layer.name || 'Unnamed Layer')}
                          >
                            {layer.name || 'Unnamed Layer'}
                          </h4>
                        )}
                        <p className="layer-type">{layer.type}</p>
                      </div>
                      <div className="layer-actions">
                        <div className="color-pill-container">
                          <button
                            onClick={() => setColorDropdownOpen(colorDropdownOpen === layer.id ? null : layer.id)}
                            className="color-pill-btn"
                            title="Change layer color"
                          >
                            {layer.color}
                          </button>
                          {colorDropdownOpen === layer.id && (
                            <div className="color-dropdown">
                              {getColorOptions().map(({ key, value, emoji }) => (
                                <button
                                  key={key}
                                  onClick={() => handleColorChange(layer.id, value)}
                                  className={`color-option ${layer.color === value ? 'selected' : ''}`}
                                  title={`${key.toLowerCase()} color`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
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
                        value={layer.originalContent || (layer.data.features.length > 0 ? JSON.stringify(layer.data, null, 2) : '')}
                        onChange={(e) => {
                          const newContent = e.target.value;
                          actions.updateLayer(layer.id, { originalContent: newContent });
                        }}
                        onBlur={(e) => {
                          const newContent = e.target.value;
                          
                          // Update layer when focus is lost
                          if (newContent.trim()) {
                            // Determine the layer type and parse data
                            const { layerType, layerOptions: newLayerOptions, parseResult } = detectAndParseLayer(newContent);
                            const layerOptions = { ...layer.options, ...newLayerOptions };
                            
                            if (parseResult.success && parseResult.data) {
                              const featureCollection = convertToFeatureCollection(parseResult.data);
                              
                              actions.updateLayer(layer.id, { 
                                data: featureCollection,
                                type: layerType,
                                options: layerOptions,
                                originalContent: newContent
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
                        <div className="option-item">
                          <label className="option-label">
                            <input
                              type="checkbox"
                              checked={layer.options.reverseCoordinates || false}
                              onChange={(e) => {
                                actions.updateOptions(layer.id, { reverseCoordinates: e.target.checked });
                                
                                // Re-parse the original content and apply coordinate reversal
                                const currentContent = layer.originalContent;
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
                        <div className="option-item">
                          <label className="option-label">
                            <input
                              type="checkbox"
                              checked={layer.options.unescape || false}
                              onChange={(e) => {
                                actions.updateOptions(layer.id, { unescape: e.target.checked });

                                // Re-parse the original content with updated unescape option
                                const currentContent = layer.originalContent;
                                if (currentContent && currentContent.trim()) {
                                  const parseResult = parseMultiFormat(currentContent, {
                                    unescape: e.target.checked
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
                            <span className="option-text">Remove '\` escapes</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Gradient Visualization Option */}
                    {(layer.type === LayerType.POLYLINE || hasLineStringGeometry(layer)) && (
                      <div className="layer-options">
                        <div className="option-item">
                          <label className="option-label">
                            <input
                              type="checkbox"
                              checked={layer.options.gradientMode || false}
                              onChange={(e) => handleGradientToggle(layer.id, e.target.checked)}
                            />
                            <span className="option-text">Show Direction Gradient</span>
                          </label>
                        </div>

                        <div className="option-item slider-option">
                          <label className="option-label">
                            <span className="option-text">
                              Show Path Progress: {layer.options.progressSlider ?? 100}%
                            </span>
                          </label>
                          <div className="slider-container">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={layer.options.progressSlider ?? 100}
                              onChange={(e) => handleProgressSliderChange(layer.id, parseInt(e.target.value))}
                              disabled={!layer.visibility}
                              className="progress-slider"
                            />
                            <button
                              className="reset-slider-btn"
                              onClick={() => handleProgressSliderChange(layer.id, 100)}
                              disabled={!layer.visibility}
                            >
                              Reset
                            </button>
                          </div>
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