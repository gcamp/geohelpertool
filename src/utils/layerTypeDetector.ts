import { parseMultiFormat, type ParseResult } from './geoJsonParser';
import { LayerType } from '../types/layer';
import type { LayerType as LayerTypeEnum } from '../types/layer';

export interface LayerDetectionResult {
  layerType: LayerTypeEnum;
  layerOptions: Record<string, unknown>;
  parseOptions?: Record<string, unknown>;
  parseResult: ParseResult;
}

export function detectAndParseLayer(content: string): LayerDetectionResult {
  const layerOptions: Record<string, unknown> = {};

  const parseOptions = undefined;
  const parseResult = parseMultiFormat(content, parseOptions);

  // Use the format from the parse result, or default to GEOJSON
  const layerType: LayerTypeEnum = parseResult.format || LayerType.GEOJSON;

  // Set default options based on layer type to match parsing defaults
  if (layerType === LayerType.POLYLINE) {
    layerOptions.unescape = true; // parsePolyline defaults to unescape: true
  }

  return {
    layerType,
    layerOptions,
    parseOptions,
    parseResult
  };
}