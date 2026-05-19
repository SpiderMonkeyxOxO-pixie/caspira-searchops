import { useState, useEffect, useCallback } from 'react'
import {
  Search, AlertTriangle, CheckCircle, XCircle, Loader2,
  RefreshCw, ChevronDown, ChevronUp, ExternalLink, FileText, Download,
} from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { downloadCSV } from '@/lib/csv'
import { useAuthStore } from '@/store/authStore'

// ── Types ─────────────────────────────────────────────────────
interface Issue { type: string; severity: 'high' | 'med' | 'low'; message: string }

interface CrawlJob {
  id: string; site_url: string; status: string
  total_pages: number; issues: number
  started_at: string; finished_at: string | null; error: string | null
}

interface CrawlPage {
  id: string; url: string; status_code: number
  title: string | null; title_len: number
  meta_desc: string | null; meta_len: number
  h1: string | null; h1_count: number
  canonical: string | null; is_noindex: boolean
  word_count: number; img_total: number; img_no_alt: number
  issues: Issue[]
}

type SeverityFilter = 'all' | 'high' | 'med' | 'low'
type IssueTypeFilter = 'all' | string

// ── Helpers ───────────────────────────────────────────────────
const SEV_BADGE: Record<string, 'red' | 'amber' | 'accent'> = {
  high: 'red', med: 'amber', low: 'accent',
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const r = 34; const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color  = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-border)" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 40 40)" style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="40" y="45" textAnchor="middle" fill={color}
          style={{ fontSize: 18, fontWeight: 900, fontFamily: 'Roboto' }}>{score}</text>
      </svg>
      <div className="text-[10px] text-muted font-mono-jarvis tracking-widest">{label.toUpperCase()}</div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────
