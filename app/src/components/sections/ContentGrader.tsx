import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { GraduationCap, Loader2, AlertCircle, CheckCircle2, Info, XCircle, History } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'
import { cn } from '@/lib/utils'

interface CategoryScore { label: string; score: number; max: number; color: string }
interface Issue { severity: 'critical' | 'warning' | 'info' | 'pass'; message: string; suggestion: string }

interface GradeResult {
  overall: number
  categories: CategoryScore[]
  issues: Issue[]
  summary: string
}

interface GraderRecord {
  id: string
  savedAt: string
  label: string
  sublabel: string
  keyword: string
  textPreview: string
  result: GradeResult
}

const SEV_ICON: Record<Issue['severity'], React.ReactNode> = {
  critical: <XCircle size={13} className="text-danger shrink-0 mt-0.5" />,
  warning:  <AlertCircle size={13} className="text-accent4 shrink-0 mt-0.5" />,
  info:     <Info size={13} className="text-accent shrink-0 mt-0.5" />,
  pass:     <CheckCircle2 size={13} className="text-accent3 shrink-0 mt-0.5" />,
}

const SEV_BADGE: Record<Issue['severity'], 'red' | 'amber' | 'accent' | 'green'> = {
  critical: 'red', warning: 'amber', info: 'accent', pass: 'green',
}

function ScoreRing({ score }: { score: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  const dash = (score / 100) * c
  const color = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444'
  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={r} fill="none" stroke="var(--color-border)" strokeWidth="10" />
      <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        transform="rotate(-90 65 65)" />
      <text x="65" y="61" textAnchor="middle" fontSize="26" fontWeight="900" fill={color} fontFamily="Roboto">{score}</text>
      <text x="65" y="77" textAnchor="middle" fontSize="10" fill="var(--color-muted)" fontFamily="Roboto Mono">/ 100</text>
    </svg>
  )
}

