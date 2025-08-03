<template>
  <div 
    ref="containerRef"
    class="virtual-scroll-optimized"
    :style="containerStyle"
    @scroll="handleScroll"
  >
    <div :style="spacerStyle">
      <div
        v-for="index in visibleRange"
        :key="index"
        :data-index="index"
        :style="getItemStyle(index)"
        class="virtual-item"
        :class="{ 'is-scrolling': state.isScrolling }"
      >
        <slot name="item" :index="index" :data="items[index]" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, shallowRef } from 'vue'
import { VirtualScrollOptimized, OptimizedState } from '../core/VirtualScrollOptimized'
import { throttle } from '../core/utils'

interface Props {
  items: any[]
  itemHeight: number | ((index: number) => number)
  height: number
  overscanCount?: number
  minOverscan?: number
  maxOverscan?: number
  enableIntersectionObserver?: boolean
  intersectionRootMargin?: string
  scrollVelocityThreshold?: number
}

const props = withDefaults(defineProps<Props>(), {
  overscanCount: 3,
  minOverscan: 1,
  maxOverscan: 10,
  enableIntersectionObserver: false,
  intersectionRootMargin: '50%',
  scrollVelocityThreshold: 100
})

const emit = defineEmits<{
  scroll: [event: Event]
  rangeChange: [start: number, end: number]
  scrollStateChange: [state: OptimizedState]
}>()

const containerRef = ref<HTMLElement>()
const state = shallowRef<OptimizedState>({
  startIndex: 0,
  endIndex: 0,
  scrollOffset: 0,
  scrollVelocity: 0,
  overscan: props.overscanCount,
  isScrolling: false
})

let virtualScroll: VirtualScrollOptimized | null = null
let intersectionObserver: IntersectionObserver | null = null
let observedElements = new WeakSet<Element>()

const containerStyle = computed(() => ({
  height: `${props.height}px`,
  overflow: 'auto',
  position: 'relative' as const,
  willChange: 'scroll-position'
}))

const totalHeight = computed(() => {
  return virtualScroll?.getTotalHeight() || 0
})

const spacerStyle = computed(() => ({
  height: `${totalHeight.value}px`,
  position: 'relative' as const
}))

const visibleRange = computed(() => {
  const indices: number[] = []
  for (let i = state.value.startIndex; i <= state.value.endIndex; i++) {
    if (i < props.items.length) {
      indices.push(i)
    }
  }
  return indices
})

function getItemStyle(index: number) {
  const offset = virtualScroll?.getItemOffset(index) || 0
  const size = virtualScroll?.getItemSize(index) || 0
  
  return {
    position: 'absolute' as const,
    top: `${offset}px`,
    left: 0,
    right: 0,
    height: `${size}px`,
    willChange: state.value.isScrolling ? 'transform' : 'auto'
  }
}

const handleScroll = throttle((event: Event) => {
  const target = event.target as HTMLElement
  virtualScroll?.handleScroll(target.scrollTop)
  emit('scroll', event)
}, 16)

function initializeVirtualScroll() {
  virtualScroll = new VirtualScrollOptimized({
    itemCount: props.items.length,
    itemHeight: props.itemHeight,
    containerHeight: props.height,
    overscanCount: props.overscanCount,
    minOverscan: props.minOverscan,
    maxOverscan: props.maxOverscan,
    scrollVelocityThreshold: props.scrollVelocityThreshold
  })

  virtualScroll.onUpdate((newState) => {
    state.value = newState
    emit('rangeChange', newState.startIndex, newState.endIndex)
    emit('scrollStateChange', newState)
  })

  state.value = virtualScroll.getState()
}

function initializeIntersectionObserver() {
  if (!props.enableIntersectionObserver || !containerRef.value) return

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      // Only process entries when not actively scrolling
      if (!state.value.isScrolling) {
        entries.forEach(entry => {
          // Use intersection information for fine-tuning visible range
          // but don't trigger unnecessary updates
        })
      }
    },
    {
      root: containerRef.value,
      rootMargin: props.intersectionRootMargin,
      threshold: [0, 0.1, 0.9, 1]
    }
  )
}

function observeVisibleItems() {
  if (!intersectionObserver || !containerRef.value) return

  // Unobserve all previously observed elements
  observedElements = new WeakSet()

  // Observe current visible items
  requestAnimationFrame(() => {
    const items = containerRef.value!.querySelectorAll('.virtual-item')
    items.forEach(item => {
      if (!observedElements.has(item)) {
        intersectionObserver!.observe(item)
        observedElements.add(item)
      }
    })
  })
}

function scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start') {
  if (!virtualScroll || !containerRef.value) return

  const offset = virtualScroll.scrollToIndex(index, align)
  
  // Use requestAnimationFrame for smooth scrolling
  requestAnimationFrame(() => {
    containerRef.value!.scrollTop = offset
  })
}

watch(
  () => [props.items.length, props.itemHeight, props.height],
  () => {
    virtualScroll?.updateOptions({
      itemCount: props.items.length,
      itemHeight: props.itemHeight,
      containerHeight: props.height
    })
  }
)

watch(visibleRange, () => {
  if (props.enableIntersectionObserver) {
    observeVisibleItems()
  }
})

onMounted(() => {
  initializeVirtualScroll()
  initializeIntersectionObserver()
})

onUnmounted(() => {
  virtualScroll?.destroy()
  intersectionObserver?.disconnect()
})

defineExpose({
  scrollToIndex,
  getState: () => state.value
})
</script>

<style scoped>
.virtual-scroll-optimized {
  position: relative;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.virtual-item {
  position: absolute;
  will-change: transform;
}

.virtual-item.is-scrolling {
  pointer-events: none;
}
</style>