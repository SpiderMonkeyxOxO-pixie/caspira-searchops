import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Plus, Loader2, Trash2, AlertCircle, Globe, Download, RefreshCw } from 'lucide-react'
import { callAI, isAIReady } from '@/lib/ai'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { downloadCSV } from '@/lib/csv'

interface CompetitorEntry {
  domain: string
  dr: number | null
  rank: string | null
  orgKw: number | null
  orgTraffic: number | null
  backlinks: number | null
  refDomains: number | null
  loading: boolean
  isYou?: boolean
}

interface DFSData {
  orgKw: number | null
  orgTraffic: number | null
  backlinks: number | null
  refDomains: number | null
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

async function fetchOPR(domain: string, apiKey: string): Promise<{ dr: number; rank: string } | null> {
  try {
    const { data, error } = await supabase.functions.invoke('opr-proxy', { body: { domain, apiKey } })
    if (error) return null
    const entry = data?.response?.[0]
    if (!entry) return null
    if (entry.status_code === 404) return { dr: 0, rank: '—' }
    if (entry.status_code !== 200) return null
    return {
      dr:   Math.round(entry.page_rank_decimal ?? entry.page_rank_integer ?? 0),
      rank: entry.rank ? `#${Number(entry.rank).toLocaleString()}` : '—',
    }
  } catch { return null }
}

async function fetchDFS(domain: string, credentials: string): Promise<DFSData | null> {
  try {
    const [rankRes, blRes] = await Promise.all([
      supabase.functions.invoke('dataforseo-proxy', {
        body: {
          credentials,
          endpoint: 'dataforseo_labs/google/domain_rank_overview/live',
          body: [{ target: domain, location_code: 2356, language_code: 'en' }],
        },
      }),
      supabase.functions.invoke('dataforseo-proxy', {
        body: {
          credentials,
          endpoint: 'backlinks/summary/live',
          body: [{ target: domain, limit: 1 }],
        },
      }),
    ])
    const orgData = rankRes.data?.tasks?.[0]?.result?.[0]?.metrics?.organic
    const blData  = blRes.data?.tasks?.[0]?.result?.[0]
    return {
      orgKw:      orgData?.keywords         ?? null,
      orgTraffic: orgData?.etv              ?? null,
      backlinks:  blData?.backlinks         ?? null,
      refDomains: blData?.referring_domains ?? null,
    }
  } catch { return null }
}

export function Competitors() {
  const { domain, openPageRankKey, dataForSEOKey, setSection } = useStore()
  const aiReady = isAIReady()

  const [competitors, setCompetitors] = useState<CompetitorEntry[]>([])
  const [newDomain,   setNewDomain]   = useState('')
  const [aiAnalysis,  setAiAnalysis]  = useState('')
  const [yourDR,      setYourDR]      = useState<number | null>(null)

  async function loadDomainData(d: string): Promise<Partial<CompetitorEntry>> {
    const [opr, dfs] = await Promise.all([
      openPageRankKey ? fetchOPR(d, openPageRankKey) : Promise.resolve(null),
      dataForSEOKey   ? fetchDFS(d, dataForSEOKey)   : Promise.resolve(null),
    ])
    return {
      dr:         opr?.dr         ?? null,
      rank:       opr?.rank       ?? null,
      orgKw:      dfs?.orgKw      ?? null,
      orgTraffic: dfs?.orgTraffic ?? null,
      backlinks:  dfs?.backlinks  ?? null,
      refDomains: dfs?.refDomains ?? null,
      loading:    false,
    }
  }

  async function addCompetitor() {
    const d = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!d || competitors.some(c => c.domain === d)) return
    setNewDomain('')
    const hasData = !!(openPageRankKey || dataForSEOKey)
    setCompetitors(prev => [...prev, {
      domain: d, dr: null, rank: null, orgKw: null, orgTraffic: null,
      backlinks: null, refDomains: null, loading: hasData,
    }])
    if (hasData) {
      const result = await loadDomainData(d)
      setCompetitors(prev => prev.map(c => c.domain === d ? { ...c, ...result } : c))
    }
  }

  async function refreshDomain(d: string) {
    if (!openPageRankKey && !dataForSEOKey) return
    setCompetitors(prev => prev.map(c => c.domain === d ? { ...c, loading: true } : c))
    const result = await loadDomainData(d)
    setCompetitors(prev => prev.map(c => c.domain === d ? { ...c, ...result } : c))
  }

  async function ensureYourDR() {
    if (!domain || !openPageRankKey || yourDR !== null) return
    const opr = await fetchOPR(domain, openPageRankKey)
    setYourDR(opr?.dr ?? 0)
  }

