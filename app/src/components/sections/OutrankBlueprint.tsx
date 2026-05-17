import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Target, Loader2, Link2, FileText, Calendar,
  Zap, ChevronRight, Download, AlertCircle,
} from 'lucide-react'
import { callAI, isAIReady } from '@/lib/ai'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { downloadCSV } from '@/lib/csv'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab      = 'blueprint' | 'content' | 'links' | 'onpage' | 'sprint'
type Priority = 'HIGH' | 'MED' | 'LOW'

interface ContentGap {
  kw: string; vol: string; kd: number
  theirPos: number; yourPos: number | null
  type: string; priority: Priority
}
interface LinkGap    { domain: string; da: number; type: string; angle: string }
interface OnPageGap  { item: string; impact: Priority; effort: Priority; action: string }
interface SprintTask {
  week: string; phase: '30-day' | '60-day' | '90-day'
  task: string; type: 'Content' | 'Links' | 'Technical' | 'Review'
}

// ─── Color maps ───────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<Priority, string> = {
  HIGH: '#ef4444', MED: '#f59e0b', LOW: '#6b7280',
}
const TASK_COLOR: Record<string, string> = {
  Content: '#00d4ff', Links: '#7c3aed', Technical: '#f59e0b', Review: '#10b981',
}
const PHASE_COLOR: Record<string, string> = {
  '30-day': '#00d4ff', '60-day': '#7c3aed', '90-day': '#10b981',
}

// ─── Markets & competitors ────────────────────────────────────────────────────

const QUICK_MARKETS = [
  'India', 'Indonesia', 'Philippines', 'Malaysia',
  'Thailand', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'Brazil',
]


