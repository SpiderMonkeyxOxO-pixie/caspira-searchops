import { lazy, Suspense, useEffect, useRef, Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { SlidersHorizontal, Loader2 } from 'lucide-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar }  from '@/components/layout/TopBar'
import { JarvisWidget } from '@/components/layout/JarvisWidget'
import { SectionGuide } from '@/components/ui/SectionGuide'
import { AuthPage } from '@/components/auth/AuthPage'
import { OrgCreateWizard } from '@/components/auth/OrgCreateWizard'
import { useStore } from '@/store'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { NavSection } from '@/types'
import type { Organization, OrgRole, OrgInvite } from '@/types/supabase'

const load = <T extends React.ComponentType>(
  fn: () => Promise<{ [k: string]: T }>
) => lazy(() => fn().then(m => ({ default: Object.values(m)[0] as T })))

// Each section is a separate JS chunk — loaded on first visit only
const Dashboard     = load(() => import('@/components/sections/Dashboard'))
const JarvisAI      = load(() => import('@/components/sections/JarvisAI'))
const RankTracker   = load(() => import('@/components/sections/RankTracker'))
const SiteAnalyzer  = load(() => import('@/components/sections/SiteAnalyzer'))
const Keywords      = load(() => import('@/components/sections/Keywords'))
const Competitors   = load(() => import('@/components/sections/Competitors'))
const ContentPlan   = load(() => import('@/components/sections/ContentPlan'))
const Technical     = load(() => import('@/components/sections/Technical'))
const Backlinks     = load(() => import('@/components/sections/Backlinks'))
const Roadmap       = load(() => import('@/components/sections/Roadmap'))
const Roaster       = load(() => import('@/components/sections/Roaster'))
const Clustering    = load(() => import('@/components/sections/Clustering'))
const BulkMeta      = load(() => import('@/components/sections/BulkMeta'))
const ContentGap    = load(() => import('@/components/sections/ContentGap'))
const EEATAudit     = load(() => import('@/components/sections/EEATAudit'))
const SchemaBuilder = load(() => import('@/components/sections/SchemaBuilder'))
const SerpFeatures  = load(() => import('@/components/sections/SerpFeatures'))
const LinkMap       = load(() => import('@/components/sections/LinkMap'))
const Scheduler     = load(() => import('@/components/sections/Scheduler'))
const CaseStudy     = load(() => import('@/components/sections/CaseStudy'))
const GSC           = load(() => import('@/components/sections/GSC'))
const GA4           = load(() => import('@/components/sections/GA4'))
const ApiSync       = load(() => import('@/components/sections/ApiSync'))
const CrawlImport   = load(() => import('@/components/sections/CrawlImport'))
const CrossView     = load(() => import('@/components/sections/CrossView'))
const ArticleWriter  = load(() => import('@/components/sections/ArticleWriter'))
const ContentGrader  = load(() => import('@/components/sections/ContentGrader'))
const AutoRefresh    = load(() => import('@/components/sections/AutoRefresh'))
const TopicalMap     = load(() => import('@/components/sections/TopicalMap'))
const SerpSimulator  = load(() => import('@/components/sections/SerpSimulator'))
const ContentSpy     = load(() => import('@/components/sections/ContentSpy'))
const FAQGenerator      = load(() => import('@/components/sections/FAQGenerator'))
const RedirectManager   = load(() => import('@/components/sections/RedirectManager'))
const LogAnalyzer       = load(() => import('@/components/sections/LogAnalyzer'))
const HreflangBuilder   = load(() => import('@/components/sections/HreflangBuilder'))
const RobotsTxt         = load(() => import('@/components/sections/RobotsTxt'))
const SitemapGenerator  = load(() => import('@/components/sections/SitemapGenerator'))
const JSSeo             = load(() => import('@/components/sections/JSSeo'))
const ContentCalendar   = load(() => import('@/components/sections/ContentCalendar'))
const SocialSnippets    = load(() => import('@/components/sections/SocialSnippets'))
const ImageBuilder      = load(() => import('@/components/sections/ImageBuilder'))
const ContentPipeline   = load(() => import('@/components/sections/ContentPipeline'))
const LinkSuggester     = load(() => import('@/components/sections/LinkSuggester'))
const ThemeSettings     = load(() => import('@/components/sections/ThemeSettings'))
const KeyboardShortcuts = load(() => import('@/components/sections/KeyboardShortcuts'))
const ShareableLinks    = load(() => import('@/components/sections/ShareableLinks'))
const Onboarding        = load(() => import('@/components/sections/Onboarding'))
const APIAccess         = load(() => import('@/components/sections/APIAccess'))
const WordPressSites    = load(() => import('@/components/sections/WordPressSites'))
const AgencyDashboard    = load(() => import('@/components/sections/AgencyDashboard'))
const OutrankBlueprint   = load(() => import('@/components/sections/OutrankBlueprint'))
const SitesManager       = load(() => import('@/components/sections/SitesManager'))
const SiteExplorer       = load(() => import('@/components/sections/SiteExplorer'))
const KeywordExplorer    = load(() => import('@/components/sections/KeywordExplorer'))
const AnswerThePublic    = load(() => import('@/components/sections/AnswerThePublic'))
const UpdateSERP         = load(() => import('@/components/sections/UpdateSERP'))
const IntentAnalyzer     = load(() => import('@/components/sections/IntentAnalyzer'))
const AIVisibility       = load(() => import('@/components/sections/AIVisibility'))
const TeamManagement     = load(() => import('@/components/sections/TeamManagement'))
const SEONews            = load(() => import('@/components/sections/SEONews'))

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
})

