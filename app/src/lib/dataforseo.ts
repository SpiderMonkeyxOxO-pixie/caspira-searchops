import { supabase } from './supabase'
import { useStore } from '@/store'

export const LOCATION_CODES: Record<string, number> = {
  // North America
  us: 2840, ca: 2124, mx: 2484,
  // Europe
  gb: 2826, ie: 2372, de: 2276, fr: 2250, es: 2724, it: 2380, nl: 2528,
  se: 2752, no: 2578, dk: 2208, fi: 2246, ch: 2756, at: 2040, be: 2056,
  pt: 2620, pl: 2616, cz: 2203, hu: 2348, ro: 2642, gr: 2300, ua: 2804,
  ru: 2643, tr: 2792,
  // Asia
  in: 2356, id: 2360, ph: 2608, sg: 2702, my: 2458, vn: 2704, th: 2764,
  hk: 2344, tw: 2158, jp: 2392, kr: 2410, cn: 2156, pk: 2586, bd: 2050,
  lk: 2144, np: 2524, il: 2376,
  // Oceania
  au: 2036, nz: 2554,
  // South America
  br: 2076, ar: 2032, cl: 2152, co: 2170, pe: 2604,
  // Middle East & Africa
  ae: 2784, sa: 2682, za: 2710, ng: 2566, eg: 2818, ke: 2404,
}

export const COUNTRIES: { code: string; label: string }[] = [
  { code: 'us', label: 'United States' }, { code: 'ca', label: 'Canada' }, { code: 'mx', label: 'Mexico' },
  { code: 'gb', label: 'United Kingdom' }, { code: 'ie', label: 'Ireland' }, { code: 'de', label: 'Germany' },
  { code: 'fr', label: 'France' }, { code: 'es', label: 'Spain' }, { code: 'it', label: 'Italy' },
  { code: 'nl', label: 'Netherlands' }, { code: 'se', label: 'Sweden' }, { code: 'no', label: 'Norway' },
  { code: 'dk', label: 'Denmark' }, { code: 'fi', label: 'Finland' }, { code: 'ch', label: 'Switzerland' },
  { code: 'at', label: 'Austria' }, { code: 'be', label: 'Belgium' }, { code: 'pt', label: 'Portugal' },
  { code: 'pl', label: 'Poland' }, { code: 'cz', label: 'Czechia' }, { code: 'hu', label: 'Hungary' },
  { code: 'ro', label: 'Romania' }, { code: 'gr', label: 'Greece' }, { code: 'ua', label: 'Ukraine' },
  { code: 'ru', label: 'Russia' }, { code: 'tr', label: 'Turkey' },
  { code: 'in', label: 'India' }, { code: 'id', label: 'Indonesia' }, { code: 'ph', label: 'Philippines' },
  { code: 'sg', label: 'Singapore' }, { code: 'my', label: 'Malaysia' }, { code: 'vn', label: 'Vietnam' },
  { code: 'th', label: 'Thailand' }, { code: 'hk', label: 'Hong Kong' }, { code: 'tw', label: 'Taiwan' },
  { code: 'jp', label: 'Japan' }, { code: 'kr', label: 'South Korea' }, { code: 'cn', label: 'China' },
  { code: 'pk', label: 'Pakistan' }, { code: 'bd', label: 'Bangladesh' }, { code: 'lk', label: 'Sri Lanka' },
  { code: 'np', label: 'Nepal' }, { code: 'il', label: 'Israel' },
  { code: 'au', label: 'Australia' }, { code: 'nz', label: 'New Zealand' },
  { code: 'br', label: 'Brazil' }, { code: 'ar', label: 'Argentina' }, { code: 'cl', label: 'Chile' },
  { code: 'co', label: 'Colombia' }, { code: 'pe', label: 'Peru' },
  { code: 'ae', label: 'UAE' }, { code: 'sa', label: 'Saudi Arabia' }, { code: 'za', label: 'South Africa' },
  { code: 'ng', label: 'Nigeria' }, { code: 'eg', label: 'Egypt' }, { code: 'ke', label: 'Kenya' },
]

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
