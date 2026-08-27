// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BASE = 'https://ssl.bing.com/webmaster/api.svc/json'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const { apikey, method, params } = await req.json()

    if (!apikey || !method) {
      return new Response(JSON.stringify({ error: 'apikey and method required' }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const qs = new URLSearchParams({ apikey, ...(params ?? {}) })
    const res = await fetch(`${BASE}/${method}?${qs.toString()}`)
    const text = await res.text()

    let data: unknown
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    // Always return 200 so supabase.functions.invoke gives us the body.
    // Callers inspect _httpStatus / data.ErrorCode / data.Message for Bing-level errors.
    return new Response(JSON.stringify({ _httpStatus: res.status, ...data }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
