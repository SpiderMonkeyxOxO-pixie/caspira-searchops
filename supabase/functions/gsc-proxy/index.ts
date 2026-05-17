// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    } else {
      throw new Error('Unknown GSC endpoint: ' + endpoint)
    }

    const gscRes = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: bodyStr,
    })

    const data = await gscRes.json()

    if (data.error) {
      throw new Error(data.error.message ?? JSON.stringify(data.error))
    }

    return new Response(JSON.stringify(data), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[gsc-proxy]', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
