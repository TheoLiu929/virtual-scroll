import React, { useState, useRef } from 'react'
import { VirtualScrollObserver, VirtualScrollObserverHandle } from 'virtual-scroll-component/react'

interface Item {
  id: number
  title: string
  description: string
}

function generateItems(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    title: `Item ${i}`,
    description: `This is the description for item ${i}. ${
      Math.random() > 0.5 
        ? 'This item has a longer description to demonstrate variable height scrolling with Intersection Observer.' 
        : ''
    }`
  }))
}

function AppObserver() {
  const virtualScrollRef = useRef<VirtualScrollObserverHandle>(null)
  const [items, setItems] = useState(() => generateItems(10000))
  const [visibleIndices, setVisibleIndices] = useState<number[]>([])
  const [visibleSet, setVisibleSet] = useState(new Set<number>())
  const [variableHeight, setVariableHeight] = useState(false)
  const [rootMargin, setRootMargin] = useState('50px')
  const [intersectionCount, setIntersectionCount] = useState(0)
  const [lastUpdate, setLastUpdate] = useState('')
  const [renderedCount, setRenderedCount] = useState(0)

  const itemHeight = variableHeight
    ? (index: number) => 80 + (index % 3) * 40
    : 80

  const handleVisibleChange = (visible: number[], entries: IntersectionObserverEntry[]) => {
    setVisibleIndices(visible.sort((a, b) => a - b))
    setVisibleSet(new Set(visible))
    setIntersectionCount(prev => prev + 1)
    setLastUpdate(new Date().toLocaleTimeString())
    
    // Count rendered items
    const container = document.querySelector('.virtual-scroll-observer')
    if (container) {
      setRenderedCount(container.querySelectorAll('.virtual-scroll-item').length)
    }
  }

  const scrollToRandom = () => {
    const randomIndex = Math.floor(Math.random() * items.length)
    virtualScrollRef.current?.scrollToIndex(randomIndex)
  }

  const toggleItemHeight = () => {
    setVariableHeight(!variableHeight)
  }

  const addItems = () => {
    setItems([...items, ...generateItems(1000)])
  }

  const changeRootMargin = () => {
    const margins = ['0px', '50px', '100px', '200px']
    const currentIndex = margins.indexOf(rootMargin)
    setRootMargin(margins[(currentIndex + 1) % margins.length])
  }

  const renderItem = ({ index, data }: { index: number; data: Item }) => (
    <div className={`item ${visibleSet.has(index) ? 'visible' : ''}`}>
      <div className="item-index">{index}</div>
      <div className="item-content">
        <div className="item-title">{data.title}</div>
        <div className="item-description">{data.description}</div>
      </div>
    </div>
  )

  return (
    <div className="app">
      <h1>React Virtual Scroll with Intersection Observer</h1>
      
      <div className="controls">
        <button onClick={scrollToRandom}>Scroll to Random</button>
        <button onClick={toggleItemHeight}>
          {variableHeight ? 'Fixed Height' : 'Variable Height'}
        </button>
        <button onClick={addItems}>Add 1000 Items</button>
        <button onClick={changeRootMargin}>
          Root Margin: {rootMargin}
        </button>
      </div>

      <div className="info">
        <div>Total Items: {items.length}</div>
        <div>Visible Items: {visibleIndices.join(', ')}</div>
        <div>Rendered Items: {renderedCount}</div>
      </div>

      <VirtualScrollObserver
        ref={virtualScrollRef}
        items={items}
        itemHeight={itemHeight}
        height={400}
        rootMargin={rootMargin}
        overscan={3}
        renderItem={renderItem}
        onVisibleChange={handleVisibleChange}
        className="virtual-scroll-observer"
      />

      <div className="stats">
        <h3>Performance Stats</h3>
        <div>Intersection Callbacks: {intersectionCount}</div>
        <div>Last Update: {lastUpdate}</div>
      </div>
    </div>
  )
}

export default AppObserver