const SECTION_MAP: Partial<Record<NavSection, React.LazyExoticComponent<React.ComponentType>>> = {
  dashboard:  Dashboard,
  jarvis:     JarvisAI,
  tracker:    RankTracker,
  analyzer:   SiteAnalyzer,
  keywords:   Keywords,
  competitors:Competitors,
  content:    ContentPlan,
  technical:  Technical,
  backlinks:   Backlinks,
  roadmap:     Roadmap,
  roaster:     Roaster,
  clustering:  Clustering,
  bulkmeta:    BulkMeta,
  gapcontent:   ContentGap,
  eeat:         EEATAudit,
  schema:       SchemaBuilder,
  serpfeatures: SerpFeatures,
  linkmap:      LinkMap,
  scheduler:    Scheduler,
  casestudy:    CaseStudy,
  gsc:          GSC,
  ga4:          GA4,
  apisync:      ApiSync,
  crawlimport:  CrawlImport,
  crossview:    CrossView,
  articlewriter: ArticleWriter,
  contentgrader: ContentGrader,
  autorefresh:   AutoRefresh,
  topicalmap:    TopicalMap,
  serpsim:       SerpSimulator,
  contentspy:    ContentSpy,
  faqgen:        FAQGenerator,
  redirectmgr:   RedirectManager,
  loganalyzer:   LogAnalyzer,
  hreflang:      HreflangBuilder,
  robotstxt:     RobotsTxt,
  sitemapgen:    SitemapGenerator,
  jsseo:         JSSeo,
  contentcal:    ContentCalendar,
  socialsnip:    SocialSnippets,
  imagebuilder:  ImageBuilder,
  pipeline:      ContentPipeline,
  linksuggester:  LinkSuggester,
  themesettings:  ThemeSettings,
  shortcuts:      KeyboardShortcuts,
  sharelinks:     ShareableLinks,
  onboarding:     Onboarding,
  apiaccess:      APIAccess,
  wordpress:      WordPressSites,
  agency:         AgencyDashboard,
  outrank:        OutrankBlueprint,
  sitesmanager:   SitesManager,
  siteexplorer:   SiteExplorer,
  kwexplorer:     KeywordExplorer,
  answerpublic:   AnswerThePublic,
  serpupdate:     UpdateSERP,
  intentanalyzer: IntentAnalyzer,
  aivisibility:   AIVisibility,
  team:           TeamManagement,
  seonews:        SEONews,
}

