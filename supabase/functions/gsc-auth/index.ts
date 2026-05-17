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
    if (!tokens.refresh_token) throw new Error('No refresh_token returned — ensure access_type=offline and prompt=consent in the OAuth URL')

    // Fetch available GSC properties for this account
    const sitesRes = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const sitesData = await sitesRes.json()
    console.log('[gsc-auth] sites response:', JSON.stringify(sitesData))

    // Surface any API-level error so the frontend can show it
    if (sitesData.error) {
      throw new Error(`Sites API: ${sitesData.error.message ?? JSON.stringify(sitesData.error)}`)
    }

    const sites: string[] = (sitesData.siteEntry ?? []).map((s: { siteUrl: string }) => s.siteUrl)

    // Upsert into Supabase (service role — bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const tokenExpiry = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString()

    const { error: upsertErr } = await supabase
      .from('jarvis_gsc_connections')
      .upsert({
        org_id,
        access_token:    tokens.access_token,
        refresh_token:   tokens.refresh_token,
        token_expiry:    tokenExpiry,
        selected_site:   sites.length === 1 ? sites[0] : null,
        available_sites: sites,
        updated_at:      new Date().toISOString(),
      }, { onConflict: 'org_id' })

    if (upsertErr) throw new Error(upsertErr.message)

    return new Response(
      JSON.stringify({ success: true, sites, selectedSite: sites.length === 1 ? sites[0] : null }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[gsc-auth]', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
