import type { GeoJSON, FeatureCollection, Feature, Geometry } from 'geojson';
import { LayerType } from '../types/layer';
// @ts-ignore - No types available for geojson-validation
import { valid } from 'geojson-validation';
import { booleanValid } from '@turf/boolean-valid';
import * as polyline from '@mapbox/polyline';
import * as wkt from 'wkt';

export interface ParseResult {
  success: boolean;
  data?: GeoJSON;
  error?: string;
  errorCode?: string;
  errorDetails?: string;
  type?: 'FeatureCollection' | 'Feature' | 'Geometry';
  format?: LayerType;
  geometryCount?: number;
  isPartialGeoJSON?: boolean;
  styleProperties?: StyleProperties[];
}

export interface StyleProperties {
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  fill?: string;
  fillOpacity?: number;
  color?: string;
  weight?: number;
  opacity?: number;
  [key: string]: any;
}

export const ERROR_CODES = {
  INVALID_JSON: 'INVALID_JSON',
  INVALID_GEOJSON_SCHEMA: 'INVALID_GEOJSON_SCHEMA',
  INVALID_GEOMETRY: 'INVALID_GEOMETRY',
  UNSUPPORTED_TYPE: 'UNSUPPORTED_TYPE',
  MISSING_COORDINATES: 'MISSING_COORDINATES',
  MALFORMED_COORDINATES: 'MALFORMED_COORDINATES',
  FEATURE_GEOMETRY_ERROR: 'FEATURE_GEOMETRY_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PARSING_ERROR: 'PARSING_ERROR',
  POLYLINE_ERROR: 'POLYLINE_ERROR',
  WKT_ERROR: 'WKT_ERROR',
  LATLNG_LIST_ERROR: 'LATLNG_LIST_ERROR',
  AUTO_DETECTION_ERROR: 'AUTO_DETECTION_ERROR'
} as const;

function createErrorResult(
  error: string,
  errorCode: string,
  errorDetails?: string
): ParseResult {
  return {
    success: false,
    error,
    errorCode,
    errorDetails
  };
}

function getGeometryErrorSuggestion(geometryType: string): string {
  switch (geometryType) {
    case 'Point':
      return 'Point coordinates should be [longitude, latitude] as numbers.';
    case 'LineString':
      return 'LineString coordinates should be an array of [longitude, latitude] positions.';
    case 'Polygon':
      return 'Polygon coordinates should be an array of linear ring arrays, with the first ring being the exterior boundary.';
    case 'MultiPoint':
      return 'MultiPoint coordinates should be an array of Point coordinates.';
    case 'MultiLineString':
      return 'MultiLineString coordinates should be an array of LineString coordinate arrays.';
    case 'MultiPolygon':
      return 'MultiPolygon coordinates should be an array of Polygon coordinate arrays.';
    default:
      return 'Please check the GeoJSON specification for proper coordinate formatting.';
  }
}

function isGeometryObject(obj: any): boolean {
  const geometryTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'];
  return obj && typeof obj === 'object' && geometryTypes.indexOf(obj.type) !== -1 && 
         (obj.coordinates || obj.type === 'GeometryCollection');
}

export function extractStyleProperties(properties: any): StyleProperties {
  if (!properties || typeof properties !== 'object') {
    return {};
  }

  const style: StyleProperties = {};

  // Standard GeoJSON styling properties
  if (properties.stroke) style.stroke = properties.stroke;
  if (properties['stroke-width']) style.strokeWidth = properties['stroke-width'];
  if (properties['stroke-opacity']) style.strokeOpacity = properties['stroke-opacity'];
  if (properties.fill) style.fill = properties.fill;
  if (properties['fill-opacity']) style.fillOpacity = properties['fill-opacity'];

  // Mapbox/Leaflet style properties
  if (properties.color) style.color = properties.color;
  if (properties.weight) style.weight = properties.weight;
  if (properties.opacity) style.opacity = properties.opacity;
  if (properties.fillColor) style.fill = properties.fillColor;
  if (properties.fillOpacity) style.fillOpacity = properties.fillOpacity;

  // Alternative naming conventions
  if (properties.strokeColor) style.stroke = properties.strokeColor;
  if (properties.strokeWeight) style.strokeWidth = properties.strokeWeight;
  if (properties.lineColor) style.stroke = properties.lineColor;
  if (properties.lineWidth) style.strokeWidth = properties.lineWidth;

  // Normalize common patterns
  if (properties.style) {
    const styleObj = properties.style;
    if (typeof styleObj === 'object') {
      const nestedStyle = extractStyleProperties(styleObj);
      for (const key in nestedStyle) {
        if (nestedStyle.hasOwnProperty(key)) {
          style[key] = nestedStyle[key];
        }
      }
    }
  }

  // Copy any other properties that might be styling-related
  const otherStyleProps = ['marker-color', 'marker-size', 'marker-symbol'];
  for (let i = 0; i < otherStyleProps.length; i++) {
    const prop = otherStyleProps[i];
    if (properties[prop]) {
      style[prop] = properties[prop];
    }
  }

  return style;
}

