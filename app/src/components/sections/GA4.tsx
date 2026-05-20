import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Activity, TrendingUp, TrendingDown, Clock, MousePointerClick,
  ArrowUpRight, Loader2, Unplug, Search, Plus, X, ChevronDown, Download,
  Users, DollarSign, Globe, MapPin, Monitor, Zap,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { supabase } from '@/lib/supabase'
import { downloadCSV } from '@/lib/csv'
import { useAuthStore } from '@/store/authStore'
import { useStore } from '@/store'

// ── Types ─────────────────────────────────────────────────────
interface GA4Conn {
  propertyId:   string
  propertyName: string
  availableProperties: { id: string; displayName: string; accountName: string }[]
}

interface Kpis {
  sessions:       number
  pageviews:      number
  engagementRate: number
  avgDuration:    number
  newUsers:       number
  bounceRate:     number
  revenue:        number
}

interface TrendRow   { date: string; sessions: number; pageviews: number }
interface ChannelRow { channel: string; sessions: number }
interface PageRow    { page: string; sessions: number; engagementRate: string }
interface GeoRow     { name: string; sessions: number }
interface TechRow    { name: string; sessions: number }
interface EventRow   { name: string; count: number }

interface SiteData {
  kpis:      Kpis | null
  trend:     TrendRow[]
  channels:  ChannelRow[]
  pages:     PageRow[]
  countries: GeoRow[]
  cities:    GeoRow[]
  devices:   TechRow[]
  browsers:  TechRow[]
  events:    EventRow[]
}

interface Tab { id: string; name: string }

// ── Helpers ───────────────────────────────────────────────────
const GA4_SCOPES = 'https://www.googleapis.com/auth/analytics.readonly'

function buildOAuthUrl(clientId: string): string {
  const state = crypto.randomUUID()
  sessionStorage.setItem('ga4_oauth_state', state)
  const p = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  window.location.origin,
    response_type: 'code',
    scope:         GA4_SCOPES,
    access_type:   'offline',
    prompt:        'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`
}

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function fmtRevenue(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(1) + 'K'
  return '$' + n.toFixed(2)
}

type RawReport = {
  dimensionHeaders?: { name: string }[]
  metricHeaders?:    { name: string }[]
  rows?: {
    dimensionValues?: { value: string }[]
    metricValues?:    { value: string }[]
  }[]
}

function parseRows(data: RawReport | null | undefined): Record<string, string>[] {
  if (!data?.rows) return []
  const dimHeaders = (data.dimensionHeaders ?? []).map(h => h.name)
  const metHeaders = (data.metricHeaders   ?? []).map(h => h.name)
  return data.rows.map(row => {
    const obj: Record<string, string> = {}
    row.dimensionValues?.forEach((v, i) => { obj[dimHeaders[i]] = v.value })
    row.metricValues?.forEach((v, i)   => { obj[metHeaders[i]] = v.value })
    return obj
  })
}

