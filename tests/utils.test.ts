import { describe, it, expect, vi } from 'vitest'
import { throttle, getItemHeight, calculateItemPositions, findStartIndex, getVisibleRange } from '../src/core/utils'

describe('utils', () => {
  describe('throttle', () => {
    it('should throttle function calls', async () => {
      const fn = vi.fn()
      const throttled = throttle(fn, 100)
      
      throttled()
      throttled()
      throttled()
      
      expect(fn).toHaveBeenCalledTimes(1)
      
      await new Promise(resolve => setTimeout(resolve, 150))
      throttled()
      
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('getItemHeight', () => {
    it('should return fixed height', () => {
      expect(getItemHeight(0, 50)).toBe(50)
      expect(getItemHeight(10, 50)).toBe(50)
    })

    it('should call function for variable height', () => {
      const heightFn = (index: number) => 50 + index * 10
      expect(getItemHeight(0, heightFn)).toBe(50)
      expect(getItemHeight(5, heightFn)).toBe(100)
    })
  })

  describe('calculateItemPositions', () => {
    it('should calculate positions for fixed height items', () => {
      const positions = calculateItemPositions(5, 100)
      
      expect(positions.size).toBe(5)
      expect(positions.get(0)).toEqual({ index: 0, offset: 0, size: 100 })
      expect(positions.get(1)).toEqual({ index: 1, offset: 100, size: 100 })
      expect(positions.get(4)).toEqual({ index: 4, offset: 400, size: 100 })
    })

    it('should calculate positions for variable height items', () => {
      const positions = calculateItemPositions(3, (i) => 50 + i * 10)
      
      expect(positions.get(0)).toEqual({ index: 0, offset: 0, size: 50 })
      expect(positions.get(1)).toEqual({ index: 1, offset: 50, size: 60 })
      expect(positions.get(2)).toEqual({ index: 2, offset: 110, size: 70 })
    })

    it('should use cache when provided', () => {
      const cache = new Map()
      cache.set(0, { index: 0, offset: 0, size: 100 })
      
      const positions = calculateItemPositions(3, 100, cache)
      
      expect(positions).toBe(cache)
      expect(positions.size).toBe(3)
    })
  })

  describe('findStartIndex', () => {
    it('should find correct start index', () => {
      const positions = calculateItemPositions(10, 100)
      
      expect(findStartIndex(0, positions)).toBe(0)
      expect(findStartIndex(150, positions)).toBe(1)
      expect(findStartIndex(250, positions)).toBe(2)
      expect(findStartIndex(950, positions)).toBe(9)
    })

    it('should handle edge cases', () => {
      const positions = calculateItemPositions(5, 100)
      
      expect(findStartIndex(-50, positions)).toBe(0)
      expect(findStartIndex(1000, positions)).toBe(4)
    })
  })

  describe('getVisibleRange', () => {
    it('should calculate visible range with buffer', () => {
      const positions = calculateItemPositions(100, 50)
      const range = getVisibleRange(500, 400, positions, 2)
      
      expect(range.start).toBe(8)
      expect(range.end).toBeGreaterThan(15)
      expect(range.end).toBeLessThan(25)
    })

    it('should clamp range to valid bounds', () => {
      const positions = calculateItemPositions(10, 50)
      
      const rangeStart = getVisibleRange(0, 400, positions, 5)
      expect(rangeStart.start).toBe(0)
      
      const rangeEnd = getVisibleRange(400, 400, positions, 5)
      expect(rangeEnd.end).toBe(9)
    })
  })
})