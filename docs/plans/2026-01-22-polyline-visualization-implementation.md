# Polyline Visualization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add gradient direction visualization and progress slider for polyline layers to help users understand line direction and progression.

**Architecture:** Extend Layer options with `gradientMode` and `progressSlider`. Enable MapLibre's `line-gradient` for direction visualization. Use Turf.js for geometry clipping based on slider percentage. Add UI controls in Sidebar for LineString layers.

**Tech Stack:** React, TypeScript, MapLibre GL, Turf.js, Vitest

---

## Task 1: Add Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Turf.js dependencies**

Run:
```bash
npm install @turf/line-slice-along@^7.0.0 @turf/length@^7.0.0
```

Expected: Dependencies added to package.json and node_modules installed

**Step 2: Verify installation**

Run:
```bash
npm list @turf/line-slice-along @turf/length
```

Expected: Both packages listed with version ^7.0.0

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add turf.js dependencies for line clipping

Add @turf/line-slice-along and @turf/length for polyline progress
slider functionality.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Extend Layer Types

**Files:**
- Modify: `src/types/layer.ts:25-35`

**Step 1: Add new LayerOptions properties**

In `src/types/layer.ts`, update the `LayerOptions` interface:

```typescript
export interface LayerOptions {
  strokeWidth?: number;
  strokeOpacity?: number;
  fillOpacity?: number;
  pointRadius?: number;
  showLabels?: boolean;
  labelField?: string;
  reverseCoordinates?: boolean;
  unescape?: boolean;
  gradientMode?: boolean;      // Enable blue→red gradient for LineString
  progressSlider?: number;     // 0-100, percentage of line visible
  [key: string]: unknown;
}
```

**Step 2: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds with no type errors

**Step 3: Commit**

```bash
git add src/types/layer.ts
git commit -m "feat: add gradientMode and progressSlider to LayerOptions

Add optional fields for polyline visualization features.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Enable Line Metrics in MapLayerManager

**Files:**
- Modify: `src/utils/mapLayerManager.ts:38-55`

**Step 1: Add lineMetrics to source config**

In `src/utils/mapLayerManager.ts`, modify the `addSource` method:

```typescript
addSource(layerId: string, data: GeoJSON.FeatureCollection): void {
  const sourceId = `layer-source-${layerId}`;

  if (this.map.getSource(sourceId)) {
    throw new Error(`Source ${sourceId} already exists`);
  }

  this.map.addSource(sourceId, {
    type: 'geojson',
    data,
    lineMetrics: true  // Enable for gradient support
  });

  this.layerGroups.set(layerId, {
    sourceId,
    layerIds: [],
    geometryTypes: []
  });
}
```

**Step 2: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds with no type errors

**Step 3: Commit**

```bash
git add src/utils/mapLayerManager.ts
git commit -m "feat: enable lineMetrics for gradient support

Add lineMetrics: true to all GeoJSON sources to enable line-gradient
paint property.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Add Gradient Support to LineString Rendering

**Files:**
- Modify: `src/utils/mapLayerManager.ts:332-349`

**Step 1: Update LineString paint configuration**

In `src/utils/mapLayerManager.ts`, modify the `createLayerConfig` method's LineString case:

```typescript
case 'LineString':
  return {
    id: `${baseId}-lines`,
    sourceId,
    type: 'line',
    geometryType: 'LineString',
    filter: ['==', '$type', 'LineString'],
    paint: {
      'line-color': layer.options.gradientMode
        ? [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0,
            '#3b82f6',  // blue at start
            1,
            '#ef4444'   // red at end
          ]
        : (useGeoJsonStyles
            ? ['case', ['has', 'stroke'], ['get', 'stroke'], ['has', 'stroke-color'], ['get', 'stroke-color'], getMapLayerColor(layer.color)]
            : getMapLayerColor(layer.color)),
      'line-width': layer.options.strokeWidth || 2,
      'line-opacity': layer.options.strokeOpacity || 1
    },
    layout: {
      'visibility': layer.visibility ? 'visible' : 'none'
    }
  };
```

**Step 2: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds with no type errors

**Step 3: Commit**

```bash
git add src/utils/mapLayerManager.ts
git commit -m "feat: add gradient mode support for LineString layers

Apply blue-to-red gradient when gradientMode option is enabled.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create Line Clipping Utility

**Files:**
- Create: `src/utils/lineClipping.ts`

**Step 1: Write the line clipping utility**

Create `src/utils/lineClipping.ts`:

```typescript
import lineSliceAlong from '@turf/line-slice-along';
import length from '@turf/length';
import type { Feature, FeatureCollection, LineString, MultiLineString } from 'geojson';

