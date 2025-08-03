import { describe, it, expect, beforeEach } from 'vitest'
import { VirtualScrollCore, VirtualScrollState } from '../src/core'

describe('VirtualScrollCore', () => {
  let core: VirtualScrollCore
  let state: VirtualScrollState

  beforeEach(() => {
    core = new VirtualScrollCore({
      itemCount: 1000,
      itemHeight: 50,
      containerHeight: 500,
      buffer: 5
    })
    state = core.getState()
  })

  describe('initialization', () => {
    it('should calculate initial state correctly', () => {
      expect(state.totalHeight).toBe(50000)
      expect(state.scrollOffset).toBe(0)
      expect(state.itemPositions.size).toBe(1000)
    })

    it('should calculate visible range correctly', () => {
      const { start, end } = state.visibleRange
      expect(start).toBe(0)
      expect(end).toBeGreaterThan(0)
      expect(end).toBeLessThan(20)
    })
  })

  describe('scrolling', () => {
    it('should update visible range on scroll', () => {
      core.onScroll({ scrollTop: 1000, scrollLeft: 0 })
      const newState = core.getState()
      
      expect(newState.scrollOffset).toBe(1000)
      expect(newState.visibleRange.start).toBeGreaterThan(0)
    })

    it('should handle variable item heights', () => {
      const variableCore = new VirtualScrollCore({
        itemCount: 100,
        itemHeight: (index) => 50 + (index % 3) * 20,
        containerHeight: 500
      })
      
      const variableState = variableCore.getState()
      expect(variableState.itemPositions.get(0)?.size).toBe(50)
      expect(variableState.itemPositions.get(1)?.size).toBe(70)
      expect(variableState.itemPositions.get(2)?.size).toBe(90)
    })
  })

  describe('scrollToIndex', () => {
    it('should calculate correct offset for start alignment', () => {
      const offset = core.scrollToIndex(20, 'start')
      expect(offset).toBe(1000)
    })

    it('should calculate correct offset for center alignment', () => {
      const offset = core.scrollToIndex(20, 'center')
      const expectedOffset = 1000 - (500 - 50) / 2
      expect(offset).toBe(expectedOffset)
    })

    it('should calculate correct offset for end alignment', () => {
      const offset = core.scrollToIndex(20, 'end')
      const expectedOffset = 1000 - 500 + 50
      expect(offset).toBe(expectedOffset)
    })

    it('should clamp offset to valid range', () => {
      const offset = core.scrollToIndex(999, 'end')
      expect(offset).toBeLessThanOrEqual(state.totalHeight - 500)
      expect(offset).toBeGreaterThanOrEqual(0)
    })
  })

  describe('updateOptions', () => {
    it('should update item count', () => {
      core.updateOptions({ itemCount: 2000 })
      const newState = core.getState()
      
      expect(newState.itemPositions.size).toBe(2000)
      expect(newState.totalHeight).toBe(100000)
    })

    it('should update container height', () => {
      let updateCalled = false
      core.onUpdate(() => {
        updateCalled = true
      })
      
      core.updateOptions({ containerHeight: 600 })
      expect(updateCalled).toBe(true)
    })
  })

  describe('horizontal mode', () => {
    it('should handle horizontal scrolling', () => {
      const horizontalCore = new VirtualScrollCore({
        itemCount: 100,
        itemHeight: 100,
        containerHeight: 800,
        horizontal: true
      })
      
      horizontalCore.onScroll({ scrollTop: 0, scrollLeft: 500 })
      const state = horizontalCore.getState()
      
      expect(state.scrollOffset).toBe(500)
    })
  })
})