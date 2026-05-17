// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAccessToken(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
): Promise<string> {
  const { data: conn, error } = await supabase
    .from('jarvis_ga4_connections')
    .select('access_token, refresh_token, token_expiry')
    .eq('org_id', orgId)
    .single()

  if (error || !conn) throw new Error('GA4 not connected for this org')

  // Token still valid
  if (new Date(conn.token_expiry) > new Date(Date.now() + 60_000)) {
    return conn.access_token
  }

  // Refresh
  const params = new URLSearchParams({
    client_id:     Deno.env.get('GOOGLE_CLIENT_ID')!,
    client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
    refresh_token: conn.refresh_token,
    grant_type:    'refresh_token',
  })
  const res    = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const tokens = await res.json()
  if (tokens.error) throw new Error(`Token refresh: ${tokens.error_description ?? tokens.error}`)

  const expiry = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString()
  await supabase
    .from('jarvis_ga4_connections')
    .update({ access_token: tokens.access_token, token_expiry: expiry, updated_at: new Date().toISOString() })
    .eq('org_id', orgId)

  return tokens.access_token as string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { org_id, property_id, report } = await req.json()
    if (!org_id || !property_id || !report) {
      throw new Error('Missing required fields: org_id, property_id, report')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const accessToken = await getAccessToken(supabase, org_id)

    const apiRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/${property_id}:runReport`,
      {
        method:  'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(report),
      }
    )

    const data = await apiRes.json()
    if (data.error) throw new Error(`GA4 API: ${data.error.message ?? JSON.stringify(data.error)}`)

    return new Response(JSON.stringify(data), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ga4-proxy]', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
