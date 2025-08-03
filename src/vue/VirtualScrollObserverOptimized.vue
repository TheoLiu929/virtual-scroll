<template>
  <div 
    ref="containerRef" 
    class="virtual-scroll-observer-optimized" 
    :style="containerStyle"
    @scroll="handleScroll"
  >
    <!-- 紧急占位器 - 防止完全白屏 -->
    <div 
      v-if="itemIndices.length === 0 && isEmergencyMode"
      class="emergency-placeholder"
      :style="emergencyPlaceholderStyle"
    >
      <div 
        v-for="i in emergencyItemCount" 
        :key="`emergency-${i}`"
        class="emergency-item"
        :style="getEmergencyItemStyle(i)"
      >
        <slot name="emergency" :index="lastKnownRange.start + i">
          <div class="emergency-content">Loading...</div>
        </slot>
      </div>
    </div>

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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

interface Props {
  items: any[]
  itemHeight: number | ((index: number) => number)
  height: number
  rootMargin?: string
  threshold?: number | number[]
  overscan?: number
  velocityMultiplier?: number
  scrollEndDelay?: number
  enableIntersectionObserver?: boolean
  emergencyTimeout?: number
  whiteScreenProtection?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  rootMargin: '50px',
  threshold: 0,
  overscan: 3,
  velocityMultiplier: 2,
  scrollEndDelay: 30, // Further reduced for faster response
  enableIntersectionObserver: true,
  emergencyTimeout: 16, // One frame timeout for emergency mode
  whiteScreenProtection: true
})

const emit = defineEmits<{
  visibleChange: [visible: number[], entries: IntersectionObserverEntry[]]
  scrollStateChange: [isScrolling: boolean, velocity: number]
  rangeChange: [start: number, end: number]
  whiteScreenDetected: []
  emergencyModeActivated: []
}>()

const containerRef = ref<HTMLElement>()
const visibleItems = ref(new Set<number>())
const itemIndices = ref<number[]>([])
const lastScrollTime = ref(0)
const lastScrollTop = ref(0)
const scrollVelocity = ref(0)
const isScrolling = ref(false)
const isInitialized = ref(false)
const isEmergencyMode = ref(false)
const lastKnownRange = ref({ start: 0, end: 10 })
const emergencyItemCount = ref(10)

let observer: IntersectionObserver | null = null
let scrollEndTimer: number | null = null
let immediateUpdateTimer: number | null = null
let emergencyTimer: number | null = null
let whiteScreenTimer: number | null = null

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

const emergencyPlaceholderStyle = computed(() => ({
  position: 'absolute' as const,
  top: '0px',
  left: '0px',
  right: '0px',
  height: `${totalHeight.value}px`,
  zIndex: 1,
  pointerEvents: 'none' as const
}))

// Create position cache for performance
const positionCache = ref(new Map<number, { offset: number; size: number }>())

function getItemHeight(index: number): number {
  return typeof props.itemHeight === 'function' 
    ? props.itemHeight(index) 
    : props.itemHeight
}

function calculatePositions() {
  const cache = new Map<number, { offset: number; size: number }>()
  let offset = 0
  
  for (let i = 0; i < props.items.length; i++) {
    const size = getItemHeight(i)
    cache.set(i, { offset, size })
    offset += size
  }
  
  positionCache.value = cache
}

function getItemStyle(index: number) {
  const position = positionCache.value.get(index)
  if (!position) return {}
  
  return {
    position: 'absolute' as const,
    top: `${position.offset}px`,
    left: 0,
    right: 0,
    height: `${position.size}px`
  }
}

function getEmergencyItemStyle(i: number) {
  const index = lastKnownRange.value.start + i
  const position = positionCache.value.get(index)
  if (!position) {
    const estimatedTop = index * getItemHeight(0)
    return {
      position: 'absolute' as const,
      top: `${estimatedTop}px`,
      left: 0,
      right: 0,
      height: `${getItemHeight(index)}px`,
      background: '#f8f9fa',
      opacity: 0.7
    }
  }
  
  return {
    position: 'absolute' as const,
    top: `${position.offset}px`,
    left: 0,
    right: 0,
    height: `${position.size}px`,
    background: '#f8f9fa',
    opacity: 0.7
  }
}

function findStartIndex(scrollTop: number): number {
  // Binary search for better performance
  let low = 0
  let high = props.items.length - 1
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const position = positionCache.value.get(mid)
    if (!position) break
    
    if (position.offset <= scrollTop && position.offset + position.size > scrollTop) {
      return mid
    } else if (position.offset > scrollTop) {
      high = mid - 1
    } else {
      low = mid + 1
    }
  }
  
  return Math.max(0, low - 1)
}

