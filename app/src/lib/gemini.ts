import { useStore } from '@/store'

const MODEL = 'gemini-1.5-flash'
const BASE   = 'https://generativelanguage.googleapis.com/v1beta/models'

export function isGeminiReady() {
  return !!useStore.getState().geminiKey
}

export async function callGemini(
  system: string,
  user: string,
): Promise<string> {
  const key = useStore.getState().geminiKey
  if (!key) throw new Error('NO_GEMINI_KEY')

  const res = await fetch(`${BASE}/${MODEL}:generateContent?key=${key}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(err)
  }

  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}
