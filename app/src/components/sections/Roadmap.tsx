import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Loader2, Sliders, TrendingUp, Target, Brain, Check } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const MILESTONES = [
  { month:1,  label:'Technical foundation',    done:true  },
  { month:2,  label:'Content pillars live',    done:true  },
  { month:3,  label:'First backlink targets',  done:false },
  { month:6,  label:'Domain Rating hits 50',   done:false },
  { month:9,  label:'Top 3 for primary KW',    done:false },
  { month:12, label:'Traffic doubles baseline',done:false },
]

const PHASES = [
  {
    range:'Months 1–3',
    title:'Foundation',
    color:'#00d4ff',
    tasks:[
      'Technical SEO audit + fix all critical issues',
      'Publish 12 cornerstone content pieces',
      'Set up Google Search Console & analytics',
      'Establish baseline keyword rankings',
    ],
  },
  {
    range:'Months 4–6',
    title:'Authority Build',
    color:'#a78bfa',
    tasks:[
      'Launch HARO outreach for editorial links',
      'Begin guest posting on DA 50+ sites',
      'Internal linking audit + schema markup',
      'Target 20 keywords in positions 11–20',
    ],
  },
  {
    range:'Months 7–12',
    title:'Scale',
    color:'#10b981',
    tasks:[
      'Accelerate content to 3× weekly cadence',
      'Launch competitor link reclamation campaign',
      'Expand to adjacent keyword clusters',
      'Begin conversion rate optimisation cycle',
    ],
  },
]

function buildChartData(content: number, links: number, tech: number) {
  const base = 14200
  const months = ['Now','M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12']
  const growth = [1, 1.02, 1.05, 1.09, 1.15, 1.24, 1.36, 1.52, 1.72, 1.95, 2.21, 2.50, 2.84]
  const factor = (content + links + tech) / 300
  return months.map((m, i) => ({
    month: m,
    traffic: Math.round(base * (1 + (growth[i] - 1) * factor)),
    lower:   Math.round(base * (1 + (growth[i] - 1) * factor * 0.7)),
    upper:   Math.round(base * (1 + (growth[i] - 1) * factor * 1.3)),
  }))
}

function RangeSlider({ label, value, onChange }: { label:string; value:number; onChange:(v:number)=>void }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-muted">{label}</span>
        <span className="font-mono-jarvis text-accent font-bold">{value}%</span>
      </div>
      <input type="range" min={10} max={100} value={value} onChange={e=>onChange(+e.target.value)}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{ background:`linear-gradient(to right, var(--color-accent) ${value}%, var(--color-border) ${value}%)` }}
      />
    </div>
  )
}

