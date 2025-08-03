import { VirtualScrollOptions, VirtualScrollState, ScrollPosition } from './types'
import { throttle, calculateItemPositions, getVisibleRange, getTotalHeight } from './utils'

export class VirtualScrollCore {
  private options: Required<VirtualScrollOptions>
  private state: VirtualScrollState
  private scrollHandler: (position: ScrollPosition) => void
  private updateCallback?: (state: VirtualScrollState) => void

  constructor(options: VirtualScrollOptions) {
    this.options = {
      buffer: 5,
      horizontal: false,
      ...options
    }
    
    this.state = {
      visibleRange: { start: 0, end: 0 },
      scrollOffset: 0,
      totalHeight: 0,
      itemPositions: new Map()
    }
    
    this.scrollHandler = throttle(this.handleScroll.bind(this), 16)
    this.initialize()
  }

  private initialize(): void {
    this.state.itemPositions = calculateItemPositions(
      this.options.itemCount,
      this.options.itemHeight,
      this.state.itemPositions
    )
    
    this.state.totalHeight = getTotalHeight(this.state.itemPositions)
    this.updateVisibleRange()
  }

  private handleScroll(position: ScrollPosition): void {
    const offset = this.options.horizontal ? position.scrollLeft : position.scrollTop
    
    if (Math.abs(offset - this.state.scrollOffset) < 1) {
      return
    }
    
    this.state.scrollOffset = offset
    this.updateVisibleRange()
    this.notifyUpdate()
  }

  private updateVisibleRange(): void {
    this.state.visibleRange = getVisibleRange(
      this.state.scrollOffset,
      this.options.containerHeight,
      this.state.itemPositions,
      this.options.buffer
    )
  }

  private notifyUpdate(): void {
    if (this.updateCallback) {
      this.updateCallback(this.getState())
    }
  }

  public onScroll(position: ScrollPosition): void {
    this.scrollHandler(position)
  }

  public onUpdate(callback: (state: VirtualScrollState) => void): void {
    this.updateCallback = callback
  }

  public updateOptions(options: Partial<VirtualScrollOptions>): void {
    const shouldReinitialize = 
      options.itemCount !== undefined ||
      options.itemHeight !== undefined ||
      options.containerHeight !== undefined

    Object.assign(this.options, options)
    
    if (shouldReinitialize) {
      this.initialize()
      this.notifyUpdate()
    }
  }

  public getState(): VirtualScrollState {
    return {
      ...this.state,
      itemPositions: new Map(this.state.itemPositions)
    }
  }

  public scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start'): number {
    const position = this.state.itemPositions.get(index)
    if (!position) return this.state.scrollOffset
    
    let offset = position.offset
    
    if (align === 'center') {
      offset = position.offset - (this.options.containerHeight - position.size) / 2
    } else if (align === 'end') {
      offset = position.offset - this.options.containerHeight + position.size
    }
    
    return Math.max(0, Math.min(offset, this.state.totalHeight - this.options.containerHeight))
  }

  public destroy(): void {
    this.updateCallback = undefined
  }
}