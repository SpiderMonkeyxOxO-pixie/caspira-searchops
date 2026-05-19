import { useStore } from '@/store'

const EXHAUSTED_STORAGE = 'jarvis_serper_exhausted'
const RESET_MS          = 24 * 60 * 60 * 1_000  // reset exhausted keys after 24 h

interface Exhausted { keys: string[]; timestamp: number }

function getExhausted(): Set<string> {
  try {
    const raw = localStorage.getItem(EXHAUSTED_STORAGE)
    if (!raw) return new Set()
    const { keys, timestamp } = JSON.parse(raw) as Exhausted
    if (Date.now() - timestamp > RESET_MS) {
      localStorage.removeItem(EXHAUSTED_STORAGE)
      return new Set()
    }
    return new Set(keys)
  } catch { return new Set() }
}

function markExhausted(key: string) {
  const exhausted = getExhausted()
  exhausted.add(key)
  localStorage.setItem(EXHAUSTED_STORAGE, JSON.stringify({
    keys:      [...exhausted],
    timestamp: Date.now(),
  }))
}

export function getSerperKeys(): string[] {
  const stored = useStore.getState().serperKeys
  return stored.split(/[\n,|]/).map(k => k.trim()).filter(Boolean)
}

export function isSerperReady() {
  return getSerperKeys().length > 0
}

export function getSerperStatus(): { total: number; active: number; exhausted: number; exhaustedKeys: Set<string> } {
  const all           = getSerperKeys()
  const dead          = getExhausted()
  const exhaustedCount = all.filter(k => dead.has(k)).length
  return { total: all.length, active: all.length - exhaustedCount, exhausted: exhaustedCount, exhaustedKeys: dead }
}

export async function callSerper(
  query: string,
  params: Record<string, string | number> = {},
): Promise<Record<string, unknown>> {
  const keys     = getSerperKeys()
  if (keys.length === 0) throw new Error('NO_SERPER_KEY')

  const dead      = getExhausted()
  const available = keys.filter(k => !dead.has(k))
  if (available.length === 0) {
    throw new Error('All Serper API keys are exhausted. Add more keys or wait 24 h for auto-reset.')
  }

  for (const key of available) {
    const res = await fetch('https://google.serper.dev/search', {
      method:  'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ q: query, ...params }),
    })

    // 402 = payment required (credits gone) | 429 = rate limit
    if (res.status === 402 || res.status === 429) {
      markExhausted(key)
      console.warn(`[Serper] Key ...${key.slice(-6)} exhausted — rotating to next key`)
      continue
    }

    if (!res.ok) throw new Error(`Serper error ${res.status}: ${await res.text()}`)

    return await res.json() as Record<string, unknown>
  }

  throw new Error('All Serper API keys are exhausted. Add more keys or wait 24 h for auto-reset.')
}

export function resetExhaustedKeys() {
  localStorage.removeItem(EXHAUSTED_STORAGE)
}
