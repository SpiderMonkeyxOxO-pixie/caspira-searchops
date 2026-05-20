import { useState, useEffect, useCallback } from 'react'
import {
  Search, AlertTriangle, CheckCircle, XCircle, Loader2,
  RefreshCw, ChevronDown, ChevronUp, ExternalLink, FileText, Download,
  Clock, History, Globe, Eye, Trash2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { downloadCSV } from '@/lib/csv'
import { exportToPDF } from '@/lib/exportPDF'
import { useStore } from '@/store'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────
interface Issue { type: string; severity: 'high' | 'med' | 'low'; message: string }

type AuditStatus = 'new' | 'pending' | 'completed'

interface CrawlJob {
  id: string; site_url: string; status: string
  total_pages: number; issues: number
  started_at: string; finished_at: string | null; error: string | null
  audit_status: AuditStatus
}

const AUDIT_STATUS_CFG: Record<AuditStatus, { label: string; color: string; bg: string; border: string }> = {
  new:       { label: 'New',       color: '#00d4ff', bg: 'bg-accent/10',  border: 'border-accent/30'  },
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  completed: { label: 'Completed', color: '#10b981', bg: 'bg-accent3/10', border: 'border-accent3/30' },
}

interface CrawlPage {
  id: string; url: string; status_code: number
  title: string | null; title_len: number
  meta_desc: string | null; meta_len: number
  h1: string | null; h1_count: number
  canonical: string | null; is_noindex: boolean
  word_count: number; img_total: number; img_no_alt: number
  issues: Issue[]
  // enhanced fields (may be null on older crawls)
  response_time: number | null
  html_size: number | null
  crawl_depth: number | null
  inbound_links: number | null
  has_schema: boolean | null
  has_og_tags: boolean | null
  redirect_detected: boolean | null
  h2_count: number | null
}

type SeverityFilter = 'all' | 'high' | 'med' | 'low'
type IssueTypeFilter = 'all' | string

const HISTORY_PAGE_SIZE = 20

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
  const { org, myRole } = useAuthStore()
  const { domain } = useStore()
  const orgId = org?.id ?? ''

  const canManageAudit = ['owner', 'admin', 'technical', 'seo_specialist'].includes(myRole ?? '')

  const [activeTab, setActiveTab] = useState<'audit' | 'history'>('audit')

  const [url,      setUrl]      = useState(() => {
    const d = domain
    if (!d) return ''
    return d.startsWith('http') ? d : `https://${d}`
  })
  const [crawling, setCrawling] = useState(false)
  const [crawlErr, setCrawlErr] = useState<string | null>(null)

  const [job,   setJob]   = useState<CrawlJob | null>(null)
  const [pages, setPages] = useState<CrawlPage[]>([])
  const [jobLoading, setJobLoading] = useState(true)

  const [sevFilter,   setSevFilter]  = useState<SeverityFilter>('all')
  const [typeFilter,  setTypeFilter] = useState<IssueTypeFilter>('all')
  const [expanded,    setExpanded]   = useState<string | null>(null)
  const [showPages,   setShowPages]  = useState(false)
  const [issuesLimit, setIssuesLimit] = useState(100)

  // ── History tab state ──────────────────────────────────────
  const [allJobs,         setAllJobs]         = useState<CrawlJob[]>([])
  const [historyLoading,  setHistoryLoading]  = useState(false)
  const [pdfExporting,    setPdfExporting]    = useState(false)
  const [statusFilter,    setStatusFilter]    = useState<'all' | AuditStatus>('all')
  const [historyPage,     setHistoryPage]     = useState(0)
  const [historyTotal,    setHistoryTotal]    = useState(0)
  const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set())
  const [downloading,     setDownloading]     = useState<Set<string>>(new Set())

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

    if (!jobs?.length) {
      // No crawl history yet — pre-fill URL from active site in store
      if (domain) setUrl(domain.startsWith('http') ? domain : `https://${domain}`)
      setJobLoading(false)
      return
    }
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
  }, [orgId, domain])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadLatest() }, [loadLatest])

  // When the active site changes but no crawl job is loaded, sync the URL field
  useEffect(() => {
    if (domain && !job && !crawling) {
      setUrl(domain.startsWith('http') ? domain : `https://${domain}`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain])

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

  // Score based on % of pages affected at each severity (normalized by page count)
  // High issues: up to -50 pts · Med: up to -30 pts · Low: up to -15 pts
  const healthScore = pages.length === 0 ? null : Math.max(0, Math.round(
    100
    - (pages.filter(p => p.issues.some(i => i.severity === 'high')).length / pages.length) * 50
    - (pages.filter(p => p.issues.some(i => i.severity === 'med')).length  / pages.length) * 30
    - (pages.filter(p => p.issues.some(i => i.severity === 'low')).length  / pages.length) * 15
  ))

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
      ['URL', 'Status', 'Title', 'Title Len', 'H1', 'H2', 'Words', 'Speed (ms)', 'Depth', 'Links In', 'Schema', 'OG Tags', 'Noindex', 'Issues'],
      pages.map(p => [p.url, p.status_code, p.title ?? '', p.title_len, p.h1_count, p.h2_count ?? '', p.word_count, p.response_time ?? '', p.crawl_depth ?? '', p.inbound_links ?? '', p.has_schema ? 'Yes' : 'No', p.has_og_tags ? 'Yes' : 'No', p.is_noindex ? 'Yes' : 'No', p.issues.length]),
    )
  }

  // ── History tab functions ──────────────────────────────────
  const loadAllJobs = useCallback(async (page: number, filter: 'all' | AuditStatus) => {
    if (!orgId) return
    setHistoryLoading(true)
    const from = page * HISTORY_PAGE_SIZE
    const to   = from + HISTORY_PAGE_SIZE - 1
    const base = supabase
      .from('jarvis_crawl_jobs')
      .select('*', { count: 'exact' })
      .eq('org_id', orgId)
      .order('started_at', { ascending: false })
    const q = filter !== 'all' ? base.eq('audit_status', filter) : base
    const { data, count } = await q.range(from, to) as unknown as { data: CrawlJob[] | null; count: number | null }
    setAllJobs(data ?? [])
    setHistoryTotal(count ?? 0)
    setHistoryPage(page)
    setSelectedIds(new Set())
    setHistoryLoading(false)
  }, [orgId])

  useEffect(() => {
    if (activeTab === 'history') loadAllJobs(0, statusFilter)
  }, [activeTab, statusFilter, loadAllJobs])

  async function downloadJobIssues(job: CrawlJob) {
    setDownloading(prev => new Set(prev).add(job.id))
    try {
      const { data: pageRows } = await supabase
        .from('jarvis_crawl_pages')
        .select('url, issues')
        .eq('job_id', job.id) as { data: { url: string; issues: Issue[] }[] | null }
      const allIss = (pageRows ?? []).flatMap(p => (p.issues ?? []).map(i => ({ ...i, url: p.url })))
      const site = job.site_url.replace(/^https?:\/\//, '').replace(/\/$/, '')
      const date = new Date(job.started_at).toISOString().slice(0, 10)
      downloadCSV(
        `audit-issues-${site}-${date}.csv`,
        ['URL', 'Severity', 'Type', 'Message'],
        allIss.map(i => [i.url, i.severity, i.type.replace(/_/g, ' '), i.message]),
      )
    } finally {
      setDownloading(prev => { const n = new Set(prev); n.delete(job.id); return n })
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds(prev => prev.size === allJobs.length ? new Set() : new Set(allJobs.map(j => j.id)))
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return
    await supabase.from('jarvis_crawl_jobs').delete().in('id', [...selectedIds])
    setSelectedIds(new Set())
    loadAllJobs(historyPage, statusFilter)
  }

  async function updateAuditStatus(jobId: string, status: AuditStatus) {
    await supabase
      .from('jarvis_crawl_jobs')
      .update({ audit_status: status } as never)
      .eq('id', jobId)
    setAllJobs(prev => prev.map(j => j.id === jobId ? { ...j, audit_status: status } : j))
  }

  async function exportHistoryCSV() {
    const base = supabase.from('jarvis_crawl_jobs').select('*').eq('org_id', orgId).order('started_at', { ascending: false })
    const q = statusFilter !== 'all' ? base.eq('audit_status', statusFilter) : base
    const { data: rows } = await q as { data: CrawlJob[] | null }
    downloadCSV(
      `audit-history-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Site URL', 'Pages Crawled', 'Issues Found', 'Audit Status', 'Crawl Status', 'Date Audited'],
      (rows ?? []).map(j => [j.site_url, j.total_pages, j.issues, j.audit_status ?? 'new', j.status, new Date(j.started_at).toLocaleString()]),
    )
  }

  async function exportHistoryPDF() {
    setPdfExporting(true)
    try { await exportToPDF('audit-history-table', 'Audit History') }
    catch { /* ignore */ }
    finally { setPdfExporting(false) }
  }

  // ── Loading ────────────────────────────────────────────────
  if (jobLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted text-sm">
        <Loader2 size={16} className="animate-spin" /> Loading crawl data…
      </div>
    )
  }

  const totalPages = Math.ceil(historyTotal / HISTORY_PAGE_SIZE)

  return (
    <div className="space-y-5">

      {/* ── Tabs ── */}
      <div className="flex border-b border-border">
        {([
          { id: 'audit',   label: 'Site Audit',    Icon: Search  },
          { id: 'history', label: 'Audit History',  Icon: History },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-xs font-medium cursor-pointer transition-colors border-b-2 -mb-px',
              activeTab === t.id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-tx'
            )}>
            <t.Icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Audit History Tab ── */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          <Card>
            {/* Header row */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <CardTitle className="mb-0.5">Audit History</CardTitle>
                <p className="text-[11px] text-muted">
                  All crawls for this organisation — track, distribute to dev team, and mark as resolved
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'new', 'pending', 'completed'] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-all border capitalize',
                      statusFilter === s ? 'bg-accent text-black border-accent' : 'border-border text-muted hover:border-accent'
                    )}>{s}</button>
                ))}
                <div className="w-px h-5 bg-border mx-1" />
                {selectedIds.size > 0 && canManageAudit && (
                  <button onClick={deleteSelected}
                    className="flex items-center gap-1 text-[11px] text-danger border border-danger/40 rounded-lg px-2.5 py-1 hover:bg-danger/10 transition-colors cursor-pointer font-semibold">
                    <Trash2 size={11} /> Delete {selectedIds.size}
                  </button>
                )}
                <button onClick={exportHistoryCSV}
                  className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer font-mono-jarvis">
                  <Download size={11} /> CSV
                </button>
                <button onClick={exportHistoryPDF} disabled={pdfExporting}
                  className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer font-mono-jarvis">
                  {pdfExporting ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />} PDF
                </button>
              </div>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted text-sm">
                <Loader2 size={14} className="animate-spin" /> Loading history…
              </div>
            ) : allJobs.length === 0 ? (
              <div className="text-center py-12">
                <History size={36} className="mx-auto mb-3 text-muted opacity-30" strokeWidth={1.25} />
                <div className="text-sm text-muted">No audits found{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ' yet'}</div>
              </div>
            ) : (
              <>
                <div id="audit-history-table" className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left">
                        {canManageAudit && (
                          <th className="pb-3 pr-3 w-8">
                            <input type="checkbox"
                              checked={selectedIds.size === allJobs.length && allJobs.length > 0}
                              onChange={toggleSelectAll}
                              className="accent-accent cursor-pointer" />
                          </th>
                        )}
                        {['Site URL', 'Pages', 'Issues', 'Audit Status', 'Date Audited', 'Crawl Status', 'Results', 'Action'].map(h => (
                          <th key={h} className="pb-3 pr-4 text-[10px] tracking-widest text-muted font-mono-jarvis font-normal">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allJobs.map(j => {
                        const auditSt = (j.audit_status ?? 'new') as AuditStatus
                        const cfg     = AUDIT_STATUS_CFG[auditSt]
                        const isDownloading = downloading.has(j.id)
                        return (
                          <tr key={j.id} className="border-b border-border hover:bg-surface/50 transition-colors">
                            {canManageAudit && (
                              <td className="py-3 pr-3">
                                <input type="checkbox" checked={selectedIds.has(j.id)} onChange={() => toggleSelect(j.id)}
                                  className="accent-accent cursor-pointer" />
                              </td>
                            )}
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-1.5 font-mono-jarvis text-accent">
                                <Globe size={11} className="shrink-0" />
                                <span className="truncate max-w-44">{j.site_url}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4 font-mono-jarvis text-muted">{j.total_pages}</td>
                            <td className="py-3 pr-4">
                              <span className={j.issues > 0 ? 'text-danger font-semibold' : 'text-accent3'}>{j.issues}</span>
                            </td>
                            <td className="py-3 pr-4">
                              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', cfg.bg, cfg.border)}
                                style={{ color: cfg.color }}>
                                {auditSt === 'new'       && <Clock size={9} />}
                                {auditSt === 'pending'   && <RefreshCw size={9} />}
                                {auditSt === 'completed' && <CheckCircle size={9} />}
                                {cfg.label}
                              </span>
                            </td>
                            <td className="py-3 pr-4 font-mono-jarvis text-muted text-[11px]">
                              {new Date(j.started_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              <div className="text-[10px]">{new Date(j.started_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>
                            <td className="py-3 pr-4">
                              <span className={cn('text-[11px] font-mono-jarvis',
                                j.status === 'completed' ? 'text-accent3' : j.status === 'failed' ? 'text-danger' : 'text-accent'
                              )}>{j.status}</span>
                            </td>
                            {/* Download issues CSV */}
                            <td className="py-3 pr-4">
                              {j.status === 'completed' && j.issues > 0 ? (
                                <button onClick={() => downloadJobIssues(j)} disabled={isDownloading}
                                  className="flex items-center gap-1 text-[11px] text-accent hover:text-accent3 cursor-pointer font-mono-jarvis transition-colors disabled:opacity-50">
                                  {isDownloading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                                  {isDownloading ? 'Saving…' : 'Download'}
                                </button>
                              ) : (
                                <span className="text-[10px] text-muted font-mono-jarvis">—</span>
                              )}
                            </td>
                            {/* Action */}
                            <td className="py-3">
                              {canManageAudit ? (
                                <select value={auditSt} onChange={e => updateAuditStatus(j.id, e.target.value as AuditStatus)}
                                  className="bg-surface border border-border rounded-lg px-2 py-1 text-[11px] font-mono-jarvis outline-none cursor-pointer hover:border-accent/40 transition-colors"
                                  style={{ color: cfg.color }}>
                                  <option value="new">New</option>
                                  <option value="pending">Pending</option>
                                  <option value="completed">Completed</option>
                                </select>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] text-muted font-mono-jarvis">
                                  <Eye size={10} /> View only
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {historyTotal > HISTORY_PAGE_SIZE && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div className="text-[11px] text-muted font-mono-jarvis">
                      {historyPage * HISTORY_PAGE_SIZE + 1}–{Math.min((historyPage + 1) * HISTORY_PAGE_SIZE, historyTotal)} of {historyTotal} audits
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => loadAllJobs(historyPage - 1, statusFilter)} disabled={historyPage === 0}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-[11px] text-muted hover:border-accent hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                        <ChevronLeft size={12} /> Prev
                      </button>
                      <span className="text-[11px] font-mono-jarvis text-muted px-1">
                        {historyPage + 1} / {totalPages}
                      </span>
                      <button onClick={() => loadAllJobs(historyPage + 1, statusFilter)} disabled={(historyPage + 1) >= totalPages}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-[11px] text-muted hover:border-accent hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                        Next <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'audit' && <>

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
                  <button key={s} onClick={() => { setSevFilter(s); setIssuesLimit(100) }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono-jarvis transition-colors cursor-pointer
                      ${sevFilter === s ? 'bg-accent text-black' : 'bg-surface border border-border text-muted hover:border-accent'}`}>
                    {s.toUpperCase()}
                  </button>
                ))}
                <select
                  value={typeFilter}
                  onChange={e => { setTypeFilter(e.target.value); setIssuesLimit(100) }}
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
                {filteredIssues.slice(0, issuesLimit).map((issue, i) => (
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
                {filteredIssues.length > issuesLimit && (
                  <div className="flex items-center justify-between pt-3 border-t border-border mt-1">
                    <span className="text-[11px] text-muted font-mono-jarvis">
                      Showing {issuesLimit} of {filteredIssues.length} issues
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setIssuesLimit(l => l + 100)}
                        className="px-3 py-1.5 rounded-lg border border-border text-[11px] text-muted hover:border-accent hover:text-accent cursor-pointer transition-colors font-mono-jarvis">
                        Load 100 more
                      </button>
                      <button onClick={() => setIssuesLimit(filteredIssues.length)}
                        className="px-3 py-1.5 rounded-lg border border-accent/40 text-[11px] text-accent hover:bg-accent/10 cursor-pointer transition-colors font-mono-jarvis">
                        Show all {filteredIssues.length}
                      </button>
                    </div>
                  </div>
                )}
                {issuesLimit >= filteredIssues.length && filteredIssues.length > 100 && (
                  <div className="text-center pt-2">
                    <button onClick={() => setIssuesLimit(100)}
                      className="text-[11px] text-muted hover:text-accent font-mono-jarvis cursor-pointer transition-colors">
                      Collapse to 100
                    </button>
                  </div>
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
                      {['URL','Status','Title','H1','Words','Speed','Depth','Links In','Issues'].map(h => (
                        <th key={h} className="pb-2 pr-4 font-mono-jarvis text-[10px] text-muted tracking-widest whitespace-nowrap">{h}</th>
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
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {p.response_time != null ? (
                            <span className={p.response_time > 3000 ? 'text-danger' : p.response_time > 1500 ? 'text-amber-400' : 'text-accent3'}>
                              {p.response_time > 999 ? `${(p.response_time/1000).toFixed(1)}s` : `${p.response_time}ms`}
                            </span>
                          ) : <span className="text-muted">—</span>}
                        </td>
                        <td className="py-2 pr-4">
                          {p.crawl_depth != null
                            ? <span className="text-muted">{p.crawl_depth}</span>
                            : <span className="text-muted">—</span>}
                        </td>
                        <td className="py-2 pr-4">
                          {p.inbound_links != null ? (
                            <span className={p.inbound_links === 0 ? 'text-danger' : 'text-muted'}>
                              {p.inbound_links}
                            </span>
                          ) : <span className="text-muted">—</span>}
                        </td>
                        <td className="py-2">
                          {p.issues.length === 0 ? (
                            <CheckCircle size={13} className="text-accent3" />
                          ) : (
                            <div className="flex gap-1 items-center">
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

      </>}
    </div>
  )
}
