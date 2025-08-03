import React, { useState, useRef } from 'react'
import { VirtualScroll, VirtualScrollHandle } from '../../../src/react/VirtualScroll'

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
        ? 'This item has a longer description to demonstrate variable height scrolling.' 
        : ''
    }`
  }))
}

function App() {
  const virtualScrollRef = useRef<VirtualScrollHandle>(null)
  const [items, setItems] = useState(() => generateItems(10000))
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 })
  const [variableHeight, setVariableHeight] = useState(false)
  const [horizontal, setHorizontal] = useState(false)

  const itemHeight = variableHeight
    ? (index: number) => 80 + (index % 3) * 40
    : 80

  const handleVisibleRangeChange = (start: number, end: number) => {
    setVisibleRange({ start, end })
  }

  const scrollToRandom = () => {
    const randomIndex = Math.floor(Math.random() * items.length)
    virtualScrollRef.current?.scrollToIndex(randomIndex, 'center')
  }

  const toggleItemHeight = () => {
    setVariableHeight(!variableHeight)
  }

  const addItems = () => {
    setItems([...items, ...generateItems(1000)])
  }

  const renderItem = ({ index, data, style }: { index: number; data: Item; style: React.CSSProperties }) => (
    <div className={`item ${horizontal ? 'horizontal' : ''}`}>
      <div className="item-index">{index}</div>
      <div className="item-content">
        <div className="item-title">{data.title}</div>
        <div className="item-description">{data.description}</div>
      </div>
    </div>
  )

  return (
    <div className="app">
      <h1>React Virtual Scroll Demo</h1>
      
      <div className="controls">
        <button onClick={scrollToRandom}>Scroll to Random</button>
        <button onClick={toggleItemHeight}>
          {variableHeight ? 'Fixed Height' : 'Variable Height'}
        </button>
        <button onClick={addItems}>Add 1000 Items</button>
        <label>
          <input 
            type="checkbox" 
            checked={horizontal} 
            onChange={(e) => setHorizontal(e.target.checked)} 
          />
          Horizontal Mode
        </label>
      </div>

      <div className="info">
        Visible Range: {visibleRange.start} - {visibleRange.end} / {items.length}
      </div>

      <VirtualScroll
        ref={virtualScrollRef}
        items={items}
        itemHeight={itemHeight}
        height={400}
        horizontal={horizontal}
        renderItem={renderItem}
        onVisibleRangeChange={handleVisibleRangeChange}
      />
    </div>
  )
}

export default App