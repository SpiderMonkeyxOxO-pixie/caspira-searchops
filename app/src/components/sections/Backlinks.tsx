import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Link2, AlertCircle, ExternalLink, Download, RefreshCw, Globe, TrendingUp } from 'lucide-react'
import { callAI, isAIReady } from '@/lib/ai'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { downloadCSV } from '@/lib/csv'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface BlItem {
  domain:   string
  url:      string
  anchor:   string
  dofollow: boolean
  rank:     number
  date:     string
}

interface BlSummary {
  total:      number
  refDomains: number
  domainRank: number
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

async function fetchBacklinkSummary(domain: string, creds: string): Promise<BlSummary> {
  const { data, error } = await supabase.functions.invoke('dataforseo-proxy', {
    body: {
      credentials: creds,
      endpoint: 'backlinks/summary/live',
      body: [{ target: domain, include_subdomains: true }],
    },
  })
  if (error) throw new Error(error.message ?? 'Proxy error')
  if (data?._httpStatus && data._httpStatus !== 200) throw new Error(`DataForSEO HTTP ${data._httpStatus} — check your login:password credentials`)
  const task = data?.tasks?.[0]
  if (task?.status_message && task.status_message !== 'Ok.') throw new Error(task.status_message)
  const r = task?.result?.[0]
  return { total: r?.backlinks ?? 0, refDomains: r?.referring_domains ?? 0, domainRank: r?.rank ?? 0 }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchBacklinkList(domain: string, creds: string): Promise<BlItem[]> {
  const { data, error } = await supabase.functions.invoke('dataforseo-proxy', {
    body: {
      credentials: creds,
      endpoint: 'backlinks/backlinks/live',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: [{ target: domain, limit: 100, order_by: ['rank,desc'], mode: 'as_is', include_subdomains: true }] as any,
    },
  })
  if (error) throw new Error(error.message ?? 'Proxy error')
  if (data?._httpStatus && data._httpStatus !== 200) throw new Error(`DataForSEO HTTP ${data._httpStatus} — check your login:password credentials`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = data?.tasks?.[0]?.result?.[0]?.items ?? []
  return items.map(item => ({
    domain:   item.domain_from      ?? '',
    url:      item.url_from         ?? '',
    anchor:   item.anchor           ?? '',
    dofollow: item.dofollow         ?? false,
    rank:     item.domain_from_rank ?? 0,
    date:     (item.first_seen as string)?.slice(0, 10) ?? '',
  }))
}

export function Backlinks() {
  const { domain, dataForSEOKey, setSection } = useStore()
  const aiReady = isAIReady()

  const [targetDomain, setTargetDomain] = useState(domain || '')
  const [summary,      setSummary]      = useState<BlSummary | null>(null)
  const [backlinks,    setBacklinks]    = useState<BlItem[]>([])
  const [loading,      setLoading]      = useState(false)
  const [loaded,       setLoaded]       = useState(false)
  const [fetchError,   setFetchError]   = useState<string | null>(null)
  const [aiStrategy,   setAiStrategy]   = useState('')
  const [filterType,   setFilterType]   = useState<'all' | 'dofollow' | 'nofollow'>('all')

  async function runFetch() {
    const d = targetDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!d || !dataForSEOKey) return
    setLoading(true)
    setLoaded(false)
    setFetchError(null)
    const [sumResult, listResult] = await Promise.allSettled([
      fetchBacklinkSummary(d, dataForSEOKey),
      fetchBacklinkList(d, dataForSEOKey),
    ])
    setSummary(sumResult.status === 'fulfilled' ? sumResult.value : null)
    setBacklinks(listResult.status === 'fulfilled' ? listResult.value : [])
    if (sumResult.status === 'rejected') {
      setFetchError(sumResult.reason?.message ?? 'Summary fetch failed')
    } else if (listResult.status === 'rejected') {
      setFetchError(listResult.reason?.message ?? 'Backlinks list fetch failed')
    }
    setLoading(false)
    setLoaded(true)
  }

  const getStrategy = useMutation({
    mutationFn: () => callAI(
      'You are an elite link building strategist with 10+ years of iGaming SEO experience.',
      `Create a 60-day link building sprint plan for ${targetDomain || domain || 'an iGaming/casino affiliate site'} in India and Indonesia markets.

Current backlink profile: ${summary ? `${fmt(summary.total)} total backlinks, ${fmt(summary.refDomains)} referring domains, domain rank ${summary.domainRank}` : 'unknown'}

Provide:
1. Top 3 link acquisition tactics specific to the casino/gambling niche (niche edits, HARO, gambling directories, news media outreach)
2. 5 specific outreach targets worth pursuing with the exact angle for each (publication + pitch tailored to casino SEO)
3. Toxic/spam link disavow strategy for gambling niches
4. 30-day vs 60-day milestones

Be specific and actionable for the regulated gambling industry.`,
      800,
    ),
    onSuccess: setAiStrategy,
  })

  const filtered = backlinks.filter(b =>
    filterType === 'all' ? true : filterType === 'dofollow' ? b.dofollow : !b.dofollow
  )

  const dofollow = backlinks.filter(b => b.dofollow).length
  const nofollow = backlinks.filter(b => !b.dofollow).length

  function exportCSV() {
    downloadCSV(
      `backlinks-${targetDomain}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Domain', 'Rank', 'Anchor', 'Type', 'URL', 'Date'],
      filtered.map(b => [b.domain, b.rank, b.anchor, b.dofollow ? 'Dofollow' : 'Nofollow', b.url, b.date]),
    )
  }

  return (
    <div className="space-y-5">

      {/* Search bar */}
      <Card>
        <CardTitle className="mb-1">Backlinks</CardTitle>
        <p className="text-sm text-muted mb-4">
          Analyse any domain's full backlink profile — total links, referring domains, dofollow ratio, and individual backlinks.
        </p>

        <div className="flex gap-3 mb-3">
          <input
            value={targetDomain}
            onChange={e => setTargetDomain(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runFetch()}
            placeholder="yoursite.com or any competitor domain"
            className="flex-1 bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors font-mono-jarvis"
          />
          <Button variant="primary" onClick={runFetch} disabled={loading || !targetDomain.trim() || !dataForSEOKey}>
            {loading ? 'Fetching…' : 'Fetch Backlinks'}
          </Button>
        </div>

        {!dataForSEOKey && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertCircle size={14} className="text-amber-400 shrink-0" />
            <div className="flex-1 text-[11px] text-amber-400/90">
              Add DataForSEO credentials in <button onClick={() => setSection('onboarding')} className="underline font-semibold cursor-pointer">Onboarding</button> or Settings for real backlink data.
            </div>
          </div>
        )}
      </Card>

      {/* Loading */}
      {loading && (
        <Card className="text-center py-10">
          <Loader2 size={24} className="animate-spin text-accent mx-auto mb-2" />
          <div className="text-sm text-muted">Fetching backlinks…</div>
        </Card>
      )}

      {/* API error */}
      {fetchError && !loading && (
        <Card className="flex items-start gap-3 p-4 border-danger/30 bg-danger/5">
          <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-danger mb-1">DataForSEO error</div>
            <div className="text-[11px] text-muted font-mono-jarvis">{fetchError}</div>
          </div>
        </Card>
      )}

      {/* Summary KPIs */}
      {loaded && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'TOTAL BACKLINKS',  val: summary?.total,      color: '#00d4ff', Icon: Link2,      tip: 'Total number of backlinks pointing to this domain, including multiple links from the same referring domain.' },
              { label: 'REF. DOMAINS',     val: summary?.refDomains, color: '#10b981', Icon: Globe,      tip: 'Referring Domains — the number of unique domains linking to this site. A higher count indicates broader link diversity.' },
              { label: 'DOFOLLOW',         val: dofollow,            color: '#7c3aed', Icon: TrendingUp,  tip: 'Dofollow links pass link equity (PageRank) to your site and contribute directly to domain authority.' },
            ].map(k => (
              <Card key={k.label} className="text-center py-5">
                <k.Icon size={14} className="mx-auto mb-1.5" style={{ color: k.color }} />
                <div className="text-2xl font-display font-black mb-0.5" style={{ color: k.color }}>
                  {fmt(k.val)}
                </div>
                <div className="flex items-center justify-center gap-1 text-[10px] text-muted font-mono-jarvis tracking-widest">
                  {k.label}
                  <InfoTooltip text={k.tip} />
                </div>
              </Card>
            ))}
          </div>

          {/* Backlink table */}
          {backlinks.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CardTitle>Backlinks ({filtered.length})</CardTitle>
                  <div className="flex gap-1">
                    {(['all', 'dofollow', 'nofollow'] as const).map(f => (
                      <button key={f} onClick={() => setFilterType(f)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg font-mono-jarvis cursor-pointer transition-colors ${
                          filterType === f ? 'bg-accent/20 text-accent' : 'text-muted hover:text-tx'
                        }`}>
                        {f === 'all' ? `All (${backlinks.length})` : f === 'dofollow' ? `Dofollow (${dofollow})` : `Nofollow (${nofollow})`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={runFetch} className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer">
                    <RefreshCw size={11} /> Refresh
                  </button>
                  <button onClick={exportCSV} className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer">
                    <Download size={11} /> Export CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-[10px] text-muted font-mono-jarvis tracking-widest">
                      <th className="text-left pb-2 font-medium">REFERRING DOMAIN</th>
                      <th className="text-center pb-2 font-medium w-16">
                        <span className="inline-flex items-center gap-1">RANK <InfoTooltip text="Domain Rank (DR) — a 0–100 score measuring the overall backlink authority of the linking domain. Higher is stronger." /></span>
                      </th>
                      <th className="text-left pb-2 font-medium pl-4">
                        <span className="inline-flex items-center gap-1">ANCHOR TEXT <InfoTooltip text="The clickable text of the hyperlink. Keyword-rich anchors pass topical relevance; generic anchors (e.g. 'click here') are safer but less impactful." /></span>
                      </th>
                      <th className="text-center pb-2 font-medium">
                        <span className="inline-flex items-center gap-1">TYPE <InfoTooltip text="Dofollow links pass PageRank and SEO value. Nofollow links (rel='nofollow') do not pass link equity but can drive traffic and brand awareness." /></span>
                      </th>
                      <th className="text-right pb-2 font-medium">DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((b, i) => (
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
              </div>
            </Card>
          )}
        </>
      )}

      {/* AI Link Building Strategy */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <CardTitle>AI Link Building Sprint</CardTitle>
            {summary && (
              <div className="text-[10px] text-muted font-mono-jarvis mt-0.5">
                {fmt(summary.total)} links · {fmt(summary.refDomains)} domains · rank {summary.domainRank}
              </div>
            )}
          </div>
          <Button variant="primary" onClick={() => getStrategy.mutate()} disabled={getStrategy.isPending || !aiReady}>
            {getStrategy.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            {getStrategy.isPending ? 'Building…' : 'Generate 60-Day Sprint'}
          </Button>
        </div>

        {!aiReady && (
          <div className="flex items-center gap-2 text-[11px] text-muted mb-3">
            <AlertCircle size={11} className="text-amber-400 shrink-0" />
            Add an OpenRouter or Anthropic key in Onboarding to generate link building strategies.
          </div>
        )}

        {aiStrategy ? (
          <div className="text-xs text-tx leading-relaxed whitespace-pre-wrap">{aiStrategy}</div>
        ) : (
          <p className="text-xs text-muted">
            Fetch backlinks above, then click <strong>Generate 60-Day Sprint</strong> to get a tailored iGaming link building plan with specific targets and tactics.
          </p>
        )}
      </Card>

    </div>
  )
}
