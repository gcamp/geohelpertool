import { describe, it, expect } from 'vitest';
import { clipLinesByProgress } from '../lineClipping';
import type { FeatureCollection, LineString, MultiLineString } from 'geojson';

describe('clipLinesByProgress', () => {
  const simpleLineString: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 2],
            [3, 3]
          ]
        }
      }
    ]
  };

  it('returns original data at 100%', () => {
    const result = clipLinesByProgress(simpleLineString, 100);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(simpleLineString);
  });

  it('returns start point at 0%', () => {
    const result = clipLinesByProgress(simpleLineString, 0);
    expect(result.success).toBe(true);
    expect(result.data?.features[0].geometry.coordinates).toHaveLength(2);
    expect(result.data?.features[0].geometry.coordinates[0]).toEqual([0, 0]);
    expect(result.data?.features[0].geometry.coordinates[1]).toEqual([0, 0]);
  });

  it('clips line to approximately 50%', () => {
    const result = clipLinesByProgress(simpleLineString, 50);
    expect(result.success).toBe(true);
    expect(result.data?.features[0].geometry.type).toBe('LineString');
    const coords = (result.data?.features[0].geometry as LineString).coordinates;
    expect(coords.length).toBeGreaterThan(1);
    expect(coords.length).toBeLessThanOrEqual(4);
  });

  it('rejects invalid progress values', () => {
    expect(clipLinesByProgress(simpleLineString, -1).success).toBe(false);
    expect(clipLinesByProgress(simpleLineString, 101).success).toBe(false);
  });

  it('handles MultiLineString geometries', () => {
    const multiLineString: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'MultiLineString',
            coordinates: [
              [[0, 0], [1, 1]],
              [[2, 2], [3, 3]]
            ]
          }
        }
      ]
    };

    const result = clipLinesByProgress(multiLineString, 50);
    expect(result.success).toBe(true);
    expect(result.data?.features[0].geometry.type).toBe('MultiLineString');
  });

  it('ignores non-LineString geometries', () => {
    const mixedGeometry: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: [0, 0]
          }
        },
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [1, 1]]
          }
        }
      ]
    };

    const result = clipLinesByProgress(mixedGeometry, 50);
    expect(result.success).toBe(true);
    expect(result.data?.features).toHaveLength(2);
    expect(result.data?.features[0].geometry.type).toBe('Point');
  });
});
