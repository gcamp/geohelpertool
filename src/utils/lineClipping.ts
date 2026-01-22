import lineSliceAlong from '@turf/line-slice-along';
import length from '@turf/length';
import type { Feature, FeatureCollection, LineString, MultiLineString } from 'geojson';

export interface ClipResult {
  success: boolean;
  data?: FeatureCollection;
  error?: string;
}

/**
 * Clips a LineString FeatureCollection to show only the first X% of each line
 */
export function clipLinesByProgress(
  featureCollection: FeatureCollection,
  progressPercent: number
): ClipResult {
  if (progressPercent < 0 || progressPercent > 100) {
    return {
      success: false,
      error: 'Progress must be between 0 and 100'
    };
  }

  // At 100%, return original data
  if (progressPercent === 100) {
    return {
      success: true,
      data: featureCollection
    };
  }

  try {
    const clippedFeatures = featureCollection.features.map(feature => {
      if (!feature.geometry) {
        return feature;
      }

      const geomType = feature.geometry.type;

      // Only process LineString and MultiLineString
      if (geomType !== 'LineString' && geomType !== 'MultiLineString') {
        return feature;
      }

      if (geomType === 'LineString') {
        return clipLineString(feature as Feature<LineString>, progressPercent);
      } else {
        return clipMultiLineString(feature as Feature<MultiLineString>, progressPercent);
      }
    });

    return {
      success: true,
      data: {
        type: 'FeatureCollection',
        features: clippedFeatures
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error clipping lines'
    };
  }
}

function clipLineString(
  feature: Feature<LineString>,
  progressPercent: number
): Feature<LineString> {
  // At 0%, return start point as a very short line
  if (progressPercent === 0) {
    const coords = feature.geometry.coordinates;
    if (coords.length < 2) return feature;

    return {
      ...feature,
      geometry: {
        type: 'LineString',
        coordinates: [coords[0], coords[0]]
      }
    };
  }

  const totalLength = length(feature, { units: 'kilometers' });
  const targetLength = (totalLength * progressPercent) / 100;

  try {
    const sliced = lineSliceAlong(feature, 0, targetLength, { units: 'kilometers' });
    return sliced as Feature<LineString>;
  } catch {
    // If slicing fails (e.g., line too short), return original
    return feature;
  }
}

function clipMultiLineString(
  feature: Feature<MultiLineString>,
  progressPercent: number
): Feature<MultiLineString> {
  // Convert MultiLineString to individual LineStrings, clip each, then recombine
  const lineStrings = feature.geometry.coordinates.map(coords => ({
    type: 'Feature' as const,
    properties: feature.properties,
    geometry: {
      type: 'LineString' as const,
      coordinates: coords
    }
  }));

  const clippedLines = lineStrings.map(line =>
    clipLineString(line as Feature<LineString>, progressPercent)
  );

  return {
    ...feature,
    geometry: {
      type: 'MultiLineString',
      coordinates: clippedLines.map(line => line.geometry.coordinates)
    }
  };
}
