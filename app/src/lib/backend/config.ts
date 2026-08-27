// Reads backend config straight from Zustand's persisted localStorage,
// same pattern as lib/supabase.ts's readKeys() — avoids a circular import
// between store/index.ts (which needs the providers) and this module
// (which would otherwise need `useStore` from '@/store').
export function readBackendConfig(): { provider: string; url: string; key: string } {
  try {
    const s = JSON.parse(localStorage.getItem('jarvis-store') ?? '{}')
    return {
      provider: (s.state?.backendProvider as string) || 'supabase',
      url:      (s.state?.backendUrl as string) || '',
      key:      (s.state?.backendKey as string) || '',
    }
  } catch {
    return { provider: 'supabase', url: '', key: '' }
  }
}
