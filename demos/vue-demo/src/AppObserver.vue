<template>
  <div class="app">
    <h1>Vue Virtual Scroll with Intersection Observer</h1>
    
    <div class="controls">
      <button @click="scrollToRandom">Scroll to Random</button>
      <button @click="toggleItemHeight">
        {{ variableHeight ? 'Fixed Height' : 'Variable Height' }}
      </button>
      <button @click="addItems">Add 1000 Items</button>
      <button @click="changeRootMargin">
        Root Margin: {{ rootMargin }}
      </button>
    </div>

    <div class="info">
      <div>Total Items: {{ items.length }}</div>
      <div>Visible Items: {{ visibleIndices.join(', ') }}</div>
      <div>Rendered Items: {{ renderedCount }}</div>
    </div>

    <virtual-scroll-observer
      ref="virtualScrollRef"
      :items="items"
      :item-height="itemHeight"
      :height="400"
      :root-margin="rootMargin"
      :overscan="3"
      @visible-change="onVisibleChange"
    >
      <template #item="{ index, data }">
        <div class="item" :class="{ visible: visibleSet.has(index) }">
          <div class="item-index">{{ index }}</div>
          <div class="item-content">
            <div class="item-title">{{ data.title }}</div>
            <div class="item-description">{{ data.description }}</div>
          </div>
        </div>
      </template>
    </virtual-scroll-observer>

    <div class="stats">
      <h3>Performance Stats</h3>
      <div>Intersection Callbacks: {{ intersectionCount }}</div>
      <div>Last Update: {{ lastUpdate }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { VirtualScrollObserver } from 'virtual-scroll-component/vue'

const virtualScrollRef = ref<InstanceType<typeof VirtualScrollObserver>>()
const visibleIndices = ref<number[]>([])
const visibleSet = ref(new Set<number>())
const variableHeight = ref(false)
const rootMargin = ref('50px')
const intersectionCount = ref(0)
const lastUpdate = ref('')
const renderedCount = ref(0)

const items = ref(generateItems(10000))

function generateItems(count: number) {
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

const itemHeight = computed(() => {
  if (variableHeight.value) {
    return (index: number) => {
      return 80 + (index % 3) * 40
    }
  }
  return 80
})

function onVisibleChange(visible: number[], entries: IntersectionObserverEntry[]) {
  visibleIndices.value = visible.sort((a, b) => a - b)
  visibleSet.value = new Set(visible)
  intersectionCount.value++
  lastUpdate.value = new Date().toLocaleTimeString()
  
  // Count rendered items
  const container = virtualScrollRef.value?.$el
  if (container) {
    renderedCount.value = container.querySelectorAll('.virtual-scroll-item').length
  }
}

function scrollToRandom() {
  const randomIndex = Math.floor(Math.random() * items.value.length)
  virtualScrollRef.value?.scrollToIndex(randomIndex)
}

function toggleItemHeight() {
  variableHeight.value = !variableHeight.value
}

function addItems() {
  items.value = [...items.value, ...generateItems(1000)]
}

function changeRootMargin() {
  const margins = ['0px', '50px', '100px', '200px']
  const currentIndex = margins.indexOf(rootMargin.value)
  rootMargin.value = margins[(currentIndex + 1) % margins.length]
}
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #333;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.controls button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
}

.controls button:hover {
  background: #e5e5e5;
}

.info {
  margin-bottom: 10px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
  font-family: monospace;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.item {
  display: flex;
  padding: 16px;
  border: 1px solid #eee;
  background: #fff;
  margin: 4px;
  transition: background-color 0.2s;
}

.item.visible {
  background: #e8f5e9;
  border-color: #4caf50;
}

.item-index {
  width: 60px;
  font-weight: bold;
  color: #666;
}

.item-content {
  flex: 1;
}

.item-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.item-description {
  color: #666;
  font-size: 14px;
}

.stats {
  margin-top: 20px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 4px;
}

.stats h3 {
  margin-top: 0;
  color: #666;
}

.stats div {
  margin: 5px 0;
  font-family: monospace;
}
</style>