function extractAllStyleProperties(geoJson: GeoJSON): StyleProperties[] {
  const styles: StyleProperties[] = [];

  if (geoJson.type === 'FeatureCollection') {
    const featureCollection = geoJson as FeatureCollection;
    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i];
      if (feature.properties) {
        styles.push(extractStyleProperties(feature.properties));
      }
    }
  } else if (geoJson.type === 'Feature') {
    const feature = geoJson as Feature;
    if (feature.properties) {
      styles.push(extractStyleProperties(feature.properties));
    }
  }

  return styles;
}

export function parsePolyline(input: string, options: { unescape?: boolean; } = { unescape: true }): ParseResult {
  try {
    var cleanInput = input.trim();
    
    if (!cleanInput) {
      return createErrorResult(
        'Empty polyline string',
        ERROR_CODES.POLYLINE_ERROR,
        'Polyline string cannot be empty'
      );
    }

    if (options.unescape) {
      cleanInput = cleanInput.replace(/\\(.)/g, '$1');
    }

    // Decode the polyline
    const coordinates = polyline.decode(cleanInput);
    
    if (!coordinates || coordinates.length === 0) {
      return createErrorResult(
        'Failed to decode polyline',
        ERROR_CODES.POLYLINE_ERROR,
        'Polyline string appears to be invalid or corrupted'
      );
    }

    // Validate and convert coordinates
    const validatedCoordinates = coordinates.map((coord: number[], index: number) => {
      const lat = coord[0];
      const lng = coord[1];
      
      // Validate latitude range
      if (lat < -90 || lat > 90) {
        throw new Error(`Invalid latitude at coordinate ${index}: ${lat}. Must be between -90 and 90.`);
      }
      
      // Validate longitude range  
      if (lng < -180 || lng > 180) {
        throw new Error(`Invalid longitude at coordinate ${index}: ${lng}. Must be between -180 and 180.`);
      }
      
      return [lng, lat]; // Convert lat,lng to lng,lat for GeoJSON
    });

    // Convert to GeoJSON LineString
    const lineString: Feature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: validatedCoordinates
      },
      properties: {}
    };

    return {
      success: true,
      data: lineString,
      type: 'Feature',
      format: LayerType.POLYLINE,
      geometryCount: 1,
      styleProperties: []
    };
  } catch (error) {
    return createErrorResult(
      `Polyline parsing failed: ${error}`,
      ERROR_CODES.POLYLINE_ERROR,
      'Failed to parse encoded polyline string. Please verify the polyline format.'
    );
  }
}

export function parseWKT(input: string): ParseResult {
  try {
    const cleanInput = input.trim();
    
    if (!cleanInput) {
      return createErrorResult(
        'Empty WKT string',
        ERROR_CODES.WKT_ERROR,
        'WKT string cannot be empty'
      );
    }

    // Parse WKT string
    const parsed = wkt.parse(cleanInput);
    
    if (!parsed) {
      return createErrorResult(
        'Failed to parse WKT',
        ERROR_CODES.WKT_ERROR,
        'WKT string appears to be invalid or unsupported'
      );
    }

    // Convert to GeoJSON Feature
    const feature: Feature = {
      type: 'Feature',
      geometry: parsed as Geometry,
      properties: {}
    };

    // Validate the resulting geometry
    try {
      if (!booleanValid(feature.geometry)) {
        return createErrorResult(
          'Invalid geometry from WKT',
          ERROR_CODES.WKT_ERROR,
          'WKT parsed successfully but resulted in invalid geometry'
        );
      }
    } catch (validationError) {
      return createErrorResult(
        `WKT geometry validation failed: ${validationError}`,
        ERROR_CODES.WKT_ERROR,
        'Failed to validate geometry parsed from WKT'
      );
    }

    return {
      success: true,
      data: feature,
      type: 'Feature',
      format: LayerType.WKT,
      geometryCount: 1,
      styleProperties: []
    };
  } catch (error) {
    return createErrorResult(
      `WKT parsing failed: ${error}`,
      ERROR_CODES.WKT_ERROR,
      'Failed to parse WKT string. Please verify the WKT format.'
    );
  }
}

