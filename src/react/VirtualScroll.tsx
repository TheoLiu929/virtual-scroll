import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { VirtualScrollCore, VirtualScrollState } from '../core'

export interface VirtualScrollProps {
  items: any[]
  itemHeight: number | ((index: number) => number)
  height: number
  buffer?: number
  horizontal?: boolean
  renderItem: (props: { index: number; data: any; style: React.CSSProperties }) => React.ReactNode
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void
  onVisibleRangeChange?: (start: number, end: number) => void
  className?: string
  style?: React.CSSProperties
}

export interface VirtualScrollHandle {
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void
}

export const VirtualScroll = forwardRef<VirtualScrollHandle, VirtualScrollProps>(
  ({
    items,
    itemHeight,
    height,
    buffer = 5,
    horizontal = false,
    renderItem,
    onScroll,
    onVisibleRangeChange,
    className,
    style
  }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const virtualScrollRef = useRef<VirtualScrollCore | null>(null)
    const [scrollState, setScrollState] = useState<VirtualScrollState>({
      visibleRange: { start: 0, end: 0 },
      scrollOffset: 0,
      totalHeight: 0,
      itemPositions: new Map()
    })

    const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget
      virtualScrollRef.current?.onScroll({
        scrollTop: target.scrollTop,
        scrollLeft: target.scrollLeft
      })
      onScroll?.(event)
    }, [onScroll])

    const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
      if (!virtualScrollRef.current || !containerRef.current) return
      
      const offset = virtualScrollRef.current.scrollToIndex(index, align)
      
      if (horizontal) {
        containerRef.current.scrollLeft = offset
      } else {
        containerRef.current.scrollTop = offset
      }
    }, [horizontal])

    useImperativeHandle(ref, () => ({
      scrollToIndex
    }), [scrollToIndex])

    useEffect(() => {
      virtualScrollRef.current = new VirtualScrollCore({
        itemCount: items.length,
        itemHeight,
        containerHeight: height,
        buffer,
        horizontal
      })

      virtualScrollRef.current.onUpdate((state) => {
        setScrollState(state)
        onVisibleRangeChange?.(state.visibleRange.start, state.visibleRange.end)
      })

      setScrollState(virtualScrollRef.current.getState())

      return () => {
        virtualScrollRef.current?.destroy()
      }
    }, [])

    useEffect(() => {
      virtualScrollRef.current?.updateOptions({
        itemCount: items.length,
        itemHeight,
        containerHeight: height,
        buffer,
        horizontal
      })
    }, [items.length, itemHeight, height, buffer, horizontal])

    const containerStyle: React.CSSProperties = {
      height: `${height}px`,
      overflow: 'auto',
      position: 'relative',
      ...style
    }

    const spacerStyle: React.CSSProperties = horizontal
      ? { width: `${scrollState.totalHeight}px`, height: '100%' }
      : { height: `${scrollState.totalHeight}px`, width: '100%' }

    const contentStyle: React.CSSProperties = {
      transform: horizontal 
        ? `translateX(${scrollState.scrollOffset}px)` 
        : `translateY(${scrollState.scrollOffset}px)`,
      position: 'absolute',
      top: 0,
      left: 0
    }

    const visibleItems = []
    const { start, end } = scrollState.visibleRange
    
    for (let i = start; i <= end && i < items.length; i++) {
      const position = scrollState.itemPositions.get(i)
      if (!position) continue

      const itemStyle: React.CSSProperties = {
        position: 'absolute'
      }

      if (horizontal) {
        itemStyle.left = `${position.offset}px`
        itemStyle.width = `${position.size}px`
        itemStyle.height = '100%'
      } else {
        itemStyle.top = `${position.offset}px`
        itemStyle.height = `${position.size}px`
        itemStyle.width = '100%'
      }

      visibleItems.push(
        <div key={i} style={itemStyle}>
          {renderItem({ index: i, data: items[i], style: {} })}
        </div>
      )
    }

    return (
      <div
        ref={containerRef}
        className={className}
        style={containerStyle}
        onScroll={handleScroll}
      >
        <div style={spacerStyle}>
          <div style={contentStyle}>
            {visibleItems}
          </div>
        </div>
      </div>
    )
  }
)

VirtualScroll.displayName = 'VirtualScroll'