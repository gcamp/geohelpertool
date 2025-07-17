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
- **NotificationContext** - Toast notifications system
- **useLayerState** hook - Core layer state logic with reducer pattern

#### Map System
- **MapComponent** (`src/components/MapComponent.tsx`) - Main map container with MapLibre GL
- **MapLayerManager** (`src/utils/mapLayerManager.ts`) - Handles map layer operations
- **Layer management** through context actions, not direct map manipulation

#### Data Processing Pipeline
1. **Input Detection** (`src/utils/layerTypeDetector.ts`) - Auto-detects data format
2. **Format Parsers** (`src/utils/`) - Specialized parsers for each format:
   - `geoJsonParser.ts` - GeoJSON validation and parsing
   - `polylineParser.ts` - Encoded polyline decoding
   - `wktParser.ts` - Well-Known Text parsing
   - `latLngParser.ts` - Coordinate list parsing
3. **Layer Creation** - Converts parsed data to standardized Layer objects
4. **Map Rendering** - Renders layers with appropriate styling

### Data Flow
1. User pastes data or drops files → `MapComponent` paste handler
2. `detectAndParseLayer()` determines format and parses data
3. `actions.addLayer()` adds to layer state via context
4. Map effects sync layers to MapLibre GL rendering
5. UI updates sidebar with layer controls

### Key Type Definitions
- **Layer** (`src/types/layer.ts`) - Core layer object structure
- **LayerType** - Enum for supported formats (geojson, polyline, wkt, coordinates)
- **LayerOptions** - Configurable layer properties (colors, stroke, fill, etc.)

### Supported Formats
- **GeoJSON** - Native format, full feature support
- **Encoded Polyline** - Google Maps polyline format with optional unescaping
- **WKT** - Well-Known Text geometry format
- **Coordinate Lists** - CSV-like lat/lng lists with auto-detection

### Build Configuration
- **Single-file build** using `vite-plugin-singlefile` - Creates standalone HTML
- **GitHub Pages deployment** configured for `/GeoHelperTool/` base path
- **TypeScript** with strict mode and separate app/node configurations

### Testing Setup
- **Vitest** with jsdom environment for React component testing
- **React Testing Library** for component testing utilities
- **Test setup** in `src/test/setup.ts` configures testing environment
- **Utility tests** in `src/utils/__tests__/` cover all parsers

### State Persistence
- **Local storage** integration for layer persistence across sessions
- **Layer state** automatically saved and restored on app load