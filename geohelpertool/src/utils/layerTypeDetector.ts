import { detectDataType, parseMultiFormat } from './geoJsonParser';
import { LayerType } from '../types/layer';
import type { LayerType as LayerTypeEnum } from '../types/layer';

export interface LayerDetectionResult {
  layerType: LayerTypeEnum;
  layerOptions: Record<string, any>;
  parseOptions?: Record<string, any>;
  parseResult: any;
}

export function detectAndParseLayer(content: string): LayerDetectionResult {
  const detectedType = detectDataType(content);
  let layerType: LayerTypeEnum = LayerType.GEOJSON;
  let layerOptions = {};
  
  if (detectedType === 'latlng') layerType = LayerType.COORDINATES;
  else if (detectedType === 'wkt') layerType = LayerType.WKT;
  else if (detectedType === 'polyline') {
    layerType = LayerType.POLYLINE;
    layerOptions = { unescapeForwardSlashes: content.indexOf('//') !== -1 };
  }
  
  const parseOptions = detectedType === 'polyline' ? { unescapeForwardSlashes: (layerOptions as any).unescapeForwardSlashes } : undefined;
  const parseResult = parseMultiFormat(content, parseOptions);
  
  return {
    layerType,
    layerOptions,
    parseOptions,
    parseResult
  };
}