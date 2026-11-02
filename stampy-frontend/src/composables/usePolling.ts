import { onUnmounted } from 'vue'

/**
 * Runs `task` every `intervalMs`, waiting for each run to finish so slow responses never
 * overlap. `task` returns false to stop. Always stops when the component is unmounted.
 */
export function usePolling(task: () => Promise<boolean>, intervalMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let generation = 0

  function stop() {
    generation += 1
    clearTimeout(timer)
  }

  function start() {
    stop()
    const current = generation

    const tick = async () => {
      const keepGoing = await task()
      if (keepGoing && current === generation) timer = setTimeout(tick, intervalMs)
    }

    timer = setTimeout(tick, intervalMs)
  }

  onUnmounted(stop)

  return { start, stop }
}
