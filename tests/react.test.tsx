import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React, { useRef } from 'react'
import { VirtualScroll, VirtualScrollHandle } from '../src/react/VirtualScroll'

describe('React VirtualScroll', () => {
  const createItems = (count: number) => 
    Array.from({ length: count }, (_, i) => ({ id: i, name: `Item ${i}` }))

  const defaultProps = {
    items: createItems(1000),
    itemHeight: 50,
    height: 500,
    renderItem: ({ index, data }: any) => (
      <div data-testid={`item-${index}`}>{data.name}</div>
    )
  }

  it('should render virtual scroll container', () => {
    const { container } = render(<VirtualScroll {...defaultProps} />)
    const scrollContainer = container.firstChild as HTMLElement
    
    expect(scrollContainer).toBeTruthy()
    expect(scrollContainer.style.height).toBe('500px')
    expect(scrollContainer.style.overflow).toBe('auto')
  })

  it('should render visible items', () => {
    render(<VirtualScroll {...defaultProps} />)
    
    const items = screen.getAllByTestId(/item-\d+/)
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThan(30)
  })

  it('should update on scroll', () => {
    const onVisibleRangeChange = vi.fn()
    const { container } = render(
      <VirtualScroll 
        {...defaultProps} 
        onVisibleRangeChange={onVisibleRangeChange}
      />
    )
    
    const scrollContainer = container.firstChild as HTMLElement
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 1000 } })
    
    expect(onVisibleRangeChange).toHaveBeenCalled()
    const [start] = onVisibleRangeChange.mock.calls[onVisibleRangeChange.mock.calls.length - 1]
    expect(start).toBeGreaterThan(0)
  })

  it('should handle variable item heights', () => {
    const props = {
      ...defaultProps,
      itemHeight: (index: number) => 50 + (index % 3) * 20
    }
    
    const { container } = render(<VirtualScroll {...props} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('should expose scrollToIndex via ref', () => {
    const TestComponent = () => {
      const ref = useRef<VirtualScrollHandle>(null)
      
      return (
        <>
          <VirtualScroll {...defaultProps} ref={ref} />
          <button onClick={() => ref.current?.scrollToIndex(50, 'center')}>
            Scroll to 50
          </button>
        </>
      )
    }
    
    const { getByText } = render(<TestComponent />)
    const button = getByText('Scroll to 50')
    
    fireEvent.click(button)
  })

  it('should handle onScroll prop', () => {
    const onScroll = vi.fn()
    const { container } = render(
      <VirtualScroll {...defaultProps} onScroll={onScroll} />
    )
    
    const scrollContainer = container.firstChild as HTMLElement
    fireEvent.scroll(scrollContainer)
    
    expect(onScroll).toHaveBeenCalled()
  })

  it('should apply custom className and style', () => {
    const { container } = render(
      <VirtualScroll 
        {...defaultProps} 
        className="custom-class"
        style={{ border: '1px solid red' }}
      />
    )
    
    const scrollContainer = container.firstChild as HTMLElement
    expect(scrollContainer.className).toBe('custom-class')
    expect(scrollContainer.style.border).toBe('1px solid red')
  })

  it('should handle horizontal mode', () => {
    const { container } = render(
      <VirtualScroll {...defaultProps} horizontal={true} />
    )
    
    const spacer = container.querySelector('div > div') as HTMLElement
    expect(spacer.style.width).toMatch(/\d+px/)
    expect(spacer.style.height).toBe('100%')
  })

  it('should update when items change', () => {
    const { rerender } = render(<VirtualScroll {...defaultProps} />)
    
    const newItems = createItems(500)
    rerender(<VirtualScroll {...defaultProps} items={newItems} />)
    
    const items = screen.getAllByTestId(/item-\d+/)
    expect(items.length).toBeGreaterThan(0)
  })

  it('should clean up on unmount', () => {
    const { unmount } = render(<VirtualScroll {...defaultProps} />)
    expect(() => unmount()).not.toThrow()
  })
})