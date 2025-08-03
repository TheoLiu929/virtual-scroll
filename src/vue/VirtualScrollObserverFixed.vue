<template>
  <div 
    ref="containerRef" 
    class="virtual-scroll-observer" 
    :style="containerStyle"
    @scroll="handleScroll"
  >
    <div :style="spacerStyle">
      <div
        v-for="index in itemIndices"
        :key="index"
        :data-index="index"
        :style="getItemStyle(index)"
        class="virtual-scroll-item"
      >
        <slot name="item" :index="index" :data="items[index]" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  items: any[]
  itemHeight: number | ((index: number) => number)
  height: number
  rootMargin?: string
  threshold?: number | number[]
  overscan?: number
  velocityMultiplier?: number
}

const props = withDefaults(defineProps<Props>(), {
  rootMargin: '50px',
  threshold: 0,
  overscan: 3,
  velocityMultiplier: 2
})

const emit = defineEmits<{
  visibleChange: [visible: number[], entries: IntersectionObserverEntry[]]
  scrollStateChange: [isScrolling: boolean, velocity: number]
}>()

const containerRef = ref<HTMLElement>()
const visibleItems = ref(new Set<number>())
const itemIndices = ref<number[]>([])
const lastScrollTime = ref(0)
const lastScrollTop = ref(0)
const scrollVelocity = ref(0)
const isScrolling = ref(false)
let observer: IntersectionObserver | null = null
let scrollEndTimer: number | null = null

const containerStyle = computed(() => ({
  height: `${props.height}px`,
  overflow: 'auto',
  position: 'relative' as const
}))

const totalHeight = computed(() => {
  let height = 0
  for (let i = 0; i < props.items.length; i++) {
    height += getItemHeight(i)
  }
  return height
})

const spacerStyle = computed(() => ({
  height: `${totalHeight.value}px`,
  position: 'relative' as const
}))

function getItemHeight(index: number): number {
  return typeof props.itemHeight === 'function' 
    ? props.itemHeight(index) 
    : props.itemHeight
}

function getItemStyle(index: number) {
  let top = 0
  for (let i = 0; i < index; i++) {
    top += getItemHeight(i)
  }
  
  return {
    position: 'absolute' as const,
    top: `${top}px`,
    left: 0,
    right: 0,
    height: `${getItemHeight(index)}px`
  }
}

function findStartIndex(scrollTop: number): number {
  let currentOffset = 0
  for (let i = 0; i < props.items.length; i++) {
    const itemHeight = getItemHeight(i)
    if (currentOffset + itemHeight > scrollTop) {
      return i
    }
    currentOffset += itemHeight
  }
  return Math.max(0, props.items.length - 1)
}

function calculateVisibleRange(scrollTop: number, velocity: number): { start: number; end: number } {
  const startIndex = findStartIndex(scrollTop)
  
  // Calculate visible items count
  let visibleCount = Math.ceil(props.height / getItemHeight(startIndex)) + 1
  
  // Dynamic overscan based on scroll velocity
  const velocityFactor = Math.min(Math.abs(velocity) / 100, 3)
  const dynamicOverscan = Math.round(props.overscan * (1 + velocityFactor * props.velocityMultiplier))
  
  // Predict scroll direction and expand buffer accordingly
  const predictiveBuffer = velocity > 50 ? Math.round(dynamicOverscan * 0.7) : 0
  const scrollDirection = velocity > 0 ? 1 : -1
  
  const start = Math.max(0, startIndex - dynamicOverscan - (scrollDirection < 0 ? predictiveBuffer : 0))
  const end = Math.min(
    props.items.length - 1, 
    startIndex + visibleCount + dynamicOverscan + (scrollDirection > 0 ? predictiveBuffer : 0)
  )
  
  return { start, end }
}

function updateVisibleItemsBasedOnScroll(scrollTop: number, velocity: number) {
  const range = calculateVisibleRange(scrollTop, velocity)
  const indices: number[] = []
  
  for (let i = range.start; i <= range.end; i++) {
    indices.push(i)
  }
  
  itemIndices.value = indices
}

