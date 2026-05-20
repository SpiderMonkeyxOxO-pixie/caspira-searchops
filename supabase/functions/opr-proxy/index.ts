// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// ── Inline cache (Upstash Redis — optional, graceful no-op if not configured) ─
const REDIS_URL   = Deno.env.get('UPSTASH_REDIS_REST_URL')
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')
const CACHE_ON    = !!(REDIS_URL && REDIS_TOKEN)

async function cacheGet<T>(key: string): Promise<T | null> {
  if (!CACHE_ON) return null
  try {
    const res  = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    })
    const json = await res.json()
    return json.result ? JSON.parse(json.result) as T : null
  } catch { return null }
}
async function cacheSet(key: string, value: unknown, ttlSec: number): Promise<void> {
  if (!CACHE_ON) return
  try {
    await fetch(`${REDIS_URL}/pipeline`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify([['SET', key, JSON.stringify(value), 'EX', ttlSec]]),
    })
  } catch { /* best-effort */ }
}
// ─────────────────────────────────────────────────────────────────────────────

const OPR_TTL = 86400 // 24 hours — PageRank barely changes

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const { domain, apiKey } = await req.json()
    if (!domain || !apiKey) {
      return new Response(JSON.stringify({ error: 'domain and apiKey required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const cacheKey = `jarvis:opr:${domain}`
    const cached   = await cacheGet<unknown>(cacheKey)
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...cors, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      })
    }

    const res  = await fetch(
      `https://openpagerank.com/api/v1.0/getPageRank?domains[]=${encodeURIComponent(domain)}`,
      { headers: { 'API-OPR': apiKey } }
    )
    const data = await res.json()

    if (res.ok) await cacheSet(cacheKey, data, OPR_TTL)

    return new Response(JSON.stringify(data), {
      status: res.ok ? 200 : res.status,
      headers: { ...cors, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
