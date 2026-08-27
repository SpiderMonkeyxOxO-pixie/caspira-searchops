import { useState, useEffect, useCallback } from 'react'
import {
  Signal, MousePointer, Eye, Percent, Hash, Download, AlertCircle,
  Loader2, RefreshCw, ChevronDown, AlertTriangle, Zap,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { callBing, isBingReady, toBingSiteUrl, parseBingDate } from '@/lib/bingwebmaster'
import { useStore } from '@/store'
import { downloadCSV } from '@/lib/csv'

// ── Types ─────────────────────────────────────────────────────
interface UserSite  { Url: string; IsVerified: boolean }
interface TrendRow  { Date: string; Clicks: number; Impressions: number }
interface QueryRow  { Query: string; Clicks: number; Impressions: number; AvgClickPosition: number; AvgImpressionPosition: number; Date: string }
interface CrawlIssue { Url?: string; Message?: string; IssueType?: string }

type ContentTab = 'overview' | 'queries' | 'pages' | 'crawl'

const SITE_KEY = 'jarvis_bing_site'

function avg(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((s, n) => s + n, 0) / nums.length
}

// Bing's per-query rows are per-day — collapse to one row per query/page, summed
function collapse(rows: QueryRow[]): QueryRow[] {
  const map = new Map<string, QueryRow>()
  for (const r of rows) {
    const cur = map.get(r.Query)
    if (!cur) { map.set(r.Query, { ...r }); continue }
    cur.Clicks += r.Clicks
    cur.Impressions += r.Impressions
    cur.AvgClickPosition = (cur.AvgClickPosition + r.AvgClickPosition) / 2
    cur.AvgImpressionPosition = (cur.AvgImpressionPosition + r.AvgImpressionPosition) / 2
  }
  return [...map.values()].sort((a, b) => b.Clicks - a.Clicks || b.Impressions - a.Impressions)
}

export function BingWebmaster() {
  const { domain } = useStore()
  const ready = isBingReady()

  const [sites,        setSites]        = useState<UserSite[]>([])
  const [sitesLoading,  setSitesLoading] = useState(false)
  const [sitesErr,      setSitesErr]     = useState<string | null>(null)
  const [siteUrl,       setSiteUrl]      = useState(() => localStorage.getItem(SITE_KEY) ?? toBingSiteUrl(domain))

  const [trend,   setTrend]   = useState<TrendRow[]>([])
  const [queries, setQueries] = useState<QueryRow[]>([])
  const [pages,   setPages]   = useState<QueryRow[]>([])
  const [issues,  setIssues]  = useState<CrawlIssue[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [tab,     setTab]     = useState<ContentTab>('overview')
  const [loadedOnce, setLoadedOnce] = useState(false)

  useEffect(() => { if (siteUrl) localStorage.setItem(SITE_KEY, siteUrl) }, [siteUrl])

  const loadSites = useCallback(async () => {
    if (!ready) return
    setSitesLoading(true); setSitesErr(null)
    try {
      const d = await callBing<UserSite[]>('GetUserSites')
      const list = Array.isArray(d) ? d : []
      setSites(list)
      if (!siteUrl && list.length) setSiteUrl(list[0].Url)
    } catch (e) {
      setSitesErr(e instanceof Error ? e.message : 'Failed to load verified sites')
    } finally {
      setSitesLoading(false)
    }
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadSites() }, [loadSites])

  const fetchData = useCallback(async () => {
    if (!ready || !siteUrl) return
    setLoading(true); setError(null); setLoadedOnce(true)
    try {
      const [rank, qs, ps, iss] = await Promise.all([
        callBing<TrendRow[]>('GetRankAndTrafficStats', { siteUrl }),
        callBing<QueryRow[]>('GetQueryStats', { siteUrl }),
        callBing<QueryRow[]>('GetPageStats', { siteUrl }),
        callBing<CrawlIssue[]>('GetCrawlIssues', { siteUrl }).catch(() => []),
      ])
      setTrend((Array.isArray(rank) ? rank : []).slice(-28))
      setQueries(collapse(Array.isArray(qs) ? qs : []))
      setPages(collapse(Array.isArray(ps) ? ps : []))
      setIssues(Array.isArray(iss) ? iss : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Bing Webmaster data')
    } finally {
      setLoading(false)
    }
  }, [ready, siteUrl])

  const kpis = {
    clicks:      trend.reduce((s, r) => s + r.Clicks, 0),
    impressions: trend.reduce((s, r) => s + r.Impressions, 0),
    ctr: (() => {
      const imp = trend.reduce((s, r) => s + r.Impressions, 0)
      const clk = trend.reduce((s, r) => s + r.Clicks, 0)
      return imp > 0 ? `${((clk / imp) * 100).toFixed(1)}%` : '0%'
    })(),
    position: avg(queries.map(q => q.AvgClickPosition).filter(n => n > 0)).toFixed(1),
  }

  const chartData = trend.map(r => ({ date: parseBingDate(r.Date), clicks: r.Clicks, impressions: r.Impressions }))

  function exportCSV() {
    if (tab === 'queries') {
      downloadCSV(`bing-queries-${siteUrl}.csv`, ['Query', 'Clicks', 'Impressions', 'Avg Click Pos', 'Avg Impression Pos'],
        queries.map(q => [q.Query, q.Clicks, q.Impressions, q.AvgClickPosition.toFixed(1), q.AvgImpressionPosition.toFixed(1)]))
    } else if (tab === 'pages') {
      downloadCSV(`bing-pages-${siteUrl}.csv`, ['URL', 'Clicks', 'Impressions', 'Avg Click Pos', 'Avg Impression Pos'],
        pages.map(p => [p.Query, p.Clicks, p.Impressions, p.AvgClickPosition.toFixed(1), p.AvgImpressionPosition.toFixed(1)]))
    } else {
      downloadCSV(`bing-trend-${siteUrl}.csv`, ['Date', 'Clicks', 'Impressions'],
        trend.map(r => [parseBingDate(r.Date), r.Clicks, r.Impressions]))
    }
  }

  // ── Not connected ────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="space-y-5">
        <Card className="text-center py-12">
          <Signal size={48} className="mb-4 text-muted mx-auto" strokeWidth={1} />
          <div className="font-display font-black text-xl text-tx mb-2">Bing Webmaster Tools</div>
          <div className="text-sm text-muted max-w-md mx-auto leading-relaxed mb-6">
            Connect your Bing Webmaster API key to see clicks, impressions, top queries, top pages, and crawl issues from Bing search — for any site, any niche.
          </div>
          <Button variant="primary" onClick={() => useStore.getState().setSection('onboarding')}>
            <Zap size={13} /> Add API Key in Onboarding
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
              <Signal size={15} className="text-accent" />
            </div>
            <div>
              <CardTitle className="mb-0.5">Bing Webmaster</CardTitle>
              <div className="text-[11px] text-muted">Search performance data pulled live from Bing Webmaster Tools</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sites.length > 0 ? (
              <div className="relative">
                <select value={siteUrl} onChange={e => setSiteUrl(e.target.value)}
                  className="appearance-none bg-surface border border-border rounded-lg pl-3 pr-8 py-2 text-xs text-tx outline-none cursor-pointer font-mono-jarvis">
                  {sites.map(s => <option key={s.Url} value={s.Url}>{s.Url}{s.IsVerified ? '' : ' (unverified)'}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            ) : (
              <input value={siteUrl} onChange={e => setSiteUrl(e.target.value)}
                placeholder="https://yoursite.com/"
                className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors font-mono-jarvis w-56" />
            )}
            <Button variant="primary" onClick={fetchData} disabled={loading || !siteUrl}>
              {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {loading ? 'Loading…' : 'Fetch Data'}
            </Button>
          </div>
        </div>

        {sitesLoading && <div className="mt-3 text-[11px] text-muted">Loading verified sites from your Bing Webmaster account…</div>}
        {sitesErr && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">
            <AlertCircle size={13} className="shrink-0" />
            <span className="flex-1">{sitesErr}</span>
            <button onClick={loadSites} className="underline cursor-pointer shrink-0">Retry</button>
          </div>
        )}
        {!sitesLoading && !sitesErr && sites.length === 0 && (
          <div className="mt-3 text-[11px] text-muted">
            No verified sites found for this key — enter your site URL manually above, or add & verify it in Bing Webmaster Tools first.
          </div>
        )}
      </Card>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded-xl text-xs text-danger">
          <AlertCircle size={14} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchData} className="underline cursor-pointer shrink-0">Retry</button>
        </div>
      )}

      {!loadedOnce && !loading && !error && (
        <Card className="text-center py-10 text-sm text-muted">
          Click <strong className="text-tx">Fetch Data</strong> to pull your Bing Webmaster stats for this site.
        </Card>
      )}

      {(loading || (loadedOnce && !error)) && (
        <>
          {/* KPI row */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <Card key={i} className="h-24 animate-pulse bg-surface!" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'TOTAL CLICKS',  val: kpis.clicks.toLocaleString(),      icon: <MousePointer size={14} />, color: '#00d4ff', tip: 'Total clicks from Bing Search results over the loaded period (last 28 days of data returned by Bing).' },
                { label: 'IMPRESSIONS',   val: kpis.impressions.toLocaleString(), icon: <Eye size={14} />,          color: '#7c3aed', tip: 'Total impressions on Bing Search results over the loaded period.' },
                { label: 'AVG. CTR',      val: kpis.ctr,                          icon: <Percent size={14} />,      color: '#10b981', tip: 'Click-through rate — clicks divided by impressions across the loaded period.' },
                { label: 'AVG. POSITION', val: `#${kpis.position}`,               icon: <Hash size={14} />,         color: '#f59e0b', tip: 'Average click position across your top queries in Bing Search.' },
              ].map(k => (
                <Card key={k.label}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: k.color + '20', color: k.color }}>
                      {k.icon}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted font-mono-jarvis tracking-widest">
                      {k.label}
                      <InfoTooltip text={k.tip} />
                    </div>
                  </div>
                  <div className="font-display font-black text-2xl text-tx">{k.val}</div>
                </Card>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl w-fit flex-wrap">
              {([
                { id: 'overview', label: 'Overview' },
                { id: 'queries',  label: 'Queries'  },
                { id: 'pages',    label: 'Pages'    },
                { id: 'crawl',    label: 'Crawl Issues' },
              ] as { id: ContentTab; label: string }[]).map(({ id, label }) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold font-mono-jarvis tracking-wide transition-all cursor-pointer
                    ${tab === id ? 'bg-accent text-black' : 'text-muted hover:text-tx'}`}>
                  {label}
                </button>
              ))}
            </div>
            {!loading && (
              <Button variant="ghost" className="text-[11px]" onClick={exportCSV}>
                <Download size={12} /> Export CSV
              </Button>
            )}
          </div>

          {!loading && tab === 'overview' && (
            <Card>
              <CardTitle className="mb-4 flex items-center gap-1.5">
                Clicks &amp; Impressions
                <InfoTooltip text="Daily trend of clicks vs impressions on Bing Search over the loaded period." />
              </CardTitle>
              {chartData.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted">No trend data returned for this site.</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="bgClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="bgImpressions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize:10, fill:'var(--color-muted)' }} />
                    <YAxis tick={{ fontSize:10, fill:'var(--color-muted)' }} />
                    <Tooltip contentStyle={{ background:'var(--color-card)', border:'1px solid var(--color-border)', fontSize:11 }} />
                    <Area type="monotone" dataKey="impressions" stroke="#7c3aed" fill="url(#bgImpressions)" strokeWidth={2} name="Impressions" />
                    <Area type="monotone" dataKey="clicks"      stroke="#00d4ff" fill="url(#bgClicks)"      strokeWidth={2} name="Clicks" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>
          )}

          {!loading && tab === 'queries' && (
            <Card>
              <CardTitle className="mb-3">Top Queries ({queries.length})</CardTitle>
              {queries.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted">No query data returned for this site yet.</div>
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted font-mono-jarvis border-b border-border">
                        <th className="pb-2 pr-3">Query</th>
                        <th className="pb-2 pr-3 text-right">Clicks</th>
                        <th className="pb-2 pr-3 text-right">Impressions</th>
                        <th className="pb-2 pr-3 text-right">Avg Click Pos</th>
                        <th className="pb-2 text-right">Avg Impr. Pos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queries.slice(0, 100).map((q, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-3 text-tx">{q.Query}</td>
                          <td className="py-2 pr-3 text-right text-tx">{q.Clicks.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-right text-muted">{q.Impressions.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-right text-accent3">{q.AvgClickPosition > 0 ? q.AvgClickPosition.toFixed(1) : '—'}</td>
                          <td className="py-2 text-right text-muted">{q.AvgImpressionPosition.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {!loading && tab === 'pages' && (
            <Card>
              <CardTitle className="mb-3">Top Pages ({pages.length})</CardTitle>
              {pages.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted">No page data returned for this site yet.</div>
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted font-mono-jarvis border-b border-border">
                        <th className="pb-2 pr-3">Page</th>
                        <th className="pb-2 pr-3 text-right">Clicks</th>
                        <th className="pb-2 pr-3 text-right">Impressions</th>
                        <th className="pb-2 text-right">Avg Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pages.slice(0, 100).map((p, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-3 text-tx truncate max-w-100">{p.Query}</td>
                          <td className="py-2 pr-3 text-right text-tx">{p.Clicks.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-right text-muted">{p.Impressions.toLocaleString()}</td>
                          <td className="py-2 text-right text-accent3">{p.AvgClickPosition > 0 ? p.AvgClickPosition.toFixed(1) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {!loading && tab === 'crawl' && (
            <Card>
              <CardTitle className="mb-3 flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-400" />
                Crawl Issues ({issues.length})
              </CardTitle>
              {issues.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted">No crawl issues reported by Bingbot for this site. 🎉</div>
              ) : (
                <div className="space-y-2">
                  {issues.slice(0, 100).map((iss, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        {iss.IssueType && <Badge variant="amber" className="mb-1">{iss.IssueType}</Badge>}
                        {iss.Url && <div className="text-xs text-tx break-all">{iss.Url}</div>}
                        {iss.Message && <div className="text-[11px] text-muted mt-0.5">{iss.Message}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
