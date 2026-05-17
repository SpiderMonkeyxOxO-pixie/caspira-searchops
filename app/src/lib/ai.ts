import { useStore } from '@/store'

const CLAUDE_MODEL = 'claude-sonnet-4-6'

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
export interface ImageAttachment { base64: string; mimeType: ImageMime }

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
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return (data.content as Array<{ text?: string }>)?.map(c => c.text ?? '').join('') ?? ''
}

async function callAnthropicWithImage(system: string, user: string, image: ImageAttachment, maxTokens: number): Promise<string> {
  const key = useStore.getState().anthropicKey
  if (!key) throw new Error('NO_KEY')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.base64 } },
          { type: 'text', text: user },
        ],
      }],
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return (data.content as Array<{ text?: string }>)?.map(c => c.text ?? '').join('') ?? ''
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

export async function callAI(system: string, user: string, maxTokens = 1000): Promise<string> {
  const provider = useStore.getState().aiProvider
  if (provider === 'openrouter') return callOpenRouterDirect(system, user, maxTokens)
  return callAnthropicDirect(system, user, maxTokens)
}

export async function callAIWithImage(system: string, user: string, image: ImageAttachment, maxTokens = 1500): Promise<string> {
  const provider = useStore.getState().aiProvider
  if (provider === 'openrouter') return callOpenRouterWithImage(system, user, image, maxTokens)
  return callAnthropicWithImage(system, user, image, maxTokens)
}

// Backward-compat alias
export async function callClaude(system: string, user: string, maxTokens = 1000): Promise<string> {
  return callAI(system, user, maxTokens)
}
