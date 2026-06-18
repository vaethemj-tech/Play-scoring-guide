import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative base so the built site works when served from a GitHub Pages
  // project subpath (e.g. /play-scoring-guide/) without hardcoding the repo name.
  base: './',
})
