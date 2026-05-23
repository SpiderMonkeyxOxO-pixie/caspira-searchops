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
      'X-Title':       'Jarvis SEO',
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
      'X-Title':       'Jarvis SEO',
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
      'X-Title':       'Jarvis SEO',
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
      'X-Title':       'Jarvis SEO',
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
