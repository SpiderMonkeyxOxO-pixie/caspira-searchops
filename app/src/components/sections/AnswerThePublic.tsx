import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronRight, Copy, Check, Download, Loader2, History } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { downloadCSV } from '@/lib/csv'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { callDFS, isDFSReady } from '@/lib/dataforseo'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'
import { cn } from '@/lib/utils'

interface ATPRecord {
  id: string; savedAt: string; label: string; sublabel: string
  topic: string; groups: QGroup[]
}

interface QGroup { category: string; color: string; keywords: string[] }

const Q_CATEGORIES = [
  { category: 'What',    color: '#00d4ff', prefix: 'what '    },
  { category: 'How',     color: '#10b981', prefix: 'how '     },
  { category: 'Why',     color: '#7c3aed', prefix: 'why '     },
  { category: 'Which',   color: '#f59e0b', prefix: 'which '   },
  { category: 'Is',      color: '#34d399', prefix: 'is '      },
  { category: 'Can',     color: '#ec4899', prefix: 'can '     },
  { category: 'Are',     color: '#a78bfa', prefix: 'are '     },
  { category: 'Will',    color: '#fb923c', prefix: 'will '    },
  { category: 'For',     color: '#06b6d4', prefix: ' for '    },
  { category: 'Without', color: '#64748b', prefix: ' without ' },
  { category: 'vs',      color: '#e879f9', prefix: ' vs '     },
]

function buildStaticGroups(topic: string): QGroup[] {
  const t = topic.trim() || 'online casino'
  return [
    { category: 'What', color: '#00d4ff', keywords: [`what is the best ${t}`, `what ${t} accepts UPI`, `what ${t} has the best bonus`, `what is the safest ${t} in india`, `what is ${t}`] },
    { category: 'How',  color: '#10b981', keywords: [`how to win at ${t}`, `how to deposit in ${t} india`, `how to withdraw from ${t}`, `how to choose ${t}`, `how to get bonus from ${t}`, `how to play ${t} on mobile`] },
    { category: 'Why',  color: '#7c3aed', keywords: [`why is ${t} popular in india`, `why use ${t} instead of sports betting`, `why is ${t} better than rummy`] },
    { category: 'Which',color: '#f59e0b', keywords: [`which ${t} is best for beginners`, `which ${t} pays the fastest`, `which ${t} has no withdrawal limit`, `which ${t} is legal in india`] },
    { category: 'Is',   color: '#34d399', keywords: [`is ${t} safe in india`, `is ${t} legal`, `is ${t} rigged`, `is ${t} better than rummy`] },
    { category: 'Can',  color: '#ec4899', keywords: [`can i play ${t} in india`, `can i win real money at ${t}`, `can i use paytm at ${t}`, `can ${t} ban my account`] },
    { category: 'Are',  color: '#a78bfa', keywords: [`are ${t}s legal in india`, `are ${t} games fair`, `are ${t} bonuses real`] },
    { category: 'Will', color: '#fb923c', keywords: [`will ${t} become legal in india`, `will ${t} ban my account`, `will i get taxed on ${t} winnings india`] },
    { category: 'For',  color: '#06b6d4', keywords: [`${t} for beginners india`, `${t} for real money`, `${t} for mobile android`, `${t} for indian players`] },
    { category: 'Without', color: '#64748b', keywords: [`${t} without verification india`, `${t} without deposit bonus`, `${t} without id proof`] },
    { category: 'vs',   color: '#e879f9', keywords: [`${t} vs sports betting`, `${t} vs rummy`, `${t} vs lottery india`, `${t} vs poker which is better`] },
  ]
}

function buildDFSGroups(keywords: string[]): QGroup[] {
  return Q_CATEGORIES.map(cat => ({
    category: cat.category,
    color:    cat.color,
    keywords: keywords
      .filter(kw => kw.toLowerCase().includes(cat.prefix))
      .slice(0, 10),
  })).filter(g => g.keywords.length > 0)
}

