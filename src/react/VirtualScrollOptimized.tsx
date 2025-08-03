import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { VirtualScrollOptimized as VirtualScrollCore, OptimizedState } from '../core/VirtualScrollOptimized'
import { throttle } from '../core/utils'

export interface VirtualScrollOptimizedProps {
  items: any[]
  itemHeight: number | ((index: number) => number)
  height: number
  overscanCount?: number
  minOverscan?: number
  maxOverscan?: number
  enableIntersectionObserver?: boolean
  intersectionRootMargin?: string
  scrollVelocityThreshold?: number
  renderItem: (props: { index: number; data: any; isScrolling: boolean }) => React.ReactNode
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void
  onRangeChange?: (start: number, end: number) => void
  onScrollStateChange?: (state: OptimizedState) => void
  className?: string
  style?: React.CSSProperties
}

export interface VirtualScrollOptimizedHandle {
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void
  getState: () => OptimizedState
}

export const VirtualScrollOptimized = forwardRef<VirtualScrollOptimizedHandle, VirtualScrollOptimizedProps>(
  ({
    items,
    itemHeight,
    height,
    overscanCount = 3,
    minOverscan = 1,
    maxOverscan = 10,
    enableIntersectionObserver = false,
    intersectionRootMargin = '50%',
    scrollVelocityThreshold = 100,
    renderItem,
    onScroll,
    onRangeChange,
    onScrollStateChange,
    className,
    style
  }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const virtualScrollRef = useRef<VirtualScrollCore | null>(null)
    const intersectionObserverRef = useRef<IntersectionObserver | null>(null)
    const observedElementsRef = useRef(new WeakSet<Element>())
    
    const [state, setState] = useState<OptimizedState>({
      startIndex: 0,
      endIndex: 0,
      scrollOffset: 0,
      scrollVelocity: 0,
      overscan: overscanCount,
      isScrolling: false
    })

    const handleScroll = useCallback(
      throttle((event: React.UIEvent<HTMLDivElement>) => {
        const target = event.currentTarget
        virtualScrollRef.current?.handleScroll(target.scrollTop)
        onScroll?.(event)
      }, 16),
      [onScroll]
    )

    const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
      if (!virtualScrollRef.current || !containerRef.current) return

      const offset = virtualScrollRef.current.scrollToIndex(index, align)
      
      // Use requestAnimationFrame for smooth scrolling
      requestAnimationFrame(() => {
        containerRef.current!.scrollTop = offset
      })
    }, [])

    const getState = useCallback(() => state, [state])

    useImperativeHandle(ref, () => ({
      scrollToIndex,
      getState
    }), [scrollToIndex, getState])

    // Initialize virtual scroll
    useEffect(() => {
      virtualScrollRef.current = new VirtualScrollCore({
        itemCount: items.length,
        itemHeight,
        containerHeight: height,
        overscanCount,
        minOverscan,
        maxOverscan,
        scrollVelocityThreshold
      })

      virtualScrollRef.current.onUpdate((newState) => {
        setState(newState)
        onRangeChange?.(newState.startIndex, newState.endIndex)
        onScrollStateChange?.(newState)
      })

      setState(virtualScrollRef.current.getState())

      return () => {
        virtualScrollRef.current?.destroy()
      }
    }, [])

    // Update options when props change
    useEffect(() => {
      virtualScrollRef.current?.updateOptions({
        itemCount: items.length,
        itemHeight,
        containerHeight: height
      })
    }, [items.length, itemHeight, height])

    // Initialize Intersection Observer
    useEffect(() => {
      if (!enableIntersectionObserver || !containerRef.current) return

      intersectionObserverRef.current = new IntersectionObserver(
        (entries) => {
          // Only process entries when not actively scrolling
          if (!state.isScrolling) {
            entries.forEach(() => {
              // Use intersection information for fine-tuning visible range
              // but don't trigger unnecessary updates
            })
          }
        },
        {
          root: containerRef.current,
          rootMargin: intersectionRootMargin,
          threshold: [0, 0.1, 0.9, 1]
        }
      )

      return () => {
        intersectionObserverRef.current?.disconnect()
      }
    }, [enableIntersectionObserver, intersectionRootMargin, state.isScrolling])

    // Observe visible items
    useEffect(() => {
      if (!enableIntersectionObserver || !intersectionObserverRef.current || !containerRef.current) return

      // Clear previous observations
      observedElementsRef.current = new WeakSet()

      // Observe current visible items
      requestAnimationFrame(() => {
        const items = containerRef.current!.querySelectorAll('.virtual-item')
        items.forEach(item => {
          if (!observedElementsRef.current.has(item)) {
            intersectionObserverRef.current!.observe(item)
            observedElementsRef.current.add(item)
          }
        })
      })
    }, [state.startIndex, state.endIndex, enableIntersectionObserver])

    const containerStyle: React.CSSProperties = {
      height: `${height}px`,
      overflow: 'auto',
      position: 'relative',
      WebkitOverflowScrolling: 'touch',
      ...style
    }

    const totalHeight = virtualScrollRef.current?.getTotalHeight() || 0
    const spacerStyle: React.CSSProperties = {
      height: `${totalHeight}px`,
      position: 'relative'
    }

    const visibleItems = []
    for (let i = state.startIndex; i <= state.endIndex && i < items.length; i++) {
      const offset = virtualScrollRef.current?.getItemOffset(i) || 0
      const size = virtualScrollRef.current?.getItemSize(i) || 0

      const itemStyle: React.CSSProperties = {
        position: 'absolute',
        top: `${offset}px`,
        left: 0,
        right: 0,
        height: `${size}px`,
        willChange: state.isScrolling ? 'transform' : 'auto'
      }

      visibleItems.push(
        <div
          key={i}
          data-index={i}
          style={itemStyle}
          className={`virtual-item ${state.isScrolling ? 'is-scrolling' : ''}`}
        >
          {renderItem({ index: i, data: items[i], isScrolling: state.isScrolling })}
        </div>
      )
    }

    return (
      <div
        ref={containerRef}
        className={`virtual-scroll-optimized ${className || ''}`}
        style={containerStyle}
        onScroll={handleScroll}
      >
        <div style={spacerStyle}>
          {visibleItems}
        </div>
      </div>
    )
  }
)

VirtualScrollOptimized.displayName = 'VirtualScrollOptimized'