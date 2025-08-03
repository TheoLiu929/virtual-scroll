import React, { useRef, useState, useCallback, useEffect } from 'react'
import { VirtualScrollObserverOptimized, VirtualScrollObserverOptimizedHandle } from '../../../src/react/VirtualScrollObserverOptimized'

interface Item {
  id: number
  title: string
  description: string
  timestamp: string
  category: string
}

interface PerformanceMetrics {
  totalItems: number
  visibleRange: { start: number; end: number }
  scrollVelocity: number
  isScrolling: boolean
  updateCount: number
  avgUpdateTime: number
  lastUpdate: string
  frameRate: number
}

interface TestResults {
  whiteScreenCount: number
  emergencyActivationCount: number
  loadFailureCount: number
  smoothTransitionCount: number
  testStatus: string
}

function AppFinal() {
  const virtualScrollRef = useRef<VirtualScrollObserverOptimizedHandle>(null)
  const [variableHeight, setVariableHeight] = useState(false)
  const [targetIndex, setTargetIndex] = useState(-1)
  const [items, setItems] = useState(() => generateItems(10000))
  
  // Performance tracking state
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalItems: 10000,
    visibleRange: { start: 0, end: 0 },
    scrollVelocity: 0,
    isScrolling: false,
    updateCount: 0,
    avgUpdateTime: 0,
    lastUpdate: 'N/A',
    frameRate: 60
  })
  
  // Test results tracking
  const [testResults, setTestResults] = useState<TestResults>({
    whiteScreenCount: 0,
    emergencyActivationCount: 0,
    loadFailureCount: 0,
    smoothTransitionCount: 0,
    testStatus: 'Ready'
  })
  
  // Performance monitoring refs
  const updateTimesRef = useRef<number[]>([])
  const lastUpdateTimeRef = useRef(performance.now())
  const frameCountRef = useRef(0)
  const lastFrameTimeRef = useRef(performance.now())

  function generateItems(count: number, startIndex = 0): Item[] {
    return Array.from({ length: count }, (_, i) => {
      const index = startIndex + i
      return {
        id: index,
        title: `Item ${index}`,
        description: `This is item #${index}. ${
          Math.random() > 0.5 
            ? 'Extended description to test variable height scrolling and performance under different content lengths.' 
            : 'Short description.'
        }`,
        timestamp: new Date().toISOString(),
        category: ['Important', 'Normal', 'Low'][index % 3]
      }
    })
  }

  const getItemHeight = useCallback((index: number) => {
    if (variableHeight) {
      const base = 80
      const variation = (index % 5) * 20
      return base + variation
    }
    return 80
  }, [variableHeight])

  const getItemStatus = useCallback((index: number) => {
    const { start, end } = metrics.visibleRange
    if (index >= start && index <= end) {
      return metrics.isScrolling ? 'Scrolling' : 'Visible'
    }
    return 'Hidden'
  }, [metrics.visibleRange, metrics.isScrolling])

  // Frame rate monitoring
  useEffect(() => {
    function measureFrameRate() {
      frameCountRef.current++
      const now = performance.now()
      const elapsed = now - lastFrameTimeRef.current
      
      if (elapsed >= 1000) {
        const frameRate = Math.round(frameCountRef.current * 1000 / elapsed)
        setMetrics(prev => ({ ...prev, frameRate }))
        frameCountRef.current = 0
        lastFrameTimeRef.current = now
      }
      
      requestAnimationFrame(measureFrameRate)
    }
    
    measureFrameRate()
  }, [])

  const handleScrollStateChange = useCallback((isScrolling: boolean, velocity: number) => {
    const now = performance.now()
    const updateTime = now - lastUpdateTimeRef.current
    lastUpdateTimeRef.current = now
    
    // Update performance metrics
    setMetrics(prev => {
      const newUpdateTimes = [...updateTimesRef.current, updateTime]
      if (newUpdateTimes.length > 100) {
        newUpdateTimes.shift()
      }
      updateTimesRef.current = newUpdateTimes
      
      const avgUpdateTime = newUpdateTimes.length > 0 
        ? newUpdateTimes.reduce((a, b) => a + b, 0) / newUpdateTimes.length
        : 0
      
      return {
        ...prev,
        isScrolling,
        scrollVelocity: velocity,
        updateCount: prev.updateCount + 1,
        avgUpdateTime,
        lastUpdate: new Date().toLocaleTimeString()
      }
    })
    
    // Check for smooth transitions
    if (!isScrolling && velocity === 0) {
      setTestResults(prev => ({
        ...prev,
        smoothTransitionCount: prev.smoothTransitionCount + 1
      }))
    }
  }, [])

  const handleRangeChange = useCallback((start: number, end: number) => {
    setMetrics(prev => ({
      ...prev,
      visibleRange: { start, end }
    }))
    
    // Check for white screen (no items rendered)
    if (end - start < 0) {
      setTestResults(prev => ({
        ...prev,
        whiteScreenCount: prev.whiteScreenCount + 1
      }))
    }
  }, [])

  const handleVisibleChange = useCallback((visible: number[]) => {
    // Monitor visible items for load failures
    if (visible.length === 0 && items.length > 0) {
      setTestResults(prev => ({
        ...prev,
        loadFailureCount: prev.loadFailureCount + 1
      }))
    }
  }, [items.length])

  const handleWhiteScreenDetected = useCallback(() => {
    setTestResults(prev => ({
      ...prev,
      whiteScreenCount: prev.whiteScreenCount + 1
    }))
    console.warn('White screen detected and recovered!')
  }, [])

  const handleEmergencyModeActivated = useCallback(() => {
    setTestResults(prev => ({
      ...prev,
      emergencyActivationCount: prev.emergencyActivationCount + 1
    }))
    console.warn('Emergency mode activated!')
  }, [])

  // Test functions
  const scrollToRandom = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * items.length)
    setTargetIndex(randomIndex)
    setTestResults(prev => ({ ...prev, testStatus: `Scrolling to ${randomIndex}...` }))
    
    virtualScrollRef.current?.scrollToIndex(randomIndex)
    
    setTimeout(() => {
      setTestResults(prev => ({ ...prev, testStatus: 'Random scroll completed' }))
      setTargetIndex(-1)
    }, 1000)
  }, [items.length])

  const scrollToSpecific = useCallback(() => {
    setTargetIndex(5000)
    setTestResults(prev => ({ ...prev, testStatus: 'Jumping to #5000...' }))
    
    virtualScrollRef.current?.scrollToIndex(5000)
    
    setTimeout(() => {
      setTestResults(prev => ({ ...prev, testStatus: 'Jump completed' }))
      setTargetIndex(-1)
    }, 1000)
  }, [])

  const rapidScrollTest = useCallback(async () => {
    setTestResults(prev => ({ ...prev, testStatus: 'Running rapid scroll test...' }))
    const positions = [0, 2000, 5000, 1000, 8000, 3000, 9000]
    
    for (const pos of positions) {
      virtualScrollRef.current?.scrollToIndex(pos)
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    setTestResults(prev => ({ ...prev, testStatus: 'Rapid scroll test completed' }))
  }, [])

  const stopScrollTest = useCallback(async () => {
    setTestResults(prev => ({ ...prev, testStatus: 'Testing scroll stop behavior...' }))
    
    // Start fast scroll
    virtualScrollRef.current?.scrollToIndex(7000)
    
    // Wait a bit then immediately scroll to another position
    setTimeout(() => {
      virtualScrollRef.current?.scrollToIndex(3000)
    }, 100)
    
    setTimeout(() => {
      setTestResults(prev => ({ ...prev, testStatus: 'Stop scroll test completed' }))
    }, 1000)
  }, [])

  const extremeScrollTest = useCallback(async () => {
    setTestResults(prev => ({ ...prev, testStatus: 'Running extreme scroll test...' }))
    
    // 模拟极端快速连续滚动
    const positions = [0, 5000, 1000, 8000, 2000, 9000, 500, 7000]
    
    for (let i = 0; i < positions.length; i++) {
      virtualScrollRef.current?.scrollToIndex(positions[i])
      // 极短间隔，模拟用户疯狂滑动
      await new Promise(resolve => setTimeout(resolve, 50))
      
      if (i === 4) {
        // 在中途突然停止，测试白屏保护
        setTestResults(prev => ({ ...prev, testStatus: 'Extreme scroll with sudden stop...' }))
        await new Promise(resolve => setTimeout(resolve, 200))
        break
      }
    }
    
    setTestResults(prev => ({ ...prev, testStatus: 'Extreme scroll test completed' }))
  }, [])

  const emergencyRecoveryTest = useCallback(async () => {
    setTestResults(prev => ({ ...prev, testStatus: 'Testing emergency recovery...' }))
    
    // 强制触发紧急恢复
    if (virtualScrollRef.current && 'emergencyRecover' in virtualScrollRef.current) {
      ;(virtualScrollRef.current as any).emergencyRecover()
      setTestResults(prev => ({ ...prev, testStatus: 'Emergency recovery triggered' }))
    }
    
    setTimeout(() => {
      setTestResults(prev => ({ ...prev, testStatus: 'Emergency recovery test completed' }))
    }, 1000)
  }, [])

  const toggleItemHeight = useCallback(() => {
    setVariableHeight(prev => !prev)
    setTestResults(prev => ({ 
      ...prev, 
      testStatus: `Switched to ${!variableHeight ? 'variable' : 'fixed'} height` 
    }))
  }, [variableHeight])

  const addItems = useCallback(() => {
    const currentLength = items.length
    const newItems = [...items, ...generateItems(5000, currentLength)]
    setItems(newItems)
    setMetrics(prev => ({ ...prev, totalItems: newItems.length }))
    setTestResults(prev => ({ 
      ...prev, 
      testStatus: `Added 5000 items (total: ${newItems.length})` 
    }))
  }, [items])

  const renderItem = useCallback(({ index, data }: { index: number; data: Item }) => (
    <div 
      className={`item ${
        metrics.isScrolling ? 'is-scrolling' : ''
      } ${
        index % 2 === 0 ? 'is-even' : ''
      } ${
        index === targetIndex ? 'is-target' : ''
      }`}
    >
      <div className="item-index">{index}</div>
      <div className="item-content">
        <div className="item-title">{data.title}</div>
        <div className="item-description">{data.description}</div>
        <div className="item-meta">
          Height: {typeof getItemHeight === 'function' ? getItemHeight(index) : getItemHeight}px | 
          Status: {getItemStatus(index)}
        </div>
      </div>
    </div>
  ), [metrics.isScrolling, targetIndex, getItemHeight, getItemStatus])

  return (
    <div className="app">
      <h1>React Virtual Scroll - Final Optimized Version</h1>
      
      <div className="controls">
        <button onClick={scrollToRandom}>Random Scroll Test</button>
        <button onClick={scrollToSpecific}>Jump to #5000</button>
        <button onClick={rapidScrollTest}>Rapid Scroll Test</button>
        <button onClick={stopScrollTest}>Stop Scroll Test</button>
        <button onClick={extremeScrollTest}>Extreme Scroll Test</button>
        <button onClick={emergencyRecoveryTest}>Emergency Recovery Test</button>
        <button onClick={toggleItemHeight}>
          {variableHeight ? 'Fixed Height' : 'Variable Height'}
        </button>
        <button onClick={addItems}>Add 5000 Items</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Performance Metrics</h3>
          <div>Total Items: {metrics.totalItems.toLocaleString()}</div>
          <div>Visible Range: {metrics.visibleRange.start} - {metrics.visibleRange.end}</div>
          <div>Rendered Items: {metrics.visibleRange.end - metrics.visibleRange.start + 1}</div>
          <div>Scroll Velocity: {Math.round(metrics.scrollVelocity)}px/s</div>
          <div>Is Scrolling: {metrics.isScrolling ? 'Yes' : 'No'}</div>
        </div>
        
        <div className="stat-card">
          <h3>Test Results</h3>
          <div>White Screen Issues: {testResults.whiteScreenCount}</div>
          <div>Emergency Activations: {testResults.emergencyActivationCount}</div>
          <div>Load Failures: {testResults.loadFailureCount}</div>
          <div>Smooth Transitions: {testResults.smoothTransitionCount}</div>
          <div>Test Status: {testResults.testStatus}</div>
        </div>
        
        <div className="stat-card">
          <h3>Advanced Stats</h3>
          <div>Update Count: {metrics.updateCount}</div>
          <div>Avg Update Time: {metrics.avgUpdateTime.toFixed(2)}ms</div>
          <div>Last Update: {metrics.lastUpdate}</div>
          <div>Frame Rate: {metrics.frameRate}fps</div>
        </div>
      </div>

      <VirtualScrollObserverOptimized
        ref={virtualScrollRef}
        items={items}
        itemHeight={getItemHeight}
        height={500}
        overscan={3}
        velocityMultiplier={2}
        scrollEndDelay={30}
        enableIntersectionObserver={true}
        emergencyTimeout={16}
        whiteScreenProtection={true}
        onScrollStateChange={handleScrollStateChange}
        onRangeChange={handleRangeChange}
        onVisibleChange={handleVisibleChange}
        onWhiteScreenDetected={handleWhiteScreenDetected}
        onEmergencyModeActivated={handleEmergencyModeActivated}
        renderItem={renderItem}
        className="virtual-scroll-observer-optimized"
      />
    </div>
  )
}

export default AppFinal