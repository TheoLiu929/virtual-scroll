<template>
  <div class="app">
    <h1>Vue Virtual Scroll Optimized</h1>
    
    <div class="controls">
      <button @click="scrollToRandom">Scroll to Random</button>
      <button @click="scrollToSpecific">Scroll to #5000</button>
      <button @click="toggleItemHeight">
        {{ variableHeight ? 'Fixed Height' : 'Variable Height' }}
      </button>
      <button @click="addItems">Add 5000 Items</button>
      <button @click="toggleSmoothing">
        Smoothing: {{ enableSmoothing ? 'ON' : 'OFF' }}
      </button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>Render Info</h3>
        <div>Total Items: {{ items.length.toLocaleString() }}</div>
        <div>Visible Range: {{ scrollState.startIndex }} - {{ scrollState.endIndex }}</div>
        <div>Rendered Items: {{ scrollState.endIndex - scrollState.startIndex + 1 }}</div>
        <div>Current Overscan: {{ scrollState.overscan }}</div>
      </div>
      
      <div class="stat-card">
        <h3>Scroll State</h3>
        <div>Scroll Offset: {{ Math.round(scrollState.scrollOffset) }}px</div>
        <div>Scroll Velocity: {{ Math.round(scrollState.scrollVelocity) }}px/s</div>
        <div>Is Scrolling: {{ scrollState.isScrolling ? 'Yes' : 'No' }}</div>
        <div>Last Update: {{ lastUpdate }}</div>
      </div>
      
      <div class="stat-card">
        <h3>Performance</h3>
        <div>Update Count: {{ updateCount }}</div>
        <div>Avg Update Time: {{ avgUpdateTime.toFixed(2) }}ms</div>
        <div>Frame Rate: {{ frameRate }}fps</div>
      </div>
    </div>

    <virtual-scroll-optimized
      ref="virtualScrollRef"
      :items="items"
      :item-height="itemHeight"
      :height="500"
      :overscan-count="3"
      :min-overscan="1"
      :max-overscan="15"
      :scroll-velocity-threshold="300"
      :enable-intersection-observer="enableSmoothing"
      @scroll-state-change="onScrollStateChange"
    >
      <template #item="{ index, data, isScrolling }">
        <div 
          class="item" 
          :class="{ 
            'is-scrolling': isScrolling,
            'is-even': index % 2 === 0 
          }"
        >
          <div class="item-index">{{ index }}</div>
          <div class="item-content">
            <div class="item-title">{{ data.title }}</div>
            <div class="item-description">{{ data.description }}</div>
            <div class="item-meta">
              Height: {{ getItemHeightDisplay(index) }}px | 
              Created: {{ data.timestamp }}
            </div>
          </div>
        </div>
      </template>
    </virtual-scroll-optimized>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import VirtualScrollOptimized from '../../../src/vue/VirtualScrollOptimized.vue'
import type { OptimizedState } from '../../../src/core/VirtualScrollOptimized'

const virtualScrollRef = ref<InstanceType<typeof VirtualScrollOptimized>>()
const variableHeight = ref(false)
const enableSmoothing = ref(true)
const lastUpdate = ref(new Date().toLocaleTimeString())
const updateCount = ref(0)
const updateTimes = ref<number[]>([])
const frameRate = ref(60)

const scrollState = ref<OptimizedState>({
  startIndex: 0,
  endIndex: 0,
  scrollOffset: 0,
  scrollVelocity: 0,
  overscan: 3,
  isScrolling: false
})

const items = ref(generateItems(10000))

function generateItems(count: number, startIndex = 0) {
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

const itemHeight = computed(() => {
  if (variableHeight.value) {
    return (index: number) => {
      // Simulate complex height calculation
      const base = 80
      const variation = (index % 5) * 20
      return base + variation
    }
  }
  return 80
})

const avgUpdateTime = computed(() => {
  if (updateTimes.value.length === 0) return 0
  const sum = updateTimes.value.reduce((a, b) => a + b, 0)
  return sum / updateTimes.value.length
})

function getItemHeightDisplay(index: number) {
  return typeof itemHeight.value === 'function' 
    ? itemHeight.value(index) 
    : itemHeight.value
}

let lastUpdateTime = performance.now()
let frameCount = 0
let lastFrameTime = performance.now()

function measureFrameRate() {
  frameCount++
  const now = performance.now()
  const elapsed = now - lastFrameTime
  
  if (elapsed >= 1000) {
    frameRate.value = Math.round(frameCount * 1000 / elapsed)
    frameCount = 0
    lastFrameTime = now
  }
  
  requestAnimationFrame(measureFrameRate)
}

measureFrameRate()

function onScrollStateChange(state: OptimizedState) {
  const now = performance.now()
  const updateTime = now - lastUpdateTime
  lastUpdateTime = now
  
  scrollState.value = state
  lastUpdate.value = new Date().toLocaleTimeString()
  updateCount.value++
  
  // Keep last 100 update times for average
  updateTimes.value.push(updateTime)
  if (updateTimes.value.length > 100) {
    updateTimes.value.shift()
  }
}

function scrollToRandom() {
  const randomIndex = Math.floor(Math.random() * items.value.length)
  console.log(`Scrolling to index ${randomIndex}`)
  virtualScrollRef.value?.scrollToIndex(randomIndex, 'center')
}

function scrollToSpecific() {
  virtualScrollRef.value?.scrollToIndex(5000, 'start')
}

function toggleItemHeight() {
  variableHeight.value = !variableHeight.value
}

function addItems() {
  const currentLength = items.value.length
  items.value = [...items.value, ...generateItems(5000, currentLength)]
}

function toggleSmoothing() {
  enableSmoothing.value = !enableSmoothing.value
}
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background: #f5f5f5;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.controls button {
  padding: 10px 16px;
  border: none;
  background: #007bff;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.controls button:hover {
  background: #0056b3;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-card h3 {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-card div {
  margin: 5px 0;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 13px;
  color: #333;
}

.virtual-scroll-optimized {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.item {
  display: flex;
  padding: 16px;
  border-bottom: 1px solid #eee;
  background: white;
  transition: transform 0.2s, opacity 0.2s;
}

.item.is-even {
  background: #fafafa;
}

.item.is-scrolling {
  opacity: 0.8;
}

.item-index {
  width: 80px;
  font-weight: bold;
  color: #007bff;
  font-size: 16px;
}

.item-content {
  flex: 1;
}

.item-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: #333;
}

.item-description {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 4px;
}

.item-meta {
  font-size: 12px;
  color: #999;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
}
</style>