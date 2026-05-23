import { useState, useMemo } from 'react'
import { Hash, Search, TrendingUp, TrendingDown, Minus, Download, AlertCircle, Loader2, History } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { callAI, isAIReady } from '@/lib/ai'
import { callSerper, isSerperReady } from '@/lib/serper'
import { downloadCSV } from '@/lib/csv'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'
import { useStore } from '@/store'
import { supabase } from '@/lib/supabase'

type Intent = 'Info' | 'Comm' | 'Trans' | 'Nav'
type KWTab  = 'all' | 'questions' | 'longtail' | 'commercial' | 'comparisons'

interface KWRow {
  kw: string; vol: number; kd: number; cpc: number
  intent: Intent; trend: 'up' | 'down' | 'flat'; tabs: KWTab[]
  src: 'serper' | 'ai'
}

const INTENT_META: Record<Intent, { color: string }> = {
  Info:  { color: '#00d4ff' },
  Comm:  { color: '#f59e0b' },
  Trans: { color: '#10b981' },
  Nav:   { color: '#7c3aed' },
}

const TABS: { id: KWTab; label: string }[] = [
  { id: 'all',         label: 'All' },
  { id: 'questions',   label: 'Questions' },
  { id: 'longtail',    label: 'Long-tail' },
  { id: 'commercial',  label: 'Commercial' },
  { id: 'comparisons', label: 'Comparisons' },
]

interface KWExplorerRecord {
  id: string; savedAt: string; label: string; sublabel: string
  seed: string; rows: KWRow[]
}

const AI_SYSTEM = `You are an iGaming SEO expert specialising in India and Indonesia markets.
Generate keyword ideas in JSON format only. No markdown, no explanation — pure JSON array.`

function inferIntent(kw: string): Intent {
  const k = kw.toLowerCase()
  if (/^(how|what|is|are|why|which|can|does|when|where|apakah|cara)/i.test(k)) return 'Info'
  if (/best|top|review|vs|compare|terbaik|terpercaya|ranking/i.test(k)) return 'Comm'
  if (/buy|join|register|deposit|bonus|download|real money|daftar|free spin/i.test(k)) return 'Trans'
  return 'Nav'
}

function inferTabs(kw: string, intent: Intent): KWTab[] {
  const tabs: KWTab[] = ['all']
  if (/^(how|what|is|are|why|which|can|does|apakah|cara)/i.test(kw)) tabs.push('questions')
  if (kw.split(' ').length >= 4) tabs.push('longtail')
  if (intent === 'Trans' || intent === 'Comm') tabs.push('commercial')
  if (/\bvs\b|versus|\bor\b|compare/i.test(kw)) tabs.push('comparisons')
  return tabs
}

function computeTrend(monthly: Array<{ search_volume: number }>): 'up' | 'down' | 'flat' {
  if (monthly.length < 6) return 'flat'
  const recent = monthly.slice(0, 3).reduce((s, m) => s + m.search_volume, 0) / 3
  const older  = monthly.slice(3, 6).reduce((s, m) => s + m.search_volume, 0) / 3
  if (older === 0) return 'flat'
  const pct = (recent - older) / older
  if (pct > 0.15) return 'up'
  if (pct < -0.15) return 'down'
  return 'flat'
}

type DFSMetrics = { vol: number; kd: number; cpc: number; trend: 'up' | 'down' | 'flat' }

async function enrichWithDFS(keywords: string[], dfsKey: string): Promise<Map<string, DFSMetrics>> {
  const result = new Map<string, DFSMetrics>()
  keywords.forEach(kw => result.set(kw, { vol: 0, kd: 0, cpc: 0, trend: 'flat' }))

  await Promise.allSettled([
    // Search volume + CPC + trend (routed through Supabase proxy to avoid CORS)
    supabase.functions.invoke('dataforseo-proxy', {
      body: {
        credentials: dfsKey,
        endpoint:    'keywords_data/google_ads/search_volume/live',
        body:        [{ keywords, location_code: 2356, language_code: 'en' }],
      },
    }).then(({ data: d }) => {
      for (const item of (d?.tasks?.[0]?.result ?? [])) {
        const prev = result.get(item.keyword) ?? { vol: 0, kd: 0, cpc: 0, trend: 'flat' as const }
        result.set(item.keyword, {
          ...prev,
          vol:   item.search_volume ?? 0,
          cpc:   item.cpc           ?? 0,
          trend: computeTrend(item.monthly_searches ?? []),
        })
      }
    }),
    // Bulk keyword difficulty
    supabase.functions.invoke('dataforseo-proxy', {
      body: {
        credentials: dfsKey,
        endpoint:    'dataforseo_labs/google/bulk_keyword_difficulty/live',
        body:        [{ keywords, location_code: 2356, language_code: 'en' }],
      },
    }).then(({ data: d }) => {
      for (const item of (d?.tasks?.[0]?.result?.[0]?.items ?? [])) {
        const prev = result.get(item.keyword) ?? { vol: 0, kd: 0, cpc: 0, trend: 'flat' as const }
        result.set(item.keyword, { ...prev, kd: item.keyword_difficulty ?? 0 })
      }
    }),
  ])

  return result
}

