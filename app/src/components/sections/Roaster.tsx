import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Flame, Search, Thermometer, Skull, Zap, History } from 'lucide-react'
import { callAI, isAIReady } from '@/lib/ai'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'
import { cn } from '@/lib/utils'

type Intensity = 'mild' | 'medium' | 'savage'

const INTENSITY: Record<Intensity, { label: string; color: string; Icon: React.ElementType; tip: string }> = {
  mild:   { label: 'Mild',   color: '#f59e0b', Icon: Thermometer, tip: 'Constructive feedback — candid about issues but focused on actionable improvements.' },
  medium: { label: 'Medium', color: '#ef8c34', Icon: Flame,       tip: 'Direct and honest roast with sharp iGaming-specific observations and no fluff.' },
  savage: { label: 'Savage', color: '#ef4444', Icon: Skull,       tip: 'Maximum aggression — brutally funny, painfully specific casino SEO takedowns with gambling analogies.' },
}

interface RoastResult {
  score: number
  headline: string
  sections: { title: string; rating: number; roast: string; fix: string }[]
}

interface RoasterRecord {
  id: string
  savedAt: string
  label: string
  sublabel: string
  url: string
  intensity: Intensity
  result: RoastResult
}

function RatingBar({ rating }: { rating: number }) {
  const color = rating >= 7 ? '#10b981' : rating >= 4 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${rating * 10}%`, background: color }} />
      </div>
      <span className="font-mono-jarvis text-[11px] font-bold" style={{ color }}>{rating}/10</span>
    </div>
  )
}

export function Roaster() {
  const { domain, setSection } = useStore()
  const [url, setUrl] = useState(domain || '')
  const [intensity, setIntensity] = useState<Intensity>('medium')
  const [result, setResult] = useState<RoastResult | null>(null)
  const [raw, setRaw] = useState('')
  const [tab, setTab] = useState<'tool' | 'history'>('tool')
  const aiReady = isAIReady()

  const { records, save, remove, clear } = useHistory<RoasterRecord>('jarvis_roaster_history')

  const roast = useMutation({
    mutationFn: () => {
      setResult(null)
      setRaw('')
      return callAI(
        `You are a brutally honest iGaming SEO critic specialising in online casino affiliate sites. Intensity: ${intensity.toUpperCase()}.
${intensity === 'savage' ? 'Be savage, funny, and painfully specific. Use sharp gambling analogies.' : intensity === 'medium' ? 'Be direct and honest with sharp iGaming observations.' : 'Be constructive but candid about casino SEO issues.'}`,
        `Roast the SEO of this online casino/gambling affiliate site: ${url || domain || 'yoursite.com'}

Return a JSON object (no markdown):
{
  "score": <0-100>,
  "headline": "<one brutal/honest opening line specific to casino SEO>",
  "sections": [
    {"title":"Title Tags","rating":<1-10>,"roast":"<casino-specific critique>","fix":"<specific fix>"},
    {"title":"Page Speed","rating":<1-10>,"roast":"<critique>","fix":"<specific fix>"},
    {"title":"E-E-A-T Signals","rating":<1-10>,"roast":"<YMYL/gambling EEAT critique>","fix":"<specific fix>"},
    {"title":"Bonus Page SEO","rating":<1-10>,"roast":"<bonus page structure critique>","fix":"<specific fix>"},
    {"title":"Backlink Profile","rating":<1-10>,"roast":"<gambling niche link critique>","fix":"<specific fix>"},
    {"title":"Schema Markup","rating":<1-10>,"roast":"<review/FAQ schema critique>","fix":"<specific fix>"}
  ]
}`,
        1200,
      )
    },
    onSuccess: (data) => {
      try {
        const cleaned = data.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const match   = cleaned.match(/\{[\s\S]*\}/)
        if (match) {
          const parsed = JSON.parse(match[0]) as RoastResult
          setResult(parsed)
          save({
            id: crypto.randomUUID(),
            savedAt: new Date().toISOString(),
            label: url || domain || 'yoursite.com',
            sublabel: `${INTENSITY[intensity].label} · Score: ${parsed.score}/100`,
            url,
            intensity,
            result: parsed,
          })
        } else setRaw(data)
      } catch { setRaw(data) }
    },
  })

  const scoreColor = (s: number) => s >= 70 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab('tool')}
          className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
            tab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          Roaster
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
          onLoad={r => { setUrl(r.url); setIntensity(r.intensity); setResult(r.result); setRaw(''); setTab('tool') }}
          onDelete={remove}
          onClear={clear}
          emptyText="No roast history yet. Run the roaster to save results."
        />
      ) : (
        <>
          <Card>
            <CardTitle className="mb-3 flex items-center gap-1.5">AI Site Roaster <InfoTooltip text="JARVIS gives an honest, no-filter critique of your casino site's SEO. Scores each issue category out of 10 and provides a specific fix for each." /></CardTitle>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input value={url} onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && aiReady && roast.mutate()}
                  placeholder="yoursite.com"
                  className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors font-mono-jarvis"
                />
              </div>
              <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg">
                {(Object.entries(INTENSITY) as [Intensity, typeof INTENSITY.mild][]).map(([key, val]) => (
                  <button key={key} onClick={() => setIntensity(key)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                      intensity === key ? 'text-black' : 'text-muted hover:text-tx'
                    )}
                    style={intensity === key ? { background: val.color } : {}}
                  >
                    <val.Icon size={11} /> {val.label}
                    <InfoTooltip text={val.tip} />
                  </button>
                ))}
              </div>
              <Button variant="primary" onClick={() => roast.mutate()} disabled={roast.isPending || !aiReady}>
                {roast.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                {roast.isPending ? 'Roasting…' : 'Roast It'}
              </Button>
            </div>

            {!aiReady && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <Flame size={14} className="text-amber-400 shrink-0" />
                <span className="text-xs text-amber-300 flex-1">
                  Add an OpenRouter or Anthropic key to roast your site with real AI analysis.
                </span>
                <Button variant="ghost" className="text-xs shrink-0" onClick={() => setSection('onboarding')}>
                  <Zap size={11} /> Add Key
                </Button>
              </div>
            )}

            {roast.isError && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-danger/10 border border-danger/30">
                <Flame size={14} className="text-danger shrink-0" />
                <span className="text-xs text-danger flex-1">
                  {(roast.error as Error)?.message ?? 'AI call failed — check your API key and try again.'}
                </span>
                <button onClick={() => roast.reset()} className="text-[10px] text-danger hover:text-danger/70 cursor-pointer font-mono-jarvis underline shrink-0">
                  Dismiss
                </button>
              </div>
            )}
          </Card>

          {result && (
            <>
              <Card className="text-center py-6" style={{ borderColor: scoreColor(result.score) + '40' }}>
                <div className="text-6xl font-display font-black mb-2" style={{ color: scoreColor(result.score) }}>
                  {result.score}
                </div>
                <div className="text-[11px] text-muted font-mono-jarvis tracking-widest mb-3 flex items-center justify-center gap-1">SEO HEALTH SCORE <InfoTooltip text="Composite SEO score out of 100 based on Title Tags, Page Speed, E-E-A-T, Bonus Pages, Backlinks, and Schema. 70+ = healthy; below 50 = critical issues." /></div>
                <div className="text-sm text-tx italic max-w-xl mx-auto">"{result.headline}"</div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.sections.map((s, i) => (
                  <Card key={i} style={{ borderColor: (s.rating < 5 ? '#ef444430' : s.rating < 7 ? '#f59e0b30' : '#10b98130') }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-display font-bold text-sm text-tx flex items-center gap-1">{s.title} <InfoTooltip text={`Category score for "${s.title}". Rated 1–10: 7+ = good, 4–6 = needs work, 1–3 = critical issue.`} /></div>
                      <RatingBar rating={s.rating} />
                    </div>
                    <p className="text-xs text-muted italic mb-3 leading-relaxed">"{s.roast}"</p>
                    <div className="bg-surface border border-border rounded-lg p-3">
                      <div className="text-[10px] text-accent3 font-mono-jarvis tracking-widest mb-1">FIX</div>
                      <div className="text-xs text-tx">{s.fix}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {raw && (
            <Card>
              <div className="text-xs text-tx leading-relaxed whitespace-pre-wrap">{raw}</div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
