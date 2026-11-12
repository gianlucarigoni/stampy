<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { renderGoogleButton } from '@/utils/googleIdentity'

const emit = defineEmits<{ credential: [idToken: string] }>()

// No client ID configured (or the script could not load): no button, e-mail login stays.
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
const available = ref(Boolean(clientId))
const root = ref<HTMLElement | null>(null)
const face = ref<HTMLElement | null>(null)
const overlay = ref<HTMLElement | null>(null)

// Google only hands out the ID token through its own button, which cannot be restyled. So the
// button the customer sees is ours (same surface and border as the e-mail field, in both themes)
// and Google's real button sits on top of it, invisible, stretched to the same size: the click
// lands on Google's button.
const GOOGLE_BUTTON_HEIGHT = 40 // px, `size: 'large'`

onMounted(async () => {
  if (!clientId || !face.value || !overlay.value) return
  const wanted = face.value.offsetWidth
  const width = Math.min(400, Math.max(200, Math.round(wanted))) // Google accepts 200–400 px
  try {
    await renderGoogleButton(overlay.value, clientId, (idToken) => emit('credential', idToken), width)
    // Exactly the button's box: Google's iframe has transparent padding around the button that must not catch clicks.
    overlay.value.style.width = `${width}px`
    overlay.value.style.height = `${GOOGLE_BUTTON_HEIGHT}px`
    overlay.value.style.transform = `scale(${wanted / width}, ${face.value.offsetHeight / GOOGLE_BUTTON_HEIGHT})`
  } catch {
    available.value = false
  }
})
</script>

<template>
  <div v-if="available">
    <div class="d-flex align-items-center gap-2 my-3 text-body-secondary">
      <hr class="flex-grow-1 m-0" />
      <span>oppure</span>
      <hr class="flex-grow-1 m-0" />
    </div>
    <div ref="root" class="google-signin">
      <div ref="face" class="btn google-signin-face w-100" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        <span class="fw-semibold">Continua con Google</span>
      </div>
      <div ref="overlay" class="google-signin-overlay"></div>
    </div>
  </div>
</template>

<style scoped>
.google-signin {
  position: relative;
}

/* Same tokens as the e-mail field, so the button follows the theme and never looks pasted on.
   Hover comes from `.google-signin:hover` (Google's iframe is on top, so the face itself is never
   the hovered element). While the pointer is inside the cross-origin iframe the browser may not
   always report it to the page: known limit, accepted (the hover is a nicety, the click always works). */
.google-signin-face {
  --bs-btn-color: var(--bs-body-color);
  --bs-btn-bg: var(--bs-body-bg);
  --bs-btn-border-color: var(--bs-border-color);
  --bs-btn-hover-color: var(--bs-body-color);
  --bs-btn-hover-bg: var(--bs-tertiary-bg);
  --bs-btn-hover-border-color: var(--bs-border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 3rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

/* Google's real button: invisible but clickable, stretched over the visible one. */
.google-signin-overlay {
  position: absolute;
  inset: 0 auto auto 0;
  transform-origin: 0 0;
  opacity: 0;
  overflow: hidden;
}

.google-signin:hover .google-signin-face {
  background-color: var(--bs-btn-hover-bg);
}

.google-signin:focus-within .google-signin-face {
  outline: 2px solid var(--stampy-brand, #f16417);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .google-signin-face {
    transition: none;
  }
}
</style>
