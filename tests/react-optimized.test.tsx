import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React, { useRef } from 'react'
import { VirtualScrollOptimized, VirtualScrollOptimizedHandle } from '../src/react/VirtualScrollOptimized'

describe('React VirtualScrollOptimized', () => {
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
    overscanCount: 3,
    minOverscan: 1,
    maxOverscan: 15,
    renderItem: ({ index, data }: any) => (
      <div data-testid={`item-${index}`}>{data.name}</div>
    )
  }

  it('should render optimized virtual scroll container', () => {
    const { container } = render(<VirtualScrollOptimized {...defaultProps} />)
    const scrollContainer = container.firstChild as HTMLElement
    
    expect(scrollContainer).toBeTruthy()
    expect(scrollContainer.className).toContain('virtual-scroll-optimized')
    expect(scrollContainer.style.height).toBe('500px')
  })

  it('should render initial visible items', () => {
    render(<VirtualScrollOptimized {...defaultProps} />)
    
    const items = screen.getAllByTestId(/item-\d+/)
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThan(30) // Should not render all items
  })

  it('should handle scroll events with velocity calculation', async () => {
    const onScrollStateChange = vi.fn()
    const { container } = render(
      <VirtualScrollOptimized 
        {...defaultProps} 
        onScrollStateChange={onScrollStateChange}
      />
    )
    
    const scrollContainer = container.firstChild as HTMLElement
    
    // Simulate scroll
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 1000 } })
    
    await waitFor(() => {
      expect(onScrollStateChange).toHaveBeenCalled()
    })
  })

  it('should update visible range on scroll', async () => {
    const { container } = render(<VirtualScrollOptimized {...defaultProps} />)
    const scrollContainer = container.firstChild as HTMLElement
    
    // Get initial first item
    const initialItems = screen.getAllByTestId(/item-\d+/)
    const initialFirstIndex = parseInt(
      initialItems[0].getAttribute('data-testid')?.replace('item-', '') || '0'
    )
    
    // Scroll down
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 2000 } })
    
    await waitFor(() => {
      const newItems = screen.getAllByTestId(/item-\d+/)
      const newFirstIndex = parseInt(
        newItems[0].getAttribute('data-testid')?.replace('item-', '') || '0'
      )
      expect(newFirstIndex).toBeGreaterThan(initialFirstIndex)
    })
  })

  it('should handle variable item heights', () => {
    const props = {
      ...defaultProps,
      itemHeight: (index: number) => 50 + (index % 3) * 20
    }
    
    const { container } = render(<VirtualScrollOptimized {...props} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('should expose scrollToIndex via ref', async () => {
    const TestComponent = () => {
      const ref = useRef<VirtualScrollOptimizedHandle>(null)
      
      return (
        <>
          <VirtualScrollOptimized {...defaultProps} ref={ref} />
          <button 
            onClick={() => ref.current?.scrollToIndex(100, 'center')}
            data-testid="scroll-button"
          >
            Scroll to 100
          </button>
        </>
      )
    }
    
    render(<TestComponent />)
    const button = screen.getByTestId('scroll-button')
    
    fireEvent.click(button)
    
    await waitFor(() => {
      // Should include target index in visible range
      expect(screen.queryByTestId('item-100')).toBeTruthy()
    })
  })

  it('should handle onRangeChange callback', async () => {
    const onRangeChange = vi.fn()
    const { container } = render(
      <VirtualScrollOptimized 
        {...defaultProps} 
        onRangeChange={onRangeChange}
      />
    )
    
    const scrollContainer = container.firstChild as HTMLElement
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 500 } })
    
    await waitFor(() => {
      expect(onRangeChange).toHaveBeenCalled()
    })
  })

  it('should handle dynamic overscan based on scroll velocity', async () => {
    const onScrollStateChange = vi.fn()
    const { container } = render(
      <VirtualScrollOptimized 
        {...defaultProps} 
        onScrollStateChange={onScrollStateChange}
        scrollVelocityThreshold={50}
      />
    )
    
    const scrollContainer = container.firstChild as HTMLElement
    
    // Simulate fast scrolling
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 0 } })
    
    // Small delay to simulate time
    await new Promise(resolve => setTimeout(resolve, 20))
    
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 1000 } })
    
    await waitFor(() => {
      expect(onScrollStateChange).toHaveBeenCalled()
    })
  })

  it('should handle intersection observer integration', () => {
    const props = {
      ...defaultProps,
      enableIntersectionObserver: true,
      intersectionRootMargin: '100px'
    }
    
    const { container } = render(<VirtualScrollOptimized {...props} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('should apply custom className and style', () => {
    const { container } = render(
      <VirtualScrollOptimized 
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
    const { rerender } = render(<VirtualScrollOptimized {...defaultProps} />)
    
    const newItems = createItems(500)
    rerender(<VirtualScrollOptimized {...defaultProps} items={newItems} />)
    
    await waitFor(() => {
      const items = screen.getAllByTestId(/item-\d+/)
      expect(items.length).toBeGreaterThan(0)
    })
  })

  it('should handle scroll end state correctly', async () => {
    const onScrollStateChange = vi.fn()
    const { container } = render(
      <VirtualScrollOptimized 
        {...defaultProps} 
        onScrollStateChange={onScrollStateChange}
      />
    )
    
    const scrollContainer = container.firstChild as HTMLElement
    
    // Start scrolling
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 500 } })
    
    // Wait for scroll end timeout
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Should indicate scrolling has ended
    const calls = onScrollStateChange.mock.calls
    const lastCall = calls[calls.length - 1]
    
    if (lastCall && lastCall[0]) {
      expect(lastCall[0].isScrolling).toBe(false)
    }
  })

  it('should maintain reasonable performance with large datasets', async () => {
    const largeItems = createItems(10000)
    
    const startTime = performance.now()
    render(<VirtualScrollOptimized {...defaultProps} items={largeItems} />)
    const endTime = performance.now()
    
    // Should render in reasonable time
    expect(endTime - startTime).toBeLessThan(100)
    
    // Should not render all items
    const renderedItems = screen.getAllByTestId(/item-\d+/)
    expect(renderedItems.length).toBeLessThan(100)
  })

  it('should provide isScrolling state to render items', async () => {
    const renderItem = vi.fn(({ index, data, isScrolling }) => (
      <div data-testid={`item-${index}`} data-scrolling={isScrolling}>
        {data.name}
      </div>
    ))
    
    const { container } = render(
      <VirtualScrollOptimized {...defaultProps} renderItem={renderItem} />
    )
    
    const scrollContainer = container.firstChild as HTMLElement
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 500 } })
    
    await waitFor(() => {
      expect(renderItem).toHaveBeenCalledWith(
        expect.objectContaining({
          isScrolling: true
        })
      )
    })
  })

  it('should clean up on unmount', () => {
    const { unmount } = render(<VirtualScrollOptimized {...defaultProps} />)
    expect(() => unmount()).not.toThrow()
  })

  it('should handle getState method via ref', () => {
    const TestComponent = () => {
      const ref = useRef<VirtualScrollOptimizedHandle>(null)
      
      return (
        <>
          <VirtualScrollOptimized {...defaultProps} ref={ref} />
          <button 
            onClick={() => {
              const state = ref.current?.getState()
              expect(state).toBeDefined()
              expect(typeof state?.startIndex).toBe('number')
              expect(typeof state?.endIndex).toBe('number')
            }}
            data-testid="get-state-button"
          >
            Get State
          </button>
        </>
      )
    }
    
    render(<TestComponent />)
    const button = screen.getByTestId('get-state-button')
    
    expect(() => fireEvent.click(button)).not.toThrow()
  })
})