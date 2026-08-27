import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, FileText, CheckCircle, Clock, PenLine, History } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'
import { cn } from '@/lib/utils'

type Status = 'published' | 'in-progress' | 'planned' | 'brief-ready'

interface ContentItem {
  title: string
  keyword: string
  vol: string
  type: string
  status: Status
  words: number
  due: string
  author: string
}


interface BriefRecord {
  id: string; savedAt: string; label: string; sublabel: string
  title: string; keyword: string; content: string
}

const STATUS_CONFIG: Record<Status, { label:string; color:'green'|'accent'|'amber'|'purple'; icon: typeof CheckCircle }> = {
  'published':   { label:'Published',    color:'green',   icon:CheckCircle },
  'in-progress': { label:'In Progress',  color:'accent',  icon:PenLine },
  'brief-ready': { label:'Brief Ready',  color:'amber',   icon:FileText },
  'planned':     { label:'Planned',      color:'purple',  icon:Clock },
}

export function ContentPlan() {
  const { domain } = useStore()
  const items: ContentItem[] = []
  const [activeStatus, setActiveStatus] = useState<Status|'all'>('all')
  const [brief, setBrief] = useState<{title:string; content:string}|null>(null)
  const [tab, setTab] = useState<'tool' | 'history'>('tool')

  const { records, save, remove, clear } = useHistory<BriefRecord>('jarvis_contentplan_history')

  const generateBrief = useMutation({
    mutationFn: (item: ContentItem) => callClaude(
      'You are an elite SEO content strategist. Create detailed, actionable content briefs.',
      `Create a professional content brief for this site:
Title: "${item.title}"
Target keyword: "${item.keyword}" (${item.vol}/mo searches)
Site: ${domain || 'yoursite.com'}

Include:
**TARGET AUDIENCE**: (1 sentence — type of reader or researcher)
**SEARCH INTENT**: (Informational/Commercial/Transactional + why for this query)
**OUTLINE**: (H2s with 2-3 H3s each, 5-6 sections tailored to this topic)
**INTERNAL LINKS**: 3 relevant pages to link from/to
**KEY ANGLES TO COVER**: 4 bullets competitors miss (e.g. pricing, specs, real-world testing)
**WORD COUNT TARGET**: (with reasoning for YMYL content, if applicable)
**COMPLIANCE NOTE**: Any required legal/disclosure language for this niche, if applicable
**CTA**: (what action should reader take — e.g. sign up, compare options, read full review)

Be specific and actionable for this site's industry.`,
      1200,
    ),
    onSuccess: (content, item) => {
      setBrief({ title: item.title, content })
      save({ id: crypto.randomUUID(), savedAt: new Date().toISOString(),
        label: item.title, sublabel: `${item.keyword} · ${item.vol}/mo`,
        title: item.title, keyword: item.keyword, content })
    },
  })

  const filtered = activeStatus === 'all' ? items : items.filter(c => c.status === activeStatus)

  const stats = {
    published:   items.filter(c => c.status === 'published').length,
    inProgress:  items.filter(c => c.status === 'in-progress').length,
    briefReady:  items.filter(c => c.status === 'brief-ready').length,
    planned:     items.filter(c => c.status === 'planned').length,
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab('tool')} className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer', tab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>Content Plan</button>
        <button onClick={() => setTab('history')} className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer', tab === 'history' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          <History size={11} /> History {records.length > 0 && `(${records.length})`}
        </button>
      </div>
      {tab === 'history' ? (
        <HistoryPanel
          records={records}
          onLoad={r => { setBrief({ title: r.title, content: r.content }); setTab('tool') }}
          onDelete={remove}
          onClear={clear}
          onDownload={r => { const blob = new Blob([`# ${r.title}\n\n${r.content}`], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `brief-${r.savedAt.slice(0,10)}.txt`; a.click() }}
          emptyText="No briefs saved yet. Generate a content brief to save it here."
        />
      ) : (<>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:'PUBLISHED',   val:stats.published,  color:'var(--color-accent3)' },
          { label:'IN PROGRESS', val:stats.inProgress, color:'var(--color-accent)' },
          { label:'BRIEF READY', val:stats.briefReady, color:'var(--color-accent4)' },
          { label:'PLANNED',     val:stats.planned,    color:'#a78bfa' },
        ].map(s => (
          <Card key={s.label} className="text-center py-4">
            <div className="text-3xl font-display font-black" style={{ color:s.color }}>{s.val}</div>
            <div className="text-[10px] tracking-widest text-muted mt-1 font-mono-jarvis">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Content table */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border flex-wrap">
          {(['all','published','in-progress','brief-ready','planned'] as const).map(s => (
            <button key={s} onClick={() => setActiveStatus(s)}
              className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer capitalize',
                activeStatus === s
                  ? 'bg-accent text-black'
                  : 'border border-border text-muted hover:border-accent'
              )}
            >{s === 'all' ? 'All Content' : STATUS_CONFIG[s as Status]?.label ?? s}</button>
          ))}
        </div>

        <div className="divide-y divide-border">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
              <FileText size={36} className="mb-3" strokeWidth={1} />
              <div className="text-sm font-semibold text-tx mb-1">No content items yet</div>
              <div className="text-xs max-w-sm leading-relaxed">Your content plan is empty. Add items to start tracking your editorial pipeline.</div>
            </div>
          )}
          {filtered.map((item, i) => {
            const sc = STATUS_CONFIG[item.status]
            const Icon = sc.icon
            return (
              <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-surface transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                  <FileText size={14} className="text-muted" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-tx truncate">{item.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-mono-jarvis text-accent">{item.keyword}</span>
                    <span className="text-[10px] text-muted">·</span>
                    <span className="text-[10px] text-muted font-mono-jarvis">{item.vol}/mo</span>
                    <span className="text-[10px] text-muted">·</span>
                    <Badge variant="muted">{item.type}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={sc.color}>
                    <Icon size={9} /> {sc.label}
                  </Badge>
                  {item.words > 0 && (
                    <span className="text-[11px] text-muted font-mono-jarvis">{item.words.toLocaleString()}w</span>
                  )}
                  <span className="text-[11px] text-muted">{item.due}</span>
                  <span className="text-[11px] text-muted">{item.author}</span>
                  {item.status !== 'published' && (
                    <Button variant="ghost" className="text-[11px] py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => generateBrief.mutate(item)}
                      disabled={generateBrief.isPending || !isAIReady()}
                    >
                      {generateBrief.isPending && <Loader2 size={11} className="animate-spin" />} Brief
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* AI Brief output */}
      {brief && (
        <Card className="border-[#7c3aed40]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-[#a78bfa]">Content Brief</CardTitle>
              <div className="text-[11px] text-muted mt-0.5">{brief.title}</div>
            </div>
            <Button variant="ghost" className="text-[11px]" onClick={() => setBrief(null)}>× Close</Button>
          </div>
          <div className="text-xs text-tx leading-relaxed whitespace-pre-wrap font-[inherit]">
            {brief.content}
          </div>
        </Card>
      )}
      </>)}
    </div>
  )
}
