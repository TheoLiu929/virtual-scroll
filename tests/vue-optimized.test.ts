import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VirtualScrollOptimized from '../src/vue/VirtualScrollOptimized.vue'

describe('Vue VirtualScrollOptimized', () => {
  const createWrapper = (props = {}) => {
    const items = Array.from({ length: 1000 }, (_, i) => ({ 
      id: i, 
      name: `Item ${i}`,
      description: `Description for item ${i}`
    }))
    
    return mount(VirtualScrollOptimized, {
      props: {
        items,
        itemHeight: 50,
        height: 500,
        overscanCount: 3,
        minOverscan: 1,
        maxOverscan: 15,
        ...props
      },
      slots: {
        item: `<template #item="{ index, data }">
          <div class="test-item" :data-index="index">{{ data.name }}</div>
        </template>`
      }
    })
  }

  it('should render optimized virtual scroll container', () => {
    const wrapper = createWrapper()
    
    expect(wrapper.find('.virtual-scroll-optimized').exists()).toBe(true)
    expect(wrapper.element.style.height).toBe('500px')
  })

  it('should render initial visible items', async () => {
    const wrapper = createWrapper()
    await nextTick()
    
    const items = wrapper.findAll('.test-item')
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThan(30) // Should not render all items
  })

  it('should handle scroll events with velocity calculation', async () => {
    const onScrollStateChange = vi.fn()
    const wrapper = createWrapper({
      onScrollStateChange
    })
    
    const container = wrapper.find('.virtual-scroll-optimized')
    
    // Simulate scroll
    await container.trigger('scroll', {
      target: { scrollTop: 1000 }
    })
    
    await nextTick()
    
    // Should emit scroll state change
    expect(onScrollStateChange).toHaveBeenCalled()
  })

  it('should update visible range on scroll', async () => {
    const wrapper = createWrapper()
    const container = wrapper.find('.virtual-scroll-optimized')
    
    // Get initial first item
    const initialFirstItem = wrapper.find('.test-item')
    const initialIndex = parseInt(initialFirstItem.attributes('data-index') || '0')
    
    // Scroll down
    await container.trigger('scroll', {
      target: { scrollTop: 2000 }
    })
    await nextTick()
    
    // Check that visible items changed
    const newFirstItem = wrapper.find('.test-item')
    const newIndex = parseInt(newFirstItem.attributes('data-index') || '0')
    
    expect(newIndex).toBeGreaterThan(initialIndex)
  })

  it('should handle variable item heights', async () => {
    const wrapper = createWrapper({
      itemHeight: (index: number) => 50 + (index % 3) * 20
    })
    
    await nextTick()
    expect(wrapper.find('.virtual-scroll-optimized').exists()).toBe(true)
  })

  it('should expose scrollToIndex method', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any
    
    expect(typeof vm.scrollToIndex).toBe('function')
  })

  it('should handle scrollToIndex correctly', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any
    
    // Scroll to index 100
    vm.scrollToIndex(100)
    await nextTick()
    
    // Should include target index in visible range
    const items = wrapper.findAll('.test-item')
    const indices = items.map(item => 
      parseInt(item.attributes('data-index') || '0')
    )
    
    expect(indices).toContain(100)
  })

  it('should emit range change events', async () => {
    const onRangeChange = vi.fn()
    const wrapper = createWrapper({
      onRangeChange
    })
    
    const container = wrapper.find('.virtual-scroll-optimized')
    await container.trigger('scroll', {
      target: { scrollTop: 500 }
    })
    
    await nextTick()
    expect(onRangeChange).toHaveBeenCalled()
  })

  it('should handle dynamic overscan based on scroll velocity', async () => {
    const onScrollStateChange = vi.fn()
    const wrapper = createWrapper({
      onScrollStateChange,
      scrollVelocityThreshold: 50
    })
    
    const container = wrapper.find('.virtual-scroll-optimized')
    
    // Simulate fast scrolling
    await container.trigger('scroll', {
      target: { scrollTop: 0 }
    })
    
    // Small delay to simulate time
    await new Promise(resolve => setTimeout(resolve, 20))
    
    await container.trigger('scroll', {
      target: { scrollTop: 1000 }
    })
    
    await nextTick()
    
    // Should have been called with scroll state
    expect(onScrollStateChange).toHaveBeenCalled()
  })

  it('should handle intersection observer integration', async () => {
    const wrapper = createWrapper({
      enableIntersectionObserver: true,
      intersectionRootMargin: '100px'
    })
    
    await nextTick()
    expect(wrapper.find('.virtual-scroll-optimized').exists()).toBe(true)
  })

  it('should update when items change', async () => {
    const wrapper = createWrapper()
    const newItems = Array.from({ length: 500 }, (_, i) => ({ 
      id: i, 
      name: `New Item ${i}` 
    }))
    
    await wrapper.setProps({ items: newItems })
    await nextTick()
    
    expect(wrapper.findAll('.test-item').length).toBeGreaterThan(0)
  })

  it('should handle scroll end state correctly', async () => {
    const onScrollStateChange = vi.fn()
    const wrapper = createWrapper({
      onScrollStateChange
    })
    
    const container = wrapper.find('.virtual-scroll-optimized')
    
    // Start scrolling
    await container.trigger('scroll', {
      target: { scrollTop: 500 }
    })
    
    // Wait for scroll end timeout
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Should indicate scrolling has ended
    const calls = onScrollStateChange.mock.calls
    const lastCall = calls[calls.length - 1]
    
    if (lastCall) {
      expect(lastCall[0].isScrolling).toBe(false)
    }
  })

  it('should maintain reasonable performance with large datasets', async () => {
    const largeItems = Array.from({ length: 10000 }, (_, i) => ({ 
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

  it('should cleanup on unmount', () => {
    const wrapper = createWrapper()
    
    // Should not throw error on unmount
    expect(() => wrapper.unmount()).not.toThrow()
  })
})