// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { code, redirect_uri, org_id } = await req.json()
    if (!code || !redirect_uri || !org_id) {
      throw new Error('Missing required fields: code, redirect_uri, org_id')
    }

    // Exchange authorization code for tokens
    const tokenParams = new URLSearchParams({
      code,
      client_id:     Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      redirect_uri,
      grant_type:    'authorization_code',
    })

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    tokenParams.toString(),
    })

    const tokens = await tokenRes.json()
    if (tokens.error) throw new Error(tokens.error_description ?? tokens.error)
    if (!tokens.refresh_token) throw new Error('No refresh_token — ensure access_type=offline and prompt=consent')

    // Fetch GA4 properties via Admin API
    const summariesRes = await fetch(
      'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    )
    const summariesData = await summariesRes.json()
    console.log('[ga4-auth] account summaries:', JSON.stringify(summariesData))

    if (summariesData.error) {
      throw new Error(`Admin API: ${summariesData.error.message ?? JSON.stringify(summariesData.error)}`)
    }

    // Flatten all properties across all accounts
    const properties: { id: string; displayName: string; accountName: string }[] = []
    for (const account of summariesData.accountSummaries ?? []) {
      for (const prop of account.propertySummaries ?? []) {
        properties.push({
          id:          prop.property,      // e.g. 'properties/123456789'
          displayName: prop.displayName,
          accountName: account.displayName,
        })
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const tokenExpiry = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString()
    const selected    = properties.length === 1 ? properties[0] : null

    const { error: upsertErr } = await supabase
      .from('jarvis_ga4_connections')
      .upsert({
        org_id,
        access_token:          tokens.access_token,
        refresh_token:         tokens.refresh_token,
        token_expiry:          tokenExpiry,
        property_id:           selected?.id   ?? null,
        property_name:         selected?.displayName ?? null,
        available_properties:  properties,
        updated_at:            new Date().toISOString(),
      }, { onConflict: 'org_id' })

    if (upsertErr) throw new Error(upsertErr.message)

    return new Response(
      JSON.stringify({ success: true, properties, selectedProperty: selected }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ga4-auth]', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