export function parseLatLngList(input: string): ParseResult {
  try {
    const cleanInput = input.trim();
    
    if (!cleanInput) {
      return createErrorResult(
        'Empty lat/lng list',
        ERROR_CODES.LATLNG_LIST_ERROR,
        'Lat/lng list cannot be empty'
      );
    }

    // Extract all numbers from the input
    const numbers = cleanInput.match(/-?\d+\.?\d*/g);
    if (!numbers || numbers.length === 0) {
      return createErrorResult(
        'No valid numbers found',
        ERROR_CODES.LATLNG_LIST_ERROR,
        'Could not find any valid coordinate numbers in the input'
      );
    }

    if (numbers.length % 2 !== 0) {
      return createErrorResult(
        'Odd number of coordinates',
        ERROR_CODES.LATLNG_LIST_ERROR,
        `Found ${numbers.length} numbers, but coordinates must come in pairs (latitude, longitude)`
      );
    }

    const coordinates: number[][] = [];

    // Process numbers in pairs
    for (let i = 0; i < numbers.length; i += 2) {
      const lat = parseFloat(numbers[i]);
      const lng = parseFloat(numbers[i + 1]);

      if (isNaN(lat) || isNaN(lng)) {
        return createErrorResult(
          'Invalid coordinate values',
          ERROR_CODES.LATLNG_LIST_ERROR,
          `Coordinate values must be valid numbers. Found: lat=${lat}, lng=${lng}`
        );
      }

      // Validate lat/lng ranges
      if (lat < -90 || lat > 90) {
        return createErrorResult(
          'Invalid latitude value',
          ERROR_CODES.LATLNG_LIST_ERROR,
          `Latitude must be between -90 and 90. Found: ${lat}`
        );
      }

      if (lng < -180 || lng > 180) {
        return createErrorResult(
          'Invalid longitude value',
          ERROR_CODES.LATLNG_LIST_ERROR,
          `Longitude must be between -180 and 180. Found: ${lng}`
        );
      }

      coordinates.push([lng, lat]); // Convert to GeoJSON format (lng, lat)
    }

    if (coordinates.length === 0) {
      return createErrorResult(
        'No valid coordinates found',
        ERROR_CODES.LATLNG_LIST_ERROR,
        'No valid coordinate pairs could be parsed from the input'
      );
    }

    const features: Feature[] = coordinates.map((coord, index) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: coord
      },
      properties: {
        index: index + 1 // Add index for identification
      }
    }));

    const featureCollection: FeatureCollection = {
      type: 'FeatureCollection',
      features
    };

    return {
      success: true,
      data: featureCollection,
      type: 'FeatureCollection',
      format: LayerType.COORDINATES,
      geometryCount: coordinates.length,
      styleProperties: []
    };
  } catch (error) {
    return createErrorResult(
      `Lat/lng list parsing failed: ${error}`,
      ERROR_CODES.LATLNG_LIST_ERROR,
      'Failed to parse lat/lng list. Please verify the format.'
    );
  }
}


export function parseMultiFormat(input: string, options?: { unescape?: boolean }): ParseResult {
  try {
    const cleanInput = input.trim();
    
    if (!cleanInput) {
      return createErrorResult(
        'Empty input',
        ERROR_CODES.AUTO_DETECTION_ERROR,
        'Input cannot be empty'
      );
    }

    // Try parsing with each format in order of likelihood until one succeeds
    const formats = [
      { name: 'GeoJSON', parser: () => parseGeoJSON(cleanInput) },
      { name: 'Lat/Lng List', parser: () => parseLatLngList(cleanInput) },
      { name: 'WKT', parser: () => parseWKT(cleanInput) },
      { name: 'Polyline', parser: () => parsePolyline(cleanInput, { unescape: options?.unescape }) },
    ];
    
    const errors: string[] = [];
    
    for (const format of formats) {
      const result = format.parser();
      if (result.success) {
        return result;
      }
      errors.push(`${format.name}: ${result.error}`);
    }
    
    return createErrorResult(
      'Unable to parse input',
      ERROR_CODES.AUTO_DETECTION_ERROR,
      `Unable to parse input as any supported format. Tried: ${errors.join('; ')}`
    );
  } catch (error) {
    return createErrorResult(
      `Multi-format parsing failed: ${error}`,
      ERROR_CODES.AUTO_DETECTION_ERROR,
      'An unexpected error occurred during parsing'
    );
  }
}