function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const match   = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    return match ? (JSON.parse(match[0]) as T) : fallback
  } catch { return fallback }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OutrankBlueprint() {
  const { domain } = useStore()

  const [market,     setMarket]     = useState('India')
  const [competitor, setCompetitor] = useState('')
  const [keyword,    setKeyword]    = useState('best online casino india')
  const [tab,        setTab]        = useState<Tab>('blueprint')

  // Results
  const [blueprint, setBlueprint] = useState('')
  const [gaps,      setGaps]      = useState<ContentGap[]>([])
  const [links,     setLinks]     = useState<LinkGap[]>([])
  const [onpage,    setOnpage]    = useState<OnPageGap[]>([])
  const [sprint,    setSprint]    = useState<SprintTask[]>([])

  const highCount = gaps.filter(g => g.priority === 'HIGH').length

  function handleMarketChange(m: string) {
    setMarket(m)
    if (m.toLowerCase() === 'india')          setKeyword('best online casino india')
    else if (m.toLowerCase() === 'indonesia') setKeyword('slot online terpercaya')
    else if (m.trim())                        setKeyword(`best online casino ${m.toLowerCase()}`)
    setBlueprint(''); setGaps([]); setLinks([]); setOnpage([]); setSprint([])
  }

  const generate = useMutation({
    mutationFn: async () => {
      const sys = `You are an elite iGaming SEO strategist with deep expertise in the ${market} online casino market. Be direct, specific, and actionable. Every recommendation must name exact keywords, content types, or publication targets. No generic advice.`

      const [bpRaw, dataRaw] = await Promise.allSettled([
        // Call 1 — narrative blueprint
        callAI(sys,
          `Generate a competitor outrank blueprint.

MY SITE: ${domain || 'yoursite.com'}
COMPETITOR: ${competitor}
TARGET MARKET: ${market}
PRIMARY KEYWORD: "${keyword}"

Deliver each section with a clear heading:

**1. COMPETITIVE SNAPSHOT**
In 3 sentences: where is the competitor currently beating us, and where do we have a real advantage?

**2. #1 CONTENT OPPORTUNITY**
The single highest-impact content piece to publish in the next 30 days. Include: exact article title, target keyword, word count, content type, and why this page will outrank theirs.

**3. TOP 3 LINK ACQUISITION MOVES**
Three specific link building tactics for iGaming in ${market}. For each: tactic name, exact target publication, outreach angle, realistic timeline.

**4. ON-PAGE QUICK WINS (THIS WEEK)**
Three specific on-page changes to implement immediately. Name the exact schema type, title tag formula, or hreflang tag.

**5. 30 / 60 / 90 DAY MILESTONES**
At each milestone: expected ranking position for "${keyword}" and one measurable SEO metric to hit.`,
          1800),

        // Call 2 — structured tab data
        callAI(sys,
          `Analyse ${domain || 'yoursite.com'} vs ${competitor} in ${market} for keyword "${keyword}".
Return ONLY valid JSON (no markdown, no explanation):
{
  "contentGaps": [
    {"kw":"exact keyword","vol":"8,400","kd":45,"theirPos":3,"yourPos":null,"type":"Bonus Review","priority":"HIGH"}
  ],
  "linkGaps": [
    {"domain":"site.com","da":65,"type":"Guest Post","angle":"specific pitch angle for casino niche"}
  ],
  "onPage": [
    {"item":"Title tag on homepage","impact":"HIGH","effort":"LOW","action":"Exact change to implement"}
  ],
  "sprint": [
    {"week":"Week 1–2","phase":"30-day","task":"Specific actionable task","type":"Content"}
  ]
}
Rules:
- contentGaps: 8–10 items. Casino reviews, bonus pages, game guides. HIGH = high vol + they rank, we don't.
- linkGaps: 6–8 items. Gambling publications relevant to ${market} market.
- onPage: 8–10 items. Schema, title tags, meta, content structure, internal links, page speed.
- sprint: 12–14 tasks. 30-day = foundation, 60-day = content+links, 90-day = review+scale.
- type values: Content | Links | Technical | Review`,
          2500),
      ])

      return {
        blueprint: bpRaw.status   === 'fulfilled' ? bpRaw.value   : '',
        data:      dataRaw.status === 'fulfilled' ? dataRaw.value : '{}',
      }
    },
    onSuccess: ({ blueprint: bp, data }) => {
      setBlueprint(bp)
      const parsed = parseJSON<{
        contentGaps?: ContentGap[]; linkGaps?: LinkGap[]
        onPage?: OnPageGap[]; sprint?: SprintTask[]
      }>(data, {})
      if (parsed.contentGaps?.length) setGaps(parsed.contentGaps)
      if (parsed.linkGaps?.length)    setLinks(parsed.linkGaps)
      if (parsed.onPage?.length)      setOnpage(parsed.onPage)
      if (parsed.sprint?.length)      setSprint(parsed.sprint)
      setTab('blueprint')
    },
  })

  const hasData = !!blueprint

  return (
    <div className="space-y-5">

      {/* ── Input panel ── */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#ef444415] flex items-center justify-center shrink-0">
            <Target size={18} className="text-danger" />
          </div>
          <div>
            <CardTitle>Competitor Outrank Blueprint</CardTitle>
            <div className="text-xs text-muted mt-0.5">
              AI-generated strategy to outrank any competitor in any market — keyword by keyword
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {/* Your domain */}
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">YOUR DOMAIN</div>
            <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-accent font-mono-jarvis truncate">
              {domain || 'yoursite.com'}
            </div>
          </div>

          {/* Market */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">TARGET MARKET</div>
            <input
              value={market}
              onChange={e => handleMarketChange(e.target.value)}
              placeholder="e.g. Philippines, UK, Brazil…"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx font-mono-jarvis outline-none focus:border-accent transition-colors mb-2"
            />
            <div className="flex flex-wrap gap-1">
              {QUICK_MARKETS.map(m => (
                <button key={m} onClick={() => handleMarketChange(m)}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer transition-all border',
                    market === m
                      ? 'bg-accent text-black border-accent'
                      : 'border-border text-muted hover:border-accent hover:text-tx'
                  )}>{m}</button>
              ))}
            </div>
          </div>

          {/* Competitor */}
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">COMPETITOR DOMAIN</div>
            <input
              value={competitor}
              onChange={e => setCompetitor(e.target.value)}
              placeholder="competitor.com"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx font-mono-jarvis outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Keyword */}
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">PRIMARY KEYWORD</div>
            <input value={keyword} onChange={e => setKeyword(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="ai" onClick={() => generate.mutate()} disabled={generate.isPending || !market.trim() || !isAIReady()}>
            {generate.isPending ? <Loader2 size={13} className="animate-spin" /> : <Target size={13} />}
            {generate.isPending ? 'Generating blueprint…' : `Generate Blueprint vs ${competitor}`}
          </Button>
          {!isAIReady() && (
            <span className="flex items-center gap-1.5 text-[11px] text-amber-400">
              <AlertCircle size={11} /> Add an AI key in Settings to unlock
            </span>
          )}
          {hasData && <Badge variant="green">Blueprint ready · {market}</Badge>}
        </div>
      </Card>

      {/* ── Summary chips ── */}
      <div className="flex items-center gap-3 flex-wrap text-[11px]">
        {[
          { icon: <FileText size={11} className="text-accent" />,   label: `${highCount || gaps.length} content gaps` },
          { icon: <Link2 size={11} className="text-accent2" />,     label: `${links.length} link opportunities` },
          { icon: <Zap size={11} className="text-accent4" />,       label: `${onpage.length} on-page wins` },
          { icon: <Calendar size={11} className="text-accent3" />,  label: `${sprint.length} sprint tasks` },
        ].map(c => (
          <div key={c.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-full">
            {c.icon}<span className="text-muted">{c.label}</span>
          </div>
        ))}
        <ChevronRight size={12} className="text-muted" />
        <span className="text-muted font-mono-jarvis">
          vs <span className="text-danger font-semibold">{competitor}</span>
          {' · '}<span className="text-accent">{market}</span> market
        </span>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl w-fit flex-wrap">
        {([
          ['blueprint', 'AI Blueprint'],
          ['content',   `Content Gaps${gaps.length   ? ` (${gaps.length})`   : ''}`],
          ['links',     `Link Gaps${links.length      ? ` (${links.length})`  : ''}`],
          ['onpage',    `On-Page${onpage.length       ? ` (${onpage.length})` : ''}`],
          ['sprint',    `12-Week Sprint${sprint.length ? ` (${sprint.length})` : ''}`],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[11px] font-semibold font-mono-jarvis tracking-wide transition-all cursor-pointer',
              tab === t ? 'bg-accent text-black' : 'text-muted hover:text-tx'
            )}>{label}</button>
        ))}
      </div>

      {/* ── AI BLUEPRINT ── */}
      {tab === 'blueprint' && (
        blueprint ? (
          <Card className="border-[#ef444430]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-danger" />
                <CardTitle className="text-danger">
                  Outrank Blueprint — {domain || 'Your Site'} vs {competitor} · {market}
                </CardTitle>
              </div>
              <button
                onClick={() => {
                  const blob = new Blob([blueprint], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = Object.assign(document.createElement('a'), { href: url, download: `blueprint-${competitor}-${market}.txt` })
                  document.body.appendChild(a); a.click(); document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                }}
                className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer"
              >
                <Download size={11} /> Export
              </button>
            </div>
            <div className="text-xs text-tx leading-relaxed whitespace-pre-wrap font-sans">{blueprint}</div>
          </Card>
        ) : (
          <Card className="border-dashed border-2 border-border">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Target size={40} className="mb-4 text-muted" strokeWidth={1} />
              <div className="text-sm font-semibold text-tx mb-2">Generate your blueprint above</div>
              <div className="text-xs text-muted max-w-sm leading-relaxed mb-6">
                Select a market, competitor, and keyword, then click Generate.
                All 5 tabs populate automatically in one shot.
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm text-left">
                {[
                  { icon: <FileText size={12} />, label: 'Content gaps to exploit' },
                  { icon: <Link2 size={12} />,    label: 'Link acquisition moves' },
                  { icon: <Zap size={12} />,      label: 'On-page quick wins' },
                  { icon: <Calendar size={12} />, label: '12-week sprint plan' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 p-3 bg-surface rounded-lg border border-border text-[11px] text-muted">
                    <span className="text-accent shrink-0">{item.icon}</span> {item.label}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )
      )}

      {/* ── CONTENT GAPS ── */}
      {tab === 'content' && (
        generate.isPending ? (
          <Card className="flex items-center justify-center py-16 gap-3 text-muted">
            <Loader2 size={20} className="animate-spin" /> Analysing content gaps…
          </Card>
        ) : gaps.length > 0 ? (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Content Gaps — {gaps.length} opportunities</CardTitle>
              <button
                onClick={() => downloadCSV(`content-gaps-${competitor}-${market}.csv`,
                  ['Keyword', 'Volume', 'KD', 'Their Pos', 'Your Pos', 'Content Type', 'Priority'],
                  gaps.map(g => [g.kw, g.vol, g.kd, g.theirPos, g.yourPos ?? '—', g.type, g.priority])
                )}
                className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer"
              >
                <Download size={11} /> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] text-muted font-mono-jarvis tracking-widest">
                    <th className="text-left pb-2 font-medium">KEYWORD</th>
                    <th className="text-center pb-2 font-medium">VOLUME</th>
                    <th className="text-center pb-2 font-medium">KD</th>
                    <th className="text-center pb-2 font-medium">THEIR POS</th>
                    <th className="text-center pb-2 font-medium">YOUR POS</th>
                    <th className="text-left pb-2 font-medium pl-4">CONTENT TYPE</th>
                    <th className="text-center pb-2 font-medium">PRIORITY</th>
                  </tr>
                </thead>
                <tbody>
                  {[...gaps].sort((a, b) => {
                    const o: Record<Priority, number> = { HIGH: 0, MED: 1, LOW: 2 }
                    return o[a.priority] - o[b.priority]
                  }).map((g, i) => (
                    <tr key={i} className="border-b border-border/40 hover:bg-surface transition-colors">
                      <td className="py-2.5 font-medium text-tx pr-4">{g.kw}</td>
                      <td className="py-2.5 text-center font-mono-jarvis text-muted">{g.vol}</td>
                      <td className="py-2.5 text-center font-mono-jarvis"
                        style={{ color: g.kd > 70 ? '#ef4444' : g.kd > 40 ? '#f59e0b' : '#10b981' }}>
                        {g.kd}
                      </td>
                      <td className="py-2.5 text-center font-mono-jarvis text-danger">{g.theirPos}</td>
                      <td className="py-2.5 text-center font-mono-jarvis text-muted">{g.yourPos ?? '—'}</td>
                      <td className="py-2.5 pl-4 text-muted">{g.type}</td>
                      <td className="py-2.5 text-center">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            color:      PRIORITY_COLOR[g.priority],
                            background: PRIORITY_COLOR[g.priority] + '20',
                          }}>
                          {g.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card className="border-dashed border-2 border-border">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText size={36} className="mb-3 text-muted" strokeWidth={1} />
              <div className="text-sm font-semibold text-tx mb-1">No content gaps loaded</div>
              <div className="text-xs text-muted max-w-sm">Generate the AI Blueprint above to get keyword gap analysis for {market}.</div>
            </div>
          </Card>
        )
      )}

      {/* ── LINK GAPS ── */}
      {tab === 'links' && (
        generate.isPending ? (
          <Card className="flex items-center justify-center py-16 gap-3 text-muted">
            <Loader2 size={20} className="animate-spin" /> Mapping link opportunities…
          </Card>
        ) : links.length > 0 ? (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Link Opportunities — {links.length} targets</CardTitle>
              <button
                onClick={() => downloadCSV(`link-gaps-${competitor}-${market}.csv`,
                  ['Domain', 'DA', 'Link Type', 'Outreach Angle'],
                  links.map(l => [l.domain, l.da, l.type, l.angle])
                )}
                className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer"
              >
                <Download size={11} /> Export CSV
              </button>
            </div>
            <div className="space-y-3">
              {links.map((l, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-surface border border-border rounded-xl">
                  <div className="shrink-0 text-center">
                    <div className="text-xl font-display font-black text-accent2">{l.da}</div>
                    <div className="text-[9px] text-muted font-mono-jarvis tracking-widest">DA</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono-jarvis text-sm font-semibold text-accent truncate">{l.domain}</span>
                      <Badge variant="purple">{l.type}</Badge>
                    </div>
                    <div className="text-xs text-muted leading-relaxed">{l.angle}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="border-dashed border-2 border-border">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Link2 size={36} className="mb-3 text-muted" strokeWidth={1} />
              <div className="text-sm font-semibold text-tx mb-1">No link opportunities loaded</div>
              <div className="text-xs text-muted max-w-sm">Generate the AI Blueprint above to see link acquisition angles for {market}.</div>
            </div>
          </Card>
        )
      )}

      {/* ── ON-PAGE ── */}
      {tab === 'onpage' && (
        generate.isPending ? (
          <Card className="flex items-center justify-center py-16 gap-3 text-muted">
            <Loader2 size={20} className="animate-spin" /> Identifying on-page wins…
          </Card>
        ) : onpage.length > 0 ? (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>On-Page Quick Wins — {onpage.length} tasks</CardTitle>
              <button
                onClick={() => downloadCSV(`onpage-wins-${competitor}-${market}.csv`,
                  ['Task', 'Impact', 'Effort', 'Action'],
                  onpage.map(o => [o.item, o.impact, o.effort, o.action])
                )}
                className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer"
              >
                <Download size={11} /> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] text-muted font-mono-jarvis tracking-widest">
                    <th className="text-left pb-2 font-medium">TASK</th>
                    <th className="text-center pb-2 font-medium w-20">IMPACT</th>
                    <th className="text-center pb-2 font-medium w-20">EFFORT</th>
                    <th className="text-left pb-2 font-medium pl-4">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {[...onpage].sort((a, b) => {
                    const o: Record<Priority, number> = { HIGH: 0, MED: 1, LOW: 2 }
                    return o[a.impact] - o[b.impact]
                  }).map((o, i) => (
                    <tr key={i} className="border-b border-border/40 hover:bg-surface transition-colors">
                      <td className="py-2.5 font-medium text-tx pr-4">{o.item}</td>
                      <td className="py-2.5 text-center">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ color: PRIORITY_COLOR[o.impact], background: PRIORITY_COLOR[o.impact] + '20' }}>
                          {o.impact}
                        </span>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ color: PRIORITY_COLOR[o.effort], background: PRIORITY_COLOR[o.effort] + '20' }}>
                          {o.effort}
                        </span>
                      </td>
                      <td className="py-2.5 pl-4 text-muted leading-relaxed">{o.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card className="border-dashed border-2 border-border">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Zap size={36} className="mb-3 text-muted" strokeWidth={1} />
              <div className="text-sm font-semibold text-tx mb-1">No on-page recommendations loaded</div>
              <div className="text-xs text-muted max-w-sm">Generate the AI Blueprint above to see on-page quick wins vs {competitor}.</div>
            </div>
          </Card>
        )
      )}

      {/* ── SPRINT PLAN ── */}
      {tab === 'sprint' && (
        generate.isPending ? (
          <Card className="flex items-center justify-center py-16 gap-3 text-muted">
            <Loader2 size={20} className="animate-spin" /> Building 12-week sprint plan…
          </Card>
        ) : sprint.length > 0 ? (
          <Card>
            <div className="flex items-center justify-between mb-5">
              <CardTitle>12-Week Sprint Plan — {sprint.length} tasks</CardTitle>
              <button
                onClick={() => downloadCSV(`sprint-plan-${competitor}-${market}.csv`,
                  ['Week', 'Phase', 'Task', 'Type'],
                  sprint.map(s => [s.week, s.phase, s.task, s.type])
                )}
                className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer"
              >
                <Download size={11} /> Export CSV
              </button>
            </div>
            <div className="space-y-6">
              {(['30-day', '60-day', '90-day'] as const).map(phase => {
                const tasks = sprint.filter(s => s.phase === phase)
                if (!tasks.length) return null
                return (
                  <div key={phase}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: PHASE_COLOR[phase] }} />
                      <div className="text-[11px] font-bold font-mono-jarvis tracking-widest"
                        style={{ color: PHASE_COLOR[phase] }}>
                        {phase.toUpperCase()} PHASE
                      </div>
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-muted font-mono-jarvis">{tasks.length} tasks</span>
                    </div>
                    <div className="space-y-2">
                      {tasks.map((s, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-surface border border-border rounded-lg">
                          <div className="shrink-0 text-[9px] font-mono-jarvis font-bold px-2 py-1 rounded-md border"
                            style={{ color: PHASE_COLOR[phase], borderColor: PHASE_COLOR[phase] + '40', background: PHASE_COLOR[phase] + '10' }}>
                            {s.week}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-tx leading-relaxed">{s.task}</span>
                          </div>
                          <div className="shrink-0">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={{ color: TASK_COLOR[s.type] ?? '#6b7280', background: (TASK_COLOR[s.type] ?? '#6b7280') + '20' }}>
                              {s.type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        ) : (
          <Card className="border-dashed border-2 border-border">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar size={36} className="mb-3 text-muted" strokeWidth={1} />
              <div className="text-sm font-semibold text-tx mb-1">No sprint plan loaded</div>
              <div className="text-xs text-muted max-w-sm">Generate the AI Blueprint above to get a 12-week sprint plan for outranking {competitor} in {market}.</div>
            </div>
          </Card>
        )
      )}
    </div>
  )
}
