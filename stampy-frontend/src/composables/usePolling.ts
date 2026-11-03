import { onUnmounted } from 'vue'

/**
 * Runs `task` every `intervalMs`, waiting for each run to finish so slow responses never
 * overlap. `task` returns false to stop. Always stops when the component is unmounted.
 *
 * When the tab becomes visible again the task runs at once, so a phone coming back from
 * the lock screen does not show stale data. With `pauseWhenHidden` the task is skipped
 * while the tab is hidden (nobody is looking at it); without it, polling goes on.
 */
export function usePolling(
  task: () => Promise<boolean>,
  intervalMs: number,
  options: { pauseWhenHidden?: boolean } = {},
) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let generation = 0
  let running = false
  let inFlight = false

  function stop() {
    generation += 1
    running = false
    clearTimeout(timer)
  }

  function schedule(current: number) {
    timer = setTimeout(() => void tick(current), intervalMs)
  }

  async function tick(current: number) {
    if (current !== generation) return
    if (options.pauseWhenHidden && document.hidden) {
      schedule(current)
      return
    }
    if (inFlight) return
    inFlight = true
    let keepGoing = false
    try {
      keepGoing = await task()
    } finally {
      inFlight = false
    }
    if (current !== generation) return
    if (keepGoing) schedule(current)
    else running = false
  }

  function start() {
    stop()
    running = true
    schedule(generation)
  }

  function onVisibilityChange() {
    if (document.visibilityState !== 'visible' || !running) return
    clearTimeout(timer)
    void tick(generation)
  }

  document.addEventListener('visibilitychange', onVisibilityChange)

  onUnmounted(() => {
    stop()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { start, stop }
}