// ── Error boundary — catches any section crash, resets on nav ─
interface EBState { error: Error | null }
class SectionErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, EBState> {
  state: EBState = { error: null }
  static getDerivedStateFromError(error: Error): EBState { return { error } }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[SectionError]', err, info)
    // Stale chunk after a new deployment — reload once to fetch the new bundle
    if (err.message.includes('Failed to fetch dynamically imported module') ||
        err.message.includes('Importing a module script failed')) {
      window.location.reload()
    }
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }
  render() {
    if (this.state.error) {
      const isChunkError = this.state.error.message.includes('Failed to fetch dynamically imported module') ||
                           this.state.error.message.includes('Importing a module script failed')
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center px-6">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
            <SlidersHorizontal size={20} className="text-danger" />
          </div>
          <div className="font-display font-bold text-lg text-tx mb-1">
            {isChunkError ? 'New version available' : 'Something went wrong'}
          </div>
          <div className="text-xs font-mono-jarvis text-muted mb-4 max-w-md">
            {isChunkError
              ? 'A new deployment was detected. Reloading to get the latest version…'
              : this.state.error.message}
          </div>
          <button
            onClick={() => isChunkError ? window.location.reload() : this.setState({ error: null })}
            className="px-4 py-2 rounded-lg bg-accent text-black text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity">
            {isChunkError ? 'Reload now' : 'Try again'}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function SectionFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex gap-1">
        {[0,1,2].map(i => (
          <span key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce"
            style={{ animationDelay:`${i*120}ms` }} />
        ))}
      </div>
    </div>
  )
}

function SectionContent() {
  const { activeSection } = useStore()
  const Section = SECTION_MAP[activeSection]

  return (
    <SectionErrorBoundary resetKey={activeSection}>
      <Suspense fallback={<SectionFallback />}>
        {Section ? (
          <Section />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="mb-3 text-muted"><SlidersHorizontal size={40} strokeWidth={1.25} /></div>
            <div className="font-display font-bold text-lg text-tx mb-1">Coming Soon</div>
            <div className="text-sm text-muted">
              <span className="font-mono-jarvis text-accent">/{activeSection}</span>
              {' '}is being migrated to React
            </div>
          </div>
        )}
      </Suspense>
    </SectionErrorBoundary>
  )
}

function useTheme() {
  const { theme } = useStore()
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: light)')
      root.setAttribute('data-theme', mq.matches ? 'light' : 'dark')
      const handler = (e: MediaQueryListEvent) =>
        root.setAttribute('data-theme', e.matches ? 'light' : 'dark')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      root.setAttribute('data-theme', theme)
    }
  }, [theme])
}

function useJarvisMode() {
  const { jarvisMode } = useStore()
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', jarvisMode)
  }, [jarvisMode])
}

function useKeyboardShortcuts() {
  const { setSection } = useStore()
  const buffer = useRef('')
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      const key = e.key.toLowerCase()
      if (e.key === 'Escape') { buffer.current = ''; return }
      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault(); setSection('shortcuts'); return
      }
      if (key === '?' && !e.ctrlKey && !e.metaKey) { setSection('shortcuts'); return }
      if (buffer.current === 'g') {
        const map: Partial<Record<string, NavSection>> = {
          d: 'dashboard', j: 'jarvis', t: 'tracker', k: 'keywords',
          c: 'contentcal', r: 'scheduler', a: 'apiaccess', s: 'analyzer',
          b: 'backlinks', o: 'onboarding',
        }
        const target = map[key]
        if (target) { setSection(target); buffer.current = ''; return }
      }
      if (key === 'g') {
        buffer.current = 'g'
        setTimeout(() => { buffer.current = '' }, 1000)
        return
      }
      buffer.current = ''
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setSection])
}

