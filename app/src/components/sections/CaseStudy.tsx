import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Plus, Copy, Check, ChevronDown, ChevronUp, Briefcase, MessageSquare, BarChart2, ClipboardList } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface CaseStudySection {
  heading: string
  body: string
}

interface CaseStudyOutput {
  title: string
  summary: string
  sections: CaseStudySection[]
  metrics: { label: string; before: string; after: string; change: string }[]
  cta: string
}

interface FormData {
  client: string
  industry: string
  challenge: string
  strategy: string
  duration: string
  results: string
  tone: 'professional' | 'conversational' | 'data-driven'
}

const TONES = [
  { key: 'professional',    label: 'Professional',   Icon: Briefcase },
  { key: 'conversational',  label: 'Conversational', Icon: MessageSquare },
  { key: 'data-driven',     label: 'Data-Driven',    Icon: BarChart2 },
] as const


function MetricCard({ m }: { m: CaseStudyOutput['metrics'][0] }) {
  const isPositive = m.change.startsWith('+')
  return (
    <div className="bg-surface border border-border rounded-xl p-4 text-center">
      <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-2">{m.label}</div>
      <div className="flex items-end justify-center gap-3 mb-1">
        <span className="text-xs text-muted line-through">{m.before}</span>
        <span className="text-base font-display font-black text-tx">{m.after}</span>
      </div>
      <Badge variant={isPositive ? 'green' : 'red'}>{m.change}</Badge>
    </div>
  )
}

