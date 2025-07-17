# GeoHelper Tool

A React-based web application for visualizing and debugging geospatial data formats on an interactive map. This tool allows developers and data analysts to quickly validate geographical information by rendering data like GeoJSON, encoded polylines, WKT, and latitude/longitude lists on distinct, toggleable layers.

## Features

### Core Functionality
- **Direct Data Input**: Paste geospatial data directly onto the page or drag and drop files to create new map layers
- **Interactive Map Display**: Powered by MapLibre GL JS for smooth, responsive map interactions
- **Multi-format Support**:
  - **GeoJSON**: Full support for GeoJSON objects with automatic validation
  - **Encoded Polyline**: Support for encoded polyline strings with optional backslash unescaping
  - **WKT**: Well-Known Text representation support
  - **Lat/Lng Lists**: CSV-like coordinate lists with auto-detection of separators

### Layer Management
- **Right Sidebar**: Overlay sidebar for managing all data layers
- **Toggleable Layers**: Show/hide individual layers with visibility controls
- **Smart Color Assignment**: 
  - Single layer: Uses GeoJSON styling properties if available
  - Multiple layers: Color-coded with customizable color pills
- **Auto-detection**: Automatically identifies and parses data format types
- **Local Storage**: Layers persist across browser sessions

### Advanced Options
- **Polyline Options**: Toggle backslash unescaping (auto-enabled for strings containing `\\`)
- **Coordinate Options**: Swap latitude/longitude values for coordinate lists
- **Map Fitting**: Automatically adjusts view to show all visible layers

## Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd GeoHelperTool/geohelpertool
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to the local development URL (typically `http://localhost:5173`)

### Building for Production

To create a single-file HTML build:

```bash
npm run build
```

The built application will be available in the `dist/` directory as a self-contained HTML file that can run in any modern browser without a web server.

## Usage

### Adding Data Layers

1. **Paste Data**: Simply paste your geospatial data anywhere on the page
2. **Drag & Drop**: Drop files containing geospatial data onto the application
3. **Auto-Detection**: The app automatically detects the format and creates a new layer

### Managing Layers

Each layer in the sidebar includes:
- **Data Preview**: Text field showing the input data
- **Color Selection**: Dropdown with colored emoji options
- **Type-Specific Options**: Format-specific toggles and settings
- **Visibility Toggle**: Show/hide the layer on the map

### Supported Data Formats

#### GeoJSON
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-73.9857, 40.7484]
  },
  "properties": {
    "name": "Times Square"
  }
}
```

#### Encoded Polyline
```
_p~iF~ps|U_ulLnnqC_mqNvxq`@
```

#### WKT (Well-Known Text)
```
POINT(-73.9857 40.7484)
```

#### Lat/Lng Lists
```
40.7484,-73.9857
40.7505,-73.9934
40.7514,-73.9857
```

## Development

### Project Structure

```
geohelpertool/
├── src/
│   ├── components/          # React components
│   │   ├── MapComponent.tsx # Main map component
│   │   ├── Sidebar.tsx      # Layer management sidebar
│   │   └── ...
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── public/                 # Static assets
└── dist/                   # Built application
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Key Dependencies

- **React 19**: UI framework
- **MapLibre GL JS**: Map rendering engine
- **react-map-gl**: React wrapper for MapLibre
- **@mapbox/polyline**: Polyline encoding/decoding
- **@turf/bbox**: Bounding box calculations
- **geojson-validation**: GeoJSON validation
- **wkt**: WKT parsing

## Use Cases

### Primary User: Transit App Debugger
This tool is designed for developers and data analysts working with geographical data who need to:
- Validate bus routes and station locations
- Debug GeoJSON rendering issues
- Visualize encoded polylines from mapping APIs
- Compare multiple data sources on a single map
- Quickly prototype geospatial data visualizations

### Typical Workflow
1. Copy geospatial data from APIs, databases, or files
2. Paste directly into the application
3. Analyze shapes and locations on the interactive map
4. Toggle layer visibility to compare datasets
5. Adjust colors and options for better visual distinction

## Technical Architecture

### Frontend
- **React 19** with TypeScript for type safety
- **Component-based architecture** for maintainability
- **Context API** for state management
- **Custom hooks** for reusable logic

### Map Integration
- **MapLibre GL JS** for performant vector map rendering
- **react-map-gl** for React integration
- **Turf.js** utilities for geospatial calculations

### Data Processing
- **Automatic format detection** with fallback parsing
- **Normalization to GeoJSON** for consistent rendering
- **Validation and error handling** for robust data processing

### Deployment
- **Single HTML file** output via Vite bundling
- **No server dependencies** - runs entirely in browser
- **Local storage persistence** for session continuity

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run linting and tests
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.