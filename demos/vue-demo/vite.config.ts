import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      'virtual-scroll-component/vue': resolve(__dirname, '../../src/vue'),
      'virtual-scroll-component': resolve(__dirname, '../../src/core')
    }
  }
})