export function Roadmap() {
  const { domain } = useStore()
  const [content, setContent] = useState(60)
  const [links,   setLinks]   = useState(50)
  const [tech,    setTech]    = useState(70)
  const [aiPlan,  setAiPlan]  = useState('')

  const data = buildChartData(content, links, tech)
  const peak = data[data.length - 1].traffic

  const generate = useMutation({
    mutationFn: () => callClaude(
      'You are an elite SEO strategist creating actionable 12-month roadmaps.',
      `Create a 12-month SEO roadmap for ${domain || 'this website'}:
Investment levels: Content ${content}%, Link Building ${links}%, Technical ${tech}%
Current traffic: 14,200/mo | Target: ${peak.toLocaleString()}/mo

Give me:
**Q1 (Months 1-3):** 3 specific deliverables + expected outcome
**Q2 (Months 4-6):** 3 specific deliverables + expected outcome
**Q3 (Months 7-9):** 3 specific deliverables + expected outcome
**Q4 (Months 10-12):** 3 specific deliverables + expected outcome
**Risk:** One most likely obstacle and how to mitigate it

Be specific and tie actions to traffic impact.`,
      1000,
    ),
    onSuccess: setAiPlan,
  })

  return (
    <div className="space-y-5">
      {/* Forecast chart + controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <CardTitle className="mb-4 flex items-center gap-2"><Sliders size={15} className="text-accent" /> Investment Mix</CardTitle>
          <div className="space-y-5">
            <RangeSlider label="Content Production" value={content} onChange={setContent} />
            <RangeSlider label="Link Building"       value={links}   onChange={setLinks} />
            <RangeSlider label="Technical SEO"       value={tech}    onChange={setTech} />
          </div>
          <div className="mt-6 p-4 bg-surface border border-border rounded-xl text-center">
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1">MONTH 12 FORECAST</div>
            <div className="text-2xl font-display font-black text-accent3">
              {peak.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted">monthly visitors</div>
            <div className="text-[11px] text-accent3 font-semibold mt-1">
              +{Math.round(((peak - 14200) / 14200) * 100)}% growth
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle className="mb-4 flex items-center gap-2"><TrendingUp size={15} className="text-accent" /> Traffic Projection</CardTitle>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize:10, fill:'var(--color-muted)', fontFamily:'JetBrains Mono' }} />
              <YAxis tickFormatter={v => (v/1000).toFixed(0)+'K'} tick={{ fontSize:10, fill:'var(--color-muted)' }} />
              <Tooltip
                contentStyle={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:8 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`${v.toLocaleString()} visitors`]}
              />
              <ReferenceLine x="M3" stroke="#7c3aed" strokeDasharray="4 2" label={{ value:'Q1 End', fill:'#a78bfa', fontSize:10 }} />
              <ReferenceLine x="M6" stroke="#7c3aed" strokeDasharray="4 2" label={{ value:'Q2 End', fill:'#a78bfa', fontSize:10 }} />
              <Area type="monotone" dataKey="upper"   stroke="none"    fill="url(#bandGrad)" />
              <Area type="monotone" dataKey="traffic" stroke="#00d4ff" fill="url(#trafficGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="lower"   stroke="none"    fill="var(--color-bg)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Milestones */}
      <Card>
        <CardTitle className="mb-4 flex items-center gap-2"><Target size={15} className="text-accent" /> Key Milestones</CardTitle>
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {MILESTONES.map((m, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5 min-w-25 text-center">
                <div className={cn(
                  'w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all',
                  m.done
                    ? 'bg-accent3 border-accent3 text-black'
                    : 'bg-surface border-border text-muted'
                )}>
                  {m.done ? <Check size={12} /> : m.month}
                </div>
                <div className="text-[10px] text-muted font-mono-jarvis">M{m.month}</div>
                <div className="text-[11px] text-tx font-semibold leading-tight">{m.label}</div>
              </div>
              {i < MILESTONES.length - 1 && (
                <div className={cn('flex-1 h-0.5 min-w-10', m.done ? 'bg-accent3' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Phase breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PHASES.map(p => (
          <Card key={p.title} className="relative overflow-hidden" style={{ borderColor:p.color+'30' }}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background:p.color }} />
            <div className="text-[10px] font-mono-jarvis text-muted mb-1">{p.range}</div>
            <div className="font-display font-bold text-base mb-3" style={{ color:p.color }}>{p.title}</div>
            <ul className="space-y-2">
              {p.tasks.map((t,i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-tx">
                  <span className="mt-0.5" style={{ color:p.color }}>→</span>
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {/* AI roadmap */}
      {aiPlan ? (
        <Card className="border-[#7c3aed40]">
          <CardTitle className="text-[#a78bfa] mb-4 flex items-center gap-2"><Brain size={15} /> AI-Generated 12-Month Roadmap</CardTitle>
          <div className="text-xs text-tx leading-relaxed whitespace-pre-wrap">{aiPlan}</div>
        </Card>
      ) : (
        <Card>
          <Button variant="ai" onClick={() => generate.mutate()} disabled={generate.isPending || !isAIReady()}>
            {generate.isPending ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
            {generate.isPending ? 'Generating roadmap…' : 'Generate AI 12-Month Roadmap'}
          </Button>
        </Card>
      )}
    </div>
  )
}
