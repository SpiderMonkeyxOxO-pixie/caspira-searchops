import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import {
  Search, TrendingUp, TrendingDown, Minus, Plus, RefreshCw, Trash2,
  AlertCircle, Download, Upload, Globe, Loader2, X,
} from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { callSerper, isSerperReady } from '@/lib/serper'
import { useStore } from '@/store'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { downloadCSV } from '@/lib/csv'

// ── Types ─────────────────────────────────────────────────────
interface Position { date: string; pos: number | null; cpos?: number | null }
interface TrackedKW { id: string; kw: string; positions: Position[] }
interface DbKW      { id: string; org_id: string; kw: string; positions: Position[]; created_at: string }
type Filter = 'all' | 'top3' | 'top10' | 'p2' | 'unranked'

// ── Constants ─────────────────────────────────────────────────
const COMP_KEY    = 'jarvis_rank_competitor'
const COUNTRY_KEY = 'jarvis_rank_country'

const COUNTRIES = [
  { code: 'in', label: 'India'   },
  { code: 'us', label: 'US'      },
  { code: 'gb', label: 'UK'      },
  { code: 'au', label: 'AU'      },
  { code: 'ca', label: 'CA'      },
  { code: 'ph', label: 'PH'      },
  { code: 'id', label: 'ID'      },
  { code: 'sg', label: 'SG'      },
  { code: 'my', label: 'MY'      },
  { code: 'nz', label: 'NZ'      },
]

// ── Helpers ───────────────────────────────────────────────────
function posColor(p: number | null) {
  if (p === null) return '#6b7280'
  if (p <= 3)    return '#00d4ff'
  if (p <= 10)   return '#10b981'
  if (p <= 20)   return '#f59e0b'
  return '#ef4444'
}

function visScore(p: number | null) {
  if (p === null) return 0
  return Math.max(0, Math.round(100 - p * 2.8))
}

async function fetchPosition(keyword: string, targetDomain: string, country = 'in'): Promise<number | null> {
  const clean = targetDomain
    .replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase()
  const data    = await callSerper(keyword, { num: 30, gl: country })
  const organic = (data?.organic ?? []) as Array<{ link?: string; position?: number }>
  for (const r of organic) {
    if (r.link?.toLowerCase().includes(clean)) return r.position ?? null
  }
  return null
}

