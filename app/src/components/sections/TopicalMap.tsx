import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Compass, Loader2, Plus, CheckCircle2, XCircle, AlertCircle, History } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { callDFS, isDFSReady } from '@/lib/dataforseo'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'
import { cn } from '@/lib/utils'

interface Subtopic { name: string; covered: boolean; thin?: boolean }
interface Cluster {
  id: string; name: string; color: string; coverage: number
  angle: number; subtopics: Subtopic[]
}

interface TopicalMapRecord {
  id: string
  savedAt: string
  label: string
  sublabel: string
  niche: string
  clusters: Cluster[]
}

const CX = 240, CY = 240, CLUSTER_R = 140

function clusterPos(angle: number) {
  const rad = (angle * Math.PI) / 180
  return { x: CX + CLUSTER_R * Math.cos(rad), y: CY + CLUSTER_R * Math.sin(rad) }
}

function CoverageWeb({ clusters, selected, onSelect }: {
  clusters: Cluster[]; selected: string | null; onSelect: (id: string) => void
}) {
  return (
    <svg width="480" height="480" viewBox="0 0 480 480" className="w-full max-w-md mx-auto">
      {[0.33, 0.66, 1].map(f => (
        <circle key={f} cx={CX} cy={CY} r={CLUSTER_R * f}
          fill="none" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 4" />
      ))}
      {clusters.map(c => {
        const pos = clusterPos(c.angle)
        return <line key={c.id} x1={CX} y1={CY} x2={pos.x} y2={pos.y} stroke="var(--color-border)" strokeWidth="1" />
      })}
      <polygon
        points={clusters.map(c => {
          const rad = (c.angle * Math.PI) / 180
          const r   = CLUSTER_R * (c.coverage / 100)
          return `${CX + r * Math.cos(rad)},${CY + r * Math.sin(rad)}`
        }).join(' ')}
        fill="#00d4ff12" stroke="#00d4ff" strokeWidth="1.5"
      />
      <circle cx={CX} cy={CY} r={28} fill="url(#centerGrad)" />
      <text x={CX} y={CY - 4} textAnchor="middle" fontSize="9" fill="white" fontFamily="Roboto Mono" fontWeight="700">TOPIC</text>
      <text x={CX} y={CY + 8} textAnchor="middle" fontSize="9" fill="white" fontFamily="Roboto Mono" fontWeight="700">MAP</text>
      {clusters.map(c => {
        const pos = clusterPos(c.angle)
        const isSelected = selected === c.id
        const color = c.coverage >= 70 ? c.color : c.coverage >= 50 ? '#f59e0b' : '#ef4444'
        return (
          <g key={c.id} onClick={() => onSelect(c.id)} style={{ cursor: 'pointer' }}>
            <circle cx={pos.x} cy={pos.y} r={isSelected ? 30 : 24}
              fill={color + '25'} stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} />
            <text x={pos.x} y={pos.y - 3} textAnchor="middle" fontSize="9"
              fill={color} fontFamily="Roboto Mono" fontWeight="700">{c.coverage}%</text>
            <text x={pos.x} y={pos.y + 8} textAnchor="middle" fontSize="8"
              fill={color} fontFamily="Roboto Mono">{c.name.split(' ')[0]}</text>
          </g>
        )
      })}
      <defs>
        <linearGradient id="centerGrad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#00d4ff" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function TopicalMap() {
  const [niche,    setNiche]    = useState('')
  const [domain,   setDomain]   = useState('')
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [tab, setTab] = useState<'tool' | 'history'>('tool')

  const { records, save, remove, clear } = useHistory<TopicalMapRecord>('jarvis_topicalmap_history')

  const analyze = useMutation({
    mutationFn: async () => {
      if (!isAIReady()) return null
      let realDataContext = ''
      if (isDFSReady() && domain.trim()) {
        try {
          const clean = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
          const result = await callDFS('dataforseo_labs/google/keywords_for_site/live', [{
            target: clean, location_code: 2356, language_code: 'en', limit: 80,
          }])
          const keywords: string[] = (result?.items ?? []).map((i: any) => i.keyword as string)
          if (keywords.length > 0)
            realDataContext = `\n\nREAL KEYWORDS this domain actually ranks for (use to mark covered:true for matching subtopics):\n${keywords.join(', ')}\n`
        } catch { /* ignore */ }
      }
      return callClaude(
        'You are a topical authority expert for SEO. Map every subtopic a site should cover to rank in its niche.',
        `Create a topical authority map for the niche: "${niche}"${realDataContext}

Return JSON array of 6 clusters:
[{
  "id": "bonuses",
  "name": "Bonuses",
  "color": "#00d4ff",
  "coverage": 70,
  "angle": -90,
  "subtopics": [
    {"name": "Subtopic Name", "covered": true},
    {"name": "Gap Topic", "covered": false}
  ]
}]

Use angles: -90, -30, 30, 90, 150, 210
Coverage 0-100 (base on real keyword data if provided, otherwise realistic estimate)
4-6 subtopics per cluster
Mark covered:true only where real keywords evidence exists`,
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
            const avgCov = Math.round(parsed.reduce((s, c) => s + c.coverage, 0) / parsed.length)
            const gaps   = parsed.flatMap(c => c.subtopics.filter(s => !s.covered)).length
            save({
              id: crypto.randomUUID(),
              savedAt: new Date().toISOString(),
              label: niche,
              sublabel: `${avgCov}% coverage · ${gaps} gaps`,
              niche,
              clusters: parsed,
            })
          }
        } catch { /* keep */ }
      }
    },
  })

  const selectedCluster = clusters.find(c => c.id === selected)
  const overallCoverage = clusters.length > 0 ? Math.round(clusters.reduce((s, c) => s + c.coverage, 0) / clusters.length) : 0
  const totalGaps       = clusters.flatMap(c => c.subtopics.filter(s => !s.covered)).length
  const totalCovered    = clusters.flatMap(c => c.subtopics.filter(s => s.covered)).length

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab('tool')}
          className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
            tab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          Topical Map
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
          onLoad={r => { setNiche(r.niche); setClusters(r.clusters); setSelected(null); setTab('tool') }}
          onDelete={remove}
          onClear={clear}
          emptyText="No topical map history yet. Map a niche to save results."
        />
      ) : (
        <>
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <CardTitle className="mb-1">Topical Authority Map</CardTitle>
                <div className="text-[11px] text-muted font-mono-jarvis">Visual coverage of your niche vs Google's topical expectations</div>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <input value={niche} onChange={e => setNiche(e.target.value)}
                  placeholder="e.g. project management software"
                  className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors w-40" />
                {isDFSReady() && (
                  <input value={domain} onChange={e => setDomain(e.target.value)}
                    placeholder="yoursite.com (optional)"
                    className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors w-44" />
                )}
                <Button variant="primary" onClick={() => analyze.mutate()} disabled={analyze.isPending}>
                  {analyze.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                  {analyze.isPending ? 'Mapping…' : 'Map Niche'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'OVERALL COVERAGE', val: `${overallCoverage}%`, color: '#00d4ff', tip: 'Average topical coverage across all clusters. 100% means you have content covering every subtopic Google expects for this niche — the goal for topical authority.' },
                { label: 'TOPICS COVERED',   val: totalCovered,          color: '#10b981', tip: 'Number of subtopics where you already have content. These contribute to topical authority for this niche.' },
                { label: 'CONTENT GAPS',     val: totalGaps,             color: '#ef4444', tip: 'Subtopics with no content on your site. Gaps weaken topical authority — Google may not consider you an expert if key subtopics are missing.' },
              ].map(s => (
                <div key={s.label} className="bg-surface border border-border rounded-xl p-3 text-center">
                  <div className="text-2xl font-display font-black mb-0.5" style={{ color: s.color }}>{s.val}</div>
                  <div className="flex items-center justify-center gap-1 text-[9px] text-muted font-mono-jarvis tracking-widest">
                    {s.label}
                    <InfoTooltip text={s.tip} size={10} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {clusters.length === 0 && (
            <Card className="border-dashed border-2 border-border">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Compass size={40} className="mb-4 text-muted" strokeWidth={1} />
                <div className="text-sm font-semibold text-tx mb-2">No topical map yet</div>
                <div className="text-xs text-muted max-w-sm leading-relaxed">
                  Enter your niche above and click <strong>Map Niche</strong> to generate a topical authority map for your site.
                </div>
              </div>
            </Card>
          )}

          {clusters.length > 0 && (<>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <Card className="lg:col-span-3">
              <CardTitle className="mb-2">Coverage Web</CardTitle>
              <div className="text-[10px] text-muted font-mono-jarvis mb-3">Click a cluster to inspect subtopics</div>
              <CoverageWeb clusters={clusters} selected={selected} onSelect={setSelected} />
              <div className="flex gap-4 justify-center mt-2 text-[10px] text-muted">
                {[['#10b981','Strong (≥70%)'],['#f59e0b','Partial (50–69%)'],['#ef4444','Weak (<50%)']].map(([c,l]) => (
                  <span key={l} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}
                  </span>
                ))}
              </div>
            </Card>

            <Card className="lg:col-span-2">
              {selectedCluster ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: selectedCluster.color }} />
                    <CardTitle><span style={{ color: selectedCluster.color }}>{selectedCluster.name}</span></CardTitle>
                    <Badge variant={selectedCluster.coverage >= 70 ? 'green' : selectedCluster.coverage >= 50 ? 'amber' : 'red'}>
                      {selectedCluster.coverage}%
                    </Badge>
                  </div>

                  <div className="h-2 bg-border rounded-full overflow-hidden mb-4">
                    <div className="h-full rounded-full" style={{ width: `${selectedCluster.coverage}%`, background: selectedCluster.color }} />
                  </div>

                  <div className="space-y-2">
                    {selectedCluster.subtopics.map(sub => (
                      <div key={sub.name} className="flex items-center gap-2 p-2 rounded-lg bg-surface border border-border">
                        {sub.covered
                          ? <CheckCircle2 size={13} className="text-accent3 shrink-0" />
                          : <XCircle size={13} className="text-danger shrink-0" />
                        }
                        <span className={`text-xs flex-1 ${sub.covered ? 'text-muted' : 'text-tx font-medium'}`}>
                          {sub.name}
                        </span>
                        {!sub.covered && (
                          <button className="shrink-0 flex items-center gap-0.5 text-[10px] text-accent hover:underline cursor-pointer">
                            <Plus size={9} /> Plan
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <AlertCircle size={32} className="text-muted mb-2" strokeWidth={1} />
                  <div className="text-sm text-muted">Click a cluster node to inspect subtopics</div>
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {clusters.map(c => {
              const gaps = c.subtopics.filter(s => !s.covered).length
              return (
                <button key={c.id} onClick={() => setSelected(c.id)}
                  className={`text-left p-3 bg-surface border rounded-xl transition-colors cursor-pointer ${selected === c.id ? 'border-accent/50 bg-[#00d4ff08]' : 'border-border hover:border-accent/30'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-xs text-tx">{c.name}</div>
                    <div className="text-xs font-display font-black" style={{ color: c.color }}>{c.coverage}%</div>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full" style={{ width: `${c.coverage}%`, background: c.color }} />
                  </div>
                  <div className="text-[10px] text-muted font-mono-jarvis">{gaps} gaps · {c.subtopics.length - gaps} covered</div>
                </button>
              )
            })}
          </div>
          </>)}
        </>
      )}
    </div>
  )
}
