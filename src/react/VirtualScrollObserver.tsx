import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'

export interface VirtualScrollObserverProps {
  items: any[]
  itemHeight: number | ((index: number) => number)
  height: number
  renderItem: (props: { index: number; data: any }) => React.ReactNode
  rootMargin?: string
  threshold?: number | number[]
  overscan?: number
  onVisibleChange?: (visible: number[], entries: IntersectionObserverEntry[]) => void
  className?: string
  style?: React.CSSProperties
}

export interface VirtualScrollObserverHandle {
  scrollToIndex: (index: number) => void
}

export const VirtualScrollObserver = forwardRef<VirtualScrollObserverHandle, VirtualScrollObserverProps>(
  ({
    items,
    itemHeight,
    height,
    renderItem,
    rootMargin = '50px',
    threshold = 0,
    overscan = 3,
    onVisibleChange,
    className,
    style
  }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const observerRef = useRef<IntersectionObserver | null>(null)
    const [visibleItems, setVisibleItems] = useState(new Set<number>())
    const [itemIndices, setItemIndices] = useState<number[]>([])

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

    const updateVisibleItems = useCallback((currentVisible: Set<number>) => {
      const indices: number[] = []
      if (currentVisible.size === 0) {
        const initialCount = Math.ceil(height / getItemHeight(0)) + overscan * 2
        setItemIndices(Array.from({ length: Math.min(initialCount, items.length) }, (_, i) => i))
        return
      }

      const min = Math.max(0, Math.min(...currentVisible) - overscan)
      const max = Math.min(items.length - 1, Math.max(...currentVisible) + overscan)
      
      for (let i = min; i <= max; i++) {
        indices.push(i)
      }
      
      setItemIndices(indices)
    }, [items.length, height, overscan, getItemHeight])

    const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
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
    }, [visibleItems, updateVisibleItems, onVisibleChange])

    const scrollToIndex = useCallback((index: number) => {
      if (!containerRef.current) return
      
      let offset = 0
      for (let i = 0; i < index; i++) {
        offset += getItemHeight(i)
      }
      
      containerRef.current.scrollTop = offset
    }, [getItemHeight])

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

      updateVisibleItems(new Set())

      return () => {
        observerRef.current?.disconnect()
      }
    }, [handleIntersection, rootMargin, threshold, updateVisibleItems])

    useEffect(() => {
      if (!containerRef.current || !observerRef.current) return

      observerRef.current.disconnect()
      
      const items = containerRef.current.querySelectorAll('.virtual-scroll-item')
      items.forEach(item => {
        observerRef.current!.observe(item)
      })
    }, [itemIndices])

    useEffect(() => {
      updateVisibleItems(visibleItems)
    }, [items.length, updateVisibleItems, visibleItems])

    const containerStyle: React.CSSProperties = {
      height: `${height}px`,
      overflow: 'auto',
      position: 'relative',
      ...style
    }

    const spacerStyle: React.CSSProperties = {
      height: `${getTotalHeight()}px`,
      position: 'relative'
    }

    return (
      <div
        ref={containerRef}
        className={className}
        style={containerStyle}
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

VirtualScrollObserver.displayName = 'VirtualScrollObserver'