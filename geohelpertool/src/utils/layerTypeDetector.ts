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
  const layerOptions = {};
  
  const parseOptions = undefined;
  const parseResult = parseMultiFormat(content, parseOptions);
  
  // Use the format from the parse result, or default to GEOJSON
  const layerType: LayerTypeEnum = parseResult.format || LayerType.GEOJSON;
  
  return {
    layerType,
    layerOptions,
    parseOptions,
    parseResult
  };
}