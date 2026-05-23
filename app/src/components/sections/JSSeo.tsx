import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FileCode2, Loader2, Search, XCircle, AlertCircle, CheckCircle2, Eye, EyeOff, Code2, History } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'
import { cn } from '@/lib/utils'

interface JSSeoRecord {
  id: string; savedAt: string; label: string; sublabel: string
  url: string; result: JSResult
}

interface JSIssue {
  severity: 'critical' | 'warning' | 'pass'
  category: 'Content' | 'Links' | 'Schema' | 'Meta' | 'Rendering'
  element: string
  detail: string
  fix: string
  googleVisible: boolean
}

interface JSResult {
  url: string
  renderScore: number
  ttfb: string
  renderTime: string
  issues: JSIssue[]
  summary: string
}


const SEV_ICON: Record<JSIssue['severity'], React.ReactNode> = {
  critical: <XCircle      size={13} className="text-danger shrink-0 mt-0.5" />,
  warning:  <AlertCircle  size={13} className="text-accent4 shrink-0 mt-0.5" />,
  pass:     <CheckCircle2 size={13} className="text-accent3 shrink-0 mt-0.5" />,
}

const CAT_COLOR: Record<JSIssue['category'], string> = {
  Content: '#00d4ff', Links: '#7c3aed', Schema: '#10b981', Meta: '#f59e0b', Rendering: '#ef4444',
}

type FilterSev = 'all' | JSIssue['severity']