export interface ClipResult {
  success: boolean;
  data?: FeatureCollection;
  error?: string;
}

/**
 * Clips a LineString FeatureCollection to show only the first X% of each line
 */
export function clipLinesByProgress(
  featureCollection: FeatureCollection,
  progressPercent: number
): ClipResult {
  if (progressPercent < 0 || progressPercent > 100) {
    return {
      success: false,
      error: 'Progress must be between 0 and 100'
    };
  }

  // At 100%, return original data
  if (progressPercent === 100) {
    return {
      success: true,
      data: featureCollection
    };
  }

  try {
    const clippedFeatures = featureCollection.features.map(feature => {
      if (!feature.geometry) {
        return feature;
      }

      const geomType = feature.geometry.type;

      // Only process LineString and MultiLineString
      if (geomType !== 'LineString' && geomType !== 'MultiLineString') {
        return feature;
      }

      if (geomType === 'LineString') {
        return clipLineString(feature as Feature<LineString>, progressPercent);
      } else {
        return clipMultiLineString(feature as Feature<MultiLineString>, progressPercent);
      }
    });

    return {
      success: true,
      data: {
        type: 'FeatureCollection',
        features: clippedFeatures
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error clipping lines'
    };
  }
}

function clipLineString(
  feature: Feature<LineString>,
  progressPercent: number
): Feature<LineString> {
  // At 0%, return start point as a very short line
  if (progressPercent === 0) {
    const coords = feature.geometry.coordinates;
    if (coords.length < 2) return feature;

    return {
      ...feature,
      geometry: {
        type: 'LineString',
        coordinates: [coords[0], coords[0]]
      }
    };
  }

  const totalLength = length(feature, { units: 'kilometers' });
  const targetLength = (totalLength * progressPercent) / 100;

  try {
    const sliced = lineSliceAlong(feature, 0, targetLength, { units: 'kilometers' });
    return sliced as Feature<LineString>;
  } catch {
    // If slicing fails (e.g., line too short), return original
    return feature;
  }
}

function clipMultiLineString(
  feature: Feature<MultiLineString>,
  progressPercent: number
): Feature<MultiLineString> {
  // Convert MultiLineString to individual LineStrings, clip each, then recombine
  const lineStrings = feature.geometry.coordinates.map((coords, index) => ({
    type: 'Feature' as const,
    properties: feature.properties,
    geometry: {
      type: 'LineString' as const,
      coordinates: coords
    }
  }));

  const clippedLines = lineStrings.map(line =>
    clipLineString(line as Feature<LineString>, progressPercent)
  );

  return {
    ...feature,
    geometry: {
      type: 'MultiLineString',
      coordinates: clippedLines.map(line => line.geometry.coordinates)
    }
  };
}
```

**Step 2: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds with no type errors

**Step 3: Commit**

```bash
git add src/utils/lineClipping.ts
git commit -m "feat: add line clipping utility for progress slider

Implement geometry clipping using Turf.js to show partial lines based
on progress percentage.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Write Tests for Line Clipping Utility

**Files:**
- Create: `src/utils/__tests__/lineClipping.test.ts`

**Step 1: Write comprehensive tests**

Create `src/utils/__tests__/lineClipping.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { clipLinesByProgress } from '../lineClipping';
import type { FeatureCollection, LineString, MultiLineString } from 'geojson';

describe('clipLinesByProgress', () => {
  const simpleLineString: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 2],
            [3, 3]
          ]
        }
      }
    ]
  };

  it('returns original data at 100%', () => {
    const result = clipLinesByProgress(simpleLineString, 100);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(simpleLineString);
  });

  it('returns start point at 0%', () => {
    const result = clipLinesByProgress(simpleLineString, 0);
    expect(result.success).toBe(true);
    expect(result.data?.features[0].geometry.coordinates).toHaveLength(2);
    expect(result.data?.features[0].geometry.coordinates[0]).toEqual([0, 0]);
    expect(result.data?.features[0].geometry.coordinates[1]).toEqual([0, 0]);
  });

  it('clips line to approximately 50%', () => {
    const result = clipLinesByProgress(simpleLineString, 50);
    expect(result.success).toBe(true);
    expect(result.data?.features[0].geometry.type).toBe('LineString');
    const coords = (result.data?.features[0].geometry as LineString).coordinates;
    expect(coords.length).toBeGreaterThan(1);
    expect(coords.length).toBeLessThanOrEqual(4);
  });

  it('rejects invalid progress values', () => {
    expect(clipLinesByProgress(simpleLineString, -1).success).toBe(false);
    expect(clipLinesByProgress(simpleLineString, 101).success).toBe(false);
  });

  it('handles MultiLineString geometries', () => {
    const multiLineString: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'MultiLineString',
            coordinates: [
              [[0, 0], [1, 1]],
              [[2, 2], [3, 3]]
            ]
          }
        }
      ]
    };

    const result = clipLinesByProgress(multiLineString, 50);
    expect(result.success).toBe(true);
    expect(result.data?.features[0].geometry.type).toBe('MultiLineString');
  });

  it('ignores non-LineString geometries', () => {
    const mixedGeometry: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: [0, 0]
          }
        },
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [1, 1]]
          }
        }
      ]
    };

    const result = clipLinesByProgress(mixedGeometry, 50);
    expect(result.success).toBe(true);
    expect(result.data?.features).toHaveLength(2);
    expect(result.data?.features[0].geometry.type).toBe('Point');
  });
});
```

**Step 2: Run tests**

Run:
```bash
npm run test:run src/utils/__tests__/lineClipping.test.ts
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add src/utils/__tests__/lineClipping.test.ts
git commit -m "test: add tests for line clipping utility

Cover edge cases including 0%, 50%, 100%, MultiLineString, and mixed
geometries.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add Gradient Toggle UI Control

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Step 1: Add helper function to detect LineString geometry**

Add this helper function after the `convertToFeatureCollection` function (around line 48):

```typescript
const hasLineStringGeometry = (layer: Layer): boolean => {
  return layer.data.features.some(
    feature => feature.geometry?.type === 'LineString' || feature.geometry?.type === 'MultiLineString'
  );
};
```

**Step 2: Add gradient toggle handler**

Add this handler function in the Sidebar component (around line 200, near other handlers):

```typescript
const handleGradientToggle = (layerId: string, enabled: boolean) => {
  const newOptions = { gradientMode: enabled };
  actions.updateLayer(layerId, { options: newOptions });
};
```

**Step 3: Add gradient checkbox UI**

In the JSX, after the polyline unescape checkbox section (around line 494), add:

```tsx
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
  </div>
)}
```

**Step 4: Import Layer type**

Ensure `Layer` type is imported at the top:

```typescript
import type { Layer } from '../types/layer';
```

**Step 5: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds with no type errors

**Step 6: Test manually**

Run:
```bash
npm run dev
```

Expected:
- Open http://localhost:5173
- Paste a polyline (e.g., encoded polyline string)
- See new "Show Direction Gradient" checkbox
- Toggle checkbox to see gradient appear/disappear

**Step 7: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add gradient toggle UI control

Add checkbox to enable/disable direction gradient for LineString
layers.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Add Progress Slider UI Control

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/Sidebar.css`

