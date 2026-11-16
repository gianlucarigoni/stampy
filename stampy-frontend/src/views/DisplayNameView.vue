<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import DisplayNameForm from '@/components/DisplayNameForm.vue'
import { destinationAfterLogin } from '@/utils/redirect'

const route = useRoute()
const router = useRouter()

// Shown once, while `displayName` is null (router guard); not skippable. Then on to where they were going.
async function done() {
  await router.replace(await destinationAfterLogin(route.query.next))
}
</script>

<template>
  <section class="card card-body" aria-labelledby="display-name-title">
    <h1 id="display-name-title" class="h4">Come ti chiami?</h1>
    <p class="text-body-secondary">Ci serve per riconoscerti nei locali. Lo puoi cambiare quando vuoi dal tuo profilo.</p>
    <DisplayNameForm submit-label="Continua" @saved="done" />
  </section>
</template>
