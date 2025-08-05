import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React, { useRef } from 'react'
import { VirtualScrollObserverOptimized, VirtualScrollObserverOptimizedHandle } from '../src/react/VirtualScrollObserverOptimized'

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

describe('React VirtualScrollObserverOptimized', () => {
  let mockIntersectionObserver: MockIntersectionObserver
  let originalRequestAnimationFrame: typeof requestAnimationFrame

  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', vi.fn((callback) => {
      mockIntersectionObserver = new MockIntersectionObserver(callback)
      return mockIntersectionObserver
    }))

    originalRequestAnimationFrame = globalThis.requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback) => {
      return setTimeout(callback, 16)
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    globalThis.requestAnimationFrame = originalRequestAnimationFrame
  })

  const createItems = (count: number) => 
    Array.from({ length: count }, (_, i) => ({ 
      id: i, 
      name: `Item ${i}`,
      description: `Description for item ${i}`
    }))

  const defaultProps = {
    items: createItems(1000),
    itemHeight: 50,
    height: 500,
    overscan: 3,
    velocityMultiplier: 2,
    scrollEndDelay: 50,
    enableIntersectionObserver: true,
    renderItem: ({ index, data }: any) => (
      <div data-testid={`item-${index}`}>{data.name}</div>
    )
  }

  it('should render optimized observer virtual scroll container', () => {
    const { container } = render(<VirtualScrollObserverOptimized {...defaultProps} />)
    const scrollContainer = container.firstChild as HTMLElement
    
    expect(scrollContainer).toBeTruthy()
    expect(scrollContainer.className).toContain('virtual-scroll-observer-optimized')
    expect(scrollContainer.style.height).toBe('500px')
  })

  it('should initialize with position cache and render visible items', async () => {
    render(<VirtualScrollObserverOptimized {...defaultProps} />)
    
    await waitFor(() => {
      const items = screen.getAllByTestId(/item-\d+/)
      expect(items.length).toBeGreaterThan(0)
      expect(items.length).toBeLessThan(30)
    })
  })

  it('should handle immediate scroll updates with reduced delay', async () => {
    const onScrollStateChange = vi.fn()
    const onRangeChange = vi.fn()
    const { container } = render(
      <VirtualScrollObserverOptimized 
        {...defaultProps} 
        onScrollStateChange={onScrollStateChange}
        onRangeChange={onRangeChange}
      />
    )
    
    const scrollContainer = container.firstChild as HTMLElement
    
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 1000 } })
    
    await waitFor(() => {
      expect(onScrollStateChange).toHaveBeenCalled()
      expect(onRangeChange).toHaveBeenCalled()
    })
  })

  it('should handle rapid scroll end detection with safety updates', async () => {
    const onScrollStateChange = vi.fn()
    const { container } = render(
      <VirtualScrollObserverOptimized 
        {...defaultProps} 
        onScrollStateChange={onScrollStateChange}
        scrollEndDelay={20}
      />
    )
    
    const scrollContainer = container.firstChild as HTMLElement
    
    // Fast scroll
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 2000 } })
    
    // Wait for immediate update (8ms) + scroll end detection (20ms) + safety (16ms)
    await new Promise(resolve => setTimeout(resolve, 50))
    
    await waitFor(() => {
      const calls = onScrollStateChange.mock.calls
      expect(calls.length).toBeGreaterThan(1)
      
      // Last call should indicate scrolling stopped
      const lastCall = calls[calls.length - 1]
      expect(lastCall[0]).toBe(false) // isScrolling = false
    })
  })

  it('should handle velocity-based dynamic overscan', async () => {
    const onRangeChange = vi.fn()
    const { container } = render(
      <VirtualScrollObserverOptimized 
        {...defaultProps} 
        onRangeChange={onRangeChange}
        overscan={2}
        velocityMultiplier={3}
      />
    )
    
    const scrollContainer = container.firstChild as HTMLElement
    
    // Slow scroll
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 100 } })
    await new Promise(resolve => setTimeout(resolve, 10))
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 150 } })
    
    await waitFor(() => expect(onRangeChange).toHaveBeenCalled())
    
    const slowScrollCall = onRangeChange.mock.calls[onRangeChange.mock.calls.length - 1]
    const slowScrollRange = slowScrollCall[1] - slowScrollCall[0]
    
    // Fast scroll
    onRangeChange.mockClear()
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 200 } })
    await new Promise(resolve => setTimeout(resolve, 5))
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 2000 } })
    
    await waitFor(() => expect(onRangeChange).toHaveBeenCalled())
    
    const fastScrollCall = onRangeChange.mock.calls[onRangeChange.mock.calls.length - 1]
    const fastScrollRange = fastScrollCall[1] - fastScrollCall[0]
    
    // Fast scroll should have larger range
    expect(fastScrollRange).toBeGreaterThan(slowScrollRange)
  })

  it('should handle scrollToIndex with pre-expansion via ref', async () => {
    const TestComponent = () => {
      const ref = useRef<VirtualScrollObserverOptimizedHandle>(null)
      
      return (
        <>
          <VirtualScrollObserverOptimized {...defaultProps} ref={ref} />
          <button 
            onClick={() => ref.current?.scrollToIndex(500)}
            data-testid="scroll-button"
          >
            Scroll to 500
          </button>
        </>
      )
    }
    
    render(<TestComponent />)
    const button = screen.getByTestId('scroll-button')
    
    fireEvent.click(button)
    
    // Wait for requestAnimationFrame and updates
    await new Promise(resolve => setTimeout(resolve, 50))
    
    await waitFor(() => {
      // Should include target index in visible range
      expect(screen.queryByTestId('item-500')).toBeTruthy()
    })
  })

  it('should integrate intersection observer for fine-tuning during slow scroll', async () => {
    const onVisibleChange = vi.fn()
    render(
      <VirtualScrollObserverOptimized 
        {...defaultProps} 
        onVisibleChange={onVisibleChange}
        enableIntersectionObserver={true}
      />
    )
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Simulate intersection observer callback during slow scroll
    const mockElement = document.createElement('div')
    mockElement.setAttribute('data-index', '10')
    
    mockIntersectionObserver.trigger([{
      target: mockElement,
      isIntersecting: true
    }])
    
    await waitFor(() => {
      expect(onVisibleChange).toHaveBeenCalled()
    })
  })

  it('should ignore intersection observer during fast scrolling', async () => {
    const onVisibleChange = vi.fn()
    const { container } = render(
      <VirtualScrollObserverOptimized 
        {...defaultProps} 
        onVisibleChange={onVisibleChange}
        enableIntersectionObserver={true}
      />
    )
    
    const scrollContainer = container.firstChild as HTMLElement
    
    // Fast scroll
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 0 } })
    await new Promise(resolve => setTimeout(resolve, 5))
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 2000 } })
    
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
    const props = {
      ...defaultProps,
      itemHeight: (index: number) => 50 + (index % 4) * 25 // Variable heights
    }
    
    const { container } = render(<VirtualScrollObserverOptimized {...props} />)
    
    await waitFor(() => {
      const items = screen.getAllByTestId(/item-\d+/)
      expect(items.length).toBeGreaterThan(0)
    })
    
    // Check positioning - items should be positioned correctly
    const scrollContainer = container.firstChild as HTMLElement
    const itemElements = scrollContainer.querySelectorAll('[data-testid^="item-"]')
    
    expect(itemElements.length).toBeGreaterThan(0)
  })

  it('should maintain excellent performance with large datasets', async () => {
    const largeItems = createItems(50000)
    
    const startTime = performance.now()
    render(<VirtualScrollObserverOptimized {...defaultProps} items={largeItems} />)
    const endTime = performance.now()
    
    // Should render very quickly
    expect(endTime - startTime).toBeLessThan(50)
    
    await waitFor(() => {
      const renderedItems = screen.getAllByTestId(/item-\d+/)
      expect(renderedItems.length).toBeLessThan(50)
    })
  })

  it('should handle rapid scroll direction changes', async () => {
    const onRangeChange = vi.fn()
    const { container } = render(
      <VirtualScrollObserverOptimized 
        {...defaultProps} 
        onRangeChange={onRangeChange}
      />
    )
    
    const scrollContainer = container.firstChild as HTMLElement
    
    // Scroll down fast
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 1000 } })
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Scroll up fast
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 500 } })
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Scroll down again
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 1500 } })
    
    await waitFor(() => {
      expect(onRangeChange).toHaveBeenCalledTimes(3)
    })
  })

  it('should handle disabled intersection observer mode', async () => {
    render(
      <VirtualScrollObserverOptimized 
        {...defaultProps} 
        enableIntersectionObserver={false}
      />
    )
    
    await waitFor(() => {
      const items = screen.getAllByTestId(/item-\d+/)
      expect(items.length).toBeGreaterThan(0)
    })
  })

  it('should apply custom className and style', () => {
    const { container } = render(
      <VirtualScrollObserverOptimized 
        {...defaultProps} 
        className="custom-class"
        style={{ border: '1px solid red' }}
      />
    )
    
    const scrollContainer = container.firstChild as HTMLElement
    expect(scrollContainer.className).toContain('custom-class')
    expect(scrollContainer.style.border).toBe('1px solid red')
  })

  it('should update when items change', async () => {
    const { rerender } = render(<VirtualScrollObserverOptimized {...defaultProps} />)
    
    const newItems = createItems(500)
    rerender(<VirtualScrollObserverOptimized {...defaultProps} items={newItems} />)
    
    await waitFor(() => {
      const items = screen.getAllByTestId(/item-\d+/)
      expect(items.length).toBeGreaterThan(0)
    })
  })

  it('should clean up resources on unmount', () => {
    const { unmount } = render(<VirtualScrollObserverOptimized {...defaultProps} />)
    expect(() => unmount()).not.toThrow()
  })

  it('should handle multiple rapid scroll events efficiently', async () => {
    const onScrollStateChange = vi.fn()
    const { container } = render(
      <VirtualScrollObserverOptimized 
        {...defaultProps} 
        onScrollStateChange={onScrollStateChange}
      />
    )
    
    const scrollContainer = container.firstChild as HTMLElement
    
    // Simulate rapid scroll events
    for (let i = 0; i < 10; i++) {
      fireEvent.scroll(scrollContainer, { target: { scrollTop: i * 200 } })
      await new Promise(resolve => setTimeout(resolve, 2))
    }
    
    // Should handle all events without errors
    expect(onScrollStateChange).toHaveBeenCalled()
    
    await waitFor(() => {
      const items = screen.getAllByTestId(/item-\d+/)
      expect(items.length).toBeGreaterThan(0)
    })
  })
})