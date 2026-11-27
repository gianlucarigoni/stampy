<script lang="ts">
// Shared types and limits of the queue card (exports cannot live in <script setup>).
export type ClosedReason = 'expired' | 'approved' | 'rejected' | 'handled' | 'gone'
export type Outcome =
  | { kind: 'approved'; stampsAdded: number; rewards: number; reward: string; rewardReady: boolean }
  | { kind: 'rejected' }
export type CardState =
  | { kind: 'pending' }
  | { kind: 'undo'; action: 'confirm' | 'reject'; products: number; deadline: number }
  | { kind: 'sending'; action: 'confirm' | 'reject' }
  | { kind: 'done'; at: number; outcome: Outcome }
  | { kind: 'closed'; reason: ClosedReason }

export const MIN_PRODUCTS = 1
export const MAX_PRODUCTS = 50 // same limit as the confirm DTO
export const HIGH_PRODUCTS = 5 // above this a warning line appears (21 §4.11, threshold to validate with staff)
export const UNDO_MS = 4000
</script>

<script setup lang="ts">
// One row of the staff queue (21 §4.11, F11). The same card shows every state of a request, in place:
//   pending  -> code, customer, stepper, Conferma / Rifiuta
//   undo     -> "Annulla" for 4 s: the API call has NOT been made yet (D27: UI only, no backend undo)
//   sending  -> the call is in flight
//   done     -> quiet row with the outcome (never disappears by itself, "Chiudi")
//   closed   -> "Scaduta" / "Già gestita": the card stays, same height, until "Chiudi" (D25)
// The quantity lives here: it survives the 3 s polling because the component is never re-created for the same request.
import { computed, ref } from 'vue'
import type { QueueItem } from '@/api/endpoints'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppChip from '@/components/ui/AppChip.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppStatusChip from '@/components/ui/AppStatusChip.vue'
import { formatTime, sinceText } from '@/utils/format'

const props = defineProps<{
  item: QueueItem
  state: CardState
  now: number
  isNew?: boolean
  /** Error of the last action on this card (shown in the reserved message row). */
  error?: string
  /** Height the card had while pending: "Scaduta / Già gestita" keep it so nothing below moves (D25). */
  frozenHeight?: number
}>()
const emit = defineEmits<{ confirm: [products: number]; reject: []; undo: []; close: [] }>()

// --- quantity -------------------------------------------------------------------------------------------------------
// `products` is the last valid quantity; `draft` is the raw text while staff types (the input shows the draft, so a
// re-render can never overwrite it).
const products = ref(MIN_PRODUCTS)
const draft = ref<string | null>(null)
const touched = ref(false) // the invalid message shows after a tap on Conferma or on leaving the field, not while typing
const input = ref<HTMLInputElement | null>(null)

/** Whole number in 1..50, otherwise null. The backend validates again. */
function parse(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null
  const n = Number(raw)
  return n >= MIN_PRODUCTS && n <= MAX_PRODUCTS ? n : null
}
const quantity = computed(() => (draft.value === null ? products.value : parse(draft.value)))
const inputText = computed(() => draft.value ?? String(products.value))

const quantityProblem = computed(() => {
  if (quantity.value !== null || draft.value === null) return ''
  const raw = draft.value.trim()
  if (/^\d+$/.test(raw)) return Number(raw) < MIN_PRODUCTS ? `Minimo ${MIN_PRODUCTS}.` : `Massimo ${MAX_PRODUCTS}.`
  return `Inserisci un numero intero da ${MIN_PRODUCTS} a ${MAX_PRODUCTS}.`
})

function step(delta: number) {
  products.value = Math.min(MAX_PRODUCTS, Math.max(MIN_PRODUCTS, (quantity.value ?? products.value) + delta))
  draft.value = null
}
function type(el: HTMLInputElement) {
  draft.value = el.value
  const ok = parse(el.value)
  if (ok !== null) {
    products.value = ok
    touched.value = false // valid again: the message goes away
  }
}
function leaveField() {
  touched.value = true
  if (draft.value !== null && parse(draft.value) !== null) draft.value = null // "07" -> 7
}
function tapConfirm() {
  const n = quantity.value
  if (n === null) {
    // Conferma is never disabled (D26): the tap sends nothing and puts the focus on the field that says why.
    touched.value = true
    input.value?.focus()
    return
  }
  emit('confirm', n)
}