// ── Property Picker (reusable popover list) ───────────────────
function PropertyPicker({
  properties, excludeIds, onSelect, onClose, placeholder = 'Search properties…',
}: {
  properties:   GA4Conn['availableProperties']
  excludeIds?:  string[]
  onSelect:     (p: { id: string; displayName: string; accountName: string }) => void
  onClose:      () => void
  placeholder?: string
}) {
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const filtered = properties.filter(p => {
    if (excludeIds?.includes(p.id)) return false
    if (!q.trim()) return true
    const lq = q.toLowerCase()
    return p.displayName.toLowerCase().includes(lq) || p.accountName.toLowerCase().includes(lq) || p.id.includes(lq)
  })

  return (
    <div ref={ref} className="absolute z-50 top-full mt-1 left-0 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder}
            className="w-full pl-7 pr-2 py-1.5 bg-surface border border-border rounded-lg text-xs text-tx outline-none focus:border-accent font-mono-jarvis"
          />
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted">No match</div>
        ) : filtered.map(p => (
          <button key={p.id} onClick={() => onSelect(p)}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface text-left transition-colors border-b border-border/50 last:border-0"
          >
            <div className="min-w-0">
              <div className="text-xs font-medium text-tx truncate">{p.displayName}</div>
              <div className="text-[10px] text-muted font-mono-jarvis truncate">{p.accountName}</div>
            </div>
            <ArrowUpRight size={12} className="text-muted shrink-0 ml-2" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Initial property selector (full-page) ─────────────────────
function PropertySelector({
  properties, onSelect, onDisconnect,
}: {
  properties:   GA4Conn['availableProperties']
  onSelect:     (id: string, name: string) => void
  onDisconnect: () => void
}) {
  const [query, setQuery] = useState('')
  const filtered = query.trim()
    ? properties.filter(p =>
        p.displayName.toLowerCase().includes(query.toLowerCase()) ||
        p.accountName.toLowerCase().includes(query.toLowerCase()) ||
        p.id.includes(query)
      )
    : properties

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-display font-black text-lg text-tx">Select a GA4 Property</div>
            <div className="text-sm text-muted mt-0.5">{properties.length} properties found · choose which to connect</div>
          </div>
          <button onClick={onDisconnect} className="text-[11px] text-muted hover:text-danger transition-colors flex items-center gap-1">
            <Unplug size={11} /> Disconnect
          </button>
        </div>
        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or domain…"
            className="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded-lg text-xs text-tx outline-none focus:border-accent transition-colors font-mono-jarvis"
          />
        </div>
        <div className="space-y-1.5 max-h-120 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted">No properties match "{query}"</div>
          ) : filtered.map(p => (
            <button key={p.id} onClick={() => onSelect(p.id, p.displayName)}
              className="w-full flex items-center justify-between px-4 py-3 bg-surface border border-border rounded-xl hover:border-accent transition-colors cursor-pointer text-left"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-tx truncate">{p.displayName}</div>
                <div className="text-[10px] text-muted font-mono-jarvis truncate">{p.accountName} · {p.id}</div>
              </div>
              <ArrowUpRight size={14} className="text-muted shrink-0 ml-3" />
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── Shared bar-list sub-component ─────────────────────────────
function BarList({ rows, valueKey = 'sessions' }: { rows: { name: string; sessions?: number; count?: number }[]; valueKey?: string }) {
  const vals = rows.map(r => (valueKey === 'count' ? (r as EventRow).count : (r as GeoRow).sessions) ?? 0)
  const max   = Math.max(...vals, 1)
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => {
        const val = vals[i]
        const pct = Math.round((val / max) * 100)
        return (
          <div key={r.name + i}>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-tx font-medium truncate">{r.name || '(unknown)'}</span>
              <span className="font-mono-jarvis text-muted shrink-0 ml-2">{val.toLocaleString()}</span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────
export function GA4() {
  const orgId    = useAuthStore().org?.id ?? ''
  const clientId = useStore(s => s.googleClientId)

  // ── Date range
  const [dateRange, setDateRange] = useState('28daysAgo')
  const DATE_RANGES = [
    { label: '7d',  value: '7daysAgo'   },
    { label: '28d', value: '28daysAgo'  },
    { label: '90d', value: '90daysAgo'  },
    { label: '6m',  value: '180daysAgo' },
  ]

  // ── Connection state
  const [conn,         setConn]         = useState<GA4Conn | null>(null)
  const [connLoading,  setConnLoading]  = useState(true)
  const [connecting,   setConnecting]   = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  // ── Multi-site tab state
  const [tabs,        setTabs]        = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState('')
  const [dataCache,   setDataCache]   = useState<Map<string, SiteData>>(new Map())

  // ── Core data
  const [kpis,     setKpis]     = useState<Kpis | null>(null)
  const [trend,    setTrend]    = useState<TrendRow[]>([])
  const [channels, setChannels] = useState<ChannelRow[]>([])
  const [pages,    setPages]    = useState<PageRow[]>([])

  // ── Extended data
  const [countries, setCountries] = useState<GeoRow[]>([])
  const [cities,    setCities]    = useState<GeoRow[]>([])
  const [devices,   setDevices]   = useState<TechRow[]>([])
  const [browsers,  setBrowsers]  = useState<TechRow[]>([])
  const [events,    setEvents]    = useState<EventRow[]>([])

  // ── Realtime
  const [realtimeUsers, setRealtimeUsers] = useState<number | null>(null)
  const activeTabRef = useRef(activeTabId)
  activeTabRef.current = activeTabId

  // ── Loading/error
  const [dataLoading, setDataLoading] = useState(false)
  const [dataErr,     setDataErr]     = useState<string | null>(null)

  // ── Popover visibility
  const [showSwitcher,  setShowSwitcher]  = useState(false)
  const [showAddPicker, setShowAddPicker] = useState(false)

  // ── Fetch connection row ──────────────────────────────────
  const fetchConn = useCallback(async () => {
    if (!orgId) return
    setConnLoading(true)
    const { data } = await supabase
      .from('jarvis_ga4_connections')
      .select('property_id, property_name, available_properties')
      .eq('org_id', orgId)
      .maybeSingle() as {
        data: { property_id: string | null; property_name: string | null; available_properties: GA4Conn['availableProperties'] } | null
      }
    if (!data) {
      setConn(null)
    } else {
      setConn({
        propertyId:          data.property_id   ?? '',
        propertyName:        data.property_name ?? '',
        availableProperties: data.available_properties ?? [],
      })
    }
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
      if (!success) setConnectError(error ?? 'Connection failed')
      else { setConnectError(null); fetchConn() }
    }
    window.addEventListener('ga4-auth-result', h)
    return () => window.removeEventListener('ga4-auth-result', h)
  }, [fetchConn])

  // ── Realtime polling ─────────────────────────────────────
  useEffect(() => {
    if (!activeTabId || !orgId) { setRealtimeUsers(null); return }

    function doFetch() {
      const tabId = activeTabRef.current
      if (!tabId) return
      supabase.functions.invoke('ga4-proxy', {
        body: {
          org_id: orgId, property_id: tabId,
          mode: 'runRealtimeReport',
          report: { metrics: [{ name: 'activeUsers' }] },
        },
      }).then(res => {
        const rows = res.data?.rows
        if (rows && rows.length > 0) {
          setRealtimeUsers(Number(rows[0].metricValues?.[0]?.value ?? 0))
        } else {
          setRealtimeUsers(0)
        }
      }).catch(() => setRealtimeUsers(null))
    }

    doFetch()
    const id = setInterval(doFetch, 60_000)
    return () => clearInterval(id)
  }, [activeTabId, orgId])

  // ── Fetch all data for a property (batched) ─────────────
  const fetchData = useCallback(async (propertyId: string, range = '28daysAgo') => {
    if (!orgId) return
    setDataLoading(true)
    setDataErr(null)

    const dr = [{ startDate: range, endDate: 'today' }]

    try {
      const [coreRes, extRes] = await Promise.all([
        // Batch 1: trend, channels, pages, KPIs
        supabase.functions.invoke('ga4-proxy', {
          body: {
            org_id, property_id: propertyId, mode: 'batchRunReports',
            reports: [
              {
                dateRanges: dr,
                dimensions: [{ name: 'date' }],
                metrics:    [{ name: 'sessions' }, { name: 'screenPageViews' }],
                orderBys:   [{ dimension: { dimensionName: 'date' } }],
              },
              {
                dateRanges: dr,
                dimensions: [{ name: 'sessionDefaultChannelGrouping' }],
                metrics:    [{ name: 'sessions' }],
                orderBys:   [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: 8,
              },
              {
                dateRanges: dr,
                dimensions: [{ name: 'pagePath' }],
                metrics:    [{ name: 'sessions' }, { name: 'engagementRate' }],
                orderBys:   [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: 8,
              },
              {
                dateRanges: dr,
                metrics: [
                  { name: 'sessions' }, { name: 'screenPageViews' },
                  { name: 'engagementRate' }, { name: 'averageSessionDuration' },
                  { name: 'newUsers' }, { name: 'bounceRate' }, { name: 'totalRevenue' },
                ],
              },
            ],
          },
        }),
        // Batch 2: geo, tech, events
        supabase.functions.invoke('ga4-proxy', {
          body: {
            org_id, property_id: propertyId, mode: 'batchRunReports',
            reports: [
              {
                dateRanges: dr,
                dimensions: [{ name: 'country' }],
                metrics:    [{ name: 'sessions' }],
                orderBys:   [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: 10,
              },
              {
                dateRanges: dr,
                dimensions: [{ name: 'city' }],
                metrics:    [{ name: 'sessions' }],
                orderBys:   [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: 10,
              },
              {
                dateRanges: dr,
                dimensions: [{ name: 'deviceCategory' }],
                metrics:    [{ name: 'sessions' }],
                orderBys:   [{ metric: { metricName: 'sessions' }, desc: true }],
              },
              {
                dateRanges: dr,
                dimensions: [{ name: 'browser' }],
                metrics:    [{ name: 'sessions' }],
                orderBys:   [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: 8,
              },
              {
                dateRanges: dr,
                dimensions: [{ name: 'eventName' }],
                metrics:    [{ name: 'eventCount' }],
                orderBys:   [{ metric: { metricName: 'eventCount' }, desc: true }],
                limit: 10,
              },
            ],
          },
        }),
      ])

      const core = (coreRes.data?.reports ?? []) as (RawReport | null)[]
      const ext  = (extRes.data?.reports  ?? []) as (RawReport | null)[]

      const newTrend = parseRows(core[0]).map(r => ({
        date:      r.date.slice(4, 6) + '-' + r.date.slice(6, 8),
        sessions:  Number(r.sessions),
        pageviews: Number(r.screenPageViews),
      }))
      const newChannels = parseRows(core[1]).map(r => ({
        channel:  r.sessionDefaultChannelGrouping,
        sessions: Number(r.sessions),
      }))
      const newPages = parseRows(core[2]).map(r => ({
        page:           r.pagePath,
        sessions:       Number(r.sessions),
        engagementRate: (Number(r.engagementRate) * 100).toFixed(0) + '%',
      }))
      const kpiRow  = parseRows(core[3])[0] ?? {}
      const newKpis: Kpis = {
        sessions:       Number(kpiRow.sessions       ?? 0),
        pageviews:      Number(kpiRow.screenPageViews ?? 0),
        engagementRate: Number(kpiRow.engagementRate  ?? 0),
        avgDuration:    Number(kpiRow.averageSessionDuration ?? 0),
        newUsers:       Number(kpiRow.newUsers        ?? 0),
        bounceRate:     Number(kpiRow.bounceRate      ?? 0),
        revenue:        Number(kpiRow.totalRevenue    ?? 0),
      }

      const newCountries = parseRows(ext[0]).map(r => ({ name: r.country,       sessions: Number(r.sessions) }))
      const newCities    = parseRows(ext[1]).map(r => ({ name: r.city,           sessions: Number(r.sessions) }))
      const newDevices   = parseRows(ext[2]).map(r => ({ name: r.deviceCategory, sessions: Number(r.sessions) }))
      const newBrowsers  = parseRows(ext[3]).map(r => ({ name: r.browser,        sessions: Number(r.sessions) }))
      const newEvents    = parseRows(ext[4]).map(r => ({ name: r.eventName,       count:    Number(r.eventCount) }))

      const siteData: SiteData = {
        kpis: newKpis, trend: newTrend, channels: newChannels, pages: newPages,
        countries: newCountries, cities: newCities, devices: newDevices,
        browsers: newBrowsers, events: newEvents,
      }

      setDataCache(prev => new Map(prev).set(propertyId, siteData))

      setActiveTabId(cur => {
        if (cur === propertyId || cur === '') {
          setKpis(newKpis); setTrend(newTrend); setChannels(newChannels); setPages(newPages)
          setCountries(newCountries); setCities(newCities); setDevices(newDevices)
          setBrowsers(newBrowsers); setEvents(newEvents)
        }
        return cur
      })
    } catch (e) {
      setDataErr(e instanceof Error ? e.message : 'Failed to fetch GA4 data')
    } finally {
      setDataLoading(false)
    }
  }, [orgId])

  // ── Persist tabs ─────────────────────────────────────────
  useEffect(() => {
    if (!orgId || tabs.length === 0) return
    localStorage.setItem(`jarvis_ga4_tabs_${orgId}`, JSON.stringify(tabs))
  }, [tabs, orgId])

  useEffect(() => {
    if (!orgId || !activeTabId) return
    localStorage.setItem(`jarvis_ga4_active_${orgId}`, activeTabId)
  }, [activeTabId, orgId])

  // ── Initialise tabs ───────────────────────────────────────
  useEffect(() => {
    if (!conn?.propertyId || conn.propertyId === '' || !orgId) return
    try {
      const saved = localStorage.getItem(`jarvis_ga4_tabs_${orgId}`)
      if (saved) {
        const savedTabs = JSON.parse(saved) as Tab[]
        const validIds  = conn.availableProperties.map(p => p.id)
        const valid     = savedTabs.filter(t => validIds.includes(t.id))
        if (valid.length > 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setTabs(valid)
          const savedActive = localStorage.getItem(`jarvis_ga4_active_${orgId}`)
          const toLoad = (savedActive && valid.some(t => t.id === savedActive)) ? savedActive : valid[0].id
          setActiveTabId(toLoad)
          fetchData(toLoad)
          return
        }
      }
    } catch { /* ignore parse errors */ }
    setTabs([{ id: conn.propertyId, name: conn.propertyName || conn.propertyId }])
    setActiveTabId(conn.propertyId)
    fetchData(conn.propertyId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn?.propertyId, orgId])

  // ── Tab actions ───────────────────────────────────────────
  function applyData(d: SiteData) {
    setKpis(d.kpis); setTrend(d.trend); setChannels(d.channels); setPages(d.pages)
    setCountries(d.countries); setCities(d.cities); setDevices(d.devices)
    setBrowsers(d.browsers); setEvents(d.events)
    setDataErr(null)
  }

  function switchTab(tabId: string) {
    setActiveTabId(tabId)
    const cached = dataCache.get(tabId)
    if (cached) {
      applyData(cached)
    } else {
      fetchData(tabId, dateRange)
    }
  }

  function changeRange(newRange: string) {
    setDateRange(newRange)
    setDataCache(new Map())
    if (activeTabId) fetchData(activeTabId, newRange)
  }

  function addTab(p: { id: string; displayName: string }) {
    setShowAddPicker(false)
    if (tabs.some(t => t.id === p.id)) { switchTab(p.id); return }
    setTabs(prev => [...prev, { id: p.id, name: p.displayName }])
    switchTab(p.id)
  }

  function removeTab(tabId: string) {
    const remaining = tabs.filter(t => t.id !== tabId)
    setTabs(remaining)
    if (activeTabId === tabId && remaining.length > 0) {
      switchTab(remaining[remaining.length - 1].id)
    }
  }

  async function handlePropertySelect(propertyId: string, propertyName: string) {
    await supabase.from('jarvis_ga4_connections').update({ property_id: propertyId, property_name: propertyName }).eq('org_id', orgId)
    setConn(prev => prev ? { ...prev, propertyId, propertyName } : null)
    setShowSwitcher(false)
    if (!tabs.some(t => t.id === propertyId)) {
      setTabs(prev => [...prev, { id: propertyId, name: propertyName }])
    }
    switchTab(propertyId)
  }

  async function handleDisconnect() {
    await supabase.from('jarvis_ga4_connections').delete().eq('org_id', orgId)
    localStorage.removeItem(`jarvis_ga4_tabs_${orgId}`)
    localStorage.removeItem(`jarvis_ga4_active_${orgId}`)
    setConn(null); setKpis(null); setTrend([]); setChannels([]); setPages([])
    setCountries([]); setCities([]); setDevices([]); setBrowsers([]); setEvents([])
    setTabs([]); setActiveTabId(''); setDataCache(new Map()); setRealtimeUsers(null)
  }

  // ── Loading ───────────────────────────────────────────────
  if (connLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted text-sm gap-2">
        <Loader2 size={16} className="animate-spin" /> Checking GA4 connection…
      </div>
    )
  }

  // ── Not connected ─────────────────────────────────────────
  if (!conn) {
    return (
      <div className="space-y-5">
        <Card className="text-center py-12">
          <Activity size={48} className="mb-4 text-muted mx-auto" strokeWidth={1} />
          <div className="font-display font-black text-xl text-tx mb-2">Google Analytics 4</div>
          <div className="text-sm text-muted max-w-md mx-auto leading-relaxed mb-6">
            Connect your GA4 property to see sessions, pageviews, engagement rate, channel breakdown, and top pages.
          </div>
          {connectError && (
            <div className="mb-4 mx-auto max-w-md px-3 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs text-left">
              <strong>Connection failed:</strong> {connectError}
            </div>
          )}
          <div className="flex justify-center mb-5">
            <Button variant="primary" disabled={connecting} onClick={() => {
              setConnectError(null); setConnecting(true)
              const url = buildOAuthUrl(clientId)
              const popup = window.open(url, 'ga4-oauth', 'width=520,height=640,left=200,top=100')
              if (!popup) window.location.href = url
            }}>
              {connecting
                ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /> Connecting…</>
                : <>Connect Google Analytics 4</>
              }
            </Button>
          </div>
          <div className="text-[11px] text-muted">OAuth 2.0 · read-only access · no data is written to your GA4 property</div>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { icon: <Activity size={16} />,         label: 'Sessions',          desc: 'Real-time and 28-day historical traffic' },
            { icon: <MousePointerClick size={16} />, label: 'Engagement',        desc: 'Bounce rate, session duration, interactions' },
            { icon: <TrendingUp size={16} />,        label: 'Channel Breakdown', desc: 'Organic vs direct vs referral vs paid' },
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

  // ── Initial property selector ─────────────────────────────
  if (!conn.propertyId || conn.propertyId === '') {
    return (
      <PropertySelector
        properties={conn.availableProperties}
        onSelect={handlePropertySelect}
        onDisconnect={handleDisconnect}
      />
    )
  }

  // ── Connected — show data ─────────────────────────────────
  const activeTab     = tabs.find(t => t.id === activeTabId)
  const totalSessions = channels.reduce((s, r) => s + r.sessions, 0)

  function exportCSV(type: 'trend' | 'channels' | 'pages' | 'events') {
    const prop = activeTab?.name ?? activeTabId
    const date = new Date().toISOString().slice(0, 10)
    if (type === 'trend') {
      downloadCSV(`ga4-trend-${prop}-${date}.csv`, ['Date', 'Sessions', 'Pageviews'], trend.map(r => [r.date, r.sessions, r.pageviews]))
    } else if (type === 'channels') {
      downloadCSV(`ga4-channels-${prop}-${date}.csv`, ['Channel', 'Sessions', '% of Total'],
        channels.map(r => [r.channel, r.sessions, totalSessions ? ((r.sessions / totalSessions) * 100).toFixed(1) + '%' : '0%']))
    } else if (type === 'pages') {
      downloadCSV(`ga4-pages-${prop}-${date}.csv`, ['Page', 'Sessions', 'Engagement Rate'], pages.map(r => [r.page, r.sessions, r.engagementRate]))
    } else {
      downloadCSV(`ga4-events-${prop}-${date}.csv`, ['Event', 'Count'], events.map(r => [r.name, r.count]))
    }
  }

  return (
    <div className="space-y-4">

      {/* ── Tab bar ──────────────────────────────────────── */}
      <div className="flex items-center gap-1 flex-wrap">
        {tabs.map(tab => (
          <div key={tab.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all select-none ${
              activeTabId === tab.id
                ? 'bg-accent/15 border-accent text-accent'
                : 'bg-surface border-border text-muted hover:border-accent/50 hover:text-tx'}`}
          >
            <button onClick={() => switchTab(tab.id)} className="truncate max-w-36 cursor-pointer">{tab.name}</button>
            {tabs.length > 1 && (
              <button onClick={e => { e.stopPropagation(); removeTab(tab.id) }} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
                <X size={10} />
              </button>
            )}
          </div>
        ))}

        <div className="relative">
          <button onClick={() => setShowAddPicker(p => !p)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-border text-muted hover:border-accent hover:text-accent transition-all text-xs cursor-pointer">
            <Plus size={11} /> Add Site
          </button>
          {showAddPicker && (
            <PropertyPicker
              properties={conn.availableProperties}
              excludeIds={tabs.map(t => t.id)}
              onSelect={p => addTab({ id: p.id, displayName: p.displayName })}
              onClose={() => setShowAddPicker(false)}
            />
          )}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {DATE_RANGES.map(r => (
            <button key={r.value} onClick={() => changeRange(r.value)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono-jarvis font-medium transition-all cursor-pointer ${
                dateRange === r.value
                  ? 'bg-accent/20 text-accent border border-accent/40'
                  : 'text-muted hover:text-tx border border-transparent'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Property header ───────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="relative">
            <button onClick={() => setShowSwitcher(p => !p)} className="flex items-center gap-1.5 group cursor-pointer">
              <CardTitle className="group-hover:text-accent transition-colors">{activeTab?.name ?? conn.propertyName}</CardTitle>
              <ChevronDown size={13} className={`text-muted group-hover:text-accent transition-all ${showSwitcher ? 'rotate-180' : ''}`} />
            </button>
            <div className="text-[11px] text-muted font-mono-jarvis mt-0.5">{activeTabId} · {DATE_RANGES.find(r => r.value === dateRange)?.label ?? '28d'}</div>
            {showSwitcher && (
              <PropertyPicker
                properties={conn.availableProperties}
                onSelect={p => handlePropertySelect(p.id, p.displayName)}
                onClose={() => setShowSwitcher(false)}
                placeholder="Switch to a different property…"
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Realtime badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent3/10 border border-accent3/20">
              <span className="w-1.5 h-1.5 rounded-full bg-accent3 animate-pulse" />
              <span className="text-[11px] text-accent3 font-mono-jarvis font-medium">
                {realtimeUsers === null ? '—' : realtimeUsers.toLocaleString()} active now
              </span>
            </div>
            {(trend.length > 0 || channels.length > 0 || pages.length > 0) && (
              <div className="relative group">
                <button className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer border border-border rounded-lg px-2 py-1">
                  <Download size={11} /> Export
                </button>
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg py-1 z-20 w-32 hidden group-hover:block">
                  {(['trend', 'channels', 'pages', 'events'] as const).map(t => (
                    <button key={t} onClick={() => exportCSV(t)}
                      className="w-full text-left px-3 py-1.5 text-xs text-tx hover:bg-surface transition-colors capitalize cursor-pointer">
                      {t === 'trend' ? 'Trend data' : t === 'channels' ? 'Channels' : t === 'pages' ? 'Top pages' : 'Events'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button onClick={handleDisconnect}
              className="text-[11px] text-muted hover:text-danger transition-colors cursor-pointer flex items-center gap-1">
              <Unplug size={11} /> Disconnect
            </button>
          </div>
        </div>
      </Card>

      {/* ── KPIs (6 cards) ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {([
          { label: 'SESSIONS',        val: kpis ? kpis.sessions.toLocaleString()               : '—', color: '#00d4ff', icon: Activity,         tip: 'A session is a group of user interactions within a given time frame. A new session starts after 30 minutes of inactivity.' },
          { label: 'PAGEVIEWS',       val: kpis ? kpis.pageviews.toLocaleString()              : '—', color: '#10b981', icon: MousePointerClick, tip: 'Total number of pages viewed, including repeated views. High pageviews relative to sessions indicates good content depth.' },
          { label: 'NEW USERS',       val: kpis ? kpis.newUsers.toLocaleString()               : '—', color: '#8b5cf6', icon: Users,             tip: 'Users visiting your site for the very first time in the selected period. Tracks growth of your new audience.' },
          { label: 'ENGAGEMENT RATE', val: kpis ? (kpis.engagementRate * 100).toFixed(1) + '%' : '—', color: '#f59e0b', icon: TrendingUp,        tip: 'Percentage of sessions lasting 10+ seconds, with a conversion, or with 2+ page views. The inverse of Bounce Rate in GA4.' },
          { label: 'AVG SESSION',     val: kpis ? fmtDuration(kpis.avgDuration)                : '—', color: '#06b6d4', icon: Clock,             tip: 'Average duration of engaged sessions (m:ss). Longer sessions typically signal higher content quality and user intent.' },
          { label: 'BOUNCE RATE',     val: kpis ? (kpis.bounceRate * 100).toFixed(1) + '%'    : '—', color: '#ef4444', icon: TrendingDown,      tip: 'Percentage of sessions that were NOT engaged — left quickly without meaningful interaction. Lower is better.' },
        ] as const).map(({ label, val, color, icon: Icon, tip }) => (
          <Card key={label} className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '20' }}>
                <Icon size={15} style={{ color }} />
              </div>
              {dataLoading && <Loader2 size={12} className="animate-spin text-muted" />}
            </div>
            <div className="text-2xl font-display font-black" style={{ color }}>{val}</div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mt-1 flex items-center gap-1">
              {label} <InfoTooltip text={tip} />
            </div>
          </Card>
        ))}
      </div>

      {/* ── Revenue card (shown if any revenue exists) ────── */}
      {kpis && kpis.revenue > 0 && (
        <Card className="py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10b98120] flex items-center justify-center">
              <DollarSign size={18} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-display font-black text-emerald-400">{fmtRevenue(kpis.revenue)}</div>
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest flex items-center gap-1">
                TOTAL REVENUE <InfoTooltip text="Total revenue from purchase events tracked via GA4 e-commerce. Requires purchase event implementation on your site." />
              </div>
            </div>
          </div>
        </Card>
      )}

      {dataErr && (
        <div className="px-3 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">{dataErr}</div>
      )}

      {/* ── Trend + Channels ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardTitle className="mb-4 flex items-center gap-1.5">
            Sessions &amp; Pageviews ({DATE_RANGES.find(r => r.value === dateRange)?.label ?? '28d'})
            <InfoTooltip text="Daily trend of sessions and pageviews. Diverging lines may indicate users visiting fewer pages per session." />
          </CardTitle>
          {dataLoading ? (
            <div className="h-52 flex items-center justify-center"><Loader2 size={22} className="animate-spin text-muted" /></div>
          ) : trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={208}>
              <AreaChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gPv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="pageviews" stroke="#10b981" strokeWidth={1.5} fill="url(#gPv)"   name="Pageviews" />
                <Area type="monotone" dataKey="sessions"  stroke="#00d4ff" strokeWidth={2}   fill="url(#gSess)" name="Sessions"  />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-sm text-muted">No data</div>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-4 flex items-center gap-1.5">
            Channel Breakdown
            <InfoTooltip text="How sessions are distributed across traffic sources — Organic Search, Direct, Referral, Paid, Email, Social, etc." />
          </CardTitle>
          {dataLoading ? (
            <div className="h-52 flex items-center justify-center"><Loader2 size={22} className="animate-spin text-muted" /></div>
          ) : channels.length > 0 ? (
            <div className="space-y-3">
              {channels.map(r => {
                const pct = totalSessions > 0 ? Math.round((r.sessions / totalSessions) * 100) : 0
                return (
                  <div key={r.channel}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-tx font-medium truncate">{r.channel}</span>
                      <span className="font-mono-jarvis text-muted shrink-0 ml-2">{r.sessions.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[10px] text-muted mt-0.5 font-mono-jarvis">{pct}%</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-muted text-center pt-10">No data</div>
          )}
        </Card>
      </div>

      {/* ── Top Pages ─────────────────────────────────────── */}
      <Card>
        <CardTitle className="mb-4 flex items-center gap-1.5">
          Top Pages by Sessions
          <InfoTooltip text="Pages ranked by sessions. High-traffic pages with low engagement rates are candidates for content improvement." />
        </CardTitle>
        {dataLoading ? (
          <div className="h-32 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-muted" /></div>
        ) : pages.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={pages.slice(0, 6)} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="page" tick={{ fontSize: 10, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} width={140} />
                <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="sessions" fill="#00d4ff" radius={[0, 3, 3, 0]} name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1">
              {pages.slice(0, 6).map(p => (
                <div key={p.page} className="flex items-center justify-between gap-3 py-1 border-b border-border last:border-0">
                  <span className="text-xs font-mono-jarvis text-accent truncate flex-1">{p.page}</span>
                  <span className="text-[11px] font-mono-jarvis text-tx shrink-0">{p.sessions.toLocaleString()} sess</span>
                  <span className="text-[11px] font-mono-jarvis text-muted shrink-0 flex items-center gap-0.5">
                    eng {p.engagementRate}
                    <InfoTooltip text="Engagement Rate for this page — share of sessions that were engaged (10s+ active, conversion, or 2+ pages)." side="left" />
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted text-center py-8">No page data</div>
        )}
      </Card>

      {/* ── Geo Breakdown ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardTitle className="mb-4 flex items-center gap-1.5">
            <Globe size={14} className="text-accent" /> Top Countries
            <InfoTooltip text="Countries sending the most sessions to your site. Useful for identifying geographic markets and localisation opportunities." />
          </CardTitle>
          {dataLoading ? (
            <div className="h-40 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-muted" /></div>
          ) : countries.length > 0 ? (
            <BarList rows={countries} />
          ) : (
            <div className="text-sm text-muted text-center py-8">No data</div>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-4 flex items-center gap-1.5">
            <MapPin size={14} className="text-accent" /> Top Cities
            <InfoTooltip text="Cities driving the most sessions. High city concentration can inform local SEO and ad targeting decisions." />
          </CardTitle>
          {dataLoading ? (
            <div className="h-40 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-muted" /></div>
          ) : cities.length > 0 ? (
            <BarList rows={cities} />
          ) : (
            <div className="text-sm text-muted text-center py-8">No data</div>
          )}
        </Card>
      </div>

      {/* ── Tech Breakdown ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardTitle className="mb-4 flex items-center gap-1.5">
            <Monitor size={14} className="text-accent" /> Device Categories
            <InfoTooltip text="Session split across desktop, mobile, and tablet. High mobile share signals importance of Core Web Vitals on mobile." />
          </CardTitle>
          {dataLoading ? (
            <div className="h-32 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-muted" /></div>
          ) : devices.length > 0 ? (
            <div className="space-y-3">
              {devices.map(r => {
                const total = devices.reduce((s, d) => s + d.sessions, 0)
                const pct   = total > 0 ? Math.round((r.sessions / total) * 100) : 0
                const color = r.name === 'desktop' ? '#00d4ff' : r.name === 'mobile' ? '#f59e0b' : '#8b5cf6'
                return (
                  <div key={r.name}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-tx font-medium capitalize">{r.name}</span>
                      <span className="font-mono-jarvis text-muted">{r.sessions.toLocaleString()} · {pct}%</span>
                    </div>
                    <div className="h-2 bg-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-muted text-center py-8">No data</div>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-4 flex items-center gap-1.5">
            <Globe size={14} className="text-accent" /> Top Browsers
            <InfoTooltip text="Browser distribution of your visitors. Useful for cross-browser testing priorities and understanding your audience's tech stack." />
          </CardTitle>
          {dataLoading ? (
            <div className="h-32 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-muted" /></div>
          ) : browsers.length > 0 ? (
            <BarList rows={browsers} />
          ) : (
            <div className="text-sm text-muted text-center py-8">No data</div>
          )}
        </Card>
      </div>

      {/* ── Top Events ────────────────────────────────────── */}
      <Card>
        <CardTitle className="mb-4 flex items-center gap-1.5">
          <Zap size={14} className="text-accent" /> Top Events
          <InfoTooltip text="Most-triggered GA4 events in the selected period. Includes auto-collected events (page_view, click, scroll) and custom events you've set up." />
        </CardTitle>
        {dataLoading ? (
          <div className="h-32 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-muted" /></div>
        ) : events.length > 0 ? (
          <div className="space-y-1">
            {events.map((e, i) => {
              const maxCount = events[0].count
              const pct = maxCount > 0 ? Math.round((e.count / maxCount) * 100) : 0
              return (
                <div key={e.name + i} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                  <span className="text-[10px] font-mono-jarvis text-muted w-5 shrink-0">{i + 1}</span>
                  <span className="text-xs font-mono-jarvis text-accent flex-1 truncate">{e.name}</span>
                  <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden shrink-0">
                    <div className="h-full bg-accent/60 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] font-mono-jarvis text-tx shrink-0 w-16 text-right">{e.count.toLocaleString()}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-sm text-muted text-center py-8">No event data</div>
        )}
      </Card>

    </div>
  )
}
