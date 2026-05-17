import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ExternalLink, BarChart2, Eye, MousePointer, Percent, Hash,
  RefreshCw, AlertCircle, Globe, Unplug, Plus, X, Search, ChevronDown, Download,
} from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { downloadCSV } from '@/lib/csv'
import { useAuthStore } from '@/store/authStore'
import { useStore } from '@/store'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'

// ── Types ─────────────────────────────────────────────────────
interface GSCConn {
  selectedSite:   string | null
  availableSites: string[]
}
interface TrendRow  { date: string; clicks: number; impressions: number }
interface QueryRow  { query: string; clicks: number; impressions: number; ctr: string; position: number }
interface PageRow   { url: string; clicks: number; impressions: number; ctr: string; position: number }
interface GSCData   {
  trend:   TrendRow[]
  queries: QueryRow[]
  pages:   PageRow[]
  kpis:    { clicks: number; impressions: number; ctr: string; position: string }
}

type ContentTab = 'overview' | 'queries' | 'pages'

// ── Helpers ───────────────────────────────────────────────────
const SCOPES = 'https://www.googleapis.com/auth/webmasters.readonly'

function buildOAuthUrl(clientId: string): string {
  const state = crypto.randomUUID()
  sessionStorage.setItem('gsc_oauth_state', state)
  const p = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  window.location.origin,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`
}


function posDist(queries: QueryRow[]) {
  return [
    { range: '1–3',   pages: queries.filter(q => q.position <= 3).length },
    { range: '4–10',  pages: queries.filter(q => q.position > 3  && q.position <= 10).length },
    { range: '11–20', pages: queries.filter(q => q.position > 10 && q.position <= 20).length },
    { range: '21–50', pages: queries.filter(q => q.position > 20 && q.position <= 50).length },
    { range: '50+',   pages: queries.filter(q => q.position > 50).length },
  ]
}

function shortUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('sc-domain:')) return url.replace('sc-domain:', '')
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return url }
}

// ── Date range ────────────────────────────────────────────────
type DatePreset = '24h' | '7d' | '28d' | '3m' | '6m' | '12m' | '16m' | 'custom'

const PRESET_LABELS: Record<DatePreset, string> = {
  '24h': '24 hours', '7d': '7 days', '28d': '28 days', '3m': '3 months',
  '6m': 'Last 6 months', '12m': 'Last 12 months', '16m': 'Last 16 months', 'custom': 'Custom',
}

const MORE_PRESETS: DatePreset[] = ['6m', '12m', '16m', 'custom']
const QUICK_PRESETS: DatePreset[] = ['24h', '7d', '28d', '3m']

function getDateRange(preset: DatePreset, customStart = '', customEnd = '') {
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const ago = (days: number) => fmt(new Date(Date.now() - days * 86_400_000))
  const today = fmt(new Date())
  switch (preset) {
    case '24h':    return { startDate: ago(1),   endDate: today }
    case '7d':     return { startDate: ago(7),   endDate: today }
    case '28d':    return { startDate: ago(28),  endDate: today }
    case '3m':     return { startDate: ago(90),  endDate: today }
    case '6m':     return { startDate: ago(180), endDate: today }
    case '12m':    return { startDate: ago(365), endDate: today }
    case '16m':    return { startDate: ago(485), endDate: today }
    case 'custom': return { startDate: customStart, endDate: customEnd }
  }
}

function trendRowLimit(preset: DatePreset, start: string, end: string): number {
  if (preset === 'custom' && start && end) {
    return Math.min(500, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1)
  }
  const map: Record<DatePreset, number> = {
    '24h': 2, '7d': 7, '28d': 28, '3m': 90, '6m': 180, '12m': 365, '16m': 485, 'custom': 90,
  }
  return map[preset]
}

// ── Site picker dropdown ──────────────────────────────────────
function SitePicker({
  sites,
  excludeUrls,
  onSelect,
  onClose,
  placeholder = 'Search sites…',
}: {
  sites:       string[]
  excludeUrls?: string[]
  onSelect:    (url: string) => void
  onClose:     () => void
  placeholder?: string
}) {
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [onClose])

  const filtered = sites.filter(s => {
    if (excludeUrls?.includes(s)) return false
    return !q.trim() || s.toLowerCase().includes(q.toLowerCase())
  })

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full mt-1 left-0 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
    >
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-7 pr-2 py-1.5 bg-surface border border-border rounded-lg text-xs text-tx outline-none focus:border-accent font-mono-jarvis"
          />
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted">No match</div>
        ) : filtered.map(url => (
          <button
            key={url}
            onClick={() => onSelect(url)}
            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-surface text-left transition-colors border-b border-border/50 last:border-0"
          >
            <Globe size={11} className="text-accent shrink-0" />
            <span className="text-xs font-mono-jarvis text-tx truncate">{url}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────
export function GSC() {
  const orgId    = useAuthStore().org?.id ?? ''
  const clientId = useStore(s => s.googleClientId)

  // ── Connection
  const [conn,         setConn]         = useState<GSCConn | null>(null)
  const [connLoading,  setConnLoading]  = useState(true)
  const [connecting,   setConnecting]   = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  // ── Multi-site tabs
  const [siteTabs,    setSiteTabs]    = useState<string[]>([])
  const [activeUrl,   setActiveUrl]   = useState('')
  const [dataCache,   setDataCache]   = useState<Map<string, GSCData>>(new Map())

  // ── Active tab display data
  const [data,        setData]        = useState<GSCData | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataErr,     setDataErr]     = useState<string | null>(null)

  // ── Date range state
  const [datePreset,   setDatePreset]   = useState<DatePreset>('28d')
  const [customStart,  setCustomStart]  = useState('')
  const [customEnd,    setCustomEnd]    = useState('')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showCustom,   setShowCustom]   = useState(false)
  const dateRangeRef = useRef(getDateRange('28d'))
  const moreMenuRef  = useRef<HTMLDivElement>(null)

  // ── UI state
  const [contentTab,    setContentTab]    = useState<ContentTab>('overview')
  const [filter,        setFilter]        = useState('')
  const [showSwitcher,  setShowSwitcher]  = useState(false)
  const [showAddPicker, setShowAddPicker] = useState(false)

  // ── Fetch connection row ──────────────────────────────────
  const fetchConn = useCallback(async () => {
    if (!orgId) return
    setConnLoading(true)
    const { data: row } = await supabase
      .from('jarvis_gsc_connections')
      .select('selected_site, available_sites')
      .eq('org_id', orgId)
      .maybeSingle() as { data: { selected_site: string | null; available_sites: string[] } | null }
    setConn(row ? { selectedSite: row.selected_site, availableSites: row.available_sites ?? [] } : null)
    setConnLoading(false)
  }, [orgId])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchConn() }, [fetchConn])

  useEffect(() => {
    const h = () => fetchConn()
    window.addEventListener('focus', h)
    return () => window.removeEventListener('focus', h)
  }, [fetchConn])

  useEffect(() => {
    const h = (e: Event) => {
      const { success, error } = (e as CustomEvent<{ success: boolean; error?: string }>).detail
      setConnecting(false)
      if (!success) setConnectError(error ?? 'Connection failed — check the browser console for details.')
      else { setConnectError(null); fetchConn() }
    }
    window.addEventListener('gsc-auth-result', h)
    return () => window.removeEventListener('gsc-auth-result', h)
  }, [fetchConn])

  // ── Fetch GSC data ────────────────────────────────────────
  const fetchData = useCallback(async (siteUrl: string) => {
    if (!orgId) return
    setDataLoading(true)
    setDataErr(null)
    try {
      const range    = dateRangeRef.current
      const rowLimit = trendRowLimit(datePreset, customStart, customEnd)
      const [trendRes, queriesRes, pagesRes] = await Promise.all([
        supabase.functions.invoke('gsc-proxy', {
          body: { org_id: orgId, site_url: siteUrl, endpoint: 'searchAnalytics',
            params: { ...range, dimensions: ['date'],  rowLimit } },
        }),
        supabase.functions.invoke('gsc-proxy', {
          body: { org_id: orgId, site_url: siteUrl, endpoint: 'searchAnalytics',
            params: { ...range, dimensions: ['query'], rowLimit: 100 } },
        }),
        supabase.functions.invoke('gsc-proxy', {
          body: { org_id: orgId, site_url: siteUrl, endpoint: 'searchAnalytics',
            params: { ...range, dimensions: ['page'],  rowLimit: 50 } },
        }),
      ])

      if (trendRes.error)   throw new Error(trendRes.error.message)
      if (queriesRes.error) throw new Error(queriesRes.error.message)
      if (pagesRes.error)   throw new Error(pagesRes.error.message)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trend: TrendRow[] = (trendRes.data?.rows ?? []).map((r: any) => ({
        date: r.keys[0].slice(5), clicks: r.clicks, impressions: r.impressions,
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const queries: QueryRow[] = (queriesRes.data?.rows ?? []).map((r: any) => ({
        query: r.keys[0], clicks: r.clicks, impressions: r.impressions,
        ctr: (r.ctr * 100).toFixed(1) + '%', position: +r.position.toFixed(1),
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pages: PageRow[] = (pagesRes.data?.rows ?? []).map((r: any) => {
        let url = r.keys[0] as string
        try { url = new URL(url).pathname } catch { /* keep full URL */ }
        return { url, clicks: r.clicks, impressions: r.impressions, ctr: (r.ctr * 100).toFixed(1) + '%', position: +r.position.toFixed(1) }
      })

      const totalClicks = trend.reduce((s, r) => s + r.clicks, 0)
      const totalImpr   = trend.reduce((s, r) => s + r.impressions, 0)
      const avgCtr      = totalImpr > 0 ? ((totalClicks / totalImpr) * 100).toFixed(2) + '%' : '0%'
      const avgPos      = queries.length > 0
        ? (queries.reduce((s, r) => s + r.position, 0) / queries.length).toFixed(1) : '—'

      const result: GSCData = { trend, queries, pages, kpis: { clicks: totalClicks, impressions: totalImpr, ctr: avgCtr, position: avgPos } }

      setDataCache(prev => new Map(prev).set(siteUrl, result))
      setActiveUrl(cur => {
        if (cur === siteUrl || cur === '') { setData(result) }
        return cur
      })
    } catch (e) {
      setDataErr(e instanceof Error ? e.message : 'Failed to fetch GSC data')
    } finally {
      setDataLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  // ── Initialise first tab when conn is loaded ──────────────
  // ── Persist tabs to localStorage whenever they change ────
  useEffect(() => {
    if (!orgId || siteTabs.length === 0) return
    localStorage.setItem(`jarvis_gsc_tabs_${orgId}`, JSON.stringify(siteTabs))
  }, [siteTabs, orgId])

  useEffect(() => {
    if (!orgId || !activeUrl) return
    localStorage.setItem(`jarvis_gsc_active_${orgId}`, activeUrl)
  }, [activeUrl, orgId])

  // ── Initialise tabs — restore from localStorage or default ─
  useEffect(() => {
    if (!conn?.selectedSite || !orgId) return

    try {
      const saved = localStorage.getItem(`jarvis_gsc_tabs_${orgId}`)
      if (saved) {
        const savedTabs = JSON.parse(saved) as string[]
        const valid = savedTabs.filter(u => conn.availableSites.includes(u))
        if (valid.length > 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSiteTabs(valid)
          const savedActive = localStorage.getItem(`jarvis_gsc_active_${orgId}`)
          const toLoad = (savedActive && valid.includes(savedActive)) ? savedActive : valid[0]
          setActiveUrl(toLoad)
          fetchData(toLoad)
          return
        }
      }
    } catch { /* ignore parse errors */ }

    // No valid saved state — start fresh with the selected site
    setSiteTabs([conn.selectedSite])
    setActiveUrl(conn.selectedSite)
    fetchData(conn.selectedSite)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn?.selectedSite, orgId])

  // ── Switch to a tab ───────────────────────────────────────
  function switchTab(url: string) {
    setActiveUrl(url)
    const cached = dataCache.get(url)
    if (cached) { setData(cached); setDataErr(null) }
    else fetchData(url)
  }

  // ── Add a new tab ─────────────────────────────────────────
  function addTab(url: string) {
    setShowAddPicker(false)
    if (siteTabs.includes(url)) { switchTab(url); return }
    setSiteTabs(prev => [...prev, url])
    switchTab(url)
  }

  // ── Remove a tab ─────────────────────────────────────────
  function removeTab(url: string) {
    const remaining = siteTabs.filter(u => u !== url)
    setSiteTabs(remaining)
    if (activeUrl === url && remaining.length > 0) switchTab(remaining[remaining.length - 1])
  }

  // ── Switch primary site (header dropdown) ─────────────────
  async function handleSiteSwitch(url: string) {
    await supabase.from('jarvis_gsc_connections').update({ selected_site: url }).eq('org_id', orgId)
    setConn(prev => prev ? { ...prev, selectedSite: url } : null)
    setShowSwitcher(false)
    if (!siteTabs.includes(url)) setSiteTabs(prev => [...prev, url])
    switchTab(url)
  }

  async function handleSiteSelect(siteUrl: string) {
    await supabase.from('jarvis_gsc_connections').update({ selected_site: siteUrl }).eq('org_id', orgId)
    setConn(prev => prev ? { ...prev, selectedSite: siteUrl } : null)
  }

  async function handleDisconnect() {
    await supabase.from('jarvis_gsc_connections').delete().eq('org_id', orgId)
    localStorage.removeItem(`jarvis_gsc_tabs_${orgId}`)
    localStorage.removeItem(`jarvis_gsc_active_${orgId}`)
    setConn(null); setData(null); setSiteTabs([]); setActiveUrl(''); setDataCache(new Map())
  }

  function applyPreset(preset: DatePreset) {
    const range = getDateRange(preset, customStart, customEnd)
    dateRangeRef.current = range
    setDatePreset(preset)
    setShowMoreMenu(false)
    setDataCache(new Map())
    if (activeUrl) fetchData(activeUrl)
  }

  function applyCustom() {
    if (!customStart || !customEnd || customStart > customEnd) return
    const range = { startDate: customStart, endDate: customEnd }
    dateRangeRef.current = range
    setDatePreset('custom')
    setShowMoreMenu(false)
    setShowCustom(false)
    setDataCache(new Map())
    if (activeUrl) fetchData(activeUrl)
  }

  // ── Click-outside for More menu
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])


  const filteredQueries = (data?.queries ?? []).filter(q =>
    !filter || q.query.toLowerCase().includes(filter.toLowerCase())
  )

  function exportCSV() {
    if (!data || !activeUrl) return
    const site = activeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const date = new Date().toISOString().slice(0, 10)
    if (contentTab === 'queries') {
      downloadCSV(`gsc-queries-${site}-${date}.csv`,
        ['Query', 'Clicks', 'Impressions', 'CTR', 'Position'],
        filteredQueries.map(q => [q.query, q.clicks, q.impressions, q.ctr, q.position]),
      )
    } else if (contentTab === 'pages') {
      downloadCSV(`gsc-pages-${site}-${date}.csv`,
        ['URL', 'Clicks', 'Impressions', 'CTR', 'Position'],
        data.pages.map(p => [p.url, p.clicks, p.impressions, p.ctr, p.position]),
      )
    } else {
      downloadCSV(`gsc-trend-${site}-${date}.csv`,
        ['Date', 'Clicks', 'Impressions'],
        data.trend.map(r => [r.date, r.clicks, r.impressions]),
      )
    }
  }

  // ── Loading ───────────────────────────────────────────────
  if (connLoading) {
    return <div className="flex items-center justify-center h-64 text-muted text-sm">Checking GSC connection…</div>
  }

  // ── Not connected ─────────────────────────────────────────
  if (!conn) {
    return (
      <div className="space-y-5">
        <Card className="text-center py-12">
          <BarChart2 size={48} className="mb-4 text-muted mx-auto" strokeWidth={1} />
          <div className="font-display font-black text-xl text-tx mb-2">Google Search Console</div>
          <div className="text-sm text-muted max-w-md mx-auto leading-relaxed mb-6">
            Connect your GSC account to see real clicks, impressions, CTR, and position data.
          </div>
          {!clientId && (
            <div className="mb-4 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs max-w-md mx-auto">
              Google Client ID not set — add it in Settings to enable OAuth.
            </div>
          )}
          {connectError && (
            <div className="mb-4 mx-auto max-w-md px-3 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs text-left">
              <strong>Connection failed:</strong> {connectError}
            </div>
          )}
          <div className="flex justify-center mb-5">
            <Button
              variant="ai"
              disabled={connecting}
              onClick={() => {
                if (!clientId.trim()) return
                setConnectError(null); setConnecting(true)
                const authUrl = buildOAuthUrl(clientId.trim())
                const popup = window.open(authUrl, 'gsc-oauth', 'width=520,height=640,left=200,top=100')
                if (!popup) window.location.href = authUrl
              }}
            >
              {connecting
                ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /> Connecting…</>
                : <><ExternalLink size={13} /> Connect Google Search Console</>
              }
            </Button>
          </div>
          <div className="text-[11px] text-muted">OAuth 2.0 · read-only access · no data is written to your GSC account</div>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <MousePointer size={16} />, label: 'Clicks & CTR',      desc: 'Track click-through rates by query and page' },
            { icon: <Eye size={16} />,          label: 'Impressions',       desc: 'See your total SERP visibility over time' },
            { icon: <Hash size={16} />,         label: 'Position Tracking', desc: 'Average position for every keyword you rank for' },
            { icon: <Percent size={16} />,      label: 'Opportunity Gaps',  desc: 'High-impression, low-CTR pages to optimise' },
          ].map(f => (
            <Card key={f.label} className="text-center py-5">
              <div className="w-10 h-10 rounded-xl bg-[#00d4ff15] flex items-center justify-center text-accent mx-auto mb-3">{f.icon}</div>
              <div className="font-semibold text-xs text-tx mb-1">{f.label}</div>
              <div className="text-[10px] text-muted leading-relaxed">{f.desc}</div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ── Site picker (no site selected yet) ───────────────────
  if (!conn.selectedSite) {
    return (
      <div className="space-y-5">
        <Card className="text-center py-10">
          <Globe size={40} className="text-accent mx-auto mb-4" strokeWidth={1.25} />
          <div className="font-display font-black text-lg text-tx mb-2">Select a GSC Property</div>
          <div className="text-sm text-muted mb-6">Choose which Search Console property to connect to Jarvis</div>
          <div className="space-y-2 max-w-md mx-auto">
            {conn.availableSites.map(site => (
              <button
                key={site}
                onClick={() => handleSiteSelect(site)}
                className="w-full flex items-center gap-3 p-3 bg-surface border border-border rounded-xl hover:border-accent transition-colors cursor-pointer text-left"
              >
                <Globe size={14} className="text-accent shrink-0" />
                <span className="text-xs font-mono-jarvis text-tx">{site}</span>
              </button>
            ))}
          </div>
          <button onClick={handleDisconnect} className="mt-6 text-[11px] text-muted underline cursor-pointer hover:text-danger transition-colors">
            Disconnect
          </button>
        </Card>
      </div>
    )
  }

  // ── Connected ─────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Site tabs ──────────────────────────────────────── */}
      <div className="flex items-center gap-1 flex-wrap">
        {siteTabs.map(url => (
          <div
            key={url}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all select-none
              ${activeUrl === url
                ? 'bg-accent/15 border-accent text-accent'
                : 'bg-surface border-border text-muted hover:border-accent/50 hover:text-tx'}`}
          >
            <button onClick={() => switchTab(url)} className="truncate max-w-40 cursor-pointer font-mono-jarvis">
              {shortUrl(url)}
            </button>
            {siteTabs.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); removeTab(url) }}
                className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X size={10} />
              </button>
            )}
          </div>
        ))}

        {/* Add site */}
        {conn.availableSites.length > siteTabs.length && (
          <div className="relative">
            <button
              onClick={() => setShowAddPicker(p => !p)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-border text-muted hover:border-accent hover:text-accent transition-all text-xs cursor-pointer"
            >
              <Plus size={11} /> Add Site
            </button>
            {showAddPicker && (
              <SitePicker
                sites={conn.availableSites}
                excludeUrls={siteTabs}
                onSelect={addTab}
                onClose={() => setShowAddPicker(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Date Range Bar ─────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {QUICK_PRESETS.map(preset => (
          <button
            key={preset}
            onClick={() => applyPreset(preset)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border font-mono-jarvis ${
              datePreset === preset
                ? 'bg-accent text-black border-accent'
                : 'border-border text-muted hover:border-accent hover:text-tx'
            }`}
          >
            {PRESET_LABELS[preset]}
          </button>
        ))}

        {/* More ▼ */}
        <div className="relative" ref={moreMenuRef}>
          <button
            onClick={() => setShowMoreMenu(p => !p)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer font-mono-jarvis ${
              MORE_PRESETS.includes(datePreset)
                ? 'bg-accent text-black border-accent'
                : 'border-border text-muted hover:border-accent hover:text-tx'
            }`}
          >
            {MORE_PRESETS.includes(datePreset) ? PRESET_LABELS[datePreset] : 'More'}
            <ChevronDown size={11} className={`transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} />
          </button>

          {showMoreMenu && (
            <div className="absolute z-50 top-full mt-1.5 left-0 w-72 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <div className="font-semibold text-sm text-tx">Date range</div>
              </div>
              <div className="p-2 space-y-0.5">
                {(['6m', '12m', '16m'] as DatePreset[]).map(preset => (
                  <button
                    key={preset}
                    onClick={() => applyPreset(preset)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                      datePreset === preset ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-surface hover:text-tx'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      datePreset === preset ? 'border-accent' : 'border-border'
                    }`}>
                      {datePreset === preset && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                    </div>
                    {PRESET_LABELS[preset]}
                  </button>
                ))}
                <button
                  onClick={() => setShowCustom(p => !p)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                    datePreset === 'custom' ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-surface hover:text-tx'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    datePreset === 'custom' ? 'border-accent' : 'border-border'
                  }`}>
                    {datePreset === 'custom' && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                  </div>
                  Custom
                </button>

                {(showCustom || datePreset === 'custom') && (
                  <div className="px-2 pt-2 pb-1 space-y-3 border-t border-border mt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1">START DATE</div>
                        <input
                          type="date"
                          value={customStart}
                          onChange={e => setCustomStart(e.target.value)}
                          className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-tx outline-none focus:border-accent font-mono-jarvis"
                        />
                      </div>
                      <div>
                        <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1">END DATE</div>
                        <input
                          type="date"
                          value={customEnd}
                          onChange={e => setCustomEnd(e.target.value)}
                          className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-tx outline-none focus:border-accent font-mono-jarvis"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" className="text-[11px]"
                        onClick={() => { setShowMoreMenu(false); setShowCustom(false) }}>
                        Cancel
                      </Button>
                      <Button variant="primary" className="text-[11px]"
                        disabled={!customStart || !customEnd || customStart > customEnd}
                        onClick={applyCustom}>
                        Apply
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Header row ─────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 relative">
          <span className="w-2 h-2 rounded-full bg-accent3 animate-pulse shrink-0" />
          <button
            onClick={() => setShowSwitcher(p => !p)}
            className="flex items-center gap-1 group cursor-pointer"
          >
            <span className="text-xs text-accent3 font-mono-jarvis truncate max-w-sm group-hover:text-accent transition-colors">
              {activeUrl}
            </span>
            <ChevronDown size={12} className={`text-muted group-hover:text-accent transition-all ${showSwitcher ? 'rotate-180' : ''}`} />
          </button>
          {showSwitcher && (
            <SitePicker
              sites={conn.availableSites}
              onSelect={handleSiteSwitch}
              onClose={() => setShowSwitcher(false)}
              placeholder="Switch to a different site…"
            />
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted font-mono-jarvis">{PRESET_LABELS[datePreset]}</span>
          {data && (
            <Button variant="ghost" onClick={() => fetchData(activeUrl)}>
              <RefreshCw size={11} /> Refresh
            </Button>
          )}
          <Button variant="ghost" onClick={handleDisconnect}>
            <Unplug size={11} /> Disconnect
          </Button>
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────── */}
      {dataErr && (
        <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded-xl text-xs text-danger">
          <AlertCircle size={14} className="shrink-0" />
          <span className="flex-1">{dataErr}</span>
          <button onClick={() => fetchData(activeUrl)} className="underline cursor-pointer shrink-0">Retry</button>
        </div>
      )}

      {/* ── KPI row ────────────────────────────────────────── */}
      {dataLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Card key={i} className="h-24 animate-pulse bg-surface!" />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'TOTAL CLICKS',  val: data.kpis.clicks.toLocaleString(),     icon: <MousePointer size={14} />, color: '#00d4ff' },
            { label: 'IMPRESSIONS',   val: data.kpis.impressions.toLocaleString(), icon: <Eye size={14} />,          color: '#7c3aed' },
            { label: 'AVG. CTR',      val: data.kpis.ctr,                          icon: <Percent size={14} />,      color: '#10b981' },
            { label: 'AVG. POSITION', val: `#${data.kpis.position}`,              icon: <Hash size={14} />,         color: '#f59e0b' },
          ].map(k => (
            <Card key={k.label}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: k.color + '20', color: k.color }}>
                  {k.icon}
                </div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest">{k.label}</div>
              </div>
              <div className="font-display font-black text-2xl text-tx">{k.val}</div>
            </Card>
          ))}
        </div>
      ) : null}

      {/* ── Content tabs ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl w-fit">
          {(['overview', 'queries', 'pages'] as ContentTab[]).map(t => (
            <button key={t} onClick={() => setContentTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold font-mono-jarvis tracking-wide transition-all cursor-pointer capitalize
                ${contentTab === t ? 'bg-accent text-black' : 'text-muted hover:text-tx'}`}>
              {t}
            </button>
          ))}
        </div>
        {data && (
          <Button variant="ghost" className="text-[11px]" onClick={exportCSV}>
            <Download size={12} /> Export CSV
          </Button>
        )}
      </div>

      {/* ── Overview ───────────────────────────────────────── */}
      {contentTab === 'overview' && (
        dataLoading ? (
          <div className="text-center py-12 text-muted text-sm">Loading GSC data…</div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2">
              <CardTitle className="mb-4">Clicks &amp; Impressions (28d)</CardTitle>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.trend}>
                  <defs>
                    <linearGradient id="gClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gImpressions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:'var(--color-muted)' }} />
                  <YAxis tick={{ fontSize:10, fill:'var(--color-muted)' }} />
                  <Tooltip contentStyle={{ background:'var(--color-card)', border:'1px solid var(--color-border)', fontSize:11 }} />
                  <Area type="monotone" dataKey="impressions" stroke="#7c3aed" fill="url(#gImpressions)" strokeWidth={2} name="Impressions" />
                  <Area type="monotone" dataKey="clicks"      stroke="#00d4ff" fill="url(#gClicks)"      strokeWidth={2} name="Clicks" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <CardTitle className="mb-4">Position Distribution</CardTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={posDist(data.queries)} layout="vertical">
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize:10, fill:'var(--color-muted)' }} />
                  <YAxis dataKey="range" type="category" tick={{ fontSize:10, fill:'var(--color-muted)' }} width={36} />
                  <Tooltip contentStyle={{ background:'var(--color-card)', border:'1px solid var(--color-border)', fontSize:11 }} />
                  <Bar dataKey="pages" fill="#7c3aed" radius={[0,4,4,0]} name="Queries" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        ) : null
      )}

      {/* ── Queries ────────────────────────────────────────── */}
      {contentTab === 'queries' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Top Queries</CardTitle>
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter queries…"
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors w-48"
            />
          </div>
          {dataLoading ? (
            <div className="py-10 text-center text-muted text-sm">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Query', 'Clicks', 'Impressions', 'CTR', 'Position'].map(h => (
                      <th key={h} className="text-left text-[10px] text-muted font-mono-jarvis tracking-widest pb-2 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredQueries.map((q, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-surface transition-colors">
                      <td className="py-2.5 pr-4 font-mono-jarvis text-tx">{q.query}</td>
                      <td className="py-2.5 pr-4 text-accent font-semibold">{q.clicks.toLocaleString()}</td>
                      <td className="py-2.5 pr-4 text-muted">{q.impressions.toLocaleString()}</td>
                      <td className="py-2.5 pr-4 text-muted">{q.ctr}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`font-semibold ${q.position <= 3 ? 'text-accent3' : q.position <= 10 ? 'text-accent4' : 'text-muted'}`}>
                          #{q.position}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredQueries.length === 0 && (
                <div className="text-center py-8 text-muted text-sm">No queries found</div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ── Pages ──────────────────────────────────────────── */}
      {contentTab === 'pages' && (
        <Card>
          <CardTitle className="mb-4">Top Pages</CardTitle>
          {dataLoading ? (
            <div className="py-10 text-center text-muted text-sm">Loading…</div>
          ) : (
            <div className="space-y-2">
              {(data?.pages ?? []).map((p, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-surface border border-border rounded-lg flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono-jarvis text-accent truncate">{p.url}</div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-[11px]">
                    <div className="text-right">
                      <div className="text-tx font-semibold">{p.clicks.toLocaleString()}</div>
                      <div className="text-muted">clicks</div>
                    </div>
                    <div className="text-right">
                      <div className="text-muted">{p.impressions.toLocaleString()}</div>
                      <div className="text-muted">impr.</div>
                    </div>
                    <div className="text-right">
                      <div className="text-accent3 font-semibold">{p.ctr}</div>
                      <div className="text-muted">CTR</div>
                    </div>
                    <Badge variant={p.position <= 3 ? 'green' : p.position <= 10 ? 'amber' : 'muted'}>
                      #{p.position}
                    </Badge>
                  </div>
                </div>
              ))}
              {(data?.pages ?? []).length === 0 && (
                <div className="text-center py-8 text-muted text-sm">No page data</div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
