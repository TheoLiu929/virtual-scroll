import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'

export interface VirtualScrollObserverFixedProps {
  items: any[]
  itemHeight: number | ((index: number) => number)
  height: number
  renderItem: (props: { index: number; data: any }) => React.ReactNode
  rootMargin?: string
  threshold?: number | number[]
  overscan?: number
  velocityMultiplier?: number
  onVisibleChange?: (visible: number[], entries: IntersectionObserverEntry[]) => void
  onScrollStateChange?: (isScrolling: boolean, velocity: number) => void
  className?: string
  style?: React.CSSProperties
}

export interface VirtualScrollObserverFixedHandle {
  scrollToIndex: (index: number) => void
}

export const VirtualScrollObserverFixed = forwardRef<VirtualScrollObserverFixedHandle, VirtualScrollObserverFixedProps>(
  ({
    items,
    itemHeight,
    height,
    renderItem,
    rootMargin = '50px',
    threshold = 0,
    overscan = 3,
    velocityMultiplier = 2,
    onVisibleChange,
    onScrollStateChange,
    className,
    style
  }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const observerRef = useRef<IntersectionObserver | null>(null)
    const [visibleItems, setVisibleItems] = useState(new Set<number>())
    const [itemIndices, setItemIndices] = useState<number[]>([])
    const [isScrolling, setIsScrolling] = useState(false)
    const [scrollVelocity, setScrollVelocity] = useState(0)
    
    const lastScrollTimeRef = useRef(0)
    const lastScrollTopRef = useRef(0)
    const scrollEndTimerRef = useRef<number | null>(null)

    const getItemHeight = useCallback((index: number): number => {
      return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight
    }, [itemHeight])

    const getTotalHeight = useCallback((): number => {
      let height = 0
      for (let i = 0; i < items.length; i++) {
        height += getItemHeight(i)
      }
      return height
    }, [items.length, getItemHeight])

    const getItemStyle = useCallback((index: number): React.CSSProperties => {
      let top = 0
      for (let i = 0; i < index; i++) {
        top += getItemHeight(i)
      }
      
      return {
        position: 'absolute',
        top: `${top}px`,
        left: 0,
        right: 0,
        height: `${getItemHeight(index)}px`
      }
    }, [getItemHeight])

    const findStartIndex = useCallback((scrollTop: number): number => {
      let currentOffset = 0
      for (let i = 0; i < items.length; i++) {
        const itemHeight = getItemHeight(i)
        if (currentOffset + itemHeight > scrollTop) {
          return i
        }
        currentOffset += itemHeight
      }
      return Math.max(0, items.length - 1)
    }, [items.length, getItemHeight])

    const calculateVisibleRange = useCallback((scrollTop: number, velocity: number): { start: number; end: number } => {
      const startIndex = findStartIndex(scrollTop)
      
      // Calculate visible items count
      let visibleCount = Math.ceil(height / getItemHeight(startIndex)) + 1
      
      // Dynamic overscan based on scroll velocity
      const velocityFactor = Math.min(Math.abs(velocity) / 100, 3)
      const dynamicOverscan = Math.round(overscan * (1 + velocityFactor * velocityMultiplier))
      
      // Predict scroll direction and expand buffer accordingly
      const predictiveBuffer = velocity > 50 ? Math.round(dynamicOverscan * 0.7) : 0
      const scrollDirection = velocity > 0 ? 1 : -1
      
      const start = Math.max(0, startIndex - dynamicOverscan - (scrollDirection < 0 ? predictiveBuffer : 0))
      const end = Math.min(
        items.length - 1, 
        startIndex + visibleCount + dynamicOverscan + (scrollDirection > 0 ? predictiveBuffer : 0)
      )
      
      return { start, end }
    }, [findStartIndex, height, getItemHeight, overscan, velocityMultiplier, items.length])

    const updateVisibleItemsBasedOnScroll = useCallback((scrollTop: number, velocity: number) => {
      const range = calculateVisibleRange(scrollTop, velocity)
      const indices: number[] = []
      
      for (let i = range.start; i <= range.end; i++) {
        indices.push(i)
      }
      
      setItemIndices(indices)
    }, [calculateVisibleRange])

    const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget
      const currentTime = performance.now()
      const currentScrollTop = target.scrollTop
      
      // Calculate velocity
      const timeDelta = currentTime - lastScrollTimeRef.current
      const scrollDelta = currentScrollTop - lastScrollTopRef.current
      
      if (timeDelta > 0) {
        const velocity = Math.abs(scrollDelta) / timeDelta * 1000 // pixels per second
        setScrollVelocity(velocity)
      }
      
      lastScrollTimeRef.current = currentTime
      lastScrollTopRef.current = currentScrollTop
      setIsScrolling(true)
      
      // Immediate update based on scroll position - this prevents white screens
      updateVisibleItemsBasedOnScroll(currentScrollTop, scrollVelocity)
      
      // Clear existing timer
      if (scrollEndTimerRef.current !== null) {
        clearTimeout(scrollEndTimerRef.current)
      }
      
      // Set scroll end detection
      scrollEndTimerRef.current = window.setTimeout(() => {
        setIsScrolling(false)
        setScrollVelocity(0)
        // Re-optimize visible range when scrolling stops
        updateVisibleItemsBasedOnScroll(currentScrollTop, 0)
        onScrollStateChange?.(false, 0)
      }, 150)
      
      onScrollStateChange?.(true, scrollVelocity)
    }, [scrollVelocity, updateVisibleItemsBasedOnScroll, onScrollStateChange])

    const updateVisibleItems = useCallback((currentVisible: Set<number>) => {
      if (currentVisible.size === 0) {
        // Fallback: use scroll-based calculation
        updateVisibleItemsBasedOnScroll(containerRef.current?.scrollTop || 0, scrollVelocity)
        return
      }
      
      // Only use intersection observer for fine-tuning when not scrolling fast
      if (scrollVelocity < 100) {
        const indices: number[] = []
        const min = Math.max(0, Math.min(...currentVisible) - overscan)
        const max = Math.min(items.length - 1, Math.max(...currentVisible) + overscan)
        
        for (let i = min; i <= max; i++) {
          indices.push(i)
        }
        
        setItemIndices(indices)
      }
    }, [scrollVelocity, overscan, items.length, updateVisibleItemsBasedOnScroll])

    const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
      // Ignore intersection updates during fast scrolling
      if (isScrolling && scrollVelocity > 100) {
        return
      }
      
      const newVisible = new Set(visibleItems)
      
      entries.forEach(entry => {
        const index = parseInt(entry.target.getAttribute('data-index') || '0')
        
        if (entry.isIntersecting) {
          newVisible.add(index)
        } else {
          newVisible.delete(index)
        }
      })
      
      setVisibleItems(newVisible)
      updateVisibleItems(newVisible)
      onVisibleChange?.(Array.from(newVisible), entries)
    }, [isScrolling, scrollVelocity, visibleItems, updateVisibleItems, onVisibleChange])

    const scrollToIndex = useCallback((index: number) => {
      if (!containerRef.current) return
      
      let offset = 0
      for (let i = 0; i < index; i++) {
        offset += getItemHeight(i)
      }
      
      // Pre-expand visible range for jump scrolling
      const range = calculateVisibleRange(offset, 0)
      const indices: number[] = []
      for (let i = range.start; i <= range.end; i++) {
        indices.push(i)
      }
      setItemIndices(indices)
      
      // Scroll after updating indices
      requestAnimationFrame(() => {
        containerRef.current!.scrollTop = offset
      })
    }, [getItemHeight, calculateVisibleRange])

    useImperativeHandle(ref, () => ({
      scrollToIndex
    }), [scrollToIndex])

    useEffect(() => {
      if (!containerRef.current) return

      observerRef.current = new IntersectionObserver(handleIntersection, {
        root: containerRef.current,
        rootMargin,
        threshold
      })

      // Initialize with scroll-based calculation
      updateVisibleItemsBasedOnScroll(0, 0)

      return () => {
        observerRef.current?.disconnect()
      }
    }, [handleIntersection, rootMargin, threshold, updateVisibleItemsBasedOnScroll])

    useEffect(() => {
      if (!containerRef.current || !observerRef.current) return

      observerRef.current.disconnect()
      
      const items = containerRef.current.querySelectorAll('.virtual-scroll-item')
      items.forEach(item => {
        observerRef.current!.observe(item)
      })
    }, [itemIndices])

    useEffect(() => {
      updateVisibleItemsBasedOnScroll(containerRef.current?.scrollTop || 0, scrollVelocity)
    }, [items.length, updateVisibleItemsBasedOnScroll, scrollVelocity])

    useEffect(() => {
      return () => {
        if (scrollEndTimerRef.current !== null) {
          clearTimeout(scrollEndTimerRef.current)
        }
      }
    }, [])

    const containerStyle: React.CSSProperties = {
      height: `${height}px`,
      overflow: 'auto',
      position: 'relative',
      WebkitOverflowScrolling: 'touch',
      ...style
    }

    const spacerStyle: React.CSSProperties = {
      height: `${getTotalHeight()}px`,
      position: 'relative'
    }

    return (
      <div
        ref={containerRef}
        className={`virtual-scroll-observer-fixed ${className || ''}`}
        style={containerStyle}
        onScroll={handleScroll}
      >
        <div style={spacerStyle}>
          {itemIndices.map(index => (
            <div
              key={index}
              data-index={index}
              style={getItemStyle(index)}
              className="virtual-scroll-item"
            >
              {renderItem({ index, data: items[index] })}
            </div>
          ))}
        </div>
      </div>
    )
  }
)

VirtualScrollObserverFixed.displayName = 'VirtualScrollObserverFixed'