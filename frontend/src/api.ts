import { clearToken, getToken } from './auth'
import type { ApiPlayer, Category, Stats, WordResult } from './types'
import type { GameSummary } from './game'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let res: Response
  try {
    res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError(0, 'Kunde inte nå servern')
  }
  if (!res.ok) {
    let detail = ''
    try {
      const data = await res.json()
      if (typeof data?.detail === 'string') detail = data.detail
    } catch {
      /* no JSON body */
    }
    // A rejected token on an authenticated call means the login is stale.
    if (res.status === 401 && token && path.startsWith('/api/me')) clearToken()
    throw new ApiError(res.status, detail || `HTTP ${res.status}`)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

export const getCategories = () => request<Category[]>('GET', '/api/categories')

export function getRandomWord(categoryIds: number[]) {
  const qs = categoryIds.map((id) => `category_id=${id}`).join('&')
  return request<WordResult>('GET', `/api/words/random${qs ? `?${qs}` : ''}`)
}

export type AuthResult = { token: string; player: ApiPlayer }

export const register = (username: string, password: string) =>
  request<AuthResult>('POST', '/api/auth/register', { username, password })

export const login = (username: string, password: string) =>
  request<AuthResult>('POST', '/api/auth/login', { username, password })

export const getMe = () => request<{ player: ApiPlayer; stats: Stats }>('GET', '/api/me')

export const patchMe = (changes: { avatar_emoji?: string; avatar_color?: string }) =>
  request<ApiPlayer>('PATCH', '/api/me', changes)

export const createJoinToken = () => request<{ token: string; expires_at: string }>('POST', '/api/join-tokens')

export const redeemJoinToken = (token: string) =>
  request<{ player: ApiPlayer; participant_token: string }>('POST', '/api/join-tokens/redeem', { token })

export const saveGame = (summary: GameSummary) => request<{ id: number }>('POST', '/api/games', summary)
