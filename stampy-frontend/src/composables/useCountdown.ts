import { onUnmounted, ref } from 'vue'

/** Seconds left of a server-imposed wait (`retryAfterSeconds`). */
export function useCountdown() {
  const remaining = ref(0)
  let timer: ReturnType<typeof setInterval> | undefined

  function stop() {
    clearInterval(timer)
    timer = undefined
  }

  function start(seconds: number) {
    stop()
    remaining.value = seconds
    timer = setInterval(() => {
      remaining.value -= 1
      if (remaining.value <= 0) {
        remaining.value = 0
        stop()
      }
    }, 1000)
  }

  onUnmounted(stop)

  return { remaining, start }
}
