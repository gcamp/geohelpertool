declare module 'wkt' {
  export function parse(wkt: string): unknown;
  export function stringify(geojson: unknown): string;
}