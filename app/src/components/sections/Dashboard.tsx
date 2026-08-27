import { useState, useEffect, useMemo } from 'react'
import {
  MousePointer, Eye, Percent, Hash, AlertTriangle, TrendingUp,
  Loader2, ExternalLink, ChevronDown,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { useStore } from '@/store'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

function fmt(d: Date) { return d.toISOString().slice(0, 10) }

interface GSCRow { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }
interface TrendRow { date: string; clicks: number; impressions: number }
interface QueryRow  { query: string; clicks: number; impressions: number; position: number }
interface Kpis { clicks: number; impressions: number; ctr: string; position: string; queryCount: number }
interface AuditSummary { criticalIssues: number }

const impactColor: Record<string, 'red' | 'amber' | 'accent'> = {
  HIGH: 'red', MED: 'amber', LOW: 'accent',
}

function matchGscSite(domain: string, sites: string[]): string | undefined {
  if (!domain) return undefined
  const clean = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '').toLowerCase()
  return sites.find(s => {
    const sc = s.replace('sc-domain:', '').replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '').toLowerCase()
    return sc === clean || sc.endsWith('.' + clean) || clean.endsWith('.' + sc)
  })
}

export function Dashboard() {
  const { tasks, setSection, domain } = useStore()
  const orgId  = useAuthStore().org?.id ?? ''
  const pending = tasks.filter(t => !t.done).length

  const [expandedWin, setExpandedWin] = useState<number | null>(null)
  const [gscLoading, setGscLoading] = useState(true)
  const [gscSite,    setGscSite]    = useState<string | null>(null)
  const [kpis,       setKpis]       = useState<Kpis | null>(null)
  const [trend,      setTrend]      = useState<TrendRow[]>([])
  const [topQueries, setTopQueries] = useState<QueryRow[]>([])
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null)

  useEffect(() => {
    if (!orgId) return
    setGscLoading(true)
    setKpis(null); setTrend([]); setTopQueries([]); setGscSite(null); setExpandedWin(null); setAuditSummary(null)
    ;(async () => {
      try {
        const { data: conn } = await supabase
          .from('jarvis_gsc_connections')
          .select('selected_site, available_sites')
          .eq('org_id', orgId)
          .maybeSingle() as { data: { selected_site: string | null; available_sites: string[] | null } | null }

        // Fetch latest audit summary regardless of GSC connection
        supabase
          .from('jarvis_crawl_jobs')
          .select('issues')
          .eq('org_id', orgId)
          .eq('status', 'completed')
          .order('started_at', { ascending: false })
          .limit(1)
          .then(({ data }) => {
            if (data?.length) {
              const job = data[0] as { issues: number }
              setAuditSummary({ criticalIssues: job.issues })
            }
          })

        const availableSites = conn?.available_sites ?? []
        const siteUrl = (domain ? matchGscSite(domain, availableSites) : null)
          ?? conn?.selected_site
        if (!siteUrl) return
        setGscSite(siteUrl)

        const startDate = fmt(new Date(Date.now() - 28 * 86_400_000))
        const endDate   = fmt(new Date())

        const [trendRes, queryRes] = await Promise.all([
          supabase.functions.invoke('gsc-proxy', {
            body: { org_id: orgId, site_url: siteUrl, endpoint: 'searchAnalytics',
              params: { startDate, endDate, dimensions: ['date'], rowLimit: 28 } },
          }),
          supabase.functions.invoke('gsc-proxy', {
            body: { org_id: orgId, site_url: siteUrl, endpoint: 'searchAnalytics',
              params: { startDate, endDate, dimensions: ['query'], rowLimit: 100 } },
          }),
        ])

        const rows:  GSCRow[] = trendRes.data?.rows  ?? []
        const qRows: GSCRow[] = queryRes.data?.rows   ?? []

        const totalClicks = rows.reduce((s, r) => s + r.clicks, 0)
        const totalImpr   = rows.reduce((s, r) => s + r.impressions, 0)
        const avgCtr      = totalImpr > 0 ? ((totalClicks / totalImpr) * 100).toFixed(1) + '%' : '—'
        const avgPos      = totalImpr > 0
          ? (rows.reduce((s, r) => s + r.position * r.impressions, 0) / totalImpr).toFixed(1)
          : '—'

        setTrend(rows.map(r => ({
          date:        r.keys[0].slice(5),
          clicks:      r.clicks,
          impressions: r.impressions,
        })))

        setKpis({ clicks: totalClicks, impressions: totalImpr, ctr: avgCtr, position: avgPos, queryCount: qRows.length })

        setTopQueries(qRows.slice(0, 6).map(r => ({
          query:       r.keys[0],
          clicks:      r.clicks,
          impressions: r.impressions,
          position:    Math.round(r.position * 10) / 10,
        })))
      } catch (e) {
        console.error('[Dashboard] GSC error:', e)
      } finally {
        setGscLoading(false)
      }
    })()
  }, [orgId, domain])

  // ── Dynamic Quick Wins — recomputed whenever GSC data changes ─
  const quickWins = useMemo(() => {
    const siteName = domain
      || (gscSite ? gscSite.replace('sc-domain:', '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '')
      || 'your site'
    const hasData  = topQueries.length > 0 && kpis !== null
    const bestQ    = topQueries[0]
    const page2Q   = topQueries.filter(q => q.position > 10)
    const avgCtrNum = kpis ? parseFloat(kpis.ctr) : null

    return [
      {
        label: page2Q.length > 0
          ? `${page2Q.length} quer${page2Q.length > 1 ? 'ies' : 'y'} for "${siteName}" stuck on page 2+ — boost with internal linking`
          : `Boost position 11–20 pages for ${siteName} with internal linking`,
        impact: 'HIGH', type: 'Content',
        steps: [
          hasData && page2Q.length > 0
            ? `"${page2Q[0].query}" ranks #${Math.round(page2Q[0].position)} with ${page2Q[0].impressions.toLocaleString()} impressions — just off page 1`
            : `Open GSC Performance for ${siteName} and filter position 11–20`,
          'Identify 3–5 existing pages on your site with topically related content',
          'Add natural anchor-text links pointing to each target page',
          'Prioritise by highest impressions × lowest clicks ratio',
        ],
      },
      {
        label: hasData && avgCtrNum !== null && avgCtrNum < 5
          ? `${siteName} avg CTR is ${kpis!.ctr} — rewrite title tags to recover clicks`
          : `High impression / low CTR queries on ${siteName} — optimise title tags`,
        impact: 'HIGH', type: 'On-Page',
        steps: [
          hasData && bestQ
            ? `Top query "${bestQ.query}" gets ${bestQ.impressions.toLocaleString()} impressions — rewrite its title tag first`
            : `Filter GSC queries for ${siteName} by >1,000 impressions and CTR <5%`,
          'Add a power word (Best, Guide, Reviewed, Free) to each title',
          'Include the current year to signal freshness',
          'Monitor CTR change over 14 days after publishing',
        ],
      },
      {
        label: `Fix slow LCP on mobile for ${siteName} — Core Web Vitals impact`,
        impact: 'MED', type: 'Technical',
        steps: [
          `Run PageSpeed Insights on ${siteName}'s top 5 landing pages (Mobile tab)`,
          'Identify and lazy-load all images below the fold',
          'Preload the hero image with <link rel="preload"> in <head>',
          'Convert images to WebP/AVIF and serve them via CDN',
        ],
      },
      {
        label: hasData && bestQ
          ? `Build topical clusters around "${bestQ.query}" — ${siteName}'s top keyword`
          : `Build topical clusters around ${siteName}'s top-performing queries`,
        impact: 'MED', type: 'Content',
        steps: [
          hasData
            ? `Top ${Math.min(topQueries.length, 3)} keywords: ${topQueries.slice(0, 3).map(q => `"${q.query}"`).join(', ')}`
            : `List your top 5 money keywords from GSC or Rank Tracker for ${siteName}`,
          'Use KW Clustering to find related long-tail supporting terms',
          'Create or update 3–5 supporting articles per cluster topic',
          'Interlink all cluster articles back to the main pillar page',
        ],
      },
    ]
  }, [topQueries, kpis, domain, gscSite])

  type KpiCard = {
    label: string; value: string; color: string
    icon: React.ElementType; loading: boolean
    subtitle: React.ReactNode; tooltip: string
  }

  const KPI_CARDS: KpiCard[] = [
    { label: 'TOTAL CLICKS',    value: kpis?.clicks.toLocaleString()      ?? '—', color: 'var(--color-accent3)', icon: MousePointer, loading: gscLoading,
      subtitle: kpis ? 'Last 28 days' : <button onClick={() => setSection('gsc')} className="text-accent hover:underline cursor-pointer">Connect GSC →</button>,
      tooltip: 'Total number of times users clicked through to your site from Google Search results in the last 28 days. Higher clicks = more organic traffic.' },
    { label: 'IMPRESSIONS',     value: kpis?.impressions.toLocaleString()  ?? '—', color: 'var(--color-accent)',  icon: Eye,          loading: gscLoading,
      subtitle: kpis ? 'Last 28 days' : '',
      tooltip: 'How many times your pages appeared in Google Search results over the last 28 days, regardless of whether users clicked. High impressions with low clicks signals a CTR optimisation opportunity.' },
    { label: 'AVG. CTR',        value: kpis?.ctr                           ?? '—', color: '#a78bfa',              icon: Percent,      loading: gscLoading,
      subtitle: kpis ? 'Last 28 days' : '',
      tooltip: 'Click-Through Rate — the percentage of impressions that resulted in a click. A healthy industry average is 2–5%. Below 2% suggests your title tags and meta descriptions need improvement.' },
    { label: 'AVG. POSITION',   value: kpis ? `#${kpis.position}`          : '—', color: 'var(--color-accent4)', icon: Hash,         loading: gscLoading,
      subtitle: kpis ? 'Last 28 days' : '',
      tooltip: 'Your site\'s average ranking position across all keywords in Google Search. Position 1–3 captures ~60% of clicks. Lower numbers are better — aim to push averages below 10 (page 1).' },
    { label: 'KEYWORDS',        value: kpis?.queryCount.toLocaleString()   ?? '—', color: 'var(--color-accent)',  icon: TrendingUp,   loading: gscLoading,
      subtitle: kpis ? 'Last 28 days' : '',
      tooltip: 'Total number of unique search queries your site appeared for in Google Search over the last 28 days. A growing keyword count indicates expanding topical authority.' },
    { label: 'CRITICAL ISSUES', value: auditSummary ? String(auditSummary.criticalIssues) : '—', color: 'var(--color-danger)', icon: AlertTriangle, loading: gscLoading,
      subtitle: auditSummary
        ? <button onClick={() => setSection('analyzer')} className="text-danger hover:underline cursor-pointer">View audit →</button>
        : <button onClick={() => setSection('analyzer')} className="text-accent hover:underline cursor-pointer">Run audit →</button>,
      tooltip: 'Number of high-severity technical SEO issues found in your latest site crawl, such as broken links, missing meta tags, duplicate content, or crawl errors. Fix these first for maximum ranking impact.' },
  ]

  return (
    <div className="space-y-6">

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {KPI_CARDS.map(m => {
          return (
            <Card key={m.label} className="hover:border-accent transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 text-[10px] tracking-widest text-muted font-mono-jarvis">
                  {m.label}
                  <InfoTooltip text={m.tooltip} />
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-accent3 animate-pulse" />
              </div>

              {m.loading ? (
                <div className="h-7 flex items-center"><Loader2 size={16} className="animate-spin text-muted" /></div>
              ) : (
                <div className="text-2xl font-display font-black" style={{ color: m.color }}>
                  {m.value}
                </div>
              )}

              <div className="text-[10px] mt-1 text-muted font-mono-jarvis">
                {!m.loading && m.subtitle}
              </div>
            </Card>
          )
        })}
      </div>

      {/* ── Trend + Top Queries ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <CardTitle>Clicks &amp; Impressions (28d)</CardTitle>
              <InfoTooltip text="Daily trend of organic clicks and impressions from Google Search Console over the past 28 days. Diverging lines (high impressions, low clicks) indicate CTR issues worth investigating." />
            </div>
            {gscSite && (
              <span className="text-[10px] font-mono-jarvis text-muted truncate max-w-55">{gscSite}</span>
            )}
          </div>

          {gscLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 size={22} className="animate-spin text-muted" />
            </div>
          ) : trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={192}>
              <AreaChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="dClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--color-accent3)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-accent3)" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="dImpr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--color-accent)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: 'var(--color-muted)' }}
                />
                <Area type="monotone" dataKey="impressions" stroke="var(--color-accent)"  strokeWidth={1.5} fill="url(#dImpr)"   name="Impressions" />
                <Area type="monotone" dataKey="clicks"      stroke="var(--color-accent3)" strokeWidth={2}   fill="url(#dClicks)" name="Clicks" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-muted">No GSC data yet</p>
              <Button variant="ghost" onClick={() => setSection('gsc')}>
                <ExternalLink size={13} /> Connect Search Console
              </Button>
            </div>
          )}
        </Card>

        {/* Top Queries */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <CardTitle>Top Queries</CardTitle>
              <InfoTooltip text="The search queries driving the most clicks to your site from Google. Sorted by clicks. Use these to identify your highest-value keywords and prioritise content updates or internal linking." />
            </div>
            {topQueries.length > 0 && (
              <button onClick={() => setSection('gsc')} className="text-[10px] text-accent hover:underline cursor-pointer font-mono-jarvis">
                View all →
              </button>
            )}
          </div>

          {gscLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 size={22} className="animate-spin text-muted" />
            </div>
          ) : topQueries.length > 0 ? (
            <div className="space-y-0">
              {topQueries.map(q => (
                <div key={q.query} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
                  <span className="text-xs text-tx truncate flex-1">{q.query}</span>
                  <div className="flex items-center gap-2 shrink-0 text-[11px] font-mono-jarvis">
                    <span className="text-accent3 flex items-center gap-0.5">
                      {q.clicks} clk
                      <InfoTooltip text="Clicks: how many times users clicked this query's result in the last 28 days." size={10} />
                    </span>
                    <span className="text-muted flex items-center gap-0.5">
                      #{q.position}
                      <InfoTooltip text="Average Google ranking position for this query. Position 1 = top result. Positions 11+ are on page 2 or lower." size={10} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted text-center pt-10">
              {gscSite ? 'No query data' : 'Connect GSC to see top queries'}
            </div>
          )}
        </Card>
      </div>

      {/* ── Quick Wins ── */}
      <Card>
        <div className="flex items-center gap-1.5 mb-1">
          <CardTitle>Quick Wins</CardTitle>
          <InfoTooltip text="AI-generated SEO opportunities ranked by potential impact, derived from your live GSC data. Each win includes step-by-step implementation guidance. HIGH impact actions should be addressed first." />
        </div>
        <div className="text-[11px] text-muted mb-4">Highest-impact SEO actions this week — click any card to see how to implement it</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {quickWins.map((w, i) => (
            <div key={i}
              className="rounded-lg border border-border bg-surface hover:border-accent/50 transition-colors cursor-pointer"
              onClick={() => setExpandedWin(expandedWin === i ? null : i)}>
              <div className="flex items-center gap-3 p-3">
                <Badge variant={impactColor[w.impact]}>{w.impact}</Badge>
                <span className="flex-1 text-xs text-tx">{w.label}</span>
                <Badge variant="muted">{w.type}</Badge>
                <ChevronDown size={13} className={`text-muted shrink-0 transition-transform ${expandedWin === i ? 'rotate-180' : ''}`} />
              </div>
              {expandedWin === i && (
                <div className="px-3 pb-3 border-t border-border/60 pt-2.5">
                  <div className="text-[10px] font-mono-jarvis text-accent tracking-widest mb-2">HOW TO IMPLEMENT</div>
                  <ol className="space-y-1.5">
                    {w.steps.map((step, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-muted">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-accent/15 text-accent text-[9px] flex items-center justify-center font-bold mt-0.5">
                          {j + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Tasks + Caspira CTA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 flex items-center gap-6">
          <div>
            <div className="text-3xl font-display font-black text-accent">{pending}</div>
            <div className="text-xs text-muted flex items-center gap-1">
              pending tasks
              <InfoTooltip text="Number of SEO tasks in your tracker that are not yet marked as complete. Staying on top of these drives consistent ranking improvements." side="right" />
            </div>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold mb-1 flex items-center gap-1">
              Next priority
              <InfoTooltip text="The highest-priority incomplete task in your SEO tracker. Tackle critical tasks first to unblock ranking growth." side="right" />
            </div>
            <div className="text-xs text-muted">
              {tasks.find(t => !t.done && t.priority === 'critical')?.title
                ?? tasks.find(t => !t.done)?.title
                ?? 'All tasks complete'}
            </div>
          </div>
          <Button variant="ghost" onClick={() => setSection('tracker')}>View All →</Button>
        </Card>

        <Card className="bg-linear-to-br from-[#7c3aed15] to-[#00d4ff08] border-[#7c3aed30]">
          <CardTitle className="text-[#a78bfa]">Caspira AI Ready</CardTitle>
          <div className="text-[11px] text-muted mb-4">Ask anything about your SEO strategy</div>
          <Button variant="primary" className="w-full justify-center" onClick={() => setSection('jarvis')}>
            Open AI Co-Pilot
          </Button>
        </Card>
      </div>

    </div>
  )
}
