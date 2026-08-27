import { useStore } from '@/store'
import { supabase } from '@/lib/supabase'

const CLAUDE_MODEL = 'claude-sonnet-4-6'

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
export interface ImageAttachment { base64: string; mimeType: ImageMime }
export interface MultiTurnMessage { role: 'user' | 'assistant'; content: string }

export function isAIReady(): boolean {
  const { aiProvider, anthropicKey, openRouterKey } = useStore.getState()
  return aiProvider === 'openrouter' ? !!openRouterKey : !!anthropicKey
}

export function getActiveProvider(): 'anthropic' | 'openrouter' {
  return useStore.getState().aiProvider
}

async function callAnthropicDirect(system: string, user: string, maxTokens: number): Promise<string> {
  const key = useStore.getState().anthropicKey
  if (!key) throw new Error('NO_KEY')
  const { data, error } = await supabase.functions.invoke('claude-proxy', {
    body: {
      apiKey: key, model: CLAUDE_MODEL, system, maxTokens,
      messages: [{ role: 'user', content: user }],
    },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return (data?.content as Array<{ text?: string }>)?.map(c => c.text ?? '').join('') ?? ''
}

async function callAnthropicMultiDirect(system: string, msgs: MultiTurnMessage[], maxTokens: number): Promise<string> {
  const key = useStore.getState().anthropicKey
  if (!key) throw new Error('NO_KEY')
  const { data, error } = await supabase.functions.invoke('claude-proxy', {
    body: {
      apiKey: key, model: CLAUDE_MODEL, system, maxTokens,
      messages: msgs,
    },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return (data?.content as Array<{ text?: string }>)?.map(c => c.text ?? '').join('') ?? ''
}

async function callAnthropicWithImage(system: string, user: string, image: ImageAttachment, maxTokens: number): Promise<string> {
  const key = useStore.getState().anthropicKey
  if (!key) throw new Error('NO_KEY')
  const { data, error } = await supabase.functions.invoke('claude-proxy', {
    body: {
      apiKey: key, model: CLAUDE_MODEL, system, maxTokens,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.base64 } },
          { type: 'text', text: user },
        ],
      }],
    },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return (data?.content as Array<{ text?: string }>)?.map(c => c.text ?? '').join('') ?? ''
}

async function callAnthropicWithImageMultiDirect(
  system: string,
  history: MultiTurnMessage[],
  userText: string,
  image: ImageAttachment,
  maxTokens: number,
): Promise<string> {
  const key = useStore.getState().anthropicKey
  if (!key) throw new Error('NO_KEY')
  const historyMsgs = history.map(m => ({ role: m.role, content: m.content }))
  const finalMsg = {
    role: 'user' as const,
    content: [
      { type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.base64 } },
      { type: 'text', text: userText },
    ],
  }
  const { data, error } = await supabase.functions.invoke('claude-proxy', {
    body: {
      apiKey: key, model: CLAUDE_MODEL, system, maxTokens,
      messages: [...historyMsgs, finalMsg],
    },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return (data?.content as Array<{ text?: string }>)?.map(c => c.text ?? '').join('') ?? ''
}

async function callOpenRouterDirect(system: string, user: string, maxTokens: number): Promise<string> {
  const { openRouterKey, openRouterModel } = useStore.getState()
  if (!openRouterKey) throw new Error('NO_KEY')

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  window.location.origin,
      'X-Title':       'Caspira SearchOps',
    },
    body: JSON.stringify({
      model:      openRouterModel || 'deepseek/deepseek-chat-v3-0324:free',
      messages:   [
        { role: 'system', content: system },
        { role: 'user',   content: user   },
      ],
      max_tokens: maxTokens,
    }),
  })

  const data = await res.json()
  if (!res.ok || data.error) {
    const raw = data?.error?.message ?? `HTTP ${res.status}`
    console.error('[OpenRouter]', raw, data)
    const hint = raw.toLowerCase().includes('provider')
      ? `${raw} — try a different model in Onboarding → OpenRouter`
      : raw
    throw new Error(hint)
  }
  return data?.choices?.[0]?.message?.content ?? ''
}

async function callOpenRouterMultiDirect(system: string, msgs: MultiTurnMessage[], maxTokens: number): Promise<string> {
  const { openRouterKey, openRouterModel } = useStore.getState()
  if (!openRouterKey) throw new Error('NO_KEY')

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  window.location.origin,
      'X-Title':       'Caspira SearchOps',
    },
    body: JSON.stringify({
      model:      openRouterModel || 'deepseek/deepseek-chat-v3-0324:free',
      messages:   [
        { role: 'system', content: system },
        ...msgs.map(m => ({ role: m.role, content: m.content })),
      ],
      max_tokens: maxTokens,
    }),
  })

  const data = await res.json()
  if (!res.ok || data.error) {
    const raw = data?.error?.message ?? `HTTP ${res.status}`
    console.error('[OpenRouter]', raw, data)
    const hint = raw.toLowerCase().includes('provider')
      ? `${raw} — try a different model in Onboarding → OpenRouter`
      : raw
    throw new Error(hint)
  }
  return data?.choices?.[0]?.message?.content ?? ''
}

