import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Search, Loader2, Copy, Check, Download, History } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { downloadCSV } from '@/lib/csv'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'

interface Kw { kw: string; vol: string; kd: number; intent: string; cpc: string; opportunity: 'HIGH'|'MED'|'LOW' }

interface KwRecord {
  id: string
  savedAt: string
  label: string
  sublabel: string
  query: string
  keywords: Kw[]
}


const INTENT_COLOR: Record<string, 'accent'|'purple'|'green'|'amber'> = {
  Info:'accent', Comm:'purple', Trans:'green', Nav:'amber'
}
const OPP_COLOR: Record<string, 'green'|'amber'|'red'> = { HIGH:'green', MED:'amber', LOW:'red' }

function KdBar({ kd }: { kd: number }) {
  const color = kd <= 30 ? '#10b981' : kd <= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${kd}%`, background: color }} />
      </div>
      <span className="font-mono-jarvis text-[11px]" style={{ color }}>{kd}</span>
    </div>
  )
}

export function Keywords() {
  const { domain } = useStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [results, setResults] = useState<Kw[]>([])
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<'tool' | 'history'>('tool')

  const { records, save, remove, clear } = useHistory<KwRecord>('jarvis_keywords_history')

  const research = useMutation({
    mutationFn: async () => {
      if (!isAIReady()) throw new Error('NO_KEY')
      return callClaude(
        'You are an elite SEO keyword researcher. Return ONLY a JSON array, no markdown, no explanation.',
        `Generate 12 keyword ideas for the iGaming/online casino niche: "${query || domain || 'online casino'}"

Return ONLY this JSON array:
[{"kw":"keyword here","vol":"10K","kd":35,"intent":"Info","cpc":"$3.50","opportunity":"HIGH"}]

Intent options: Info, Comm, Trans, Nav
Opportunity: HIGH (kd<35), MED (kd 35-55), LOW (kd>55)
Make them realistic, varied difficulty, mix of intents.`,
        1200,
      )
    },
    onSuccess: (raw) => {
      try {
        const match = raw?.match(/\[[\s\S]*\]/)
        if (!match) return
        const kws = JSON.parse(match[0]) as Kw[]
        setResults(kws)
        save({
          id: crypto.randomUUID(), savedAt: new Date().toISOString(),
          label:    query || domain || 'keyword research',
          sublabel: `${kws.length} keywords · ${kws.filter(k => k.opportunity === 'HIGH').length} high opp.`,
          query:    query,
          keywords: kws,
        })
      } catch { /* keep existing */ }
    },
  })

  const filtered = results.filter(k => {
    if (filter === 'easy')   return k.kd <= 30
    if (filter === 'trans')  return k.intent === 'Trans'
    if (filter === 'info')   return k.intent === 'Info'
    if (filter === 'high')   return k.opportunity === 'HIGH'
    return true
  })

  function copyAll() {
    navigator.clipboard.writeText(filtered.map(k => k.kw).join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function exportCSV() {
    downloadCSV(
      `keywords-${query || 'research'}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Keyword', 'Volume', 'KD', 'Intent', 'CPC', 'Opportunity'],
      filtered.map(k => [k.kw, k.vol, k.kd, k.intent, k.cpc, k.opportunity]),
    )
  }

  const FILTERS = [
    { id:'all',   label:'All' },
    { id:'easy',  label:'Easy (KD≤30)' },
    { id:'high',  label:'High Opp.' },
    { id:'trans', label:'Transactional' },
    { id:'info',  label:'Informational' },
  ]

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab('tool')}
          className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
            tab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          Keyword Research
        </button>
        <button onClick={() => setTab('history')}
          className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
            tab === 'history' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          <History size={11} /> History {records.length > 0 && `(${records.length})`}
        </button>
      </div>

      {tab === 'history' ? (
        <HistoryPanel
          records={records}
          onLoad={r => { setQuery(r.query); setResults(r.keywords); setTab('tool') }}
          onDelete={remove}
          onClear={clear}
          emptyText="No research history yet. Run AI Research to save results."
        />
      ) : (<>

      {/* Search */}
      <Card>
        <CardTitle className="mb-3">Keyword Research</CardTitle>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && research.mutate()}
              placeholder="Enter seed keyword or topic…"
              className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors"
            />
          </div>
          <Button variant="primary" onClick={() => research.mutate()} disabled={research.isPending || !isAIReady()}>
            {research.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            {research.isPending ? 'Researching…' : 'AI Research'}
          </Button>
          <Button variant="ghost" onClick={() => setResults([])}>Clear</Button>
        </div>
        {!isAIReady() && (
          <div className="text-[11px] text-muted mt-2">Configure API key in Settings to enable AI research</div>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:'TOTAL KWs',    val: results.length,                         color:'var(--color-accent)',  tip: 'Total number of keyword ideas generated' },
          { label:'HIGH OPP.',    val: results.filter(k=>k.opportunity==='HIGH').length, color:'#10b981',   tip: 'Keywords with HIGH opportunity (KD ≤34) — the easiest to rank for' },
          { label:'AVG KD',       val: Math.round(results.reduce((a,k)=>a+k.kd,0)/results.length||0), color:'var(--color-accent4)', tip: 'Average Keyword Difficulty across all results (0–100). Lower is easier.' },
          { label:'TRANSACTIONAL',val: results.filter(k=>k.intent==='Trans').length, color:'#a78bfa',       tip: 'Keywords with Transactional intent — users ready to sign up or deposit' },
        ].map(s => (
          <Card key={s.label} className="text-center py-4">
            <div className="text-2xl font-display font-black" style={{ color: s.color }}>{s.val}</div>
            <div className="text-[10px] tracking-widest text-muted mt-1 font-mono-jarvis inline-flex items-center gap-1 justify-center">
              {s.label} <InfoTooltip text={s.tip} />
            </div>
          </Card>
        ))}
      </div>

      {/* Filters + Table */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex gap-1">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                  filter === f.id
                    ? 'bg-accent text-black'
                    : 'border border-border text-muted hover:border-accent'
                )}
              >{f.label}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="text-[11px]" onClick={copyAll}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy All'}
            </Button>
            {filtered.length > 0 && (
              <Button variant="ghost" className="text-[11px]" onClick={exportCSV}>
                <Download size={12} /> Export CSV
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal whitespace-nowrap">KEYWORD</th>
                <th className="px-5 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">VOLUME <InfoTooltip text="Average monthly search volume for this keyword" /></span>
                </th>
                <th className="px-5 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">KD <InfoTooltip text="Keyword Difficulty (0–100). Lower = easier to rank for. Green ≤30, amber ≤50, red >50." /></span>
                </th>
                <th className="px-5 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">INTENT <InfoTooltip text="User search intent: Info (learning), Comm (comparing), Trans (buying), Nav (navigating to a site)" /></span>
                </th>
                <th className="px-5 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">CPC <InfoTooltip text="Cost Per Click — the average amount advertisers pay per ad click for this keyword" /></span>
                </th>
                <th className="px-5 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">OPPORTUNITY <InfoTooltip text="Overall opportunity rating: HIGH (KD≤34), MED (KD 35–55), LOW (KD>55)" /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((k, i) => (
                <tr key={i} className="border-b border-border hover:bg-surface transition-colors">
                  <td className="px-5 py-3 font-semibold text-tx">{k.kw}</td>
                  <td className="px-5 py-3 font-mono-jarvis text-accent">{k.vol}</td>
                  <td className="px-5 py-3"><KdBar kd={k.kd} /></td>
                  <td className="px-5 py-3"><Badge variant={INTENT_COLOR[k.intent]}>{k.intent}</Badge></td>
                  <td className="px-5 py-3 font-mono-jarvis text-muted">{k.cpc}</td>
                  <td className="px-5 py-3"><Badge variant={OPP_COLOR[k.opportunity]}>{k.opportunity}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      </>)}
    </div>
  )
}