// --- display --------------------------------------------------------------------------------------------------------
const code = computed(() => props.item.publicCode)
const codeParts = computed(() => (code.value.length === 8 ? [code.value.slice(0, 4), code.value.slice(4)] : [code.value]))
const full = computed(() => props.item.stampsCount >= props.item.stampsRequired)
const leftSeconds = computed(() => Math.ceil((new Date(props.item.expiresAt).getTime() - props.now) / 1000))
const expiryText = computed(() => {
  const left = leftSeconds.value
  if (left <= 0) return 'scade ora'
  return left < 60 ? `scade tra ${left} s` : `scade tra ${Math.ceil(left / 60)} min`
})
const message = computed(() => {
  if (props.error) return { kind: 'error' as const, text: props.error }
  if (touched.value && quantityProblem.value) return { kind: 'problem' as const, text: quantityProblem.value }
  const n = quantity.value
  if (n !== null && n > HIGH_PRODUCTS) return { kind: 'high' as const, text: `Stai confermando ${n} prodotti.` }
  return { kind: 'hint' as const, text: 'prodotti consumati (premio compreso)' }
})

const undoSeconds = computed(() => (props.state.kind === 'undo' ? Math.max(0, Math.ceil((props.state.deadline - props.now) / 1000)) : 0))

const closedText = computed(() => {
  if (props.state.kind !== 'closed') return null
  return {
    expired: { chip: 'Scaduta', text: 'Il cliente può rifare la richiesta.' },
    approved: { chip: 'Già gestita', text: "Un collega l'ha già confermata." },
    rejected: { chip: 'Già gestita', text: "Un collega l'ha già rifiutata." },
    handled: { chip: 'Già gestita', text: "Un collega l'ha già gestita." },
    gone: { chip: 'Non più in coda', text: 'La richiesta non è più disponibile.' },
  }[props.state.reason]
})
const doneAt = computed(() => (props.state.kind === 'done' ? formatTime(new Date(props.state.at).toISOString()) : ''))
const customer = computed(() => props.item.displayName)
const productsLabel = (n: number) => `${n} ${n === 1 ? 'prodotto' : 'prodotti'}`

defineExpose({ focusQuantity: () => input.value?.focus() })
</script>

