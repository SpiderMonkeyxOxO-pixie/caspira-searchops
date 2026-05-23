import { supabase } from './supabase'
import { useStore } from '@/store'

export const LOCATION_CODES: Record<string, number> = {
  us: 2840, in: 2356, gb: 2826, au: 2036,
  ca: 2124, ph: 2608, id: 2360, sg: 2702, my: 2458, nz: 2554,
}

export function isDFSReady(): boolean {
  return useStore.getState().dataForSEOKey.includes(':')
}

export function getDFSKey(): string {
  return useStore.getState().dataForSEOKey
}

// Returns task.result[0] for the first task, or null on error
export async function callDFS(
  endpoint: string,
  body: object[],
  credentials?: string,
): Promise<any> {
  const creds = credentials ?? getDFSKey()
  const { data, error } = await supabase.functions.invoke('dataforseo-proxy', {
    body: { credentials: creds, endpoint, body },
  })
  if (error) throw new Error(error.message ?? 'Proxy error')
  if (data?._httpStatus && data._httpStatus !== 200)
    throw new Error(`DataForSEO HTTP ${data._httpStatus}`)
  const task = data?.tasks?.[0]
  if (task?.status_code && task.status_code !== 20000)
    throw new Error(`DataForSEO: ${task.status_message ?? 'Unknown error'}`)
  return task?.result?.[0] ?? null
}