export function ContentGrader() {
  const [text,    setText]    = useState('')
  const [keyword, setKeyword] = useState('')
  const [result,  setResult]  = useState<GradeResult | null>(null)
  const [filter,  setFilter]  = useState<Issue['severity'] | 'all'>('all')
  const [tab, setTab] = useState<'tool' | 'history'>('tool')

  const { records, save, remove, clear } = useHistory<GraderRecord>('jarvis_grader_history')

  const grade = useMutation({
    mutationFn: async () => {
      return callClaude(
        'You are an expert SEO content auditor specialising in iGaming YMYL content. Grade the article and return JSON only.',
        `Grade this casino article for the target keyword "${keyword}":

ARTICLE:
${text.slice(0, 3000)}

Return JSON:
{
  "overall": 0-100,
  "categories": [
    {"label":"Structure & Headings","score":0-20,"max":20,"color":"#00d4ff"},
    {"label":"Keyword Optimisation","score":0-25,"max":25,"color":"#7c3aed"},
    {"label":"Readability","score":0-20,"max":20,"color":"#10b981"},
    {"label":"E-E-A-T Signals","score":0-20,"max":20,"color":"#f59e0b"},
    {"label":"Internal Linking","score":0-15,"max":15,"color":"#ef4444"}
  ],
  "issues": [
    {"severity":"critical|warning|info|pass","message":"specific issue","suggestion":"specific fix"}
  ],
  "summary":"2-sentence overall assessment for UK iGaming content"
}`,
        1600,
      )
    },
    onSuccess: (data) => {
      if (data) {
        try {
          const match = data.match(/\{[\s\S]*\}/)
          if (match) {
            const parsed = JSON.parse(match[0]) as GradeResult
            setResult(parsed)
            save({
              id: crypto.randomUUID(),
              savedAt: new Date().toISOString(),
              label: keyword || 'Unkeyed article',
              sublabel: `Score: ${parsed.overall}/100 · ${text.slice(0, 60).trim()}…`,
              keyword,
              textPreview: text.slice(0, 200),
              result: parsed,
            })
          }
        } catch { /* keep */ }
      }
    },
  })

  const filtered = result?.issues.filter(i => filter === 'all' || i.severity === filter) ?? []
  const counts = result ? {
    critical: result.issues.filter(i => i.severity === 'critical').length,
    warning:  result.issues.filter(i => i.severity === 'warning').length,
    pass:     result.issues.filter(i => i.severity === 'pass').length,
  } : null

  const CAT_TIPS: Record<string, string> = {
    'Structure & Headings':    'Evaluates H1/H2/H3 hierarchy, heading keyword inclusion, and section organisation. Max 20 pts.',
    'Keyword Optimisation':    'Checks keyword density, placement in title, intro, and subheadings, and avoidance of over-optimisation. Max 25 pts.',
    'Readability':             'Assesses sentence length, paragraph structure, active voice, and overall readability score. Max 20 pts.',
    'E-E-A-T Signals':         'Looks for Experience, Expertise, Authoritativeness, and Trust signals — critical for YMYL iGaming content. Max 20 pts.',
    'Internal Linking':        'Counts contextual internal links to related casino pages, pillar content, and responsible gambling resources. Max 15 pts.',
  }

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab('tool')}
          className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
            tab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          Content Grader
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
          onLoad={r => { setKeyword(r.keyword); setText(r.textPreview); setResult(r.result); setFilter('all'); setTab('tool') }}
          onDelete={remove}
          onClear={clear}
          emptyText="No grading history yet. Grade content to save results."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Input */}
          <Card className="lg:col-span-2 space-y-3">
            <CardTitle>Content Grader</CardTitle>
            <div>
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5 flex items-center gap-1">TARGET KEYWORD <InfoTooltip text="The primary keyword the article should rank for. Used to evaluate keyword placement, density, and optimisation." /></div>
              <input value={keyword} onChange={e => setKeyword(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
            </div>
            <div>
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5 flex items-center gap-1">PASTE ARTICLE <InfoTooltip text="Paste the full article text. Only the first 3,000 characters are sent for grading — ensure your intro and headings are near the top." /></div>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={14}
                placeholder="Paste your casino article here…"
                className="w-full bg-surface border border-border rounded-lg p-3 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors resize-none scrollbar-thin" />
            </div>
            <Button variant="primary" className="w-full justify-center" onClick={() => grade.mutate()} disabled={grade.isPending}>
              {grade.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
              {grade.isPending ? 'Grading…' : 'Grade Content'}
            </Button>
            {!isAIReady() && <div className="text-[10px] text-muted">Add an AI key in Onboarding.</div>}
          </Card>

          {/* Results */}
          {result ? (
            <div className="lg:col-span-3 space-y-4">
              <Card>
                <div className="flex items-center gap-6 mb-4">
                  <div className="relative">
                    <ScoreRing score={result.overall} />
                    <div className="absolute -top-1 -right-1">
                      <InfoTooltip text="Overall content score out of 100. Combines Structure, Keyword Optimisation, Readability, E-E-A-T, and Internal Linking. Aim for 70+ for competitive iGaming SERPs." side="right" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-display font-black text-xl text-tx mb-1">
                      {result.overall >= 70 ? 'Good' : result.overall >= 45 ? 'Needs Work' : 'Poor'} Content Quality
                    </div>
                    <div className="text-xs text-muted leading-relaxed">{result.summary}</div>
                    {counts && (
                      <div className="flex gap-2 mt-2">
                        <Badge variant="red">{counts.critical} critical</Badge>
                        <Badge variant="amber">{counts.warning} warnings</Badge>
                        <Badge variant="green">{counts.pass} passed</Badge>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2.5">
                  {result.categories.map(cat => (
                    <div key={cat.label}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-tx flex items-center gap-1">{cat.label} <InfoTooltip text={CAT_TIPS[cat.label] ?? cat.label} /></span>
                        <span className="font-mono-jarvis" style={{ color: cat.color }}>{cat.score}/{cat.max}</span>
                      </div>
                      <div className="h-2 bg-border rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${(cat.score / cat.max) * 100}%`, background: cat.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-3">
                  <CardTitle>Issues & Suggestions</CardTitle>
                  <div className="flex gap-1">
                    {(['all', 'critical', 'warning', 'info', 'pass'] as const).map(f => (
                      <button key={f} onClick={() => setFilter(f)}
                        className={`text-[10px] px-2 py-1 rounded-lg font-mono-jarvis cursor-pointer transition-colors ${filter === f ? 'bg-accent text-black' : 'text-muted hover:text-tx'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2.5 max-h-80 overflow-y-auto scrollbar-thin">
                  {filtered.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 bg-surface border border-border rounded-lg">
                      {SEV_ICON[issue.severity]}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-tx">{issue.message}</span>
                          <Badge variant={SEV_BADGE[issue.severity]}>{issue.severity}</Badge>
                        </div>
                        {issue.suggestion && (
                          <div className="text-[11px] text-muted leading-relaxed">{issue.suggestion}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ) : (
            <div className="lg:col-span-3 flex flex-col items-center justify-center h-64 text-center">
              <GraduationCap size={40} className="mb-3 text-muted" strokeWidth={1} />
              <div className="text-sm text-muted">Paste your article and click Grade Content</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
