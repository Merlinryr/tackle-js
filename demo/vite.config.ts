import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import tackle from '../dist/vite.js'

export default defineConfig({
  plugins: [tackle({ dir: fileURLToPath(new URL('./.tackle', import.meta.url)) })],
})
