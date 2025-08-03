export interface OptimizedOptions {
  itemCount: number
  itemHeight: number | ((index: number) => number)
  containerHeight: number
  overscanCount?: number
  minOverscan?: number
  maxOverscan?: number
  scrollVelocityThreshold?: number
}

export interface OptimizedState {
  startIndex: number
  endIndex: number
  scrollOffset: number
  scrollVelocity: number
  overscan: number
  isScrolling: boolean
}

export class VirtualScrollOptimized {
  private options: Required<OptimizedOptions>
  private state: OptimizedState
  private itemPositionCache: Map<number, { offset: number; size: number }>
  private lastScrollTime: number = 0
  private lastScrollOffset: number = 0
  private scrollEndTimer: number | null = null
  private updateCallback?: (state: OptimizedState) => void

  constructor(options: OptimizedOptions) {
    this.options = {
      overscanCount: 3,
      minOverscan: 1,
      maxOverscan: 10,
      scrollVelocityThreshold: 100,
      ...options
    }

    this.state = {
      startIndex: 0,
      endIndex: 0,
      scrollOffset: 0,
      scrollVelocity: 0,
      overscan: this.options.overscanCount,
      isScrolling: false
    }

    this.itemPositionCache = new Map()
    this.calculateItemPositions()
    this.updateVisibleRange()
  }

  private getItemHeight(index: number): number {
    return typeof this.options.itemHeight === 'function'
      ? this.options.itemHeight(index)
      : this.options.itemHeight
  }

  private calculateItemPositions(): void {
    let offset = 0
    for (let i = 0; i < this.options.itemCount; i++) {
      const size = this.getItemHeight(i)
      this.itemPositionCache.set(i, { offset, size })
      offset += size
    }
  }

  private findStartIndex(scrollOffset: number): number {
    // Binary search for efficiency
    let low = 0
    let high = this.options.itemCount - 1

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const position = this.itemPositionCache.get(mid)!
      
      if (position.offset <= scrollOffset && position.offset + position.size > scrollOffset) {
        return mid
      } else if (position.offset > scrollOffset) {
        high = mid - 1
      } else {
        low = mid + 1
      }
    }

    return Math.max(0, low - 1)
  }

  private calculateVelocity(scrollOffset: number): number {
    const now = Date.now()
    const timeDelta = now - this.lastScrollTime
    
    if (timeDelta === 0) return this.state.scrollVelocity

    const offsetDelta = Math.abs(scrollOffset - this.lastScrollOffset)
    const velocity = offsetDelta / timeDelta * 1000 // pixels per second

    this.lastScrollTime = now
    this.lastScrollOffset = scrollOffset

    return velocity
  }

  private calculateDynamicOverscan(velocity: number): number {
    const { minOverscan, maxOverscan, overscanCount, scrollVelocityThreshold } = this.options
    
    // Calculate overscan based on velocity
    const velocityFactor = Math.min(velocity / scrollVelocityThreshold, 3)
    const dynamicOverscan = Math.round(overscanCount * (1 + velocityFactor))
    
    return Math.max(minOverscan, Math.min(maxOverscan, dynamicOverscan))
  }

  private updateVisibleRange(): void {
    const { scrollOffset } = this.state
    const startIndex = this.findStartIndex(scrollOffset)
    
    // Calculate dynamic overscan based on scroll velocity
    const overscan = this.calculateDynamicOverscan(this.state.scrollVelocity)
    
    // Calculate visible item count
    let visibleItemCount = 0
    
    for (let i = startIndex; i < this.options.itemCount; i++) {
      const position = this.itemPositionCache.get(i)!
      if (position.offset - scrollOffset >= this.options.containerHeight) {
        break
      }
      visibleItemCount++
    }

    this.state = {
      ...this.state,
      startIndex: Math.max(0, startIndex - overscan),
      endIndex: Math.min(this.options.itemCount - 1, startIndex + visibleItemCount + overscan),
      overscan
    }
  }

  public handleScroll(scrollOffset: number): void {
    const velocity = this.calculateVelocity(scrollOffset)
    
    this.state = {
      ...this.state,
      scrollOffset,
      scrollVelocity: velocity,
      isScrolling: true
    }

    this.updateVisibleRange()
    this.notifyUpdate()

    // Handle scroll end
    if (this.scrollEndTimer !== null) {
      clearTimeout(this.scrollEndTimer)
    }

    this.scrollEndTimer = window.setTimeout(() => {
      this.state = {
        ...this.state,
        scrollVelocity: 0,
        isScrolling: false,
        overscan: this.options.overscanCount
      }
      this.updateVisibleRange()
      this.notifyUpdate()
    }, 150)
  }

  public scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start'): number {
    const position = this.itemPositionCache.get(index)
    if (!position) return this.state.scrollOffset

    let targetOffset = position.offset

    if (align === 'center') {
      targetOffset = position.offset - (this.options.containerHeight - position.size) / 2
    } else if (align === 'end') {
      targetOffset = position.offset - this.options.containerHeight + position.size
    }

    // Pre-calculate the visible range for the target position
    const targetState = {
      ...this.state,
      scrollOffset: targetOffset
    }
    
    // Ensure items around target are included
    const targetOverscan = this.options.maxOverscan
    targetState.startIndex = Math.max(0, index - targetOverscan)
    targetState.endIndex = Math.min(this.options.itemCount - 1, index + targetOverscan)

    this.state = targetState
    this.notifyUpdate()

    return Math.max(0, Math.min(targetOffset, this.getTotalHeight() - this.options.containerHeight))
  }

  public getTotalHeight(): number {
    const lastPosition = this.itemPositionCache.get(this.options.itemCount - 1)
    return lastPosition ? lastPosition.offset + lastPosition.size : 0
  }

  public getItemOffset(index: number): number {
    return this.itemPositionCache.get(index)?.offset || 0
  }

  public getItemSize(index: number): number {
    return this.itemPositionCache.get(index)?.size || 0
  }

  public getState(): OptimizedState {
    return { ...this.state }
  }

  public onUpdate(callback: (state: OptimizedState) => void): void {
    this.updateCallback = callback
  }

  private notifyUpdate(): void {
    this.updateCallback?.(this.getState())
  }

  public updateOptions(options: Partial<OptimizedOptions>): void {
    const needsRecalculation = 
      options.itemCount !== undefined ||
      options.itemHeight !== undefined

    Object.assign(this.options, options)

    if (needsRecalculation) {
      this.calculateItemPositions()
      this.updateVisibleRange()
      this.notifyUpdate()
    }
  }

  public destroy(): void {
    if (this.scrollEndTimer !== null) {
      clearTimeout(this.scrollEndTimer)
    }
    this.updateCallback = undefined
  }
}