export function JSSeo() {
  const [url,      setUrl]      = useState('casinoexpert.io/best-online-casinos')
  const [result,   setResult]   = useState<JSResult | null>(null)
  const [filter,   setFilter]   = useState<FilterSev>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tab,      setTab]      = useState<'tool' | 'history'>('tool')

  const { records, save, remove, clear } = useHistory<JSSeoRecord>('jarvis_jsseo_history')

  const check = useMutation({
    mutationFn: async () => {
      return callClaude(
        'You are a JavaScript SEO technical expert. Analyse a casino page for JS-rendered content that Googlebot may miss.',
        `Analyse this casino page for JavaScript SEO issues: ${url}

Return JSON:
{
  "url": "${url}",
  "renderScore": 0-100,
  "ttfb": "Xs",
  "renderTime": "Xs",
  "summary": "2-sentence assessment",
  "issues": [
    {
      "severity": "critical|warning|pass",
      "category": "Content|Links|Schema|Meta|Rendering",
      "element": "specific element name",
      "detail": "what is JS-dependent and why it matters for Googlebot",
      "fix": "specific technical fix",
      "googleVisible": false
    }
  ]
}

Include 4-5 critical/warning issues specific to casino affiliate pages (rankings, affiliate links, review schema, pagination) and 3-4 pass items. Focus on iGaming-specific JS SEO risks.`,
        1200,
      )
    },
    onSuccess: (data) => {
      if (data) {
        try {
          const match = data.match(/\{[\s\S]*\}/)
          if (!match) return
          const r = JSON.parse(match[0]) as JSResult
          setResult(r)
          save({ id: crypto.randomUUID(), savedAt: new Date().toISOString(), label: r.url, sublabel: `Score ${r.renderScore}/100 · ${r.issues.filter(i => i.severity === 'critical').length} critical`, url, result: r })
        } catch { /* keep */ }
      }
    },
  })

  const filtered = result?.issues.filter(i => filter === 'all' || i.severity === filter) ?? []
  const critical = result?.issues.filter(i => i.severity === 'critical').length ?? 0
  const warnings = result?.issues.filter(i => i.severity === 'warning').length ?? 0
  const passed   = result?.issues.filter(i => i.severity === 'pass').length ?? 0

  function scoreColor(score: number) {
    return score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444'
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab('tool')} className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer', tab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>JS SEO Checker</button>
        <button onClick={() => setTab('history')} className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer', tab === 'history' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          <History size={11} /> History {records.length > 0 && `(${records.length})`}
        </button>
      </div>
      {tab === 'history' ? (
        <HistoryPanel records={records} onLoad={r => { setUrl(r.url); setResult(r.result); setTab('tool') }} onDelete={remove} onClear={clear} emptyText="No checks saved yet. Run a JS SEO check to save results." />
      ) : (<>
      {/* Input */}
      <Card>
        <CardTitle className="mb-3">JavaScript SEO Checker</CardTitle>
        <p className="text-sm text-muted mb-4 leading-relaxed">
          Detect casino content, affiliate links, and schema markup that only renders after JavaScript execution
          — invisible to Googlebot on first crawl.
        </p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={url} onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && check.mutate()}
              placeholder="yoursite.com/page"
              className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
          </div>
          <Button variant="primary" onClick={() => check.mutate()} disabled={check.isPending}>
            {check.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            {check.isPending ? 'Analysing JS…' : 'Check JS SEO'}
          </Button>
        </div>
        {!isAIReady() && <div className="mt-2 text-[11px] text-muted">Add an AI key in Onboarding.</div>}
      </Card>

      {result && (
        <>
          {/* Score row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'RENDER SCORE', val: `${result.renderScore}/100`, color: scoreColor(result.renderScore) },
              { label: 'CRITICAL',     val: critical,                    color: critical ? '#ef4444' : '#10b981' },
              { label: 'WARNINGS',     val: warnings,                    color: warnings ? '#f59e0b' : '#10b981' },
              { label: 'PASSED',       val: passed,                      color: '#10b981' },
            ].map(s => (
              <Card key={s.label} className="text-center py-4">
                <div className="text-3xl font-display font-black mb-1" style={{ color: s.color }}>{s.val}</div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest">{s.label}</div>
              </Card>
            ))}
          </div>

          {/* Summary */}
          <Card className="bg-linear-to-br from-[#ef444408] to-transparent border-[#ef444430]">
            <div className="flex items-start gap-3">
              <Code2 size={16} className="text-danger mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-sm text-tx mb-1">{result.url}</div>
                <div className="text-xs text-muted leading-relaxed">{result.summary}</div>
                <div className="flex gap-3 mt-2 text-[10px] text-muted font-mono-jarvis">
                  <span>TTFB: {result.ttfb}</span>
                  <span>Full render: {result.renderTime}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Issues */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>JS SEO Issues</CardTitle>
              <div className="flex gap-1">
                {(['all', 'critical', 'warning', 'pass'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg font-mono-jarvis cursor-pointer transition-colors ${filter === f ? 'bg-accent text-black' : 'text-muted hover:text-tx'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {filtered.map((issue, i) => {
                const key = `${i}-${issue.element}`
                const isOpen = expanded === key
                return (
                  <div key={key} className="border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpanded(isOpen ? null : key)}
                      className="w-full flex items-start gap-3 p-3 hover:bg-surface transition-colors cursor-pointer text-left"
                    >
                      {SEV_ICON[issue.severity]}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-xs font-semibold text-tx">{issue.element}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono-jarvis border border-border"
                            style={{ color: CAT_COLOR[issue.category], borderColor: CAT_COLOR[issue.category] + '40' }}>
                            {issue.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted leading-snug line-clamp-1">{issue.detail}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {issue.googleVisible
                          ? <span className="flex items-center gap-1 text-[10px] text-accent3 font-mono-jarvis"><Eye size={10} /> Googlebot sees</span>
                          : <span className="flex items-center gap-1 text-[10px] text-danger font-mono-jarvis"><EyeOff size={10} /> Hidden from bot</span>
                        }
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-border bg-surface space-y-2 pt-3">
                        <div className="text-xs text-muted leading-relaxed">{issue.detail}</div>
                        {issue.fix && (
                          <div className="p-3 bg-[#00d4ff08] border border-[#00d4ff30] rounded-lg">
                            <div className="text-[10px] text-accent font-mono-jarvis tracking-widest mb-1">FIX</div>
                            <div className="text-xs text-tx leading-relaxed">{issue.fix}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}

      {!result && (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <FileCode2 size={40} className="mb-3 text-muted" strokeWidth={1} />
          <div className="text-sm text-muted">Enter your casino page URL to detect JS SEO issues</div>
        </div>
      )}
      </>)}
    </div>
  )
}
