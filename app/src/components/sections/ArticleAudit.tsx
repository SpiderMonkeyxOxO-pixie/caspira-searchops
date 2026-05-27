import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Loader2, Download, RefreshCw, CheckCircle2, AlertCircle,
  Heading1, FileText, Link2, Zap, Search, AlignLeft,
  ClipboardList, Image, ShieldCheck, ExternalLink, History,
} from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'
import { cn } from '@/lib/utils'

/* ── Types ─────────────────────────────────────────────────────────── */

interface CheckItem {
  label: string
  score: number
  max: number
  status: 'Good' | 'Needs Work'
  note: string
}

interface Recommendation {
  priority: 'High' | 'Medium' | 'Low'
  title: string
  detail: string
}

interface AuditResult {
  score: number
  status: 'Good' | 'Needs Work' | 'Poor'
  checklist: CheckItem[]
  recommendations: Recommendation[]
}

interface AuditRecord {
  id: string
  savedAt: string
  label: string
  sublabel: string
  mode: string
  keyword: string
  result: AuditResult
}

/* ── Constants ─────────────────────────────────────────────────────── */

const CHECKLIST_ICONS: Record<string, React.ReactNode> = {
  'Title / H1':                       <Heading1   size={14} />,
  'Meta Title & Description':          <FileText   size={14} />,
  'URL Slug':                          <Link2      size={14} />,
  'Introduction':                      <Zap        size={14} />,
  'Keyword Usage':                     <Search     size={14} />,
  'Heading Structure':                 <AlignLeft  size={14} />,
  'Content Helpfulness':               <ClipboardList size={14} />,
  'Grammar, Redundancy & Repetition':  <FileText   size={14} />,
  'Internal / External Links':         <ExternalLink size={14} />,
  'Images & Alt Text':                 <Image      size={14} />,
  'Trust & Accuracy':                  <ShieldCheck size={14} />,
}

const PRIORITY_COLOR: Record<string, string> = {
  High:   'bg-danger/10 text-danger border-danger/20',
  Medium: 'bg-accent4/10 text-accent4 border-accent4/20',
  Low:    'bg-border text-muted border-border',
}

const SYSTEM_PROMPT = `You are Jarvis SEO Article Auditor, an expert SEO content editor and article quality evaluator.

Your job is to review one article and return a structured audit report with scoring, issues, recommendations, and revision guidance.

You must evaluate the article for:
- SEO article structure
- Title and heading quality
- Keyword usage
- Search intent match
- Introduction quality
- Content helpfulness
- Grammar
- Redundancy
- Repetitive words
- Repeated ideas
- Readability
- Internal and external link quality
- Image and alt text quality
- Trust, safety, and accuracy
- Risky or exaggerated claims
- Publishing readiness

Important writing rules:
- Be practical and direct.
- Do not give generic advice.
- Do not say "good job" unless it is useful.
- Do not claim the article will rank.
- Do not invent facts that are not in the article.
- Do not recommend adding claims unless they are safe and verifiable.
- Keep recommendations actionable.
- If the article is about gaming, casino, lottery, earning apps, or money-related topics, flag risky claims such as guaranteed income, guaranteed win, risk-free earning, instant withdrawal promise, or misleading bonus claims.
- Focus on reader-first quality, not only keyword usage.

Scoring must be strict but fair.

Return only valid JSON.
Do not include markdown.
Do not include explanations outside the JSON.`

/* ── Score ring ────────────────────────────────────────────────────── */

function ScoreRing({ score }: { score: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  const dash = (score / 100) * c
  const color = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444'
  return (
    <svg width="120" height="120" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={r} fill="none" stroke="var(--color-border)" strokeWidth="10" />
      <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        transform="rotate(-90 65 65)" />
      <text x="65" y="61" textAnchor="middle" fontSize="28" fontWeight="900" fill={color} fontFamily="Roboto">{score}</text>
      <text x="65" y="77" textAnchor="middle" fontSize="10" fill="var(--color-muted)" fontFamily="Roboto Mono">/ 100 Score</text>
    </svg>
  )
}

/* ── Checklist card ────────────────────────────────────────────────── */

function CheckCard({ item }: { item: CheckItem }) {
  const pct = (item.score / item.max) * 100
  const isGood = item.status === 'Good'
  return (
    <div className="bg-bg border border-border rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-muted shrink-0">
            {CHECKLIST_ICONS[item.label] ?? <FileText size={14} />}
          </div>
          <span className="text-xs font-semibold text-tx leading-tight">{item.label}</span>
        </div>
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
          isGood ? 'bg-accent3/10 text-accent3' : 'bg-accent4/10 text-accent4')}>
          {item.status}
        </span>
      </div>
      <div className="text-[11px] font-semibold" style={{ color: isGood ? '#10b981' : '#f59e0b' }}>
        {item.score}/{item.max} points
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-tx transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-muted leading-relaxed">{item.note}</p>
    </div>
  )
}

