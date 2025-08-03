<template>
  <div 
    ref="containerRef"
    class="virtual-scroll-container"
    :style="containerStyle"
    @scroll="handleScroll"
  >
    <div :style="spacerStyle">
      <div :style="contentStyle">
        <div
          v-for="index in visibleItems"
          :key="index"
          :style="getItemStyle(index)"
        >
          <slot name="item" :index="index" :data="items[index]" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, toRefs } from 'vue'
import { VirtualScrollCore, VirtualScrollState } from '../core'

interface Props {
  items: any[]
  itemHeight: number | ((index: number) => number)
  height: number
  buffer?: number
  horizontal?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  buffer: 5,
  horizontal: false
})

const emit = defineEmits<{
  scroll: [event: Event]
  visibleRangeChange: [start: number, end: number]
}>()

const containerRef = ref<HTMLElement>()
const scrollState = ref<VirtualScrollState>({
  visibleRange: { start: 0, end: 0 },
  scrollOffset: 0,
  totalHeight: 0,
  itemPositions: new Map()
})

let virtualScroll: VirtualScrollCore | null = null

const containerStyle = computed(() => ({
  height: `${props.height}px`,
  overflow: 'auto',
  position: 'relative' as const
}))

const spacerStyle = computed(() => {
  const size = scrollState.value.totalHeight
  return props.horizontal
    ? { width: `${size}px`, height: '100%' }
    : { height: `${size}px`, width: '100%' }
})

const contentStyle = computed(() => {
  const offset = scrollState.value.scrollOffset
  const translate = props.horizontal ? `translateX(${offset}px)` : `translateY(${offset}px)`
  return {
    transform: translate,
    position: 'absolute' as const,
    top: 0,
    left: 0
  }
})

const visibleItems = computed(() => {
  const { start, end } = scrollState.value.visibleRange
  const items: number[] = []
  for (let i = start; i <= end && i < props.items.length; i++) {
    items.push(i)
  }
  return items
})

function getItemStyle(index: number) {
  const position = scrollState.value.itemPositions.get(index)
  if (!position) return {}
  
  const style: Record<string, string> = {
    position: 'absolute'
  }
  
  if (props.horizontal) {
    style.left = `${position.offset}px`
    style.width = `${position.size}px`
    style.height = '100%'
  } else {
    style.top = `${position.offset}px`
    style.height = `${position.size}px`
    style.width = '100%'
  }
  
  return style
}

function handleScroll(event: Event) {
  const target = event.target as HTMLElement
  virtualScroll?.onScroll({
    scrollTop: target.scrollTop,
    scrollLeft: target.scrollLeft
  })
  emit('scroll', event)
}

function initializeVirtualScroll() {
  virtualScroll = new VirtualScrollCore({
    itemCount: props.items.length,
    itemHeight: props.itemHeight,
    containerHeight: props.height,
    buffer: props.buffer,
    horizontal: props.horizontal
  })
  
  virtualScroll.onUpdate((state) => {
    scrollState.value = state
    emit('visibleRangeChange', state.visibleRange.start, state.visibleRange.end)
  })
  
  scrollState.value = virtualScroll.getState()
}

function scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start') {
  if (!virtualScroll || !containerRef.value) return
  
  const offset = virtualScroll.scrollToIndex(index, align)
  
  if (props.horizontal) {
    containerRef.value.scrollLeft = offset
  } else {
    containerRef.value.scrollTop = offset
  }
}

watch(
  () => [props.items.length, props.itemHeight, props.height, props.buffer, props.horizontal],
  () => {
    virtualScroll?.updateOptions({
      itemCount: props.items.length,
      itemHeight: props.itemHeight,
      containerHeight: props.height,
      buffer: props.buffer,
      horizontal: props.horizontal
    })
  }
)

onMounted(() => {
  initializeVirtualScroll()
})

onUnmounted(() => {
  virtualScroll?.destroy()
})

defineExpose({
  scrollToIndex
})
</script>

<style scoped>
.virtual-scroll-container {
  position: relative;
  overflow: auto;
}
</style>