import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Search, ShieldCheck, Award, BookOpen, Star, History } from 'lucide-react'
import { callClaude } from '@/lib/ai'
import { useStore } from '@/store'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'
import { cn } from '@/lib/utils'

interface EEATDimension { score: number; findings: string[]; fixes: string[] }
interface EEATResult {
  experience: EEATDimension
  expertise: EEATDimension
  authoritativeness: EEATDimension
  trustworthiness: EEATDimension
  overall: number
  summary: string
}

interface EEATRecord {
  id: string
  savedAt: string
  label: string
  sublabel: string
  url: string
  result: EEATResult
}

const DIMENSIONS = [
  { key: 'experience' as const,       label: 'Experience',       icon: Star,        color: '#00d4ff', tip: 'Experience — Google assesses whether the content creator has first-hand experience with the topic. This means reviewing or using the products/services you write about.' },
  { key: 'expertise' as const,        label: 'Expertise',        icon: BookOpen,    color: '#a78bfa', tip: 'Expertise — the depth of knowledge demonstrated in the content. Expert content cites data, specs, and industry facts accurately.' },
  { key: 'authoritativeness' as const,label: 'Authoritativeness',icon: Award,       color: '#10b981', tip: 'Authoritativeness — how recognised your site is within your niche. Measured by backlinks from trusted publications and brand mentions.' },
  { key: 'trustworthiness' as const,  label: 'Trustworthiness',  icon: ShieldCheck, color: '#f59e0b', tip: 'Trustworthiness — the most important E-E-A-T signal. Includes transparent ownership, licensing info, clear T&Cs, HTTPS, and accurate, updated content.' },
]

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 32, circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width="76" height="76" viewBox="0 0 76 76">
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--color-border)" strokeWidth="7" />
      <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 38 38)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="38" y="43" textAnchor="middle" fill={color}
        style={{ fontSize: 17, fontWeight: 900, fontFamily: 'Roboto' }}>{score}</text>
    </svg>
  )
}

export function EEATAudit() {
  const { domain } = useStore()
  const [url, setUrl] = useState(domain || '')
  const [result, setResult] = useState<EEATResult | null>(null)
  const [tab, setTab] = useState<'tool' | 'history'>('tool')

  const { records, save, remove, clear } = useHistory<EEATRecord>('jarvis_eeat_history')

  const audit = useMutation({
    mutationFn: async () => {
      return callClaude(
        'You are a Google E-E-A-T expert auditor specialising in YMYL sites. Return ONLY valid JSON.',
        `Perform an E-E-A-T audit for this site: ${url || 'this website'}

Return JSON only (no markdown):
{
  "overall": <0-100>,
  "summary": "<2 sentence assessment>",
  "experience": {
    "score": <0-100>,
    "findings": ["finding 1","finding 2","finding 3"],
    "fixes": ["fix 1","fix 2","fix 3"]
  },
  "expertise": { "score":<0-100>, "findings":["..."], "fixes":["..."] },
  "authoritativeness": { "score":<0-100>, "findings":["..."], "fixes":["..."] },
  "trustworthiness": { "score":<0-100>, "findings":["..."], "fixes":["..."] }
}`,
        1000,
      )
    },
    onSuccess: (data) => {
      if (data) {
        try {
          const match = data.match(/\{[\s\S]*\}/)
          if (match) {
            const parsed = JSON.parse(match[0]) as EEATResult
            setResult(parsed)
            save({
              id: crypto.randomUUID(),
              savedAt: new Date().toISOString(),
              label: url || 'Site audit',
              sublabel: `E-E-A-T Score: ${parsed.overall}/100`,
              url,
              result: parsed,
            })
          }
        } catch { /* keep */ }
      }
    },
  })

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab('tool')}
          className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
            tab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          E-E-A-T Audit
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
          onLoad={r => { setUrl(r.url); setResult(r.result); setTab('tool') }}
          onDelete={remove}
          onClear={clear}
          emptyText="No E-E-A-T audit history yet. Run an audit to save results."
        />
      ) : (
        <>
          <Card className="flex items-center gap-3">
            <Search size={14} className="text-muted shrink-0" />
            <input value={url} onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && audit.mutate()}
              placeholder="https://yoursite.com/page-to-audit"
              className="flex-1 bg-transparent text-sm text-tx outline-none placeholder:text-muted font-mono-jarvis"
            />
            <Button variant="primary" onClick={() => audit.mutate()} disabled={audit.isPending}>
              {audit.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
              {audit.isPending ? 'Auditing…' : 'Run E-E-A-T Audit'}
            </Button>
          </Card>

          {result && (
            <>
              {/* Overall */}
              <Card className="text-center py-6">
                <div className="text-6xl font-display font-black text-accent mb-2">{result.overall}</div>
                <div className="flex items-center justify-center gap-1 text-[11px] text-muted font-mono-jarvis tracking-widest mb-3">
                  OVERALL E-E-A-T SCORE
                  <InfoTooltip text="E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) — Google's quality framework for YMYL content. A higher combined score improves ranking potential for competitive keywords." />
                </div>
                <div className="text-sm text-muted max-w-lg mx-auto leading-relaxed">{result.summary}</div>
              </Card>

              {/* 4 dimensions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {DIMENSIONS.map(dim => {
                  const d = result[dim.key]
                  const Icon = dim.icon
                  return (
                    <Card key={dim.key} className="relative overflow-hidden" style={{ borderColor: dim.color + '30' }}>
                      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: dim.color }} />
                      <div className="flex items-center gap-4 mb-4">
                        <ScoreRing score={d.score} color={dim.color} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Icon size={14} style={{ color: dim.color }} />
                            <div className="font-display font-bold text-sm" style={{ color: dim.color }}>{dim.label}</div>
                            <InfoTooltip text={dim.tip} />
                          </div>
                          <div className="text-[11px] text-muted">
                            {d.score >= 70 ? 'Good — maintain and build on this' : d.score >= 50 ? 'Moderate — needs improvement' : 'Weak — priority area'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 mb-3">
                        <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">FINDINGS</div>
                        {d.findings.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-muted">
                            <span className="text-danger mt-0.5 shrink-0">•</span>{f}
                          </div>
                        ))}
                      </div>

                      <div className="bg-surface border border-border rounded-xl p-3 space-y-1">
                        <div className="text-[10px] text-accent3 font-mono-jarvis tracking-widest mb-1.5">FIXES</div>
                        {d.fixes.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-tx">
                            <span className="text-accent3 mt-0.5 shrink-0">→</span>{f}
                          </div>
                        ))}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
