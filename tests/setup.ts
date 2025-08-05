import '@testing-library/jest-dom'

// Mock performance.now for tests
if (!global.performance) {
  global.performance = {
    now: () => Date.now()
  } as Performance
}

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 16)
}

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id)
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }

  callback: IntersectionObserverCallback
  root: Element | null = null
  rootMargin: string = '0px'
  thresholds: ReadonlyArray<number> = [0]

  observe() {
    // Mock implementation
  }

  unobserve() {
    // Mock implementation
  }

  disconnect() {
    // Mock implementation
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  callback: ResizeObserverCallback

  observe() {
    // Mock implementation
  }

  unobserve() {
    // Mock implementation
  }

  disconnect() {
    // Mock implementation
  }
}