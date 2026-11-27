<script setup lang="ts">
// Text field (21 §4.2, pattern 5.1). The message row is RESERVED (2 lines), so an error appears in place of the hint
// without moving the button below. Only a wrong value is an `error`: network/5xx/429 go in an AppAlert and leave the
// field neutral. Extra attributes (type, inputmode, autocomplete, maxlength…) go to the <input>.
import { computed, ref, useId } from 'vue'
import AppIcon from './AppIcon.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  label: string
  hint?: string
  /** Message for an invalid value. Replaces the hint. */
  error?: string
  /** Invalid look and aria-invalid without a message of its own (the message sits under a group of fields). */
  invalid?: boolean
  /** Read only while working (grey fill, text not faded). */
  busy?: boolean
  /** Dead code: dashed border, grey fill (not opacity). */
  dead?: boolean
  /** Big centered code field (Unbounded 28). */
  code?: boolean
  /** Do not reserve the message row (fields without hint, in a tight row). */
  noReserve?: boolean
  id?: string
}>()
const model = defineModel<string>({ default: '' })

const autoId = useId()
const inputId = computed(() => props.id ?? `f-${autoId}`)
const messageId = computed(() => `${inputId.value}-msg`)
const hasMessage = computed(() => !!props.error || !!props.hint)
const isInvalid = computed(() => !!props.error || !!props.invalid)

const input = ref<HTMLInputElement | null>(null)
defineExpose({ focus: () => input.value?.focus(), el: input })
</script>

<template>
  <div class="app-field">
    <label :for="inputId" class="form-label">{{ label }}</label>
    <div class="app-field-control" :class="{ 'is-invalid-field': isInvalid }">
      <input
        v-bind="$attrs"
        :id="inputId"
        ref="input"
        v-model="model"
        class="form-control"
        :class="{ 'form-control-code': code, 'is-busy': busy, 'is-dead': dead, 'is-invalid': isInvalid }"
        :readonly="busy || dead || undefined"
        :aria-invalid="isInvalid ? 'true' : undefined"
        :aria-describedby="hasMessage ? messageId : ($attrs['aria-describedby'] as string | undefined)"
      />
      <AppIcon v-if="isInvalid" name="warning-circle-fill" :size="22" class="app-field-icon" />
    </div>
    <div :id="messageId" class="app-field-msg" :class="{ 'is-reserved': !noReserve, 'is-error': !!error }">
      <template v-if="error">
        <AppIcon name="warning-circle-fill" :size="18" />
        <span role="alert">{{ error }}</span>
      </template>
      <template v-else-if="hint">{{ hint }}</template>
    </div>
  </div>
</template>
