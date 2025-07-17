import { describe, it, expect } from 'vitest'
import { parseLatLngList, ERROR_CODES } from '../geoJsonParser'
import { LayerType } from '../../types/layer'

describe('parseLatLngList', () => {
  describe('valid lat/lng list parsing', () => {
    it('should parse comma-separated lat/lng pairs', () => {
      const coordList = '40.7484,-73.9857,40.7128,-74.0059,40.7130,-74.0060'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      expect(result.format).toBe(LayerType.COORDINATES)
      expect(result.type).toBe('FeatureCollection')
      expect(result.geometryCount).toBe(3)
      
      const featureCollection = result.data
      expect(featureCollection.type).toBe('FeatureCollection')
      expect(featureCollection.features).toHaveLength(3)
      
      // Check first point (converted to lng,lat format for GeoJSON)
      expect(featureCollection.features[0].geometry).toEqual({
        type: 'Point',
        coordinates: [-73.9857, 40.7484]  // [lng, lat]
      })
      expect(featureCollection.features[0].properties.index).toBe(1)
    })

    it('should parse space-separated lat/lng pairs', () => {
      const coordList = '40.7484 -73.9857 40.7128 -74.0059'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      expect(result.geometryCount).toBe(2)
      
      const features = result.data.features
      expect(features[0].geometry.coordinates).toEqual([-73.9857, 40.7484])
      expect(features[1].geometry.coordinates).toEqual([-74.0059, 40.7128])
    })

    it('should parse mixed separators (comma, space, semicolon)', () => {
      const coordList = '40.7484,-73.9857; 40.7128, -74.0059'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      expect(result.geometryCount).toBe(2)
    })

    it('should handle newline-separated coordinates', () => {
      const coordList = `40.7484,-73.9857
40.7128,-74.0059
40.7130,-74.0060`
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      expect(result.geometryCount).toBe(3)
    })

    it('should parse coordinates with decimal precision', () => {
      const coordList = '40.748400,-73.985700,40.712800,-74.005900'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      expect(result.data.features[0].geometry.coordinates).toEqual([-73.985700, 40.748400])
    })

    it('should parse negative coordinates', () => {
      const coordList = '-40.7484,73.9857,-40.7128,74.0059'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      expect(result.data.features[0].geometry.coordinates).toEqual([73.9857, -40.7484])
      expect(result.data.features[1].geometry.coordinates).toEqual([74.0059, -40.7128])
    })

    it('should handle coordinates at extremes', () => {
      const coordList = '90,180,-90,-180'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      expect(result.data.features[0].geometry.coordinates).toEqual([180, 90])
      expect(result.data.features[1].geometry.coordinates).toEqual([-180, -90])
    })

    it('should parse single coordinate pair', () => {
      const coordList = '40.7484,-73.9857'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      expect(result.geometryCount).toBe(1)
      expect(result.data.features).toHaveLength(1)
    })
  })

  describe('error handling', () => {
    it('should handle empty input', () => {
      const result = parseLatLngList('')
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.LATLNG_LIST_ERROR)
      expect(result.error).toContain('Empty lat/lng list')
    })

    it('should handle whitespace-only input', () => {
      const result = parseLatLngList('   \n\t   ')
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.LATLNG_LIST_ERROR)
      expect(result.error).toContain('Empty lat/lng list')
    })

    it('should handle odd number of coordinates', () => {
      const coordList = '40.7484,-73.9857,40.7128'  // Missing longitude for second point
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.LATLNG_LIST_ERROR)
      expect(result.error).toContain('Odd number of coordinates')
    })

    it('should handle non-numeric values', () => {
      const coordList = 'not_a_number,-73.9857'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.LATLNG_LIST_ERROR)
      // The error could be either "No valid numbers found" or "Odd number of coordinates"
      // depending on how the regex extracts partial numbers
      expect(result.error).toMatch(/No valid numbers found|Odd number of coordinates/)
    })

    it('should handle latitude out of range', () => {
      const coordList = '100,-73.9857'  // Latitude > 90
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.LATLNG_LIST_ERROR)
      expect(result.error).toContain('Invalid latitude value')
    })

    it('should handle negative latitude out of range', () => {
      const coordList = '-100,-73.9857'  // Latitude < -90
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.LATLNG_LIST_ERROR)
      expect(result.error).toContain('Invalid latitude value')
    })

    it('should handle longitude out of range', () => {
      const coordList = '40.7484,200'  // Longitude > 180
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.LATLNG_LIST_ERROR)
      expect(result.error).toContain('Invalid longitude value')
    })

    it('should handle negative longitude out of range', () => {
      const coordList = '40.7484,-200'  // Longitude < -180
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.LATLNG_LIST_ERROR)
      expect(result.error).toContain('Invalid longitude value')
    })

    it('should handle mixed valid and invalid coordinates', () => {
      const coordList = '40.7484,-73.9857,100,200'  // First pair valid, second invalid
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.LATLNG_LIST_ERROR)
    })

    it('should handle text with no numbers', () => {
      const coordList = 'this has no numbers at all'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.LATLNG_LIST_ERROR)
      expect(result.error).toContain('No valid numbers found')
    })
  })

  describe('output format validation', () => {
    it('should produce correctly formatted GeoJSON FeatureCollection', () => {
      const coordList = '40.7484,-73.9857,40.7128,-74.0059'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      
      const featureCollection = result.data
      expect(featureCollection).toMatchObject({
        type: 'FeatureCollection',
        features: expect.any(Array)
      })
      
      featureCollection.features.forEach((feature: { type: string; geometry: { type: string; coordinates: unknown }; properties: { index: number } }, index: number) => {
        expect(feature).toMatchObject({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: expect.any(Array)
          },
          properties: {
            index: index + 1
          }
        })
      })
    })

    it('should include empty styleProperties array', () => {
      const coordList = '40.7484,-73.9857'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      expect(result.styleProperties).toEqual([])
    })

    it('should correctly set metadata fields', () => {
      const coordList = '40.7484,-73.9857,40.7128,-74.0059'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      expect(result.type).toBe('FeatureCollection')
      expect(result.format).toBe(LayerType.COORDINATES)
      expect(result.geometryCount).toBe(2)
      expect(result.isPartialGeoJSON).toBeUndefined()
    })

    it('should add index property to each feature', () => {
      const coordList = '40.7484,-73.9857,40.7128,-74.0059,40.7130,-74.0060'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      
      const features = result.data.features
      expect(features[0].properties.index).toBe(1)
      expect(features[1].properties.index).toBe(2)
      expect(features[2].properties.index).toBe(3)
    })
  })

  describe('coordinate format validation', () => {
    it('should convert lat,lng input to lng,lat GeoJSON format', () => {
      const coordList = '40.7484,-73.9857'  // Input: lat,lng
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      
      // Output should be lng,lat for GeoJSON
      expect(result.data.features[0].geometry.coordinates).toEqual([-73.9857, 40.7484])
    })

    it('should handle integer coordinates', () => {
      const coordList = '40,-73,41,-74'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      expect(result.data.features[0].geometry.coordinates).toEqual([-73, 40])
      expect(result.data.features[1].geometry.coordinates).toEqual([-74, 41])
    })

    it('should preserve coordinate precision', () => {
      const coordList = '40.123456789,-73.987654321'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      expect(result.data.features[0].geometry.coordinates).toEqual([-73.987654321, 40.123456789])
    })
  })

  describe('edge cases', () => {
    it('should handle coordinates with leading/trailing whitespace', () => {
      const coordList = '  40.7484  ,  -73.9857  '
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      expect(result.data.features[0].geometry.coordinates).toEqual([-73.9857, 40.7484])
    })

    it('should handle scientific notation in coordinates', () => {
      const coordList = '4.07484E1,-7.39857E1'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      // The input is interpreted as lat,lng format and converted to lng,lat for GeoJSON
      // 4.07484E1 = 40.7484 (latitude), -7.39857E1 = -73.9857 (longitude)
      expect(result.data.features[0].geometry.coordinates[0]).toBeCloseTo(-73.9857, 4) // longitude (second number)
      expect(result.data.features[0].geometry.coordinates[1]).toBeCloseTo(40.7484, 4) // latitude (first number)
    })

    it('should handle very small decimal numbers', () => {
      const coordList = '0.000001,-0.000001'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      expect(result.data.features[0].geometry.coordinates).toEqual([-0.000001, 0.000001])
    })

    it('should handle zero coordinates', () => {
      const coordList = '0,0'
      
      const result = parseLatLngList(coordList)
      expect(result.success).toBe(true)
      expect(result.data.features[0].geometry.coordinates).toEqual([0, 0])
    })
  })
})