function calculateVisibleRange(scrollTop: number, velocity: number): { start: number; end: number } {
  const startIndex = findStartIndex(scrollTop)
  
  // Calculate how many items fit in the viewport
  let visibleCount = 0
  let currentOffset = positionCache.value.get(startIndex)?.offset || 0
  
  for (let i = startIndex; i < props.items.length && currentOffset - scrollTop < props.height; i++) {
    const position = positionCache.value.get(i)
    if (!position) break
    currentOffset = position.offset + position.size
    visibleCount++
  }
  
  // Enhanced dynamic overscan for extreme cases
  const velocityFactor = Math.min(Math.abs(velocity) / 50, 5) // More aggressive scaling
  const baseOverscan = props.overscan
  const dynamicOverscan = Math.round(baseOverscan * (1 + velocityFactor * props.velocityMultiplier))
  
  // Extra protection for very fast scrolling
  const extremeScrollProtection = Math.abs(velocity) > 2000 ? Math.round(dynamicOverscan * 1.5) : 0
  
  // Predict scroll direction and expand buffer accordingly
  const isScrollingDown = velocity > 0
  const predictiveBuffer = Math.abs(velocity) > 50 ? Math.round(dynamicOverscan * 0.8) + extremeScrollProtection : 0
  
  const start = Math.max(0, startIndex - dynamicOverscan - (isScrollingDown ? 0 : predictiveBuffer))
  const end = Math.min(
    props.items.length - 1, 
    startIndex + visibleCount + dynamicOverscan + (isScrollingDown ? predictiveBuffer : 0)
  )
  
  return { start, end }
}

function updateVisibleItemsBasedOnScroll(scrollTop: number, velocity: number, syncMode = false) {
  const range = calculateVisibleRange(scrollTop, velocity)
  const indices: number[] = []
  
  for (let i = range.start; i <= range.end; i++) {
    indices.push(i)
  }
  
  // 记录有效范围，用于紧急模式
  if (indices.length > 0) {
    lastKnownRange.value = range
    emergencyItemCount.value = Math.min(indices.length, 15)
  }
  
  if (syncMode) {
    // 同步更新 - 立即生效
    itemIndices.value = indices
    isEmergencyMode.value = false
    
    // 清除白屏检测
    if (whiteScreenTimer !== null) {
      clearTimeout(whiteScreenTimer)
      whiteScreenTimer = null
    }
  } else {
    // 异步更新 - 但有保护机制
    activateWhiteScreenProtection()
    
    // 使用 nextTick 确保 DOM 更新
    nextTick(() => {
      itemIndices.value = indices
      isEmergencyMode.value = false
      
      if (whiteScreenTimer !== null) {
        clearTimeout(whiteScreenTimer)
        whiteScreenTimer = null
      }
    })
  }
  
  emit('rangeChange', range.start, range.end)
}

function activateWhiteScreenProtection() {
  if (!props.whiteScreenProtection) return
  
  // 清除之前的计时器
  if (whiteScreenTimer !== null) {
    clearTimeout(whiteScreenTimer)
  }
  
  // 设置白屏保护计时器
  whiteScreenTimer = window.setTimeout(() => {
    if (itemIndices.value.length === 0) {
      // 检测到白屏，激活紧急模式
      isEmergencyMode.value = true
      emit('whiteScreenDetected')
      emit('emergencyModeActivated')
      
      // 紧急恢复
      setTimeout(() => {
        const scrollTop = containerRef.value?.scrollTop || 0
        updateVisibleItemsBasedOnScroll(scrollTop, 0, true)
      }, 0)
    }
  }, props.emergencyTimeout)
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
  
  // 立即同步更新 - 防止白屏
  updateVisibleItemsBasedOnScroll(currentScrollTop, scrollVelocity.value, true)
  
  // Clear existing timers
  if (scrollEndTimer !== null) {
    clearTimeout(scrollEndTimer)
  }
  if (immediateUpdateTimer !== null) {
    clearTimeout(immediateUpdateTimer)
  }
  if (emergencyTimer !== null) {
    clearTimeout(emergencyTimer)
  }
  
  // 额外的快速更新 - 双保险
  immediateUpdateTimer = window.setTimeout(() => {
    updateVisibleItemsBasedOnScroll(currentScrollTop, scrollVelocity.value, true)
  }, 0) // 立即执行
  
  // 紧急兜底更新
  emergencyTimer = window.setTimeout(() => {
    if (itemIndices.value.length === 0) {
      updateVisibleItemsBasedOnScroll(currentScrollTop, scrollVelocity.value, true)
    }
  }, props.emergencyTimeout)
  
  // 设置滚动结束检测
  scrollEndTimer = window.setTimeout(() => {
    isScrolling.value = false
    scrollVelocity.value = 0
    
    // 滚动结束后的强制更新
    updateVisibleItemsBasedOnScroll(currentScrollTop, 0, true)
    
    // 额外的安全更新
    setTimeout(() => {
      updateVisibleItemsBasedOnScroll(target.scrollTop, 0, true)
    }, 8) // 一帧的一半时间
    
    emit('scrollStateChange', false, 0)
  }, props.scrollEndDelay)
  
  emit('scrollStateChange', true, scrollVelocity.value)
}

