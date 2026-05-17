import { useState, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, CheckCircle2,
  ChevronUp, ChevronDown, Search, Zap, Plus,
} from 'lucide-react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Site } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgencySite {
  id: number
  name: string
  domain: string
  score: number
  traffic: string
  trafficRaw: number
  trafficChange: string
  changeUp: boolean
  keys: number
  dr: number
  issues: number
  status: 'good' | 'warning' | 'danger'
  country: string
  client: string
  topKw: string
  pos: number
  lastCrawl: string
  alertCount: number
}

type Tab    = 'overview' | 'sites' | 'alerts' | 'heatmap'
type SortBy = 'score' | 'traffic' | 'issues' | 'dr' | 'pos'

const CHART_COLORS = ['#00d4ff', '#7c3aed', '#10b981', '#f59e0b', '#ec4899', '#fb923c', '#a78bfa', '#34d399']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 70) return '#10b981'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function SortBtn({ col, sortBy, sortDir, onClick }: { col: SortBy; sortBy: SortBy; sortDir: 'asc'|'desc'; onClick: () => void }) {
  const active = sortBy === col
  return (
    <button onClick={onClick} className="flex items-center gap-0.5 cursor-pointer hover:text-accent transition-colors">
      {active
        ? sortDir === 'desc' ? <ChevronDown size={11} className="text-accent" /> : <ChevronUp size={11} className="text-accent" />
        : <ChevronDown size={11} className="opacity-30" />}
    </button>
  )
}

// ─── Store → AgencySite mapper ────────────────────────────────────────────────

function parseTrafficRaw(t: string): number {
  if (!t || t === '—') return 0
  const n = parseFloat(t)
  if (t.includes('M')) return Math.round(n * 1_000_000)
  if (t.includes('K')) return Math.round(n * 1_000)
  return n || 0
}

