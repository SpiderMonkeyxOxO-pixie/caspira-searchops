import { useState, useEffect, useCallback } from 'react'
import { GitMerge, BarChart2, Search, Unplug, Loader2, ArrowUpRight, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import { useAuthStore } from '@/store/authStore'

// ── Types ─────────────────────────────────────────────────────
interface GSCConn  { selected_site: string; available_sites: string[] }
interface GA4Conn  { property_id: string; property_name: string }

interface CrossRow {
  page:        string
  clicks:      number
  impressions: number
  ctr:         number
  position:    number
  sessions:    number
  engRate:     number
  revenue:     number
  efficiency:  number   // sessions / clicks — >1 can happen (bots, bookmarks); <0.5 = tracking gap or bounce
}

type SortCol = 'clicks' | 'impressions' | 'position' | 'sessions' | 'engRate' | 'revenue' | 'efficiency'

// ── Helpers ───────────────────────────────────────────────────
function normPath(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname.replace(/\/$/, '') || '/'
  } catch {
    return url.replace(/\/$/, '') || '/'
  }
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + '%'
}

function fmtRev(n: number): string {
  if (n === 0) return '—'
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K'
  return '$' + n.toFixed(2)
}

function effColor(e: number): string {
  if (e >= 0.8) return '#10b981'
  if (e >= 0.4) return '#f59e0b'
  return '#ef4444'
}

