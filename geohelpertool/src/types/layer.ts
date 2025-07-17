// @ts-expect-error - Used in type annotations
import type { GeoJSON } from 'geojson';

export const LayerType = {
  GEOJSON: 'geojson',
  KML: 'kml',
  COORDINATES: 'coordinates',
  WKT: 'wkt',
  POLYLINE: 'polyline'
} as const;

export type LayerType = typeof LayerType[keyof typeof LayerType];

export const ColorPalette = {
  BLUE: '🔵',
  GREEN: '🟢',
  RED: '🔴',
  YELLOW: '🟡',
  PURPLE: '🟣',
  ORANGE: '🟠'
} as const;

export type ColorPalette = typeof ColorPalette[keyof typeof ColorPalette];

export interface LayerOptions {
  strokeWidth?: number;
  strokeOpacity?: number;
  fillOpacity?: number;
  pointRadius?: number;
  showLabels?: boolean;
  labelField?: string;
  reverseCoordinates?: boolean;
  unescape?: boolean;
  [key: string]: unknown;
}

export interface Layer {
  id: string;
  data: GeoJSON.FeatureCollection;
  originalContent?: string;
  color: ColorPalette;
  visibility: boolean;
  type: LayerType;
  options: LayerOptions;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LayerState {
  layers: Layer[];
  activeLayerId: string | null;
  layerCount: number;
}

export type LayerAction = 
  | { type: 'ADD_LAYER'; payload: Omit<Layer, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'REMOVE_LAYER'; payload: { id: string } }
  | { type: 'UPDATE_LAYER'; payload: { id: string; updates: Partial<Layer> } }
  | { type: 'TOGGLE_VISIBILITY'; payload: { id: string } }
  | { type: 'UPDATE_COLOR'; payload: { id: string; color: ColorPalette } }
  | { type: 'UPDATE_OPTIONS'; payload: { id: string; options: Partial<LayerOptions> } }
  | { type: 'SET_ACTIVE_LAYER'; payload: { id: string | null } }
  | { type: 'CLEAR_LAYERS' };