// ── Sparkline ─────────────────────────────────────────────────
function Sparkline({ positions }: { positions: Position[] }) {
  const pts = positions.slice(-14).map((v, i) => ({ i, v: v.pos ?? 0 }))
  if (pts.length < 2) return <span className="text-[10px] text-muted font-mono-jarvis">—</span>
  const first = pts[0].v, last = pts[pts.length - 1].v
  const color = (first > last && last > 0) ? '#10b981' : '#ef4444'
  return (
    <ResponsiveContainer width={100} height={32}>
      <LineChart data={pts}>
        <Tooltip content={({ payload }) =>
          payload?.[0] ? (
            <div className="bg-card border border-border rounded px-2 py-1 text-[10px] font-mono-jarvis text-accent">
              {payload[0].value ? `#${payload[0].value}` : '—'}
            </div>
          ) : null
        } />
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Component ─────────────────────────────────────────────────
export function RankTracker() {
  const { domain }   = useStore()
  const orgId        = useAuthStore().org?.id ?? ''
  const serperReady  = isSerperReady()

  const [tracked,          setTracked]          = useState<TrackedKW[]>([])
  const [loading,          setLoading]          = useState(true)
  const [targetDomain,     setTargetDomain]     = useState(domain || '')
  const [competitorDomain, setCompetitorDomain] = useState(() => localStorage.getItem(COMP_KEY) ?? '')
  const [country,          setCountry]          = useState(() => localStorage.getItem(COUNTRY_KEY) ?? 'in')
  const [newKw,            setNewKw]            = useState('')
  const [bulkText,         setBulkText]         = useState('')
  const [showBulk,         setShowBulk]         = useState(false)
  const [filter,           setFilter]           = useState<Filter>('all')
  const [search,           setSearch]           = useState('')
  const [checking,         setChecking]         = useState<string | null>(null)
  const [refreshingAll,    setRefreshingAll]    = useState(false)
  const [progress,         setProgress]         = useState<{ done: number; total: number } | null>(null)
  const [gscImporting,     setGscImporting]     = useState(false)

  // Persist settings
  useEffect(() => { localStorage.setItem(COMP_KEY,    competitorDomain) }, [competitorDomain])
  useEffect(() => { localStorage.setItem(COUNTRY_KEY, country)          }, [country])

  // Sync target domain when active site changes
  useEffect(() => { if (domain) setTargetDomain(domain) }, [domain])

  // ── Supabase CRUD ──────────────────────────────────────────
  const loadKeywords = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('jarvis_rank_keywords')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true }) as { data: DbKW[] | null }
    setTracked((data ?? []).map(r => ({ id: r.id, kw: r.kw, positions: r.positions ?? [] })))
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadKeywords() }, [loadKeywords])

  async function savePositions(id: string, positions: Position[]) {
    await supabase.from('jarvis_rank_keywords').update({ positions } as never).eq('id', id)
    setTracked(prev => prev.map(t => t.id === id ? { ...t, positions } : t))
  }

  async function addKeyword() {
    const kw = newKw.trim()
    if (!kw || !orgId || tracked.some(t => t.kw.toLowerCase() === kw.toLowerCase())) return
    const { data } = await supabase
      .from('jarvis_rank_keywords')
      .insert({ org_id: orgId, kw, positions: [] } as never)
      .select().single() as { data: DbKW | null }
    if (data) setTracked(prev => [...prev, { id: data.id, kw: data.kw, positions: [] }])
    setNewKw('')
  }

  async function bulkAdd() {
    const kws = bulkText.split(/[\n,;]+/)
      .map(k => k.trim()).filter(Boolean)
      .filter(k => !tracked.some(t => t.kw.toLowerCase() === k.toLowerCase()))
    if (!kws.length || !orgId) return
    const { data } = await supabase
      .from('jarvis_rank_keywords')
      .insert(kws.map(kw => ({ org_id: orgId, kw, positions: [] })) as never)
      .select() as { data: DbKW[] | null }
    if (data) setTracked(prev => [...prev, ...data.map(r => ({ id: r.id, kw: r.kw, positions: [] }))])
    setBulkText(''); setShowBulk(false)
  }

  async function importFromGSC() {
    if (!orgId) return
    setGscImporting(true)
    try {
      const { data: conn } = await supabase
        .from('jarvis_gsc_connections')
        .select('selected_site')
        .eq('org_id', orgId)
        .maybeSingle() as { data: { selected_site: string | null } | null }

      if (!conn?.selected_site) { setGscImporting(false); return }

      const endDate   = new Date().toISOString().slice(0, 10)
      const startDate = new Date(Date.now() - 28 * 86_400_000).toISOString().slice(0, 10)

      const { data: gscData } = await supabase.functions.invoke('gsc-proxy', {
        body: { org_id: orgId, site_url: conn.selected_site, endpoint: 'searchAnalytics',
          params: { startDate, endDate, dimensions: ['query'], rowLimit: 50 } },
      })

      const queries = ((gscData?.rows ?? []) as Array<{ keys: string[] }>)
        .map(r => r.keys[0])
        .filter(k => k && !tracked.some(t => t.kw.toLowerCase() === k.toLowerCase()))

      if (queries.length > 0) {
        const { data: inserted } = await supabase
          .from('jarvis_rank_keywords')
          .insert(queries.map(kw => ({ org_id: orgId, kw, positions: [] })) as never)
          .select() as { data: DbKW[] | null }
        if (inserted) setTracked(prev => [...prev, ...inserted.map(r => ({ id: r.id, kw: r.kw, positions: [] }))])
      }
    } catch { /* silent */ }
    setGscImporting(false)
  }

  async function removeKeyword(id: string) {
    await supabase.from('jarvis_rank_keywords').delete().eq('id', id)
    setTracked(prev => prev.filter(t => t.id !== id))
  }

  // ── Position checks ────────────────────────────────────────
  async function checkOne(id: string) {
    if (!serperReady || !targetDomain.trim() || checking) return
    setChecking(id)
    const kw = tracked.find(t => t.id === id)
    if (kw) {
      try {
        const [pos, cpos] = await Promise.all([
          fetchPosition(kw.kw, targetDomain.trim(), country),
          competitorDomain.trim() ? fetchPosition(kw.kw, competitorDomain.trim(), country) : Promise.resolve(null),
        ])
        const today = new Date().toISOString().split('T')[0]
        const newPositions: Position[] = [
          ...kw.positions.filter(p => p.date !== today),
          { date: today, pos, ...(competitorDomain.trim() ? { cpos } : {}) },
        ]
        await savePositions(id, newPositions)
      } catch { /* silent */ }
    }
    setChecking(null)
  }

  async function refreshAll() {
    if (!serperReady || !targetDomain.trim() || refreshingAll || tracked.length === 0) return
    setRefreshingAll(true)
    setProgress({ done: 0, total: tracked.length })
    const today = new Date().toISOString().split('T')[0]
    for (let i = 0; i < tracked.length; i++) {
      const t = tracked[i]
      try {
        const [pos, cpos] = await Promise.all([
          fetchPosition(t.kw, targetDomain.trim(), country),
          competitorDomain.trim() ? fetchPosition(t.kw, competitorDomain.trim(), country) : Promise.resolve(null),
        ])
        const newPositions: Position[] = [
          ...t.positions.filter(p => p.date !== today),
          { date: today, pos, ...(competitorDomain.trim() ? { cpos } : {}) },
        ]
        await savePositions(t.id, newPositions)
      } catch { /* silent */ }
      setProgress({ done: i + 1, total: tracked.length })
    }
    setRefreshingAll(false)
    setProgress(null)
  }

  // ── Derived data ───────────────────────────────────────────
  const withCurrent = tracked.map(t => ({
    ...t,
    cur:  t.positions.at(-1)?.pos  ?? null,
    prev: t.positions.at(-2)?.pos  ?? null,
    ccur: (t.positions.at(-1) as Position | undefined)?.cpos ?? null,
  }))

  const filtered = withCurrent.filter(k => {
    if (search && !k.kw.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'top3')     return k.cur !== null && k.cur <= 3
    if (filter === 'top10')    return k.cur !== null && k.cur <= 10
    if (filter === 'p2')       return k.cur !== null && k.cur > 10 && k.cur <= 20
    if (filter === 'unranked') return k.cur === null
    return true
  })

  const KPI = [
    { label: 'TOP 3',      val: withCurrent.filter(k => k.cur !== null && k.cur <= 3).length,                color: 'var(--color-accent)',  tip: 'Keywords ranking in positions 1–3 on Google — prime organic real estate' },
    { label: 'TOP 10',     val: withCurrent.filter(k => k.cur !== null && k.cur <= 10).length,               color: 'var(--color-accent3)', tip: 'Keywords on page 1 of Google (positions 1–10)' },
    { label: 'PAGE 2',     val: withCurrent.filter(k => k.cur !== null && k.cur > 10 && k.cur <= 20).length, color: 'var(--color-accent4)', tip: 'Keywords ranked positions 11–20 (page 2) — close to page 1 with a push' },
    { label: 'NOT RANKED', val: withCurrent.filter(k => k.cur === null).length,                              color: 'var(--color-danger)',  tip: 'Keywords not found in the top 30 Google results for your domain' },
  ]

  function exportCSV() {
    const today = new Date().toISOString().slice(0, 10)
    downloadCSV(
      `rank-tracker-${targetDomain || 'export'}-${today}.csv`,
      ['Keyword', 'Position', 'Competitor Position', 'Change', 'Visibility Score', 'Last Checked'],
      withCurrent.map(k => {
        const chg     = k.prev !== null && k.cur !== null ? k.prev - k.cur : null
        const lastDate = k.positions.at(-1)?.date ?? ''
        return [
          k.kw,
          k.cur  ?? 'Not ranked',
          k.ccur ?? '—',
          chg !== null ? (chg > 0 ? `+${chg}` : chg) : '—',
          visScore(k.cur),
          lastDate,
        ]
      }),
    )
  }

  const hasCompetitor = competitorDomain.trim().length > 0
  const bulkCount     = bulkText.split(/[\n,;]+/).filter(k => k.trim()).length

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Settings card */}
      <Card>
        <CardTitle className="mb-3">Rank Tracker</CardTitle>

        {/* Domain inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1">TARGET DOMAIN</div>
            <input value={targetDomain} onChange={e => setTargetDomain(e.target.value)}
              placeholder="yoursite.com"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors font-mono-jarvis" />
          </div>
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1">
              COMPETITOR DOMAIN <span className="opacity-50">(optional)</span>
            </div>
            <input value={competitorDomain} onChange={e => setCompetitorDomain(e.target.value)}
              placeholder="competitor.com"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent4 transition-colors font-mono-jarvis" />
          </div>
        </div>

        {/* Add keyword row */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Plus size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={newKw} onChange={e => setNewKw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addKeyword()}
              placeholder="Add keyword (Enter to add)…"
              className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors" />
          </div>
          <Button variant="primary" onClick={addKeyword} disabled={!newKw.trim()}>
            <Plus size={13} /> Add
          </Button>
          <Button variant="ghost" onClick={() => setShowBulk(s => !s)}>
            <Upload size={13} /> Bulk
          </Button>
          <Button variant="ghost" onClick={importFromGSC} disabled={gscImporting || !orgId}>
            {gscImporting ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
            {gscImporting ? 'Importing…' : 'From GSC'}
          </Button>
          <select value={country} onChange={e => setCountry(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-muted outline-none cursor-pointer hover:border-accent transition-colors font-mono-jarvis">
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          {tracked.length > 0 && (
            <>
              <Button variant="ghost" onClick={refreshAll}
                disabled={refreshingAll || !serperReady || !targetDomain.trim()}>
                <RefreshCw size={13} className={refreshingAll ? 'animate-spin' : ''} />
                {refreshingAll && progress ? `${progress.done}/${progress.total}` : 'Refresh All'}
              </Button>
              <Button variant="ghost" onClick={exportCSV} title="Export CSV">
                <Download size={13} />
              </Button>
            </>
          )}
        </div>

        {/* Bulk import panel */}
        {showBulk && (
          <div className="mt-3 border border-accent/30 rounded-xl p-4 bg-accent/5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-mono-jarvis tracking-widest text-accent">BULK IMPORT — one keyword per line</div>
              <button onClick={() => setShowBulk(false)} className="text-muted hover:text-tx cursor-pointer">
                <X size={13} />
              </button>
            </div>
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              rows={6}
              placeholder={"best online casino india\ncasino bonus guide\nfree spins no deposit\nlive casino games\n…"}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent resize-none transition-colors"
            />
            <div className="flex items-center gap-3 mt-2">
              <Button variant="primary" onClick={bulkAdd} disabled={!bulkText.trim()}>
                <Plus size={13} /> Add {bulkCount} keyword{bulkCount !== 1 ? 's' : ''}
              </Button>
              <span className="text-[10px] text-muted font-mono-jarvis">Duplicates are skipped automatically</span>
            </div>
          </div>
        )}

        {!serperReady && (
          <div className="flex items-center gap-2 mt-3 text-[11px] text-muted">
            <AlertCircle size={11} className="text-amber-400 shrink-0" />
            Add a Serper API key in Settings → to check real Google positions.
          </div>
        )}
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40 gap-2 text-muted text-sm">
          <Loader2 size={16} className="animate-spin" /> Loading keywords…
        </div>
      )}

      {/* KPI + table */}
      {!loading && tracked.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-4">
            {KPI.map(k => (
              <Card key={k.label} className="text-center py-4">
                <div className="text-3xl font-display font-black" style={{ color: k.color }}>{k.val}</div>
                <div className="text-[10px] tracking-widest text-muted mt-1 font-mono-jarvis inline-flex items-center gap-1 justify-center">
                  {k.label} <InfoTooltip text={k.tip} />
                </div>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative shrink-0">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search keywords…"
                className="bg-surface border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-tx outline-none focus:border-accent w-52 transition-colors" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['all','top3','top10','p2','unranked'] as Filter[]).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                    filter === f ? 'bg-accent text-black' : 'bg-surface border border-border text-muted hover:border-accent'
                  )}>
                  {f === 'all' ? `All (${tracked.length})` : f === 'top3' ? 'Top 3' : f === 'top10' ? 'Top 10' : f === 'p2' ? 'Page 2' : 'Not Ranked'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal whitespace-nowrap">KEYWORD</th>
                    <th className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">POSITION <InfoTooltip text="Current Google ranking position for this keyword on your domain" /></span>
                    </th>
                    {hasCompetitor && (
                      <th className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">COMPETITOR <InfoTooltip text="Current Google ranking position for your competitor domain on this keyword" /></span>
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">CHANGE <InfoTooltip text="Position change vs. previous check. Positive = moved up (gained ranks), negative = moved down." /></span>
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">TREND <InfoTooltip text="14-day sparkline of ranking history. Rising line = improving position." /></span>
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">VISIBILITY <InfoTooltip text="Estimated click-through visibility score (0–100) based on current position. Position 1 ≈ 72, position 10 ≈ 44." /></span>
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal whitespace-nowrap"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(kw => {
                    const chg      = (kw.prev !== null && kw.cur !== null) ? kw.prev - kw.cur : null
                    const vis      = visScore(kw.cur)
                    const isAhead  = hasCompetitor && kw.cur !== null && kw.ccur !== null && kw.cur < kw.ccur
                    const isBehind = hasCompetitor && kw.cur !== null && kw.ccur !== null && kw.cur > kw.ccur
                    return (
                      <tr key={kw.id} className="border-b border-border hover:bg-surface transition-colors">
                        <td className="px-4 py-3 font-semibold text-tx max-w-52 truncate">{kw.kw}</td>
                        <td className="px-4 py-3">
                          {kw.cur === null ? (
                            <span className="text-[11px] font-mono-jarvis text-muted italic">
                              {kw.positions.length ? '—' : 'not checked'}
                            </span>
                          ) : (
                            <span className="font-display font-black text-base" style={{ color: posColor(kw.cur) }}>
                              #{kw.cur}
                            </span>
                          )}
                        </td>
                        {hasCompetitor && (
                          <td className="px-4 py-3">
                            <span className={cn(
                              'font-mono-jarvis text-[12px] font-bold',
                              isAhead  ? 'text-accent3' :
                              isBehind ? 'text-danger'  : 'text-muted'
                            )}>
                              {kw.ccur === null ? '—' : `#${kw.ccur}`}
                              {isAhead  && <span className="ml-1 text-[10px]">▲ you win</span>}
                              {isBehind && <span className="ml-1 text-[10px]">▼ behind</span>}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          {chg === null ? (
                            <span className="text-muted text-[10px]">—</span>
                          ) : (
                            <span className={cn('flex items-center gap-1 font-mono-jarvis text-[11px] font-bold',
                              chg > 0 ? 'text-accent3' : chg < 0 ? 'text-danger' : 'text-muted')}>
                              {chg > 0 ? <TrendingUp size={11} /> : chg < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                              {chg > 0 ? `+${chg}` : chg}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Sparkline positions={kw.positions} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 w-24">
                            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${vis}%`, background: posColor(kw.cur) }} />
                            </div>
                            <span className="font-mono-jarvis text-[10px] w-6 text-right" style={{ color: posColor(kw.cur) }}>{vis}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => checkOne(kw.id)}
                              disabled={!serperReady || !!checking || refreshingAll || !targetDomain.trim()}
                              className="text-[10px] text-accent hover:underline cursor-pointer disabled:opacity-40 font-mono-jarvis whitespace-nowrap">
                              {checking === kw.id ? <span className="flex items-center gap-1"><Loader2 size={9} className="animate-spin" />checking…</span> : 'check now'}
                            </button>
                            <button onClick={() => removeKeyword(kw.id)}
                              className="text-muted hover:text-danger cursor-pointer transition-colors">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-10 text-muted text-sm">No keywords match your filter</div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Empty state */}
      {!loading && tracked.length === 0 && (
        <Card className="text-center py-16">
          <TrendingUp size={40} className="text-muted mx-auto mb-3" strokeWidth={1} />
          <div className="font-display font-bold text-lg text-tx mb-1">Track real Google rankings</div>
          <div className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
            Add keywords above, enter your domain, then click <strong>check now</strong> to see actual Google positions.
            All rankings are saved to your organisation and tracked over time.
          </div>
          <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
            <button onClick={() => setShowBulk(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:border-accent hover:text-accent cursor-pointer transition-colors font-mono-jarvis">
              <Upload size={12} /> Bulk import keywords
            </button>
            <button onClick={importFromGSC} disabled={gscImporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:border-accent hover:text-accent cursor-pointer transition-colors font-mono-jarvis">
              {gscImporting ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
              Import from GSC
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}
