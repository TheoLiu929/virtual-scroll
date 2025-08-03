<template>
  <div class="app">
    <h1>Vue Virtual Scroll Demo</h1>
    
    <div class="controls">
      <button @click="scrollToRandom">Scroll to Random</button>
      <button @click="toggleItemHeight">
        {{ variableHeight ? 'Fixed Height' : 'Variable Height' }}
      </button>
      <button @click="addItems">Add 1000 Items</button>
      <label>
        <input type="checkbox" v-model="horizontal" />
        Horizontal Mode
      </label>
    </div>

    <div class="info">
      Visible Range: {{ visibleStart }} - {{ visibleEnd }} / {{ items.length }}
    </div>

    <virtual-scroll
      ref="virtualScrollRef"
      :items="items"
      :item-height="itemHeight"
      :height="400"
      :horizontal="horizontal"
      @visible-range-change="onVisibleRangeChange"
    >
      <template #item="{ index, data }">
        <div class="item" :class="{ horizontal: horizontal }">
          <div class="item-index">{{ index }}</div>
          <div class="item-content">
            <div class="item-title">{{ data.title }}</div>
            <div class="item-description">{{ data.description }}</div>
          </div>
        </div>
      </template>
    </virtual-scroll>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import VirtualScroll from '../../../src/vue/VirtualScroll.vue'

const virtualScrollRef = ref<InstanceType<typeof VirtualScroll>>()
const visibleStart = ref(0)
const visibleEnd = ref(0)
const variableHeight = ref(false)
const horizontal = ref(false)

const items = ref(generateItems(10000))

function generateItems(count: number) {
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

const itemHeight = computed(() => {
  if (variableHeight.value) {
    return (index: number) => {
      return 80 + (index % 3) * 40
    }
  }
  return 80
})

function onVisibleRangeChange(start: number, end: number) {
  visibleStart.value = start
  visibleEnd.value = end
}

function scrollToRandom() {
  const randomIndex = Math.floor(Math.random() * items.value.length)
  virtualScrollRef.value?.scrollToIndex(randomIndex, 'center')
}

function toggleItemHeight() {
  variableHeight.value = !variableHeight.value
}

function addItems() {
  items.value = [...items.value, ...generateItems(1000)]
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

.controls label {
  display: flex;
  align-items: center;
  gap: 5px;
}

.info {
  margin-bottom: 10px;
  color: #666;
}

.item {
  display: flex;
  padding: 16px;
  border: 1px solid #eee;
  background: #fff;
  margin: 4px;
}

.item.horizontal {
  height: 100%;
  flex-direction: column;
  justify-content: center;
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
</style>