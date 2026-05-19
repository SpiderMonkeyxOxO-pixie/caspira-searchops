import { useState } from 'react'
import { Eye, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { callAI, isAIReady, getActiveProvider } from '@/lib/ai'
import { useStore } from '@/store'

type Tab = 'overview' | 'optimize'
type CheckStatus = 'done' | 'pending' | 'partial'
type Impact = 'High' | 'Medium' | 'Low'

interface CheckItem {
  id: string; title: string; desc: string
  impact: Impact; status: CheckStatus
}

const CHECKLIST: CheckItem[] = [
  { id:'faq',     title:'Add FAQ schema to all review pages',                     impact:'High',   status:'pending', desc:'FAQ schema is the #1 driver of Google AI Overview citations for casino queries. Every review page and guide needs FAQ markup.' },
  { id:'org',     title:'Add Organization + Review structured data',              impact:'High',   status:'pending', desc:'Organization schema with trust signals (address, license, founder) signals authority to AI crawlers evaluating citability.' },
  { id:'news',    title:'Earn citations in Indian / Indonesian news publications', impact:'High',   status:'pending', desc:'AI models heavily weight sites cited by mainstream news. Target Times of India, Detik.com, Kompas for iGaming mentions.' },
  { id:'expert',  title:'Publish 3+ expert-authored iGaming guides',              impact:'High',   status:'pending', desc:'Long-form authoritative guides with expert bylines are the primary content type cited in AI responses for "best casino" queries.' },
  { id:'authors', title:'Add expert credentials and author bios to all content',  impact:'Medium', status:'pending', desc:'Perplexity and ChatGPT prefer citing content with clear author expertise signals — full bio, credentials, social proof.' },
  { id:'brand',   title:'Build brand mention campaign (unlinked mentions)',        impact:'Medium', status:'pending', desc:'AI models train on unlinked brand mentions. A PR push targeting Indian gaming and sports media increases LLM brand awareness.' },
  { id:'speak',   title:'Add Speakable schema for voice and AI search',           impact:'Medium', status:'pending', desc:'Speakable schema marks your most AI-readable content, increasing the chance of direct citation in conversational AI responses.' },
  { id:'cite',    title:'Add data citations from authoritative sources',          impact:'Low',    status:'pending', desc:'Linking to government gambling regulations, academic studies, and industry reports improves trust signals for AI sourcing.' },
]

const CHECKLIST_KEY = 'jarvis_aivisibility_checklist'

function loadChecklist(): CheckItem[] {
  try {
    const saved = JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? '{}') as Record<string, CheckStatus>
    return CHECKLIST.map(c => ({ ...c, status: saved[c.id] ?? c.status }))
  } catch { return CHECKLIST }
}

function saveChecklist(items: CheckItem[]) {
  const map: Record<string, CheckStatus> = {}
  items.forEach(c => { map[c.id] = c.status })
  localStorage.setItem(CHECKLIST_KEY, JSON.stringify(map))
}

