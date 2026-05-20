import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
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
  backendProvider: 'supabase' | 'pocketbase' | 'custom'
  backendUrl:      string
  backendKey:      string
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
  setBackendProvider:  (p: 'supabase' | 'pocketbase' | 'custom') => void
  setBackendUrl:       (k: string) => void
  setBackendKey:       (k: string) => void
  setGoogleClientId:   (k: string) => void
  setDomain: (d: string) => void
  setTheme: (t: 'dark' | 'light' | 'auto') => void
  setDensity: (d: 'default' | 'compact') => void
  setSidebarCollapsed: (v: boolean) => void
  settingsOpen: boolean
  setSettingsOpen: (v: boolean) => void

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
      openRouterModel: 'deepseek/deepseek-chat-v3-0324:free',
      setOpenRouterKey:   (openRouterKey)   => set({ openRouterKey }),
      setOpenRouterModel: (openRouterModel) => set({ openRouterModel }),
      openPageRankKey: '',
      dataForSEOKey:   '',
      serpApiKey:      '',
      serperKeys:      '',
      searchFitKey:    '',
      psiKey:          '',
      backendProvider: 'supabase',
      backendUrl:      '',
      backendKey:      '',
      googleClientId:  '',
      domain: '',
      jarvisMode:    'white',
      setJarvisMode: (jarvisMode) => set({ jarvisMode }),
      newsLastSeen:      '',
      newsUnreadCount:   0,
      setNewsLastSeen:   (newsLastSeen)    => set({ newsLastSeen }),
      setNewsUnreadCount:(newsUnreadCount) => set({ newsUnreadCount }),
      theme: 'dark',
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
      setBackendProvider: (backendProvider) => set({ backendProvider }),
      setBackendUrl:      (backendUrl)      => set({ backendUrl }),
      setBackendKey:      (backendKey)      => set({ backendKey }),
      setGoogleClientId:  (googleClientId)  => set({ googleClientId }),
      setDomain: (domain) => set({ domain }),
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      settingsOpen: false,
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

      sites: [],
      tasks: [],
      schedules: [],
      voiceHistory: [],
      roiTimeframe: 6,
      scenario: 'conservative',
      wpSites: [],

      // ── Supabase sync ───────────────────────────────────────
      loadOrgData: async (orgId) => {
        try {
          // Seed starter data for new orgs (no-op if already seeded)
          await supabase.rpc('jarvis_seed_org', { p_org_id: orgId })

          const [{ data: sitesRaw }, { data: tasksRaw }, { data: schedsRaw }] = await Promise.all([
            supabase.from('jarvis_sites').select('*').eq('org_id', orgId).order('created_at'),
            supabase.from('jarvis_tasks').select('*').eq('org_id', orgId).order('created_at'),
            supabase.from('jarvis_schedules').select('*').eq('org_id', orgId).order('created_at'),
          ]) as [
            { data: DbSite[]     | null },
            { data: DbTask[]     | null },
            { data: DbSchedule[] | null },
          ]

          set({
            sites:     (sitesRaw  ?? []).map(toSite),
            tasks:     (tasksRaw  ?? []).map(toTask),
            schedules: (schedsRaw ?? []).map(toSchedule),
          })
        } catch (err) {
          console.error('[loadOrgData]', err)
        }
      },

      // ── Sites ───────────────────────────────────────────────
      addSite: async (s, orgId) => {
        const { data } = await supabase
          .from('jarvis_sites')
          .insert({ ...s, org_id: orgId } as never)
          .select().single() as { data: DbSite | null }
        if (data) set((st) => ({ sites: [...st.sites, toSite(data, st.sites.length)] }))
      },

      removeSite: async (id, orgId) => {
        const { sites } = get()
        const site = sites[id - 1]
        if (!site) return
        // Find UUID by matching domain+name via a fresh fetch
        const { data: rows } = await supabase
          .from('jarvis_sites').select('id,domain').eq('org_id', orgId) as { data: { id: string; domain: string }[] | null }
        const row = rows?.find(r => r.domain === site.domain)
        if (row) await supabase.from('jarvis_sites').delete().eq('id', row.id)
        set((st) => ({ sites: st.sites.filter((_, i) => i !== id - 1) }))
      },

      updateSite: async (id, patch, orgId) => {
        const { sites } = get()
        const site = sites[id - 1]
        if (!site) return
        const { data: rows } = await supabase
          .from('jarvis_sites').select('id,domain').eq('org_id', orgId) as { data: { id: string; domain: string }[] | null }
        const row = rows?.find(r => r.domain === site.domain)
        if (row) await supabase.from('jarvis_sites').update(patch as never).eq('id', row.id)
        set((st) => ({ sites: st.sites.map((s, i) => i === id - 1 ? { ...s, ...patch } : s) }))
      },

      // ── Tasks ───────────────────────────────────────────────
      toggleTask: async (id, orgId) => {
        const task = get().tasks.find(t => t.id === id)
        if (!task) return
        const { data: rows } = await supabase
          .from('jarvis_tasks').select('id,title').eq('org_id', orgId) as { data: { id: string; title: string }[] | null }
        const row = rows?.find(r => r.title === task.title)
        if (row) await supabase.from('jarvis_tasks').update({ done: !task.done } as never).eq('id', row.id)
        set((st) => ({ tasks: st.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) }))
      },

      addTask: async (t, orgId) => {
        const { data } = await supabase
          .from('jarvis_tasks')
          .insert({ ...t, org_id: orgId, done: false } as never)
          .select().single() as { data: DbTask | null }
        if (data) {
          const newTask: Task = { id: Date.now(), title: data.title, assignee: data.assignee,
            priority: data.priority, done: false, section: data.section, created: 'just now' }
          set((st) => ({ tasks: [newTask, ...st.tasks] }))
        }
      },

      // ── Schedules ───────────────────────────────────────────
      saveSchedule: async (s, orgId) => {
        await supabase.from('jarvis_schedules').insert({
          org_id: orgId, name: s.name, freq: s.freq, day: s.day,
          time_of_day: s.time, emails: s.emails, active: s.active, next_run: s.next,
        } as never)
        set((st) => ({ schedules: [s, ...st.schedules] }))
      },

      toggleSchedule: async (i, orgId) => {
        const sched = get().schedules[i]
        if (!sched) return
        const { data: rows } = await supabase
          .from('jarvis_schedules').select('id,name').eq('org_id', orgId) as { data: { id: string; name: string }[] | null }
        const row = rows?.find(r => r.name === sched.name)
        if (row) await supabase.from('jarvis_schedules').update({ active: !sched.active } as never).eq('id', row.id)
        set((st) => ({ schedules: st.schedules.map((s, idx) => idx === i ? { ...s, active: !s.active } : s) }))
      },

      deleteSchedule: async (i, orgId) => {
        const sched = get().schedules[i]
        if (!sched) return
        const { data: rows } = await supabase
          .from('jarvis_schedules').select('id,name').eq('org_id', orgId) as { data: { id: string; name: string }[] | null }
        const row = rows?.find(r => r.name === sched.name)
        if (row) await supabase.from('jarvis_schedules').delete().eq('id', row.id)
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
        backendProvider: state.backendProvider,
        backendUrl:      state.backendUrl,
        backendKey:      state.backendKey,
        googleClientId:  state.googleClientId,
        domain:            state.domain,
        jarvisMode:        state.jarvisMode,
        newsLastSeen:      state.newsLastSeen,
        newsUnreadCount:   state.newsUnreadCount,
        theme:             state.theme,
        density:         state.density,
        sidebarCollapsed:state.sidebarCollapsed,
        roiTimeframe:    state.roiTimeframe,
        scenario:        state.scenario,
        voiceHistory:    state.voiceHistory,
        wpSites:         state.wpSites,
      }),
    }
  )
)
