// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Inline cache (Upstash Redis — optional, graceful no-op if not configured) ─
const REDIS_URL   = Deno.env.get('UPSTASH_REDIS_REST_URL')
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')
const CACHE_ON    = !!(REDIS_URL && REDIS_TOKEN)

async function shortHash(obj: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(obj))
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0')).join('')
}
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
async function makeCacheKey(prefix: string, ...parts: unknown[]): Promise<string> {
  const h = await shortHash(parts)
  return `jarvis:${prefix}:${h}`
}
// ─────────────────────────────────────────────────────────────────────────────

const GSC_TTL = 3600 // 1 hour

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type SupabaseClient = ReturnType<typeof createClient>

async function refreshAccessToken(
  refreshToken: string,
  orgId: string,
  supabase: SupabaseClient,
): Promise<string> {
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id:     Deno.env.get('GOOGLE_CLIENT_ID')!,
    client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
    grant_type:    'refresh_token',
  })

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  })
  const data = await res.json()
  if (data.error) throw new Error('Token refresh failed: ' + (data.error_description ?? data.error))

  const expiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString()
  await supabase
    .from('jarvis_gsc_connections')
    .update({ access_token: data.access_token, token_expiry: expiry, updated_at: new Date().toISOString() })
    .eq('org_id', orgId)

  return data.access_token as string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { org_id, site_url, endpoint, params } = await req.json()

    if (!org_id || !site_url || !endpoint) {
      throw new Error('Missing required fields: org_id, site_url, endpoint')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch stored tokens
    const { data: conn, error: connErr } = await supabase
      .from('jarvis_gsc_connections')
      .select('access_token, refresh_token, token_expiry')
      .eq('org_id', org_id)
      .single()

    if (connErr || !conn) throw new Error('No GSC connection found for this org')

    // Refresh if expired (with 60s buffer)
    let token: string = conn.access_token
    if (new Date(conn.token_expiry).getTime() - 60_000 <= Date.now()) {
      token = await refreshAccessToken(conn.refresh_token, org_id, supabase)
    }

    // Check cache (searchAnalytics only)
    const cacheKey = await makeCacheKey('gsc', org_id, site_url, endpoint, params)
    if (endpoint === 'searchAnalytics') {
      const cached = await cacheGet<unknown>(cacheKey)
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: { ...cors, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
        })
      }
    }

    // Build GSC API request
    const encodedSite = encodeURIComponent(site_url)
    let url: string
    let method = 'GET'
    let bodyStr: string | undefined

    if (endpoint === 'searchAnalytics') {
      url     = `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`
      method  = 'POST'
      bodyStr = JSON.stringify(params)
    } else if (endpoint === 'sites') {
      url = 'https://www.googleapis.com/webmasters/v3/sites'
    } else if (endpoint === 'sitemaps') {
      url = `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps`
    } else {
      throw new Error('Unknown GSC endpoint: ' + endpoint)
    }

    const gscRes = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: bodyStr,
    })

    // Sitemaps: 404 or empty means no sitemaps submitted — return empty list gracefully
    if (endpoint === 'sitemaps' && gscRes.status === 404) {
      return new Response(JSON.stringify({ sitemap: [] }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const data = await gscRes.json()

    // Sitemaps: API-level error → return empty list (e.g. domain property, no sitemaps)
    if (endpoint === 'sitemaps' && data.error) {
      console.warn('[gsc-proxy] sitemaps error (returning empty):', data.error.message)
      return new Response(JSON.stringify({ sitemap: [] }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (data.error) {
      const msg = data.error.message ?? JSON.stringify(data.error)
      return new Response(
        JSON.stringify({ error: msg }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Cache searchAnalytics responses
    if (endpoint === 'searchAnalytics') {
      await cacheSet(cacheKey, data, GSC_TTL)
    }

    return new Response(JSON.stringify(data), {
      headers: { ...cors, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[gsc-proxy]', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
