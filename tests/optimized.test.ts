import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VirtualScrollOptimized, OptimizedState } from '../src/core/VirtualScrollOptimized'

describe('VirtualScrollOptimized', () => {
  let optimized: VirtualScrollOptimized
  let state: OptimizedState

  beforeEach(() => {
    optimized = new VirtualScrollOptimized({
      itemCount: 1000,
      itemHeight: 50,
      containerHeight: 500,
      overscanCount: 3,
      minOverscan: 1,
      maxOverscan: 15,
      scrollVelocityThreshold: 100
    })
    state = optimized.getState()
  })

  describe('initialization', () => {
    it('should calculate initial state correctly', () => {
      expect(state.scrollOffset).toBe(0)
      expect(state.scrollVelocity).toBe(0)
      expect(state.overscan).toBe(3)
      expect(state.isScrolling).toBe(false)
      expect(state.startIndex).toBe(0)
      expect(state.endIndex).toBeGreaterThan(0)
    })

    it('should calculate total height correctly', () => {
      const totalHeight = optimized.getTotalHeight()
      expect(totalHeight).toBe(50000) // 1000 items * 50px each
    })

    it('should calculate item positions correctly', () => {
      expect(optimized.getItemOffset(0)).toBe(0)
      expect(optimized.getItemOffset(1)).toBe(50)
      expect(optimized.getItemOffset(10)).toBe(500)
      expect(optimized.getItemSize(0)).toBe(50)
    })
  })

  describe('scroll handling', () => {
    it('should update scroll state on scroll', () => {
      optimized.handleScroll(1000)
      const newState = optimized.getState()
      
      expect(newState.scrollOffset).toBe(1000)
      expect(newState.isScrolling).toBe(true)
      expect(newState.startIndex).toBeGreaterThan(0)
    })

    it('should calculate scroll velocity', () => {
      // Simulate rapid scrolling
      optimized.handleScroll(0)
      setTimeout(() => {
        optimized.handleScroll(500)
        const state = optimized.getState()
        expect(state.scrollVelocity).toBeGreaterThan(0)
      }, 10)
    })

    it('should adjust overscan based on velocity', () => {
      // Fast scrolling should increase overscan
      optimized.handleScroll(0)
      setTimeout(() => {
        optimized.handleScroll(1000) // Fast scroll
        const state = optimized.getState()
        expect(state.overscan).toBeGreaterThan(3)
      }, 10)
    })

    it('should handle scroll end correctly', (done) => {
      optimized.handleScroll(500)
      
      // Wait for scroll end timeout
      setTimeout(() => {
        const state = optimized.getState()
        expect(state.isScrolling).toBe(false)
        expect(state.scrollVelocity).toBe(0)
        expect(state.overscan).toBe(3) // Should return to base overscan
        done()
      }, 200)
    })
  })

  describe('scrollToIndex', () => {
    it('should calculate correct offset for start alignment', () => {
      const offset = optimized.scrollToIndex(20, 'start')
      expect(offset).toBe(1000) // 20 * 50px
    })

    it('should calculate correct offset for center alignment', () => {
      const offset = optimized.scrollToIndex(20, 'center')
      const expectedOffset = 1000 - (500 - 50) / 2
      expect(offset).toBe(expectedOffset)
    })

    it('should calculate correct offset for end alignment', () => {
      const offset = optimized.scrollToIndex(20, 'end')
      const expectedOffset = 1000 - 500 + 50
      expect(offset).toBe(expectedOffset)
    })

    it('should pre-expand visible range for jump scrolling', () => {
      optimized.scrollToIndex(500)
      const state = optimized.getState()
      
      // Should include target index in visible range
      expect(state.startIndex).toBeLessThanOrEqual(500)
      expect(state.endIndex).toBeGreaterThanOrEqual(500)
      // Should have expanded overscan for smooth jump
      expect(state.endIndex - state.startIndex).toBeGreaterThan(20)
    })
  })

  describe('variable height items', () => {
    beforeEach(() => {
      optimized = new VirtualScrollOptimized({
        itemCount: 100,
        itemHeight: (index) => 50 + (index % 3) * 20,
        containerHeight: 500,
        overscanCount: 3
      })
    })

    it('should handle variable heights correctly', () => {
      expect(optimized.getItemSize(0)).toBe(50)
      expect(optimized.getItemSize(1)).toBe(70)
      expect(optimized.getItemSize(2)).toBe(90)
      expect(optimized.getItemSize(3)).toBe(50)
    })

    it('should calculate cumulative offsets correctly', () => {
      expect(optimized.getItemOffset(0)).toBe(0)
      expect(optimized.getItemOffset(1)).toBe(50)
      expect(optimized.getItemOffset(2)).toBe(120) // 50 + 70
      expect(optimized.getItemOffset(3)).toBe(210) // 50 + 70 + 90
    })
  })

  describe('update callbacks', () => {
    it('should call update callback on state change', () => {
      const callback = vi.fn()
      optimized.onUpdate(callback)
      
      optimized.handleScroll(500)
      
      expect(callback).toHaveBeenCalled()
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        scrollOffset: 500,
        isScrolling: true
      }))
    })
  })

  describe('options update', () => {
    it('should update item count', () => {
      optimized.updateOptions({ itemCount: 2000 })
      const totalHeight = optimized.getTotalHeight()
      expect(totalHeight).toBe(100000) // 2000 * 50px
    })

    it('should update container height', () => {
      const callback = vi.fn()
      optimized.onUpdate(callback)
      
      optimized.updateOptions({ containerHeight: 600 })
      
      expect(callback).toHaveBeenCalled()
    })
  })

  describe('performance characteristics', () => {
    it('should maintain reasonable visible range size', () => {
      const state = optimized.getState()
      const visibleItems = state.endIndex - state.startIndex + 1
      
      // Should not render too many items
      expect(visibleItems).toBeLessThan(50)
      // Should render enough for smooth scrolling
      expect(visibleItems).toBeGreaterThan(10)
    })

    it('should handle large datasets efficiently', () => {
      const largeOptimized = new VirtualScrollOptimized({
        itemCount: 100000,
        itemHeight: 50,
        containerHeight: 500
      })
      
      const startTime = performance.now()
      largeOptimized.handleScroll(50000)
      const endTime = performance.now()
      
      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(10)
    })
  })

  describe('cleanup', () => {
    it('should cleanup resources on destroy', () => {
      const callback = vi.fn()
      optimized.onUpdate(callback)
      
      optimized.destroy()
      optimized.handleScroll(500)
      
      // Callback should not be called after destroy
      expect(callback).not.toHaveBeenCalled()
    })
  })
})