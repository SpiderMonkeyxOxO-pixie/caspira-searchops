// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const { credentials, endpoint, body } = await req.json()

    if (!credentials || !endpoint) {
      return new Response(JSON.stringify({ error: 'credentials and endpoint required' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const colonIdx = credentials.indexOf(':')
    if (colonIdx === -1) {
      return new Response(JSON.stringify({ error: 'credentials must be login:password format' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const login    = credentials.slice(0, colonIdx)
    const password = credentials.slice(colonIdx + 1)

    const res = await fetch(`https://api.dataforseo.com/v3/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${login}:${password}`),
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body ?? [{}]),
    })

    const data = await res.json()

    // Always return 200 so supabase.functions.invoke gives us the body.
    // Callers inspect data.tasks[0].status_message for DataForSEO-level errors.
    return new Response(JSON.stringify({ _httpStatus: res.status, ...data }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
