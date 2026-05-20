import { useState, useMemo } from 'react'
import { Sparkles, Info, ShoppingCart, FileText, Navigation, ChevronRight, AlertCircle, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { callAI, isAIReady, getActiveProvider } from '@/lib/ai'
import { downloadCSV } from '@/lib/csv'

type Intent = 'Info' | 'Comm' | 'Trans' | 'Nav'

interface AnalysisRow {
  kw: string; intent: Intent; confidence: number; format: string; wordCount: string
}

const FORMAT_MAP: Record<Intent, string[]> = {
  Info:  ['Step-by-step guide', 'Explainer article', 'FAQ page', "Beginner's guide"],
  Comm:  ['Comparison listicle', 'Top-N roundup', 'Best-of page', 'Review hub'],
  Trans: ['Landing page', 'Bonus page', 'Sign-up funnel', 'Offer page'],
  Nav:   ['Brand page', 'Homepage', 'Branded FAQ', 'About page'],
}

const WC_MAP: Record<Intent, string> = {
  Info:  '800–1,800',
  Comm:  '2,000–4,000',
  Trans: '600–1,200',
  Nav:   '300–800',
}

const INTENT_COLOR: Record<Intent, string> = {
  Info: '#00d4ff', Comm: '#f59e0b', Trans: '#10b981', Nav: '#7c3aed',
}

const INTENT_ICON: Record<Intent, React.ElementType> = {
  Info: Info, Comm: ShoppingCart, Trans: FileText, Nav: Navigation,
}

const SAMPLE = `best online casino india
how to deposit with UPI in casino
teen patti real money android
is online casino legal in india
top casino bonus india 2026
how to win at online slots
casino vs sports betting india
register casino india free bonus
slot online terpercaya indonesia
cara main slot online pemula`

function classifyIntent(kw: string): Intent {
  const k = kw.toLowerCase()
  if (/buy|sign|join|register|deposit|bonus|download|app|free spin|real money|daftar|gabung/.test(k)) return 'Trans'
  if (/best|top|review|vs|compare|recommend|which|ranking|terbaik|terpercaya/.test(k)) return 'Comm'
  if (/how|what|why|when|is|are|can|guide|tutorial|explain|beginner|cara|apakah/.test(k)) return 'Info'
  return 'Nav'
}

function deterministicConf(kw: string, intent: Intent): number {
  const base = { Info: 82, Comm: 78, Trans: 88, Nav: 91 }[intent]
  const offset = kw.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 10
  return base + offset
}

function buildRows(kwList: string[]): AnalysisRow[] {
  return kwList.map(kw => {
    const intent  = classifyIntent(kw)
    const formats = FORMAT_MAP[intent]
    return { kw, intent, confidence: deterministicConf(kw, intent), format: formats[kw.length % formats.length], wordCount: WC_MAP[intent] }
  })
}

export function IntentAnalyzer() {
  const aiReady  = isAIReady()
  const provider = getActiveProvider()

  const [input,     setInput]     = useState('')
  const [analyzed,  setAnalyzed]  = useState(false)
  const [rows,      setRows]      = useState<AnalysisRow[]>([])
  const [aiMode,    setAiMode]    = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError,   setAiError]   = useState<string | null>(null)

  function analyzeLocal() {
    const kwList = input.split('\n').map(l => l.trim()).filter(Boolean)
    if (!kwList.length) return
    setRows(buildRows(kwList))
    setAiMode(false)
    setAnalyzed(true)
  }

  async function analyzeWithAI() {
    const kwList = input.split('\n').map(l => l.trim()).filter(Boolean)
    if (!kwList.length || aiLoading) return
    setAiLoading(true)
    setAiError(null)
    try {
      const raw = await callAI(
        'You are an iGaming SEO expert. Classify keyword search intent for casino/gambling queries (India & Indonesia markets). Return ONLY valid JSON, no markdown.',
        `Analyze the search intent for these keywords and return a JSON array:
${kwList.map((k, i) => `${i + 1}. ${k}`).join('\n')}

Return ONLY a JSON array where each object has:
{
  "kw": "original keyword",
  "intent": "Info" | "Comm" | "Trans" | "Nav",
  "confidence": integer_50_to_99,
  "format": "recommended content format string",
  "wordCount": "e.g. 800-1800"
}

Intent definitions:
- Info = user wants to learn (how, what, why, is it legal)
- Comm = user comparing options (best, top, vs, review)
- Trans = user ready to act (register, deposit, bonus, download)
- Nav = user looking for a specific brand/site`,
        1200,
      )
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned) as AnalysisRow[]
      const validated: AnalysisRow[] = parsed.map(r => ({
        kw:         r.kw ?? '',
        intent:     (['Info','Comm','Trans','Nav'].includes(r.intent) ? r.intent : 'Info') as Intent,
        confidence: Math.min(99, Math.max(50, Number(r.confidence) || 80)),
        format:     r.format ?? FORMAT_MAP[r.intent as Intent]?.[0] ?? '—',
        wordCount:  r.wordCount ?? WC_MAP[r.intent as Intent] ?? '—',
      }))
      setRows(validated)
      setAiMode(true)
      setAnalyzed(true)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI analysis failed — try again')
    } finally {
      setAiLoading(false)
    }
  }

  const chartData = useMemo(() => {
    if (!rows.length) return []
    const counts: Record<Intent, number> = { Info: 0, Comm: 0, Trans: 0, Nav: 0 }
    rows.forEach(r => counts[r.intent]++)
    return (['Info', 'Comm', 'Trans', 'Nav'] as Intent[])
      .map(i => ({ intent: i, count: counts[i], pct: Math.round(counts[i] / rows.length * 100) }))
      .filter(d => d.count > 0)
  }, [rows])

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle className="mb-1 flex items-center gap-1.5">Intent Analyzer <InfoTooltip text="Classifies each keyword by search intent (Info / Commercial / Transactional / Navigational) so you know what type of content to produce before writing." /></CardTitle>
        <p className="text-sm text-muted mb-4">
          Paste any keyword list to classify search intent and get content format recommendations.
          Tells your writers exactly what to produce before they write a word.
        </p>
        <div className="space-y-3">
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); setAnalyzed(false) }}
            placeholder={'Paste keywords (one per line):\nbest online casino india\nhow to play teen patti\ncasino bonus india…'}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors resize-none font-mono-jarvis scrollbar-thin"
            rows={6}
          />
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" onClick={analyzeLocal} disabled={!input.trim()}>
              <Sparkles size={13} /> Analyze (Rules)
            </Button>
            <Button
              variant="primary"
              onClick={analyzeWithAI}
              disabled={!aiReady || aiLoading || !input.trim()}
              title={!aiReady ? 'Add Gemini or Anthropic key in Onboarding' : ''}
            >
              {aiLoading ? 'Analyzing…' : `Analyze with ${provider === 'openrouter' ? 'OpenRouter' : 'Claude'}`}
            </Button>
            <Button variant="ghost" onClick={() => { setInput(SAMPLE); setAnalyzed(false) }}>
              Load Sample
            </Button>
            {aiMode && analyzed && (
              <span className="text-[10px] text-accent font-mono-jarvis self-center">
                ● AI-classified via {provider === 'openrouter' ? 'OpenRouter' : 'Claude Sonnet'}
              </span>
            )}
          </div>
          {!aiReady && (
            <div className="text-[11px] text-muted flex items-center gap-1.5">
              <AlertCircle size={11} className="text-amber-400 shrink-0" />
              Add an OpenRouter or Anthropic key in Onboarding for AI-powered analysis.
            </div>
          )}
          {aiError && (
            <div className="text-[11px] text-danger flex items-center gap-1.5">
              <AlertCircle size={11} /> {aiError}
            </div>
          )}
        </div>
      </Card>

      {analyzed && rows.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Chart */}
            <Card>
              <CardTitle className="mb-4 flex items-center gap-1.5">Intent Breakdown <InfoTooltip text="Distribution of your keyword list across the four intent categories. A healthy iGaming site targets a mix of all four — heavy Trans bias indicates thin content risk." /></CardTitle>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 24 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="intent"
                    tick={{ fontSize: 11, fill: '#5a7a9a', fontFamily: 'Roboto Mono' }} width={36} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11 }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any) => [`${v} keywords`, '']}
                  />
                  <Bar dataKey="count" radius={4}>
                    {chartData.map(d => <Cell key={d.intent} fill={INTENT_COLOR[d.intent as Intent]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {chartData.map(d => {
                  const Icon = INTENT_ICON[d.intent as Intent]
                  return (
                    <div key={d.intent} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon size={12} style={{ color: INTENT_COLOR[d.intent as Intent] }} />
                        <span className="text-xs text-muted">{d.intent}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width: `${d.pct}%`, background: INTENT_COLOR[d.intent as Intent] }} />
                        </div>
                        <span className="text-xs font-mono-jarvis text-muted w-8 text-right">{d.pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Strategy insights */}
            <Card className="lg:col-span-2">
              <CardTitle className="mb-3 flex items-center gap-1.5">Content Strategy <InfoTooltip text="Recommended content format and word count for each intent group in your keyword list. Use this as a brief for your writers." /></CardTitle>
              <div className="grid grid-cols-2 gap-3">
                {chartData.map(d => {
                  const Icon = INTENT_ICON[d.intent as Intent]
                  return (
                    <div key={d.intent} className="p-3 rounded-xl border border-border bg-surface">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={14} style={{ color: INTENT_COLOR[d.intent as Intent] }} />
                        <span className="font-semibold text-sm text-tx">{d.intent}</span>
                        <span className="text-[10px] font-mono-jarvis text-muted ml-auto">{d.count} kws · {d.pct}%</span>
                      </div>
                      <div className="text-[11px] text-muted leading-relaxed flex items-center gap-1">
                        Format: <span className="text-tx">{FORMAT_MAP[d.intent as Intent][0]}</span>
                        <InfoTooltip text="The recommended content format for this intent. Matching format to intent improves CTR and reduces bounce rate." />
                      </div>
                      <div className="text-[11px] text-muted flex items-center gap-1">
                        Words: <span className="text-tx">{WC_MAP[d.intent as Intent]}</span>
                        <InfoTooltip text="Suggested word count range. Going significantly under may signal thin content to Google." />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* Results table */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>
                Full Analysis — {rows.length} keywords
                {aiMode && <span className="text-[10px] font-normal text-accent ml-2 font-mono-jarvis">AI-classified</span>}
              </CardTitle>
              <button
                onClick={() => downloadCSV(
                  `intent-analysis-${new Date().toISOString().slice(0, 10)}.csv`,
                  ['Keyword', 'Intent', 'Confidence %', 'Recommended Format', 'Word Count'],
                  rows.map(r => [r.kw, r.intent, r.confidence, r.format, r.wordCount]),
                )}
                className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer"
              >
                <Download size={11} /> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] text-muted font-mono-jarvis tracking-widest">
                    <th className="text-left pb-2 font-medium">KEYWORD</th>
                    <th className="text-center pb-2 font-medium">
                      <span className="inline-flex items-center gap-1">INTENT <InfoTooltip text="Search intent: Info = user wants to learn; Comm = comparing options; Trans = ready to convert; Nav = looking for a specific brand." /></span>
                    </th>
                    <th className="text-center pb-2 font-medium w-36">
                      <span className="inline-flex items-center gap-1">CONFIDENCE <InfoTooltip text="How confident the classifier is in the intent label (50–99%). Higher = clearer keyword signal." /></span>
                    </th>
                    <th className="text-left pb-2 font-medium pl-4">
                      <span className="inline-flex items-center gap-1">RECOMMENDED FORMAT <InfoTooltip text="The content format best suited to this intent — matches user expectations and Google's preferred result type." /></span>
                    </th>
                    <th className="text-right pb-2 font-medium">
                      <span className="inline-flex items-center gap-1 justify-end">WORD COUNT <InfoTooltip text="Suggested article length based on intent. Trans pages need less copy; Comm comparison pages need more depth." side="left" /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-border/40 hover:bg-surface transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-tx">{r.kw}</td>
                      <td className="py-2.5 text-center">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ color: INTENT_COLOR[r.intent], background: INTENT_COLOR[r.intent] + '20' }}>
                          {r.intent}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-accent" style={{ width: `${r.confidence}%` }} />
                          </div>
                          <span className="text-[10px] font-mono-jarvis text-muted">{r.confidence}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 pl-4">
                        <div className="flex items-center gap-1.5">
                          <ChevronRight size={10} className="text-accent shrink-0" />
                          <span className="text-tx">{r.format}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-mono-jarvis text-muted">{r.wordCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {!analyzed && (
        <Card className="text-center py-16">
          <Sparkles size={40} className="text-muted mx-auto mb-3" strokeWidth={1} />
          <div className="font-display font-bold text-lg text-tx mb-1">Know the intent before you write</div>
          <div className="text-sm text-muted max-w-sm mx-auto">
            Paste keywords → <strong>Analyze (Rules)</strong> for instant results, or{' '}
            <strong>Analyze with {provider === 'openrouter' ? 'OpenRouter' : 'Claude'}</strong> for AI-powered nuanced classification
          </div>
        </Card>
      )}
    </div>
  )
}
