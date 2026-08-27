import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Repeat2, Loader2, TrendingDown, ChevronDown, ChevronUp, CheckCircle2, ArrowDownRight, Plus, Trash2, History } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'
import { cn } from '@/lib/utils'

interface DeclinePage {
  id: string
  url: string
  title: string
  trafficNow: number
  traffic30d: number
  lastUpdated: string
  staleSections: string[]
  priority: 'critical' | 'high' | 'medium'
}

interface RefreshResult {
  section: string
  before: string
  after: string
}

interface AutoRefreshRecord {
  id: string; savedAt: string; label: string; sublabel: string
  pages: DeclinePage[]; results: Record<string, RefreshResult>
}

const PRIORITY_COLOR: Record<DeclinePage['priority'], string> = {
  critical: '#ef4444', high: '#f59e0b', medium: '#7c3aed',
}

function trafficDelta(page: DeclinePage) {
  if (!page.traffic30d) return 0
  return Math.round(((page.trafficNow - page.traffic30d) / page.traffic30d) * 100)
}

export function AutoRefresh() {
  const [pages,       setPages]       = useState<DeclinePage[]>([])
  const [refreshing,  setRefreshing]  = useState<string | null>(null)
  const [results,     setResults]     = useState<Record<string, RefreshResult>>({})
  const [expanded,    setExpanded]    = useState<string | null>(null)
  const [selectedSec, setSelectedSec] = useState<Record<string, string>>({})

  const [newUrl,      setNewUrl]      = useState('')
  const [newTitle,    setNewTitle]    = useState('')
  const [newSection,  setNewSection]  = useState('')
  const [tab,         setTab]         = useState<'tool' | 'history'>('tool')

  const { records, save, remove, clear } = useHistory<AutoRefreshRecord>('jarvis_autorefresh_history')

  function addPage() {
    const url = newUrl.trim()
    const title = newTitle.trim()
    if (!url || !title) return
    const section = newSection.trim() || 'Main content section'
    setPages(prev => [...prev, {
      id: Date.now().toString(),
      url, title,
      trafficNow: 0, traffic30d: 0,
      lastUpdated: 'unknown',
      staleSections: [section],
      priority: 'high',
    }])
    setNewUrl(''); setNewTitle(''); setNewSection('')
  }

  function removePage(id: string) {
    setPages(prev => prev.filter(p => p.id !== id))
  }

  const refresh = useMutation({
    mutationFn: async ({ page, section }: { page: DeclinePage; section: string }) => {
      setRefreshing(page.id)
      const data = await callClaude(
        'You are a content refresh specialist. Rewrite outdated content to be current, accurate, and better optimised.',
        `Rewrite this stale section from the page "${page.title}" (${page.url}).

Section to refresh: "${section}"

Return JSON:
{
  "section": "${section}",
  "before": "brief 2-3 sentence example of what stale content looks like",
  "after": "rewritten 3-4 sentence version with current 2026 data, specific stats, and stronger SEO signals"
}`,
        800,
      )
      if (data) {
        try {
          const match = data.match(/\{[\s\S]*\}/)
          if (match) return { id: page.id, result: JSON.parse(match[0]) as RefreshResult }
        } catch { /* ignore */ }
      }
      return null
    },
    onSuccess: (data) => {
      if (data) {
        setResults(prev => {
          const next = { ...prev, [data.id]: data.result }
          save({ id: crypto.randomUUID(), savedAt: new Date().toISOString(),
            label: data.result.section,
            sublabel: `${pages.length} pages · ${Object.keys(next).length} refreshed`,
            pages: [...pages], results: next })
          return next
        })
      }
      setRefreshing(null)
    },
    onError: () => setRefreshing(null),
  })

  const totalTrafficLost = pages.reduce((s, p) => s + (p.traffic30d - p.trafficNow), 0)

  return (
    <div className="space-y-5">
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab('tool')} className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer', tab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>Content Refresh</button>
        <button onClick={() => setTab('history')} className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer', tab === 'history' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          <History size={11} /> History {records.length > 0 && `(${records.length})`}
        </button>
      </div>
      {tab === 'history' ? (
        <HistoryPanel
          records={records}
          onLoad={r => { setPages(r.pages); setResults(r.results); setTab('tool') }}
          onDelete={remove}
          onClear={clear}
          emptyText="No refreshes saved yet. Refresh a content section to save results."
        />
      ) : (<>
      {/* Add page form */}
      <Card>
        <CardTitle className="mb-3">Add Declining Page</CardTitle>
        <p className="text-sm text-muted mb-4">
          Enter pages that are losing traffic. Caspira will use AI to rewrite stale sections with fresh 2026 content.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <input
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder="/best-project-management-software"
            className="bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors font-mono-jarvis"
          />
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Page title"
            className="bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors"
          />
          <input
            value={newSection}
            onChange={e => setNewSection(e.target.value)}
            placeholder="Section to refresh (e.g. Product rankings)"
            onKeyDown={e => e.key === 'Enter' && addPage()}
            className="bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors"
          />
        </div>
        <Button variant="primary" onClick={addPage} disabled={!newUrl.trim() || !newTitle.trim()}>
          <Plus size={13} /> Add Page
        </Button>
        {!isAIReady() && (
          <p className="text-[11px] text-muted mt-2">Add an AI key in Onboarding to refresh content.</p>
        )}
      </Card>

      {pages.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'PAGES TRACKED',      val: pages.length,                                              color: '#ef4444' },
              { label: 'SESSIONS LOST / MO', val: totalTrafficLost > 0 ? totalTrafficLost.toLocaleString() : '—', color: '#f59e0b' },
              { label: 'REFRESHED',          val: Object.keys(results).length,                              color: '#10b981' },
            ].map(s => (
              <Card key={s.label} className="text-center py-4">
                <div className="text-3xl font-display font-black mb-1" style={{ color: s.color }}>{s.val}</div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest">{s.label}</div>
              </Card>
            ))}
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Pages to Refresh</CardTitle>
            </div>

            <div className="space-y-3">
              {pages.map(page => {
                const delta    = trafficDelta(page)
                const isOpen   = expanded === page.id
                const hasResult = results[page.id]
                const sec      = selectedSec[page.id] ?? page.staleSections[0]

                return (
                  <div key={page.id} className="border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpanded(isOpen ? null : page.id)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-surface transition-colors cursor-pointer text-left"
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[page.priority] }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-tx truncate mb-0.5">{page.title}</div>
                        <div className="text-[10px] text-muted font-mono-jarvis">{page.url}</div>
                      </div>
                      {delta !== 0 && (
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-0.5 text-[11px] text-danger font-mono-jarvis justify-end">
                            <ArrowDownRight size={10} />{delta}%
                          </div>
                        </div>
                      )}
                      <Badge variant={page.priority === 'critical' ? 'red' : page.priority === 'high' ? 'amber' : 'purple'}>
                        {page.priority}
                      </Badge>
                      {hasResult && <Badge variant="green">Refreshed</Badge>}
                      <button onClick={e => { e.stopPropagation(); removePage(page.id) }}
                        className="text-muted hover:text-danger transition-colors cursor-pointer shrink-0">
                        <Trash2 size={12} />
                      </button>
                      {isOpen ? <ChevronUp size={14} className="text-muted shrink-0" /> : <ChevronDown size={14} className="text-muted shrink-0" />}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-border pt-4 bg-surface space-y-3">
                        <div>
                          <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-2">SECTIONS TO REFRESH</div>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {page.staleSections.map(s => (
                              <button key={s} onClick={() => setSelectedSec(p => ({ ...p, [page.id]: s }))}
                                className={`text-[11px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                                  sec === s ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted hover:border-accent/50'
                                }`}>
                                {s}
                              </button>
                            ))}
                          </div>
                          <Button
                            variant="primary"
                            onClick={() => refresh.mutate({ page, section: sec })}
                            disabled={refresh.isPending && refreshing === page.id || !isAIReady()}
                          >
                            {refresh.isPending && refreshing === page.id
                              ? <><Loader2 size={13} className="animate-spin" /> Refreshing…</>
                              : <>Refresh: {sec}</>
                            }
                          </Button>
                        </div>

                        {hasResult && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <div className="flex items-center gap-1.5 text-[10px] text-danger font-mono-jarvis tracking-widest mb-2">
                                <TrendingDown size={10} /> BEFORE (stale)
                              </div>
                              <div className="bg-[#ef444410] border border-[#ef444430] rounded-lg p-3 text-xs text-muted leading-relaxed">
                                {hasResult.before}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 text-[10px] text-accent3 font-mono-jarvis tracking-widest mb-2">
                                <CheckCircle2 size={10} /> AFTER (refreshed)
                              </div>
                              <div className="bg-[#10b98110] border border-[#10b98130] rounded-lg p-3 text-xs text-tx leading-relaxed">
                                {hasResult.after}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}

      {pages.length === 0 && (
        <Card className="text-center py-16">
          <Repeat2 size={40} className="text-muted mx-auto mb-3" strokeWidth={1} />
          <div className="font-display font-bold text-lg text-tx mb-1">No pages added yet</div>
          <div className="text-sm text-muted max-w-sm mx-auto">
            Add your declining pages above. Enter the URL, title, and which section needs refreshing — then let AI rewrite it with current 2026 data.
          </div>
        </Card>
      )}
      </>)}
    </div>
  )
}