// Extract keyword ideas from Serper response
function parseSerperKeywords(data: Record<string, unknown>, seed: string): KWRow[] {
  const rows: KWRow[] = []
  const seen = new Set<string>()

  function add(kw: string) {
    const clean = kw.trim().toLowerCase()
    if (!clean || seen.has(clean) || clean === seed.toLowerCase()) return
    seen.add(clean)
    const intent = inferIntent(clean)
    rows.push({ kw: clean, vol: 0, kd: 0, cpc: 0, intent, trend: 'flat', tabs: inferTabs(clean, intent), src: 'serper' })
  }

  // Related searches
  const related = data?.relatedSearches as Array<{ query?: string }> ?? []
  related.forEach(r => r.query && add(r.query))

  // People also ask
  const paa = data?.peopleAlsoAsk as Array<{ question?: string }> ?? []
  paa.forEach(p => p.question && add(p.question))

  // Autocomplete / related keywords from organic titles (extract noun phrases)
  const organic = data?.organic as Array<{ title?: string }> ?? []
  organic.slice(0, 5).forEach(o => {
    if (o.title) {
      // Use the title as a potential keyword if it contains the seed
      const title = o.title.toLowerCase()
      if (title.includes(seed.toLowerCase()) && title.length < 80) add(o.title)
    }
  })

  return rows
}

