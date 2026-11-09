import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      // Bootstrap 5.3 still uses @import and a few Sass APIs that Sass deprecates.
      scss: {
        quietDeps: true,
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
      },
    },
  },
  server: {
    // Ascolta su tutte le interfacce: permette di provare dal telefono sulla stessa rete Wi-Fi.
    host: true,
    // Same origin as the app in dev too: the `sid` cookie is first-party and CORS stays out.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
