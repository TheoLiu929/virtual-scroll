export interface VirtualScrollOptions {
  itemHeight: number | ((index: number) => number)
  itemCount: number
  containerHeight: number
  buffer?: number
  horizontal?: boolean
}

export interface ScrollPosition {
  scrollTop: number
  scrollLeft: number
}

export interface VisibleRange {
  start: number
  end: number
}

export interface ItemPosition {
  index: number
  offset: number
  size: number
}

export interface VirtualScrollState {
  visibleRange: VisibleRange
  scrollOffset: number
  totalHeight: number
  itemPositions: Map<number, ItemPosition>
}