function AppLayout() {
  const { sidebarCollapsed, jarvisMode, activeSection } = useStore()
  const glow1 = jarvisMode === 'black' ? '#ef444408' : jarvisMode === 'gray' ? '#f59e0b08' : '#00d4ff08'
  const glow2 = jarvisMode === 'black' ? '#dc262608' : jarvisMode === 'gray' ? '#d9770608' : '#7c3aed08'
  const isChat = activeSection === 'jarvis'
  return (
    <div className={cn('flex', isChat ? 'h-screen overflow-hidden' : 'min-h-screen')}>
      <div className="fixed w-125 h-125 rounded-full blur-[120px] pointer-events-none -top-24 -right-24 z-0" style={{ background: glow1 }} />
      <div className="fixed w-100 h-100 rounded-full blur-[120px] pointer-events-none bottom-48 -left-24 z-0" style={{ background: glow2 }} />
      <Sidebar />
      <main className={cn(
        'flex-1 min-w-0 flex flex-col relative z-10 transition-all duration-300',
        sidebarCollapsed ? 'ml-16' : 'ml-60',
        isChat && 'overflow-hidden'
      )}>
        <TopBar />
        <div id="section-content" className={cn(
          isChat ? 'flex flex-col flex-1 min-h-0 overflow-hidden px-6 pb-4 pt-4' : 'p-6'
        )}>
          <SectionGuide />
          <SectionContent />
        </div>
      </main>
      <JarvisWidget />
    </div>
  )
}

function useGSCPopup() {
  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'jarvis-oauth-callback') return
      const { code, state } = event.data as { code: string; state: string }
      // Silently ignore if this message belongs to a different OAuth flow (e.g. GA4)
      const stored = sessionStorage.getItem('gsc_oauth_state')
      if (state !== stored) return
      sessionStorage.removeItem('gsc_oauth_state')
      const orgId = useAuthStore.getState().org?.id
      if (!orgId) {
        window.dispatchEvent(new CustomEvent('gsc-auth-result', {
          detail: { success: false, error: 'No organization found — please reload.' }
        }))
        return
      }
      const { error, data } = await supabase.functions.invoke('gsc-auth', {
        body: { code, redirect_uri: window.location.origin, org_id: orgId },
      })
      if (!error) {
        window.dispatchEvent(new CustomEvent('gsc-auth-result', { detail: { success: true, data } }))
        useStore.getState().setSection('gsc')
      } else {
        // Extract the real error body from the edge function response
        let msg = (error as { message?: string }).message ?? 'Unknown error'
        try {
          const body = await (error as { context?: Response }).context?.json()
          if (body?.error) msg = body.error
        } catch { /* ignore parse failure */ }
        console.error('[gsc-popup]', msg)
        window.dispatchEvent(new CustomEvent('gsc-auth-result', { detail: { success: false, error: msg } }))
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])
}

function useGA4Popup() {
  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'jarvis-oauth-callback') return
      const { code, state } = event.data as { code: string; state: string }
      const stored = sessionStorage.getItem('ga4_oauth_state')
      if (state !== stored) return
      sessionStorage.removeItem('ga4_oauth_state')
      const orgId = useAuthStore.getState().org?.id
      if (!orgId) {
        window.dispatchEvent(new CustomEvent('ga4-auth-result', {
          detail: { success: false, error: 'No organization found — please reload.' }
        }))
        return
      }
      const { error, data } = await supabase.functions.invoke('ga4-auth', {
        body: { code, redirect_uri: window.location.origin, org_id: orgId },
      })
      if (!error) {
        window.dispatchEvent(new CustomEvent('ga4-auth-result', { detail: { success: true, data } }))
        useStore.getState().setSection('ga4')
      } else {
        let msg = (error as { message?: string }).message ?? 'Unknown error'
        try {
          const body = await (error as { context?: Response }).context?.json()
          if (body?.error) msg = body.error
        } catch { /* ignore */ }
        console.error('[ga4-popup]', msg)
        window.dispatchEvent(new CustomEvent('ga4-auth-result', { detail: { success: false, error: msg } }))
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])
}