async function callOpenRouterWithImage(system: string, user: string, image: ImageAttachment, maxTokens: number): Promise<string> {
  const { openRouterKey, openRouterModel } = useStore.getState()
  if (!openRouterKey) throw new Error('NO_KEY')
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  window.location.origin,
      'X-Title':       'Caspira SearchOps',
    },
    body: JSON.stringify({
      model: openRouterModel || 'deepseek/deepseek-chat-v3-0324:free',
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.base64}` } },
            { type: 'text', text: user },
          ],
        },
      ],
      max_tokens: maxTokens,
    }),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    const raw = data?.error?.message ?? `HTTP ${res.status}`
    console.error('[OpenRouter vision]', raw, data)
    const hint = raw.toLowerCase().includes('vision') || raw.toLowerCase().includes('multimodal')
      ? `${raw} — switch to a vision-capable model (e.g. google/gemini-2.0-flash-001) in Settings`
      : raw
    throw new Error(hint)
  }
  return data?.choices?.[0]?.message?.content ?? ''
}

async function callOpenRouterWithImageMultiDirect(
  system: string,
  history: MultiTurnMessage[],
  userText: string,
  image: ImageAttachment,
  maxTokens: number,
): Promise<string> {
  const { openRouterKey, openRouterModel } = useStore.getState()
  if (!openRouterKey) throw new Error('NO_KEY')
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  window.location.origin,
      'X-Title':       'Caspira SearchOps',
    },
    body: JSON.stringify({
      model: openRouterModel || 'deepseek/deepseek-chat-v3-0324:free',
      messages: [
        { role: 'system', content: system },
        ...history.map(m => ({ role: m.role, content: m.content })),
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.base64}` } },
            { type: 'text', text: userText },
          ],
        },
      ],
      max_tokens: maxTokens,
    }),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    const raw = data?.error?.message ?? `HTTP ${res.status}`
    console.error('[OpenRouter vision]', raw, data)
    const hint = raw.toLowerCase().includes('vision') || raw.toLowerCase().includes('multimodal')
      ? `${raw} — switch to a vision-capable model (e.g. google/gemini-2.0-flash-001) in Settings`
      : raw
    throw new Error(hint)
  }
  return data?.choices?.[0]?.message?.content ?? ''
}

export async function callAI(system: string, user: string, maxTokens = 1000): Promise<string> {
  const provider = useStore.getState().aiProvider
  if (provider === 'openrouter') return callOpenRouterDirect(system, user, maxTokens)
  return callAnthropicDirect(system, user, maxTokens)
}

export async function callAIMulti(system: string, msgs: MultiTurnMessage[], maxTokens = 1000): Promise<string> {
  const provider = useStore.getState().aiProvider
  if (provider === 'openrouter') return callOpenRouterMultiDirect(system, msgs, maxTokens)
  return callAnthropicMultiDirect(system, msgs, maxTokens)
}

export async function callAIWithImage(system: string, user: string, image: ImageAttachment, maxTokens = 1500): Promise<string> {
  const provider = useStore.getState().aiProvider
  if (provider === 'openrouter') return callOpenRouterWithImage(system, user, image, maxTokens)
  return callAnthropicWithImage(system, user, image, maxTokens)
}

export async function callAIWithImageMulti(
  system: string,
  history: MultiTurnMessage[],
  userText: string,
  image: ImageAttachment,
  maxTokens = 1500,
): Promise<string> {
  const provider = useStore.getState().aiProvider
  if (provider === 'openrouter') return callOpenRouterWithImageMultiDirect(system, history, userText, image, maxTokens)
  return callAnthropicWithImageMultiDirect(system, history, userText, image, maxTokens)
}

export async function callClaude(system: string, user: string, maxTokens = 1000): Promise<string> {
  return callAI(system, user, maxTokens)
}

// ── Streaming ─────────────────────────────────────────────────────────────────

export type StopReason = 'end_turn' | 'max_tokens'

async function streamAnthropicDirect(
  system: string, msgs: MultiTurnMessage[], onChunk: (t: string) => void, maxTokens: number
): Promise<StopReason> {
  const key = useStore.getState().anthropicKey
  if (!key) throw new Error('NO_KEY')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: CLAUDE_MODEL, system, messages: msgs, max_tokens: maxTokens, stream: true }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e?.error?.message ?? `HTTP ${res.status}`)
  }
  const reader  = res.body!.getReader()
  const decoder = new TextDecoder()
  let stop: StopReason = 'end_turn'
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const d = line.slice(6).trim()
      if (d === '[DONE]') continue
      try {
        const j = JSON.parse(d)
        if (j.type === 'content_block_delta' && j.delta?.type === 'text_delta') onChunk(j.delta.text)
        if (j.type === 'message_delta' && j.delta?.stop_reason === 'max_tokens') stop = 'max_tokens'
      } catch { /* partial JSON */ }
    }
  }
  return stop
}

