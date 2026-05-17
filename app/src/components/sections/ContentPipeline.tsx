import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, ChevronRight, Check, Copy, Download, Sparkles, FileText, Search, Edit3, CheckCircle2, Send } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type Step = 'brief' | 'outline' | 'draft' | 'review' | 'export'

interface Brief {
  keyword: string; slug: string; wordCount: number; tone: string
  audience: string; competitors: string; angle: string
}

interface OutlineSection { heading: string; type: 'h2' | 'h3'; notes: string }

interface ReviewCheck { label: string; pass: boolean; note: string }

const STEPS: { id: Step; label: string; Icon: React.ElementType }[] = [
  { id: 'brief',   label: 'Brief',   Icon: Search },
  { id: 'outline', label: 'Outline', Icon: FileText },
  { id: 'draft',   label: 'Draft',   Icon: Edit3 },
  { id: 'review',  label: 'Review',  Icon: CheckCircle2 },
  { id: 'export',  label: 'Export',  Icon: Send },
]

const STEP_ORDER: Step[] = ['brief', 'outline', 'draft', 'review', 'export']

const REVIEW_CHECKS_TEMPLATE: ReviewCheck[] = [
  { label: 'Word count ≥ 2,000',          pass: false, note: 'Check word count after draft is generated' },
  { label: 'Primary keyword in H1',        pass: false, note: 'Verify H1 contains target keyword' },
  { label: 'E-E-A-T signal present',       pass: false, note: 'Add author byline and expertise statement' },
  { label: 'Responsible gambling section', pass: false, note: 'Required for iGaming YMYL content' },
  { label: 'Internal links present',       pass: false, note: 'Add 3-5 contextual internal links' },
  { label: 'Schema markup included',       pass: false, note: 'Add FAQPage or ReviewList schema' },
  { label: 'Meta description written',     pass: false, note: 'Write meta description in brief' },
]

