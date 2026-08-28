import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getDataProvider } from '@/lib/backend'
import type { Site, Task, Schedule, VoiceEntry, NavSection, WPSite } from '@/types'

// ── Types for Supabase rows ───────────────────────────────────
type DbSite = {
  id: string; org_id: string; name: string; domain: string
  score: number; traffic: string; keys: number; issues: number
  status: 'good' | 'warning' | 'danger'; country?: string; client?: string; notes?: string
}
type DbTask = {
  id: string; org_id: string; title: string; assignee: string
  priority: 'critical' | 'high' | 'medium' | 'low'; done: boolean
  section: string; created_at: string
}
type DbSchedule = {
  id: string; org_id: string; name: string; freq: string
  day: string; time_of_day: string; emails: string
  active: boolean; next_run: string
}

// ── Converters (Supabase row → local shape) ───────────────────
function toSite(r: DbSite, idx: number): Site {
  return { id: idx + 1, name: r.name, domain: r.domain, score: r.score, traffic: r.traffic,
    keys: r.keys, issues: r.issues, status: r.status, country: r.country, client: r.client, notes: r.notes }
}
function toTask(r: DbTask, idx: number): Task {
  return { id: idx + 1, title: r.title, assignee: r.assignee, priority: r.priority,
    done: r.done, section: r.section, created: new Date(r.created_at).toLocaleDateString() }
}
function toSchedule(r: DbSchedule): Schedule {
  return { name: r.name, freq: r.freq, day: r.day, time: r.time_of_day,
    emails: r.emails, active: r.active, next: r.next_run }
}

interface JarvisState {
  // Navigation
  activeSection: NavSection
  setSection: (s: NavSection) => void

  // Settings
  aiProvider:      'anthropic' | 'openrouter'
  setAiProvider:   (p: 'anthropic' | 'openrouter') => void
  anthropicKey:    string
  geminiKey:       string
  openRouterKey:   string
  openRouterModel: string
  setOpenRouterKey:   (k: string) => void
  setOpenRouterModel: (m: string) => void
  openPageRankKey: string
  dataForSEOKey:   string   // "login:password"
  serpApiKey:      string
  serperKeys:      string   // newline-separated, auto-rotated
  searchFitKey:    string
  psiKey:          string
  indexNowKey:     string
  bingKey:         string
  backendProvider: 'supabase' | 'pocketbase' | 'custom'
  backendUrl:      string
  backendKey:      string
  // Custom REST data backend (Phase C/D) — separate from backendUrl/backendKey above,
  // which point the Supabase client itself (auth + edge functions) at a self-hosted
  // project and stay required even when backendProvider is 'custom'.
  customBackendUrl: string
  customBackendKey: string
  googleClientId:  string
  domain: string
  jarvisMode:    'white' | 'gray' | 'black'
  setJarvisMode: (m: 'white' | 'gray' | 'black') => void
  newsLastSeen:      string
  newsUnreadCount:   number
  setNewsLastSeen:   (ts: string) => void
  setNewsUnreadCount:(n: number)  => void
  theme: 'dark' | 'light' | 'auto'
  density: 'default' | 'compact'
  sidebarCollapsed: boolean
  setAnthropicKey:    (k: string) => void
  setGeminiKey:       (k: string) => void
  setOpenPageRankKey: (k: string) => void
  setDataForSEOKey:   (k: string) => void
  setSerpApiKey:      (k: string) => void
  setSerperKeys:      (k: string) => void
  setSearchFitKey:    (k: string) => void
  setPsiKey:           (k: string) => void
  setIndexNowKey:      (k: string) => void
  setBingKey:          (k: string) => void
  setBackendProvider:  (p: 'supabase' | 'pocketbase' | 'custom') => void
  setBackendUrl:       (k: string) => void
  setBackendKey:       (k: string) => void
  setCustomBackendUrl: (k: string) => void
  setCustomBackendKey: (k: string) => void
  setGoogleClientId:   (k: string) => void
  setDomain: (d: string) => void
  setTheme: (t: 'dark' | 'light' | 'auto') => void
  setDensity: (d: 'default' | 'compact') => void
  setSidebarCollapsed: (v: boolean) => void
  settingsOpen: boolean
  setSettingsOpen: (v: boolean) => void

