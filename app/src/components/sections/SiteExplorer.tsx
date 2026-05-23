import { useState } from 'react'
import { SearchCode, Globe, TrendingUp, Link2, Star, ExternalLink, AlertCircle, KeyRound, Loader2, Download, Users, History } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import { downloadCSV } from '@/lib/csv'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

type SiteTab = 'overview' | 'keywords' | 'backlinks' | 'competitors'

interface KwItem   { kw: string; pos: number; vol: number; traffic: number; url: string }
interface BlItem   { domain: string; rank: number; anchor: string; dofollow: boolean; url: string; date: string }
interface CompItem { domain: string; traffic: number; keywords: number; commonKws: number }
interface HistItem { month: string; traffic: number }

interface SiteProfile {
  domain:       string
  dr:           number | null
  rank:         string | null
  traffic:      number | null
  keywords:     number | null
  backlinks:    number | null
  refDomains:   number | null
  history:      HistItem[]
  topKeywords:  KwItem[]
  topBacklinks: BlItem[]
  competitors:  CompItem[]
  kwLoaded:     boolean
  blLoaded:     boolean
  compLoaded:   boolean
}

interface SiteExplorerRecord {
  id: string; savedAt: string; label: string; sublabel: string
  domain: string; profile: SiteProfile
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

async function fetchOPR(domain: string, key: string) {
  try {
    const { data, error } = await supabase.functions.invoke('opr-proxy', { body: { domain, apiKey: key } })
    if (error) return null
    const e = data?.response?.[0]
    if (!e || e.status_code === 404 || e.status_code === 0) return { dr: 0, rank: '—' }
    if (e.status_code !== 200) return null
    return {
      dr:   Math.round(e.page_rank_decimal ?? e.page_rank_integer ?? 0),
      rank: e.rank ? `#${Number(e.rank).toLocaleString()}` : '—',
    }
  } catch { return null }
}

async function dfs(endpoint: string, body: object[], creds: string) {
  try {
    const { data, error } = await supabase.functions.invoke('dataforseo-proxy', {
      body: { credentials: creds, endpoint, body },
    })
    return error ? null : data
  } catch { return null }
}

export function SiteExplorer() {
  const { openPageRankKey, dataForSEOKey, setSection } = useStore()

  const [query,       setQuery]       = useState('')
  const [profile,     setProfile]     = useState<SiteProfile | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [tab,         setTab]         = useState<SiteTab>('overview')
  const [loadingKw,   setLoadingKw]   = useState(false)
  const [loadingBl,   setLoadingBl]   = useState(false)
  const [loadingComp, setLoadingComp] = useState(false)
  const [histTab,     setHistTab]     = useState<'tool' | 'history'>('tool')

  const { records, save, remove, clear } = useHistory<SiteExplorerRecord>('jarvis_siteexplorer_history')

  async function explore(target?: string) {
    const d = (target ?? query).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!d) return
    setQuery(d)
    setLoading(true)
    setProfile(null)
    setTab('overview')

    const dateFrom = new Date()
    dateFrom.setFullYear(dateFrom.getFullYear() - 1)
    const dateFromStr = dateFrom.toISOString().slice(0, 10)

    const [opr, rankRes, blRes, histRes] = await Promise.all([
      openPageRankKey
        ? fetchOPR(d, openPageRankKey)
        : Promise.resolve(null),
      dataForSEOKey
        ? dfs('dataforseo_labs/google/domain_rank_overview/live',
            [{ target: d, location_code: 2356, language_code: 'en' }], dataForSEOKey)
        : Promise.resolve(null),
      dataForSEOKey
        ? dfs('backlinks/summary/live',
            [{ target: d, limit: 1 }], dataForSEOKey)
        : Promise.resolve(null),
      dataForSEOKey
        ? dfs('dataforseo_labs/google/historical_rank_overview/live',
            [{ target: d, location_code: 2356, language_code: 'en', date_from: dateFromStr }], dataForSEOKey)
        : Promise.resolve(null),
    ])

    const organic = rankRes?.tasks?.[0]?.result?.[0]?.metrics?.organic
    const bl      = blRes?.tasks?.[0]?.result?.[0]
    const rawHist = histRes?.tasks?.[0]?.result?.[0]?.history ?? []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const history: HistItem[] = rawHist.map((h: any) => ({
      month:   (h.date as string)?.slice(0, 7) ?? '',
      traffic: (h.metrics?.organic?.etv as number) ?? 0,
    })).filter((h: HistItem) => h.month)

    const newProfile: SiteProfile = {
      domain:     d,
      dr:         opr?.dr                   ?? null,
      rank:       opr?.rank                 ?? null,
      traffic:    organic?.etv              ?? null,
      keywords:   organic?.count            ?? null,
      backlinks:  bl?.backlinks             ?? null,
      refDomains: bl?.referring_domains     ?? null,
      history,
      topKeywords:  [],
      topBacklinks: [],
      competitors:  [],
      kwLoaded:     false,
      blLoaded:     false,
      compLoaded:   false,
    }
    setProfile(newProfile)
    save({ id: crypto.randomUUID(), savedAt: new Date().toISOString(),
      label: d, sublabel: `traffic ${fmt(newProfile.traffic)} · ${fmt(newProfile.keywords)} kws`,
      domain: d, profile: newProfile })
    setLoading(false)
  }

