declare module '@mapbox/polyline' {
  export function decode(polyline: string): number[][];
  export function encode(coordinates: number[][]): string;
}