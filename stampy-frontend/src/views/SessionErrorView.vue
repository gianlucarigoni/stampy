<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import { safeNext } from '@/utils/redirect'

const route = useRoute()
const router = useRouter()

const retry = () => router.replace(safeNext(route.query.next) ?? '/')
</script>

<template>
  <div class="container narrow py-3">
    <AppHeader />
    <main id="main" tabindex="-1">
      <!-- Page error (pattern 5.1): what failed + what to do + always a way out. -->
      <AppEmptyState icon="wifi-slash" title="Connessione non riuscita">
        <p>Controlla la connessione. Se continua, riprova tra poco.</p>
        <template #actions>
          <AppButton icon="arrow-clockwise" @click="retry">Riprova</AppButton>
          <AppButton variant="secondary" :to="{ path: '/' }">Vai alla pagina iniziale</AppButton>
        </template>
      </AppEmptyState>
    </main>
  </div>
</template>
