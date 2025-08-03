import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VirtualScroll from '../src/vue/VirtualScroll.vue'

describe('Vue VirtualScroll', () => {
  const createWrapper = (props = {}) => {
    const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }))
    
    return mount(VirtualScroll, {
      props: {
        items,
        itemHeight: 50,
        height: 500,
        ...props
      },
      slots: {
        item: `<template #item="{ index, data }">
          <div class="test-item">{{ data.name }}</div>
        </template>`
      }
    })
  }

  it('should render virtual scroll container', () => {
    const wrapper = createWrapper()
    
    expect(wrapper.find('.virtual-scroll-container').exists()).toBe(true)
    expect(wrapper.element.style.height).toBe('500px')
  })

  it('should render visible items', async () => {
    const wrapper = createWrapper()
    await nextTick()
    
    const items = wrapper.findAll('.test-item')
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThan(30)
  })

  it('should update on scroll', async () => {
    const wrapper = createWrapper()
    const container = wrapper.find('.virtual-scroll-container')
    
    await container.trigger('scroll', {
      target: { scrollTop: 1000, scrollLeft: 0 }
    })
    await nextTick()
    
    const firstItem = wrapper.find('.test-item')
    expect(firstItem.text()).not.toBe('Item 0')
  })

  it('should handle variable item heights', async () => {
    const wrapper = createWrapper({
      itemHeight: (index: number) => 50 + (index % 3) * 20
    })
    await nextTick()
    
    expect(wrapper.find('.virtual-scroll-container').exists()).toBe(true)
  })

  it('should expose scrollToIndex method', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any
    
    expect(typeof vm.scrollToIndex).toBe('function')
  })

  it('should emit events', async () => {
    const wrapper = createWrapper()
    const container = wrapper.find('.virtual-scroll-container')
    
    await container.trigger('scroll')
    
    expect(wrapper.emitted('scroll')).toBeTruthy()
    expect(wrapper.emitted('visibleRangeChange')).toBeTruthy()
  })

  it('should handle horizontal mode', async () => {
    const wrapper = createWrapper({ horizontal: true })
    await nextTick()
    
    const spacer = wrapper.find('.virtual-scroll-container > div')
    expect(spacer.element.style.width).toMatch(/\d+px/)
    expect(spacer.element.style.height).toBe('100%')
  })

  it('should update when items change', async () => {
    const wrapper = createWrapper()
    const newItems = Array.from({ length: 500 }, (_, i) => ({ id: i, name: `New Item ${i}` }))
    
    await wrapper.setProps({ items: newItems })
    await nextTick()
    
    expect(wrapper.findAll('.test-item').length).toBeGreaterThan(0)
  })
})