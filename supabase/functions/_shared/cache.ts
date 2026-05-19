// @ts-nocheck
// Upstash Redis cache — set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// in Supabase secrets. If not set, all functions work normally (no caching).

const REDIS_URL   = Deno.env.get('UPSTASH_REDIS_REST_URL')
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')
const ENABLED     = !!(REDIS_URL && REDIS_TOKEN)

async function shortHash(obj: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(obj))
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!ENABLED) return null
  try {
    const res  = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    })
    const json = await res.json()
    return json.result ? JSON.parse(json.result) as T : null
  } catch { return null }
}

export async function cacheSet(key: string, value: unknown, ttlSec: number): Promise<void> {
  if (!ENABLED) return
  try {
    await fetch(`${REDIS_URL}/pipeline`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify([['SET', key, JSON.stringify(value), 'EX', ttlSec]]),
    })
  } catch { /* best-effort */ }
}

export async function makeCacheKey(prefix: string, ...parts: unknown[]): Promise<string> {
  const h = await shortHash(parts)
  return `jarvis:${prefix}:${h}`
}
