import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Monitor, Smartphone, Zap, Brain, Wrench, Search, AlertCircle, Key } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type Device = 'mobile' | 'desktop'

interface PsiAudit {
  score: number | null
  title: string
  description: string
  displayValue?: string
  numericValue?: number
  details?: { overallSavingsMs?: number; overallSavingsBytes?: number }
}

interface PsiResponse {
  lighthouseResult: {
    categories: { performance: { score: number } }
    audits: Record<string, PsiAudit>
  }
}

interface Metrics {
  score: number
  lcp: number   // seconds
  tbt: number   // ms
  cls: number
  fcp: number   // seconds
  si: number    // seconds
  ttfb: number  // ms
}

interface Opportunity {
  id: string
  title: string
  description: string
  savingsMs: number
  savingsKb: number
  displayValue: string
  score: number
}

interface AuditResult {
  url: string
  device: Device
  metrics: Metrics
  opportunities: Opportunity[]
  fetchedAt: string
}

const OPP_AUDIT_IDS = [
  'render-blocking-resources',
  'unused-javascript',
  'unused-css-rules',
  'uses-optimized-images',
  'uses-webp-images',
  'efficiently-encode-images',
  'uses-responsive-images',
  'offscreen-images',
  'uses-text-compression',
  'server-response-time',
  'unminified-javascript',
  'unminified-css',
  'uses-long-cache-ttl',
  'total-byte-weight',
  'dom-size',
]

function parsePsi(data: PsiResponse, device: Device, url: string): AuditResult {
  const audits = data.lighthouseResult.audits
  const score  = Math.round((data.lighthouseResult.categories.performance.score ?? 0) * 100)

  function ms(id: string)  { return Math.round(audits[id]?.numericValue ?? 0) }
  function sec(id: string) { return Math.round((audits[id]?.numericValue ?? 0) / 10) / 100 }

  const metrics: Metrics = {
    score,
    lcp:  sec('largest-contentful-paint'),
    tbt:  ms('total-blocking-time'),
    cls:  Math.round((audits['cumulative-layout-shift']?.numericValue ?? 0) * 100) / 100,
    fcp:  sec('first-contentful-paint'),
    si:   sec('speed-index'),
    ttfb: ms('server-response-time'),
  }

  const opportunities: Opportunity[] = OPP_AUDIT_IDS
    .map(id => {
      const a = audits[id]
      if (!a || a.score === 1 || a.score === null) return null
      return {
        id,
        title:        a.title,
        description:  a.description,
        savingsMs:    Math.round(a.details?.overallSavingsMs ?? 0),
        savingsKb:    Math.round((a.details?.overallSavingsBytes ?? 0) / 1024),
        displayValue: a.displayValue ?? '',
        score:        a.score,
      }
    })
    .filter((o): o is Opportunity => o !== null)
    .sort((a, b) => {
      const aVal = a.savingsMs || a.savingsKb * 2
      const bVal = b.savingsMs || b.savingsKb * 2
      return bVal - aVal
    })

  return { url, device, metrics, opportunities, fetchedAt: new Date().toLocaleTimeString() }
}

