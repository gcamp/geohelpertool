# Polyline Direction and Progress Visualization

**Date:** 2026-01-22
**Status:** Design Approved

## Problem Statement

When polylines have overlapping points or complex paths, it's difficult to understand the line's direction and progression. Users need visual aids to:
1. Identify where a polyline starts and ends
2. Follow the path progression point-by-point to understand the route

## Solution Overview

Two new optional visualization modes for polyline layers:

1. **Direction Gradient** - Color gradient from blue (start) to red (end)
2. **Progress Slider** - Interactive slider to reveal the line from start to any percentage

## Architecture

### 1. Layer Options Extension

**File:** `src/types/layer.ts`

Add to `LayerOptions` interface:
```typescript
export interface LayerOptions {
  // ... existing options
  gradientMode?: boolean;      // Enable blue→red gradient
  progressSlider?: number;     // 0-100, percentage of line visible
}
```

### 2. MapLayerManager Enhancement

**File:** `src/utils/mapLayerManager.ts`

**Changes to existing methods:**

- `addSource()`: Enable `lineMetrics: true` for all GeoJSON sources to support gradients
  ```typescript
  this.map.addSource(sourceId, {
    type: 'geojson',
    data,
    lineMetrics: true  // NEW
  });
  ```

- `createLayerConfig()`: Modify LineString case to check `gradientMode`:
  ```typescript
  case 'LineString':
    return {
      // ... existing config
      paint: {
        'line-color': layer.options.gradientMode
          ? ['interpolate', ['linear'], ['line-progress'],
              0, '#3b82f6',  // blue start
              1, '#ef4444']  // red end
          : getMapLayerColor(layer.color),
        'line-width': layer.options.strokeWidth || 2,
        'line-opacity': layer.options.strokeOpacity || 1
      }
    };
  ```

### 3. Sidebar Controls

**File:** `src/components/Sidebar.tsx`

Add new section in layer options (after polyline unescape checkbox):

```tsx
{/* Polyline Visualization Options */}
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
          Show Path Progress: {layer.options.progressSlider || 100}%
        </span>
      </label>
      <div className="slider-container">
        <input
          type="range"
          min="0"
          max="100"
          value={layer.options.progressSlider || 100}
          onChange={(e) => handleProgressSliderChange(layer.id, parseInt(e.target.value))}
          disabled={!layer.visibility}
        />
        <button
          className="reset-slider-btn"
          onClick={() => handleProgressSliderChange(layer.id, 100)}
        >
          Reset
        </button>
      </div>
    </div>
  </div>
)}
```

## Technical Implementation

### Gradient Direction Visualization

Uses MapLibre's native `line-gradient` feature:

**Requirements:**
- Source must have `lineMetrics: true`
- Paint property uses `line-progress` (0 to 1) for gradient stops

**Color scheme:**
- Start (0%): `#3b82f6` (blue)
- End (100%): `#ef4444` (red)

**Toggle behavior:**
- ON: Apply gradient paint property
- OFF: Use standard layer color

### Progress Slider (Line Clipping)

**Approach:** Geometry manipulation with Turf.js

**Implementation steps:**
1. User moves slider to X%
2. Calculate point at X% along LineString using Turf.js
3. Use `@turf/line-slice-along` to extract coordinates from 0 to X%
4. Create new FeatureCollection with clipped geometry
5. Update map source via `mapLayerManager.updateSource()`

**Performance optimizations:**
- Debounce slider updates (100ms) to prevent excessive re-rendering
- Cache original full geometry in layer data
- Only recalculate when slider value changes

**Dependencies to add:**
```json
{
  "@turf/line-slice-along": "^7.0.0",
  "@turf/length": "^7.0.0"
}
```

## Data Flow

### Gradient Toggle Flow

```
User clicks checkbox
  ↓
actions.updateLayer(layerId, { options: { gradientMode: true } })
  ↓
MapComponent useEffect detects options change
  ↓
mapLayerManager.updateLayerStyle()
  ↓
Re-creates line layer with gradient paint
  ↓
Map renders with blue→red gradient
```

### Progress Slider Flow

```
User moves slider to 75%
  ↓
Debounced update (100ms delay)
  ↓
actions.updateLayer(layerId, { options: { progressSlider: 75 } })
  ↓
MapComponent useEffect detects change
  ↓
Calculate clipped geometry using Turf.js:
  - Total line length
  - Slice from start to 75% of length
  ↓
mapLayerManager.updateSource(clippedFeatureCollection)
  ↓
Map renders with partial line
```

## UI/UX Specifications

### Control Layout

```
┌─ Layer Item ────────────────────────────┐
│ Layer Name                   🔵 👁️ 🗑️   │
│ ┌─────────────────────────────────────┐ │
│ │ [GeoJSON/Polyline content]          │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ☐ Remove '\' escapes    (POLYLINE only) │
│                                          │
│ ☑ Show Direction Gradient                │
│                                          │
│ Show Path Progress: 75%                  │
│ ├────────────●──────────┤ [Reset]        │
└──────────────────────────────────────────┘
```

### Control Behaviors

**Gradient Checkbox:**
- Default: unchecked (standard layer color)
- Checked: Line displays blue→red gradient
- State persists in localStorage with layer

**Progress Slider:**
- Range: 0-100
- Default: 100 (full line visible)
- Label updates in real-time as slider moves
- Reset button restores to 100%
- Disabled (grayed out) when layer visibility is off
- Debounced updates for smooth dragging

**Visibility:**
- Both controls only appear for layers with LineString geometry
- Compatible with both POLYLINE type and GeoJSON containing LineStrings
- Works with Multi-LineString (applies to all segments)

### Edge Cases

1. **Gradient + Slider interaction:**
   - If both enabled, gradient applies to visible portion only
   - Example: Slider at 50% shows blue→red gradient across first half

2. **Slider at extremes:**
   - 0%: Shows only start point as a small dot
   - 100%: Shows complete line

3. **Layer visibility:**
   - Slider disabled when layer is hidden
   - Settings preserved when toggling visibility

4. **Multi-LineString handling:**
   - Each line segment gets same treatment
   - Slider percentage applies to total combined length

5. **State persistence:**
   - Both options save to localStorage
   - Restored on app reload

## Testing Considerations

1. **Gradient rendering:**
   - Verify gradient appears on LineString layers
   - Verify gradient doesn't appear on Point/Polygon layers
   - Test gradient toggle on/off

2. **Slider functionality:**
   - Test 0%, 50%, 100% positions
   - Verify debouncing prevents performance issues
   - Test reset button

3. **Combined features:**
   - Test gradient + slider together
   - Verify gradient follows clipped line

4. **Edge cases:**
   - Very short lines (< 10m)
   - Very long lines (> 1000km)
   - Multi-LineString geometries
   - Lines with only 2 points

## Implementation Files

**Modified:**
- `src/types/layer.ts` - Add new LayerOptions fields
- `src/utils/mapLayerManager.ts` - Add lineMetrics, gradient logic
- `src/components/Sidebar.tsx` - Add UI controls and handlers
- `package.json` - Add Turf.js dependencies

**New:**
- `src/utils/lineClipping.ts` - Helper for geometry clipping logic

## Future Enhancements (Out of Scope)

- Custom gradient colors
- Multiple gradient stops
- Animated line drawing effect
- Reverse direction toggle
- Distance markers along line
