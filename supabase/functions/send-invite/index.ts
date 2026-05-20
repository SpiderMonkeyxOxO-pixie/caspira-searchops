// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const { email, token, orgName, appUrl } = await req.json()
    if (!email || !token) {
      return new Response(JSON.stringify({ error: 'email and token are required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // APP_URL secret takes priority — set it in Supabase Dashboard → Edge Functions → Secrets
    // so invite emails always point to production even when admins are on localhost
    const canonicalUrl = Deno.env.get('APP_URL') || appUrl
    if (!canonicalUrl) {
      return new Response(JSON.stringify({ error: 'APP_URL secret not set and appUrl not provided' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const redirectTo = `${canonicalUrl}?invite_token=${token}`

    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { org_name: orgName },
    })

    if (error) throw new Error(error.message)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
