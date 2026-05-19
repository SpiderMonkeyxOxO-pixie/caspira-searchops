// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { cacheGet, cacheSet } from '../_shared/cache.ts'

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
  