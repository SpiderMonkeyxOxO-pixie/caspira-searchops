// Reads backend config straight from Zustand's persisted localStorage,
// same pattern as lib/supabase.ts's readKeys() — avoids a circular import
// between store/index.ts (which needs the providers) and this module
// (which would otherwise need `useStore` from '@/store').
//
// `url`/`key` here are the CUSTOM REST backend's address — distinct from the
// store's `backendUrl`/`backendKey`, which point the Supabase client itself
// (auth + edge functions) at a self-hosted project and stay in effect even
// when provider is 'custom', since edge-function-backed features (GSC, GA4,
// crawler, invites, Bing, WordPress MCP) are always Supabase-only.
export function readBackendConfig(): { provider: string; url: string; key: string } {
  try {
    const s = JSON.parse(localStorage.getItem('jarvis-store') ?? '{}')
    return {
      provider: (s.state?.backendProvider as string) || 'supabase',
      url:      (s.state?.customBackendUrl as string) || '',
      key:      (s.state?.customBackendKey as string) || '',
    }
  } catch {
    return { provider: 'supabase', url: '', key: '' }
  }
}