  async function loadKeywords(d: string) {
    if (!dataForSEOKey) return
    setLoadingKw(true)
    const res = await dfs(
      'dataforseo_labs/google/ranked_keywords/live',
      [{ target: d, location_code: 2356, language_code: 'en', limit: 50,
         order_by: ['ranked_serp_element.serp_item.rank_absolute,asc'] }],
      dataForSEOKey,
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = res?.tasks?.[0]?.result?.[0]?.items ?? []
    const topKeywords: KwItem[] = items.map(item => ({
      kw:      item.keyword_data?.keyword ?? '',
      pos:     item.ranked_serp_element?.serp_item?.rank_absolute ?? 0,
      vol:     item.keyword_data?.keyword_info?.search_volume ?? 0,
      traffic: item.ranked_serp_element?.serp_item?.etv ?? 0,
      url:     item.ranked_serp_element?.serp_item?.url ?? '',
    }))
    setProfile(p => p ? { ...p, topKeywords, kwLoaded: true } : p)
    setLoadingKw(false)
  }

  async function loadBacklinks(d: string) {
    if (!dataForSEOKey) return
    setLoadingBl(true)
    const res = await dfs(
      'backlinks/backlinks/live',
      [{ target: d, limit: 50, order_by: ['rank,desc'], mode: 'as_is', include_subdomains: true }],
      dataForSEOKey,
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = res?.tasks?.[0]?.result?.[0]?.items ?? []
    const topBacklinks: BlItem[] = items.map(item => ({
      domain:   item.domain_from ?? '',
      url:      item.url_from    ?? '',
      anchor:   item.anchor      ?? '',
      dofollow: item.dofollow    ?? false,
      rank:     item.domain_from_rank ?? 0,
      date:     (item.first_seen as string)?.slice(0, 10) ?? '',
    }))
    setProfile(p => p ? { ...p, topBacklinks, blLoaded: true } : p)
    setLoadingBl(false)
  }

  async function loadCompetitors(d: string) {
    if (!dataForSEOKey) return
    setLoadingComp(true)
    const res = await dfs(
      'dataforseo_labs/google/competitors_domain/live',
      [{ target: d, location_code: 2356, language_code: 'en', limit: 10 }],
      dataForSEOKey,
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = res?.tasks?.[0]?.result?.[0]?.items ?? []
    const competitors: CompItem[] = items.map(item => ({
      domain:    item.domain ?? '',
      traffic:   item.full_domain_metrics?.organic?.etv   ?? 0,
      keywords:  item.full_domain_metrics?.organic?.count ?? 0,
      commonKws: item.intersections ?? 0,
    }))
    setProfile(p => p ? { ...p, competitors, compLoaded: true } : p)
    setLoadingComp(false)
  }

  function switchTab(t: SiteTab) {
    setTab(t)
    if (!profile) return
    if (t === 'keywords'    && !profile.kwLoaded)   loadKeywords(profile.domain)
    if (t === 'backlinks'   && !profile.blLoaded)   loadBacklinks(profile.domain)
    if (t === 'competitors' && !profile.compLoaded) loadCompetitors(profile.domain)
  }

  const TABS: { id: SiteTab; label: string }[] = [
    { id: 'overview',    label: 'Overview' },
    { id: 'keywords',    label: 'Top Keywords' },
    { id: 'backlinks',   label: 'Backlinks' },
    { id: 'competitors', label: 'Competitors' },
  ]

  const noDFS = !dataForSEOKey

  return (
    <div className="space-y-5">
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setHistTab('tool')} className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer', histTab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>Site Explorer</button>
        <button onClick={() => setHistTab('history')} className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer', histTab === 'history' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          <History size={11} /> History {records.length > 0 && `(${records.length})`}
        </button>
      </div>
      {histTab === 'history' ? (
        <HistoryPanel
          records={records}
          onLoad={r => { setQuery(r.domain); setProfile(r.profile); setTab('overview'); setHistTab('tool') }}
          onDelete={remove}
          onClear={clear}
          emptyText="No domain explorations saved yet. Explore a domain to save results."
        />
      ) : (<>

      {/* Search bar */}
      <Card>
        <CardTitle className="mb-1">Site Explorer</CardTitle>
        <p className="text-sm text-muted mb-4">
          Deep-dive any domain — organic traffic, keywords, backlinks, referring domains, and top competitors.
        </p>

        {!openPageRankKey && !dataForSEOKey && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
            <AlertCircle size={13} className="shrink-0" />
            <span className="flex-1">
              Add OpenPageRank + DataForSEO credentials for full data.{' '}
              <button onClick={() => setSection('onboarding')}
                className="underline cursor-pointer font-semibold hover:text-amber-300 inline-flex items-center gap-1">
                <KeyRound size={11} /> Add in Onboarding
              </button>
            </span>
          </div>
        )}

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setProfile(null) }}
              onKeyDown={e => e.key === 'Enter' && explore()}
              placeholder="Enter any domain: betway.in, bet365.com, pokerbaazi.com…"
              className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors font-mono-jarvis"
            />
          </div>
          <Button variant="primary" onClick={() => explore()} disabled={loading || !query.trim()}>
            {loading ? 'Exploring…' : 'Explore Site'}
          </Button>
        </div>
      </Card>

      {/* Loading */}
      {loading && (
        <Card className="text-center py-12">
          <Loader2 size={28} className="animate-spin text-accent mx-auto mb-3" />
          <div className="text-sm text-muted">Fetching domain data…</div>
        </Card>
      )}

      {/* Results */}
      {profile && !loading && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {([
              { label: 'DOMAIN RATING',  val: profile.dr,         color: '#7c3aed', Icon: Star,       display: profile.dr !== null ? String(profile.dr) : '—', src: 'OPR', tip: 'Domain Rating (0–10 via OpenPageRank) — measures overall link authority. Higher = stronger domain.' },
              { label: 'GLOBAL RANK',    val: null,               color: '#6b7280', Icon: Globe,      display: profile.rank ?? '—',                             src: 'OPR', tip: 'Global traffic rank — lower number means the site receives more traffic worldwide' },
              { label: 'ORG. TRAFFIC',   val: profile.traffic,    color: '#10b981', Icon: TrendingUp, display: fmt(profile.traffic),                            src: 'DFS', tip: 'Estimated monthly organic visits driven by Google search results (via DataForSEO)' },
              { label: 'ORG. KEYWORDS',  val: profile.keywords,   color: '#00d4ff', Icon: SearchCode, display: fmt(profile.keywords),                           src: 'DFS', tip: 'Total number of keywords this domain ranks for in Google organic results' },
              { label: 'BACKLINKS',      val: profile.backlinks,  color: '#f59e0b', Icon: Link2,      display: fmt(profile.backlinks),                          src: 'DFS', tip: 'Total inbound links pointing to this domain — more links generally = stronger authority' },
              { label: 'REF. DOMAINS',   val: profile.refDomains, color: '#ef4444', Icon: Users,      display: fmt(profile.refDomains),                         src: 'DFS', tip: 'Number of unique domains linking to this site. More unique referring domains = better link profile.' },
            ] as const).map(k => {
              const hasValue  = k.display !== '—'
              const missingKey = (k.src === 'DFS' && noDFS) || (k.src === 'OPR' && !openPageRankKey)
              return (
                <Card key={k.label} className="text-center py-4">
                  <k.Icon size={14} className="mx-auto mb-1.5" style={{ color: k.color }} />
                  <div className="text-xl font-display font-black mb-0.5"
                    style={{ color: hasValue ? k.color : 'var(--color-muted)' }}>
                    {k.display}
                  </div>
                  <div className="text-[9px] text-muted font-mono-jarvis tracking-widest inline-flex items-center gap-1 justify-center">
                    {k.label} <InfoTooltip text={k.tip} size={9} />
                  </div>
                  {missingKey && <div className="text-[9px] text-amber-400 mt-0.5 font-mono-jarvis">no key</div>}
                </Card>
              )
            })}
          </div>

          {/* Tabs */}
          <Card className="p-0">
            <div className="flex border-b border-border overflow-x-auto">
              {TABS.map(t => (
                <button key={t.id} onClick={() => switchTab(t.id)}
                  className={cn(
                    'px-4 py-3 text-xs font-medium cursor-pointer transition-colors border-b-2 -mb-px shrink-0',
                    tab === t.id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-tx'
                  )}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-5">

              {/* ── Overview ── */}
              {tab === 'overview' && (
                profile.history.length > 0 ? (
                  <div>
                    <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-3">
                      12-MONTH ORGANIC TRAFFIC TREND · {profile.domain}
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={profile.history}>
                        <defs>
                          <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#5a7a9a' }} />
                        <YAxis tickFormatter={v => fmt(v as number)} tick={{ fontSize: 10, fill: '#5a7a9a' }} width={42} />
                        <Tooltip
                          contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11 }}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={(v: any) => [fmt(v) + ' visits', 'Organic Traffic']}
                        />
                        <Area type="monotone" dataKey="traffic" stroke="#10b981" strokeWidth={2} fill="url(#tGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <SearchCode size={32} className="text-muted mx-auto mb-3" strokeWidth={1} />
                    <div className="text-sm font-medium text-tx mb-1">{profile.domain}</div>
                    <div className="text-xs text-muted">
                      {noDFS
                        ? 'Add DataForSEO credentials in Settings to unlock traffic trends and full domain analysis.'
                        : 'No historical traffic data available for this domain yet.'}
                    </div>
                  </div>
                )
              )}

              {/* ── Top Keywords ── */}
              {tab === 'keywords' && (
                loadingKw ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-muted text-sm">
                    <Loader2 size={16} className="animate-spin" /> Loading keywords…
                  </div>
                ) : noDFS ? (
                  <div className="text-center py-8 text-sm text-muted">
                    Add DataForSEO credentials in Settings to view keyword rankings.
                  </div>
                ) : profile.topKeywords.length > 0 ? (
                  <>
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() => downloadCSV(
                          `${profile.domain}-keywords.csv`,
                          ['Keyword', 'Position', 'Search Volume', 'Est. Traffic', 'URL'],
                          profile.topKeywords.map(k => [k.kw, k.pos, k.vol, k.traffic, k.url]),
                        )}
                        className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer"
                      >
                        <Download size={11} /> Export CSV
                      </button>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-[10px] text-muted font-mono-jarvis tracking-widest">
                          <th className="text-left pb-2 font-medium">KEYWORD</th>
                          <th className="text-center pb-2 font-medium w-12"><span className="inline-flex items-center gap-1">POS <InfoTooltip text="Current Google ranking position for this keyword" /></span></th>
                          <th className="text-right pb-2 font-medium"><span className="inline-flex items-center gap-1 justify-end">VOLUME <InfoTooltip text="Average monthly search volume for this keyword" /></span></th>
                          <th className="text-right pb-2 font-medium"><span className="inline-flex items-center gap-1 justify-end">EST. TRAFFIC <InfoTooltip text="Estimated monthly clicks driven to this domain from this keyword based on position and volume" /></span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.topKeywords.map((k, i) => (
                          <tr key={i} className="border-b border-border/40 hover:bg-surface transition-colors">
                            <td className="py-2.5 pr-4">
                              <div className="font-medium text-tx">{k.kw}</div>
                              {k.url && (
                                <div className="text-[10px] text-muted font-mono-jarvis truncate max-w-xs mt-0.5">{k.url}</div>
                              )}
                            </td>
                            <td className="py-2.5 text-center font-display font-black text-lg"
                              style={{ color: k.pos <= 3 ? '#10b981' : k.pos <= 10 ? '#f59e0b' : '#5a7a9a' }}>
                              {k.pos}
                            </td>
                            <td className="py-2.5 text-right font-mono-jarvis text-muted">{fmt(k.vol)}</td>
                            <td className="py-2.5 text-right font-mono-jarvis text-accent3">{fmt(k.traffic)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <div className="text-center py-8 text-sm text-muted">No keyword data found for this domain.</div>
                )
              )}

              {/* ── Backlinks ── */}
              {tab === 'backlinks' && (
                loadingBl ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-muted text-sm">
                    <Loader2 size={16} className="animate-spin" /> Loading backlinks…
                  </div>
                ) : noDFS ? (
                  <div className="text-center py-8 text-sm text-muted">
                    Add DataForSEO credentials in Settings to view backlink data.
                  </div>
                ) : profile.topBacklinks.length > 0 ? (
                  <>
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() => downloadCSV(
                          `${profile.domain}-backlinks.csv`,
                          ['Domain', 'Rank', 'Anchor', 'Type', 'URL', 'Date'],
                          profile.topBacklinks.map(b => [b.domain, b.rank, b.anchor, b.dofollow ? 'Dofollow' : 'Nofollow', b.url, b.date]),
                        )}
                        className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer"
                      >
                        <Download size={11} /> Export CSV
                      </button>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-[10px] text-muted font-mono-jarvis tracking-widest">
                          <th className="text-left pb-2 font-medium">REFERRING DOMAIN</th>
                          <th className="text-center pb-2 font-medium"><span className="inline-flex items-center gap-1">RANK <InfoTooltip text="Authority rank of the referring domain — higher rank = stronger backlink" /></span></th>
                          <th className="text-left pb-2 font-medium pl-4"><span className="inline-flex items-center gap-1">ANCHOR TEXT <InfoTooltip text="The clickable text of the backlink. Keyword-rich anchors can boost relevance signals." /></span></th>
                          <th className="text-center pb-2 font-medium"><span className="inline-flex items-center gap-1">TYPE <InfoTooltip text="Dofollow links pass link equity (SEO value). Nofollow links do not pass equity directly." /></span></th>
                          <th className="text-right pb-2 font-medium">DATE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.topBacklinks.map((b, i) => (
                          <tr key={i} className="border-b border-border/40 hover:bg-surface transition-colors">
                            <td className="py-2.5">
                              <a href={b.url} target="_blank" rel="noopener noreferrer"
                                className="font-mono-jarvis text-accent hover:underline flex items-center gap-1">
                                <ExternalLink size={10} className="shrink-0" /> {b.domain}
                              </a>
                            </td>
                            <td className="py-2.5 text-center font-mono-jarvis text-muted">{b.rank}</td>
                            <td className="py-2.5 pl-4 text-muted truncate max-w-xs">{b.anchor || '—'}</td>
                            <td className="py-2.5 text-center">
                              <Badge variant={b.dofollow ? 'green' : 'muted'}>
                                {b.dofollow ? 'Dofollow' : 'Nofollow'}
                              </Badge>
                            </td>
                            <td className="py-2.5 text-right font-mono-jarvis text-muted">{b.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <div className="text-center py-8 text-sm text-muted">No backlink data found for this domain.</div>
                )
              )}

              {/* ── Competitors ── */}
              {tab === 'competitors' && (
                loadingComp ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-muted text-sm">
                    <Loader2 size={16} className="animate-spin" /> Loading competitors…
                  </div>
                ) : noDFS ? (
                  <div className="text-center py-8 text-sm text-muted">
                    Add DataForSEO credentials in Settings to view organic competitors.
                  </div>
                ) : profile.competitors.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-[10px] text-muted font-mono-jarvis tracking-widest">
                        <th className="text-left pb-2 font-medium">COMPETITOR</th>
                        <th className="text-right pb-2 font-medium"><span className="inline-flex items-center gap-1 justify-end">ORG. TRAFFIC <InfoTooltip text="Estimated monthly organic visits from Google for this competitor" /></span></th>
                        <th className="text-right pb-2 font-medium"><span className="inline-flex items-center gap-1 justify-end">ORG. KEYWORDS <InfoTooltip text="Total keywords this competitor ranks for in Google" /></span></th>
                        <th className="text-right pb-2 font-medium"><span className="inline-flex items-center gap-1 justify-end">COMMON KW <InfoTooltip text="Number of keywords both your domain and this competitor rank for — the keyword overlap" /></span></th>
                        <th className="text-center pb-2 font-medium">ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.competitors.map((c, i) => (
                        <tr key={i} className="border-b border-border/40 hover:bg-surface transition-colors">
                          <td className="py-2.5 font-mono-jarvis text-accent">{c.domain}</td>
                          <td className="py-2.5 text-right font-mono-jarvis text-accent3">{fmt(c.traffic)}</td>
                          <td className="py-2.5 text-right font-mono-jarvis text-tx">{fmt(c.keywords)}</td>
                          <td className="py-2.5 text-right font-mono-jarvis text-muted">{fmt(c.commonKws)}</td>
                          <td className="py-2.5 text-center">
                            <button onClick={() => explore(c.domain)}
                              className="text-[10px] text-accent hover:text-tx transition-colors font-mono-jarvis cursor-pointer">
                              Explore →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-sm text-muted">No competitor data found for this domain.</div>
                )
              )}

            </div>
          </Card>
        </>
      )}

      {/* Empty state */}
      {!profile && !loading && (
        <Card className="text-center py-16">
          <SearchCode size={40} className="text-muted mx-auto mb-3" strokeWidth={1} />
          <div className="font-display font-bold text-lg text-tx mb-1">Explore any domain</div>
          <div className="text-sm text-muted max-w-sm mx-auto">
            {dataForSEOKey
              ? 'Enter any domain above for live organic traffic, keywords, backlinks, and competitor discovery'
              : 'Enter a domain above · Add DataForSEO credentials in Settings for full traffic analytics'}
          </div>
        </Card>
      )}
      </>)}
    </div>
  )
}
