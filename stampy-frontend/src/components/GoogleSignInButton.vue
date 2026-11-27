<script setup lang="ts">
// "Continua con Google" (D2): Google's own button, rendered by Google Identity Services and left untouched (no face of
// ours on top of it, no scaling). We only choose what the API lets us choose: text `continue_with`, size, width up to
// 400 px, and the theme (`outline` on light, `filled_black` on dark: the documentation gives no rule for the dark
// scheme, this is our choice). The button is Google's iframe, so its focus ring and its height are Google's too.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { renderGoogleButton } from '@/utils/googleIdentity'

const emit = defineEmits<{ credential: [idToken: string] }>()

// No client ID configured (or the script could not load): no button, e-mail login stays.
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
const available = ref(Boolean(clientId))
const slot = ref<HTMLElement | null>(null)

let lastKey = ''
async function draw() {
  const el = slot.value
  if (!clientId || !el) return
  const width = Math.min(400, Math.round(el.clientWidth))
  if (width < 200) return // not laid out yet (or an impossibly narrow box): wait for the next resize
  const theme = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'filled_black' : 'outline'
  const key = `${width}/${theme}`
  if (key === lastKey) return
  lastKey = key
  try {
    await renderGoogleButton(el, clientId, (idToken) => emit('credential', idToken), { width, theme })
  } catch {
    available.value = false
  }
}

let resize: ResizeObserver | undefined
let themeWatch: MutationObserver | undefined
onMounted(() => {
  void draw()
  if (!slot.value) return
  resize = new ResizeObserver(() => void draw())
  resize.observe(slot.value)
  themeWatch = new MutationObserver(() => void draw())
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] })
})
onBeforeUnmount(() => {
  resize?.disconnect()
  themeWatch?.disconnect()
})
</script>

<template>
  <div v-if="available" class="google-signin">
    <div class="app-or" aria-hidden="true"><hr /><span>oppure</span><hr /></div>
    <!-- 44 px reserved from the start: the page does not jump when Google's iframe arrives. -->
    <div ref="slot" class="google-signin-slot"></div>
  </div>
</template>

<style scoped>
.app-or {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0 0.75rem;
  color: var(--app-text-2);
  font-size: 0.9375rem;
}
.app-or hr {
  flex: 1;
  margin: 0;
  opacity: 1;
  border-color: var(--app-border);
}
.google-signin-slot {
  display: flex;
  justify-content: center;
  min-height: 2.75rem;
  /* The iframe has its own colour-scheme: keep it transparent so a dark page does not show a white box around it. */
  color-scheme: light dark;
}
</style>