**Step 1: Add state for slider debouncing**

Add state near the other useState declarations (around line 25):

```typescript
const [sliderValues, setSliderValues] = useState<Map<string, number>>(new Map());
```

**Step 2: Add debounced slider handler**

Add this handler after `handleGradientToggle`:

```typescript
const handleProgressSliderChange = (layerId: string, value: number) => {
  // Update local state immediately for responsive UI
  setSliderValues(prev => new Map(prev).set(layerId, value));

  // Debounce the actual layer update
  const timeoutId = setTimeout(() => {
    actions.updateLayer(layerId, {
      options: { progressSlider: value }
    });
  }, 100);

  // Store timeout for cleanup
  return () => clearTimeout(timeoutId);
};
```

**Step 3: Add slider UI after gradient checkbox**

In the gradient visualization options section, add the slider after the gradient checkbox:

```tsx
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
          Show Path Progress: {sliderValues.get(layer.id) ?? layer.options.progressSlider ?? 100}%
        </span>
      </label>
      <div className="slider-container">
        <input
          type="range"
          min="0"
          max="100"
          value={sliderValues.get(layer.id) ?? layer.options.progressSlider ?? 100}
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
```

**Step 4: Add CSS for slider**

Add to `src/components/Sidebar.css`:

```css
.slider-option {
  margin-top: 8px;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.progress-slider {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  outline: none;
  background: #ddd;
}

.progress-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
}

.progress-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
}

.progress-slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reset-slider-btn {
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.reset-slider-btn:hover:not(:disabled) {
  background: #f5f5f5;
}

.reset-slider-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Step 5: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds with no type errors

**Step 6: Commit**

```bash
git add src/components/Sidebar.tsx src/components/Sidebar.css
git commit -m "feat: add progress slider UI control

