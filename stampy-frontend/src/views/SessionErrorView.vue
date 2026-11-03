<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import { safeNext } from '@/utils/redirect'

const route = useRoute()
const router = useRouter()

const retry = () => router.replace(safeNext(route.query.next) ?? '/')
</script>

<template>
  <div class="container narrow py-3">
    <AppHeader />
    <main id="main" tabindex="-1">
      <div class="card card-body">
        <p class="alert alert-danger" role="alert">Connessione non riuscita, riprova</p>
        <button type="button" class="btn btn-primary" @click="retry">Riprova</button>
      </div>
    </main>
  </div>
</template>
