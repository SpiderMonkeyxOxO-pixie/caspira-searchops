import { supabase } from './supabase'
import { useStore } from '@/store'

export function isBingReady(): boolean {
  return useStore.getState().bingKey.trim().length > 0
}

export function getBingKey(): string {
  return useStore.getState().bingKey
}

// Bing wraps every JSON payload as { d: [...] } and dates as "/Date(epochMs)/"
export function parseBingDate(s: string): string {
  const m = /\/Date\((\d+)/.exec(s)
  if (!m) return s
  return new Date(Number(m[1])).toISOString().slice(0, 10)
}

// Normalises a bare domain into the "https://example.com/" shape Bing's siteUrl param expects
export function toBingSiteUrl(domainOrUrl: string): string {
  let u = domainOrUrl.trim()
  if (!u) return ''
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  if (!u.endsWith('/')) u += '/'
  return u
}

export async function callBing<T = unknown>(
  method: string,
  params: Record<string, string> = {},
  apikey?: string,
): Promise<T> {
  const key = apikey ?? getBingKey()
  if (!key) throw new Error('No Bing Webmaster API key configured')

  const { data, error } = await supabase.functions.invoke('bing-proxy', {
    body: { apikey: key, method, params },
  })
  if (error) throw new Error(error.message ?? 'Proxy error')
  if (data?.ErrorCode) throw new Error(`Bing: ${data.Message ?? `Error ${data.ErrorCode}`}`)
  if (data?._httpStatus && data._httpStatus >= 400)
    throw new Error(data?.Message ?? `Bing HTTP ${data._httpStatus}`)
  return (data?.d ?? data) as T
}
