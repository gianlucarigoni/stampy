<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
</script>

<template>
  <div class="container narrow py-3">
    <AppHeader />
    <main id="main" tabindex="-1">
      <AppEmptyState icon="compass" title="Pagina non trovata">
        <p>Controlla il link, oppure avvicina di nuovo il telefono al tag.</p>
        <template #actions>
          <AppButton variant="secondary" :to="{ path: '/' }">Vai alla pagina iniziale</AppButton>
        </template>
      </AppEmptyState>
    </main>
  </div>
</template>
