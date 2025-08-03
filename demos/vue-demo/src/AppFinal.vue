<template>
  <div class="app">
    <h1>Vue Virtual Scroll - Final Optimized Version</h1>
    
    <div class="controls">
      <button @click="scrollToRandom">Random Scroll Test</button>
      <button @click="scrollToSpecific">Jump to #5000</button>
      <button @click="rapidScrollTest">Rapid Scroll Test</button>
      <button @click="stopScrollTest">Stop Scroll Test</button>
      <button @click="extremeScrollTest">Extreme Scroll Test</button>
      <button @click="emergencyRecoveryTest">Emergency Recovery Test</button>
      <button @click="toggleItemHeight">
        {{ variableHeight ? 'Fixed Height' : 'Variable Height' }}
      </button>
      <button @click="addItems">Add 5000 Items</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>Performance Metrics</h3>
        <div>Total Items: {{ items.length.toLocaleString() }}</div>
        <div>Visible Range: {{ visibleRange.start }} - {{ visibleRange.end }}</div>
        <div>Rendered Items: {{ visibleRange.end - visibleRange.start + 1 }}</div>
        <div>Scroll Velocity: {{ Math.round(scrollVelocity) }}px/s</div>
        <div>Is Scrolling: {{ isScrolling ? 'Yes' : 'No' }}</div>
      </div>
      
      <div class="stat-card">
        <h3>Test Results</h3>
        <div>White Screen Issues: {{ whiteScreenCount }}</div>
        <div>Emergency Activations: {{ emergencyActivationCount }}</div>
        <div>Load Failures: {{ loadFailureCount }}</div>
        <div>Smooth Transitions: {{ smoothTransitionCount }}</div>
        <div>Test Status: {{ testStatus }}</div>
      </div>
      
      <div class="stat-card">
        <h3>Advanced Stats</h3>
        <div>Update Count: {{ updateCount }}</div>
        <div>Avg Update Time: {{ avgUpdateTime.toFixed(2) }}ms</div>
        <div>Last Update: {{ lastUpdate }}</div>
        <div>Frame Rate: {{ frameRate }}fps</div>
      </div>
    </div>

    <virtual-scroll-observer-optimized
      ref="virtualScrollRef"
      :items="items"
      :item-height="itemHeight"
      :height="500"
      :overscan="3"
      :velocity-multiplier="2"
      :scroll-end-delay="30"
      :enable-intersection-observer="true"
      :emergency-timeout="16"
      :white-screen-protection="true"
      @scroll-state-change="onScrollStateChange"
      @range-change="onRangeChange"
      @visible-change="onVisibleChange"
      @white-screen-detected="onWhiteScreenDetected"
      @emergency-mode-activated="onEmergencyModeActivated"
    >
      <template #item="{ index, data }">
        <div 
          class="item" 
          :class="{ 
            'is-scrolling': isScrolling,
            'is-even': index % 2 === 0,
            'is-target': index === targetIndex
          }"
        >
          <div class="item-index">{{ index }}</div>
          <div class="item-content">
            <div class="item-title">{{ data.title }}</div>
            <div class="item-description">{{ data.description }}</div>
            <div class="item-meta">
              Height: {{ getItemHeightDisplay(index) }}px | 
              Status: {{ getItemStatus(index) }}
            </div>
          </div>
        </div>
      </template>
    </virtual-scroll-observer-optimized>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import VirtualScrollObserverOptimized from '../../../src/vue/VirtualScrollObserverOptimized.vue'

const virtualScrollRef = ref<InstanceType<typeof VirtualScrollObserverOptimized>>()
const variableHeight = ref(false)
const isScrolling = ref(false)
const scrollVelocity = ref(0)
const visibleRange = ref({ start: 0, end: 0 })
const targetIndex = ref(-1)
const testStatus = ref('Ready')

// Performance tracking
const updateCount = ref(0)
const updateTimes = ref<number[]>([])
const lastUpdate = ref('N/A')
const frameRate = ref(60)

// Test result tracking
const whiteScreenCount = ref(0)
const emergencyActivationCount = ref(0)
const loadFailureCount = ref(0)
const smoothTransitionCount = ref(0)

const items = ref(generateItems(10000))