export function CaseStudy() {
  const [form, setForm] = useState<FormData>({
    client: '', industry: 'iGaming / Online Casino', challenge: '', strategy: '', duration: '6 months', results: '', tone: 'professional',
  })
  const [output, setOutput] = useState<CaseStudyOutput | null>(null)
  const [copied, setCopied] = useState(false)
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({ 0: true })

  const generate = useMutation({
    mutationFn: async () => {
      return callClaude(
        `You are an expert SEO copywriter specialising in ${form.tone} iGaming case studies that convert casino affiliate prospects into clients.`,
        `Write a compelling iGaming SEO case study with these details:
Client: ${form.client || 'CasinoReview.io'}
Industry: ${form.industry || 'iGaming / Online Casino Affiliate'}
Challenge: ${form.challenge || 'Stagnant organic traffic on bonus and review pages'}
Strategy: ${form.strategy || 'E-E-A-T overhaul, bonus page restructure, niche link building'}
Duration: ${form.duration}
Results: ${form.results || 'Significant organic growth and affiliate commission increase'}
Tone: ${form.tone}

Return ONLY JSON:
{
  "title": "compelling case study title with specific numbers",
  "summary": "2-3 sentence executive summary",
  "metrics": [
    {"label":"Organic Traffic","before":"12K/mo","after":"54K/mo","change":"+340%"},
    {"label":"Keyword Rankings","before":"180","after":"890","change":"+394%"},
    {"label":"Domain Authority","before":"24","after":"41","change":"+71%"},
    {"label":"Leads Generated","before":"45/mo","after":"127/mo","change":"+182%"}
  ],
  "sections": [
    {"heading":"The Challenge","body":"2-3 paragraph detailed section"},
    {"heading":"Our Approach","body":"2-3 paragraph detailed section"},
    {"heading":"Execution","body":"2-3 paragraph detailed section"},
    {"heading":"Results","body":"2-3 paragraph detailed section"}
  ],
  "cta": "compelling call-to-action paragraph"
}`,
        2000,
      )
    },
    onSuccess: (data) => {
      if (data) {
        try {
          const match = data.match(/\{[\s\S]*\}/)
          if (match) setOutput(JSON.parse(match[0]) as CaseStudyOutput)
        } catch { /* parse failed */ }
      }
    },
  })

  function copyMarkdown() {
    if (!output) return
    const md = [
      `# ${output.title}`,
      '',
      output.summary,
      '',
      '## Key Results',
      output.metrics.map(m => `- **${m.label}:** ${m.before} → ${m.after} (${m.change})`).join('\n'),
      '',
      ...output.sections.flatMap(s => [`## ${s.heading}`, '', s.body, '']),
      '## Ready to Get Started?',
      '',
      output.cta,
    ].join('\n')
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-5">
      {/* Form */}
      <Card>
        <CardTitle className="mb-4">AI Case Study Builder</CardTitle>

        <div className="grid grid-cols-2 gap-3 mb-3">
          {([
            { key: 'client',   label: 'CLIENT / SITE NAME', placeholder: 'CasinoReview.io' },
            { key: 'industry', label: 'VERTICAL',           placeholder: 'iGaming, Sports Betting, Poker…' },
            { key: 'duration', label: 'PROJECT DURATION',   placeholder: '6 months' },
          ] as const).map(f => (
            <div key={f.key} className={f.key === 'client' ? '' : ''}>
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">{f.label}</div>
              <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 mb-3">
          {([
            { key: 'challenge', label: 'CHALLENGE / PROBLEM',    placeholder: 'Ranking stuck on page 3 for key bonus terms, losing affiliate revenue to casino.org…', rows: 2 },
            { key: 'strategy',  label: 'STRATEGY USED',          placeholder: 'E-E-A-T overhaul, bonus page restructure, niche link building, Review schema…', rows: 2 },
            { key: 'results',   label: 'RESULTS ACHIEVED',       placeholder: 'Traffic +340%, 18 bonus keywords on page 1, affiliate commissions up $12K/mo…', rows: 2 },
          ] as const).map(f => (
            <div key={f.key}>
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">{f.label}</div>
              <textarea value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder} rows={f.rows}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors resize-none"
              />
            </div>
          ))}
        </div>

        {/* Tone selector */}
        <div className="mb-4">
          <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-2">WRITING TONE</div>
          <div className="flex gap-2">
            {TONES.map(t => (
              <button key={t.key} onClick={() => setForm(p => ({ ...p, tone: t.key }))}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${form.tone === t.key ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted hover:text-tx'}`}>
                <t.Icon size={12} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        <Button variant="primary" onClick={() => generate.mutate()} disabled={generate.isPending}>
          {generate.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
          {generate.isPending ? 'Generating…' : 'Generate Case Study'}
        </Button>
        {!isAIReady() && <span className="ml-3 text-[11px] text-muted">Add an AI key in Onboarding.</span>}
      </Card>

      {/* Output */}
      {output && (
        <>
          <Card>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="font-display font-black text-xl text-tx leading-tight">{output.title}</h2>
              <Button variant="ghost" onClick={copyMarkdown} className="shrink-0">
                {copied ? <Check size={13} className="text-accent3" /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy MD'}
              </Button>
            </div>
            <p className="text-sm text-muted leading-relaxed">{output.summary}</p>
          </Card>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {output.metrics.map((m, i) => <MetricCard key={i} m={m} />)}
          </div>

          {/* Sections accordion */}
          <div className="space-y-3">
            {output.sections.map((s, i) => (
              <Card key={i} className="cursor-pointer" onClick={() => setOpenSections(p => ({ ...p, [i]: !p[i] }))}>
                <div className="flex items-center justify-between">
                  <div className="font-display font-bold text-sm text-tx">{s.heading}</div>
                  {openSections[i] ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
                </div>
                {openSections[i] && (
                  <div className="mt-3 text-sm text-muted leading-relaxed whitespace-pre-line border-t border-border pt-3">
                    {s.body}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* CTA */}
          <Card className="border-accent/30 bg-linear-to-br from-[#00d4ff08] to-transparent">
            <div className="text-[10px] text-accent font-mono-jarvis tracking-widest mb-2">CALL TO ACTION</div>
            <p className="text-sm text-tx leading-relaxed">{output.cta}</p>
          </Card>
        </>
      )}

      {!output && (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <ClipboardList size={40} className="mb-3 text-muted" strokeWidth={1} />
          <div className="text-sm text-muted">Fill in the details above and generate a polished case study in seconds</div>
        </div>
      )}
    </div>
  )
}