function handleScroll(event: Event) {
  const target = event.target as HTMLElement
  const currentTime = performance.now()
  const currentScrollTop = target.scrollTop
  
  // Calculate velocity
  const timeDelta = currentTime - lastScrollTime.value
  const scrollDelta = currentScrollTop - lastScrollTop.value
  
  if (timeDelta > 0) {
    scrollVelocity.value = Math.abs(scrollDelta) / timeDelta * 1000 // pixels per second
  }
  
  lastScrollTime.value = currentTime
  lastScrollTop.value = currentScrollTop
  isScrolling.value = true
  
  // Immediate update based on scroll position - this prevents white screens
  updateVisibleItemsBasedOnScroll(currentScrollTop, scrollVelocity.value)
  
  // Clear existing timer
  if (scrollEndTimer !== null) {
    clearTimeout(scrollEndTimer)
  }
  
  // Set scroll end detection
  scrollEndTimer = window.setTimeout(() => {
    isScrolling.value = false
    scrollVelocity.value = 0
    // Re-optimize visible range when scrolling stops
    updateVisibleItemsBasedOnScroll(currentScrollTop, 0)
    emit('scrollStateChange', false, 0)
  }, 150)
  
  emit('scrollStateChange', true, scrollVelocity.value)
}

function updateVisibleItems() {
  if (visibleItems.value.size === 0) {
    // Fallback: use scroll-based calculation
    updateVisibleItemsBasedOnScroll(containerRef.value?.scrollTop || 0, scrollVelocity.value)
    return
  }
  
  // Only use intersection observer for fine-tuning when not scrolling fast
  if (scrollVelocity.value < 100) {
    const indices: number[] = []
    const min = Math.max(0, Math.min(...visibleItems.value) - props.overscan)
    const max = Math.min(props.items.length - 1, Math.max(...visibleItems.value) + props.overscan)
    
    for (let i = min; i <= max; i++) {
      indices.push(i)
    }
    
    itemIndices.value = indices
  }
}

function handleIntersection(entries: IntersectionObserverEntry[]) {
  // Ignore intersection updates during fast scrolling
  if (isScrolling.value && scrollVelocity.value > 100) {
    return
  }
  
  entries.forEach(entry => {
    const index = parseInt(entry.target.getAttribute('data-index') || '0')
    
    if (entry.isIntersecting) {
      visibleItems.value.add(index)
    } else {
      visibleItems.value.delete(index)
    }
  })
  
  updateVisibleItems()
  emit('visibleChange', Array.from(visibleItems.value), entries)
}

function observeItems() {
  if (!containerRef.value || !observer) return
  
  const items = containerRef.value.querySelectorAll('.virtual-scroll-item')
  items.forEach(item => {
    observer!.observe(item)
  })
}

function unobserveItems() {
  if (!observer) return
  observer.disconnect()
}

function initializeObserver() {
  if (!containerRef.value) return
  
  observer = new IntersectionObserver(handleIntersection, {
    root: containerRef.value,
    rootMargin: props.rootMargin,
    threshold: props.threshold
  })
  
  // Initialize with scroll-based calculation
  updateVisibleItemsBasedOnScroll(0, 0)
  
  // Start observing after next tick
  setTimeout(observeItems, 0)
}

watch(itemIndices, () => {
  unobserveItems()
  setTimeout(observeItems, 0)
})

watch(() => props.items.length, () => {
  updateVisibleItemsBasedOnScroll(containerRef.value?.scrollTop || 0, scrollVelocity.value)
})

onMounted(() => {
  initializeObserver()
})

onUnmounted(() => {
  if (scrollEndTimer !== null) {
    clearTimeout(scrollEndTimer)
  }
  unobserveItems()
  observer = null
})

defineExpose({
  scrollToIndex: (index: number) => {
    if (!containerRef.value) return
    
    let offset = 0
    for (let i = 0; i < index; i++) {
      offset += getItemHeight(i)
    }
    
    // Pre-expand visible range for jump scrolling
    const range = calculateVisibleRange(offset, 0)
    const indices: number[] = []
    for (let i = range.start; i <= range.end; i++) {
      indices.push(i)
    }
    itemIndices.value = indices
    
    // Scroll after updating indices
    requestAnimationFrame(() => {
      containerRef.value!.scrollTop = offset
    })
  }
})
</script>

<style scoped>
.virtual-scroll-observer {
  position: relative;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.virtual-scroll-item {
  will-change: transform;
}
</style>