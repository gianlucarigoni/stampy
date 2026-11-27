<script setup lang="ts">
// 429 (21 §5.1): one format for every screen. The text changes at most once a minute, so the live region does not
// chatter; the button that is blocked carries the same wait in its label ("Riprova tra N min") and stays full.
import { computed } from 'vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import { waitMinutes } from '@/utils/format'

const props = defineProps<{ seconds: number }>()
const text = computed(() => `Riprova tra ${waitMinutes(props.seconds)}.`)
</script>

<template>
  <AppAlert type="warning" title="Hai fatto troppe richieste">{{ text }}</AppAlert>
</template>