<template>
  <article
    :id="`card-${item.requestId}`"
    class="queue-card card"
    :class="{ 'is-new': isNew && state.kind === 'pending' }"
    :style="state.kind === 'closed' && frozenHeight ? { minHeight: `${frozenHeight}px` } : undefined"
  >
    <!-- Quiet row: the outcome stays until "Chiudi". The reward name is in the confirm answer, not in the queue (D29). -->
    <template v-if="state.kind === 'done'">
      <AppAlert
        v-if="state.outcome.kind === 'approved'"
        type="success"
        :title="`Confermata ${doneAt}`"
        dismissible
        class="mb-0"
        @dismiss="emit('close')"
      >
        <span class="queue-code-sm">{{ code }}</span>
        <template v-if="state.outcome.stampsAdded > 0"> · +{{ state.outcome.stampsAdded }} {{ state.outcome.stampsAdded === 1 ? 'timbro' : 'timbri' }}</template>
        <template v-else-if="state.outcome.rewards === 0"> · nessun timbro aggiunto</template>
        <p v-if="state.outcome.rewards > 0" class="mt-2 mb-0">
          <AppChip variant="prize" icon="gift-fill">{{ state.outcome.rewards === 1 ? 'Premio' : `${state.outcome.rewards} premi` }}</AppChip>
          <strong class="ms-2">Consegna: {{ state.outcome.reward }}</strong>
        </p>
        <p v-if="state.outcome.rewardReady" class="mt-2 mb-0 fw-bold">Premio disponibile alla prossima visita</p>
      </AppAlert>
      <AppAlert v-else type="warning" :title="`Rifiutata ${doneAt}`" dismissible class="mb-0" @dismiss="emit('close')">
        <span class="queue-code-sm">{{ code }}</span> · nessun timbro
      </AppAlert>
    </template>

    <!-- Waiting to be sent: Annulla cancels the call that has not left yet. -->
    <template v-else-if="state.kind === 'undo'">
      <AppAlert type="info" :title="state.action === 'confirm' ? `Confermo ${productsLabel(state.products)}` : 'Rifiuto la richiesta'" class="mb-3" :announce="false">
        <span class="queue-code-sm">{{ code }}</span> · invio tra {{ undoSeconds }} s
        <span class="undo-bar" aria-hidden="true"><span class="undo-bar-fill" /></span>
      </AppAlert>
      <p class="visually-hidden" role="status">{{ state.action === 'confirm' ? 'Conferma' : 'Rifiuto' }} di {{ code }}: puoi annullare per {{ undoSeconds }} secondi.</p>
      <AppButton compact variant="secondary" :aria-label="`Annulla ${state.action === 'confirm' ? 'la conferma' : 'il rifiuto'} di ${code}`" @click="emit('undo')">
        Annulla ({{ undoSeconds }} s)
      </AppButton>
    </template>

    <template v-else-if="state.kind === 'sending'">
      <div class="queue-meta"><span class="queue-code">{{ code }}</span></div>
      <p class="queue-sending mb-0" role="status"><span class="spin" aria-hidden="true" /> Invio…</p>
    </template>

    <!-- Expired or handled elsewhere: the card stays selectable and as tall as before. -->
    <template v-else-if="state.kind === 'closed' && closedText">
      <div class="queue-meta">
        <AppStatusChip :status="state.reason === 'expired' ? 'expired' : 'pending'">{{ closedText.chip }}</AppStatusChip>
        <span class="queue-time">{{ formatTime(item.createdAt) }}</span>
      </div>
      <p class="queue-code-row mb-0"><span class="queue-code" :aria-label="`Codice ${code}`"><span v-for="p in codeParts" :key="p">{{ p }}</span></span></p>
      <p v-if="customer" class="queue-name mb-0">{{ customer }}</p>
      <p class="mb-0">{{ closedText.text }}</p>
      <AppButton compact variant="secondary" class="mt-auto" :aria-label="`Chiudi ${code}`" @click="emit('close')">Chiudi</AppButton>
    </template>

    <template v-else>
      <div class="queue-meta">
        <AppChip v-if="isNew" variant="action">Nuova</AppChip>
        <span class="queue-time">da {{ sinceText(item.createdAt, now) }}</span>
        <AppChip v-if="leftSeconds <= 60" variant="warn" icon="clock">{{ expiryText }}</AppChip>
        <span v-else class="queue-time ms-auto">{{ expiryText }}</span>
      </div>

      <p class="queue-code-row mb-0"><span class="queue-code" :aria-label="`Codice ${code}`"><span v-for="p in codeParts" :key="p">{{ p }}</span></span></p>
      <p class="queue-name mb-0" :class="{ 'is-missing': !customer }">{{ customer ?? 'Nome non indicato' }}</p>

      <div class="queue-chips">
        <template v-if="full">
          <AppChip variant="prize" icon="gift-fill">Premio</AppChip>
          <strong>Consegna: premio</strong>
        </template>
        <AppChip v-if="item.promotionChanged" variant="neutral" icon="arrow-clockwise">Nuova promozione: la card riparte da zero</AppChip>
      </div>
      <p class="mb-0 text-body-secondary">{{ item.stampsCount }} / {{ item.stampsRequired }} timbri<template v-if="full"> · card piena</template></p>

      <div class="stepper" role="group" :aria-label="`Prodotti consumati per ${code}, premio compreso`">
        <AppIconButton icon="minus" :label="`Un prodotto in meno per ${code}`" :limited="(quantity ?? MAX_PRODUCTS) <= MIN_PRODUCTS" @click="step(-1)" />
        <div class="quantity">
          <input
            :id="`qty-${item.requestId}`"
            ref="input"
            class="form-control quantity-input"
            :class="{ 'is-invalid': touched && !!quantityProblem }"
            type="number"
            inputmode="numeric"
            :min="MIN_PRODUCTS"
            :max="MAX_PRODUCTS"
            step="1"
            :aria-label="`Numero di prodotti per ${code}`"
            :aria-invalid="touched && !!quantityProblem"
            :aria-describedby="`qty-msg-${item.requestId}`"
            :value="inputText"
            @input="type($event.target as HTMLInputElement)"
            @change="leaveField"
            @blur="leaveField"
          />
          <span class="text-body-secondary">{{ quantity === 1 ? 'prodotto' : 'prodotti' }}</span>
        </div>
        <AppIconButton icon="plus" :label="`Un prodotto in più per ${code}`" :limited="(quantity ?? MIN_PRODUCTS) >= MAX_PRODUCTS" @click="step(1)" />
      </div>

      <!-- Reserved row (2 lines): hint, high-quantity warning, invalid-quantity or action error take the same place. -->
      <p :id="`qty-msg-${item.requestId}`" class="queue-msg" :class="`is-${message.kind}`" :role="message.kind === 'hint' || message.kind === 'high' ? undefined : 'alert'">
        <AppIcon v-if="message.kind === 'error' || message.kind === 'problem'" name="warning-circle-fill" :size="18" />
        <AppIcon v-else-if="message.kind === 'high'" name="warning-fill" :size="18" />
        <span>{{ message.text }}</span>
      </p>

      <div class="queue-actions">
        <AppButton compact icon="check" :aria-label="`Conferma ${code}`" @click="tapConfirm">Conferma</AppButton>
        <AppButton compact variant="danger-outline" :aria-label="`Rifiuta ${code}`" @click="emit('reject')">Rifiuta</AppButton>
      </div>
    </template>
  </article>
