import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Copy, Check, RotateCcw, Zap, Briefcase, MessageSquare } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface MetaRow {
  url: string
  keyword: string
  existingTitle: string
  title: string
  description: string
  titleLen: number
  descLen: number
  copied: boolean
}

export function BulkMeta() {
  const [input, setInput] = useState('')
  const [rows, setRows] = useState<MetaRow[]>([])
  const [tone, setTone] = useState<'professional' | 'conversational' | 'aggressive'>('professional')
  const [copiedAll, setCopiedAll] = useState(false)

  const generate = useMutation({
    mutationFn: async () => {
      const lines = input.split('\n').map(s=>s.trim()).filter(Boolean)
      return callClaude(
        `You are an expert SEO copywriter. Tone: ${tone}. Return ONLY JSON array, no markdown.`,
        `Write SEO-optimised meta titles and descriptions for these pages:

${lines.map((l,i)=>`${i+1}. ${l}`).join('\n')}

Format: url | existing title | target keyword

Rules:
- Title: 50-60 chars, include keyword near start, compelling CTA
- Description: 140-155 chars, include keyword, benefit + CTA
- Tone: ${tone}

Return JSON only:
[{"url":"/path","keyword":"kw","existingTitle":"old","title":"New Title Here","description":"Meta description here...","titleLen":55,"descLen":148}]`,
        2000,
      )
    },
    onSuccess: (data) => {
      if (data) {
        try {
          const match = data.match(/\[[\s\S]*\]/)
          if (match) setRows((JSON.parse(match[0]) as MetaRow[]).map(r => ({ ...r, copied: false })))
        } catch { /* keep */ }
      }
    },
  })

  function copyRow(i: number) {
    const r = rows[i]
    navigator.clipboard.writeText(`Title: ${r.title}\nDescription: ${r.description}`)
    setRows(prev => prev.map((row, idx) => idx === i ? { ...row, copied: true } : row))
    setTimeout(() => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, copied: false } : row)), 1500)
  }

  function copyAll() {
    const csv = ['URL,Title,Description', ...rows.map(r => `${r.url},"${r.title}","${r.description}"`)].join('\n')
    navigator.clipboard.writeText(csv)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1500)
  }

  const lenColor = (len: number, max: number) =>
    len > max ? 'text-danger' : len >= max - 10 ? 'text-accent3' : 'text-muted'

  const TONES = [
    { id: 'professional',    label: 'Professional',   Icon: Briefcase },
    { id: 'conversational',  label: 'Conversational', Icon: MessageSquare },
    { id: 'aggressive',      label: 'Aggressive',     Icon: Zap },
  ] as const

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1">
          <CardTitle className="mb-3">Bulk Meta Writer</CardTitle>
          <div className="text-[11px] text-muted mb-3">Format: /url | Page Title | Target Keyword</div>

          <div className="flex flex-col gap-1 mb-3">
            {TONES.map(t => (
              <button key={t.id} onClick={() => setTone(t.id)}
                className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold text-left cursor-pointer transition-all',
                  tone === t.id ? 'bg-accent text-black' : 'border border-border text-muted hover:border-accent'
                )}
              ><t.Icon size={11} />{t.label}</button>
            ))}
          </div>

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={10}
            className="w-full bg-surface border border-border rounded-lg p-3 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors resize-none scrollbar-thin mb-3"
          />
          <Button variant="primary" className="w-full justify-center" onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            {generate.isPending ? 'Writing…' : `Generate ${input.split('\n').filter(Boolean).length} Meta Tags`}
          </Button>
          {!isAIReady() && <div className="text-[10px] text-muted mt-2">Add an AI key in Onboarding.</div>}
        </Card>

        <div className="lg:col-span-2 space-y-3">
          {rows.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-tx">{rows.length} pages written</div>
              <div className="flex gap-2">
                <Button variant="ghost" className="text-[11px]" onClick={() => setRows([])}>
                  <RotateCcw size={11} /> Clear
                </Button>
                <Button variant="ghost" className="text-[11px]" onClick={copyAll}>
                  {copiedAll ? <Check size={11} /> : <Copy size={11} />}
                  {copiedAll ? 'Copied CSV!' : 'Export CSV'}
                </Button>
              </div>
            </div>
          )}

          {rows.length > 0 ? rows.map((r, i) => (
            <Card key={i} className="relative group">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-mono-jarvis text-[11px] text-accent mb-1">{r.url}</div>
                  {r.existingTitle && (
                    <div className="text-[11px] text-muted line-through">{r.existingTitle}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="muted">{r.keyword}</Badge>
                  <button onClick={() => copyRow(i)}
                    className="p-1.5 rounded-lg border border-border text-muted hover:text-accent hover:border-accent transition-all cursor-pointer">
                    {r.copied ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-muted font-mono-jarvis tracking-widest">TITLE</span>
                    <span className={cn('text-[10px] font-mono-jarvis', lenColor(r.titleLen, 60))}>
                      {r.titleLen}/60
                    </span>
                  </div>
                  <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs font-semibold text-tx">
                    {r.title}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-muted font-mono-jarvis tracking-widest">DESCRIPTION</span>
                    <span className={cn('text-[10px] font-mono-jarvis', lenColor(r.descLen, 155))}>
                      {r.descLen}/155
                    </span>
                  </div>
                  <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-muted leading-relaxed">
                    {r.description}
                  </div>
                </div>
              </div>
            </Card>
          )) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Zap size={40} className="mb-3 text-muted" strokeWidth={1} />
              <div className="text-sm text-muted">Add pages on the left and generate meta tags</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