Add range slider with debouncing and reset button for controlling line
visibility percentage.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Wire Progress Slider to Map Rendering

**Files:**
- Modify: `src/components/MapComponent.tsx`

**Step 1: Import line clipping utility**

Add import at the top of `src/components/MapComponent.tsx`:

```typescript
import { clipLinesByProgress } from '../utils/lineClipping';
```

**Step 2: Add effect to handle progress slider changes**

Add this effect after the existing layer sync effects (look for similar useEffect blocks):

```typescript
// Handle progress slider changes
useEffect(() => {
  if (!mapRef.current || !mapLayerManagerRef.current) return;

  layers.forEach(layer => {
    const hasLineString = layer.data.features.some(
      f => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString'
    );

    if (!hasLineString) return;

    const progress = layer.options.progressSlider ?? 100;

    if (progress < 100) {
      // Clip the geometry
      const clipResult = clipLinesByProgress(layer.data, progress);

      if (clipResult.success && clipResult.data) {
        mapLayerManagerRef.current.updateSource(layer.id, clipResult.data);
      }
    } else {
      // Show full geometry
      mapLayerManagerRef.current.updateSource(layer.id, layer.data);
    }
  });
}, [layers]);
```

**Step 3: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds with no type errors

**Step 4: Test manually**

Run:
```bash
npm run dev
```

Expected:
- Open http://localhost:5173
- Paste a polyline
- Move the progress slider
- Line should clip to show only the first X% of the path

**Step 5: Commit**