/* ── Main component ────────────────────────────────────────────────── */

export function ArticleAudit() {
  const [tab, setTab]           = useState<'tool' | 'history'>('tool')
  const [mode, setMode]         = useState<'pre' | 'post'>('pre')
  const [docsUrl, setDocsUrl]   = useState('')
  const [pubUrl, setPubUrl]     = useState('')
  const [keyword, setKeyword]   = useState('')
  const [audience, setAudience] = useState('')
  const [type, setType]         = useState('')
  const [content, setContent]   = useState('')
  const [result, setResult]     = useState<AuditResult | null>(null)
  const [fixed, setFixed]       = useState<Set<number>>(new Set())
  const [error, setError]       = useState<string | null>(null)

  const { records, save, remove, clear } = useHistory<AuditRecord>('jarvis_article_audit_history')

  const runAudit = useMutation({
    mutationFn: async () => {
      const userMsg = `Audit Mode: ${mode === 'pre' ? 'Pre-Publish' : 'Post-Publish'}
Google Docs URL: ${docsUrl || 'N/A'}
Published URL: ${pubUrl || 'N/A'}
Target Keyword: ${keyword || 'N/A'}
Audience: ${audience || 'N/A'}
Article Type: ${type || 'N/A'}

ARTICLE CONTENT:
${content.slice(0, 4000) || '[No content provided — evaluate based on available metadata only]'}

Return this exact JSON structure (no markdown, no extra text):
{
  "score": <0-100 integer>,
  "status": "<Good|Needs Work|Poor>",
  "checklist": [
    { "label": "Title / H1", "score": <0-10>, "max": 10, "status": "<Good|Needs Work>", "note": "<specific 1-sentence finding>" },
    { "label": "Meta Title & Description", "score": <0-10>, "max": 10, "status": "<Good|Needs Work>", "note": "<specific 1-sentence finding>" },
    { "label": "URL Slug", "score": <0-5>, "max": 5, "status": "<Good|Needs Work>", "note": "<specific 1-sentence finding>" },
    { "label": "Introduction", "score": <0-10>, "max": 10, "status": "<Good|Needs Work>", "note": "<specific 1-sentence finding>" },
    { "label": "Keyword Usage", "score": <0-10>, "max": 10, "status": "<Good|Needs Work>", "note": "<specific 1-sentence finding>" },
    { "label": "Heading Structure", "score": <0-10>, "max": 10, "status": "<Good|Needs Work>", "note": "<specific 1-sentence finding>" },
    { "label": "Content Helpfulness", "score": <0-15>, "max": 15, "status": "<Good|Needs Work>", "note": "<specific 1-sentence finding>" },
    { "label": "Grammar, Redundancy & Repetition", "score": <0-10>, "max": 10, "status": "<Good|Needs Work>", "note": "<specific 1-sentence finding>" },
    { "label": "Internal / External Links", "score": <0-10>, "max": 10, "status": "<Good|Needs Work>", "note": "<specific 1-sentence finding>" },
    { "label": "Images & Alt Text", "score": <0-5>, "max": 5, "status": "<Good|Needs Work>", "note": "<specific 1-sentence finding>" },
    { "label": "Trust & Accuracy", "score": <0-5>, "max": 5, "status": "<Good|Needs Work>", "note": "<specific 1-sentence finding>" }
  ],
  "recommendations": [
    { "priority": "<High|Medium|Low>", "title": "<short action title>", "detail": "<1-sentence specific instruction>" }
  ]
}`
      return callClaude(SYSTEM_PROMPT, userMsg, 4000)
    },
    onSuccess: (data) => {
      if (!data) { setError('No response received. Check your API key in Onboarding.'); return }
      try {
        const cleaned = data.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
        const match = cleaned.match(/\{[\s\S]*\}/)
        if (!match) { setError('AI returned an unexpected format. Try again.'); return }
        const parsed = JSON.parse(match[0]) as AuditResult
        setResult(parsed)
        setError(null)
        setFixed(new Set())
        save({
          id: crypto.randomUUID(),
          savedAt: new Date().toISOString(),
          label: keyword || 'Article Audit',
          sublabel: `Score: ${parsed.score}/100 · ${parsed.status} · ${mode === 'pre' ? 'Pre-Publish' : 'Post-Publish'}`,
          mode: mode === 'pre' ? 'Pre-Publish' : 'Post-Publish',
          keyword,
          result: parsed,
        })
      } catch (e) {
        console.error('[ArticleAudit] parse error:', e, '\nRaw response:', data)
        setError('Failed to parse AI response. Try again.')
      }
    },
    onError: (e: Error) => {
      setError(e.message || 'AI call failed. Check your API key in Onboarding.')
    },
  })

  function exportReport() {
    if (!result) return
    const lines: string[] = [
      `# Article SEO Audit Report`,
      `**Mode:** ${mode === 'pre' ? 'Pre-Publish' : 'Post-Publish'}`,
      `**Keyword:** ${keyword}`,
      `**Score:** ${result.score}/100 — ${result.status}`,
      '',
      '## Checklist',
      ...result.checklist.map(c => `- **${c.label}** ${c.score}/${c.max} (${c.status}): ${c.note}`),
      '',
      '## Recommendations',
      ...result.recommendations.map(r => `- [${r.priority}] **${r.title}**: ${r.detail}`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `article-audit-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const passed    = result?.checklist.filter(c => c.status === 'Good').length ?? 0
  const needsWork = result?.checklist.filter(c => c.status === 'Needs Work').length ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-muted font-mono-jarvis tracking-widest">SEO Article Audit Tool</span>
            </div>
            <h1 className="font-display font-black text-2xl text-tx mb-1">Article SEO Scoring Dashboard</h1>
            <p className="text-xs text-muted leading-relaxed max-w-xl">
              Audit unpublished Google Docs drafts before publishing, then audit the live site URL after publishing.
              The tool checks SEO quality, grammar, readability, redundancy, repetition, links, images, and recommendations.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" onClick={exportReport} disabled={!result} className="flex items-center gap-1.5 text-xs">
              <Download size={13} /> Export Report
            </Button>
            <Button variant="primary" onClick={() => runAudit.mutate()} disabled={runAudit.isPending} className="flex items-center gap-1.5 text-xs">
              {runAudit.isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {runAudit.isPending ? 'Auditing…' : 'Run Audit'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab('tool')}
          className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
            tab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          Audit Tool
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
          onLoad={r => { setKeyword(r.keyword); setResult(r.result); setFixed(new Set()); setTab('tool') }}
          onDelete={remove}
          onClear={clear}
          emptyText="No audit history yet. Run your first audit to save results."
        />
      ) : (
        <>
          {/* Input + Result row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Input panel */}
            <Card className="lg:col-span-2 space-y-3">
              <CardTitle>Audit Input</CardTitle>

              {/* Mode toggle */}
              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">AUDIT MODE</div>
                <div className="flex p-1 bg-bg border border-border rounded-lg w-fit gap-1">
                  {(['pre', 'post'] as const).map(m => (
                    <button key={m} onClick={() => setMode(m)}
                      className={cn('px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                        mode === m ? 'bg-tx text-bg' : 'text-muted hover:text-tx')}>
                      {m === 'pre' ? 'Pre-Publish' : 'Post-Publish'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Google Docs Link */}
              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">GOOGLE DOCS LINK</div>
                <input value={docsUrl} onChange={e => setDocsUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/…"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
              </div>

              {/* Published URL */}
              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">PUBLISHED ARTICLE URL</div>
                <input value={pubUrl} onChange={e => setPubUrl(e.target.value)}
                  placeholder="https://example.com/article-slug/"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
              </div>

              {/* Keyword */}
              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">TARGET KEYWORD</div>
                <input value={keyword} onChange={e => setKeyword(e.target.value)}
                  placeholder="e.g. online casino safety checklist"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
              </div>

              {/* Audience + Type */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">AUDIENCE</div>
                  <input value={audience} onChange={e => setAudience(e.target.value)}
                    placeholder="e.g. India"
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
                </div>
                <div>
                  <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">TYPE</div>
                  <input value={type} onChange={e => setType(e.target.value)}
                    placeholder="e.g. Checklist Guide"
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
                </div>
              </div>

              {/* Article Content */}
              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">ARTICLE CONTENT</div>
                <textarea value={content} onChange={e => setContent(e.target.value)} rows={8}
                  placeholder="Paste the full article text here for a complete audit…"
                  className="w-full bg-surface border border-border rounded-lg p-3 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors resize-none scrollbar-thin" />
              </div>

              {!isAIReady() && <div className="text-[10px] text-muted">Add an AI key in Onboarding.</div>}
            </Card>

            {/* Result panel */}
            <div className="lg:col-span-3">
              {error && result && (
                <div className="mb-3 flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger">
                  <AlertCircle size={13} className="shrink-0" /> {error}
                </div>
              )}
              {result ? (
                <Card>
                  <CardTitle className="mb-2">Audit Result</CardTitle>
                  <div className="text-[11px] text-muted font-mono-jarvis space-y-0.5 mb-3">
                    <div>Mode: <span className="text-tx">{mode === 'pre' ? 'Pre-Publish' : 'Post-Publish'}</span></div>
                    {docsUrl && <div>Google Docs checked: <span className="text-accent truncate">{docsUrl}</span></div>}
                    {pubUrl  && <div>Published URL checked: <span className="text-accent truncate">{pubUrl}</span></div>}
                    {keyword && <div>Keyword: <span className="text-tx">{keyword}</span></div>}
                  </div>

                  <div className="flex items-center gap-6 mb-3">
                    <ScoreRing score={result.score} />
                    <div className="grid grid-cols-3 gap-3 flex-1">
                      <div className="bg-accent3/5 border border-accent3/20 rounded-xl p-3 text-center">
                        <div className="font-display font-black text-2xl text-accent3">{passed}</div>
                        <div className="text-[10px] text-muted mt-0.5">Passed Checks</div>
                      </div>
                      <div className="bg-accent4/5 border border-accent4/20 rounded-xl p-3 text-center">
                        <div className="font-display font-black text-2xl text-accent4">{needsWork}</div>
                        <div className="text-[10px] text-muted mt-0.5">Needs Work</div>
                      </div>
                      <div className="bg-surface border border-border rounded-xl p-3 text-center">
                        <div className="font-display font-black text-xl text-tx">{result.status}</div>
                        <div className="text-[10px] text-muted mt-0.5">Article Status</div>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="flex flex-col items-center justify-center text-center min-h-48">
                  {error ? (
                    <>
                      <AlertCircle size={36} className="mb-3 text-danger" strokeWidth={1.5} />
                      <div className="text-sm font-semibold text-danger mb-1">Audit Failed</div>
                      <div className="text-xs text-muted max-w-xs leading-relaxed">{error}</div>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={40} className="mb-3 text-muted" strokeWidth={1} />
                      <div className="text-sm text-muted">Fill in the inputs and click Run Audit</div>
                      <div className="text-xs text-muted mt-1">Results will appear here after analysis</div>
                    </>
                  )}
                </Card>
              )}
            </div>
          </div>

          {/* Checklist Evaluation */}
          {result && (
            <Card>
              <CardTitle className="mb-4">Checklist Evaluation</CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.checklist.map(item => (
                  <CheckCard key={item.label} item={item} />
                ))}
              </div>
            </Card>
          )}

          {/* Recommendations */}
          {result && result.recommendations.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={16} className="text-accent4" />
                <CardTitle>Recommendations</CardTitle>
              </div>
              <div className="space-y-2.5">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className={cn(
                    'flex items-start justify-between gap-4 p-4 rounded-xl border transition-all',
                    fixed.has(i) ? 'opacity-40 bg-surface' : 'bg-bg border-border'
                  )}>
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 mt-0.5', PRIORITY_COLOR[rec.priority])}>
                        {rec.priority}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-tx mb-0.5">{rec.title}</div>
                        <div className="text-[11px] text-muted leading-relaxed">{rec.detail}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setFixed(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s })}
                      className={cn(
                        'text-[11px] font-semibold px-3 py-1.5 rounded-lg border shrink-0 cursor-pointer transition-all',
                        fixed.has(i)
                          ? 'bg-accent3/10 text-accent3 border-accent3/20'
                          : 'bg-surface border-border text-muted hover:text-tx hover:border-accent'
                      )}>
                      {fixed.has(i) ? '✓ Fixed' : 'Mark Fixed'}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
