# Virtual Scroll Component

A high-performance virtual scroll component that supports both Vue 3 and React 18, with excellent browser compatibility.

## Features

- 🚀 High performance with minimal DOM nodes
- 🎯 Support for both Vue 3 and React 18
- 📏 Fixed and variable item heights
- 🔄 Horizontal and vertical scrolling
- 🎨 Customizable buffer size
- 📱 Excellent browser compatibility
- 🧪 Comprehensive test coverage
- 📦 Built with Vite for optimal bundle size
- 👁️ Intersection Observer API support for modern browsers

## Installation

```bash
npm install
npm run build
```

## Usage

### Traditional Scroll-based Approach

#### Vue 3

```vue
<template>
  <virtual-scroll
    :items="items"
    :item-height="50"
    :height="400"
  >
    <template #item="{ index, data }">
      <div>{{ data.name }}</div>
    </template>
  </virtual-scroll>
</template>

<script setup>
import { VirtualScroll } from 'virtual-scroll-component/vue'

const items = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `Item ${i}`
}))
</script>
```

#### React 18

```tsx
import { VirtualScroll } from 'virtual-scroll-component/react'

function App() {
  const items = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`
  }))

  return (
    <VirtualScroll
      items={items}
      itemHeight={50}
      height={400}
      renderItem={({ index, data }) => (
        <div>{data.name}</div>
      )}
    />
  )
}
```

### Intersection Observer Approach (Modern Browsers)

#### Vue 3

```vue
<template>
  <virtual-scroll-observer
    :items="items"
    :item-height="50"
    :height="400"
    :root-margin="'50px'"
    @visible-change="onVisibleChange"
  >
    <template #item="{ index, data }">
      <div>{{ data.name }}</div>
    </template>
  </virtual-scroll-observer>
</template>

<script setup>
import { VirtualScrollObserver } from 'virtual-scroll-component/vue'

const items = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `Item ${i}`
}))

function onVisibleChange(visible, entries) {
  console.log('Visible items:', visible)
}
</script>
```

#### React 18

```tsx
import { VirtualScrollObserver } from 'virtual-scroll-component/react'

function App() {
  const items = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`
  }))

  return (
    <VirtualScrollObserver
      items={items}
      itemHeight={50}
      height={400}
      rootMargin="50px"
      renderItem={({ index, data }) => (
        <div>{data.name}</div>
      )}
      onVisibleChange={(visible, entries) => {
        console.log('Visible items:', visible)
      }}
    />
  )
}
```

## API

### Traditional VirtualScroll Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| items | Array | required | Array of items to render |
| itemHeight | number \| (index: number) => number | required | Height of each item |
| height | number | required | Height of the scroll container |
| buffer | number | 5 | Number of items to render outside visible area |
| horizontal | boolean | false | Enable horizontal scrolling |

### VirtualScrollObserver Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| items | Array | required | Array of items to render |
| itemHeight | number \| (index: number) => number | required | Height of each item |
| height | number | required | Height of the scroll container |
| rootMargin | string | '50px' | Margin around the root for intersection detection |
| threshold | number \| number[] | 0 | Intersection threshold |
| overscan | number | 3 | Number of items to render outside visible area |

### Methods

Both components expose a `scrollToIndex` method:

```js
// Vue
virtualScrollRef.value.scrollToIndex(100)

// React
virtualScrollRef.current.scrollToIndex(100)
```

## Comparison

### Traditional Scroll-based Approach
- ✅ Better browser compatibility
- ✅ Precise scroll position tracking
- ✅ Predictable performance
- ❌ Requires scroll event handling

### Intersection Observer Approach
- ✅ More efficient for modern browsers
- ✅ Automatic visibility detection
- ✅ Less JavaScript execution during scroll
- ❌ Requires Intersection Observer support
- ❌ May have slight delays in visibility updates

## Development

```bash
# Install dependencies
npm install

# Run Vue demo
cd demos/vue-demo
npm install
npm run dev

# Run React demo
cd demos/react-demo
npm install
npm run dev

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Build library
npm run build
```

## Browser Compatibility

### Traditional Approach
- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Android 80+

### Intersection Observer Approach
- Chrome 51+
- Firefox 55+
- Safari 12.1+
- Edge 15+
- Mobile browsers with Intersection Observer support

## License

MIT