  const analyze = useMutation({
    mutationFn: async () => {
      await ensureYourDR()
      const compList = competitors.length
        ? competitors.map(c =>
            `${c.domain} (DR:${c.dr ?? '?'}, OrgKW:${fmt(c.orgKw)}, Traffic:${fmt(c.orgTraffic)}, BL:${fmt(c.backlinks)})`
          ).join('\n')
        : 'none added yet'
      return callAI(
        'You are an elite SEO competitive analyst for iGaming sites in India and Indonesia. Be sharp and specific.',
        `Compare ${domain || 'our casino site'} (DR: ${yourDR ?? '?'}) against these competitors:
${compList}

Provide:
1. Our #1 competitive advantage to double down on
2. Biggest keyword gap we can close in 90 days (be specific — bonus pages, review pages, game guides)
3. One tactic the top competitor is doing we should replicate immediately
4. Priority 30-day action plan

Industry: iGaming / online casino affiliate (India & Indonesia)
Be direct, specific, and actionable.`,
        800,
      )
    },
    onSuccess: setAiAnalysis,
  })

  function exportCSV() {
    const yourRow = domain
      ? [[domain, yourDR ?? '', '—', '—', '—', '—', '—']]
      : []
    downloadCSV(
      `competitors-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Domain', 'DR', 'Global Rank', 'Org. Keywords', 'Org. Traffic', 'Backlinks', 'Ref. Domains'],
      [
        ...yourRow,
        ...competitors.map(c => [
          c.domain,
          c.dr        ?? '',
          c.rank      ?? '',
          c.orgKw     ?? '',
          c.orgTraffic ?? '',
          c.backlinks  ?? '',
          c.refDomains ?? '',
        ]),
      ],
    )
  }

  const yourEntry: CompetitorEntry[] = domain
    ? [{ domain, dr: yourDR, rank: null, orgKw: null, orgTraffic: null, backlinks: null, refDomains: null, loading: false, isYou: true }]
    : []
  const allEntries = [...yourEntry, ...competitors]

  const hasDFS = !!dataForSEOKey

  return (
    <div className="space-y-5">
      {/* Domain cards */}
      {allEntries.length > 0 && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {allEntries.map(c => {
            const color = c.isYou ? '#00d4ff' : '#7c3aed'
            return (
              <Card key={c.domain} className="relative overflow-hidden" style={{ borderColor: color + '40' }}>
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: color }} />
                {c.isYou && <span className="text-[10px] font-bold text-accent mb-2 block font-mono-jarvis">● YOU</span>}
                <div className="font-display font-bold text-sm truncate mb-3" style={{ color }}>{c.domain}</div>

                <div className="grid grid-cols-2 gap-1.5">
                  {/* OPR metrics */}
                  <div className="bg-surface rounded-lg p-2">
                    <div className="text-[9px] tracking-widest text-muted font-mono-jarvis">DR</div>
                    <div className="text-lg font-display font-bold text-tx">
                      {c.loading ? <Loader2 size={14} className="animate-spin text-muted" /> : (c.dr !== null ? c.dr : '—')}
                    </div>
                  </div>
                  <div className="bg-surface rounded-lg p-2">
                    <div className="text-[9px] tracking-widest text-muted font-mono-jarvis">GLOBAL RANK</div>
                    <div className="text-xs font-display font-bold text-tx truncate">
                      {c.loading ? '…' : (c.rank ?? '—')}
                    </div>
                  </div>

                  {/* DFS metrics */}
                  <div className="bg-surface rounded-lg p-2">
                    <div className="text-[9px] tracking-widest text-muted font-mono-jarvis">ORG. KW</div>
                    <div className="text-sm font-display font-bold text-tx">
                      {c.loading ? '…' : hasDFS ? fmt(c.orgKw) : <span className="text-[9px] text-muted">no key</span>}
                    </div>
                  </div>
                  <div className="bg-surface rounded-lg p-2">
                    <div className="text-[9px] tracking-widest text-muted font-mono-jarvis">ORG. TRAFFIC</div>
                    <div className="text-sm font-display font-bold text-tx">
                      {c.loading ? '…' : hasDFS ? fmt(c.orgTraffic) : <span className="text-[9px] text-muted">no key</span>}
                    </div>
                  </div>
                  <div className="bg-surface rounded-lg p-2">
                    <div className="text-[9px] tracking-widest text-muted font-mono-jarvis">BACKLINKS</div>
                    <div className="text-sm font-display font-bold text-tx">
                      {c.loading ? '…' : hasDFS ? fmt(c.backlinks) : <span className="text-[9px] text-muted">no key</span>}
                    </div>
                  </div>
                  <div className="bg-surface rounded-lg p-2">
                    <div className="text-[9px] tracking-widest text-muted font-mono-jarvis">REF. DOMAINS</div>
                    <div className="text-sm font-display font-bold text-tx">
                      {c.loading ? '…' : hasDFS ? fmt(c.refDomains) : <span className="text-[9px] text-muted">no key</span>}
                    </div>
                  </div>
                </div>

                {!c.isYou && (
                  <div className="absolute top-3 right-3 flex gap-1">
                    <button onClick={() => refreshDomain(c.domain)}
                      className="text-muted hover:text-accent transition-colors cursor-pointer">
                      <RefreshCw size={10} />
                    </button>
                    <button onClick={() => setCompetitors(prev => prev.filter(x => x.domain !== c.domain))}
                      className="text-muted hover:text-danger transition-colors cursor-pointer">
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Comparison table */}
      {allEntries.length > 1 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Side-by-Side Comparison</CardTitle>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer"
            >
              <Download size={11} /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] text-muted font-mono-jarvis tracking-widest">
                  <th className="text-left pb-2 font-medium">DOMAIN</th>
                  <th className="text-center pb-2 font-medium">DR</th>
                  <th className="text-center pb-2 font-medium">GLOBAL RANK</th>
                  <th className="text-center pb-2 font-medium">ORG. KW</th>
                  <th className="text-center pb-2 font-medium">ORG. TRAFFIC</th>
                  <th className="text-center pb-2 font-medium">BACKLINKS</th>
                  <th className="text-center pb-2 font-medium">REF. DOMAINS</th>
                </tr>
              </thead>
              <tbody>
                {allEntries.map(c => (
                  <tr key={c.domain} className={`border-b border-border/40 hover:bg-surface transition-colors ${c.isYou ? 'bg-accent/5' : ''}`}>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.isYou ? '#00d4ff' : '#7c3aed' }} />
                        <span className="font-medium text-tx">{c.domain}</span>
                        {c.isYou && <span className="text-[9px] text-accent font-mono-jarvis">YOU</span>}
                      </div>
                    </td>
                    <td className="py-2.5 text-center font-mono-jarvis text-tx">{c.loading ? '…' : (c.dr ?? '—')}</td>
                    <td className="py-2.5 text-center font-mono-jarvis text-muted">{c.loading ? '…' : (c.rank ?? '—')}</td>
                    <td className="py-2.5 text-center font-mono-jarvis text-tx">{c.loading ? '…' : fmt(c.orgKw)}</td>
                    <td className="py-2.5 text-center font-mono-jarvis text-tx">{c.loading ? '…' : fmt(c.orgTraffic)}</td>
                    <td className="py-2.5 text-center font-mono-jarvis text-tx">{c.loading ? '…' : fmt(c.backlinks)}</td>
                    <td className="py-2.5 text-center font-mono-jarvis text-tx">{c.loading ? '…' : fmt(c.refDomains)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add competitor */}
      <Card>
        <CardTitle className="mb-3">Add Competitor</CardTitle>
        <div className="flex gap-3 mb-3">
          <div className="relative flex-1">
            <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCompetitor()}
              placeholder="competitor-domain.com"
              className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors font-mono-jarvis"
            />
          </div>
          <Button variant="primary" onClick={addCompetitor} disabled={!newDomain.trim()}>
            <Plus size={13} /> Add
          </Button>
        </div>

        <div className="space-y-1.5">
          {!openPageRankKey && (
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <AlertCircle size={11} className="text-amber-400 shrink-0" />
              Add an OpenPageRank key in Onboarding for Domain Rating data.
              <button onClick={() => setSection('onboarding')} className="text-accent hover:underline cursor-pointer ml-1">Add key →</button>
            </div>
          )}
          {!dataForSEOKey && (
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <AlertCircle size={11} className="text-amber-400 shrink-0" />
              Add DataForSEO credentials in Settings for organic keywords, traffic, and backlink data.
            </div>
          )}
        </div>
      </Card>

      {/* AI analysis */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardTitle>AI Competitor Analysis</CardTitle>
          <Button variant="primary" onClick={() => analyze.mutate()} disabled={analyze.isPending || !aiReady}>
            {analyze.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            {analyze.isPending ? 'Analyzing…' : 'Run AI Analysis'}
          </Button>
        </div>
        {!aiReady && (
          <div className="flex items-center gap-2 text-[11px] text-muted mb-3">
            <AlertCircle size={11} className="text-amber-400 shrink-0" />
            Add an OpenRouter or Anthropic key in Onboarding for AI competitive analysis.
          </div>
        )}
        {aiAnalysis ? (
          <div className="bg-surface border border-border rounded-xl p-4 text-xs text-tx leading-relaxed whitespace-pre-wrap">
            <div className="text-[10px] text-accent font-mono-jarvis tracking-widest mb-2">AI ANALYSIS</div>
            {aiAnalysis}
          </div>
        ) : (
          <p className="text-xs text-muted">
            Add competitor domains above, then run AI analysis to get gap identification, tactical recommendations, and a 30-day action plan.
          </p>
        )}
      </Card>
    </div>
  )
}
