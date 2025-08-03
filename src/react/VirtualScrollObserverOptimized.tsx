import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'

export interface VirtualScrollObserverOptimizedProps {
  items: any[]
  itemHeight: number | ((index: number) => number)
  height: number
  renderItem: (props: { index: number; data: any }) => React.ReactNode
  rootMargin?: string
  threshold?: number | number[]
  overscan?: number
  velocityMultiplier?: number
  scrollEndDelay?: number
  enableIntersectionObserver?: boolean
  onVisibleChange?: (visible: number[], entries: IntersectionObserverEntry[]) => void
  onScrollStateChange?: (isScrolling: boolean, velocity: number) => void
  onRangeChange?: (start: number, end: number) => void
  className?: string
  style?: React.CSSProperties
}

export interface VirtualScrollObserverOptimizedHandle {
  scrollToIndex: (index: number) => void
}

export const VirtualScrollObserverOptimized = forwardRef<VirtualScrollObserverOptimizedHandle, VirtualScrollObserverOptimizedProps>(
  ({
    items,
    itemHeight,
    height,
    renderItem,
    rootMargin = '50px',
    threshold = 0,
    overscan = 3,
    velocityMultiplier = 2,
    scrollEndDelay = 50,
    enableIntersectionObserver = true,
    onVisibleChange,
    onScrollStateChange,
    onRangeChange,
    className,
    style
  }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const observerRef = useRef<IntersectionObserver | null>(null)
    const [visibleItems, setVisibleItems] = useState(new Set<number>())
    const [itemIndices, setItemIndices] = useState<number[]>([])
    const [isScrolling, setIsScrolling] = useState(false)
    const [scrollVelocity, setScrollVelocity] = useState(0)
    const [isInitialized, setIsInitialized] = useState(false)
    
    const lastScrollTimeRef = useRef(0)
    const lastScrollTopRef = useRef(0)
    const scrollEndTimerRef = useRef<number | null>(null)
    const immediateUpdateTimerRef = useRef<number | null>(null)
    const positionCacheRef = useRef(new Map<number, { offset: number; size: number }>())

    const getItemHeight = useCallback((index: number): number => {
      return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight
    }, [itemHeight])

    const calculatePositions = useCallback(() => {
      const cache = new Map<number, { offset: number; size: number }>()
      let offset = 0
      
      for (let i = 0; i < items.length; i++) {
        const size = getItemHeight(i)
        cache.set(i, { offset, size })
        offset += size
      }
      
      positionCacheRef.current = cache
    }, [items.length, getItemHeight])

    const getTotalHeight = useCallback((): number => {
      let height = 0
      for (let i = 0; i < items.length; i++) {
        height += getItemHeight(i)
      }
      return height
    }, [items.length, getItemHeight])

    const getItemStyle = useCallback((index: number): React.CSSProperties => {
      const position = positionCacheRef.current.get(index)
      if (!position) return {}
      
      return {
        position: 'absolute',
        top: `${position.offset}px`,
        left: 0,
        right: 0,
        height: `${position.size}px`
      }
    }, [])

    const findStartIndex = useCallback((scrollTop: number): number => {
      // Binary search for better performance
      let low = 0
      let high = items.length - 1
      
      while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const position = positionCacheRef.current.get(mid)
        if (!position) break
        
        if (position.offset <= scrollTop && position.offset + position.size > scrollTop) {
          return mid
        } else if (position.offset > scrollTop) {
          high = mid - 1
        } else {
          low = mid + 1
        }
      }
      
      return Math.max(0, low - 1)
    }, [items.length])

    const calculateVisibleRange = useCallback((scrollTop: number, velocity: number): { start: number; end: number } => {
      const startIndex = findStartIndex(scrollTop)
      
      // Calculate how many items fit in the viewport
      let visibleCount = 0
      let currentOffset = positionCacheRef.current.get(startIndex)?.offset || 0
      
      for (let i = startIndex; i < items.length && currentOffset - scrollTop < height; i++) {
        const position = positionCacheRef.current.get(i)
        if (!position) break
        currentOffset = position.offset + position.size
        visibleCount++
      }
      
      // Dynamic overscan based on scroll velocity
      const velocityFactor = Math.min(Math.abs(velocity) / 100, 3)
      const dynamicOverscan = Math.round(overscan * (1 + velocityFactor * velocityMultiplier))
      
      // Predict scroll direction and expand buffer accordingly
      const isScrollingDown = velocity > 0
      const predictiveBuffer = Math.abs(velocity) > 50 ? Math.round(dynamicOverscan * 0.8) : 0
      
      const start = Math.max(0, startIndex - dynamicOverscan - (isScrollingDown ? 0 : predictiveBuffer))
      const end = Math.min(
        items.length - 1, 
        startIndex + visibleCount + dynamicOverscan + (isScrollingDown ? predictiveBuffer : 0)
      )
      
      return { start, end }
    }, [findStartIndex, items.length, height, overscan, velocityMultiplier])

    const updateVisibleItemsBasedOnScroll = useCallback((scrollTop: number, velocity: number, immediate = false) => {
      const range = calculateVisibleRange(scrollTop, velocity)
      const indices: number[] = []
      
      for (let i = range.start; i <= range.end; i++) {
        indices.push(i)
      }
      
      setItemIndices(indices)
      onRangeChange?.(range.start, range.end)
      
      // Force immediate DOM update if needed
      if (immediate) {
        setTimeout(() => {
          // Re-observe items after DOM update
          if (enableIntersectionObserver && !isScrolling) {
            observeItems()
          }
        }, 0)
      }
    }, [calculateVisibleRange, onRangeChange, enableIntersectionObserver, isScrolling])

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
      
      // Immediate update to prevent white screens
      updateVisibleItemsBasedOnScroll(currentScrollTop, scrollVelocity, true)
      
      // Clear existing timers
      if (scrollEndTimerRef.current !== null) {
        clearTimeout(scrollEndTimerRef.current)
      }
      if (immediateUpdateTimerRef.current !== null) {
        clearTimeout(immediateUpdateTimerRef.current)
      }
      
      // Immediate update after a very short delay for responsiveness
      immediateUpdateTimerRef.current = window.setTimeout(() => {
        updateVisibleItemsBasedOnScroll(currentScrollTop, scrollVelocity, true)
      }, 8) // 8ms for 120fps responsiveness
      
      // Set scroll end detection with reduced delay
      scrollEndTimerRef.current = window.setTimeout(() => {
        setIsScrolling(false)
        setScrollVelocity(0)
        
        // Force a comprehensive update when scrolling stops
        updateVisibleItemsBasedOnScroll(currentScrollTop, 0, true)
        
        // Additional safety update after a short delay
        setTimeout(() => {
          updateVisibleItemsBasedOnScroll(target.scrollTop, 0, true)
        }, 16) // One frame delay for safety
        
        onScrollStateChange?.(false, 0)
      }, scrollEndDelay)
      
      onScrollStateChange?.(true, scrollVelocity)
    }, [scrollVelocity, updateVisibleItemsBasedOnScroll, scrollEndDelay, onScrollStateChange])

    const updateVisibleItems = useCallback((currentVisible: Set<number>) => {
      // Use scroll-based calculation as primary method
      const scrollTop = containerRef.current?.scrollTop || 0
      updateVisibleItemsBasedOnScroll(scrollTop, scrollVelocity)
      
      // Use intersection observer for fine-tuning only during slow/no scroll
      if (currentVisible.size > 0 && scrollVelocity < 50) {
        const indices: number[] = []
        const min = Math.max(0, Math.min(...currentVisible) - overscan)
        const max = Math.min(items.length - 1, Math.max(...currentVisible) + overscan)
        
        for (let i = min; i <= max; i++) {
          indices.push(i)
        }
        
        // Only update if the range is reasonable and not too different
        if (indices.length > 0 && indices.length < 100) {
          setItemIndices(indices)
        }
      }
    }, [updateVisibleItemsBasedOnScroll, scrollVelocity, overscan, items.length])

    const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
      // Only process intersection updates during slow scrolling or when stopped
      if (isScrolling && scrollVelocity > 50) {
        return
      }
      
      const newVisible = new Set(visibleItems)
      let hasChanges = false
      
      entries.forEach(entry => {
        const index = parseInt(entry.target.getAttribute('data-index') || '0')
        
        if (entry.isIntersecting && !newVisible.has(index)) {
          newVisible.add(index)
          hasChanges = true
        } else if (!entry.isIntersecting && newVisible.has(index)) {
          newVisible.delete(index)
          hasChanges = true
        }
      })
      
      if (hasChanges) {
        setVisibleItems(newVisible)
        updateVisibleItems(newVisible)
        onVisibleChange?.(Array.from(newVisible), entries)
      }
    }, [isScrolling, scrollVelocity, visibleItems, updateVisibleItems, onVisibleChange])

    const observeItems = useCallback(() => {
      if (!containerRef.current || !observerRef.current || !enableIntersectionObserver) return
      
      // Disconnect previous observations
      observerRef.current.disconnect()
      
      // Wait for DOM to be ready
      setTimeout(() => {
        if (!containerRef.current || !observerRef.current) return
        
        const items = containerRef.current.querySelectorAll('.virtual-scroll-item')
        items.forEach(item => {
          observerRef.current!.observe(item)
        })
      }, 0)
    }, [enableIntersectionObserver])

    const scrollToIndex = useCallback((index: number) => {
      if (!containerRef.current) return
      
      const position = positionCacheRef.current.get(index)
      if (!position) return
      
      // Pre-expand visible range for smooth jump scrolling
      const range = calculateVisibleRange(position.offset, 0)
      const indices: number[] = []
      
      // Ensure target index is included with extra buffer
      const expandedStart = Math.max(0, Math.min(range.start, index - overscan * 2))
      const expandedEnd = Math.min(items.length - 1, Math.max(range.end, index + overscan * 2))
      
      for (let i = expandedStart; i <= expandedEnd; i++) {
        indices.push(i)
      }
      
      setItemIndices(indices)
      
      // Scroll after updating indices
      requestAnimationFrame(() => {
        containerRef.current!.scrollTop = position.offset
        
        // Force update after scroll
        setTimeout(() => {
          updateVisibleItemsBasedOnScroll(position.offset, 0, true)
        }, 16)
      })
    }, [calculateVisibleRange, items.length, overscan, updateVisibleItemsBasedOnScroll])

    useImperativeHandle(ref, () => ({
      scrollToIndex
    }), [scrollToIndex])

    // Initialize
    useEffect(() => {
      calculatePositions()
      
      if (enableIntersectionObserver && containerRef.current) {
        observerRef.current = new IntersectionObserver(handleIntersection, {
          root: containerRef.current,
          rootMargin,
          threshold
        })
      }
      
      // Initialize with scroll-based calculation
      updateVisibleItemsBasedOnScroll(0, 0, true)
      setIsInitialized(true)
      
      // Start observing after a short delay
      if (enableIntersectionObserver) {
        setTimeout(observeItems, 16)
      }

      return () => {
        observerRef.current?.disconnect()
      }
    }, [])

    // Update when items change
    useEffect(() => {
      calculatePositions()
      updateVisibleItemsBasedOnScroll(containerRef.current?.scrollTop || 0, scrollVelocity, true)
    }, [items.length, itemHeight, calculatePositions, updateVisibleItemsBasedOnScroll, scrollVelocity])

    // Re-observe when indices change
    useEffect(() => {
      if (enableIntersectionObserver && isInitialized) {
        observeItems()
      }
    }, [itemIndices, enableIntersectionObserver, isInitialized, observeItems])

    // Cleanup
    useEffect(() => {
      return () => {
        if (scrollEndTimerRef.current !== null) {
          clearTimeout(scrollEndTimerRef.current)
        }
        if (immediateUpdateTimerRef.current !== null) {
          clearTimeout(immediateUpdateTimerRef.current)
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
        className={`virtual-scroll-observer-optimized ${className || ''}`}
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

VirtualScrollObserverOptimized.displayName = 'VirtualScrollObserverOptimized'