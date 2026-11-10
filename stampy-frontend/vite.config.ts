import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
// Porte per worktree: API_PORT e WEB_PORT stanno in stampy-frontend/.env.local (scritto da
// .claude/scripts/worktree-start.sh, ignorato da git). Senza, valgono i default di sempre.
const env = loadEnv(mode, process.cwd(), '')
const apiPort = env.API_PORT || '3000'
const webPort = Number(env.WEB_PORT) || 5173

return {
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
    port: webPort,
    // Con una porta assegnata a un worktree, se è occupata meglio fallire che spostarsi.
    strictPort: Boolean(env.WEB_PORT),
    // Same origin as the app in dev too: the `sid` cookie is first-party and CORS stays out.
    proxy: {
      '/api': `http://localhost:${apiPort}`,
    },
  },
}
})