export function parsePartialGeoJSON(input: string | object): ParseResult {
  try {
    // Parse JSON if input is a string
    let parsedData: any;
    if (typeof input === 'string') {
      try {
        parsedData = JSON.parse(input);
      } catch (jsonError) {
        return createErrorResult(
          'Invalid JSON format',
          ERROR_CODES.INVALID_JSON,
          `JSON parsing failed. Please check for syntax errors such as missing quotes, commas, or brackets. Error: ${jsonError}`
        );
      }
    } else {
      parsedData = input;
    }

    // Check if it's a standalone geometry object
    if (isGeometryObject(parsedData)) {
      // Validate the geometry
      try {
        if (!booleanValid(parsedData as Geometry)) {
          const suggestion = getGeometryErrorSuggestion(parsedData.type);
          return createErrorResult(
            'Invalid geometry: coordinates are not valid',
            ERROR_CODES.INVALID_GEOMETRY,
            `The ${parsedData.type} geometry has invalid coordinates. ${suggestion}`
          );
        }
      } catch (geometryError) {
        const suggestion = getGeometryErrorSuggestion(parsedData.type);
        return createErrorResult(
          `Geometry validation failed: ${geometryError}`,
          ERROR_CODES.VALIDATION_ERROR,
          `Failed to validate ${parsedData.type} geometry. ${suggestion}`
        );
      }

      // Wrap standalone geometry in a Feature
      const feature: Feature = {
        type: 'Feature',
        geometry: parsedData as Geometry,
        properties: {}
      };

      // Extract style properties (empty for partial GeoJSON)
      const styleProperties = extractAllStyleProperties(feature);

      return {
        success: true,
        data: feature,
        type: 'Feature',
        format: LayerType.GEOJSON,
        geometryCount: 1,
        isPartialGeoJSON: true,
        styleProperties
      };
    }

    // If it's not a geometry object, return error
    return createErrorResult(
      'Input is not a valid partial GeoJSON (standalone geometry)',
      ERROR_CODES.UNSUPPORTED_TYPE,
      'The input must be a valid geometry object (Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon, or GeometryCollection) with proper coordinates.'
    );

  } catch (error) {
    return createErrorResult(
      `Partial parsing failed: ${error}`,
      ERROR_CODES.PARSING_ERROR,
      'An unexpected error occurred during partial GeoJSON parsing. Please check your input format.'
    );
  }
}

