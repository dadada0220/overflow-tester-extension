import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
      },
    },
    // Chrome拡張機能はinline scriptを許可しないのでinlineしない
    cssCodeSplit: false,
  },
})
