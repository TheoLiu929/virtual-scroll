import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VirtualScrollObserverOptimized from '../src/vue/VirtualScrollObserverOptimized.vue'

// Mock IntersectionObserver with enhanced functionality
class MockIntersectionObserver {
  private callback: IntersectionObserverCallback
  private elements: Set<Element> = new Set()

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }

  observe(element: Element) {
    this.elements.add(element)
  }

  unobserve(element: Element) {
    this.elements.delete(element)
  }

  disconnect() {
    this.elements.clear()
  }

  // Helper method to trigger intersection
  trigger(entries: Partial<IntersectionObserverEntry>[]) {
    const fullEntries = entries.map(entry => ({
      isIntersecting: false,
      intersectionRatio: 0,
      intersectionRect: new DOMRect(),
      boundingClientRect: new DOMRect(),
      rootBounds: new DOMRect(),
      time: performance.now(),
      target: document.createElement('div'),
      ...entry
    })) as IntersectionObserverEntry[]
    
    this.callback(fullEntries, this)
  }
}

describe('VirtualScrollObserverOptimized', () => {
  let mockIntersectionObserver: MockIntersectionObserver
  let originalRequestAnimationFrame: typeof requestAnimationFrame

  beforeEach(() => {
    // Mock IntersectionObserver
    vi.stubGlobal('IntersectionObserver', vi.fn((callback) => {
      mockIntersectionObserver = new MockIntersectionObserver(callback)
      return mockIntersectionObserver
    }))

    // Mock requestAnimationFrame for more predictable timing
    originalRequestAnimationFrame = globalThis.requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback) => {
      return setTimeout(callback, 16)
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    globalThis.requestAnimationFrame = originalRequestAnimationFrame
  })

  const createWrapper = (props = {}) => {
    const items = Array.from({ length: 1000 }, (_, i) => ({ 
      id: i, 
      name: `Item ${i}`,
      description: `Description for item ${i}`
    }))
    
    return mount(VirtualScrollObserverOptimized, {
      props: {
        items,
        itemHeight: 50,
        height: 500,
        overscan: 3,
        velocityMultiplier: 2,
        scrollEndDelay: 50,
        enableIntersectionObserver: true,
        ...props
      },
      slots: {
        item: `<template #item="{ index, data }">
          <div class="test-item" :data-index="index">{{ data.name }}</div>
        </template>`
      }
    })
  }

  it('should render optimized observer virtual scroll container', () => {
    const wrapper = createWrapper()
    
    expect(wrapper.find('.virtual-scroll-observer-optimized').exists()).toBe(true)
    expect(wrapper.element.style.height).toBe('500px')
  })

  it('should initialize with position cache and scroll-based calculation', async () => {
    const wrapper = createWrapper()
    await nextTick()
    
    const items = wrapper.findAll('.test-item')
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThan(30)
    
    // Should have proper positioning
    const firstItem = items[0]
    expect(firstItem.element.style.position).toBe('absolute')
    expect(firstItem.element.style.top).toBe('0px')
  })

  it('should handle immediate scroll updates with reduced delay', async () => {
    const onScrollStateChange = vi.fn()
    const onRangeChange = vi.fn()
    const wrapper = createWrapper({
      onScrollStateChange,
      onRangeChange
    })
    
    const container = wrapper.find('.virtual-scroll-observer-optimized')
    
    // Simulate scroll
    await container.trigger('scroll', {
      target: { scrollTop: 1000 }
    })
    
    await nextTick()
    
    // Should immediately update visible range
    expect(onScrollStateChange).toHaveBeenCalled()
    expect(onRangeChange).toHaveBeenCalled()
    
    const newItems = wrapper.findAll('.test-item')
    expect(newItems.length).toBeGreaterThan(0)
  })

  it('should handle rapid scroll end detection with safety updates', async () => {
    const onScrollStateChange = vi.fn()
    const wrapper = createWrapper({
      onScrollStateChange,
      scrollEndDelay: 20 // Very fast for testing
    })
    
    const container = wrapper.find('.virtual-scroll-observer-optimized')
    
    // Fast scroll
    await container.trigger('scroll', {
      target: { scrollTop: 2000 }
    })
    
    // Wait for immediate update (8ms)
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Wait for scroll end detection (20ms + 16ms safety)
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Should have detected scroll end
    const calls = onScrollStateChange.mock.calls
    expect(calls.length).toBeGreaterThan(1)
    
    // Last call should indicate scrolling stopped
    const lastCall = calls[calls.length - 1]
    expect(lastCall[0]).toBe(false) // isScrolling = false
  })

  it('should use binary search for efficient start index calculation', async () => {
    const wrapper = createWrapper()
    const container = wrapper.find('.virtual-scroll-observer-optimized')
    
    // Test multiple scroll positions
    const positions = [0, 1000, 5000, 10000, 25000]
    
    for (const position of positions) {
      await container.trigger('scroll', {
        target: { scrollTop: position }
      })
      
      await nextTick()
      
      const items = wrapper.findAll('.test-item')
      expect(items.length).toBeGreaterThan(0)
      
      // Should render appropriate items for scroll position
      if (position > 0) {
        const firstIndex = parseInt(items[0].attributes('data-index') || '0')
        expect(firstIndex).toBeGreaterThan(0)
      }
    }
  })

  it('should handle velocity-based dynamic overscan correctly', async () => {
    const onRangeChange = vi.fn()
    const wrapper = createWrapper({
      onRangeChange,
      overscan: 2,
      velocityMultiplier: 3
    })
    
    const container = wrapper.find('.virtual-scroll-observer-optimized')
    
    // Slow scroll (should use base overscan)
    await container.trigger('scroll', {
      target: { scrollTop: 100 }
    })
    
    await new Promise(resolve => setTimeout(resolve, 10))
    
    await container.trigger('scroll', {
      target: { scrollTop: 150 }
    })
    
    await nextTick()
    
    const slowScrollCall = onRangeChange.mock.calls[onRangeChange.mock.calls.length - 1]
    const slowScrollRange = slowScrollCall[1] - slowScrollCall[0]
    
    // Fast scroll (should increase overscan)
    onRangeChange.mockClear()
    
    await container.trigger('scroll', {
      target: { scrollTop: 200 }
    })
    
    await new Promise(resolve => setTimeout(resolve, 5))
    
    await container.trigger('scroll', {
      target: { scrollTop: 2000 }
    })
    
    await nextTick()
    
    const fastScrollCall = onRangeChange.mock.calls[onRangeChange.mock.calls.length - 1]
    const fastScrollRange = fastScrollCall[1] - fastScrollCall[0]
    
    // Fast scroll should have larger range
    expect(fastScrollRange).toBeGreaterThan(slowScrollRange)
  })

  it('should handle predictive buffering based on scroll direction', async () => {
    const onRangeChange = vi.fn()
    const wrapper = createWrapper({
      onRangeChange
    })
    
    const container = wrapper.find('.virtual-scroll-observer-optimized')
    
    // Scroll down fast
    await container.trigger('scroll', {
      target: { scrollTop: 1000 }
    })
    
    await new Promise(resolve => setTimeout(resolve, 5))
    
    await container.trigger('scroll', {
      target: { scrollTop: 3000 }
    })
    
    await nextTick()
    
    const calls = onRangeChange.mock.calls
    expect(calls.length).toBeGreaterThan(0)
    
    const [start, end] = calls[calls.length - 1]
    const range = end - start
    
    // Should have extended buffer for fast scrolling
    expect(range).toBeGreaterThan(20)
  })

  it('should handle scrollToIndex with pre-expansion and safety updates', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any
    
    // Scroll to index 500
    vm.scrollToIndex(500)
    
    // Wait for requestAnimationFrame
    await new Promise(resolve => setTimeout(resolve, 20))
    await nextTick()
    
    // Should include target index with expanded range
    const items = wrapper.findAll('.test-item')
    const indices = items.map(item => 
      parseInt(item.attributes('data-index') || '0')
    )
    
    expect(indices).toContain(500)
    expect(indices.length).toBeGreaterThan(15) // Should have expanded buffer
    
    // Should have proper scroll position
    const container = wrapper.find('.virtual-scroll-observer-optimized')
    expect(container.element.scrollTop).toBeGreaterThan(0)
  })

  it('should integrate intersection observer for fine-tuning during slow scroll', async () => {
    const onVisibleChange = vi.fn()
    const wrapper = createWrapper({
      onVisibleChange,
      enableIntersectionObserver: true
    })
    
    // Slow scroll to allow intersection observer processing
    const container = wrapper.find('.virtual-scroll-observer-optimized')
    await container.trigger('scroll', {
      target: { scrollTop: 200 }
    })
    
    // Wait for scroll to be considered "ended" and velocity to be low
    await new Promise(resolve => setTimeout(resolve, 100))
    await nextTick()
    
    // Now simulate intersection observer callback
    const mockElement = document.createElement('div')
    mockElement.setAttribute('data-index', '10')
    
    mockIntersectionObserver.trigger([{
      target: mockElement,
      isIntersecting: true
    }])
    
    // Should process intersection during slow/no scroll
    expect(onVisibleChange).toHaveBeenCalled()
  })

  it('should ignore intersection observer during fast scrolling', async () => {
    const onVisibleChange = vi.fn()
    const wrapper = createWrapper({
      onVisibleChange,
      enableIntersectionObserver: true
    })
    
    const container = wrapper.find('.virtual-scroll-observer-optimized')
    
    // Fast scroll
    await container.trigger('scroll', {
      target: { scrollTop: 0 }
    })
    
    await new Promise(resolve => setTimeout(resolve, 5))
    
    await container.trigger('scroll', {
      target: { scrollTop: 2000 }
    })
    
    await nextTick()
    
    // Immediately trigger intersection during fast scroll
    const mockElement = document.createElement('div')
    mockElement.setAttribute('data-index', '15')
    
    mockIntersectionObserver.trigger([{
      target: mockElement,
      isIntersecting: true
    }])
    
    // Should ignore intersection during fast scroll
    expect(onVisibleChange).not.toHaveBeenCalled()
  })

  it('should handle variable height items with position caching', async () => {
    const wrapper = createWrapper({
      itemHeight: (index: number) => 50 + (index % 4) * 25 // Variable heights: 50, 75, 100, 125
    })
    
    await nextTick()
    
    const items = wrapper.findAll('.test-item')
    expect(items.length).toBeGreaterThan(0)
    
    // Check that positions are calculated correctly
    const firstItem = items[0]
    const secondItem = items[1]
    
    expect(firstItem.element.style.top).toBe('0px')
    expect(firstItem.element.style.height).toBe('50px')
    
    if (secondItem) {
      expect(secondItem.element.style.top).toBe('50px')
      expect(secondItem.element.style.height).toBe('75px')
    }
  })

  it('should maintain excellent performance with large datasets', async () => {
    const largeItems = Array.from({ length: 50000 }, (_, i) => ({ 
      id: i, 
      name: `Item ${i}` 
    }))
    
    const startTime = performance.now()
    const wrapper = createWrapper({ items: largeItems })
    await nextTick()
    const endTime = performance.now()
    
    // Should mount very quickly
    expect(endTime - startTime).toBeLessThan(50)
    
    // Should render only visible items
    const renderedItems = wrapper.findAll('.test-item')
    expect(renderedItems.length).toBeLessThan(50)
    
    // Test scroll performance
    const container = wrapper.find('.virtual-scroll-observer-optimized')
    const scrollStartTime = performance.now()
    
    await container.trigger('scroll', {
      target: { scrollTop: 250000 } // Scroll to middle
    })
    
    await nextTick()
    const scrollEndTime = performance.now()
    
    // Scroll should be very fast
    expect(scrollEndTime - scrollStartTime).toBeLessThan(20)
  })

  it('should handle rapid scroll direction changes', async () => {
    const onRangeChange = vi.fn()
    const wrapper = createWrapper({
      onRangeChange
    })
    
    const container = wrapper.find('.virtual-scroll-observer-optimized')
    
    // Scroll down fast
    await container.trigger('scroll', { target: { scrollTop: 1000 } })
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Scroll up fast
    await container.trigger('scroll', { target: { scrollTop: 500 } })
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Scroll down again
    await container.trigger('scroll', { target: { scrollTop: 1500 } })
    await nextTick()
    
    // Should handle all direction changes smoothly
    expect(onRangeChange).toHaveBeenCalledTimes(3)
    
    const finalItems = wrapper.findAll('.test-item')
    expect(finalItems.length).toBeGreaterThan(0)
  })

  it('should cleanup resources properly on unmount', () => {
    const wrapper = createWrapper()
    
    // Should not throw error on unmount
    expect(() => wrapper.unmount()).not.toThrow()
  })

  it('should handle disabled intersection observer mode', async () => {
    const wrapper = createWrapper({
      enableIntersectionObserver: false
    })
    
    await nextTick()
    
    // Should still work with scroll-based calculation only
    const items = wrapper.findAll('.test-item')
    expect(items.length).toBeGreaterThan(0)
    
    const container = wrapper.find('.virtual-scroll-observer-optimized')
    await container.trigger('scroll', {
      target: { scrollTop: 1000 }
    })
    
    await nextTick()
    
    const newItems = wrapper.findAll('.test-item')
    expect(newItems.length).toBeGreaterThan(0)
  })
})