export function ContentPipeline() {
  const [step,    setStep]    = useState<Step>('brief')
  const [brief,   setBrief]   = useState<Brief>({ keyword: '', slug: '', wordCount: 2500, tone: 'Expert', audience: '', competitors: '', angle: '' })
  const [outline, setOutline] = useState<OutlineSection[]>([])
  const [draft,   setDraft]   = useState('')
  const [copied,  setCopied]  = useState(false)

  const stepIndex = STEP_ORDER.indexOf(step)

  const generateOutline = useMutation({
    mutationFn: async () => {
      return callClaude(
        'You are an iGaming SEO content strategist. Generate casino article outlines.',
        `Create an SEO article outline for: "${brief.keyword}"
Target: ${brief.wordCount} words · Tone: ${brief.tone} · Audience: ${brief.audience}
Angle: ${brief.angle}

Return JSON array:
[{"heading":"H2 or H3 text","type":"h2|h3","notes":"what to include in this section"}]

Include 8-10 sections: intro, methodology, rankings (with H3s), bonuses, responsible gambling (REQUIRED), FAQ.`,
        900,
      )
    },
    onSuccess: (data) => {
      if (data) {
        try {
          const m = data.match(/\[[\s\S]*\]/)
          if (m) { setOutline(JSON.parse(m[0]) as OutlineSection[]); setStep('outline') }
        } catch { /* parse failed */ }
      }
    },
  })

  const generateDraft = useMutation({
    mutationFn: async () => {
      const outlineText = outline.map(s => `${s.type === 'h2' ? '##' : '###'} ${s.heading} [${s.notes}]`).join('\n')
      return callClaude(
        'You are an expert iGaming content writer. Write E-E-A-T compliant casino affiliate articles.',
        `Write a ${brief.wordCount}-word casino article for "${brief.keyword}".

OUTLINE:
${outlineText}

Include: UKGC compliance, real data, responsible gambling section, FAQ schema.
Tone: ${brief.tone}. Write in full markdown.`,
        4096,
      )
    },
    onSuccess: (data) => {
      if (data) { setDraft(data); setStep('draft') }
    },
  })

  const score = 0

  function handleCopy() { navigator.clipboard.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  function handleDownload() {
    const blob = new Blob([draft], { type: 'text/markdown' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${brief.slug}.md`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <Card>
        <div className="flex items-center gap-1">
          {STEPS.map(({ id, label, Icon }, i) => {
            const done = STEP_ORDER.indexOf(id) < stepIndex
            const active = id === step
            return (
              <div key={id} className="flex items-center flex-1 min-w-0">
                <button
                  onClick={() => { if (done || active) setStep(id) }}
                  className={cn(
                    'flex flex-col items-center gap-1 px-2 py-2 rounded-xl flex-1 transition-all cursor-pointer',
                    active ? 'bg-accent/10 border border-accent/40' :
                    done   ? 'border border-border text-muted hover:border-accent/30' :
                    'border border-border/40 text-muted/40 cursor-default'
                  )}
                >
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center',
                    active ? 'bg-accent text-black' : done ? 'bg-accent3 text-black' : 'bg-border text-muted'
                  )}>
                    {done ? <Check size={12} /> : <Icon size={12} />}
                  </div>
                  <span className={cn('text-[10px] font-mono-jarvis tracking-wide', active ? 'text-accent' : done ? 'text-accent3' : 'text-muted')}>
                    {label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight size={14} className={cn('mx-1 shrink-0', done ? 'text-accent3' : 'text-border')} />
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Step content */}
      {step === 'brief' && (
        <Card>
          <CardTitle className="mb-4">Content Brief</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {[
              { label: 'PRIMARY KEYWORD', key: 'keyword' as const, ph: 'best online casino uk' },
              { label: 'URL SLUG',         key: 'slug'    as const, ph: 'best-online-casinos' },
              { label: 'TARGET AUDIENCE',  key: 'audience' as const, ph: 'UK adult casino players' },
              { label: 'COMPETITORS',      key: 'competitors' as const, ph: 'casino.org, gambling.com' },
            ].map(f => (
              <div key={f.key}>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">{f.label}</div>
                <input value={brief[f.key]} onChange={e => setBrief(b => ({ ...b, [f.key]: e.target.value }))}
                  placeholder={f.ph}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
              </div>
            ))}
            <div>
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">WORD COUNT</div>
              <div className="flex gap-1">
                {[1500, 2000, 2500, 3000].map(n => (
                  <button key={n} onClick={() => setBrief(b => ({ ...b, wordCount: n }))}
                    className={cn('flex-1 py-2 rounded-lg text-[11px] font-bold cursor-pointer border transition-all',
                      brief.wordCount === n ? 'bg-accent text-black border-accent' : 'border-border text-muted hover:border-accent'
                    )}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">UNIQUE ANGLE</div>
              <input value={brief.angle} onChange={e => setBrief(b => ({ ...b, angle: e.target.value }))}
                placeholder="What makes this article different?"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors" />
            </div>
          </div>
          <Button variant="ai" onClick={() => generateOutline.mutate()} disabled={generateOutline.isPending}>
            {generateOutline.isPending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {generateOutline.isPending ? 'Generating outline…' : 'Generate Outline'}
          </Button>
          {!isAIReady() && <span className="ml-3 text-[11px] text-muted">Add an AI key in Onboarding.</span>}
        </Card>
      )}

      {step === 'outline' && outline.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Article Outline</CardTitle>
            <Button variant="ai" onClick={() => generateDraft.mutate()} disabled={generateDraft.isPending}>
              {generateDraft.isPending ? <Loader2 size={13} className="animate-spin" /> : <Edit3 size={13} />}
              {generateDraft.isPending ? 'Writing article…' : 'Generate Full Draft'}
            </Button>
          </div>
          <div className="space-y-2">
            {outline.map((sec, i) => (
              <div key={i} className={cn('flex items-start gap-3 p-3 rounded-lg border', sec.type === 'h2' ? 'border-accent/30 bg-[#00d4ff05]' : 'border-border bg-surface ml-6')}>
                <Badge variant={sec.type === 'h2' ? 'accent' : 'muted'}>{sec.type.toUpperCase()}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-tx mb-0.5">{sec.heading}</div>
                  <div className="text-[10px] text-muted leading-relaxed">{sec.notes}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {step === 'draft' && draft && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CardTitle>Draft Article</CardTitle>
              <Badge variant="green">{draft.split(/\s+/).filter(Boolean).length.toLocaleString()} words</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="text-[11px]" onClick={handleCopy}>
                {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
              </Button>
              <Button variant="primary" className="text-[11px]" onClick={() => setStep('review')}>
                <CheckCircle2 size={11} /> Run Review
              </Button>
            </div>
          </div>
          <div className="bg-code rounded-xl border border-border p-5 max-h-96 overflow-y-auto scrollbar-thin">
            <pre className="text-xs text-tx leading-relaxed whitespace-pre-wrap font-sans">{draft}</pre>
          </div>
        </Card>
      )}

      {step === 'review' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CardTitle>Content Review</CardTitle>
              <div className="text-2xl font-display font-black" style={{ color: score >= 70 ? '#10b981' : '#f59e0b' }}>{score}/100</div>
            </div>
            <Button variant="ai" onClick={() => setStep('export')}><Send size={13} /> Go to Export</Button>
          </div>
          <div className="space-y-2">
            {REVIEW_CHECKS_TEMPLATE.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 bg-surface border border-border rounded-lg">
                {c.pass ? <CheckCircle2 size={13} className="text-accent3 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-danger shrink-0" />}
                <span className={cn('text-xs flex-1', c.pass ? 'text-muted' : 'text-tx font-semibold')}>{c.label}</span>
                <span className="text-[10px] text-muted font-mono-jarvis">{c.note}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {step === 'export' && (
        <Card>
          <CardTitle className="mb-4">Export & Publish</CardTitle>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Words', val: draft.split(/\s+/).filter(Boolean).length.toLocaleString() || '—', color: '#00d4ff' },
              { label: 'Review Score', val: `${score}/100`, color: score >= 70 ? '#10b981' : '#f59e0b' },
              { label: 'Status', val: 'Ready', color: '#10b981' },
            ].map(s => (
              <div key={s.label} className="bg-surface border border-border rounded-xl p-4 text-center">
                <div className="text-2xl font-display font-black mb-0.5" style={{ color: s.color }}>{s.val}</div>
                <div className="text-[9px] text-muted font-mono-jarvis tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Copy Markdown', Icon: Copy, action: handleCopy, variant: 'ghost' as const },
              { label: 'Download .md', Icon: Download, action: handleDownload, variant: 'primary' as const },
            ].map(b => (
              <Button key={b.label} variant={b.variant} className="justify-center" onClick={b.action}>
                <b.Icon size={13} /> {b.label}
              </Button>
            ))}
          </div>
          <div className="mt-4 p-4 bg-surface border border-border rounded-xl text-xs text-muted leading-relaxed">
            <span className="text-accent font-semibold">Next steps:</span>
            {' '}1. Add 3-5 internal links to related casino review pages.
            2. Write and add meta description (150-160 chars).
            3. Add 3 featured images with keyword-optimised alt text.
            4. Add FAQPage + ReviewList JSON-LD schema to the page source.
          </div>
        </Card>
      )}
    </div>
  )
}