export function KeywordExplorer() {
  const aiReady     = isAIReady()
  const serperReady = isSerperReady()
  const { dataForSEOKey } = useStore()

  const [seed,         setSeed]         = useState('')
  const [activeTab,    setActiveTab]    = useState<KWTab>('all')
  const [intentFilter, setIntentFilter] = useState<Intent | 'all'>('all')
  const [sortCol,      setSortCol]      = useState<'vol' | 'kd' | 'cpc'>('vol')
  const [rows,         setRows]         = useState<KWRow[]>([])
  const [loading,      setLoading]      = useState(false)
  const [aiLoading,    setAiLoading]    = useState(false)
  const [enriching,    setEnriching]    = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [searched,     setSearched]     = useState(false)
  const [tab,          setTab]          = useState<'tool' | 'history'>('tool')

  const { records, save, remove, clear } = useHistory<KWExplorerRecord>('jarvis_kwexplorer_history')

  const results = useMemo(() => {
    let r = rows
    if (activeTab !== 'all')    r = r.filter(x => x.tabs.includes(activeTab))
    if (intentFilter !== 'all') r = r.filter(x => x.intent === intentFilter)
    return [...r].sort((a, b) => b[sortCol] - a[sortCol])
  }, [rows, activeTab, intentFilter, sortCol])

  const tabCount = (tab: KWTab) => rows.filter(r => r.tabs.includes(tab)).length

  async function searchWithSerper() {
    if (!seed.trim() || loading) return
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const data  = await callSerper(seed.trim(), { num: 10, gl: 'in' })
      const found = parseSerperKeywords(data, seed.trim())
      if (found.length === 0) {
        setError('No related keywords found. Try a broader seed keyword.')
      } else {
        let savedRows: KWRow[] = []
        setRows(prev => {
          const existing = new Set(prev.map(r => r.kw))
          const next = [...prev, ...found.filter(f => !existing.has(f.kw))]
          savedRows = next
          return next
        })
        if (dataForSEOKey) {
          setEnriching(true)
          try {
            const newKws = found.map(f => f.kw)
            const metrics = await enrichWithDFS(newKws, dataForSEOKey)
            setRows(prev => {
              const updated = prev.map(r => { const m = metrics.get(r.kw); return m ? { ...r, ...m } : r })
              savedRows = updated
              return updated
            })
          } catch { /* enrichment failure is non-fatal */ }
          finally { setEnriching(false) }
        }
        save({ id: crypto.randomUUID(), savedAt: new Date().toISOString(),
          label: seed.trim(), sublabel: `${savedRows.length} keywords · Serper`,
          seed: seed.trim(), rows: savedRows })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Serper search failed')
    } finally {
      setLoading(false)
    }
  }

  async function generateWithAI() {
    if (!seed.trim() || aiLoading) return
    setAiLoading(true)
    setError(null)
    setSearched(true)
    try {
      const raw = await callAI(
        AI_SYSTEM,
        `Generate 15 SEO keyword ideas for the seed: "${seed.trim()}"

Return ONLY a valid JSON array. Each object:
{
  "kw": "keyword string",
  "vol": monthly_search_volume_integer,
  "kd": keyword_difficulty_0_to_100,
  "cpc": cost_per_click_usd_float,
  "intent": "Info" | "Comm" | "Trans" | "Nav",
  "trend": "up" | "down" | "flat"
}

Focus on iGaming/casino keywords for India and Indonesia. Mix questions, long-tail, commercial, informational.`,
        1500,
      )
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed  = JSON.parse(cleaned) as Omit<KWRow, 'tabs' | 'src'>[]
      const newRows: KWRow[] = parsed.map(r => ({
        ...r,
        intent: (['Info','Comm','Trans','Nav'].includes(r.intent) ? r.intent : 'Info') as Intent,
        trend:  (['up','down','flat'].includes(r.trend) ? r.trend : 'flat') as KWRow['trend'],
        tabs:   inferTabs(r.kw, r.intent as Intent),
        src:    'ai' as const,
      }))
      const deduped = newRows.filter(r => {
        const existing = new Set(rows.map(x => x.kw))
        return !existing.has(r.kw)
      })
      let savedRows: KWRow[] = []
      setRows(prev => {
        const existing = new Set(prev.map(r => r.kw))
        const next = [...prev, ...newRows.filter(f => !existing.has(f.kw))]
        savedRows = next
        return next
      })
      if (dataForSEOKey && deduped.length > 0) {
        setEnriching(true)
        try {
          const metrics = await enrichWithDFS(deduped.map(r => r.kw), dataForSEOKey)
          setRows(prev => {
            const updated = prev.map(r => { const m = metrics.get(r.kw); return m ? { ...r, ...m } : r })
            savedRows = updated
            return updated
          })
        } catch { /* enrichment failure is non-fatal */ }
        finally { setEnriching(false) }
      }
      save({ id: crypto.randomUUID(), savedAt: new Date().toISOString(),
        label: seed.trim(), sublabel: `${savedRows.length} keywords · AI`,
        seed: seed.trim(), rows: savedRows })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  function exportCSV() {
    downloadCSV(
      `keyword-explorer-${seed || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Keyword', 'Intent', 'Volume', 'KD', 'CPC', 'Trend', 'Source'],
      results.map(r => [r.kw, r.intent, r.vol || '', r.kd || '', r.cpc ? `$${r.cpc.toFixed(2)}` : '', r.trend, r.src === 'ai' ? 'AI' : 'Google']),
    )
  }

  const totalVol = results.reduce((s, r) => s + r.vol, 0)
  const avgKD    = results.length ? Math.round(results.reduce((s, r) => s + r.kd, 0) / results.length) : 0
  const avgCPC   = results.length ? (results.reduce((s, r) => s + r.cpc, 0) / results.length).toFixed(2) : '0.00'

  return (
    <div className="space-y-5">
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab('tool')} className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer', tab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>Keyword Explorer</button>
        <button onClick={() => setTab('history')} className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer', tab === 'history' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          <History size={11} /> History {records.length > 0 && `(${records.length})`}
        </button>
      </div>
      {tab === 'history' ? (
        <HistoryPanel
          records={records}
          onLoad={r => { setSeed(r.seed); setRows(r.rows); setSearched(true); setTab('tool') }}
          onDelete={remove}
          onClear={clear}
          onDownload={r => downloadCSV(`keywords-${r.seed}-${r.savedAt.slice(0,10)}.csv`, ['Keyword','Intent','Volume','KD','CPC','Trend','Source'], r.rows.map(x => [x.kw, x.intent, x.vol||'', x.kd||'', x.cpc?`$${x.cpc.toFixed(2)}`:'', x.trend, x.src==='ai'?'AI':'GSR']))}
          emptyText="No keyword searches saved yet. Search or generate keywords to save results."
        />
      ) : (<>
      <Card>
        <CardTitle className="mb-1">Keyword Explorer</CardTitle>
        <p className="text-sm text-muted mb-4">
          Enter a seed keyword — pull related queries from Google via Serper, or generate AI-powered ideas. Volume, KD &amp; CPC are enriched automatically via DataForSEO.
        </p>
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={seed}
              onChange={e => setSeed(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && serperReady && searchWithSerper()}
              placeholder='Try "online casino", "slot online", "teen patti"…'
              className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors"
            />
          </div>
          <Button variant="ghost" onClick={searchWithSerper} disabled={!serperReady || loading || !seed.trim()}
            title={!serperReady ? 'Add Serper key in Onboarding' : ''}>
            <Search size={13} className={loading ? 'animate-pulse' : ''} />
            {loading ? 'Searching…' : 'Search Google'}
          </Button>
          <Button variant="primary" onClick={generateWithAI} disabled={!aiReady || aiLoading || !seed.trim()}
            title={!aiReady ? 'Add OpenRouter or Anthropic key in Onboarding' : ''}>
            {aiLoading ? 'Generating…' : `Generate with AI`}
          </Button>
          {rows.length > 0 && (
            <Button variant="ghost" onClick={() => { setRows([]); setSearched(false) }}>Clear</Button>
          )}
        </div>

        <div className="flex gap-3 mt-3 text-[11px] text-muted flex-wrap">
          {!serperReady && (
            <span className="flex items-center gap-1"><AlertCircle size={11} className="text-amber-400" /> Add Serper key for Google keyword research</span>
          )}
          {!aiReady && (
            <span className="flex items-center gap-1"><AlertCircle size={11} className="text-amber-400" /> Add OpenRouter or Anthropic key for AI generation</span>
          )}
        </div>
        {error && <div className="mt-2 text-[11px] text-danger flex items-center gap-1.5"><AlertCircle size={11} /> {error}</div>}
        {enriching && (
          <div className="mt-2 text-[11px] text-accent flex items-center gap-1.5">
            <Loader2 size={11} className="animate-spin" /> Fetching Volume, KD &amp; CPC from DataForSEO…
          </div>
        )}
      </Card>

      {searched && rows.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'KEYWORDS FOUND', val: rows.length.toString(),             color: '#00d4ff', tip: 'Total keyword ideas found from Google search and/or AI generation' },
              { label: 'TOTAL VOLUME',   val: totalVol ? (totalVol/1000).toFixed(0)+'K' : '—', color: '#10b981', tip: 'Combined monthly search volume across all keyword ideas in the current view' },
              { label: 'AVG KD',         val: avgKD ? avgKD+'%' : '—',            color: '#f59e0b', tip: 'Average Keyword Difficulty (0–100) across current results. Lower = easier to rank.' },
              { label: 'AVG CPC',        val: Number(avgCPC) ? '$'+avgCPC : '—',  color: '#7c3aed', tip: 'Average Cost Per Click — what advertisers pay per click for these keywords in Google Ads' },
            ].map(k => (
              <Card key={k.label} className="text-center py-4">
                <div className="text-2xl font-display font-black mb-1" style={{ color: k.color }}>{k.val}</div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest inline-flex items-center gap-1 justify-center">
                  {k.label} <InfoTooltip text={k.tip} />
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex gap-1 flex-wrap">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={cn(
                      'text-[11px] px-3 py-1.5 rounded-lg font-mono-jarvis cursor-pointer transition-colors border',
                      activeTab === t.id ? 'bg-accent text-black border-accent' : 'border-border text-muted hover:border-accent/40 hover:text-tx'
                    )}>
                    {t.label} <span className="opacity-60 ml-1">{tabCount(t.id)}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'Info', 'Comm', 'Trans', 'Nav'] as const).map(i => (
                  <button key={i} onClick={() => setIntentFilter(i)}
                    className={cn(
                      'text-[10px] px-2 py-1 rounded font-mono-jarvis cursor-pointer transition-all border',
                      intentFilter === i ? 'border-accent text-accent bg-accent/10' : 'border-border text-muted hover:text-tx'
                    )}>
                    {i === 'all' ? 'All Intent' : i}
                  </button>
                ))}
                <select value={sortCol} onChange={e => setSortCol(e.target.value as 'vol' | 'kd' | 'cpc')}
                  className="bg-surface border border-border rounded-lg px-2 py-1 text-[10px] text-muted outline-none cursor-pointer font-mono-jarvis">
                  <option value="vol">Sort: Volume</option>
                  <option value="kd">Sort: KD</option>
                  <option value="cpc">Sort: CPC</option>
                </select>
                <Button variant="ghost" className="text-[11px]" onClick={exportCSV}><Download size={11} /> Export CSV</Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] text-muted font-mono-jarvis tracking-widest">
                    <th className="text-left pb-2 font-medium">KEYWORD</th>
                    <th className="text-center pb-2 font-medium"><span className="inline-flex items-center gap-1">INTENT <InfoTooltip text="User search intent: Info (learning), Comm (comparing options), Trans (ready to buy/register), Nav (going to a specific site)" /></span></th>
                    <th className="text-right pb-2 font-medium pr-4"><span className="inline-flex items-center gap-1 justify-end">VOLUME <InfoTooltip text="Estimated average monthly search volume for this keyword" /></span></th>
                    <th className="text-left pb-2 font-medium w-32"><span className="inline-flex items-center gap-1">KD <InfoTooltip text="Keyword Difficulty (0–100). Green ≤50 = achievable, amber 51–70 = competitive, red >70 = very hard." /></span></th>
                    <th className="text-center pb-2 font-medium"><span className="inline-flex items-center gap-1">TREND <InfoTooltip text="Search volume trend direction: up = growing, down = declining, flat = stable" /></span></th>
                    <th className="text-right pb-2 font-medium"><span className="inline-flex items-center gap-1 justify-end">CPC <InfoTooltip text="Cost Per Click in USD — how much advertisers pay per Google Ads click. High CPC = commercially valuable keyword." /></span></th>
                    <th className="text-center pb-2 font-medium"><span className="inline-flex items-center gap-1">SRC <InfoTooltip text="Data source: GSR = pulled from real Google search results via Serper, AI = generated by AI model" /></span></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b border-border/40 hover:bg-surface transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-tx">{r.kw}</td>
                      <td className="py-2.5 text-center">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ color: INTENT_META[r.intent].color, background: INTENT_META[r.intent].color + '20' }}>
                          {r.intent}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono-jarvis text-muted">
                        {r.vol ? r.vol.toLocaleString() : '—'}
                      </td>
                      <td className="py-2.5 pr-4">
                        {r.kd ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{
                                width: `${r.kd}%`,
                                background: r.kd > 70 ? '#ef4444' : r.kd > 50 ? '#f59e0b' : '#10b981',
                              }} />
                            </div>
                            <span className="text-[10px] text-muted font-mono-jarvis w-5 text-right">{r.kd}</span>
                          </div>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td className="py-2.5 text-center">
                        {r.trend === 'up'   && <TrendingUp   size={13} className="text-accent3 inline" />}
                        {r.trend === 'down' && <TrendingDown  size={13} className="text-danger  inline" />}
                        {r.trend === 'flat' && <Minus         size={13} className="text-muted   inline" />}
                      </td>
                      <td className="py-2.5 text-right font-mono-jarvis text-muted">
                        {r.cpc ? '$'+r.cpc.toFixed(2) : '—'}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={`text-[9px] font-mono-jarvis ${r.src === 'ai' ? 'text-[#c084fc]' : 'text-accent'}`}>
                          {r.src === 'ai' ? 'AI' : 'GSR'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {(!searched || rows.length === 0) && !loading && !aiLoading && (
        <Card className="text-center py-16">
          <Hash size={40} className="text-muted mx-auto mb-3" strokeWidth={1} />
          <div className="font-display font-bold text-lg text-tx mb-1">Start with a seed keyword</div>
          <div className="text-sm text-muted max-w-sm mx-auto">
            <strong>Search Google</strong> to pull real related queries via Serper,
            or <strong>Generate with AI</strong> for volume estimates and intent classification.
          </div>
        </Card>
      )}
      </>)}
    </div>
  )
}