```bash
git add src/components/MapComponent.tsx
git commit -m "feat: wire progress slider to map rendering

Apply line clipping when progress slider changes, updating map source
with clipped geometry.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Fix Debouncing Implementation

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Step 1: Use useRef for debounce timeouts**

Add a ref to store timeout IDs (around line 25 with other refs):

```typescript
const sliderTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
```

**Step 2: Fix handleProgressSliderChange to properly debounce**

Replace the previous `handleProgressSliderChange` implementation:

```typescript
const handleProgressSliderChange = (layerId: string, value: number) => {
  // Update local state immediately for responsive UI
  setSliderValues(prev => new Map(prev).set(layerId, value));

  // Clear existing timeout for this layer
  const existingTimeout = sliderTimeoutRef.current.get(layerId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Set new timeout
  const timeoutId = setTimeout(() => {
    actions.updateLayer(layerId, {
      options: { progressSlider: value }
    });
    sliderTimeoutRef.current.delete(layerId);
  }, 100);

  sliderTimeoutRef.current.set(layerId, timeoutId);
};
```

**Step 3: Add cleanup effect**

Add cleanup effect to clear timeouts on unmount:

```typescript
useEffect(() => {
  return () => {
    sliderTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
    sliderTimeoutRef.current.clear();
  };
}, []);
```

**Step 4: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds with no type errors

**Step 5: Test manually**

Run:
```bash
npm run dev
```

Expected:
- Slider movement feels smooth
- Updates happen after 100ms delay
- No lag or performance issues

**Step 6: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "fix: improve progress slider debouncing

Use useRef to properly track and clear timeouts, preventing memory
leaks and ensuring smooth slider interaction.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Add Integration Tests

**Files:**
- Create: `src/components/__tests__/PolylineVisualization.test.tsx`

**Step 1: Write integration tests**

Create `src/components/__tests__/PolylineVisualization.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../Sidebar';
import { LayerContext } from '../../contexts/LayerContext';
import { NotificationContext } from '../../contexts/NotificationContext';
import { LayerType } from '../../types/layer';

const mockLayer = {
  id: 'test-layer',
  name: 'Test Polyline',
  type: LayerType.POLYLINE,
  data: {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [[0, 0], [1, 1], [2, 2]]
        },
        properties: {}
      }
    ]
  },
  color: '🔵' as const,
  visibility: true,
  options: {},
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('Polyline Visualization Controls', () => {
  const mockUpdateLayer = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();

  const renderSidebar = () => {
    const mockContextValue = {
      state: { layers: [mockLayer], activeLayerId: null, layerCount: 1 },
      actions: {
        updateLayer: mockUpdateLayer,
        addLayer: vi.fn(),
        removeLayer: vi.fn(),
        toggleVisibility: vi.fn(),
        updateColor: vi.fn(),
        clearLayers: vi.fn(),
        updateLayerName: vi.fn()
      }
    };

    const mockNotificationValue = {
      showSuccess: mockShowSuccess,
      showError: mockShowError
    };

    return render(
      <NotificationContext.Provider value={mockNotificationValue}>
        <LayerContext.Provider value={mockContextValue}>
          <Sidebar />
        </LayerContext.Provider>
      </NotificationContext.Provider>
    );
  };

  it('renders gradient checkbox for polyline layers', () => {
    renderSidebar();
    expect(screen.getByText('Show Direction Gradient')).toBeInTheDocument();
  });

  it('renders progress slider for polyline layers', () => {
    renderSidebar();
    expect(screen.getByText(/Show Path Progress:/)).toBeInTheDocument();
  });

  it('toggles gradient mode when checkbox is clicked', () => {
    renderSidebar();
    const checkbox = screen.getByLabelText('Show Direction Gradient');

    fireEvent.click(checkbox);

    expect(mockUpdateLayer).toHaveBeenCalledWith(
      'test-layer',
      expect.objectContaining({
        options: { gradientMode: true }
      })
    );
  });

  it('updates progress slider value', () => {
    renderSidebar();
    const slider = screen.getByRole('slider');

    fireEvent.change(slider, { target: { value: '50' } });

    // Wait for debounce
    setTimeout(() => {
      expect(mockUpdateLayer).toHaveBeenCalledWith(
        'test-layer',
        expect.objectContaining({
          options: { progressSlider: 50 }
        })
      );
    }, 150);
  });

  it('resets slider to 100% when reset button is clicked', () => {
    renderSidebar();
    const resetButton = screen.getByText('Reset');

    fireEvent.click(resetButton);

    setTimeout(() => {
      expect(mockUpdateLayer).toHaveBeenCalledWith(
        'test-layer',
        expect.objectContaining({
          options: { progressSlider: 100 }
        })
      );
    }, 150);
  });

  it('disables slider when layer is not visible', () => {
    const hiddenLayer = { ...mockLayer, visibility: false };

    const mockContextValue = {
      state: { layers: [hiddenLayer], activeLayerId: null, layerCount: 1 },
      actions: {
        updateLayer: mockUpdateLayer,
        addLayer: vi.fn(),
        removeLayer: vi.fn(),
        toggleVisibility: vi.fn(),
        updateColor: vi.fn(),
        clearLayers: vi.fn(),
        updateLayerName: vi.fn()
      }
    };

    const mockNotificationValue = {
      showSuccess: mockShowSuccess,
      showError: mockShowError
    };

    render(
      <NotificationContext.Provider value={mockNotificationValue}>
        <LayerContext.Provider value={mockContextValue}>
          <Sidebar />
        </LayerContext.Provider>
      </NotificationContext.Provider>
    );

    const slider = screen.getByRole('slider');
    expect(slider).toBeDisabled();
  });
});
```

**Step 2: Run tests**

Run:
```bash
npm run test:run src/components/__tests__/PolylineVisualization.test.tsx
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add src/components/__tests__/PolylineVisualization.test.tsx
git commit -m "test: add integration tests for polyline visualization

Test gradient toggle, slider interaction, reset button, and disabled
states.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Run Full Test Suite

**Files:**
- N/A

**Step 1: Run all tests**

Run:
```bash
npm run test:run
```

Expected: All tests pass

**Step 2: Run linter**

Run:
```bash
npm run lint
```

Expected: No linting errors

**Step 3: Build for production**

Run:
```bash
npm run build
```

Expected: Build succeeds, creates dist/index.html

---

## Task 13: Manual Testing & Documentation

**Files:**
- Create: `docs/testing/polyline-visualization-manual-tests.md`

**Step 1: Create manual test checklist**

Create `docs/testing/polyline-visualization-manual-tests.md`:

