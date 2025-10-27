import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/prc/',  // Important: base path for assets
  build: {
    outDir: '../hugo/static/prc',  // Build directly into Hugo
    emptyOutDir: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __GIT_COMMIT_SHA__: JSON.stringify(process.env.VITE_GIT_COMMIT_SHA?.substring(0, 7) || 'dev'),
    __BUILD_DATE__: JSON.stringify(process.env.VITE_BUILD_DATE || new Date().toISOString()),
  },
})
