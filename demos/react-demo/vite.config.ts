import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'virtual-scroll-component/react': resolve(__dirname, '../../src/react'),
      'virtual-scroll-component': resolve(__dirname, '../../src/core')
    }
  }
})