</template>

<style scoped>
.queue-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  overflow-anchor: auto;
}
.queue-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2rem;
  font-size: 0.8125rem;
}
.queue-time {
  color: var(--app-text-2);
  font-size: 0.8125rem;
}
.queue-code-row {
  line-height: 1.1;
}
/* The code is what staff compares with the customer's phone: big, Unbounded, one tap selects it all (copy has no dash). */
.queue-code {
  font-family: "Unbounded", system-ui, sans-serif;
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  user-select: all;
}
.queue-code > span + span::before {
  content: "-";
  padding: 0 0.1em;
  color: var(--app-text-2);
}
.queue-code-sm {
  font-family: "Unbounded", system-ui, sans-serif;
  font-weight: 700;
  font-size: 0.875rem;
  user-select: all;
}
.queue-name {
  font-weight: 700;
  overflow-wrap: anywhere;
}
.queue-name.is-missing {
  font-weight: 500;
  color: var(--app-text-2);
}
.queue-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.queue-chips:empty {
  display: none;
}
.stepper {
  display: grid;
  grid-template-columns: 2.75rem 1fr 2.75rem;
  align-items: center;
  gap: 0.5rem;
}
.quantity {
  text-align: center;
}
.quantity-input {
  font-family: "Unbounded", system-ui, sans-serif;
  font-size: 1.375rem;
  font-weight: 700;
  text-align: center;
  padding: 0.25rem;
  -moz-appearance: textfield;
  appearance: textfield;
}
.quantity-input::-webkit-outer-spin-button,
.quantity-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.quantity span {
  display: block;
  font-size: 0.875rem;
}
/* Two lines reserved: a message appears in place of the hint and never moves the buttons below. */
.queue-msg {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  min-height: 2.5rem;
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.35;
  color: var(--app-text-2);
}
.queue-msg .app-icon {
  flex: none;
  margin-top: 1px;
}
.queue-msg.is-problem,
.queue-msg.is-error {
  color: var(--app-danger);
  font-weight: 600;
}
.queue-msg.is-high {
  color: var(--app-warn-tt);
  font-weight: 700;
}
/* Conferma, then Rifiuta 16 px below (21 §4.11). */
.queue-actions {
  display: grid;
  gap: 1rem;
}
.queue-sending {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
}
.undo-bar {
  display: block;
  height: 4px;
  margin-top: 0.5rem;
  background: var(--app-surface-2);
  border-radius: 2px;
  overflow: hidden;
}
.undo-bar-fill {
  display: block;
  height: 100%;
  background: var(--app-info-tt);
  transform-origin: left;
  animation: undo-drain 4s linear forwards;
}
@keyframes undo-drain {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}
/* Trial (D28): a glow on the border of a request that just arrived, twice. No movement, no sound, no vibration. */
.queue-card.is-new {
  border-color: var(--app-action);
  animation: queue-glow 1.1s ease-out 2;
}
@keyframes queue-glow {
  0% { box-shadow: 0 0 0 0 transparent; }
  40% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--app-action) 55%, transparent); }
  100% { box-shadow: 0 0 0 0 transparent; }
}
@media (prefers-reduced-motion: reduce) {
  .queue-card.is-new {
    animation: none;
    border-width: 3px;
  }
  .undo-bar {
    display: none; /* the text "Annulla (N s)" says the same */
  }
}
</style>