  // Product tour
  tourActive:    boolean
  tourStep:      number
  tourDismissed: boolean
  setTourActive:    (v: boolean) => void
  setTourStep:      (n: number) => void
  setTourDismissed: (v: boolean) => void

  // Data
  sites: Site[]
  tasks: Task[]
  schedules: Schedule[]
  voiceHistory: VoiceEntry[]
  roiTimeframe: number
  scenario: string
  wpSites: WPSite[]

  // Supabase sync
  loadOrgData: (orgId: string) => Promise<void>

  // Mutations
  addSite:        (s: Omit<Site, 'id'>, orgId: string) => Promise<void>
  removeSite:     (id: number, orgId: string)           => Promise<void>
  updateSite:     (id: number, patch: Partial<Site>, orgId: string) => Promise<void>
  toggleTask:     (id: number, orgId: string)           => Promise<void>
  addTask:        (t: Omit<Task, 'id' | 'done' | 'created'>, orgId: string) => Promise<void>
  saveSchedule:   (s: Schedule, orgId: string)          => Promise<void>
  toggleSchedule: (i: number, orgId: string)            => Promise<void>
  deleteSchedule: (i: number, orgId: string)            => Promise<void>
  addVoiceEntry:  (e: VoiceEntry)                       => void
  setRoiTimeframe:(n: number)                           => void
  setScenario:    (s: string)                           => void
  addWPSite:      (s: WPSite)                           => void
  removeWPSite:   (id: number)                          => void
  updateWPSite:   (id: number, patch: Partial<WPSite>) => void
}

