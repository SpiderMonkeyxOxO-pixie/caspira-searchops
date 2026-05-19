import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, ArrowRight, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface LinkSuggestion {
  anchor: string
  targetUrl: string
  targetTitle: string
  reason: string
  context: string
  priority: 'high' | 'medium' | 'low'
}


const PRIORITY_COLOR: Record<LinkSuggestion['priority'], string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#6b7280',
}

function segmentText(text: string, suggestions: LinkSuggestion[]): { text: string; anchor: boolean; idx: number }[] {
  const segments: { text: string; anchor: boolean; idx: number }[] = []
  const remaining = text

  const matches: { start: number; end: number; idx: number }[] = []
  suggestions.forEach((s, idx) => {
    const pos = remaining.toLowerCase().indexOf(s.anchor.toLowerCase())
    if (pos !== -1) {
      matches.push({ start: pos, end: pos + s.anchor.length, idx })
    }
  })
  matches.sort((a, b) => a.start - b.start)

  let pos = 0
  const seen = new Set<number>()
  matches.forEach(m => {
    if (m.start < pos || seen.has(m.idx)) return
    if (m.start > pos) segments.push({ text: remaining.slice(pos, m.start), anchor: false, idx: -1 })
    segments.push({ text: remaining.slice(m.start, m.end), anchor: true, idx: m.idx })
    seen.add(m.idx)
    pos = m.end
  })
  if (pos < remaining.length) segments.push({ text: remaining.slice(pos), anchor: false, idx: -1 })
  return segments
}

export function LinkSuggester() {
  const [article,     setArticle]     = useState('')
  const [domain,      setDomain]      = useState('casinoexpert.io')
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([])
  const [selected,    setSelected]    = useState<number | null>(null)
  const [filter,      setFilter]      = useState<'all' | LinkSuggestion['priority']>('all')
  const [copied,      setCopied]      = useState<number | null>(null)

  const analyze = useMutation({
    mutationFn: async () => {
      return callClaude(
        'You are an iGaming internal linking expert. Identify high-value internal link opportunities in casino content.',
        `Analyse this casino article and identify the best internal link opportunities for "${domain}".

ARTICLE:
${article.slice(0, 2000)}

Return JSON array:
[{
  "anchor": "exact phrase from the article to link",
  "targetUrl": "/relevant-page",
  "targetTitle": "Target Page Title",
  "reason": "why this link matters for SEO",
  "context": "...the sentence containing the anchor...",
  "priority": "high|medium|low"
}]

Identify 6-8 opportunities. Prioritise:
- HIGH: pillar pages, high-traffic targets, E-E-A-T signals (UKGC, responsible gambling)
- MEDIUM: supporting cluster pages, provider pages
- LOW: optional supplementary links`,
        1000,
      )
    },
    onSuccess: (data) => {
      if (data) {
        try {
          const m = data.match(/\[[\s\S]*\]/)
          if (m) setSuggestions(JSON.parse(m[0]) as LinkSuggestion[])
        } catch { /* parse failed */ }
      }
    },
  })

  const filtered = suggestions.filter(s => filter === 'all' || s.priority === filter)
  const segments = suggestions.length > 0 ? segmentText(article, suggestions) : []
  const highCount = suggestions.filter(s => s.priority === 'high').length

  function copyHTML(s: LinkSuggestion, idx: number) {
    navigator.clipboard.writeText(`<a href="${domain}${s.targetUrl}">${s.anchor}</a>`)
    setCopied(idx); setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <CardTitle className="mb-1">Internal Link Suggester</CardTitle>
            <div className="text-[11px] text-muted font-mono-jarvis">Paste a new article — Jarvis identifies where to add internal links and which pages to target</div>
          </div>
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1">YOUR DOMAIN</div>
            <input value={domain} onChange={e => setDomain(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors w-44" />
          </div>
          <div className="mt-4">
            <Button variant="primary" onClick={() => analyze.mutate()} disabled={analyze.isPending}>
              {analyze.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
              {analyze.isPending ? 'Analysing…' : 'Find Link Opportunities'}
            </Button>
          </div>
        </div>

        {suggestions.length === 0 ? (
          <textarea value={article} onChange={e => setArticle(e.target.value)} rows={12}
            placeholder="Paste your new casino article here…"
            className="w-full bg-surface border border-border rounded-xl p-4 text-xs text-tx outline-none focus:border-accent transition-colors resize-none scrollbar-thin leading-relaxed" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Article with highlights */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest">ARTICLE WITH LINK OPPORTUNITIES</div>
                <div className="flex items-center gap-2 text-[10px] text-muted font-mono-jarvis">
                  <span className="w-3 h-2 rounded-sm bg-accent/30 border-b-2 border-accent inline-block" /> highlighted anchor
                </div>
              </div>
              <div className="bg-surface border border-border rounded-xl p-4 text-sm text-tx leading-relaxed max-h-96 overflow-y-auto scrollbar-thin">
                {segments.map((seg, i) =>
                  seg.anchor ? (
                    <mark key={i}
                      onClick={() => setSelected(seg.idx === selected ? null : seg.idx)}
                      className="bg-accent/20 border-b-2 border-accent cursor-pointer hover:bg-accent/30 transition-colors rounded-sm px-0.5 not-italic"
                      style={{ textDecoration: 'none' }}>
                      {seg.text}
                    </mark>
                  ) : (
                    <span key={i}>{seg.text}</span>
                  )
                )}
              </div>
              {!isAIReady() && <div className="mt-2 text-[10px] text-muted">Add an AI key in Onboarding.</div>}
            </div>

            {/* Suggestions list */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-[10px] text-muted font-mono-jarvis tracking-widest">SUGGESTIONS</div>
                  <Badge variant="red">{highCount} high priority</Badge>
                </div>
                <div className="flex gap-1">
                  {(['all','high','medium','low'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono-jarvis cursor-pointer transition-colors ${filter === f ? 'bg-accent text-black' : 'text-muted hover:text-tx'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                {filtered.map((s, i) => {
                  const realIdx = suggestions.indexOf(s)
                  const isOpen = selected === realIdx
                  return (
                    <div key={i}
                      className={`border rounded-xl overflow-hidden cursor-pointer transition-colors ${isOpen ? 'border-accent/40 bg-[#00d4ff05]' : 'border-border hover:border-accent/20'}`}
                      onClick={() => setSelected(isOpen ? null : realIdx)}>
                      <div className="flex items-start gap-2 p-3">
                        <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: PRIORITY_COLOR[s.priority] }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-accent font-mono-jarvis truncate">"{s.anchor}"</div>
                          <div className="text-[10px] text-muted truncate">{s.targetUrl}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={e => { e.stopPropagation(); copyHTML(s, i) }}
                            className="p-1 text-muted hover:text-accent transition-colors cursor-pointer">
                            {copied === i ? <Check size={11} className="text-accent3" /> : <Copy size={11} />}
                          </button>
                          {isOpen ? <ChevronUp size={12} className="text-muted" /> : <ChevronDown size={12} className="text-muted" />}
                        </div>
                      </div>
                      {isOpen && (
                        <div className="px-3 pb-3 border-t border-border pt-2 space-y-2">
                          <div className="text-[10px] text-muted leading-relaxed">{s.reason}</div>
                          <div className="bg-code rounded-lg p-2 text-[10px] font-mono-jarvis text-accent3">
                            {'<a href="'}{domain}{s.targetUrl}{'">'}{s.anchor}{'</a>'}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-accent">
                            <ArrowRight size={9} /> {s.targetTitle}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
