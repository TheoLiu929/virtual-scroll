<template>
  <div ref="containerRef" class="virtual-scroll-observer" :style="containerStyle">
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
}

const props = withDefaults(defineProps<Props>(), {
  rootMargin: '50px',
  threshold: 0,
  overscan: 3
})

const emit = defineEmits<{
  visibleChange: [visible: number[], entries: IntersectionObserverEntry[]]
}>()

const containerRef = ref<HTMLElement>()
const visibleItems = ref(new Set<number>())
const itemIndices = ref<number[]>([])
let observer: IntersectionObserver | null = null

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

function updateVisibleItems() {
  const indices: number[] = []
  const min = Math.max(0, Math.min(...visibleItems.value) - props.overscan)
  const max = Math.min(props.items.length - 1, Math.max(...visibleItems.value) + props.overscan)
  
  for (let i = min; i <= max; i++) {
    indices.push(i)
  }
  
  itemIndices.value = indices
}

function handleIntersection(entries: IntersectionObserverEntry[]) {
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
  
  // Initialize with first few items
  const initialCount = Math.ceil(props.height / getItemHeight(0)) + props.overscan * 2
  itemIndices.value = Array.from({ length: Math.min(initialCount, props.items.length) }, (_, i) => i)
  
  // Start observing after next tick
  setTimeout(observeItems, 0)
}

watch(itemIndices, () => {
  unobserveItems()
  setTimeout(observeItems, 0)
})

watch(() => props.items.length, () => {
  updateVisibleItems()
})

onMounted(() => {
  initializeObserver()
})

onUnmounted(() => {
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
    
    containerRef.value.scrollTop = offset
  }
})
</script>

<style scoped>
.virtual-scroll-observer {
  position: relative;
  overflow: auto;
}

.virtual-scroll-item {
  will-change: transform;
}
</style>