export function parseGeoJSON(input: string | object): ParseResult {
  try {
    // Parse JSON if input is a string
    let parsedData: any;
    if (typeof input === 'string') {
      try {
        parsedData = JSON.parse(input);
      } catch (jsonError) {
        return createErrorResult(
          'Invalid JSON format',
          ERROR_CODES.INVALID_JSON,
          `JSON parsing failed. Please check for syntax errors such as missing quotes, commas, or brackets. Error: ${jsonError}`
        );
      }
    } else {
      parsedData = input;
    }

    // Basic GeoJSON structure validation (more lenient)
    const isValidGeoJSON = (data: any): boolean => {
      if (!data || typeof data !== 'object') return false;
      
      const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection', 'Feature', 'FeatureCollection'];
      
      if (!validTypes.includes(data.type)) return false;
      
      if (data.type === 'FeatureCollection') {
        return Array.isArray(data.features);
      } else if (data.type === 'Feature') {
        return data.geometry && validTypes.includes(data.geometry.type);
      } else {
        return data.coordinates !== undefined || data.geometries !== undefined;
      }
    };

    // Try lenient validation first
    if (!isValidGeoJSON(parsedData)) {
      // Try strict validation for better error messages
      const validationResult = valid(parsedData);
      if (!validationResult.valid) {
        // If both fail, try partial GeoJSON parsing
        const partialResult = parsePartialGeoJSON(parsedData);
        if (partialResult.success) {
          return partialResult;
        }
        
        const errors = validationResult.errors?.join(', ') || 'Unknown validation error';
        return createErrorResult(
          `Invalid GeoJSON: ${errors}`,
          ERROR_CODES.INVALID_GEOJSON_SCHEMA,
          `The input does not conform to the GeoJSON specification. Common issues: missing 'type' property, invalid type value, or incorrect structure. Errors: ${errors}`
        );
      }
    }

    // Additional geometry validation for geometries
    if (parsedData.type === 'Point' || parsedData.type === 'LineString' || 
        parsedData.type === 'Polygon' || parsedData.type === 'MultiPoint' ||
        parsedData.type === 'MultiLineString' || parsedData.type === 'MultiPolygon' ||
        parsedData.type === 'GeometryCollection') {
      
      try {
        if (!booleanValid(parsedData as Geometry)) {
          const suggestion = getGeometryErrorSuggestion(parsedData.type);
          return createErrorResult(
            'Invalid geometry: coordinates are not valid',
            ERROR_CODES.INVALID_GEOMETRY,
            `The ${parsedData.type} geometry has invalid coordinates. ${suggestion}`
          );
        }
      } catch (geometryError) {
        const suggestion = getGeometryErrorSuggestion(parsedData.type);
        return createErrorResult(
          `Geometry validation failed: ${geometryError}`,
          ERROR_CODES.VALIDATION_ERROR,
          `Failed to validate ${parsedData.type} geometry. ${suggestion}`
        );
      }
    }

    // Validate geometries in Features and FeatureCollections
    if (parsedData.type === 'Feature') {
      const feature = parsedData as Feature;
      if (feature.geometry) {
        try {
          if (!booleanValid(feature.geometry)) {
            const suggestion = getGeometryErrorSuggestion(feature.geometry.type);
            return createErrorResult(
              'Invalid geometry in feature',
              ERROR_CODES.FEATURE_GEOMETRY_ERROR,
              `The Feature contains a ${feature.geometry.type} geometry with invalid coordinates. ${suggestion}`
            );
          }
        } catch (geometryError) {
          const geometryType = feature.geometry?.type || 'unknown';
          const suggestion = getGeometryErrorSuggestion(geometryType);
          return createErrorResult(
            `Feature geometry validation failed: ${geometryError}`,
            ERROR_CODES.FEATURE_GEOMETRY_ERROR,
            `Failed to validate the ${geometryType} geometry in Feature. ${suggestion}`
          );
        }
      }
    }

    if (parsedData.type === 'FeatureCollection') {
      const featureCollection = parsedData as FeatureCollection;
      for (let i = 0; i < featureCollection.features.length; i++) {
        const feature = featureCollection.features[i];
        if (feature.geometry) {
          try {
            if (!booleanValid(feature.geometry)) {
              const suggestion = getGeometryErrorSuggestion(feature.geometry.type);
              return createErrorResult(
                `Invalid geometry in feature ${i}`,
                ERROR_CODES.FEATURE_GEOMETRY_ERROR,
                `Feature ${i} contains a ${feature.geometry.type} geometry with invalid coordinates. ${suggestion}`
              );
            }
          } catch (geometryError) {
            const geometryType = feature.geometry?.type || 'unknown';
            const suggestion = getGeometryErrorSuggestion(geometryType);
            return createErrorResult(
              `Feature ${i} geometry validation failed: ${geometryError}`,
              ERROR_CODES.FEATURE_GEOMETRY_ERROR,
              `Failed to validate the ${geometryType} geometry in Feature ${i}. ${suggestion}`
            );
          }
        }
      }
    }

    // Count geometries for reporting
    let geometryCount = 0;
    if (parsedData.type === 'FeatureCollection') {
      geometryCount = (parsedData as FeatureCollection).features.length;
    } else if (parsedData.type === 'Feature') {
      geometryCount = 1;
    } else if (parsedData.type === 'GeometryCollection') {
      geometryCount = (parsedData as { geometries: unknown[] }).geometries.length;
    } else {
      geometryCount = 1;
    }

    // Extract style properties
    const styleProperties = extractAllStyleProperties(parsedData as GeoJSON);

    return {
      success: true,
      data: parsedData as GeoJSON,
      type: parsedData.type as 'FeatureCollection' | 'Feature' | 'Geometry',
      format: LayerType.GEOJSON,
      geometryCount,
      styleProperties
    };

  } catch (error) {
    return createErrorResult(
      `Parsing failed: ${error}`,
      ERROR_CODES.PARSING_ERROR,
      'An unexpected error occurred during GeoJSON parsing. Please check your input format and try again.'
    );
  }
}