function siteToAgency(s: Site): AgencySite {
  return {
    id: s.id,
    name: s.name,
    domain: s.domain,
    score: s.score,
    traffic: s.traffic,
    trafficRaw: parseTrafficRaw(s.traffic),
    trafficChange: '—',
    changeUp: true,
    keys: s.keys,
    dr: 0,
    issues: s.issues,
    status: s.status,
    country: s.country ?? '—',
    client: s.client ?? '—',
    topKw: '—',
    pos: 0,
    lastCrawl: '—',
    alertCount: s.issues > 30 ? 4 : s.issues > 15 ? 2 : s.issues > 5 ? 1 : 0,
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AgencyDashboard() {
  const { sites: storeSites, setSection } = useStore()
  const [tab,       setTab]       = useState<Tab>('overview')
  const [search,    setSearch]    = useState('')
  const [statusFilter, setStatus] = useState<'all'|'good'|'warning'|'danger'>('all')
  const [countryFilter, setCountry] = useState<string>('all')
  const [sortBy,    setSortBy]    = useState<SortBy>('score')
  const [sortDir,   setSortDir]   = useState<'asc'|'desc'>('desc')

  const DISPLAY_SITES: AgencySite[] = storeSites.map(siteToAgency)
  const usingRealData = storeSites.length > 0

  const totalTraffic  = DISPLAY_SITES.reduce((a, s) => a + s.trafficRaw, 0)
  const criticalCount = DISPLAY_SITES.filter(s => s.status === 'danger').length
  const warningCount  = DISPLAY_SITES.filter(s => s.status === 'warning').length
  const avgScore      = DISPLAY_SITES.length > 0
    ? Math.round(DISPLAY_SITES.reduce((a, s) => a + s.score, 0) / DISPLAY_SITES.length)
    : 0
  const totalAlerts   = 0

  const uniqueCountries = [...new Set(DISPLAY_SITES.map(s => s.country).filter(c => c && c !== '—'))]

  const trafficByCountry = uniqueCountries.map((c, i) => ({
    country: c,
    traffic: DISPLAY_SITES.filter(s => s.country === c).reduce((sum, s) => sum + s.trafficRaw, 0),
    color: CHART_COLORS[i % CHART_COLORS.length],
  }))

  const filtered = useMemo(() => {
    let list = [...DISPLAY_SITES]
    if (search)                list = list.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.domain.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter)
    if (countryFilter !== 'all') list = list.filter(s => s.country === countryFilter)
    list.sort((a, b) => {
      const va = sortBy === 'traffic' ? a.trafficRaw : sortBy === 'issues' ? a.issues : sortBy === 'dr' ? a.dr : sortBy === 'pos' ? a.pos : a.score
      const vb = sortBy === 'traffic' ? b.trafficRaw : sortBy === 'issues' ? b.issues : sortBy === 'dr' ? b.dr : sortBy === 'pos' ? b.pos : b.score
      return sortDir === 'desc' ? vb - va : va - vb
    })
    return list
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSites, search, statusFilter, countryFilter, sortBy, sortDir])

  function toggleSort(col: SortBy) {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const dangerSites = DISPLAY_SITES.filter(s => s.status === 'danger').sort((a, b) => b.issues - a.issues)
  const topMovers   = DISPLAY_SITES.filter(s => s.changeUp && s.trafficRaw > 0).sort((a, b) => b.trafficRaw - a.trafficRaw).slice(0, 4)
  const aboveScore70 = DISPLAY_SITES.filter(s => s.score >= 70).length

  return (
    <div className="space-y-5">
      {/* Real data banner */}
      {!usingRealData && (
        <div className="flex items-center justify-between p-3 bg-[#f59e0b08] border border-[#f59e0b30] rounded-xl text-xs">
          <span className="text-accent4">No sites yet — add your sites to see your portfolio dashboard.</span>
          <Button variant="ghost" className="text-[11px] shrink-0" onClick={() => setSection('sitesmanager')}>
            <Plus size={11} /> Add My Sites
          </Button>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label:'TOTAL SITES',      val: DISPLAY_SITES.length,                    sub: 'Your portfolio',  color:'var(--color-accent)' },
          { label:'TOTAL TRAFFIC',    val: totalTraffic > 0 ? (totalTraffic/1000000).toFixed(2)+'M' : '—', sub: 'Combined organic', color:'#a78bfa' },
          { label:'AVG HEALTH SCORE', val: avgScore || '—',                          sub: `${aboveScore70} sites above 70`,  color: scoreColor(avgScore) },
          { label:'CRITICAL ALERTS',  val: totalAlerts,                              sub: `${criticalCount} sites in danger`, color:'var(--color-danger)' },
        ].map(k => (
          <Card key={k.label}>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-2">{k.label}</div>
            <div className="font-display font-black text-2xl mb-1" style={{ color: k.color }}>{k.val}</div>
            <div className="text-[11px] text-muted">{k.sub}</div>
          </Card>
        ))}
      </div>

      {/* Status pills */}
      <div className="flex items-center gap-3 flex-wrap">
        {[
          { label:`${DISPLAY_SITES.filter(s=>s.status==='good').length} Healthy`,   color:'text-accent3', dot:'bg-accent3' },
          { label:`${warningCount} Warning`,                                          color:'text-accent4', dot:'bg-accent4' },
          { label:`${criticalCount} Critical`,                                        color:'text-danger',  dot:'bg-danger'  },
        ].map(p => (
          <div key={p.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-full text-xs font-semibold">
            <span className={`w-2 h-2 rounded-full ${p.dot}`} />
            <span className={p.color}>{p.label}</span>
          </div>
        ))}
        <div className="text-[11px] text-muted ml-auto font-mono-jarvis">Last updated: May 15, 2026 · 08:00 AM</div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl w-fit">
        {(['overview','sites','alerts','heatmap'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold font-mono-jarvis tracking-wide transition-all cursor-pointer capitalize ${tab===t ? 'bg-accent text-black' : 'text-muted hover:text-tx'}`}>
            {t === 'alerts' ? `Alerts (${totalAlerts})` : t === 'sites' ? `All Sites (${DISPLAY_SITES.length})` : t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Portfolio traffic by market */}
            <Card className="lg:col-span-2">
              <CardTitle className="mb-1">Traffic by Market</CardTitle>
              <p className="text-[11px] text-muted mb-4">Organic traffic split across all your markets</p>
              {trafficByCountry.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trafficByCountry} barCategoryGap="30%">
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="country" tick={{ fontSize:11, fill:'var(--color-muted)' }} />
                    <YAxis tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0)+'K' : String(v)} tick={{ fontSize:10, fill:'var(--color-muted)' }} />
                    <Tooltip
                      contentStyle={{ background:'var(--color-card)', border:'1px solid var(--color-border)', fontSize:11 }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => [typeof v === 'number' ? v.toLocaleString() + ' visits/mo' : v, 'Traffic']}
                    />
                    <Bar dataKey="traffic" radius={[4,4,0,0]}>
                      {trafficByCountry.map((entry, i) => (
                        <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-55 text-sm text-muted">
                  Add sites with a country set to see traffic by market.
                </div>
              )}
            </Card>

            {/* Health summary */}
            <Card>
              <CardTitle className="mb-4">Portfolio Health</CardTitle>
              <div className="space-y-3 mb-5">
                {[
                  { label:'Healthy (70+)',  count:DISPLAY_SITES.filter(s=>s.score>=70).length,  color:'#10b981' },
                  { label:'Warning (50-69)',count:DISPLAY_SITES.filter(s=>s.score>=50&&s.score<70).length, color:'#f59e0b' },
                  { label:'Critical (<50)', count:DISPLAY_SITES.filter(s=>s.score<50).length,   color:'#ef4444' },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-3">
                    <div className="w-24 text-[11px] text-muted shrink-0">{r.label}</div>
                    <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width:`${DISPLAY_SITES.length > 0 ? (r.count/DISPLAY_SITES.length)*100 : 0}%`, background:r.color }} />
                    </div>
                    <div className="w-6 text-[11px] font-mono-jarvis font-bold text-right" style={{ color:r.color }}>{r.count}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 text-[11px]">
                {uniqueCountries.length > 0 ? uniqueCountries.map((c, i) => (
                  <div key={c} className="flex justify-between text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {c}
                    </span>
                    <span className="text-tx font-semibold">{DISPLAY_SITES.filter(s => s.country === c).length}</span>
                  </div>
                )) : (
                  <div className="text-muted">No markets yet — set a country on your sites.</div>
                )}
              </div>
            </Card>
          </div>

          {/* Sites needing attention */}
          <Card>
            <CardTitle className="mb-4">Sites Needing Immediate Attention</CardTitle>
            <div className="space-y-2">
              {dangerSites.map(s => (
                <div key={s.id} className="flex items-center gap-4 p-3 bg-surface border border-danger/30 rounded-xl">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: scoreColor(s.score)+'20' }}>
                    <span className="text-sm font-display font-black" style={{ color: scoreColor(s.score) }}>{s.score}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-tx truncate">{s.name}</div>
                    <div className="text-[11px] text-muted font-mono-jarvis">{s.domain} · {s.client}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[11px]">
                    <div className="text-right">
                      <div className="text-danger font-bold">{s.issues}</div>
                      <div className="text-muted">issues</div>
                    </div>
                    <div className="text-right">
                      <div className={s.changeUp ? 'text-accent3 font-semibold' : 'text-danger font-semibold'}>{s.trafficChange}</div>
                      <div className="text-muted">traffic</div>
                    </div>
                    <Badge variant="red">{s.alertCount} alerts</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top movers */}
          <Card>
            <CardTitle className="mb-4">Top Traffic Movers This Month</CardTitle>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {topMovers.map(s => (
                <div key={s.id} className="p-3 bg-surface border border-[#10b98130] rounded-xl">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp size={12} className="text-accent3" />
                    <span className="text-[10px] font-mono-jarvis text-accent3 font-bold">{s.trafficChange}</span>
                  </div>
                  <div className="text-xs font-semibold text-tx truncate mb-0.5">{s.name}</div>
                  <div className="text-[10px] text-muted font-mono-jarvis truncate">{s.domain}</div>
                  <div className="mt-2 text-[11px] font-bold text-accent">{s.traffic}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── ALL SITES TAB ─────────────────────────────────────────────── */}
      {tab === 'sites' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search sites…"
                className="bg-surface border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors w-48" />
            </div>
            <div className="flex gap-1">
              {(['all','good','warning','danger'] as const).map(f => (
                <button key={f} onClick={() => setStatus(f)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all border capitalize ${statusFilter===f ? 'bg-accent text-black border-accent' : 'border-border text-muted hover:border-accent'}`}>
                  {f}
                </button>
              ))}
            </div>
            {uniqueCountries.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                <button onClick={() => setCountry('all')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all border ${countryFilter === 'all' ? 'bg-accent2 text-white border-accent2' : 'border-border text-muted hover:border-accent'}`}>
                  All
                </button>
                {uniqueCountries.map(c => (
                  <button key={c} onClick={() => setCountry(c)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all border ${countryFilter === c ? 'bg-accent2 text-white border-accent2' : 'border-border text-muted hover:border-accent'}`}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            <div className="ml-auto text-[11px] text-muted font-mono-jarvis">{filtered.length} sites</div>
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal">SITE</th>
                    <th className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal">
                      <div className="flex items-center gap-1">SCORE <SortBtn col="score" sortBy={sortBy} sortDir={sortDir} onClick={() => toggleSort('score')} /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal">
                      <div className="flex items-center gap-1">TRAFFIC <SortBtn col="traffic" sortBy={sortBy} sortDir={sortDir} onClick={() => toggleSort('traffic')} /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal">
                      <div className="flex items-center gap-1">DR <SortBtn col="dr" sortBy={sortBy} sortDir={sortDir} onClick={() => toggleSort('dr')} /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal">TOP KEYWORD</th>
                    <th className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal">
                      <div className="flex items-center gap-1">POS <SortBtn col="pos" sortBy={sortBy} sortDir={sortDir} onClick={() => toggleSort('pos')} /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal">
                      <div className="flex items-center gap-1">ISSUES <SortBtn col="issues" sortBy={sortBy} sortDir={sortDir} onClick={() => toggleSort('issues')} /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal">CLIENT</th>
                    <th className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} className="border-b border-border hover:bg-surface transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-tx">{s.name}</div>
                        <div className="text-[10px] text-muted font-mono-jarvis">{s.domain}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width:`${s.score}%`, background:scoreColor(s.score) }} />
                          </div>
                          <span className="font-mono-jarvis font-bold" style={{ color:scoreColor(s.score) }}>{s.score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-tx">{s.traffic}</div>
                        <div className={`text-[10px] flex items-center gap-0.5 ${s.changeUp ? 'text-accent3' : 'text-danger'}`}>
                          {s.changeUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />} {s.trafficChange}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono-jarvis font-bold text-tx">{s.dr}</td>
                      <td className="px-4 py-3">
                        <div className="text-muted font-mono-jarvis truncate max-w-36">{s.topKw}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono-jarvis font-bold ${s.pos<=3 ? 'text-accent3' : s.pos<=10 ? 'text-accent4' : 'text-muted'}`}>#{s.pos}</span>
                      </td>
                      <td className="px-4 py-3">
                        {s.issues > 0 ? (
                          <Badge variant={s.issues >= 30 ? 'red' : s.issues >= 10 ? 'amber' : 'muted'}>{s.issues}</Badge>
                        ) : <CheckCircle2 size={14} className="text-accent3" />}
                      </td>
                      <td className="px-4 py-3 text-muted text-[11px]">{s.client}</td>
                      <td className="px-4 py-3">
                        <Badge variant={s.status === 'good' ? 'green' : s.status === 'warning' ? 'amber' : 'red'}>
                          {s.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── ALERTS TAB ────────────────────────────────────────────────── */}
      {tab === 'alerts' && (
        <div className="text-center py-12 text-sm text-muted">
          Automated alerts will appear here once your sites are connected and monitored.
        </div>
      )}

      {/* ── HEATMAP TAB ───────────────────────────────────────────────── */}
      {tab === 'heatmap' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-[11px] text-muted">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-accent3 inline-block" /> Score 70+</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-accent4 inline-block" /> Score 50-69</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-danger inline-block" /> Score &lt;50</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {DISPLAY_SITES.map(s => {
              const color = scoreColor(s.score)
              return (
                <div key={s.id} className="p-3 rounded-xl border transition-all hover:scale-[1.02] cursor-default"
                  style={{ borderColor: color+'40', background: color+'0a' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display font-black text-xl" style={{ color }}>{s.score}</span>
                    {s.alertCount > 0 && (
                      <span className="text-[9px] font-bold bg-danger text-white px-1.5 py-0.5 rounded-full">{s.alertCount}</span>
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-tx leading-tight truncate mb-0.5">{s.name}</div>
                  <div className="text-[10px] text-muted font-mono-jarvis truncate">{s.domain}</div>
                  <div className="flex items-center justify-between mt-2 text-[10px]">
                    <span className="text-muted">{s.traffic}</span>
                    <span className={s.changeUp ? 'text-accent3' : 'text-danger'}>{s.trafficChange}</span>
                  </div>
                  <div className="mt-1 h-1 bg-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width:`${s.score}%`, background:color }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary row */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted pt-2">
            <Zap size={12} className="text-accent" />
            <span>Combined portfolio: <span className="text-tx font-semibold">{(totalTraffic/1000000).toFixed(2)}M organic visits/mo</span></span>
            <span className="text-border">·</span>
            {DISPLAY_SITES.length > 0 && (<>
            <span>Healthiest: <span className="text-accent3 font-semibold">{DISPLAY_SITES.reduce((a,s) => s.score>a.score?s:a, DISPLAY_SITES[0]).name} ({DISPLAY_SITES.reduce((a,s) => s.score>a.score?s:a, DISPLAY_SITES[0]).score})</span></span>
            <span className="text-border">·</span>
            <span>Most urgent: <span className="text-danger font-semibold">{DISPLAY_SITES.reduce((a,s) => s.score<a.score?s:a, DISPLAY_SITES[0]).name} ({DISPLAY_SITES.reduce((a,s) => s.score<a.score?s:a, DISPLAY_SITES[0]).score})</span></span>
            </>)}
          </div>
        </div>
      )}
    </div>
  )
}
