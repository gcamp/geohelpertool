# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server on http://localhost:5173
- `npm run build` - Build for production (creates single-file HTML in dist/)
- `npm run lint` - Run ESLint for code quality checks
- `npm run preview` - Preview production build locally

### Testing Commands
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:ui` - Run tests with Vitest UI
- `npm run test:coverage` - Run tests with coverage report

## Architecture Overview

### Core Architecture
This is a React-based geospatial data visualization tool built with:
- **React 19** + **TypeScript** - Modern React with strict typing
- **Vite** - Fast build tool and development server
- **MapLibre GL** - Open-source map rendering engine
- **Vitest** - Fast testing framework

### Key Components Structure

#### State Management
- **Context-based state** using React Context API
- **LayerContext** (`src/contexts/LayerContext.tsx`) - Global layer state management
  - Wraps `useLayerState` hook for state and actions
  - Provides layer CRUD operations via context
- **NotificationContext** (`src/contexts/NotificationContext.tsx`) - Toast notifications system
  - `showSuccess()` and `showError()` for user feedback
  - Auto-dismiss notifications with customizable duration
- **useLayerState** hook (`src/hooks/useLayerState.ts`) - Core layer state logic
  - Reducer-based state management
  - Automatic localStorage persistence
  - Action creators for layer operations

#### Map System
- **MapComponent** (`src/components/MapComponent.tsx`) - Main map container with MapLibre GL
  - Initializes MapLayerManager on map load
  - Global paste event handler for data import
  - Automatic map fitting to layer bounds
- **MapLayerManager** (`src/utils/mapLayerManager.ts`) - Handles map layer operations
  - Source and layer lifecycle management
  - Style updates (colors, opacity, stroke width)
  - Visibility toggling
- **Sidebar** (`src/components/Sidebar.tsx`) - Resizable control panel
  - Layer list with controls
  - File drop zone
  - Color picker for layer styling
- **Layer management** through context actions, not direct map manipulation

#### Data Processing Pipeline
1. **Input Detection** (`src/utils/layerTypeDetector.ts`) - Auto-detects data format
2. **Unified Parser** (`src/utils/geoJsonParser.ts`) - Single file with specialized parser functions:
   - `parseGeoJSON()` - GeoJSON validation and parsing
   - `parsePolyline()` - Encoded polyline decoding
   - `parseWKT()` - Well-Known Text parsing
   - `parseLatLngList()` - Coordinate list parsing
   - `parseMultiFormat()` - Auto-detection parser that tries all formats
3. **Layer Creation** - Converts parsed data to standardized Layer objects
4. **Map Rendering** - Renders layers with appropriate styling

### Data Flow
1. User pastes data or drops files → `MapComponent` paste handler or `Sidebar` drop zone
2. `detectAndParseLayer()` determines format via `parseMultiFormat()`
3. `actions.addLayer()` adds to layer state via context
4. Map effects sync layers to MapLibre GL rendering
5. UI updates sidebar with layer controls

### UI Features
- **Resizable Sidebar** - Sidebar width is adjustable via drag handle (min: 250px, max: 60% viewport)
- **Drag & Drop** - Files can be dropped directly onto sidebar drop zone
- **Layer Controls** - Toggle visibility, change colors, rename, and delete layers
- **Paste Support** - Global paste handler (Cmd/Ctrl+V) for quick data import
- **Fit to Bounds** - Automatically centers map on all visible layers

### Key Type Definitions
- **Layer** (`src/types/layer.ts`) - Core layer object structure
- **LayerType** - Enum for supported formats (geojson, polyline, wkt, coordinates)
- **LayerOptions** - Configurable layer properties (colors, stroke, fill, etc.)

### Supported Formats
- **GeoJSON** - Native format, full feature support
- **Encoded Polyline** - Google Maps polyline format with optional unescaping
- **WKT** - Well-Known Text geometry format
- **Coordinate Lists** - CSV-like lat/lng lists with auto-detection

### Polyline Visualization Features
- **Direction Gradient** - Optional blue→red gradient showing line direction (start to end)
- **Progress Slider** - Interactive slider (0-100%) to reveal line progressively from start
- Both features available for LineString and MultiLineString geometries
- Accessible via layer options in Sidebar for polyline/LineString layers

### Build Configuration
- **Single-file build** using `vite-plugin-singlefile` - Creates standalone HTML
- **GitHub Pages deployment** configured for `/GeoHelperTool/` base path
- **TypeScript** with strict mode and separate app/node configurations

### Testing Setup
- **Vitest** with jsdom environment for React component testing
- **React Testing Library** for component testing utilities
- **Test setup** in `src/test/setup.ts` configures testing environment
- **Parser tests** in `src/utils/__tests__/` cover all parser functions:
  - `geoJsonParser.test.ts` - GeoJSON parsing validation
  - `polylineParser.test.ts` - Polyline decoding tests
  - `wktParser.test.ts` - WKT format tests
  - `latLngParser.test.ts` - Coordinate list parsing tests
  - `multiFormatParser.test.ts` - Auto-detection tests

### State Persistence
- **Local storage** integration (`src/utils/localStorage.ts`) for layer persistence
- **Layer state** automatically saved and restored on app load
- Persistence triggered by `useLayerState` hook after initialization

### Utility Functions
- **colorPalette.ts** - Predefined color palette for layer styling
- **layerManagement.ts** - Layer reducer and management operations
- **layerUtils.ts** - Helper functions for layer operations
- **layerContextUtils.ts** - Context-specific utilities

### Common Patterns
- **Adding new parser format**: Add parser function to `geoJsonParser.ts`, update `parseMultiFormat()` order
- **Modifying layer state**: Always use context actions, never mutate state directly
- **Styling layers**: Use `mapLayerManager.updateLayerStyle()` via effects, not direct MapLibre calls
- **Testing parsers**: Follow existing test patterns in `src/utils/__tests__/`