import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Copy, ChevronDown, ChevronRight, Network, FileText, History } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'
import { cn } from '@/lib/utils'

interface Cluster {
  name: string
  intent: string
  pillar: string
  keywords: string[]
  color: string
}

const COLORS = ['#00d4ff', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#a78bfa']

interface ClusteringRecord {
  id: string
  savedAt: string
  label: string
  sublabel: string
  keywords: string
  mode: 'topic' | 'intent' | 'funnel'
  clusters: Cluster[]
}

export function Clustering() {
  const [input, setInput] = useState('')
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]))
  const [mode, setMode] = useState<'topic' | 'intent' | 'funnel'>('topic')
  const [tab, setTab] = useState<'tool' | 'history'>('tool')

  const { records, save, remove, clear } = useHistory<ClusteringRecord>('jarvis_clustering_history')

  const cluster = useMutation({
    mutationFn: async () => {
      const kws = input.split('\n').map(s => s.trim()).filter(Boolean)
      return callClaude(
        'You are a semantic SEO expert specializing in keyword clustering. Return ONLY JSON, no markdown.',
        `Cluster these ${kws.length} keywords by ${mode === 'topic' ? 'topic/semantic similarity' : mode === 'intent' ? 'search intent' : 'funnel stage (TOFU/MOFU/BOFU)'}:

${kws.join('\n')}

Return JSON array only:
[{
  "name": "Cluster Name",
  "intent": "Info|Comm|Trans|Nav",
  "pillar": "Suggested pillar page title",
  "keywords": ["kw1","kw2"],
  "color": "#00d4ff"
}]
Use these colors in order: ${COLORS.join(', ')}`,
        1200,
      )
    },
    onSuccess: (data) => {
      if (data) {
        try {
          const match = data.match(/\[[\s\S]*\]/)
          if (match) {
            const parsed = JSON.parse(match[0]) as Cluster[]
            setClusters(parsed)
            const kwLines = input.split('\n').filter(Boolean)
            save({
              id: crypto.randomUUID(),
              savedAt: new Date().toISOString(),
              label: `${kwLines.length} keywords · ${mode}`,
              sublabel: `${parsed.length} clusters · ${kwLines.slice(0, 3).join(', ')}${kwLines.length > 3 ? '…' : ''}`,
              keywords: input,
              mode,
              clusters: parsed,
            })
          }
        } catch { /* keep */ }
      }
    },
  })

  function toggle(i: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function copyCluster(c: Cluster) {
    navigator.clipboard.writeText(c.keywords.join('\n'))
  }

  const MODES = [
    { id: 'topic',  label: 'By Topic',  tip: 'Groups keywords by semantic topic similarity. Best for building topic clusters and pillar pages.' },
    { id: 'intent', label: 'By Intent', tip: 'Groups by search intent (Info / Commercial / Transactional / Navigational). Helps match content type to user goal.' },
    { id: 'funnel', label: 'By Funnel', tip: 'Groups by funnel stage: TOFU (awareness), MOFU (consideration), BOFU (conversion). Useful for planning content across the buyer journey.' },
  ] as const

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab('tool')}
          className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
            tab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          Clustering
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
          onLoad={r => { setInput(r.keywords); setMode(r.mode); setClusters(r.clusters); setExpanded(new Set([0])); setTab('tool') }}
          onDelete={remove}
          onClear={clear}
          emptyText="No clustering history yet. Run the tool to save results."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Input */}
          <Card className="lg:col-span-1">
            <CardTitle className="mb-3 flex items-center gap-1.5">Keyword Clustering Engine <InfoTooltip text="Groups your keywords into semantic clusters so you can build topic-authoritative content. Each cluster maps to one pillar page and its supporting posts." /></CardTitle>
            <div className="flex gap-1 mb-3">
              {MODES.map(m => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className={cn('flex-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all flex items-center justify-center gap-1',
                    mode === m.id ? 'bg-accent text-black' : 'border border-border text-muted hover:border-accent'
                  )}
                >{m.label} <InfoTooltip text={m.tip} /></button>
              ))}
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              rows={14}
              placeholder="Paste keywords (one per line)…"
              className="w-full bg-surface border border-border rounded-lg p-3 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors resize-none scrollbar-thin mb-3"
            />
            <Button variant="primary" className="w-full justify-center" onClick={() => cluster.mutate()} disabled={cluster.isPending}>
              {cluster.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
              {cluster.isPending ? 'Clustering…' : `Cluster ${input.split('\n').filter(Boolean).length} Keywords`}
            </Button>
            {!isAIReady() && <div className="text-[10px] text-muted mt-2">Add an AI key in Onboarding.</div>}
          </Card>

          {/* Results */}
          <div className="lg:col-span-2 space-y-3">
            {clusters.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-semibold text-tx">{clusters.length} clusters · {clusters.reduce((a,c)=>a+c.keywords.length,0)} keywords</div>
                  <Button variant="ghost" className="text-[11px]" onClick={() => setExpanded(new Set(clusters.map((_,i)=>i)))}>Expand All</Button>
                </div>
                {clusters.map((c, i) => (
                  <Card key={i} className="p-0 overflow-hidden" style={{ borderColor: c.color + '40' }}>
                    <button
                      onClick={() => toggle(i)}
                      className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface transition-colors"
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
                      <div className="flex-1 text-left">
                        <div className="font-display font-bold text-sm" style={{ color: c.color }}>{c.name}</div>
                        <div className="text-[11px] text-muted flex items-center gap-1">
                          <span>{c.keywords.length} keywords</span>
                          <InfoTooltip text="Number of keywords in this cluster. Larger clusters indicate a broad topic with more content opportunities." side="right" />
                          <span>· {c.pillar}</span>
                        </div>
                      </div>
                      <Badge variant={c.intent === 'Info' ? 'accent' : c.intent === 'Trans' ? 'green' : 'purple'}>
                        {c.intent}
                      </Badge>
                      <InfoTooltip text="Dominant search intent for this cluster. Info = educational content; Comm = comparison pages; Trans = conversion-focused landing pages; Nav = brand pages." side="left" />
                      <span className="text-muted">{expanded.has(i) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</span>
                    </button>

                    {expanded.has(i) && (
                      <div className="px-4 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[10px] text-muted font-mono-jarvis tracking-widest flex items-center gap-1">PILLAR PAGE <InfoTooltip text="The suggested pillar (hub) page title that covers this topic cluster broadly. Supporting cluster keywords become internal links into this page." /></div>
                          <button onClick={() => copyCluster(c)} className="text-[11px] text-muted hover:text-accent flex items-center gap-1 cursor-pointer transition-colors">
                            <Copy size={11} /> Copy all
                          </button>
                        </div>
                        <div className="bg-surface border rounded-lg px-3 py-2 text-xs font-semibold text-tx mb-3">
                          <FileText size={11} className="inline mr-1 opacity-60" />{c.pillar}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {c.keywords.map((kw, j) => (
                            <span key={j} className="text-[11px] px-2.5 py-1 rounded-full bg-surface border border-border text-tx hover:border-accent transition-colors cursor-default">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Network size={40} className="mb-3 text-muted" strokeWidth={1} />
                <div className="text-sm text-muted">Paste keywords on the left and click Cluster</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
