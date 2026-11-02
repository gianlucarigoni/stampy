import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/stampy.scss'

// Bootstrap 5.3 themes through data-bs-theme: follow the system setting and keep following it.
const dark = window.matchMedia('(prefers-color-scheme: dark)')
const applyTheme = () => document.documentElement.setAttribute('data-bs-theme', dark.matches ? 'dark' : 'light')
applyTheme()
dark.addEventListener('change', applyTheme)

createApp(App).use(router).mount('#app')