function updateVisibleItems() {
  // 优先使用滚动位置计算
  const scrollTop = containerRef.value?.scrollTop || 0
  updateVisibleItemsBasedOnScroll(scrollTop, scrollVelocity.value, true)
  
  // Intersection Observer 仅用于微调
  if (visibleItems.value.size > 0 && scrollVelocity.value < 50) {
    const indices: number[] = []
    const min = Math.max(0, Math.min(...visibleItems.value) - props.overscan)
    const max = Math.min(props.items.length - 1, Math.max(...visibleItems.value) + props.overscan)
    
    for (let i = min; i <= max; i++) {
      indices.push(i)
    }
    
    // 只在合理范围内更新
    if (indices.length > 0 && indices.length < 100) {
      itemIndices.value = indices
      isEmergencyMode.value = false
    }
  }
}

function handleIntersection(entries: IntersectionObserverEntry[]) {
  // 只在慢速滚动或停止时处理
  if (isScrolling.value && scrollVelocity.value > 50) {
    return
  }
  
  let hasChanges = false
  entries.forEach(entry => {
    const index = parseInt(entry.target.getAttribute('data-index') || '0')
    
    if (entry.isIntersecting && !visibleItems.value.has(index)) {
      visibleItems.value.add(index)
      hasChanges = true
    } else if (!entry.isIntersecting && visibleItems.value.has(index)) {
      visibleItems.value.delete(index)
      hasChanges = true
    }
  })
  
  if (hasChanges) {
    updateVisibleItems()
    emit('visibleChange', Array.from(visibleItems.value), entries)
  }
}

function observeItems() {
  if (!containerRef.value || !observer || !props.enableIntersectionObserver) return
  
  observer.disconnect()
  
  setTimeout(() => {
    if (!containerRef.value || !observer) return
    
    const items = containerRef.value.querySelectorAll('.virtual-scroll-item')
    items.forEach(item => {
      observer!.observe(item)
    })
  }, 0)
}

function unobserveItems() {
  if (!observer) return
  observer.disconnect()
}

function initializeObserver() {
  if (!containerRef.value || !props.enableIntersectionObserver) return
  
  observer = new IntersectionObserver(handleIntersection, {
    root: containerRef.value,
    rootMargin: props.rootMargin,
    threshold: props.threshold
  })
  
  calculatePositions()
  updateVisibleItemsBasedOnScroll(0, 0, true)
  isInitialized.value = true
  
  setTimeout(observeItems, 16)
}

watch(itemIndices, () => {
  if (props.enableIntersectionObserver && isInitialized.value) {
    observeItems()
  }
})

watch(() => props.items.length, () => {
  calculatePositions()
  updateVisibleItemsBasedOnScroll(containerRef.value?.scrollTop || 0, scrollVelocity.value, true)
})

watch(() => props.itemHeight, () => {
  calculatePositions()
  updateVisibleItemsBasedOnScroll(containerRef.value?.scrollTop || 0, scrollVelocity.value, true)
})

onMounted(() => {
  initializeObserver()
})

onUnmounted(() => {
  if (scrollEndTimer !== null) {
    clearTimeout(scrollEndTimer)
  }
  if (immediateUpdateTimer !== null) {
    clearTimeout(immediateUpdateTimer)
  }
  if (emergencyTimer !== null) {
    clearTimeout(emergencyTimer)
  }
  if (whiteScreenTimer !== null) {
    clearTimeout(whiteScreenTimer)
  }
  unobserveItems()
  observer = null
})

defineExpose({
  scrollToIndex: (index: number) => {
    if (!containerRef.value) return
    
    const position = positionCache.value.get(index)
    if (!position) return
    
    // 预扩展可见范围
    const range = calculateVisibleRange(position.offset, 0)
    const indices: number[] = []
    
    const expandedStart = Math.max(0, Math.min(range.start, index - props.overscan * 3))
    const expandedEnd = Math.min(props.items.length - 1, Math.max(range.end, index + props.overscan * 3))
    
    for (let i = expandedStart; i <= expandedEnd; i++) {
      indices.push(i)
    }
    
    // 立即同步更新
    itemIndices.value = indices
    lastKnownRange.value = { start: expandedStart, end: expandedEnd }
    isEmergencyMode.value = false
    
    requestAnimationFrame(() => {
      containerRef.value!.scrollTop = position.offset
      
      // 滚动后立即更新
      setTimeout(() => {
        updateVisibleItemsBasedOnScroll(position.offset, 0, true)
      }, 0)
    })
  },
  
  // 暴露紧急恢复方法
  emergencyRecover: () => {
    const scrollTop = containerRef.value?.scrollTop || 0
    updateVisibleItemsBasedOnScroll(scrollTop, 0, true)
    isEmergencyMode.value = false
  }
})
</script>

<style scoped>
.virtual-scroll-observer-optimized {
  position: relative;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.virtual-scroll-item {
  will-change: transform;
}

.emergency-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
}

.emergency-item {
  position: absolute;
  background: #f8f9fa;
  border: 1px dashed #dee2e6;
  opacity: 0.8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emergency-content {
  color: #6c757d;
  font-size: 14px;
  font-style: italic;
}
</style>