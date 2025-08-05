import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VirtualScrollObserverFixed from '../src/vue/VirtualScrollObserverFixed.vue'

// Mock IntersectionObserver
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

describe('VirtualScrollObserverFixed', () => {
  let mockIntersectionObserver: MockIntersectionObserver

  beforeEach(() => {
    // Mock IntersectionObserver
    vi.stubGlobal('IntersectionObserver', vi.fn((callback) => {
      mockIntersectionObserver = new MockIntersectionObserver(callback)
      return mockIntersectionObserver
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const createWrapper = (props = {}) => {
    const items = Array.from({ length: 1000 }, (_, i) => ({ 
      id: i, 
      name: `Item ${i}`,
      description: `Description for item ${i}`
    }))
    
    return mount(VirtualScrollObserverFixed, {
      props: {
        items,
        itemHeight: 50,
        height: 500,
        overscan: 3,
        velocityMultiplier: 2,
        ...props
      },
      slots: {
        item: `<template #item="{ index, data }">
          <div class="test-item" :data-index="index">{{ data.name }}</div>
        </template>`
      }
    })
  }

  it('should render observer-fixed virtual scroll container', () => {
    const wrapper = createWrapper()
    
    expect(wrapper.find('.virtual-scroll-observer').exists()).toBe(true)
    expect(wrapper.element.style.height).toBe('500px')
  })

  it('should initialize with scroll-based calculation', async () => {
    const wrapper = createWrapper()
    await nextTick()
    
    const items = wrapper.findAll('.test-item')
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThan(30)
  })

  it('should handle scroll events immediately', async () => {
    const onScrollStateChange = vi.fn()
    const wrapper = createWrapper({
      onScrollStateChange
    })
    
    const container = wrapper.find('.virtual-scroll-observer')
    
    // Simulate scroll
    await container.trigger('scroll', {
      target: { scrollTop: 1000 }
    })
    
    await nextTick()
    
    // Should immediately update visible range
    const newItems = wrapper.findAll('.test-item')
    expect(newItems.length).toBeGreaterThan(0)
    expect(onScrollStateChange).toHaveBeenCalled()
  })

  it('should calculate scroll velocity correctly', async () => {
    const onScrollStateChange = vi.fn()
    const wrapper = createWrapper({
      onScrollStateChange
    })
    
    const container = wrapper.find('.virtual-scroll-observer')
    
    // First scroll
    await container.trigger('scroll', {
      target: { scrollTop: 0 }
    })
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 20))
    
    // Second scroll (fast)
    await container.trigger('scroll', {
      target: { scrollTop: 1000 }
    })
    
    await nextTick()
    
    // Should detect velocity
    const calls = onScrollStateChange.mock.calls
    expect(calls.length).toBeGreaterThan(0)
    
    const lastCall = calls[calls.length - 1]
    expect(lastCall[0]).toBe(true) // isScrolling
    expect(typeof lastCall[1]).toBe('number') // velocity
  })

  it('should use dynamic overscan based on velocity', async () => {
    const wrapper = createWrapper({
      overscan: 2,
      velocityMultiplier: 3
    })
    
    const container = wrapper.find('.virtual-scroll-observer')
    
    // Fast scroll to trigger velocity-based overscan
    await container.trigger('scroll', {
      target: { scrollTop: 0 }
    })
    
    await new Promise(resolve => setTimeout(resolve, 10))
    
    await container.trigger('scroll', {
      target: { scrollTop: 2000 }
    })
    
    await nextTick()
    
    // Should render more items due to high velocity
    const items = wrapper.findAll('.test-item')
    expect(items.length).toBeGreaterThan(15) // More than base overscan would allow
  })

  it('should ignore intersection observer during fast scrolling', async () => {
    const onVisibleChange = vi.fn()
    const wrapper = createWrapper({
      onVisibleChange
    })
    
    const container = wrapper.find('.virtual-scroll-observer')
    
    // Trigger fast scroll
    await container.trigger('scroll', {
      target: { scrollTop: 2000 }
    })
    
    await nextTick()
    
    // Simulate intersection observer callback during fast scroll
    const mockElement = document.createElement('div')
    mockElement.setAttribute('data-index', '10')
    
    mockIntersectionObserver.trigger([{
      target: mockElement,
      isIntersecting: true
    }])
    
    // Should not process intersection during fast scroll
    expect(onVisibleChange).not.toHaveBeenCalled()
  })

  it('should handle predictive buffering based on scroll direction', async () => {
    const wrapper = createWrapper()
    const container = wrapper.find('.virtual-scroll-observer')
    
    // Scroll down fast
    await container.trigger('scroll', {
      target: { scrollTop: 100 }
    })
    
    await new Promise(resolve => setTimeout(resolve, 10))
    
    await container.trigger('scroll', {
      target: { scrollTop: 1000 }
    })
    
    await nextTick()
    
    const items = wrapper.findAll('.test-item')
    const indices = items.map(item => 
      parseInt(item.attributes('data-index') || '0')
    )
    
    // Should include items ahead of current position
    const maxIndex = Math.max(...indices)
    const minIndex = Math.min(...indices)
    expect(maxIndex - minIndex).toBeGreaterThan(20) // Extended buffer
  })

  it('should handle scrollToIndex with pre-expansion', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any
    
    // Scroll to index 500
    vm.scrollToIndex(500)
    await nextTick()
    
    // Should pre-expand visible range
    const items = wrapper.findAll('.test-item')
    const indices = items.map(item => 
      parseInt(item.attributes('data-index') || '0')
    )
    
    expect(indices).toContain(500)
    expect(indices.length).toBeGreaterThan(15) // Expanded range
  })

  it('should detect scroll end and optimize range', async () => {
    const onScrollStateChange = vi.fn()
    const wrapper = createWrapper({
      onScrollStateChange
    })
    
    const container = wrapper.find('.virtual-scroll-observer')
    
    // Start scrolling
    await container.trigger('scroll', {
      target: { scrollTop: 500 }
    })
    
    // Wait for scroll end timeout
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Should detect scroll end
    const calls = onScrollStateChange.mock.calls
    const lastCall = calls[calls.length - 1]
    
    if (lastCall) {
      expect(lastCall[0]).toBe(false) // isScrolling = false
      expect(lastCall[1]).toBe(0) // velocity = 0
    }
  })

  it('should handle variable height items correctly', async () => {
    const wrapper = createWrapper({
      itemHeight: (index: number) => 50 + (index % 3) * 20
    })
    
    await nextTick()
    
    const items = wrapper.findAll('.test-item')
    expect(items.length).toBeGreaterThan(0)
    
    // Should calculate positions correctly for variable heights
    const firstItem = items[0]
    expect(firstItem.element.style.top).toBe('0px')
  })

  it('should fallback to scroll-based calculation when no intersection data', async () => {
    const wrapper = createWrapper()
    const container = wrapper.find('.virtual-scroll-observer')
    
    // Clear visible items to trigger fallback
    const vm = wrapper.vm as any
    vm.visibleItems.clear()
    
    await container.trigger('scroll', {
      target: { scrollTop: 1000 }
    })
    
    await nextTick()
    
    // Should still render items using scroll-based calculation
    const items = wrapper.findAll('.test-item')
    expect(items.length).toBeGreaterThan(0)
  })

  it('should cleanup on unmount', () => {
    const wrapper = createWrapper()
    
    // Should not throw error on unmount
    expect(() => wrapper.unmount()).not.toThrow()
  })

  it('should use intersection observer for fine-tuning during slow scroll', async () => {
    const onVisibleChange = vi.fn()
    const wrapper = createWrapper({
      onVisibleChange
    })
    
    // Slow scroll (velocity < 100)
    const container = wrapper.find('.virtual-scroll-observer')
    await container.trigger('scroll', {
      target: { scrollTop: 50 }
    })
    
    await new Promise(resolve => setTimeout(resolve, 200)) // Wait for scroll to end
    await nextTick()
    
    // Now intersection observer should be active
    const mockElement = document.createElement('div')
    mockElement.setAttribute('data-index', '5')
    
    mockIntersectionObserver.trigger([{
      target: mockElement,
      isIntersecting: true
    }])
    
    // Should process intersection during slow/no scroll
    expect(onVisibleChange).toHaveBeenCalled()
  })

  it('should maintain performance with large datasets', async () => {
    const largeItems = Array.from({ length: 50000 }, (_, i) => ({ 
      id: i, 
      name: `Item ${i}` 
    }))
    
    const startTime = performance.now()
    const wrapper = createWrapper({ items: largeItems })
    await nextTick()
    const endTime = performance.now()
    
    // Should mount in reasonable time
    expect(endTime - startTime).toBeLessThan(100)
    
    // Should not render all items
    const renderedItems = wrapper.findAll('.test-item')
    expect(renderedItems.length).toBeLessThan(100)
  })
})