export function SiteAnalyzer() {
  const orgId = useAuthStore().org?.id ?? ''

  const [url,      setUrl]      = useState('https://yonodeposit.com')
  const [crawling, setCrawling] = useState(false)
  const [crawlErr, setCrawlErr] = useState<string | null>(null)

  const [job,   setJob]   = useState<CrawlJob | null>(null)
  const [pages, setPages] = useState<CrawlPage[]>([])
  const [jobLoading, setJobLoading] = useState(true)

  const [sevFilter,  setSevFilter]  = useState<SeverityFilter>('all')
  const [typeFilter, setTypeFilter] = useState<IssueTypeFilter>('all')
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [showPages,  setShowPages]  = useState(false)

  // Load most recent crawl job for this org
  const loadLatest = useCallback(async () => {
    if (!orgId) { setJobLoading(false); return }
    setJobLoading(true)
    const { data: jobs } = await supabase
      .from('jarvis_crawl_jobs')
      .select('*')
      .eq('org_id', orgId)
      .order('started_at', { ascending: false })
      .limit(1) as { data: CrawlJob[] | null }

    if (!jobs?.length) { setJobLoading(false); return }
    const latest = jobs[0]
    setJob(latest)
    if (latest.site_url) setUrl(latest.site_url)

    if (latest.status === 'completed') {
      const { data: pageRows } = await supabase
        .from('jarvis_crawl_pages')
        .select('*')
        .eq('job_id', latest.id)
        .order('url') as { data: CrawlPage[] | null }
      setPages(pageRows ?? [])
    }
    setJobLoading(false)
  }, [orgId])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadLatest() }, [loadLatest])

  async function startCrawl() {
    if (!url.trim() || !orgId) return
    setCrawling(true)
    setCrawlErr(null)
    setJob(null)
    setPages([])

    const { error, data } = await supabase.functions.invoke('site-crawl', {
      body: { org_id: orgId, site_url: url.trim() },
    })

    if (error) {
      let msg = (error as { message?: string }).message ?? 'Crawl failed'
      try {
        const body = await (error as { context?: Response }).context?.json()
        if (body?.error) msg = body.error
      } catch { /* ignore */ }
      setCrawlErr(msg)
      setCrawling(false)
      return
    }

    // Edge function can return { error } with 200 status in some cases
    if ((data as { error?: string })?.error) {
      setCrawlErr((data as { error: string }).error)
      setCrawling(false)
      return
    }

    // Reload from DB to get full job + pages
    await loadLatest()
    setCrawling(false)
  }

  // ── Derived stats ──────────────────────────────────────────
  const allIssues = pages.flatMap(p => p.issues.map(i => ({ ...i, url: p.url, pageId: p.id })))
  const issueTypes = [...new Set(allIssues.map(i => i.type))]

  const filteredIssues = allIssues
    .filter(i => sevFilter  === 'all' || i.severity === sevFilter)
    .filter(i => typeFilter === 'all' || i.type     === typeFilter)

  const highCount = allIssues.filter(i => i.severity === 'high').length
  const medCount  = allIssues.filter(i => i.severity === 'med').length
  const lowCount  = allIssues.filter(i => i.severity === 'low').length

  const healthScore = pages.length === 0 ? null : Math.max(0,
    Math.round(100 - (highCount * 5 + medCount * 2 + lowCount * 0.5))
  )

  const pagesWithIssues = pages.filter(p => p.issues.length > 0).length

  function exportIssues() {
    const site = job?.site_url ?? 'site'
    const date = new Date().toISOString().slice(0, 10)
    downloadCSV(`site-issues-${site.replace(/^https?:\/\//, '')}-${date}.csv`,
      ['URL', 'Severity', 'Type', 'Message'],
      allIssues.map(i => [i.url, i.severity, i.type.replace(/_/g, ' '), i.message]),
    )
  }

  function exportPages() {
    const site = job?.site_url ?? 'site'
    const date = new Date().toISOString().slice(0, 10)
    downloadCSV(`site-pages-${site.replace(/^https?:\/\//, '')}-${date}.csv`,
      ['URL', 'Status Code', 'Title', 'Title Length', 'H1 Count', 'Word Count', 'Issues', 'Noindex'],
      pages.map(p => [p.url, p.status_code, p.title ?? '', p.title_len, p.h1_count, p.word_count, p.issues.length, p.is_noindex ? 'Yes' : 'No']),
    )
  }

  // ── Loading ────────────────────────────────────────────────
  if (jobLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted text-sm">
        <Loader2 size={16} className="animate-spin" /> Loading crawl data…
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Crawl trigger ── */}
      <Card>
        <CardTitle className="mb-4">Site Crawler</CardTitle>
        <div className="flex gap-3">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://yoursite.com"
            className="flex-1 bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx
                       outline-none focus:border-accent transition-colors font-mono-jarvis"
          />
          <Button variant="primary" onClick={startCrawl} disabled={crawling || !url.trim()}>
            {crawling
              ? <><Loader2 size={13} className="animate-spin" /> Crawling…</>
              : <>Crawl Site</>
            }
          </Button>
        </div>

        {crawling && (
          <div className="mt-4 flex items-center gap-3 text-sm text-muted">
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
            Fetching sitemap and crawling pages — this takes 30–90 seconds…
          </div>
        )}

        {crawlErr && (
          <div className="mt-3 px-3 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">
            <strong>Crawl failed:</strong> {crawlErr}
          </div>
        )}

        {job && (
          <div className="mt-3 flex items-center gap-4 text-[11px] text-muted font-mono-jarvis">
            <span className={`flex items-center gap-1 ${job.status === 'completed' ? 'text-accent3' : job.status === 'failed' ? 'text-danger' : 'text-accent'}`}>
              {job.status === 'completed' ? <CheckCircle size={11} /> : job.status === 'failed' ? <XCircle size={11} /> : <Loader2 size={11} className="animate-spin" />}
              {job.status}
            </span>
            <span>{job.total_pages} pages crawled</span>
            <span>{job.issues} issues found</span>
            <span>{new Date(job.started_at).toLocaleString()}</span>
            <button onClick={startCrawl} disabled={crawling}
              className="text-accent hover:underline flex items-center gap-1 cursor-pointer ml-auto">
              <RefreshCw size={10} /> Re-crawl
            </button>
          </div>
        )}
      </Card>

      {/* ── No data yet ── */}
      {!job && !crawling && (
        <Card className="text-center py-16">
          <Search size={48} className="text-muted mx-auto mb-4" strokeWidth={1} />
          <div className="font-display font-black text-xl text-tx mb-2">No Crawl Data Yet</div>
          <div className="text-sm text-muted max-w-sm mx-auto">
            Enter your site URL above and click "Crawl Site" to discover SEO issues across all your pages.
          </div>
        </Card>
      )}

      {/* ── Results ── */}
      {job?.status === 'completed' && pages.length > 0 && (
        <>
          {/* Score + summary KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            <Card className="flex items-center justify-center">
              <ScoreGauge score={healthScore ?? 0} label="Health Score" />
            </Card>

            <div className="lg:col-span-3 grid grid-cols-3 gap-4">
              {[
                { label: 'HIGH PRIORITY', val: highCount,  color: 'text-danger',   bg: 'bg-danger/10',   border: 'border-danger/30',   icon: XCircle },
                { label: 'MEDIUM',        val: medCount,   color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertTriangle },
                { label: 'LOW',           val: lowCount,   color: 'text-muted',    bg: 'bg-border',       border: 'border-border',      icon: CheckCircle },
              ].map(({ label, val, color, bg, border }) => (
                <Card key={label} className={`${bg} ${border}`}>
                  <div className="text-[10px] font-mono-jarvis tracking-widest text-muted mb-2">{label} ISSUES</div>
                  <div className={`text-3xl font-display font-black ${color}`}>{val}</div>
                  <div className="text-[11px] text-muted mt-1">
                    across {pages.filter(p => p.issues.some(i =>
                      label === 'HIGH PRIORITY' ? i.severity === 'high' :
                      label === 'MEDIUM' ? i.severity === 'med' : i.severity === 'low'
                    )).length} pages
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Filters + Issues list */}
          <Card>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <CardTitle>Issues ({filteredIssues.length})</CardTitle>
                {allIssues.length > 0 && (
                  <button onClick={exportIssues} className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer">
                    <Download size={11} /> Export CSV
                  </button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {(['all','high','med','low'] as SeverityFilter[]).map(s => (
                  <button key={s} onClick={() => setSevFilter(s)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono-jarvis transition-colors cursor-pointer
                      ${sevFilter === s ? 'bg-accent text-black' : 'bg-surface border border-border text-muted hover:border-accent'}`}>
                    {s.toUpperCase()}
                  </button>
                ))}
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="bg-surface border border-border rounded-md px-2 py-1 text-[11px] text-muted outline-none cursor-pointer"
                >
                  <option value="all">All types</option>
                  {issueTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>

            {filteredIssues.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted">No issues match this filter.</div>
            ) : (
              <div className="space-y-1.5">
                {filteredIssues.slice(0, 100).map((issue, i) => (
                  <div key={i}
                    className="flex items-start gap-3 p-3 bg-surface border border-border rounded-lg hover:border-accent transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === `${i}` ? null : `${i}`)}>
                    <Badge variant={SEV_BADGE[issue.severity]}>{issue.severity.toUpperCase()}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-tx">{issue.message}</div>
                      {expanded === `${i}` && (
                        <div className="mt-1.5 font-mono-jarvis text-[10px] text-muted truncate">{issue.url}</div>
                      )}
                    </div>
                    <span className="text-[10px] font-mono-jarvis text-muted shrink-0">{issue.type.replace(/_/g, ' ')}</span>
                    {expanded === `${i}` ? <ChevronUp size={12} className="text-muted shrink-0" /> : <ChevronDown size={12} className="text-muted shrink-0" />}
                  </div>
                ))}
                {filteredIssues.length > 100 && (
                  <div className="text-center text-xs text-muted pt-2">Showing 100 of {filteredIssues.length} issues</div>
                )}
              </div>
            )}
          </Card>

          {/* Pages table */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>
                Pages ({pages.length}) — {pagesWithIssues} with issues
              </CardTitle>
              <div className="flex items-center gap-3">
                <button onClick={exportPages} className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer">
                  <Download size={11} /> Export CSV
                </button>
                <button onClick={() => setShowPages(!showPages)}
                  className="text-[11px] text-accent hover:underline cursor-pointer flex items-center gap-1">
                  <FileText size={11} /> {showPages ? 'Hide' : 'Show'} all pages
                </button>
              </div>
            </div>

            {showPages && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left">
                      {['URL','Status','Title','H1','Words','Issues'].map(h => (
                        <th key={h} className="pb-2 pr-4 font-mono-jarvis text-[10px] text-muted tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map(p => (
                      <tr key={p.id} className="border-b border-border hover:bg-surface transition-colors">
                        <td className="py-2 pr-4 max-w-70">
                          <a href={p.url} target="_blank" rel="noreferrer"
                            className="text-accent hover:underline flex items-center gap-1 truncate font-mono-jarvis text-[11px]">
                            {p.url.replace(/^https?:\/\/[^/]+/, '') || '/'} <ExternalLink size={9} />
                          </a>
                        </td>
                        <td className="py-2 pr-4">
                          <span className={p.status_code >= 400 ? 'text-danger' : p.status_code >= 300 ? 'text-amber-400' : 'text-accent3'}>
                            {p.status_code || '—'}
                          </span>
                        </td>
                        <td className="py-2 pr-4 max-w-50">
                          <span className={`truncate block ${!p.title ? 'text-danger' : p.title_len > 60 ? 'text-amber-400' : 'text-tx'}`}>
                            {p.title ? `${p.title.slice(0, 40)}${p.title.length > 40 ? '…' : ''}` : <span className="text-danger">Missing</span>}
                          </span>
                          {p.title && <span className="text-muted text-[10px]">{p.title_len}ch</span>}
                        </td>
                        <td className="py-2 pr-4">
                          <span className={p.h1_count === 0 ? 'text-danger' : p.h1_count > 1 ? 'text-amber-400' : 'text-accent3'}>
                            {p.h1_count}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          <span className={p.word_count < 300 && p.word_count > 0 ? 'text-amber-400' : 'text-muted'}>
                            {p.word_count}
                          </span>
                        </td>
                        <td className="py-2">
                          {p.issues.length === 0 ? (
                            <CheckCircle size={13} className="text-accent3" />
                          ) : (
                            <div className="flex gap-1">
                              {p.issues.some(i => i.severity === 'high') && <span className="w-2 h-2 rounded-full bg-danger" />}
                              {p.issues.some(i => i.severity === 'med')  && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                              {p.issues.some(i => i.severity === 'low')  && <span className="w-2 h-2 rounded-full bg-muted" />}
                              <span className="text-muted text-[10px]">{p.issues.length}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {job?.status === 'failed' && (
        <Card className="text-center py-10">
          <XCircle size={40} className="text-danger mx-auto mb-3" strokeWidth={1.25} />
          <div className="font-display font-bold text-lg text-tx mb-2">Crawl Failed</div>
          <div className="text-sm text-muted">{job.error}</div>
        </Card>
      )}
    </div>
  )
}
