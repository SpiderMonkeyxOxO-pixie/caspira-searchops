import { createClient } from '@supabase/supabase-js'

// Read backend config from Zustand's persisted localStorage (user-configured via Settings UI).
// Falls back to build-time env vars so local dev still works without UI setup.
function readKeys(): { url: string; key: string } {
  try {
    const s = JSON.parse(localStorage.getItem('jarvis-store') ?? '{}')
    return {
      url: (s.state?.backendUrl as string) || (import.meta.env.VITE_SUPABASE_URL as string) || '',
      key: (s.state?.backendKey as string) || (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',
    }
  } catch {
    return {
      url: (import.meta.env.VITE_SUPABASE_URL as string) || '',
      key: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',
    }
  }
}

const { url, key } = readKeys()

// Handle GSC OAuth callback BEFORE createClient so detectSessionInUrl never sees our Google code.
// Works for both popup (relay + close) and redirect fallback (stash in sessionStorage + clean URL).
;(() => {
  const params = new URLSearchParams(window.location.search)
  const code   = params.get('code')
  const state  = params.get('state')
  if (!code) return

  if (window.opener && window.opener !== window) {
    // Popup flow: relay to parent window and close
    window.opener.postMessage({ type: 'jarvis-oauth-callback', code, state }, window.location.origin)
    window.close()
    return
  }

  // Redirect fallback: check which service owns this state, stash code accordingly
  const gscState = sessionStorage.getItem('gsc_oauth_state')
  const ga4State = sessionStorage.getItem('ga4_oauth_state')
  if (state && state === gscState) {
    sessionStorage.setItem('gsc_pending_code', code)
  } else if (state && state === ga4State) {
    sessionStorage.setItem('ga4_pending_code', code)
  }

  // Always clean ?code= / ?state= / ?iss= from the URL so detectSessionInUrl ignores them
  const clean = new URL(window.location.href)
  clean.searchParams.delete('code')
  clean.searchParams.delete('state')
  clean.searchParams.delete('iss')
  const search = clean.searchParams.toString()
  window.history.replaceState({}, '', clean.pathname + (search ? '?' + search : ''))
})()

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