export const useStore = create<JarvisState>()(
  persist(
    (set, get) => ({
      activeSection: 'dashboard',
      setSection: (activeSection) => set({ activeSection }),

      aiProvider:      'openrouter',
      setAiProvider:   (aiProvider) => set({ aiProvider }),
      anthropicKey:    '',
      geminiKey:       '',
      openRouterKey:   '',
      openRouterModel: 'minimax/minimax-m3:free',
      setOpenRouterKey:   (openRouterKey)   => set({ openRouterKey }),
      setOpenRouterModel: (openRouterModel) => set({ openRouterModel }),
      openPageRankKey: '',
      dataForSEOKey:   '',
      serpApiKey:      '',
      serperKeys:      '',
      searchFitKey:    '',
      psiKey:          '',
      indexNowKey:     '',
      bingKey:         '',
      backendProvider: 'supabase',
      backendUrl:      '',
      backendKey:      '',
      customBackendUrl: '',
      customBackendKey: '',
      googleClientId:  '',
      domain: '',
      jarvisMode:    'white',
      setJarvisMode: (jarvisMode) => set({ jarvisMode }),
      newsLastSeen:      '',
      newsUnreadCount:   0,
      setNewsLastSeen:   (newsLastSeen)    => set({ newsLastSeen }),
      setNewsUnreadCount:(newsUnreadCount) => set({ newsUnreadCount }),
      theme: 'light',
      density: 'default',
      sidebarCollapsed: false,
      setAnthropicKey:    (anthropicKey)    => set({ anthropicKey }),
      setGeminiKey:       (geminiKey)       => set({ geminiKey }),
      setOpenPageRankKey: (openPageRankKey) => set({ openPageRankKey }),
      setDataForSEOKey:   (dataForSEOKey)   => set({ dataForSEOKey }),
      setSerpApiKey:      (serpApiKey)      => set({ serpApiKey }),
      setSerperKeys:      (serperKeys)      => set({ serperKeys }),
      setSearchFitKey:    (searchFitKey)    => set({ searchFitKey }),
      setPsiKey:          (psiKey)          => set({ psiKey }),
      setIndexNowKey:     (indexNowKey)     => set({ indexNowKey }),
      setBingKey:         (bingKey)         => set({ bingKey }),
      setBackendProvider: (backendProvider) => set({ backendProvider }),
      setBackendUrl:      (backendUrl)      => set({ backendUrl }),
      setBackendKey:      (backendKey)      => set({ backendKey }),
      setCustomBackendUrl:(customBackendUrl) => set({ customBackendUrl }),
      setCustomBackendKey:(customBackendKey) => set({ customBackendKey }),
      setGoogleClientId:  (googleClientId)  => set({ googleClientId }),
      setDomain: (domain) => set({ domain }),
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      settingsOpen: false,
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

      tourActive:    false,
      tourStep:      0,
      tourDismissed: false,
      setTourActive:    (tourActive)    => set({ tourActive }),
      setTourStep:      (tourStep)      => set({ tourStep }),
      setTourDismissed: (tourDismissed) => set({ tourDismissed }),

      sites: [],
      tasks: [],
      schedules: [],
      voiceHistory: [],
      roiTimeframe: 6,
      scenario: 'conservative',
      wpSites: [],

      // ── Backend sync (Supabase or custom REST — see lib/backend) ─
      loadOrgData: async (orgId) => {
        try {
          const dp = getDataProvider()
          // Seed starter data for new orgs (no-op if already seeded)
          await dp.callProcedure('jarvis_seed_org', { p_org_id: orgId })

          const byOrg = { filters: [{ column: 'org_id' as const, op: 'eq' as const, value: orgId }], order: { column: 'created_at' } }
          const [sitesRes, tasksRes, schedsRes] = await Promise.all([
            dp.select<DbSite>('jarvis_sites', byOrg),
            dp.select<DbTask>('jarvis_tasks', byOrg),
            dp.select<DbSchedule>('jarvis_schedules', byOrg),
          ])

          set({
            sites:     ((sitesRes.data ?? []) as DbSite[]).map(toSite),
            tasks:     ((tasksRes.data ?? []) as DbTask[]).map(toTask),
            schedules: ((schedsRes.data ?? []) as DbSchedule[]).map(toSchedule),
          })
        } catch (err) {
          console.error('[loadOrgData]', err)
        }
      },

      // ── Sites ───────────────────────────────────────────────
      addSite: async (s, orgId) => {
        const { data } = await getDataProvider().insert<DbSite>('jarvis_sites', { ...s, org_id: orgId })
        if (data) set((st) => ({ sites: [...st.sites, toSite(data as DbSite, st.sites.length)] }))
      },

      removeSite: async (id, orgId) => {
        const { sites } = get()
        const site = sites[id - 1]
        if (!site) return
        const dp = getDataProvider()
        // Find UUID by matching domain+name via a fresh fetch
        const { data: rows } = await dp.select<{ id: string; domain: string }>('jarvis_sites', {
          columns: 'id,domain', filters: [{ column: 'org_id', op: 'eq', value: orgId }],
        })
        const row = (rows as { id: string; domain: string }[] | null)?.find(r => r.domain === site.domain)
        if (row) await dp.remove('jarvis_sites', [{ column: 'id', op: 'eq', value: row.id }])
        set((st) => ({ sites: st.sites.filter((_, i) => i !== id - 1) }))
      },

      updateSite: async (id, patch, orgId) => {
        const { sites } = get()
        const site = sites[id - 1]
        if (!site) return
        const dp = getDataProvider()
        const { data: rows } = await dp.select<{ id: string; domain: string }>('jarvis_sites', {
          columns: 'id,domain', filters: [{ column: 'org_id', op: 'eq', value: orgId }],
        })
        const row = (rows as { id: string; domain: string }[] | null)?.find(r => r.domain === site.domain)
        if (row) await dp.update('jarvis_sites', [{ column: 'id', op: 'eq', value: row.id }], patch)
        set((st) => ({ sites: st.sites.map((s, i) => i === id - 1 ? { ...s, ...patch } : s) }))
      },

      // ── Tasks ───────────────────────────────────────────────
      toggleTask: async (id, orgId) => {
        const task = get().tasks.find(t => t.id === id)
        if (!task) return
        const dp = getDataProvider()
        const { data: rows } = await dp.select<{ id: string; title: string }>('jarvis_tasks', {
          columns: 'id,title', filters: [{ column: 'org_id', op: 'eq', value: orgId }],
        })
        const row = (rows as { id: string; title: string }[] | null)?.find(r => r.title === task.title)
        if (row) await dp.update('jarvis_tasks', [{ column: 'id', op: 'eq', value: row.id }], { done: !task.done })
        set((st) => ({ tasks: st.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) }))
      },

      addTask: async (t, orgId) => {
        const { data } = await getDataProvider().insert<DbTask>('jarvis_tasks', { ...t, org_id: orgId, done: false })
        if (data) {
          const row = data as DbTask
          const newTask: Task = { id: Date.now(), title: row.title, assignee: row.assignee,
            priority: row.priority, done: false, section: row.section, created: 'just now' }
          set((st) => ({ tasks: [newTask, ...st.tasks] }))
        }
      },

      // ── Schedules ───────────────────────────────────────────
      saveSchedule: async (s, orgId) => {
        await getDataProvider().insert('jarvis_schedules', {
          org_id: orgId, name: s.name, freq: s.freq, day: s.day,
          time_of_day: s.time, emails: s.emails, active: s.active, next_run: s.next,
        }, { returning: false })
        set((st) => ({ schedules: [s, ...st.schedules] }))
      },

      toggleSchedule: async (i, orgId) => {
        const sched = get().schedules[i]
        if (!sched) return
        const dp = getDataProvider()
        const { data: rows } = await dp.select<{ id: string; name: string }>('jarvis_schedules', {
          columns: 'id,name', filters: [{ column: 'org_id', op: 'eq', value: orgId }],
        })
        const row = (rows as { id: string; name: string }[] | null)?.find(r => r.name === sched.name)
        if (row) await dp.update('jarvis_schedules', [{ column: 'id', op: 'eq', value: row.id }], { active: !sched.active })
        set((st) => ({ schedules: st.schedules.map((s, idx) => idx === i ? { ...s, active: !s.active } : s) }))
      },

      deleteSchedule: async (i, orgId) => {
        const sched = get().schedules[i]
        if (!sched) return
        const dp = getDataProvider()
        const { data: rows } = await dp.select<{ id: string; name: string }>('jarvis_schedules', {
          columns: 'id,name', filters: [{ column: 'org_id', op: 'eq', value: orgId }],
        })
        const row = (rows as { id: string; name: string }[] | null)?.find(r => r.name === sched.name)
        if (row) await dp.remove('jarvis_schedules', [{ column: 'id', op: 'eq', value: row.id }])
        set((st) => ({ schedules: st.schedules.filter((_, idx) => idx !== i) }))
      },

      // ── Non-Supabase mutations ──────────────────────────────
      addVoiceEntry: (e) =>
        set((st) => ({ voiceHistory: [e, ...st.voiceHistory].slice(0, 50) })),
      setRoiTimeframe: (roiTimeframe) => set({ roiTimeframe }),
      setScenario: (scenario) => set({ scenario }),
      addWPSite: (s) => set((st) => ({ wpSites: [...st.wpSites, s] })),
      removeWPSite: (id) => set((st) => ({ wpSites: st.wpSites.filter((s) => s.id !== id) })),
      updateWPSite: (id, patch) =>
        set((st) => ({ wpSites: st.wpSites.map((s) => (s.id === id ? { ...s, ...patch } : s)) })),
    }),
    {
      name: 'jarvis-store',
      // Only persist UI preferences — data comes from Supabase
      partialize: (state) => ({
        activeSection:   state.activeSection,
        aiProvider:      state.aiProvider,
        anthropicKey:    state.anthropicKey,
        geminiKey:       state.geminiKey,
        openRouterKey:   state.openRouterKey,
        openRouterModel: state.openRouterModel,
        openPageRankKey: state.openPageRankKey,
        dataForSEOKey:   state.dataForSEOKey,
        serpApiKey:      state.serpApiKey,
        serperKeys:      state.serperKeys,
        searchFitKey:    state.searchFitKey,
        psiKey:          state.psiKey,
        indexNowKey:     state.indexNowKey,
        bingKey:         state.bingKey,
        backendProvider: state.backendProvider,
        backendUrl:      state.backendUrl,
        backendKey:      state.backendKey,
        customBackendUrl: state.customBackendUrl,
        customBackendKey: state.customBackendKey,
        googleClientId:  state.googleClientId,
        domain:            state.domain,
        jarvisMode:        state.jarvisMode,
        newsLastSeen:      state.newsLastSeen,
        newsUnreadCount:   state.newsUnreadCount,
        theme:             state.theme,
        density:         state.density,
        sidebarCollapsed:state.sidebarCollapsed,
        tourDismissed:   state.tourDismissed,
        roiTimeframe:    state.roiTimeframe,
        scenario:        state.scenario,
        voiceHistory:    state.voiceHistory,
        wpSites:         state.wpSites,
      }),
    }
  )
)