async function acceptInvite(userId: string, email: string, token: string) {
  const { data: invite } = await supabase
    .from('jarvis_org_invites')
    .select('*')
    .eq('token', token)
    .eq('email', email)
    .eq('status', 'pending')
    .single() as { data: OrgInvite | null; error: unknown }

  if (!invite || new Date(invite.expires_at) < new Date()) return

  const { error: memberErr } = await supabase
    .from('jarvis_org_members')
    .insert({ org_id: invite.org_id, user_id: userId, role: invite.role } as never)

  // ignore duplicate — user might already be a member
  if (memberErr && !(memberErr as { message?: string }).message?.includes('unique')) {
    console.error('[invite] join error:', memberErr)
    return
  }

  await supabase
    .from('jarvis_org_invites')
    .update({ status: 'accepted' } as never)
    .eq('id', invite.id)
}

function useAuth() {
  const { setSession, setOrg, setLoading, setOrgLoading, reset } = useAuthStore()

  async function loadOrg(jwt: string) {
    setOrgLoading(true)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 12_000)
    try {
      const sbUrl = useStore.getState().backendUrl || (import.meta.env.VITE_SUPABASE_URL as string) || ''
      const sbKey = useStore.getState().backendKey || (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || ''
      const res = await fetch(
        `${sbUrl}/rest/v1/rpc/jarvis_get_my_org`,
        {
          method:  'POST',
          headers: {
            'apikey':        sbKey,
            'Authorization': `Bearer ${jwt}`,
            'Content-Type':  'application/json',
          },
          body:   '{}',
          signal: ctrl.signal,
        }
      )
      clearTimeout(timer)
      if (!res.ok) { console.error('[loadOrg] http', res.status); setOrg(null, null); return }
      const data = await res.json() as
        { id: string; name: string; slug: string; owner_id: string; role: string } | null
      if (!data) { setOrg(null, null); return }
      const org: Organization = { id: data.id, name: data.name, slug: data.slug, owner_id: data.owner_id, plan: 'free', logo_url: null, created_at: new Date().toISOString() }
      setOrg(org, data.role as OrgRole)
      useStore.getState().loadOrgData(org.id).catch(() => {})
      // Load role permissions non-blocking
      ;(async () => {
        try {
          const { data: p } = await supabase.from('jarvis_organizations').select('role_permissions').eq('id', data.id).single()
          if (p?.role_permissions) useAuthStore.getState().setRolePermissions(p.role_permissions)
        } catch { /* ignore */ }
      })()
    } catch (err) {
      clearTimeout(timer)
      const name = (err as Error).name
      if (name === 'AbortError') console.error('[loadOrg] timed out after 12s')
      else console.error('[loadOrg] unexpected:', err)
      setOrg(null, null)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function joinViaShareLink(userId: string, accessToken: string) {
      const pendingOrgId = sessionStorage.getItem('pending_join_org')
      if (!pendingOrgId) return
      sessionStorage.removeItem('pending_join_org')
      const { error } = await supabase
        .from('jarvis_org_members')
        .insert({ org_id: pendingOrgId, user_id: userId, role: 'viewer' } as never)
      if (error) {
        const msg = (error as { message?: string }).message ?? ''
        if (!msg.includes('unique')) console.error('[org-share] join error:', error)
      }
      await loadOrg(accessToken)
    }

    async function bootstrap() {
      // Force-logout escape hatch: localhost:5173/?logout=1
      // Skips Supabase entirely — just wipes storage and hard-reloads to /
      if (new URLSearchParams(window.location.search).get('logout') === '1') {
        localStorage.clear()
        sessionStorage.clear()
        window.location.replace('/')  // full reload, empty localStorage → AuthPage
        return
      }

      // Detect share invite link: /invite/<orgId>
      const shareMatch = window.location.pathname.match(/^\/invite\/([0-9a-f-]{36})$/)
      if (shareMatch) {
        sessionStorage.setItem('pending_join_org', shareMatch[1])
        window.history.replaceState({}, '', '/')
      }

      // Safety net — never stay loading forever (30s to give loadOrg time to respond)
      const timeout = setTimeout(() => { if (!cancelled) setLoading(false) }, 30_000)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        setSession(session)
        if (session) {
          // Clean up #access_token hash that Supabase leaves after invite/magic-link redirects
          if (window.location.hash.includes('access_token')) {
            const inviteToken = new URLSearchParams(window.location.search).get('invite_token')
            window.history.replaceState({}, '', window.location.pathname + (inviteToken ? `?invite_token=${inviteToken}` : ''))
          }

          // Accept a pending invite if the user arrived via an invite link
          const inviteToken = new URLSearchParams(window.location.search).get('invite_token')
          if (inviteToken) {
            await acceptInvite(session.user.id, session.user.email ?? '', inviteToken)
            window.history.replaceState({}, '', window.location.pathname)
          }

          // If we have a cached org from a previous session, show the app immediately
          // and refresh org in the background — avoids OrgCreateWizard on slow networks
          const hasCachedOrg = !!useAuthStore.getState().org
          if (hasCachedOrg) {
            if (!cancelled) setLoading(false)
            loadOrg(session.access_token)
              .then(() => joinViaShareLink(session.user.id, session.access_token))
              .catch(() => {})
          } else {
            await loadOrg(session.access_token)
            await joinViaShareLink(session.user.id, session.access_token)
          }
        }

          // Handle OAuth redirect fallbacks — codes stashed by supabase.ts IIFE
          const orgId   = useAuthStore.getState().org?.id
          const gscCode = sessionStorage.getItem('gsc_pending_code')
          const ga4Code = sessionStorage.getItem('ga4_pending_code')
          if (orgId) {
            if (gscCode) {
              sessionStorage.removeItem('gsc_pending_code')
              sessionStorage.removeItem('gsc_oauth_state')
              supabase.functions.invoke('gsc-auth', {
                body: { code: gscCode, redirect_uri: window.location.origin, org_id: orgId },
              }).then(({ error }) => {
                if (!error) useStore.getState().setSection('gsc')
                else console.error('[gsc-auth redirect]', error)
              })
            }
            if (ga4Code) {
              sessionStorage.removeItem('ga4_pending_code')
              sessionStorage.removeItem('ga4_oauth_state')
              supabase.functions.invoke('ga4-auth', {
                body: { code: ga4Code, redirect_uri: window.location.origin, org_id: orgId },
              }).then(({ error }) => {
                if (!error) useStore.getState().setSection('ga4')
                else console.error('[ga4-auth redirect]', error)
              })
            }
          }
      } catch (err) {
        console.error('[bootstrap]', err)
      } finally {
        clearTimeout(timeout)
        if (!cancelled) setLoading(false)
      }
    }

    bootstrap()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return
      setSession(session)
      if (session) {
        await loadOrg(session.access_token)
        await joinViaShareLink(session.user.id, session.access_token)
        // Retry GSC auth if a code was stashed but orgId wasn't ready during bootstrap
        const pendingCode = sessionStorage.getItem('gsc_pending_code')
        const orgId = useAuthStore.getState().org?.id
        if (pendingCode && orgId) {
          sessionStorage.removeItem('gsc_pending_code')
          sessionStorage.removeItem('gsc_oauth_state')
          supabase.functions.invoke('gsc-auth', {
            body: { code: pendingCode, redirect_uri: window.location.origin, org_id: orgId },
          }).then(({ error }) => {
            if (!error) useStore.getState().setSection('gsc')
            else console.error('[gsc-auth retry]', error)
          })
        }
      } else {
        reset()
      }
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true; subscription.unsubscribe() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export default function App() {
  useTheme()
  useJarvisMode()
  useKeyboardShortcuts()
  useAuth()
  useGSCPopup()
  useGA4Popup()

  const { session, org, user, loading, orgLoading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 size={28} className="text-accent animate-spin" />
      </div>
    )
  }

  if (!session) return <AuthPage />

  // Still fetching org from Supabase — show spinner, not OrgCreateWizard
  if (!org && orgLoading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="text-accent animate-spin" />
        <p className="text-xs text-muted font-mono-jarvis">Loading organization…</p>
      </div>
    )
  }

  if (!org) return <OrgCreateWizard user={user!} onCreated={() => window.location.reload()} />

  return (
    <QueryClientProvider client={qc}>
      <AppLayout />
    </QueryClientProvider>
  )
}
