export interface VirtualWindowOptions {
  itemCount: number
  scrollOffset: number
  viewportSize: number
  itemSize: number
  threshold: number
  overscan?: number
}

export interface VirtualWindowResult {
  virtualized: boolean
  start: number
  end: number
  before: number
  after: number
}

export function computeVirtualWindow({
  itemCount,
  scrollOffset,
  viewportSize,
  itemSize,
  threshold,
  overscan = 6,
}: VirtualWindowOptions): VirtualWindowResult {
  if (itemCount <= threshold || itemSize <= 0) {
    return { virtualized: false, start: 0, end: itemCount, before: 0, after: 0 }
  }
  const start = Math.max(0, Math.floor(Math.max(0, scrollOffset) / itemSize) - overscan)
  const visibleCount = Math.ceil(Math.max(itemSize, viewportSize) / itemSize) + overscan * 2
  const end = Math.min(itemCount, start + visibleCount)
  return {
    virtualized: true,
    start,
    end,
    before: start * itemSize,
    after: Math.max(0, (itemCount - end) * itemSize),
  }
}

