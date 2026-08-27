import { useState } from 'react'
import { Zap, TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { callDFS, isDFSReady, LOCATION_CODES, COUNTRIES } from '@/lib/dataforseo'

type ChangeType = 'up' | 'down' | 'new' | 'dropped' | 'same'

interface SERPRow {
  kw: string; pos: number | null; prev: number | null
  changeType: ChangeType; url: string | null
}

const FILTER_TABS = [
  { id: 'all',     label: 'All' },
  { id: 'up',      label: 'Gainers' },
  { id: 'down',    label: 'Losers' },
  { id: 'dropped', label: 'Dropped' },
]

async function checkPosition(keyword: string, targetDomain: string, country: string): Promise<{ pos: number | null; url: string | null }> {
  const clean = targetDomain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase()
  const locationCode = LOCATION_CODES[country] ?? 2840
  const result = await callDFS('serp/google/organic/live/advanced', [{
    keyword, location_code: locationCode, language_code: 'en', depth: 100,
  }])
  const items = (result?.items ?? []) as Array<{ type: string; rank_absolute?: number; url?: string }>
  for (const item of items) {
    if (item.type === 'organic' && item.url?.toLowerCase().includes(clean)) {
      return { pos: item.rank_absolute ?? null, url: item.url ?? null }
    }
  }
  return { pos: null, url: null }
}

export function UpdateSERP() {
  const { domain } = useStore()
  const dfsReady = isDFSReady()

  const [keywords,     setKeywords]     = useState('')
  const [targetDomain, setTargetDomain] = useState(domain || '')
  const [country,      setCountry]      = useState('us')
  const [refreshing,   setRefreshing]   = useState(false)
  const [lastUpdated,  setLastUpdated]  = useState<string | null>(null)
  const [filter,       setFilter]       = useState('all')
  const [rows,         setRows]         = useState<SERPRow[]>([])
  const [progress,     setProgress]     = useState<{ done: number; total: number } | null>(null)

  async function refresh() {
    if (refreshing || !dfsReady) return
    const kwList = keywords.split('\n').map(k => k.trim()).filter(Boolean)
    if (!kwList.length || !targetDomain.trim()) return

    setRefreshing(true)
    setProgress({ done: 0, total: kwList.length })
    const prev = [...rows]
    const newRows: SERPRow[] = []

    for (let i = 0; i < kwList.length; i++) {
      const kw = kwList[i]
      try {
        const { pos, url } = await checkPosition(kw, targetDomain.trim(), country)
        const prevPos = prev.find(r => r.kw === kw)?.pos ?? null
        let changeType: ChangeType = 'same'
        if (pos === null && prevPos !== null)               changeType = 'dropped'
        else if (pos !== null && prevPos === null)          changeType = 'new'
        else if (pos !== null && prevPos !== null && pos < prevPos) changeType = 'up'
        else if (pos !== null && prevPos !== null && pos > prevPos) changeType = 'down'
        newRows.push({ kw, pos, prev: prevPos, changeType, url })
      } catch {
        newRows.push({ kw, pos: null, prev: null, changeType: 'dropped', url: null })
      }
      setProgress({ done: i + 1, total: kwList.length })
    }

    setRows(newRows)
    setLastUpdated(new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }))
    setRefreshing(false)
    setProgress(null)
  }

  const displayed = filter === 'all' ? rows : rows.filter(r => r.changeType === filter)
  const gainers  = rows.filter(r => r.changeType === 'up').length
  const losers   = rows.filter(r => r.changeType === 'down').length
  const dropped  = rows.filter(r => r.changeType === 'dropped').length
  const newKws   = rows.filter(r => r.changeType === 'new').length

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle className="mb-1">Update SERP</CardTitle>
        <p className="text-sm text-muted mb-4">
          Check real Google positions for your keywords via DataForSEO. Paste keywords, enter your domain, and see where you actually rank.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="md:col-span-2">
            <textarea
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder={'One keyword per line:\nbest project management software\nbest running shoes 2026\nwireless earbuds buying guide…'}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors resize-none font-mono-jarvis scrollbar-thin"
              rows={4}
            />
          </div>
          <div className="flex flex-col gap-2">
            <input
              value={targetDomain}
              onChange={e => setTargetDomain(e.target.value)}
              placeholder="yoursite.com"
              className="bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors font-mono-jarvis"
            />
            <select value={country} onChange={e => setCountry(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-tx outline-none cursor-pointer">
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
            <Button variant="primary" onClick={refresh}
              disabled={refreshing || !dfsReady || !keywords.trim() || !targetDomain.trim()}>
              {refreshing ? `${progress?.done}/${progress?.total} checked…` : 'Check Positions'}
            </Button>
          </div>
        </div>

        {!dfsReady && (
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <AlertCircle size={11} className="text-amber-400 shrink-0" />
            Add a DataForSEO key (login:password) in Onboarding to check real Google positions.
          </div>
        )}
        {lastUpdated && (
          <div className="text-[11px] text-accent3 font-mono-jarvis">
            ● Last checked: {lastUpdated} · {rows.length} keywords
          </div>
        )}
      </Card>

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'GAINERS', val: gainers, color: '#10b981', tip: 'Keywords that moved up in position since the last check. A position improvement means Google found your page more relevant.' },
              { label: 'LOSERS',  val: losers,  color: '#ef4444', tip: 'Keywords that dropped in position since the last check. Investigate for content freshness, competitor activity, or algorithm changes.' },
              { label: 'NEW',     val: newKws,  color: '#00d4ff', tip: 'Keywords newly appearing in your tracked results — either you just started tracking them or your page recently entered the top 100.' },
              { label: 'DROPPED', val: dropped, color: '#6b7280', tip: 'Keywords no longer in the top 100 Google results for your domain. May indicate deindexation, penalty, or strong competitor displacement.' },
            ].map(k => (
              <Card key={k.label} className="text-center py-3">
                <div className="text-2xl font-display font-black mb-0.5" style={{ color: k.color }}>{k.val}</div>
                <div className="flex items-center justify-center gap-1 text-[9px] text-muted font-mono-jarvis tracking-widest">
                  {k.label}
                  <InfoTooltip text={k.tip} size={10} />
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1">
                {FILTER_TABS.map(t => (
                  <button key={t.id} onClick={() => setFilter(t.id)}
                    className={cn(
                      'text-[11px] px-3 py-1.5 rounded-lg font-mono-jarvis cursor-pointer transition-colors border',
                      filter === t.id ? 'bg-accent text-black border-accent' : 'border-border text-muted hover:border-accent/40 hover:text-tx'
                    )}>
                    {t.label}
                  </button>
                ))}
              </div>
              <button onClick={refresh} disabled={refreshing || !dfsReady}
                className="flex items-center gap-1.5 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer font-mono-jarvis disabled:opacity-40">
                <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} /> Refresh all
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] text-muted font-mono-jarvis tracking-widest">
                    <th className="text-left pb-2 font-medium">KEYWORD</th>
                    <th className="text-center pb-2 font-medium">
                      <span className="inline-flex items-center gap-1">POSITION <InfoTooltip text="Current Google ranking position for your domain. #1–3 = top results. #1–10 = page 1. '—' means not in top 100." /></span>
                    </th>
                    <th className="text-center pb-2 font-medium">
                      <span className="inline-flex items-center gap-1">PREV <InfoTooltip text="Your position at the previous SERP check. Compare with the current position to see rank movement." /></span>
                    </th>
                    <th className="text-center pb-2 font-medium">
                      <span className="inline-flex items-center gap-1">CHANGE <InfoTooltip text="Position change since last check. A positive number (green) means you moved up; negative (red) means you dropped." /></span>
                    </th>
                    <th className="text-left pb-2 font-medium pl-4">RANKING URL</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((r, i) => (
                    <tr key={i} className="border-b border-border/40 hover:bg-surface transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-tx">{r.kw}</td>
                      <td className="py-2.5 text-center font-display font-black text-base" style={{
                        color: r.pos === null ? '#6b7280' : r.pos <= 3 ? '#10b981' : r.pos <= 10 ? '#f59e0b' : '#e8f4fd',
                      }}>
                        {r.pos === null ? '—' : `#${r.pos}`}
                      </td>
                      <td className="py-2.5 text-center text-muted font-mono-jarvis">
                        {r.prev === null ? '—' : `#${r.prev}`}
                      </td>
                      <td className="py-2.5 text-center">
                        {r.changeType === 'up'      && <span className="flex items-center justify-center gap-0.5 text-accent3 font-bold text-[11px]"><TrendingUp size={11} />+{r.prev! - r.pos!}</span>}
                        {r.changeType === 'down'    && <span className="flex items-center justify-center gap-0.5 text-danger font-bold text-[11px]"><TrendingDown size={11} />-{r.pos! - r.prev!}</span>}
                        {r.changeType === 'same'    && <Minus size={11} className="text-muted mx-auto" />}
                        {r.changeType === 'new'     && <Badge variant="accent">New</Badge>}
                        {r.changeType === 'dropped' && <Badge variant="muted">Dropped</Badge>}
                      </td>
                      <td className="py-2.5 pl-4 text-muted font-mono-jarvis text-[10px] truncate max-w-60">{r.url ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {rows.length === 0 && !refreshing && (
        <Card className="text-center py-16">
          <Zap size={40} className="text-muted mx-auto mb-3" strokeWidth={1} />
          <div className="font-display font-bold text-lg text-tx mb-1">Real-time SERP checking</div>
          <div className="text-sm text-muted max-w-sm mx-auto">
            Paste keywords, enter your domain, and see your actual Google positions.
          </div>
        </Card>
      )}
    </div>
  )
}
