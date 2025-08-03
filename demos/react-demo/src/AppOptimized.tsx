import { useState, useRef, useCallback, useEffect } from 'react'
import { VirtualScrollOptimized, VirtualScrollOptimizedHandle } from '../../../src/react/VirtualScrollOptimized'
import type { OptimizedState } from '../../../src/core/VirtualScrollOptimized'

interface Item {
  id: number
  title: string
  description: string
  timestamp: string
}

function generateItems(count: number, startIndex = 0): Item[] {
  return Array.from({ length: count }, (_, i) => {
    const index = startIndex + i
    return {
      id: index,
      title: `Item ${index}`,
      description: `This is item #${index}. ${
        Math.random() > 0.5 
          ? 'It has a longer description to demonstrate variable height scrolling with optimized performance.' 
          : 'Short description.'
      }`,
      timestamp: new Date().toISOString().split('T')[0]
    }
  })
}

function AppOptimized() {
  const virtualScrollRef = useRef<VirtualScrollOptimizedHandle>(null)
  const [items, setItems] = useState(() => generateItems(10000))
  const [variableHeight, setVariableHeight] = useState(false)
  const [enableSmoothing, setEnableSmoothing] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString())
  const [updateCount, setUpdateCount] = useState(0)
  const [updateTimes, setUpdateTimes] = useState<number[]>([])
  const [frameRate, setFrameRate] = useState(60)
  
  const [scrollState, setScrollState] = useState<OptimizedState>({
    startIndex: 0,
    endIndex: 0,
    scrollOffset: 0,
    scrollVelocity: 0,
    overscan: 3,
    isScrolling: false
  })

  const lastUpdateTimeRef = useRef(performance.now())
  const frameCountRef = useRef(0)
  const lastFrameTimeRef = useRef(performance.now())

  const itemHeight = variableHeight
    ? (index: number) => {
        const base = 80
        const variation = (index % 5) * 20
        return base + variation
      }
    : 80

  const avgUpdateTime = updateTimes.length === 0 
    ? 0 
    : updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length

  const getItemHeightDisplay = (index: number) => {
    return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight
  }

  useEffect(() => {
    const measureFrameRate = () => {
      frameCountRef.current++
      const now = performance.now()
      const elapsed = now - lastFrameTimeRef.current
      
      if (elapsed >= 1000) {
        setFrameRate(Math.round(frameCountRef.current * 1000 / elapsed))
        frameCountRef.current = 0
        lastFrameTimeRef.current = now
      }
      
      requestAnimationFrame(measureFrameRate)
    }
    
    const rafId = requestAnimationFrame(measureFrameRate)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const handleScrollStateChange = useCallback((state: OptimizedState) => {
    const now = performance.now()
    const updateTime = now - lastUpdateTimeRef.current
    lastUpdateTimeRef.current = now
    
    setScrollState(state)
    setLastUpdate(new Date().toLocaleTimeString())
    setUpdateCount(prev => prev + 1)
    
    setUpdateTimes(prev => {
      const newTimes = [...prev, updateTime]
      return newTimes.slice(-100)
    })
  }, [])

  const scrollToRandom = () => {
    const randomIndex = Math.floor(Math.random() * items.length)
    console.log(`Scrolling to index ${randomIndex}`)
    virtualScrollRef.current?.scrollToIndex(randomIndex, 'center')
  }

  const scrollToSpecific = () => {
    virtualScrollRef.current?.scrollToIndex(5000, 'start')
  }

  const toggleItemHeight = () => {
    setVariableHeight(!variableHeight)
  }

  const addItems = () => {
    setItems(prev => [...prev, ...generateItems(5000, prev.length)])
  }

  const toggleSmoothing = () => {
    setEnableSmoothing(!enableSmoothing)
  }

  const renderItem = ({ index, data, isScrolling }: { index: number; data: Item; isScrolling: boolean }) => (
    <div 
      className={`item ${isScrolling ? 'is-scrolling' : ''} ${index % 2 === 0 ? 'is-even' : ''}`}
    >
      <div className="item-index">{index}</div>
      <div className="item-content">
        <div className="item-title">{data.title}</div>
        <div className="item-description">{data.description}</div>
        <div className="item-meta">
          Height: {getItemHeightDisplay(index)}px | 
          Created: {data.timestamp}
        </div>
      </div>
    </div>
  )

  return (
    <div className="app">
      <h1>React Virtual Scroll Optimized</h1>
      
      <div className="controls">
        <button onClick={scrollToRandom}>Scroll to Random</button>
        <button onClick={scrollToSpecific}>Scroll to #5000</button>
        <button onClick={toggleItemHeight}>
          {variableHeight ? 'Fixed Height' : 'Variable Height'}
        </button>
        <button onClick={addItems}>Add 5000 Items</button>
        <button onClick={toggleSmoothing}>
          Smoothing: {enableSmoothing ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Render Info</h3>
          <div>Total Items: {items.length.toLocaleString()}</div>
          <div>Visible Range: {scrollState.startIndex} - {scrollState.endIndex}</div>
          <div>Rendered Items: {scrollState.endIndex - scrollState.startIndex + 1}</div>
          <div>Current Overscan: {scrollState.overscan}</div>
        </div>
        
        <div className="stat-card">
          <h3>Scroll State</h3>
          <div>Scroll Offset: {Math.round(scrollState.scrollOffset)}px</div>
          <div>Scroll Velocity: {Math.round(scrollState.scrollVelocity)}px/s</div>
          <div>Is Scrolling: {scrollState.isScrolling ? 'Yes' : 'No'}</div>
          <div>Last Update: {lastUpdate}</div>
        </div>
        
        <div className="stat-card">
          <h3>Performance</h3>
          <div>Update Count: {updateCount}</div>
          <div>Avg Update Time: {avgUpdateTime.toFixed(2)}ms</div>
          <div>Frame Rate: {frameRate}fps</div>
        </div>
      </div>

      <VirtualScrollOptimized
        ref={virtualScrollRef}
        items={items}
        itemHeight={itemHeight}
        height={500}
        overscanCount={3}
        minOverscan={1}
        maxOverscan={15}
        scrollVelocityThreshold={300}
        enableIntersectionObserver={enableSmoothing}
        renderItem={renderItem}
        onScrollStateChange={handleScrollStateChange}
        className="virtual-scroll-optimized"
      />
    </div>
  )
}

export default AppOptimized