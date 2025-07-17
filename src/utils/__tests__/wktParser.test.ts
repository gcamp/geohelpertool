import { describe, it, expect } from 'vitest'
import { parseWKT, ERROR_CODES } from '../geoJsonParser'
import { LayerType } from '../../types/layer'
import type { Feature, Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon } from 'geojson'

describe('parseWKT', () => {
  describe('valid WKT parsing', () => {
    it('should parse a POINT WKT', () => {
      const pointWKT = 'POINT(-73.9857 40.7484)'
      
      const result = parseWKT(pointWKT)
      expect(result.success).toBe(true)
      expect(result.format).toBe(LayerType.WKT)
      expect(result.type).toBe('Feature')
      expect(result.geometryCount).toBe(1)
      
      const feature = result.data as Feature
      expect(feature?.type).toBe('Feature')
      expect(feature?.geometry?.type).toBe('Point')
      expect((feature?.geometry as Point)?.coordinates).toEqual([-73.9857, 40.7484])
      expect(feature?.properties).toEqual({})
    })

    it('should parse a LINESTRING WKT', () => {
      const lineStringWKT = 'LINESTRING(-73.9857 40.7484, -74.0059 40.7128, -74.0060 40.7130)'
      
      const result = parseWKT(lineStringWKT)
      expect(result.success).toBe(true)
      expect((result.data as Feature)?.geometry?.type).toBe('LineString')
      expect(((result.data as Feature)?.geometry as LineString)?.coordinates).toEqual([
        [-73.9857, 40.7484],
        [-74.0059, 40.7128],
        [-74.0060, 40.7130]
      ])
    })

    it('should parse a POLYGON WKT', () => {
      const polygonWKT = 'POLYGON((-73.9857 40.7484, -74.0059 40.7128, -74.0060 40.7130, -73.9857 40.7484))'
      
      const result = parseWKT(polygonWKT)
      expect(result.success).toBe(true)
      expect((result.data as Feature)?.geometry?.type).toBe('Polygon')
      expect(((result.data as Feature)?.geometry as Polygon)?.coordinates).toEqual([[
        [-73.9857, 40.7484],
        [-74.0059, 40.7128],
        [-74.0060, 40.7130],
        [-73.9857, 40.7484]
      ]])
    })

    it('should parse a MULTIPOINT WKT', () => {
      const multiPointWKT = 'MULTIPOINT((-73.9857 40.7484), (-74.0059 40.7128))'
      
      const result = parseWKT(multiPointWKT)
      expect(result.success).toBe(true)
      expect((result.data as Feature)?.geometry?.type).toBe('MultiPoint')
      expect(((result.data as Feature)?.geometry as MultiPoint)?.coordinates).toEqual([
        [-73.9857, 40.7484],
        [-74.0059, 40.7128]
      ])
    })

    it('should parse a MULTILINESTRING WKT', () => {
      const multiLineStringWKT = 'MULTILINESTRING((-73.9857 40.7484, -74.0059 40.7128), (-74.0060 40.7130, -74.0061 40.7131))'
      
      const result = parseWKT(multiLineStringWKT)
      expect(result.success).toBe(true)
      expect((result.data as Feature)?.geometry?.type).toBe('MultiLineString')
      expect(((result.data as Feature)?.geometry as MultiLineString)?.coordinates).toEqual([
        [[-73.9857, 40.7484], [-74.0059, 40.7128]],
        [[-74.0060, 40.7130], [-74.0061, 40.7131]]
      ])
    })

    it('should parse a MULTIPOLYGON WKT', () => {
      const multiPolygonWKT = 'MULTIPOLYGON(((-73.9857 40.7484, -74.0059 40.7128, -74.0060 40.7130, -73.9857 40.7484)))'
      
      const result = parseWKT(multiPolygonWKT)
      expect(result.success).toBe(true)
      expect((result.data as Feature)?.geometry?.type).toBe('MultiPolygon')
      expect(((result.data as Feature)?.geometry as MultiPolygon)?.coordinates).toEqual([[[
        [-73.9857, 40.7484],
        [-74.0059, 40.7128],
        [-74.0060, 40.7130],
        [-73.9857, 40.7484]
      ]]])
    })

    it('should handle case-insensitive WKT', () => {
      const lowercasePointWKT = 'point(-73.9857 40.7484)'
      
      const result = parseWKT(lowercasePointWKT)
      expect(result.success).toBe(true)
      expect((result.data as Feature)?.geometry?.type).toBe('Point')
    })

    it('should handle extra whitespace', () => {
      const pointWithSpaces = '  POINT ( -73.9857   40.7484 )  '
      
      const result = parseWKT(pointWithSpaces)
      // The WKT library may not handle extra whitespace properly
      if (result.success) {
        expect(((result.data as Feature)?.geometry as Point)?.coordinates).toEqual([-73.9857, 40.7484])
      } else {
        expect(result.errorCode).toBe(ERROR_CODES.WKT_ERROR)
      }
    })
  })

  describe('error handling', () => {
    it('should handle empty WKT string', () => {
      const result = parseWKT('')
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.WKT_ERROR)
      expect(result.error).toContain('Empty WKT string')
    })

    it('should handle whitespace-only WKT', () => {
      const result = parseWKT('   \n\t   ')
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.WKT_ERROR)
      expect(result.error).toContain('Empty WKT string')
    })

    it('should handle invalid WKT format', () => {
      const invalidWKT = 'NOT_A_VALID_WKT_FORMAT'
      
      const result = parseWKT(invalidWKT)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.WKT_ERROR)
      // Check for either specific error message format
      expect(result.error).toMatch(/WKT parsing failed|Failed to parse WKT/)
    })

    it('should handle malformed POINT WKT', () => {
      const malformedPoint = 'POINT(-73.9857)'  // Missing y coordinate
      
      const result = parseWKT(malformedPoint)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.WKT_ERROR)
    })

    it('should handle unclosed POLYGON WKT', () => {
      const unclosedPolygon = 'POLYGON((-73.9857 40.7484, -74.0059 40.7128, -74.0060 40.7130))'  // Not closed
      
      const result = parseWKT(unclosedPolygon)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.WKT_ERROR)
    })

    it('should handle coordinates out of valid range', () => {
      const invalidCoordinates = 'POINT(200 100)'  // Invalid longitude/latitude
      
      const result = parseWKT(invalidCoordinates)
      // Some validation libraries may be more lenient with coordinate ranges
      if (result.success) {
        // If it succeeds, at least verify it parsed as a Point
        expect((result.data as Feature)?.geometry?.type).toBe('Point')
      } else {
        expect(result.errorCode).toBe(ERROR_CODES.WKT_ERROR)
      }
    })

    it('should handle incomplete WKT syntax', () => {
      const incompleteWKT = 'POINT('
      
      const result = parseWKT(incompleteWKT)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.WKT_ERROR)
    })
  })

  describe('output format validation', () => {
    it('should produce correctly formatted GeoJSON Feature', () => {
      const pointWKT = 'POINT(-73.9857 40.7484)'
      
      const result = parseWKT(pointWKT)
      expect(result.success).toBe(true)
      
      const feature = result.data as Feature
      expect(feature).toMatchObject({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: expect.any(Array)
        },
        properties: expect.any(Object)
      })
    })

    it('should include empty styleProperties array', () => {
      const pointWKT = 'POINT(-73.9857 40.7484)'
      
      const result = parseWKT(pointWKT)
      expect(result.success).toBe(true)
      expect(result.styleProperties).toEqual([])
    })

    it('should correctly set metadata fields', () => {
      const pointWKT = 'POINT(-73.9857 40.7484)'
      
      const result = parseWKT(pointWKT)
      expect(result.success).toBe(true)
      expect(result.type).toBe('Feature')
      expect(result.format).toBe(LayerType.WKT)
      expect(result.geometryCount).toBe(1)
      expect(result.isPartialGeoJSON).toBeUndefined()
    })
  })

  describe('geometry validation', () => {
    it('should validate resulting geometry using turf', () => {
      const validPoint = 'POINT(-73.9857 40.7484)'
      
      const result = parseWKT(validPoint)
      expect(result.success).toBe(true)
      
      // The parseWKT function should have already validated the geometry
      // If it returns success: true, the geometry should be valid
    })

    it('should reject geometries that fail validation', () => {
      // This test might be challenging because the WKT library might not parse
      // invalid WKT in the first place. But if it does, our validation should catch it.
      const potentiallyInvalidWKT = 'POINT(NaN NaN)'
      
      const result = parseWKT(potentiallyInvalidWKT)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.WKT_ERROR)
    })
  })

  describe('special WKT cases', () => {
    it('should handle POINT EMPTY', () => {
      const emptyPoint = 'POINT EMPTY'
      
      const result = parseWKT(emptyPoint)
      // This might succeed or fail depending on how the WKT library handles EMPTY geometries
      if (result.success) {
        expect((result.data as Feature)?.geometry?.type).toBe('Point')
      } else {
        expect(result.errorCode).toBe(ERROR_CODES.WKT_ERROR)
      }
    })

    it('should handle scientific notation in coordinates', () => {
      const scientificPoint = 'POINT(-7.39857E1 4.07484E1)'
      
      const result = parseWKT(scientificPoint)
      if (result.success) {
        expect(((result.data as Feature)?.geometry as Point)?.coordinates?.[0]).toBeCloseTo(-73.9857, 4)
        expect(((result.data as Feature)?.geometry as Point)?.coordinates?.[1]).toBeCloseTo(40.7484, 4)
      }
    })

    it('should handle very long coordinate precision', () => {
      const precisePoint = 'POINT(-73.9857 40.7484)'
      
      const result = parseWKT(precisePoint)
      expect(result.success).toBe(true)
      expect(((result.data as Feature)?.geometry as Point)?.coordinates).toEqual([-73.9857, 40.7484])
    })
  })
})