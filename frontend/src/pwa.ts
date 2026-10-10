import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

// A new version waits until the players choose "Uppdatera" on Setup. Reloading on its own
// would wipe a game in progress, which lives only in memory.
let updateWaiting = false
const listeners = new Set<() => void>()

const updateSW = registerSW({
  onNeedRefresh() {
    updateWaiting = true
    listeners.forEach((l) => l())
  },
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useUpdateAvailable(): boolean {
  return useSyncExternalStore(subscribe, () => updateWaiting)
}

/** Activates the waiting version and reloads the page. */
export function applyUpdate() {
  void updateSW(true)
}