```markdown
# Polyline Visualization Manual Testing Checklist

## Setup
- [ ] Run `npm run dev`
- [ ] Open http://localhost:5173

## Test 1: Gradient Visualization

### Simple Polyline
- [ ] Paste encoded polyline: `_p~iF~ps|U_ulLnnqC_mqNvxq`@`
- [ ] Verify "Show Direction Gradient" checkbox appears
- [ ] Check the checkbox
- [ ] Verify line changes from solid color to blue (start) → red (end) gradient
- [ ] Uncheck the checkbox
- [ ] Verify line returns to solid color

### GeoJSON LineString
- [ ] Paste GeoJSON:
```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [[0, 0], [1, 1], [2, 2], [3, 3]]
    },
    "properties": {}
  }]
}
```
- [ ] Verify gradient checkbox appears
- [ ] Toggle gradient on/off successfully

## Test 2: Progress Slider

### Basic Functionality
- [ ] Paste a polyline
- [ ] Verify "Show Path Progress" slider appears (default 100%)
- [ ] Move slider to 50%
- [ ] Verify line clips to show approximately first half
- [ ] Move slider to 0%
- [ ] Verify only start point is visible
- [ ] Move slider to 100%
- [ ] Verify full line is visible
- [ ] Click "Reset" button
- [ ] Verify slider returns to 100%

### Gradient + Slider Interaction
- [ ] Enable gradient mode
- [ ] Move slider to 50%
- [ ] Verify gradient applies to visible portion (blue → red across first half)

### Visibility Interaction
- [ ] Hide layer using eye icon
- [ ] Verify slider becomes disabled (grayed out)
- [ ] Show layer again
- [ ] Verify slider is re-enabled

## Test 3: Edge Cases

### Very Short Line
- [ ] Paste GeoJSON with 2-point line: `[[0,0],[0.0001,0.0001]]`
- [ ] Verify slider works without errors
- [ ] Move slider to 50%
- [ ] Verify no crashes or visual glitches

### Multi-LineString
- [ ] Paste Multi-LineString GeoJSON:
```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": {
      "type": "MultiLineString",
      "coordinates": [
        [[0, 0], [1, 1]],
        [[2, 2], [3, 3]]
      ]
    },
    "properties": {}
  }]
}
```
- [ ] Verify both controls appear
- [ ] Verify gradient applies to all segments
- [ ] Verify slider clips all segments proportionally

### Non-LineString Layers
- [ ] Paste Point GeoJSON: `{"type":"Point","coordinates":[0,0]}`
- [ ] Verify gradient and slider controls DO NOT appear

## Test 4: Performance

### Smooth Slider Dragging
- [ ] Paste a long polyline (100+ points)
- [ ] Drag slider rapidly back and forth
- [ ] Verify no lag or stuttering
- [ ] Verify updates are debounced (not updating on every pixel)

## Test 5: Persistence

### LocalStorage
- [ ] Enable gradient mode
- [ ] Set slider to 75%
- [ ] Refresh the page
- [ ] Verify gradient mode is still enabled
- [ ] Verify slider is still at 75%

## Pass Criteria
All checkboxes must be checked for tests to pass.
```

**Step 2: Perform manual testing**

Run through the checklist manually.

Expected: All tests pass

**Step 3: Commit documentation**

```bash
git add docs/testing/polyline-visualization-manual-tests.md
git commit -m "docs: add manual testing checklist

Document manual test cases for gradient and slider features.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Update Project Documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update CLAUDE.md with new features**

Add to the "Supported Formats" section in `CLAUDE.md`:

```markdown
### Polyline Visualization Features
- **Direction Gradient** - Optional blue→red gradient showing line direction (start to end)
- **Progress Slider** - Interactive slider (0-100%) to reveal line progressively from start
- Both features available for LineString and MultiLineString geometries
- Accessible via layer options in Sidebar for polyline/LineString layers
```

**Step 2: Verify documentation clarity**

Read through the updated section to ensure it's clear and accurate.

**Step 3: Commit documentation**

```bash
git add CLAUDE.md
git commit -m "docs: document polyline visualization features

Add gradient and progress slider features to project documentation.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Final Verification

**Run complete test suite:**
```bash
npm run test:run
npm run lint
npm run build
```

**Manual verification:**
1. Start dev server: `npm run dev`
2. Test gradient toggle with polyline
3. Test progress slider from 0% to 100%
4. Test both features together
5. Test with different geometry types
6. Verify persistence after page reload

**All tasks complete!** The polyline visualization features are fully implemented and tested.
