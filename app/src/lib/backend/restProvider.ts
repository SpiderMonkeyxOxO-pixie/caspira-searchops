import { readBackendConfig } from './config'
import type { Filter, IAuthProvider, IDataProvider, Session, SelectOptions, SelectResult } from './types'

// Generic REST contract (documented in full in Phase C):
//   POST {baseUrl}/data/{table}/select   { columns?, filters?, order?, limit?, range?, count?, mode? }
//   POST {baseUrl}/data/{table}/insert   { rows, returning? }
//   POST {baseUrl}/data/{table}/update   { filters, patch }
//   POST {baseUrl}/data/{table}/delete   { filters }
//   POST {baseUrl}/rpc/{name}            { params }
//   POST {baseUrl}/auth/login            { email, password }              -> { session } | { error }
//   POST {baseUrl}/auth/signup           { email, password, meta }        -> { session? } | { error }
//   POST {baseUrl}/auth/logout           {}
//   POST {baseUrl}/auth/session          {}                               -> { session: Session | null }
//   POST {baseUrl}/auth/reset            { email, redirectTo }            -> {} | { error }
// Every endpoint accepts `apikey: <backendKey>` and, once authenticated,
// `Authorization: Bearer <session.accessToken>`.

const SESSION_KEY = 'jarvis-rest-session'

function baseUrl(): string {
  return readBackendConfig().url.replace(/\/$/, '')
}

function apikey(): string {
  return readBackendConfig().key
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) as Session : null
  } catch {
    return null
  }
}

let currentSession: Session | null = loadSession()
const listeners = new Set<(s: Session | null) => void>()

function setSession(s: Session | null) {
  currentSession = s
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  else localStorage.removeItem(SESSION_KEY)
  listeners.forEach(cb => cb(s))
}

async function request<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apikey(),
      ...(currentSession ? { Authorization: `Bearer ${currentSession.accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json?.error) throw new Error(json?.error ?? `HTTP ${res.status}`)
  return json as T
}

export const restDataProvider: IDataProvider = {
  async select<T>(table: string, opts: SelectOptions = {}): Promise<SelectResult<T>> {
    return request<SelectResult<T>>(`/data/${table}/select`, opts)
  },

  async insert<T>(table: string, rows: object | object[], opts: { returning?: boolean } = {}) {
    return request<{ data: T | T[] | null }>(`/data/${table}/insert`, { rows, returning: opts.returning ?? true })
  },

  async update<T>(table: string, filters: Filter[], patch: object) {
    return request<{ data: T | null }>(`/data/${table}/update`, { filters, patch })
  },

  async remove(table: string, filters: Filter[]) {
    await request(`/data/${table}/delete`, { filters })
  },

  async callProcedure<T>(name: string, params: object): Promise<T> {
    return request<T>(`/rpc/${name}`, { params })
  },
}

export const restAuthProvider: IAuthProvider = {
  async getSession() {
    try {
      const { session } = await request<{ session: Session | null }>('/auth/session', {})
      if (session) setSession(session)
      return session
    } catch {
      return currentSession
    }
  },

  onAuthStateChange(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },

  async signInWithPassword(email, password) {
    try {
      const { session } = await request<{ session: Session }>('/auth/login', { email, password })
      setSession(session)
      return {}
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Sign in failed' }
    }
  },

  async signUp(email, password, meta) {
    try {
      const { session } = await request<{ session?: Session }>('/auth/signup', { email, password, meta })
      if (session) setSession(session)
      return {}
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Sign up failed' }
    }
  },

  async signOut() {
    try { await request('/auth/logout', {}) } catch { /* best-effort */ }
    setSession(null)
  },

  async resetPasswordForEmail(email, opts) {
    try {
      await request('/auth/reset', { email, redirectTo: opts.redirectTo })
      return {}
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Reset failed' }
    }
  },
}
