<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import { safeNext } from '@/utils/redirect'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'

const route = useRoute()
const router = useRouter()

const retry = () => router.replace(safeNext(route.query.next) ?? '/')
</script>

<template>
  <div class="container narrow py-3">
    <AppHeader />
    <main id="main" tabindex="-1">
      <div class="card card-body">
        <AppAlert type="error">Connessione non riuscita, riprova</AppAlert>
        <AppButton @click="retry">Riprova</AppButton>
      </div>
    </main>
  </div>
</template>