export function AIVisibility() {
  const { domain } = useStore()
  const aiReady  = isAIReady()
  const provider = getActiveProvider()

  const [activeTab,  setActiveTab]  = useState<Tab>('overview')
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set())
  const [checklist,  setChecklist]  = useState<CheckItem[]>(loadChecklist)
  const [aiReport,   setAiReport]   = useState<string | null>(null)
  const [aiLoading,  setAiLoading]  = useState(false)
  const [aiError,    setAiError]    = useState<string | null>(null)

  const doneCount = checklist.filter(c => c.status === 'done').length

  const TABS = [
    { id: 'overview'  as Tab, label: 'Overview & AI Report' },
    { id: 'optimize'  as Tab, label: `Optimization (${doneCount}/${checklist.length})` },
  ]

  async function generateReport() {
    if (aiLoading) return
    setAiLoading(true)
    setAiError(null)
    try {
      const site = domain || 'your casino site'
      const report = await callAI(
        'You are an AI Visibility (AEO) expert for iGaming sites in India and Indonesia. Write concise, actionable strategy reports.',
        `Generate an AI Visibility strategy report for: ${site}

Cover:
1. Current AI platform landscape for iGaming keywords (ChatGPT, Google AIO, Perplexity, Gemini, Bing Copilot)
2. Top 3 quick wins to get cited in AI responses for casino/betting queries in India & Indonesia
3. Content types AI models prefer to cite (FAQ, structured data, authoritative guides)
4. 30-day action plan with specific tasks

Be specific, direct, and actionable. Format with clear sections and bullet points.`,
        1500,
      )
      setAiReport(report)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Report generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function cycleStatus(id: string) {
    const order: CheckStatus[] = ['pending', 'partial', 'done']
    const updated = checklist.map(c => {
      if (c.id !== id) return c
      return { ...c, status: order[(order.indexOf(c.status) + 1) % order.length] }
    })
    setChecklist(updated)
    saveChecklist(updated)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="mb-1">AI Visibility</CardTitle>
            <p className="text-sm text-muted leading-relaxed max-w-xl">
              Track how your casino site appears inside ChatGPT, Google AI Overviews, Perplexity, Gemini,
              and Bing Copilot. AEO (Answer Engine Optimization) is the next frontier in iGaming search.
            </p>
          </div>
          <Button variant="primary" onClick={generateReport} disabled={!aiReady || aiLoading}>
            {aiLoading ? 'Generating…' : 'AI Strategy Report'}
          </Button>
        </div>

        {aiError && (
          <div className="mt-3 text-xs text-danger flex items-center gap-1.5">
            <AlertCircle size={11} /> {aiError}
          </div>
        )}
        {!aiReady && (
          <div className="mt-3 text-xs text-muted flex items-center gap-1.5">
            <AlertCircle size={11} className="text-amber-400" />
            Add an OpenRouter or Anthropic key in Onboarding to generate AI reports.
          </div>
        )}
      </Card>

      {/* Tabs */}
      <Card className="p-0">
        <div className="flex border-b border-border">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn(
                'px-4 py-3 text-xs font-medium cursor-pointer transition-colors border-b-2 -mb-px',
                activeTab === t.id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-tx'
              )}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {aiReport ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-tx flex items-center gap-1.5">
                      <Sparkles size={12} className="text-accent" />
                      AI Visibility Strategy Report
                      <span className="text-[10px] text-muted font-normal ml-1">
                        via {provider === 'openrouter' ? 'OpenRouter' : 'Claude Sonnet'}
                      </span>
                    </span>
                    <button onClick={() => setAiReport(null)} className="text-[10px] text-muted hover:text-tx cursor-pointer">Clear</button>
                  </div>
                  <div className="text-xs text-tx leading-relaxed whitespace-pre-wrap bg-surface rounded-lg p-4 max-h-96 overflow-y-auto">
                    {aiReport}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Eye size={40} className="text-muted mx-auto mb-3" strokeWidth={1} />
                  <div className="text-sm font-semibold text-tx mb-1">No AI visibility data yet</div>
                  <div className="text-xs text-muted max-w-sm mx-auto mb-4">
                    Real-time AI platform monitoring (ChatGPT, Perplexity, Google AIO) requires direct API access.
                    Click "AI Strategy Report" above for actionable recommendations based on your domain.
                  </div>
                  <Button variant="primary" onClick={generateReport} disabled={!aiReady || aiLoading}>
                    Generate AI Strategy Report
                  </Button>
                </div>
              )}

              {/* Platform note */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { name: 'Google AI Overviews', color: '#4285F4', note: 'Add FAQ + Organization schema to your pages to increase citation chances.' },
                  { name: 'ChatGPT / Perplexity', color: '#10a37f', note: 'Build authoritative backlinks and earn mentions in news publications.' },
                  { name: 'Gemini / Bing Copilot', color: '#8E44AD', note: 'Ensure your E-E-A-T signals (author bios, expert credentials) are strong.' },
                ].map(p => (
                  <div key={p.name} className="p-3 rounded-xl border border-border bg-surface space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                      <span className="text-[11px] font-semibold text-tx">{p.name}</span>
                    </div>
                    <div className="text-[11px] text-muted leading-relaxed">{p.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── OPTIMIZATION CHECKLIST ── */}
          {activeTab === 'optimize' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-muted">
                  Click the status icon to cycle: <span className="font-mono-jarvis">pending → partial → done</span>. Progress is saved locally.
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono-jarvis text-muted">
                  <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-accent3" /> Done</span>
                  <span className="flex items-center gap-1"><AlertCircle  size={10} className="text-accent4" /> Partial</span>
                  <span className="flex items-center gap-1"><XCircle      size={10} className="text-danger"  /> Pending</span>
                </div>
              </div>

              {(['High', 'Medium', 'Low'] as const).map(impact => {
                const items = checklist.filter(c => c.impact === impact)
                return (
                  <div key={impact}>
                    <div className="text-[10px] font-mono-jarvis tracking-widest mb-2" style={{
                      color: impact === 'High' ? '#ef4444' : impact === 'Medium' ? '#f59e0b' : '#5a7a9a'
                    }}>
                      {impact.toUpperCase()} IMPACT
                    </div>
                    <div className="space-y-2">
                      {items.map(item => (
                        <Card key={item.id} className="p-0 overflow-hidden">
                          <div onClick={() => toggleExpand(item.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface transition-colors">
                            <button onClick={e => { e.stopPropagation(); cycleStatus(item.id) }} className="shrink-0 cursor-pointer">
                              {item.status === 'done'
                                ? <CheckCircle2 size={16} className="text-accent3" />
                                : item.status === 'partial'
                                ? <AlertCircle  size={16} className="text-accent4" />
                                : <XCircle      size={16} className="text-danger" />}
                            </button>
                            <span className={cn('flex-1 text-sm font-medium', item.status === 'done' ? 'text-muted line-through' : 'text-tx')}>
                              {item.title}
                            </span>
                            <Badge variant={impact === 'High' ? 'red' : impact === 'Medium' ? 'amber' : 'muted'}>{impact}</Badge>
                            {expanded.has(item.id)
                              ? <ChevronDown  size={13} className="text-muted shrink-0" />
                              : <ChevronRight size={13} className="text-muted shrink-0" />}
                          </div>
                          {expanded.has(item.id) && (
                            <div className="border-t border-border px-5 pb-3 pt-2.5 text-xs text-muted leading-relaxed">
                              {item.desc}
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