function generateItems(count: number, startIndex = 0) {
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

const itemHeight = computed(() => {
  if (variableHeight.value) {
    return (index: number) => {
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

function getItemStatus(index: number) {
  const { start, end } = visibleRange.value
  if (index >= start && index <= end) {
    return isScrolling.value ? 'Scrolling' : 'Visible'
  }
  return 'Hidden'
}

// Performance monitoring
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

function onScrollStateChange(scrolling: boolean, velocity: number) {
  isScrolling.value = scrolling
  scrollVelocity.value = velocity
  
  const now = performance.now()
  const updateTime = now - lastUpdateTime
  lastUpdateTime = now
  
  updateCount.value++
  lastUpdate.value = new Date().toLocaleTimeString()
  
  updateTimes.value.push(updateTime)
  if (updateTimes.value.length > 100) {
    updateTimes.value.shift()
  }
  
  // Check for smooth transitions
  if (!scrolling && velocity === 0) {
    smoothTransitionCount.value++
  }
}

function onRangeChange(start: number, end: number) {
  visibleRange.value = { start, end }
  
  // Check for white screen (no items rendered)
  if (end - start < 0) {
    whiteScreenCount.value++
  }
}

function onVisibleChange(visible: number[]) {
  // Monitor visible items for load failures
  if (visible.length === 0 && items.value.length > 0) {
    loadFailureCount.value++
  }
}

// Test functions
function scrollToRandom() {
  const randomIndex = Math.floor(Math.random() * items.value.length)
  targetIndex.value = randomIndex
  testStatus.value = `Scrolling to ${randomIndex}...`
  
  virtualScrollRef.value?.scrollToIndex(randomIndex)
  
  setTimeout(() => {
    testStatus.value = 'Random scroll completed'
    targetIndex.value = -1
  }, 1000)
}

function scrollToSpecific() {
  targetIndex.value = 5000
  testStatus.value = 'Jumping to #5000...'
  
  virtualScrollRef.value?.scrollToIndex(5000)
  
  setTimeout(() => {
    testStatus.value = 'Jump completed'
    targetIndex.value = -1
  }, 1000)
}

async function rapidScrollTest() {
  testStatus.value = 'Running rapid scroll test...'
  const positions = [0, 2000, 5000, 1000, 8000, 3000, 9000]
  
  for (const pos of positions) {
    virtualScrollRef.value?.scrollToIndex(pos)
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  testStatus.value = 'Rapid scroll test completed'
}

async function stopScrollTest() {
  testStatus.value = 'Testing scroll stop behavior...'
  
  // Start fast scroll
  virtualScrollRef.value?.scrollToIndex(7000)
  
  // Wait a bit then immediately scroll to another position
  setTimeout(() => {
    virtualScrollRef.value?.scrollToIndex(3000)
  }, 100)
  
  setTimeout(() => {
    testStatus.value = 'Stop scroll test completed'
  }, 1000)
}

function toggleItemHeight() {
  variableHeight.value = !variableHeight.value
  testStatus.value = `Switched to ${variableHeight.value ? 'variable' : 'fixed'} height`
}

function addItems() {
  const currentLength = items.value.length
  items.value = [...items.value, ...generateItems(5000, currentLength)]
  testStatus.value = `Added 5000 items (total: ${items.value.length})`
}

function onWhiteScreenDetected() {
  whiteScreenCount.value++
  console.warn('White screen detected and recovered!')
}

function onEmergencyModeActivated() {
  emergencyActivationCount.value++
  console.warn('Emergency mode activated!')
}

async function extremeScrollTest() {
  testStatus.value = 'Running extreme scroll test...'
  
  // 模拟极端快速连续滚动
  const positions = [0, 5000, 1000, 8000, 2000, 9000, 500, 7000]
  
  for (let i = 0; i < positions.length; i++) {
    virtualScrollRef.value?.scrollToIndex(positions[i])
    // 极短间隔，模拟用户疯狂滑动
    await new Promise(resolve => setTimeout(resolve, 50))
    
    if (i === 4) {
      // 在中途突然停止，测试白屏保护
      testStatus.value = 'Extreme scroll with sudden stop...'
      await new Promise(resolve => setTimeout(resolve, 200))
      break
    }
  }
  
  testStatus.value = 'Extreme scroll test completed'
}

async function emergencyRecoveryTest() {
  testStatus.value = 'Testing emergency recovery...'
  
  // 强制触发紧急恢复
  if (virtualScrollRef.value && 'emergencyRecover' in virtualScrollRef.value) {
    (virtualScrollRef.value as any).emergencyRecover()
    testStatus.value = 'Emergency recovery triggered'
  }
  
  setTimeout(() => {
    testStatus.value = 'Emergency recovery test completed'
  }, 1000)
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
  text-align: center;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

.controls button {
  padding: 10px 16px;
  border: none;
  background: #007bff;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.controls button:hover {
  background: #0056b3;
  transform: translateY(-1px);
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
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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

.virtual-scroll-observer-optimized {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border: 2px solid #e9ecef;
}

.item {
  display: flex;
  padding: 16px;
  border-bottom: 1px solid #eee;
  background: white;
  transition: all 0.2s;
}

.item.is-even {
  background: #fafafa;
}

.item.is-scrolling {
  opacity: 0.9;
  background: #f8f9fa;
}

.item.is-target {
  background: #fff3cd;
  border: 2px solid #ffc107;
  animation: highlight 1s ease-in-out;
}

@keyframes highlight {
  0% { background: #fff3cd; }
  50% { background: #ffeaa7; }
  100% { background: #fff3cd; }
}

.item-index {
  width: 80px;
  font-weight: bold;
  color: #007bff;
  font-size: 16px;
  display: flex;
  align-items: center;
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