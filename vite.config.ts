import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(prosemirror-|@tiptap\/pm)/.test(id))
            return 'prosemirror'
          if (
            id.includes('/node_modules/@tiptap/') ||
            id.includes('/node_modules/marked/')
          )
            return 'editor'
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id))
            return 'react'
        },
      },
    },
  },
  server: { port: 5173, strictPort: true },
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'] },
})
