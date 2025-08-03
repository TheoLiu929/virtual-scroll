import { VirtualScrollOptions, ItemPosition } from './types'

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let lastCallTime = 0

  return function (...args: Parameters<T>) {
    const now = Date.now()
    const remaining = wait - (now - lastCallTime)

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      lastCallTime = now
      func(...args)
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastCallTime = Date.now()
        timeout = null
        func(...args)
      }, remaining)
    }
  }
}

export function getItemHeight(
  index: number,
  itemHeight: VirtualScrollOptions['itemHeight']
): number {
  return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight
}

export function calculateItemPositions(
  itemCount: number,
  itemHeight: VirtualScrollOptions['itemHeight'],
  cache: Map<number, ItemPosition> = new Map()
): Map<number, ItemPosition> {
  let offset = 0
  
  for (let i = 0; i < itemCount; i++) {
    if (!cache.has(i)) {
      const size = getItemHeight(i, itemHeight)
      cache.set(i, {
        index: i,
        offset,
        size
      })
    }
    const position = cache.get(i)!
    offset = position.offset + position.size
  }
  
  return cache
}

export function findStartIndex(
  scrollOffset: number,
  itemPositions: Map<number, ItemPosition>
): number {
  let left = 0
  let right = itemPositions.size - 1
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const position = itemPositions.get(mid)!
    
    if (position.offset <= scrollOffset && position.offset + position.size > scrollOffset) {
      return mid
    } else if (position.offset > scrollOffset) {
      right = mid - 1
    } else {
      left = mid + 1
    }
  }
  
  return Math.max(0, left - 1)
}

export function getVisibleRange(
  scrollOffset: number,
  containerHeight: number,
  itemPositions: Map<number, ItemPosition>,
  buffer: number = 5
): { start: number; end: number } {
  const startIndex = findStartIndex(scrollOffset, itemPositions)
  const start = Math.max(0, startIndex - buffer)
  
  let accumulatedHeight = 0
  let end = start
  
  for (let i = start; i < itemPositions.size; i++) {
    const position = itemPositions.get(i)!
    if (position.offset - scrollOffset > containerHeight + buffer * getAverageItemHeight(itemPositions)) {
      break
    }
    end = i
  }
  
  return {
    start,
    end: Math.min(itemPositions.size - 1, end + buffer)
  }
}

function getAverageItemHeight(itemPositions: Map<number, ItemPosition>): number {
  if (itemPositions.size === 0) return 0
  
  let totalHeight = 0
  itemPositions.forEach(position => {
    totalHeight += position.size
  })
  
  return totalHeight / itemPositions.size
}

export function getTotalHeight(itemPositions: Map<number, ItemPosition>): number {
  if (itemPositions.size === 0) return 0
  
  const lastPosition = itemPositions.get(itemPositions.size - 1)!
  return lastPosition.offset + lastPosition.size
}