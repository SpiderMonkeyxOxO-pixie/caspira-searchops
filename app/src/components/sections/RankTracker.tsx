import { useState, useEffect } from 'react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { Search, TrendingUp, TrendingDown, Minus, Plus, RefreshCw, Trash2, AlertCircle, Download } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { callSerper, isSerperReady } from '@/lib/serper'
import { useStore } from '@/store'
import { downloadCSV } from '@/lib/csv'

const STORAGE_KEY = 'jarvis_rank_tracker'

interface TrackedKW {
  id: string
  kw: string
  positions: { date: string; pos: number | null }[]
}

type Filter = 'all' | 'top3' | 'top10' | 'p2' | 'unranked'

function posColor(p: number | null) {
  if (p === null) return '#6b7280'
  if (p <= 3)  return '#00d4ff'
  if (p <= 10) return '#10b981'
  if (p <= 20) return '#f59e0b'
  return '#ef4444'
}

function visScore(p: number | null) {
  if (p === null) return 0
  return Math.max(0, Math.round(100 - p * 2.8))
}

function Sparkline({ positions }: { positions: { pos: number | null }[] }) {
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

function loadTracked(): TrackedKW[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}

async function fetchPosition(keyword: string, targetDomain: string): Promise<number | null> {
  const clean = targetDomain.replace(/^www\./, '').toLowerCase()
  const data  = await callSerper(keyword, { num: 30, gl: 'in' })
  const organic = (data?.organic ?? []) as Array<{ link?: string; position?: number }>
  for (const r of organic) {
    if (r.link?.toLowerCase().includes(clean)) return r.position ?? null
  }
  return null
}

export function RankTracker() {
  const { domain } = useStore()
  const serperReady = isSerperReady()

  const [tracked,       setTracked]       = useState<TrackedKW[]>(loadTracked)
  const [targetDomain,  setTargetDomain]  = useState(domain || '')
  const [newKw,         setNewKw]         = useState('')
  const [filter,        setFilter]        = useState<Filter>('all')
  const [search,        setSearch]        = useState('')
  const [checking,      setChecking]      = useState<string | null>(null)
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [progress,      setProgress]      = useState<{ done: number; total: number } | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tracked))
  }, [tracked])

  function addKeyword() {
    const kw = newKw.trim()
    if (!kw || tracked.some(t => t.kw.toLowerCase() === kw.toLowerCase())) return
    setTracked(prev => [...prev, { id: Date.now().toString(), kw, positions: [] }])
    setNewKw('')
  }

  function removeKeyword(id: string) {
    setTracked(prev => prev.filter(t => t.id !== id))
  }

  async function checkOne(id: string) {
    if (!serperReady || !targetDomain.trim() || checking) return
    setChecking(id)
    const kw = tracked.find(t => t.id === id)
    if (kw) {
      try {
        const pos = await fetchPosition(kw.kw, targetDomain.trim())
        const today = new Date().toISOString().split('T')[0]
        setTracked(prev => prev.map(t => t.id === id ? {
          ...t, positions: [...t.positions.filter(p => p.date !== today), { date: today, pos }],
        } : t))
      } catch { /* silent */ }
    }
    setChecking(null)
  }

  function exportCSV() {
    const today = new Date().toISOString().slice(0, 10)
    downloadCSV(
      `rank-tracker-${targetDomain || 'export'}-${today}.csv`,
      ['Keyword', 'Current Position', 'Previous Position', 'Change', 'Visibility Score', 'Last Checked'],
      withCurrent.map(k => {
        const chg = k.prev !== null && k.cur !== null ? k.prev - k.cur : null
        const lastDate = k.positions.at(-1)?.date ?? ''
        return [k.kw, k.cur ?? 'Not ranked', k.prev ?? '—', chg !== null ? (chg > 0 ? `+${chg}` : chg) : '—', visScore(k.cur), lastDate]
      }),
    )
  }

  async function refreshAll() {
    if (!serperReady || !targetDomain.trim() || refreshingAll || tracked.length === 0) return
    setRefreshingAll(true)
    setProgress({ done: 0, total: tracked.length })
    const today = new Date().toISOString().split('T')[0]
    for (let i = 0; i < tracked.length; i++) {
      const t = tracked[i]
      try {
        const pos = await fetchPosition(t.kw, targetDomain.trim())
        setTracked(prev => prev.map(x => x.id === t.id ? {
          ...x, positions: [...x.positions.filter(p => p.date !== today), { date: today, pos }],
        } : x))
      } catch { /* silent */ }
      setProgress({ done: i + 1, total: tracked.length })
    }
    setRefreshingAll(false)
    setProgress(null)
  }

  const withCurrent = tracked.map(t => ({
    ...t,
    cur:  t.positions.at(-1)?.pos ?? null,
    prev: t.positions.at(-2)?.pos ?? null,
  }))

  const filtered = withCurrent.filter(k => {
    if (search && !k.kw.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'top3')    return k.cur !== null && k.cur <= 3
    if (filter === 'top10')   return k.cur !== null && k.cur <= 10
    if (filter === 'p2')      return k.cur !== null && k.cur > 10 && k.cur <= 20
    if (filter === 'unranked') return k.cur === null
    return true
  })

  const KPI = [
    { label: 'TOP 3',     val: withCurrent.filter(k => k.cur !== null && k.cur <= 3).length,                color: 'var(--color-accent)'  },
    { label: 'TOP 10',    val: withCurrent.filter(k => k.cur !== null && k.cur <= 10).length,               color: 'var(--color-accent3)' },
    { label: 'PAGE 2',    val: withCurrent.filter(k => k.cur !== null && k.cur > 10 && k.cur <= 20).length, color: 'var(--color-accent4)' },
    { label: 'NOT RANKED',val: withCurrent.filter(k => k.cur === null).length,                              color: 'var(--color-danger)'  },
  ]

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle className="mb-3">Rank Tracker</CardTitle>
        <div className="flex gap-3 mb-3">
          <input
            value={targetDomain}
            onChange={e => setTargetDomain(e.target.value)}
            placeholder="yoursite.com"
            className="flex-1 bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors font-mono-jarvis"
          />
          {tracked.length > 0 && (
            <>
              <Button variant="ghost" onClick={refreshAll}
                disabled={refreshingAll || !serperReady || !targetDomain.trim()}>
                <RefreshCw size={13} className={refreshingAll ? 'animate-spin' : ''} />
                {refreshingAll ? `${progress?.done}/${progress?.total}` : 'Refresh All'}
              </Button>
              <Button variant="ghost" onClick={exportCSV}>
                <Download size={13} /> Export CSV
              </Button>
            </>
          )}
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Plus size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={newKw}
              onChange={e => setNewKw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addKeyword()}
              placeholder="Add keyword to track (Enter to add)…"
              className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors"
            />
          </div>
          <Button variant="primary" onClick={addKeyword} disabled={!newKw.trim()}>
            <Plus size={13} /> Add
          </Button>
        </div>
        {!serperReady && (
          <div className="flex items-center gap-2 mt-3 text-[11px] text-muted">
            <AlertCircle size={11} className="text-amber-400 shrink-0" />
            Add a Serper key in Onboarding to check real Google positions.
          </div>
        )}
      </Card>

      {tracked.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-4">
            {KPI.map(k => (
              <Card key={k.label} className="text-center py-4">
                <div className="text-3xl font-display font-black" style={{ color: k.color }}>{k.val}</div>
                <div className="text-[10px] tracking-widest text-muted mt-1 font-mono-jarvis">{k.label}</div>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative shrink-0">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search keywords…"
                className="bg-surface border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-tx outline-none focus:border-accent w-52 transition-colors"
              />
            </div>
            <div className="flex gap-1">
              {(['all','top3','top10','p2','unranked'] as Filter[]).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                    filter === f ? 'bg-accent text-black' : 'bg-surface border border-border text-muted hover:border-accent'
                  )}>
                  {f === 'all' ? 'All' : f === 'top3' ? 'Top 3' : f === 'top10' ? 'Top 10' : f === 'p2' ? 'Page 2' : 'Not Ranked'}
                </button>
              ))}
            </div>
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['KEYWORD','POSITION','CHANGE','TREND','VISIBILITY',''].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(kw => {
                    const chg = (kw.prev !== null && kw.cur !== null) ? kw.prev - kw.cur : null
                    const vis = visScore(kw.cur)
                    return (
                      <tr key={kw.id} className="border-b border-border hover:bg-surface transition-colors">
                        <td className="px-4 py-3 font-semibold text-tx truncate max-w-52">{kw.kw}</td>
                        <td className="px-4 py-3">
                          <span className="font-display font-black text-base" style={{ color: posColor(kw.cur) }}>
                            {kw.cur === null ? (kw.positions.length ? '—' : 'not checked') : `#${kw.cur}`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {chg === null
                            ? <span className="text-muted text-[10px]">—</span>
                            : <span className={cn('flex items-center gap-1 font-mono-jarvis text-[11px] font-bold',
                                chg > 0 ? 'text-accent3' : chg < 0 ? 'text-danger' : 'text-muted')}>
                                {chg > 0 ? <TrendingUp size={11} /> : chg < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                                {chg > 0 ? `+${chg}` : chg}
                              </span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <Sparkline positions={kw.positions} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 w-24">
                            <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${vis}%`, background: posColor(kw.cur) }} />
                            </div>
                            <span className="font-mono-jarvis text-[10px]" style={{ color: posColor(kw.cur) }}>{vis}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => checkOne(kw.id)}
                              disabled={!serperReady || checking === kw.id || !targetDomain.trim()}
                              className="text-[10px] text-accent hover:underline cursor-pointer disabled:opacity-40 font-mono-jarvis whitespace-nowrap">
                              {checking === kw.id ? 'checking…' : 'check now'}
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

      {tracked.length === 0 && (
        <Card className="text-center py-16">
          <TrendingUp size={40} className="text-muted mx-auto mb-3" strokeWidth={1} />
          <div className="font-display font-bold text-lg text-tx mb-1">Track real Google rankings</div>
          <div className="text-sm text-muted max-w-sm mx-auto">
            Add keywords, enter your domain, then click <strong>check now</strong> to see your actual position.
            Rankings are saved and tracked over time.
          </div>
        </Card>
      )}
    </div>
  )
}
