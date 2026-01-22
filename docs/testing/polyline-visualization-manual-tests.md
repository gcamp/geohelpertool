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
