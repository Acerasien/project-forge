import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    alias: {
      '@domain': '/src/domain',
      '@application': '/src/application',
      '@infrastructure': '/src/infrastructure',
      '@shared': '/src/shared',
      '@renderer': '/src/renderer/src',
      '@main': '/src/main',
      '@preload': '/src/preload'
    }
  }
})
