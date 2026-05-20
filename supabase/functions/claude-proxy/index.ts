// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { apiKey, model = 'claude-sonnet-4-6', system, messages, maxTokens = 1000 } = await req.json()

    if (!apiKey)                          throw new Error('Missing apiKey')
    if (!Array.isArray(messages))         throw new Error('Missing messages array')

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      throw new Error(data?.error?.message ?? `HTTP ${res.status}`)
    }

    return new Response(JSON.stringify(data), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[claude-proxy]', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