async function streamOpenRouterDirect(
  system: string, msgs: MultiTurnMessage[], onChunk: (t: string) => void, maxTokens: number
): Promise<StopReason> {
  const { openRouterKey, openRouterModel } = useStore.getState()
  if (!openRouterKey) throw new Error('NO_KEY')
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Caspira SearchOps',
    },
    body: JSON.stringify({
      model: openRouterModel || 'deepseek/deepseek-chat-v3-0324:free',
      messages: [{ role: 'system', content: system }, ...msgs.map(m => ({ role: m.role, content: m.content }))],
      max_tokens: maxTokens,
      stream: true,
    }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e?.error?.message ?? `HTTP ${res.status}`)
  }
  const reader  = res.body!.getReader()
  const decoder = new TextDecoder()
  let stop: StopReason = 'end_turn'
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const d = line.slice(6).trim()
      if (d === '[DONE]') continue
      try {
        const j = JSON.parse(d)
        const text = j.choices?.[0]?.delta?.content
        if (text) onChunk(text)
        if (j.choices?.[0]?.finish_reason === 'length') stop = 'max_tokens'
      } catch { /* partial JSON */ }
    }
  }
  return stop
}

export async function streamAIMulti(
  system: string,
  msgs: MultiTurnMessage[],
  onChunk: (t: string) => void,
  maxTokens = 8192,
): Promise<StopReason> {
  const provider = useStore.getState().aiProvider
  if (provider === 'openrouter') return streamOpenRouterDirect(system, msgs, onChunk, maxTokens)
  return streamAnthropicDirect(system, msgs, onChunk, maxTokens)
}

// ── Tool use (Anthropic only) ────────────────────────────────────────────────
// MCP-discovered tools get passed straight through — MCP's inputSchema and
// Anthropic's input_schema are both plain JSON Schema, so no translation needed
// beyond the field rename done by the caller.

export interface AnthropicTool {
  name: string
  description: string
  input_schema: { type: 'object'; properties?: Record<string, unknown>; required?: string[] }
}

export type ToolContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

export interface ToolTurnMessage { role: 'user' | 'assistant'; content: string | ToolContentBlock[] }

export interface ToolUseRequest { id: string; name: string; input: unknown }

export interface StreamWithToolsResult {
  stopReason: StopReason | 'tool_use'
  toolUses: ToolUseRequest[]
  assistantBlocks: ToolContentBlock[]
}

export function isToolUseSupported(): boolean {
  return useStore.getState().aiProvider === 'anthropic'
}

export async function streamAnthropicWithTools(
  system: string,
  msgs: ToolTurnMessage[],
  tools: AnthropicTool[],
  onChunk: (t: string) => void,
  maxTokens = 8192,
): Promise<StreamWithToolsResult> {
  const key = useStore.getState().anthropicKey
  if (!key) throw new Error('NO_KEY')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: CLAUDE_MODEL, system, messages: msgs, tools, max_tokens: maxTokens, stream: true }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e?.error?.message ?? `HTTP ${res.status}`)
  }

  const reader  = res.body!.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let stopReason: StopReason | 'tool_use' = 'end_turn'

  const blocks: ToolContentBlock[] = []
  const partialJson: Record<number, string> = {}

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const d = line.slice(6).trim()
      if (d === '[DONE]') continue
      let j: any
      try { j = JSON.parse(d) } catch { continue }

      if (j.type === 'content_block_start') {
        const idx = j.index as number
        const cb  = j.content_block
        if (cb?.type === 'tool_use') {
          blocks[idx] = { type: 'tool_use', id: cb.id, name: cb.name, input: {} }
          partialJson[idx] = ''
        } else {
          blocks[idx] = { type: 'text', text: '' }
        }
      } else if (j.type === 'content_block_delta') {
        const idx = j.index as number
        if (j.delta?.type === 'text_delta') {
          const b = blocks[idx]
          if (b?.type === 'text') b.text += j.delta.text
          onChunk(j.delta.text)
        } else if (j.delta?.type === 'input_json_delta') {
          partialJson[idx] = (partialJson[idx] ?? '') + (j.delta.partial_json ?? '')
        }
      } else if (j.type === 'content_block_stop') {
        const idx = j.index as number
        const b = blocks[idx]
        if (b?.type === 'tool_use') {
          try { b.input = partialJson[idx] ? JSON.parse(partialJson[idx]) : {} }
          catch { b.input = {} }
        }
      } else if (j.type === 'message_delta') {
        if (j.delta?.stop_reason) stopReason = j.delta.stop_reason
      }
    }
  }

  const toolUses = blocks.filter((b): b is Extract<ToolContentBlock, { type: 'tool_use' }> => b.type === 'tool_use')
    .map(b => ({ id: b.id, name: b.name, input: b.input }))

  return { stopReason, toolUses, assistantBlocks: blocks.filter(Boolean) }
}