function matchGscSite(domain: string, sites: string[]): string | undefined {
  const clean = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase()
  return sites.find(s => {
    const sc = s.replace('sc-domain:', '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase()
    return sc === clean || sc.endsWith('.' + clean) || clean.endsWith('.' + sc)
  })
}

function SortBtn({ col: _col, active, dir, onClick }: { col: string; active: boolean; dir: 'asc'|'desc'; onClick: () => void }) {
  return (
    <button onClick={onClick} className="ml-0.5 cursor-pointer hover:text-accent transition-colors">
      {active
        ? dir === 'desc' ? <ChevronDown size={10} className="text-accent" /> : <ChevronUp size={10} className="text-accent" />
        : <ChevronDown size={10} className="opacity-25" />}
    </button>
  )
}

// ── Component ─────────────────────────────────────────────────
export function CrossView() {
  const { setSection, domain } = useStore()
  const orgId = useAuthStore().org?.id ?? ''

  // Connection state
  const [gscConn,     setGscConn]     = useState<GSCConn | null>(null)
  const [ga4Conn,     setGa4Conn]     = useState<GA4Conn | null>(null)
  const [connLoading, setConnLoading] = useState(true)

  // Data state
  const [rows,      setRows]      = useState<CrossRow[]>([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('28daysAgo')
  const [sortBy,    setSortBy]    = useState<SortCol>('clicks')
  const [sortDir,   setSortDir]   = useState<'asc'|'desc'>('desc')

  const DATE_RANGES = [
    { label: '7d',  value: '7daysAgo'   },
    { label: '28d', value: '28daysAgo'  },
    { label: '90d', value: '90daysAgo'  },
  ]

  // ── Load connections ────────────────────────────────────────
  useEffect(() => {
    if (!orgId) return
    setConnLoading(true)
    Promise.all([
      supabase.from('jarvis_gsc_connections')
        .select('selected_site, available_sites')
        .eq('org_id', orgId).maybeSingle(),
      supabase.from('jarvis_ga4_connections')
        .select('property_id, property_name')
        .eq('org_id', orgId).maybeSingle(),
    ]).then(([gscRes, ga4Res]) => {
      setGscConn((gscRes.data as GSCConn | null))
      setGa4Conn((ga4Res.data as GA4Conn | null))
      setConnLoading(false)
    })
  }, [orgId])

  // ── Fetch + merge data ──────────────────────────────────────
  const fetchData = useCallback(async (range: string) => {
    if (!orgId || !gscConn || !ga4Conn) return
    setLoading(true)
    setError(null)

    try {
      const startDate = new Date(Date.now() - parseInt(range) * 86_400_000).toISOString().slice(0, 10)
      const endDate   = new Date().toISOString().slice(0, 10)

      // Resolve GSC site URL
      const availableSites = gscConn.available_sites ?? []
      const siteUrl = domain
        ? (matchGscSite(domain, availableSites) ?? gscConn.selected_site)
        : gscConn.selected_site

      if (!siteUrl) throw new Error('No GSC site resolved')

      // Parallel: GSC pages + GA4 pages
      const [gscRes, ga4Res] = await Promise.all([
        supabase.functions.invoke('gsc-proxy', {
          body: {
            org_id: orgId, site_url: siteUrl, endpoint: 'searchAnalytics',
            params: { startDate, endDate, dimensions: ['page'], rowLimit: 200 },
          },
        }),
        supabase.functions.invoke('ga4-proxy', {
          body: {
            org_id: orgId,
            property_id: ga4Conn.property_id,
            mode: 'runReport',
            report: {
              dateRanges: [{ startDate: range, endDate: 'today' }],
              dimensions: [{ name: 'pagePath' }],
              metrics: [
                { name: 'sessions' },
                { name: 'engagementRate' },
                { name: 'conversions' },
                { name: 'totalRevenue' },
              ],
              orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
              limit: 200,
            },
          },
        }),
      ])

      if (gscRes.error)       throw new Error(gscRes.error.message)
      if (gscRes.data?.error) throw new Error(gscRes.data.error)
      if (ga4Res.error)       throw new Error(ga4Res.error.message)
      if (ga4Res.data?.error) throw new Error(ga4Res.data.error)

      // Parse GSC rows
      type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }
      const gscRows: GscRow[] = gscRes.data?.rows ?? []

      // Parse GA4 rows
      type Ga4RawRow = { dimensionValues: {value:string}[]; metricValues: {value:string}[] }
      const ga4RawRows: Ga4RawRow[] = ga4Res.data?.rows ?? []

      // Build GA4 map: path → metrics
      const ga4Map = new Map<string, { sessions: number; engRate: number; revenue: number }>()
      ga4RawRows.forEach(r => {
        const path     = normPath(r.dimensionValues[0]?.value ?? '')
        const sessions = Number(r.metricValues[0]?.value ?? 0)
        const engRate  = Number(r.metricValues[1]?.value ?? 0)
        const revenue  = Number(r.metricValues[3]?.value ?? 0)
        // GA4 can have the same path from multiple rows — accumulate
        const prev = ga4Map.get(path)
        if (prev) {
          ga4Map.set(path, {
            sessions: prev.sessions + sessions,
            engRate:  (prev.engRate + engRate) / 2,
            revenue:  prev.revenue + revenue,
          })
        } else {
          ga4Map.set(path, { sessions, engRate, revenue })
        }
      })

      // Merge
      const merged: CrossRow[] = gscRows.map(r => {
        const path    = normPath(r.keys[0])
        const ga4     = ga4Map.get(path)
        const clicks  = r.clicks
        const sessions = ga4?.sessions ?? 0
        return {
          page:        path,
          clicks,
          impressions: r.impressions,
          ctr:         r.ctr,
          position:    Math.round(r.position * 10) / 10,
          sessions,
          engRate:     ga4?.engRate ?? 0,
          revenue:     ga4?.revenue ?? 0,
          efficiency:  clicks > 0 && sessions > 0 ? sessions / clicks : 0,
        }
      })

      setRows(merged)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cross-view data')
    } finally {
      setLoading(false)
    }
  }, [orgId, gscConn, ga4Conn, domain])

  useEffect(() => {
    if (!connLoading && gscConn && ga4Conn) fetchData(dateRange)
  }, [connLoading, gscConn, ga4Conn])

  function changeRange(r: string) {
    setDateRange(r)
    fetchData(r)
  }

  function toggleSort(col: SortCol) {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  // ── Sorted rows ─────────────────────────────────────────────
  const sorted = [...rows].sort((a, b) => {
    const va = a[sortBy], vb = b[sortBy]
    return sortDir === 'desc' ? (vb as number) - (va as number) : (va as number) - (vb as number)
  })

  // ── Summary KPIs ─────────────────────────────────────────────
  const totalClicks   = rows.reduce((s, r) => s + r.clicks, 0)
  const totalSessions = rows.reduce((s, r) => s + r.sessions, 0)
  const totalRevenue  = rows.reduce((s, r) => s + r.revenue, 0)
  const avgPosition   = rows.length > 0
    ? (rows.reduce((s, r) => s + r.position * r.impressions, 0) / Math.max(rows.reduce((s,r) => s + r.impressions, 0), 1))
    : 0
  const matchedRows   = rows.filter(r => r.sessions > 0).length

  // ── Opportunities ───────────────────────────────────────────
  const opportunities = rows
    .filter(r => r.clicks > 10 && r.sessions === 0)
    .slice(0, 5)

  // ── Render ───────────────────────────────────────────────────
  if (connLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted text-sm">
        <Loader2 size={16} className="animate-spin" /> Checking connections…
      </div>
    )
  }

  const gscReady = !!gscConn?.selected_site || (gscConn?.available_sites?.length ?? 0) > 0
  const ga4Ready = !!ga4Conn?.property_id

  if (!gscReady || !ga4Ready) {
    return (
      <div className="space-y-5">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00d4ff15] flex items-center justify-center shrink-0">
              <GitMerge size={18} className="text-accent" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-1.5">
                GSC + GA4 Cross-View
                <InfoTooltip text="Correlates GSC organic data with GA4 behavioural data at page level — showing which ranked pages actually convert." />
              </CardTitle>
              <div className="text-[11px] text-muted font-mono-jarvis mt-0.5">
                Search Console impressions/clicks merged with GA4 conversions and revenue
              </div>
            </div>
          </div>
        </Card>

        <Card className="py-12 text-center">
          <Unplug size={40} className="mx-auto mb-4 text-muted opacity-40" strokeWidth={1.25} />
          <div className="text-sm font-semibold text-tx mb-2">Connect both sources to unlock Cross-View</div>
          <div className="text-xs text-muted max-w-sm mx-auto leading-relaxed mb-6">
            This view merges Search Console impressions &amp; clicks with GA4 sessions and revenue at the page level.
          </div>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium ${gscReady ? 'border-accent3/40 text-accent3 bg-accent3/5' : 'border-border text-muted'}`}>
              <Search size={13} />
              Search Console
              {gscReady
                ? <span className="text-accent3 font-bold">✓ Connected</span>
                : <Button variant="ghost" className="text-[11px] ml-1 py-0.5 h-auto" onClick={() => setSection('gsc')}>Connect →</Button>
              }
            </div>
            <div className="text-muted text-xs">+</div>
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium ${ga4Ready ? 'border-accent3/40 text-accent3 bg-accent3/5' : 'border-border text-muted'}`}>
              <BarChart2 size={13} />
              GA4 Analytics
              {ga4Ready
                ? <span className="text-accent3 font-bold">✓ Connected</span>
                : <Button variant="ghost" className="text-[11px] ml-1 py-0.5 h-auto" onClick={() => setSection('ga4')}>Connect →</Button>
              }
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00d4ff15] flex items-center justify-center shrink-0">
              <GitMerge size={18} className="text-accent" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-1.5">
                GSC + GA4 Cross-View
                <InfoTooltip text="Each row is a page ranked in Google. GSC columns show search visibility; GA4 columns show what visitors actually do. The Efficiency score is sessions ÷ clicks — low values mean clicks aren't turning into tracked sessions." />
              </CardTitle>
              <div className="flex items-center gap-3 mt-1 text-[10px] font-mono-jarvis">
                <span className="flex items-center gap-1 text-accent3"><span className="w-1.5 h-1.5 rounded-full bg-accent3" /> GSC: {gscConn?.selected_site || gscConn?.available_sites?.[0]}</span>
                <span className="text-muted">·</span>
                <span className="flex items-center gap-1 text-accent"><span className="w-1.5 h-1.5 rounded-full bg-accent" /> GA4: {ga4Conn.property_name || ga4Conn.property_id}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
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
      </Card>

      {error && (() => {
        const isPermErr = /insufficient permission|does not have sufficient|403/i.test(error)
        const siteUrl   = gscConn?.selected_site ?? ''
        const isDomain  = siteUrl.startsWith('sc-domain:')
        const urlPrefix = isDomain ? `https://${siteUrl.replace('sc-domain:', '').replace(/\/$/, '')}/` : null
        return isPermErr ? (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-danger">GSC permission denied — {siteUrl}</span>
            </div>
            {isDomain && (
              <p className="text-xs text-muted leading-relaxed">
                <strong className="text-tx">Domain properties</strong> (<code className="font-mono-jarvis">sc-domain:</code>) require <strong className="text-tx">Owner</strong> access — Full User access is not enough.
              </p>
            )}
            <div className="space-y-2">
              {urlPrefix && (
                <div className="text-xs text-muted flex items-start gap-2">
                  <span className="text-accent3 font-mono-jarvis shrink-0 mt-0.5">→</span>
                  <span><strong className="text-tx">Use the URL-prefix property instead:</strong> add{' '}
                  <code className="font-mono-jarvis text-accent bg-surface px-1 rounded">{urlPrefix}</code>{' '}
                  in Search Console — it works with Full User access. Then reconnect GSC in Jarvis.</span>
                </div>
              )}
              <div className="text-xs text-muted flex items-start gap-2">
                <span className="text-accent3 font-mono-jarvis shrink-0 mt-0.5">→</span>
                <span><strong className="text-tx">Or reconnect with an Owner account</strong> via Search Console → <a href="https://search.google.com/search-console/users" target="_blank" rel="noopener noreferrer" className="text-accent underline">Settings → Users & permissions</a>.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-3 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">{error}</div>
        )
      })()}

      {loading && (
        <div className="flex items-center justify-center h-40 gap-2 text-muted text-sm">
          <Loader2 size={18} className="animate-spin" /> Merging GSC + GA4 data…
        </div>
      )}

      {!loading && rows.length > 0 && (
        <>
          {/* ── Summary KPIs ─────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'TOTAL CLICKS',    val: fmt(totalClicks),              color: '#00d4ff', tip: 'Total organic clicks from GSC across all ranked pages in this period.' },
              { label: 'TOTAL SESSIONS',  val: fmt(totalSessions),            color: '#10b981', tip: 'Total GA4 sessions on pages that also appear in GSC data.' },
              { label: 'PAGES MATCHED',   val: `${matchedRows} / ${rows.length}`, color: '#f59e0b', tip: 'Pages with clicks in GSC that also have GA4 session data. Unmatched pages may have tracking gaps.' },
              { label: 'AVG. POSITION',   val: avgPosition > 0 ? `#${avgPosition.toFixed(1)}` : '—', color: '#a78bfa', tip: 'Impression-weighted average ranking position across all matched pages.' },
              { label: 'TOTAL REVENUE',   val: fmtRev(totalRevenue),          color: '#ec4899', tip: 'Combined GA4 e-commerce revenue from pages that also appear in GSC. Only populated if e-commerce tracking is set up.' },
            ].map(k => (
              <Card key={k.label} className="py-3">
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1 flex items-center gap-1">
                  {k.label} <InfoTooltip text={k.tip} />
                </div>
                <div className="text-xl font-display font-black" style={{ color: k.color }}>{k.val}</div>
              </Card>
            ))}
          </div>

          {/* ── Opportunities callout ─────────────────────── */}
          {opportunities.length > 0 && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardTitle className="text-amber-400 mb-2 text-sm flex items-center gap-1.5">
                <TrendingUp size={14} /> GSC Traffic with No GA4 Sessions ({opportunities.length} pages)
                <InfoTooltip text="These pages are receiving clicks from Google but have zero recorded GA4 sessions — possible causes: missing GA4 tag, 3rd-party landing pages, or cross-domain tracking gaps." />
              </CardTitle>
              <div className="space-y-1">
                {opportunities.map(r => (
                  <div key={r.page} className="flex items-center justify-between text-xs py-1 border-b border-amber-500/10 last:border-0">
                    <span className="font-mono-jarvis text-amber-300/70 truncate flex-1">{r.page}</span>
                    <span className="text-amber-400 font-bold shrink-0 ml-3">{r.clicks} clicks → 0 sessions</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── Cross-view table ──────────────────────────── */}
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal">PAGE</th>
                    {/* GSC columns */}
                    <th className="px-3 py-3 text-right text-[10px] tracking-widest font-mono-jarvis font-normal text-[#00d4ff80]">
                      <div className="flex items-center justify-end gap-1">
                        CLICKS <InfoTooltip text="GSC organic clicks." />
                        <SortBtn col="clicks" active={sortBy==='clicks'} dir={sortDir} onClick={() => toggleSort('clicks')} />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-right text-[10px] tracking-widest font-mono-jarvis font-normal text-[#00d4ff80]">
                      <div className="flex items-center justify-end gap-1">
                        IMPR <InfoTooltip text="GSC impressions (times your page appeared in search)." />
                        <SortBtn col="impressions" active={sortBy==='impressions'} dir={sortDir} onClick={() => toggleSort('impressions')} />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-right text-[10px] tracking-widest font-mono-jarvis font-normal text-[#00d4ff80]">
                      <div className="flex items-center justify-end gap-1">
                        POS <InfoTooltip text="Average Google ranking position for this page." />
                        <SortBtn col="position" active={sortBy==='position'} dir={sortDir} onClick={() => toggleSort('position')} />
                      </div>
                    </th>
                    {/* GA4 columns */}
                    <th className="px-3 py-3 text-right text-[10px] tracking-widest font-mono-jarvis font-normal text-[#10b98180]">
                      <div className="flex items-center justify-end gap-1">
                        SESSIONS <InfoTooltip text="GA4 sessions recorded on this page." />
                        <SortBtn col="sessions" active={sortBy==='sessions'} dir={sortDir} onClick={() => toggleSort('sessions')} />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-right text-[10px] tracking-widest font-mono-jarvis font-normal text-[#10b98180]">
                      <div className="flex items-center justify-end gap-1">
                        ENG. <InfoTooltip text="GA4 engagement rate for this page — % of sessions that were engaged (10s+, conversion, or 2+ pages)." />
                        <SortBtn col="engRate" active={sortBy==='engRate'} dir={sortDir} onClick={() => toggleSort('engRate')} />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-right text-[10px] tracking-widest font-mono-jarvis font-normal text-[#ec489980]">
                      <div className="flex items-center justify-end gap-1">
                        REVENUE <InfoTooltip text="GA4 e-commerce revenue attributed to this page." />
                        <SortBtn col="revenue" active={sortBy==='revenue'} dir={sortDir} onClick={() => toggleSort('revenue')} />
                      </div>
                    </th>
                    {/* Cross metric */}
                    <th className="px-3 py-3 text-right text-[10px] tracking-widest font-mono-jarvis font-normal text-muted">
                      <div className="flex items-center justify-end gap-1">
                        EFFICIENCY <InfoTooltip text="Sessions ÷ Clicks. Close to 1.0 = healthy. Below 0.4 = clicks not converting to sessions (tracking gap, bounce, or bot traffic). Above 1.0 = direct/bookmark traffic also hitting this page." />
                        <SortBtn col="efficiency" active={sortBy==='efficiency'} dir={sortDir} onClick={() => toggleSort('efficiency')} />
                      </div>
                    </th>
                  </tr>
                  {/* Source labels */}
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-1" />
                    <td colSpan={3} className="px-3 py-1 text-right text-[9px] text-[#00d4ff60] font-mono-jarvis tracking-widest">← GSC (search visibility)</td>
                    <td colSpan={3} className="px-3 py-1 text-right text-[9px] text-[#10b98160] font-mono-jarvis tracking-widest">← GA4 (on-site behaviour)</td>
                    <td className="px-3 py-1" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r => (
                    <tr key={r.page} className="border-b border-border hover:bg-surface transition-colors group">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 max-w-xs">
                          <span className="text-accent font-mono-jarvis truncate">{r.page}</span>
                          <ArrowUpRight size={10} className="text-muted opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                        </div>
                      </td>
                      {/* GSC */}
                      <td className="px-3 py-2.5 text-right font-mono-jarvis font-bold text-[#00d4ff]">{fmt(r.clicks)}</td>
                      <td className="px-3 py-2.5 text-right font-mono-jarvis text-muted">{fmt(r.impressions)}</td>
                      <td className="px-3 py-2.5 text-right font-mono-jarvis">
                        <span className={r.position <= 3 ? 'text-accent3 font-bold' : r.position <= 10 ? 'text-accent4' : 'text-muted'}>
                          #{r.position}
                        </span>
                      </td>
                      {/* GA4 */}
                      <td className="px-3 py-2.5 text-right font-mono-jarvis text-[#10b981]">
                        {r.sessions > 0 ? fmt(r.sessions) : <span className="text-muted/40">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-jarvis text-muted">
                        {r.engRate > 0 ? fmtPct(r.engRate) : <span className="opacity-30">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-jarvis text-[#ec4899]">
                        {fmtRev(r.revenue)}
                      </td>
                      {/* Efficiency */}
                      <td className="px-3 py-2.5 text-right">
                        {r.efficiency > 0 ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="w-12 h-1.5 bg-border rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(r.efficiency, 1) * 100}%`, background: effColor(r.efficiency) }} />
                            </div>
                            <span className="font-mono-jarvis text-[11px] w-8 text-right" style={{ color: effColor(r.efficiency) }}>
                              {r.efficiency.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <TrendingDown size={10} className="text-muted/30" />
                            <span className="text-muted/30 font-mono-jarvis">—</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-border text-[10px] text-muted font-mono-jarvis">
              {rows.length} pages · {matchedRows} with GA4 sessions · {rows.length - matchedRows} unmatched
            </div>
          </Card>
        </>
      )}

      {!loading && rows.length === 0 && !error && (
        <Card className="py-12 text-center text-sm text-muted">
          No data returned for this date range. Try extending to 28d or 90d.
        </Card>
      )}

    </div>
  )
}
