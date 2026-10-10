import { useSyncExternalStore } from 'react'

const KEY = 'impostor.token'
const listeners = new Set<() => void>()

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(KEY, token)
  } catch {
    /* storage unavailable: the user stays logged out */
  }
  listeners.forEach((l) => l())
}

export function clearToken() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

export function useAuth() {
  const token = useSyncExternalStore(subscribe, getToken, () => null)
  return { token, isLoggedIn: token !== null, login: setToken, logout: clearToken }
}