async function runPsi(url: string, strategy: Device, apiKey: string): Promise<AuditResult> {
  const normalized = url.startsWith('http') ? url : `https://${url}`
  const res = await fetch(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(normalized)}&strategy=${strategy}&key=${apiKey}`
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `HTTP ${res.status}`)
  }
  return parsePsi(await res.json() as PsiResponse, strategy, normalized)
}

function ScoreRing({ score }: { score: number }) {
  const r = 50, circ = 2 * Math.PI * r
  const color = score >= 90 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-border)" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ}
        strokeLinecap="round" transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="60" y="55" textAnchor="middle" fill={color} style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Syne' }}>{score}</text>
      <text x="60" y="73" textAnchor="middle" fill="var(--color-muted)" style={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}>/100</text>
    </svg>
  )
}

function Metric({ label, val, unit, target, good }: { label: string; val: number; unit: string; target: number; good: boolean }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3 text-center">
      <div className="text-[10px] tracking-widest text-muted font-mono-jarvis mb-1">{label}</div>
      <div className={cn('text-xl font-display font-black', good ? 'text-accent3' : 'text-danger')}>{val}{unit}</div>
      <div className="text-[10px] text-muted mt-0.5">target &lt;{target}{unit}</div>
    </div>
  )
}

function savingsLabel(opp: Opportunity): string {
  if (opp.savingsMs >= 100) return opp.savingsMs >= 1000 ? `${(opp.savingsMs / 1000).toFixed(1)}s saved` : `${opp.savingsMs}ms saved`
  if (opp.savingsKb > 0)   return `${opp.savingsKb} KB saved`
  return opp.displayValue || 'Fix needed'
}

function savingsShort(opp: Opportunity): string {
  if (opp.savingsMs >= 1000) return `${(opp.savingsMs / 1000).toFixed(1)}s`
  if (opp.savingsMs >= 100)  return `${opp.savingsMs}ms`
  if (opp.savingsKb > 0)     return `${opp.savingsKb}KB`
  return '!'
}

export function Technical() {
  const { domain, psiKey } = useStore()
  const [inputUrl, setInputUrl] = useState(domain || '')
  const [device,   setDevice]   = useState<Device>('mobile')
  const [result,   setResult]   = useState<AuditResult | null>(null)
  const [aiRec,    setAiRec]    = useState('')

  const audit = useMutation({
    mutationFn: () => runPsi(inputUrl, device, psiKey),
    onSuccess: (data) => { setResult(data); setAiRec('') },
  })

  const getAI = useMutation({
    mutationFn: () => {
      if (!result) throw new Error('no data')
      const m = result.metrics
      return callClaude(
        'You are a Core Web Vitals and technical SEO expert.',
        `Site: ${result.url} — ${result.device} PageSpeed audit:
Score: ${m.score}/100 | LCP: ${m.lcp}s | TBT: ${m.tbt}ms | CLS: ${m.cls} | FCP: ${m.fcp}s | TTFB: ${m.ttfb}ms

Top failing opportunities:
${result.opportunities.slice(0, 5).map(o => `- ${o.title}: ${o.displayValue}`).join('\n')}

Give the 3 highest-impact fixes ordered by effort-to-impact ratio.
Format: **Fix:** description | **Impact:** +X points | **Effort:** Low/Med/High
Be direct and technical.`,
        600,
      )
    },
    onSuccess: setAiRec,
  })

  const m = result?.metrics
  const passing = m ? [m.lcp <= 2.5, m.tbt <= 200, m.cls <= 0.1, m.fcp <= 1.8, m.si <= 3.4].filter(Boolean).length : 0

  return (
    <div className="space-y-5">

      {/* URL input + controls */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !audit.isPending && inputUrl && psiKey && audit.mutate()}
            placeholder="https://example.com"
            className="flex-1 bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx font-mono-jarvis outline-none focus:border-accent transition-colors"
          />
          <div className="flex gap-2 shrink-0">
            <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl">
              {(['mobile', 'desktop'] as Device[]).map(dev => (
                <button key={dev} onClick={() => setDevice(dev)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                    device === dev ? 'bg-accent text-black' : 'text-muted hover:text-tx'
                  )}
                >
                  {dev === 'mobile' ? <Smartphone size={12} /> : <Monitor size={12} />}
                  {dev.charAt(0).toUpperCase() + dev.slice(1)}
                </button>
              ))}
            </div>
            <Button variant="primary" onClick={() => audit.mutate()} disabled={audit.isPending || !inputUrl || !psiKey}>
              {audit.isPending ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              {audit.isPending ? 'Auditing…' : 'Run Audit'}
            </Button>
          </div>
        </div>
        {!psiKey && (
          <div className="flex items-center gap-2 mt-3 text-xs text-amber-400">
            <Key size={12} />
            No PageSpeed Insights API key — add it in Settings to enable audits.
          </div>
        )}
        {audit.isError && (
          <div className="flex items-center gap-2 mt-3 text-xs text-danger">
            <AlertCircle size={12} />
            {(audit.error as Error).message}
          </div>
        )}
      </Card>

      {/* Loading state */}
      {audit.isPending && (
        <Card className="flex flex-col items-center justify-center py-16">
          <Loader2 size={32} className="text-accent animate-spin mb-3" />
          <div className="text-sm font-semibold text-tx mb-1">Running {device} audit…</div>
          <div className="text-xs text-muted">{inputUrl} · this takes 10–20 seconds</div>
        </Card>
      )}

      {/* Empty state */}
      {!result && !audit.isPending && (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Zap size={32} className="text-muted mb-3" />
          <div className="text-sm font-semibold text-tx mb-1">Run a PageSpeed Audit</div>
          <div className="text-xs text-muted max-w-xs">
            Enter any URL and click Run Audit to get real Core Web Vitals, a performance score, and actionable fixes from Google PageSpeed Insights.
          </div>
        </Card>
      )}

      {/* Results */}
      {result && !audit.isPending && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Score ring */}
            <Card className="lg:col-span-1 flex flex-col items-center justify-center gap-3 py-6">
              <ScoreRing score={result.metrics.score} />
              <div className="text-sm font-semibold text-tx">Performance Score</div>
              <div className="text-[11px] text-muted font-mono-jarvis text-center">
                {result.device} · {result.url.replace(/^https?:\/\//, '').split('/')[0]}<br />
                <span className="opacity-60">audited {result.fetchedAt}</span>
              </div>
            </Card>

            {/* Core Web Vitals */}
            <Card className="lg:col-span-2">
              <CardTitle className="mb-4 flex items-center gap-2">
                <Zap size={15} className="text-accent" /> Core Web Vitals
              </CardTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <Metric label="LCP" val={result.metrics.lcp}  unit="s"  target={2.5} good={result.metrics.lcp  <= 2.5} />
                <Metric label="TBT" val={result.metrics.tbt}  unit="ms" target={200} good={result.metrics.tbt  <= 200} />
                <Metric label="CLS" val={result.metrics.cls}  unit=""   target={0.1} good={result.metrics.cls  <= 0.1} />
                <Metric label="FCP" val={result.metrics.fcp}  unit="s"  target={1.8} good={result.metrics.fcp  <= 1.8} />
                <Metric label="SI"  val={result.metrics.si}   unit="s"  target={3.4} good={result.metrics.si   <= 3.4} />
                <div className="bg-surface border border-border rounded-xl p-3 text-center">
                  <div className="text-[10px] tracking-widest text-muted font-mono-jarvis mb-1">PASSING</div>
                  <div className="text-xl font-display font-black text-accent">{passing}/5</div>
                  <div className="text-[10px] text-muted mt-0.5">vitals</div>
                </div>
              </div>

              {aiRec ? (
                <div className="bg-linear-to-br from-[#7c3aed10] to-transparent border border-[#7c3aed30] rounded-xl p-4 text-xs text-tx leading-relaxed whitespace-pre-wrap">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#a78bfa] font-mono-jarvis tracking-widest mb-2">
                    <Brain size={11} /> AI RECOMMENDATIONS
                  </div>
                  {aiRec}
                </div>
              ) : (
                <Button variant="primary" onClick={() => getAI.mutate()} disabled={getAI.isPending || !isAIReady()}>
                  {getAI.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                  {getAI.isPending ? 'Analyzing…' : 'Get AI Fix Priorities'}
                </Button>
              )}
            </Card>
          </div>

          {/* Opportunities */}
          <Card>
            <CardTitle className="mb-4 flex items-center gap-2">
              <Wrench size={15} className="text-accent" />
              Opportunities
              {result.opportunities.length > 0 && (
                <span className="text-xs text-muted font-normal">({result.opportunities.length} found)</span>
              )}
            </CardTitle>

            {result.opportunities.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-sm font-semibold text-accent3 mb-1">No major issues found</div>
                <div className="text-xs text-muted">This page is well optimized for {result.device}.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {result.opportunities.map(opp => (
                  <div key={opp.id} className="flex items-start gap-4 p-4 bg-surface rounded-xl border border-border hover:border-accent transition-colors">
                    <div className="w-12 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-[10px] font-display font-black text-accent shrink-0 text-center leading-tight px-1">
                      {savingsShort(opp)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-tx">{opp.title}</div>
                      <div className="text-[11px] text-muted mt-0.5 line-clamp-2">{opp.description}</div>
                    </div>
                    <Badge variant={opp.score !== null && opp.score < 0.5 ? 'red' : 'amber'}>
                      {savingsLabel(opp)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
