<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import AppHeader from '@/components/AppHeader.vue'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { logout } = useAuth()

const error = ref('')

async function signOut() {
  error.value = ''
  try {
    await logout()
    await router.replace({ name: 'login' })
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Errore interno'
  }
}
</script>

<template>
  <div class="container narrow py-3">
    <AppHeader>
      <button type="button" class="btn btn-link" @click="signOut">Esci</button>
    </AppHeader>

    <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
    <RouterView :key="route.path" />
  </div>
</template>