export function AnswerThePublic() {
  const [topic,     setTopic]     = useState('')
  const [generated, setGenerated] = useState(false)
  const [expanded,  setExpanded]  = useState<Set<string>>(new Set())
  const [copied,    setCopied]    = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [dfsGroups, setDfsGroups] = useState<QGroup[] | null>(null)
  const [tab,       setTab]       = useState<'tool' | 'history'>('tool')

  const { records, save, remove, clear } = useHistory<ATPRecord>('jarvis_atp_history')

  async function generate() {
    if (!topic.trim()) return
    if (!isDFSReady()) {
      const staticGroups = buildStaticGroups(topic)
      setDfsGroups(null)
      setGenerated(true)
      setExpanded(new Set(['What', 'How', 'Which']))
      save({ id: crypto.randomUUID(), savedAt: new Date().toISOString(), label: topic, sublabel: `${staticGroups.reduce((s, g) => s + g.keywords.length, 0)} keywords · static`, topic, groups: staticGroups })
      return
    }
    setLoading(true)
    let resolvedGroups: QGroup[] | null = null
    try {
      const result = await callDFS('dataforseo_labs/google/keyword_suggestions/live', [{
        keyword: topic.trim(), location_code: 2356, language_code: 'en', limit: 200,
      }])
      const keywords: string[] = (result?.items ?? []).map((i: any) => i.keyword as string)
      const groups = buildDFSGroups(keywords)
      resolvedGroups = groups.length > 0 ? groups : null
      setDfsGroups(resolvedGroups)
    } catch {
      setDfsGroups(null)
    } finally {
      setLoading(false)
      setGenerated(true)
      setExpanded(new Set(['What', 'How', 'Which']))
      const groupsToSave = resolvedGroups ?? buildStaticGroups(topic)
      save({ id: crypto.randomUUID(), savedAt: new Date().toISOString(), label: topic, sublabel: `${groupsToSave.reduce((s, g) => s + g.keywords.length, 0)} keywords · ${resolvedGroups ? 'DataForSEO' : 'static'}`, topic, groups: groupsToSave })
    }
  }

  function toggleGroup(cat: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }

  function exportCSV() {
    const rows = groups.flatMap(g => g.keywords.map(kw => [g.category, kw]))
    downloadCSV(
      `answer-the-public-${topic.trim().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Category', 'Keyword'],
      rows,
    )
  }

  const groups    = dfsGroups ?? buildStaticGroups(topic)
  const total     = groups.reduce((s, g) => s + g.keywords.length, 0)
  const questions = groups.slice(0, 8).reduce((s, g) => s + g.keywords.length, 0)
  const comparisons = groups.find(g => g.category === 'vs')?.keywords.length ?? 0
  const preps     = groups.filter(g => ['For', 'Without'].includes(g.category)).reduce((s, g) => s + g.keywords.length, 0)

  return (
    <div className="space-y-5">
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab('tool')} className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer', tab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>Answer the Public</button>
        <button onClick={() => setTab('history')} className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer', tab === 'history' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          <History size={11} /> History {records.length > 0 && `(${records.length})`}
        </button>
      </div>
      {tab === 'history' ? (
        <HistoryPanel records={records} onLoad={r => { setTopic(r.topic); setDfsGroups(r.groups); setGenerated(true); setExpanded(new Set(['What','How','Which'])); setTab('tool') }} onDelete={remove} onClear={clear} onDownload={r => { downloadCSV(`atp-${r.topic}-${r.savedAt.slice(0,10)}.csv`, ['Category','Keyword'], r.groups.flatMap(g => g.keywords.map(kw => [g.category, kw]))) }} emptyText="No research history yet. Generate questions to save results." />
      ) : (<>
      <Card>
        <CardTitle className="mb-1">Answer the Public</CardTitle>
        <p className="text-sm text-muted mb-4">
          Generate the full question and comparison keyword landscape for any casino topic. What, How, Why, Which, vs, and more — copy directly into content briefs.
        </p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <BookOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={topic}
              onChange={e => { setTopic(e.target.value); setGenerated(false) }}
              onKeyDown={e => e.key === 'Enter' && generate()}
              placeholder='Enter topic: "online casino", "teen patti", "slot online"…'
              className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors"
            />
          </div>
          <Button variant="primary" onClick={generate} disabled={!topic.trim() || loading}>
            {loading ? <Loader2 size={13} className="animate-spin" /> : null}
            {loading ? 'Fetching…' : 'Generate Questions'}
          </Button>
        </div>
      </Card>

      {generated && (
        <>
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-4 gap-4 flex-1">
              {[
                { label: 'TOTAL KEYWORDS', val: total,       color: '#00d4ff', tip: 'Total question and comparison keywords generated for this topic. Use these as content brief seeds or FAQ headings.' },
                { label: 'QUESTION TYPES', val: questions,   color: '#10b981', tip: 'Keywords framed as questions (What, How, Why, Which, Is, Can, Are, Will). These map to People Also Ask and Featured Snippet opportunities.' },
                { label: 'PREPOSITIONS',   val: preps,       color: '#f59e0b', tip: 'Keywords using prepositions (For, Without). These capture long-tail intent — e.g. "online casino for beginners india" targets a specific audience.' },
                { label: 'COMPARISONS',    val: comparisons, color: '#7c3aed', tip: 'VS comparison keywords — high-intent queries from users deciding between options. Great for dedicated comparison pages that convert well.' },
              ].map(k => (
                <Card key={k.label} className="text-center py-4">
                  <div className="text-2xl font-display font-black mb-1" style={{ color: k.color }}>{k.val}</div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-muted font-mono-jarvis tracking-widest">
                    {k.label}
                    <InfoTooltip text={k.tip} />
                  </div>
                </Card>
              ))}
            </div>
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer font-mono-jarvis ml-4 shrink-0">
              <Download size={12} /> Export CSV
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groups.map(g => {
              const isOpen = expanded.has(g.category)
              return (
                <Card key={g.category} className="p-0 overflow-hidden">
                  <button
                    onClick={() => toggleGroup(g.category)}
                    className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-display font-black text-base w-16 text-left" style={{ color: g.color }}>
                        {g.category}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono-jarvis font-bold"
                        style={{ color: g.color, background: g.color + '20' }}>
                        {g.keywords.length} keywords
                      </span>
                    </div>
                    {isOpen
                      ? <ChevronDown  size={13} className="text-muted shrink-0" />
                      : <ChevronRight size={13} className="text-muted shrink-0" />
                    }
                  </button>

                  {isOpen && (
                    <div className="border-t border-border px-4 pb-3 pt-2 space-y-2">
                      {g.keywords.map((kw, i) => (
                        <div key={i} className="flex items-center justify-between group">
                          <span className="text-sm text-tx">{kw}</span>
                          <button
                            onClick={() => copy(kw)}
                            className="shrink-0 p-1 text-muted hover:text-accent transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                          >
                            {copied === kw
                              ? <Check size={11} className="text-accent3" />
                              : <Copy  size={11} />
                            }
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </>
      )}

      {!generated && (
        <Card className="text-center py-16">
          <BookOpen size={40} className="text-muted mx-auto mb-3" strokeWidth={1} />
          <div className="font-display font-bold text-lg text-tx mb-1">What is the public asking?</div>
          <div className="text-sm text-muted max-w-sm mx-auto">
            Enter any casino topic above to generate 40+ question and comparison keywords instantly
          </div>
        </Card>
      )}
      </>)}
    </div>
  )
}
