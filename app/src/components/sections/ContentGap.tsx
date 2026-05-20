import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, TrendingUp, Plus, Crosshair, Brain } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface GapItem {
  topic: string
  vol: string
  kd: number
  competitors: string[]
  opportunity: 'HIGH' | 'MED' | 'LOW'
  angle: string
}

const OPP_COLOR: Record<string, 'green' | 'amber' | 'red'> = { HIGH: 'green', MED: 'amber', LOW: 'red' }


export function ContentGap() {
  const { domain } = useStore()
  const [own,   setOwn]   = useState(domain || '')
  const [c1,    setC1]    = useState('')
  const [c2,    setC2]    = useState('')
  const [niche, setNiche] = useState('')
  const [gaps,  setGaps]  = useState<GapItem[]>([])
  const [aiSummary, setAiSummary] = useState('')

  const analyze = useMutation({
    mutationFn: async () => {
      return callClaude(
        'You are an elite content gap analyst. Return ONLY JSON for the gaps array, then a brief text summary.',
        `Find content gaps for the iGaming/casino site "${own}" vs competitors "${c1}" and "${c2}" in the "${niche}" niche.

Return this exact format:
GAPS_JSON:
[{"topic":"...","vol":"5K","kd":30,"competitors":["${c1}"],"opportunity":"HIGH","angle":"specific casino content angle they're missing"}]
END_GAPS

SUMMARY:
2-3 sentence strategic summary of the biggest iGaming content opportunity.
END_SUMMARY

Generate 6 realistic casino/gambling gaps (bonus pages, review content, game guides, geo pages). Opportunity: HIGH=kd<35, MED=moderate difficulty, LOW=hard to win.`,
        1400,
      )
    },
    onSuccess: (data) => {
      if (data) {
        const gapsMatch = data.match(/GAPS_JSON:\s*([\s\S]*?)END_GAPS/)
        const summaryMatch = data.match(/SUMMARY:\s*([\s\S]*?)END_SUMMARY/)
        if (gapsMatch) { try { setGaps(JSON.parse(gapsMatch[1].trim()) as GapItem[]) } catch { /* keep */ } }
        if (summaryMatch) setAiSummary(summaryMatch[1].trim())
      }
    },
  })

  return (
    <div className="space-y-5">
      {/* Inputs */}
      <Card>
        <CardTitle className="mb-4 flex items-center gap-1.5">Content Gap Finder <InfoTooltip text="A content gap is a topic your competitors rank for in Google but your site does not. Filling these gaps captures traffic you're currently missing." /></CardTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'YOUR DOMAIN', value: own,   onChange: setOwn,   placeholder: 'casinosite.com', tip: 'Your casino or affiliate site domain. Used as the baseline — the AI identifies topics competitors cover that you do not.' },
            { label: 'COMPETITOR 1', value: c1,   onChange: setC1,    placeholder: 'casino.org',     tip: 'A direct competitor domain. The AI checks what topics they rank for that your site is missing.' },
            { label: 'COMPETITOR 2', value: c2,   onChange: setC2,    placeholder: 'gambling.com',   tip: 'A second competitor domain for a wider gap analysis across multiple rivals.' },
            { label: 'NICHE/TOPIC',  value: niche, onChange: setNiche, placeholder: 'e.g. casino bonus', tip: 'The content niche to focus the gap analysis on — e.g. "casino bonus", "live casino", "sports betting".' },
          ].map(f => (
            <div key={f.label}>
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5 flex items-center gap-1">{f.label} <InfoTooltip text={f.tip} /></div>
              <input value={f.value} onChange={e => f.onChange(e.target.value)}
                placeholder={f.placeholder}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors"
              />
            </div>
          ))}
        </div>
        <Button variant="primary" onClick={() => analyze.mutate()} disabled={analyze.isPending}>
          {analyze.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
          {analyze.isPending ? 'Finding gaps…' : 'Find Content Gaps'}
        </Button>
        {!isAIReady() && <span className="ml-3 text-[11px] text-muted">Add an AI key in Onboarding.</span>}
      </Card>

      {gaps.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-5">
            {/* Summary */}
            <Card>
              <CardTitle className="mb-3">Gap Summary</CardTitle>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label:'HIGH OPP.',  val: gaps.filter(g=>g.opportunity==='HIGH').length, color:'#10b981', tip: 'Keyword gaps with KD < 35 — easiest to win quickly with new content.' },
                  { label:'MED OPP.',   val: gaps.filter(g=>g.opportunity==='MED').length,  color:'#f59e0b', tip: 'Medium-difficulty gaps worth targeting once high-opportunity topics are covered.' },
                  { label:'TOTAL GAPS', val: gaps.length,                                   color:'#00d4ff', tip: 'Total number of content gap topics identified across your competitors.' },
                ].map(s => (
                  <div key={s.label} className="bg-surface border border-border rounded-xl p-3 text-center">
                    <div className="text-2xl font-display font-black" style={{ color:s.color }}>{s.val}</div>
                    <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mt-1 flex items-center justify-center gap-1">{s.label} <InfoTooltip text={s.tip} /></div>
                  </div>
                ))}
              </div>
              {aiSummary ? (
                <div className="bg-linear-to-br from-[#7c3aed10] to-transparent border border-[#7c3aed30] rounded-xl p-4 text-xs text-tx leading-relaxed">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#a78bfa] font-mono-jarvis tracking-widest mb-2"><Brain size={11} /> STRATEGIC INSIGHT</div>
                  {aiSummary}
                </div>
              ) : (
                <div className="text-xs text-muted leading-relaxed">
                  {gaps.filter(g=>g.opportunity==='HIGH').length} high-opportunity gaps identified.
                  Focus on topics with kd &lt;30 where competitors rank but you don't.
                </div>
              )}
            </Card>
          </div>

          {/* Gap cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gaps.map((g, i) => (
              <Card key={i} className="hover:border-accent transition-colors group">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-tx mb-1">{g.topic}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono-jarvis text-accent">{g.vol}/mo</span>
                      <InfoTooltip text="Estimated monthly search volume for this keyword gap." side="bottom" />
                      <span className="text-[10px] text-muted">KD {g.kd}</span>
                      <InfoTooltip text="Keyword Difficulty (0–100). Lower KD means easier to rank for. Gaps with KD < 35 are HIGH opportunity." side="bottom" />
                      <Badge variant={OPP_COLOR[g.opportunity]}>{g.opportunity}</Badge>
                      <InfoTooltip text="Opportunity rating: HIGH = KD < 35 (quick wins), MED = moderate difficulty, LOW = very competitive." side="bottom" />
                    </div>
                  </div>
                  <Button variant="ghost" className="text-[11px] py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Plus size={11} /> Plan
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {g.competitors.length > 0
                    ? g.competitors.map(c => (
                        <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-[#7c3aed20] text-[#a78bfa]">
                          {c} ranks
                        </span>
                      ))
                    : <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10b98120] text-accent3">Pure gap — no competitors</span>
                  }
                </div>

                <div className="bg-surface border border-border rounded-lg p-3">
                  <div className="text-[10px] text-accent font-mono-jarvis tracking-widest mb-1">
                    <TrendingUp size={9} className="inline mr-1" />YOUR ANGLE
                  </div>
                  <div className="text-xs text-muted leading-relaxed">{g.angle}</div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {gaps.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <Crosshair size={40} className="mb-3 text-muted" strokeWidth={1} />
          <div className="text-sm text-muted">Enter your domain and competitors above, then click Find Content Gaps</div>
        </div>
      )}
    </div>
  )
}
