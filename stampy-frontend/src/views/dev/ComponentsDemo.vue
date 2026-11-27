<script setup lang="ts">
// DEV ONLY (route /dev/components, not in the production build): every base component in every state.
// Hover, pressed and keyboard focus are real states: use the pointer and Tab (or CDP "force state" in DevTools).
import { ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppChip from '@/components/ui/AppChip.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import AppField from '@/components/ui/AppField.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppMenu from '@/components/ui/AppMenu.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import AppStatusChip from '@/components/ui/AppStatusChip.vue'
import AppStatusLine from '@/components/ui/AppStatusLine.vue'
import { focusFirstInvalid } from '@/utils/focus'

const variants = ['primary', 'secondary', 'link', 'danger', 'danger-outline'] as const

// Validation on tap + network error ≠ invalid field (pattern 5.1/5.2).
const email = ref('')
const emailError = ref('')
const network = ref(false)
const sending = ref(false)
const form = ref<HTMLElement | null>(null)
async function tap() {
  if (sending.value) return
  network.value = false
  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) {
    emailError.value = "Controlla l'indirizzo: manca la @ o il dominio."
    await Promise.resolve()
    focusFirstInvalid(form.value)
    return
  }
  emailError.value = ''
  sending.value = true
  setTimeout(() => {
    sending.value = false
    network.value = true // the field stays neutral: the value was fine, the network was not
  }, 1200)
}
const busyDemo = ref(false)
const stepper = ref(1)
const menuItems = [
  { name: 'profile', label: 'Profilo', to: '/dev/components', icon: 'user' as const },
  { name: 'hist', label: 'Storico richieste', to: '/dev/components?h', icon: 'clock-counter-clockwise' as const },
]
</script>

<template>
  <div class="container narrow py-3 d-flex flex-column gap-4">
    <AppHeader centered>
      <template #start><AppIconButton icon="arrow-left" label="Indietro" /></template>
      <AppMenu :items="menuItems" />
    </AppHeader>
    <main id="main" tabindex="-1" class="d-flex flex-column gap-4">
      <h1>Componenti base</h1>

      <section class="d-flex flex-column gap-3" aria-labelledby="d-btn">
        <h2 id="d-btn">Bottoni</h2>
        <template v-for="v in variants" :key="v">
          <AppButton :variant="v">{{ v }}</AppButton>
        </template>
        <AppButton variant="primary" busy busy-label="Invio in corso…">primario in lavorazione</AppButton>
        <AppButton variant="danger" busy busy-label="Elimino…">pericolo in lavorazione</AppButton>
        <AppButton variant="secondary" busy busy-label="Invio…">secondario in lavorazione</AppButton>
        <AppButton variant="link" :block="false" busy busy-label="Invio…">link in lavorazione</AppButton>
        <AppButton variant="primary" icon="check" compact>Conferma 2 timbri (compatto)</AppButton>
        <AppButton :busy="busyDemo" busy-label="Invio…" @click="busyDemo = !busyDemo">Tocca: alterna lavorazione</AppButton>
        <div class="d-flex gap-3 align-items-center">
          <AppIconButton icon="list" label="Menu" />
          <AppIconButton icon="list" label="Menu aperto" expanded />
          <AppIconButton icon="minus" label="Meno" :limited="stepper <= 1" @click="stepper--" />
          <strong>{{ stepper }}</strong>
          <AppIconButton icon="plus" label="Più" :limited="stepper >= 3" @click="stepper++" />
        </div>
      </section>

      <section class="d-flex flex-column gap-3" aria-labelledby="d-field">
        <h2 id="d-field">Campo</h2>
        <AppField label="Con suggerimento" hint="Da 3 a 50 caratteri." model-value="Anna" />
        <AppField label="Invalido (errore al posto del suggerimento)" hint="Da 3 a 50 caratteri." error="Scrivi almeno 3 caratteri" model-value="A" />
        <AppField label="In lavorazione (sola lettura)" busy hint="Da 3 a 50 caratteri." model-value="Anna Bianchi" />
        <AppField label="Codice morto" dead code error="Codice scaduto. Richiedi un nuovo codice." model-value="" />
        <AppField label="Codice a 6 cifre" code hint="Controlla anche lo spam." model-value="123456" />
        <div ref="form" class="card card-body">
          <p class="mb-2">Prova: tocca con il campo vuoto (errore al tocco, focus sul campo, il bottone non si sposta); con un indirizzo valido simula un errore di rete (campo neutro).</p>
          <AppAlert v-if="network" type="error">Connessione non riuscita. Riprova: il tuo codice è ancora valido.</AppAlert>
          <AppField v-model="email" label="Email" type="email" :error="emailError" autocomplete="off" />
          <AppButton :busy="sending" busy-label="Invio…" @click="tap">Invia il codice</AppButton>
        </div>
      </section>

      <section class="d-flex flex-column gap-3" aria-labelledby="d-alert">
        <h2 id="d-alert">Avvisi</h2>
        <AppAlert type="error" title="Errore">Qualcosa non ha funzionato. Riprova tra un attimo.</AppAlert>
        <AppAlert type="warning">Hai fatto troppe richieste: riprova tra 3 min.</AppAlert>
        <AppAlert type="success" title="Richiesta approvata">+2 timbri</AppAlert>
        <AppAlert type="info">Nuova promozione: la card riparte da zero.</AppAlert>
        <AppAlert type="prize" title="Premio disponibile">Il prossimo prodotto è gratis.</AppAlert>
        <AppAlert type="error" dismissible>9Q23TSZG · Richiesta non più valida</AppAlert>
        <AppStatusLine>Nome aggiornato</AppStatusLine>
      </section>

      <section class="d-flex flex-column gap-3" aria-labelledby="d-chip">
        <h2 id="d-chip">Chip</h2>
        <div class="d-flex flex-wrap gap-2">
          <AppChip icon="clock">neutro</AppChip>
          <AppChip variant="warn" icon="warning-fill">avviso</AppChip>
          <AppChip variant="ok" icon="check-circle-fill">successo</AppChip>
          <AppChip variant="prize" icon="gift-fill">premio</AppChip>
          <AppChip variant="action">Nuova</AppChip>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <AppStatusChip status="pending" />
          <AppStatusChip status="approved" />
          <AppStatusChip status="rejected" />
          <AppStatusChip status="expired" />
          <AppStatusChip status="prize" />
        </div>
      </section>

      <section class="d-flex flex-column gap-3" aria-labelledby="d-card">
        <h2 id="d-card">Card, scheletro, stato vuoto</h2>
        <AppCard>Card semplice</AppCard>
        <AppCard :to="{ path: '/dev/components', query: { c: '1' } }"><span class="fw-semibold">Riga-link tappabile</span></AppCard>
        <AppSkeleton card :lines="3" height="2rem" />
        <AppEmptyState icon="compass" title="Pagina non trovata" :heading-level="2">
          <p>Controlla il link, oppure avvicina di nuovo il telefono al tag.</p>
          <template #actions><AppButton variant="secondary">Vai alla pagina iniziale</AppButton></template>
        </AppEmptyState>
      </section>
    </main>
  </div>
</template>
