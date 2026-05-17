import { useStore } from '@/store'

const BASE = 'https://api.searchfit.ai/v1'

export function isSearchFitReady() {
  return !!useStore.getState().searchFitKey
}

function getHeaders() {
  return {
    'Authorization': `Bearer ${useStore.getState().searchFitKey}`,
    'Content-Type':  'application/json',
  }
}

export async function searchFitAudit(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/audit`, {
    method:  'POST',
    headers: getHeaders(),
    body:    JSON.stringify({ url }),
  })
  if (!res.ok) throw new Error(`SearchFit audit error: ${res.status}`)
  return res.json()
}

export async function searchFitKeywords(query: string, country = 'us'): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/keywords`, {
    method:  'POST',
    headers: getHeaders(),
    body:    JSON.stringify({ query, country }),
  })
  if (!res.ok) throw new Error(`SearchFit keywords error: ${res.status}`)
  return res.json()
}

export async function searchFitOptimize(content: string, keyword: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/optimize`, {
    method:  'POST',
    headers: getHeaders(),
    body:    JSON.stringify({ content, keyword }),
  })
  if (!res.ok) throw new Error(`SearchFit optimize error: ${res.status}`)
  return res.json()
}

export async function searchFitMarkup(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/markup`, {
    method:  'POST',
    headers: getHeaders(),
    body:    JSON.stringify({ url }),
  })
  if (!res.ok) throw new Error(`SearchFit markup error: ${res.status}`)
  return res.json()
}
