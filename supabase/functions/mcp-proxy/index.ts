// @ts-nocheck
// MCP client (Streamable HTTP transport, spec 2025-06-18) proxied through an
// edge function — browsers can't reliably do cross-origin SSE + custom auth
// headers to arbitrary third-party MCP servers, so this does the handshake
// server-side and returns the final JSON-RPC result to the client.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROTOCOL_VERSION = '2025-06-18'

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id?: number | string
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

// Sends one JSON-RPC message, handles both application/json and
// text/event-stream responses, returns the parsed message (or null for a
// notification that was merely accepted with 202/204).
async function sendMcp(
  url: string,
  headers: Record<string, string>,
  body: object,
): Promise<{ status: number; message: JsonRpcResponse | null; sessionId?: string }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify(body),
  })

  const sessionId = res.headers.get('Mcp-Session-Id') ?? undefined

  if (res.status === 202 || res.status === 204) {
    return { status: res.status, message: null, sessionId }
  }

  const contentType = res.headers.get('Content-Type') ?? ''

  if (contentType.includes('text/event-stream')) {
    // Read the SSE stream and take the last JSON-RPC message that carries
    // a "result" or "error" (i.e. the actual response, not an interim
    // request/notification from the server).
    const text = await res.text()
    let lastMsg: JsonRpcResponse | null = null
    for (const line of text.split('\n')) {
      if (!line.startsWith('data:')) continue
      const raw = line.slice(5).trim()
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw)
        if ('result' in parsed || 'error' in parsed) lastMsg = parsed
      } catch { /* skip malformed/partial event */ }
    }
    return { status: res.status, message: lastMsg, sessionId }
  }

  // application/json (or an error body that isn't declared as either)
  const text = await res.text()
  let parsed: JsonRpcResponse | null = null
  try { parsed = text ? JSON.parse(text) : null } catch { /* leave null */ }
  return { status: res.status, message: parsed, sessionId }
}

async function handshake(url: string, authHeader?: string) {
  const baseHeaders: Record<string, string> = authHeader ? { Authorization: authHeader } : {}

  const init = await sendMcp(url, baseHeaders, {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'caspira-searchops', version: '1.0.0' },
    },
  })

  if (init.message?.error) {
    throw new Error(`MCP initialize failed: ${init.message.error.message}`)
  }
  if (init.status >= 400) {
    throw new Error(`MCP server returned HTTP ${init.status} during initialize`)
  }

  const sessionHeaders: Record<string, string> = { ...baseHeaders, 'MCP-Protocol-Version': PROTOCOL_VERSION }
  if (init.sessionId) sessionHeaders['Mcp-Session-Id'] = init.sessionId

  // InitializedNotification — no response body expected (202/204), but some
  // servers still answer 200 with an empty/ack body; either is fine.
  await sendMcp(url, sessionHeaders, { jsonrpc: '2.0', method: 'notifications/initialized' })

  return sessionHeaders
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const { url, authHeader, action, toolName, toolArgs } = await req.json()

    if (!url || !action) {
      return new Response(JSON.stringify({ error: 'url and action are required' }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const sessionHeaders = await handshake(url, authHeader)

    if (action === 'list_tools') {
      const { message } = await sendMcp(url, sessionHeaders, {
        jsonrpc: '2.0', id: 2, method: 'tools/list', params: {},
      })
      if (message?.error) throw new Error(message.error.message)
      return new Response(JSON.stringify({ tools: message?.result?.tools ?? [] }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'call_tool') {
      if (!toolName) throw new Error('toolName is required for call_tool')
      const { message } = await sendMcp(url, sessionHeaders, {
        jsonrpc: '2.0', id: 3, method: 'tools/call',
        params: { name: toolName, arguments: toolArgs ?? {} },
      })
      if (message?.error) throw new Error(message.error.message)
      return new Response(JSON.stringify({ result: message?.result ?? null }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: `Unknown action "${action}"` }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
