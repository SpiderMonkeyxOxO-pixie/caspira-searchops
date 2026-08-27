import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Target, Loader2, Link2, FileText, Calendar,
  Zap, ChevronRight, Download, AlertCircle, History, Trash2,
} from 'lucide-react'
import { callAI, isAIReady } from '@/lib/ai'
import { useStore } from '@/store'
import { callDFS, isDFSReady } from '@/lib/dataforseo'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { downloadCSV } from '@/lib/csv'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

// ─── Constants ────────────────────────────────────────────────────────────────

const BLUEPRINT_STORAGE_KEY = 'jarvis_blueprint_history'
const MAX_HISTORY = 20

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab      = 'blueprint' | 'content' | 'links' | 'onpage' | 'sprint' | 'history'
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
interface BlueprintRecord {
  id: string; savedAt: string; domain: string; market: string
  competitor: string; keyword: string; blueprint: string
  gaps: ContentGap[]; links: LinkGap[]; onpage: OnPageGap[]; sprint: SprintTask[]
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

// ─── Markets ─────────────────────────────────────────────────────────────────

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

function fmtDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  if (isToday) return `Today ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function downloadFullReport(r: BlueprintRecord) {
  const lines: string[] = [
    `# Outrank Blueprint — ${r.domain} vs ${r.competitor} · ${r.market}`,
    `Generated: ${new Date(r.savedAt).toLocaleString()}`,
    `Primary Keyword: ${r.keyword}`,
    '',
    '---',
    '',
    '## AI Blueprint',
    '',
    r.blueprint,
    '',
    '---',
    '',
    '## Content Gaps',
    '',
    '| Keyword | Volume | KD | Their Pos | Your Pos | Content Type | Priority |',
    '|---------|--------|----|-----------|----------|--------------|----------|',
    ...r.gaps.map(g =>
      `| ${g.kw} | ${g.vol} | ${g.kd} | ${g.theirPos} | ${g.yourPos ?? '—'} | ${g.type} | ${g.priority} |`
    ),
    '',
    '---',
    '',
    '## Link Opportunities',
    '',
    '| Domain | DA | Type | Outreach Angle |',
    '|--------|----|------|----------------|',
    ...r.links.map(l => `| ${l.domain} | ${l.da} | ${l.type} | ${l.angle} |`),
    '',
    '---',
    '',
    '## On-Page Quick Wins',
    '',
    '| Task | Impact | Effort | Action |',
    '|------|--------|--------|--------|',
    ...r.onpage.map(o => `| ${o.item} | ${o.impact} | ${o.effort} | ${o.action} |`),
    '',
    '---',
    '',
    '## 12-Week Sprint Plan',
    '',
    '| Week | Phase | Task | Type |',
    '|------|-------|------|------|',
    ...r.sprint.map(s => `| ${s.week} | ${s.phase} | ${s.task} | ${s.type} |`),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `blueprint-${r.competitor.replace(/\W+/g, '-')}-${r.market.replace(/\W+/g, '-')}-${r.savedAt.slice(0, 10)}.md`,
  })
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OutrankBlueprint() {
  const { domain } = useStore()

  const [market,     setMarket]     = useState('India')
  const [competitor, setCompetitor] = useState('')
  const [keyword,    setKeyword]    = useState('best project management software india')
  const [tab,        setTab]        = useState<Tab>('blueprint')

  // Results
  const [blueprint, setBlueprint] = useState('')
  const [gaps,      setGaps]      = useState<ContentGap[]>([])
  const [links,     setLinks]     = useState<LinkGap[]>([])
  const [onpage,    setOnpage]    = useState<OnPageGap[]>([])
  const [sprint,    setSprint]    = useState<SprintTask[]>([])

  // History
  const [records, setRecords] = useState<BlueprintRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem(BLUEPRINT_STORAGE_KEY) ?? '[]') }
    catch { return [] }
  })

  function saveRecord(bp: string, g: ContentGap[], l: LinkGap[], o: OnPageGap[], s: SprintTask[]) {
    const rec: BlueprintRecord = {
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),
      domain: domain || 'yoursite.com',
      market, competitor, keyword,
      blueprint: bp, gaps: g, links: l, onpage: o, sprint: s,
    }
    setRecords(prev => {
      const next = [rec, ...prev].slice(0, MAX_HISTORY)
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function deleteRecord(id: string) {
    setRecords(prev => {
      const next = prev.filter(r => r.id !== id)
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function clearAllRecords() {
    setRecords([])
    localStorage.removeItem(BLUEPRINT_STORAGE_KEY)
  }

  function loadRecord(r: BlueprintRecord) {
    setMarket(r.market)
    setCompetitor(r.competitor)
    setKeyword(r.keyword)
    setBlueprint(r.blueprint)
    setGaps(r.gaps)
    setLinks(r.links)
    setOnpage(r.onpage)
    setSprint(r.sprint)
    setTab('blueprint')
  }

  const highCount = gaps.filter(g => g.priority === 'HIGH').length

  function handleMarketChange(m: string) {
    setMarket(m)
    if (m.toLowerCase() === 'india')          setKeyword('best project management software india')
    else if (m.toLowerCase() === 'indonesia') setKeyword('software crm terbaik indonesia')
    else if (m.trim())                        setKeyword(`best project management software ${m.toLowerCase()}`)
    setBlueprint(''); setGaps([]); setLinks([]); setOnpage([]); setSprint([])
  }

  const generate = useMutation({
    mutationFn: async () => {
      const sys = `You are an elite SEO strategist with deep expertise in the ${market} market. Be direct, specific, and actionable. Every recommendation must name exact keywords, content types, or publication targets. No generic advice.`

      // Pre-fetch real DFS data to ground the AI
      let dfsContext = ''
      if (isDFSReady() && competitor.trim()) {
        try {
          const compClean = competitor.replace(/^https?:\/\//, '').replace(/\/$/, '')
          const ownClean  = (domain || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
          const [compOverview, compKws, ownKws] = await Promise.allSettled([
            callDFS('dataforseo_labs/google/domain_rank_overview/live', [{
              target: compClean, location_code: 2356, language_code: 'en',
            }]),
            callDFS('dataforseo_labs/google/keywords_for_site/live', [{
              target: compClean, location_code: 2356, language_code: 'en', limit: 50,
            }]),
            ownClean ? callDFS('dataforseo_labs/google/keywords_for_site/live', [{
              target: ownClean, location_code: 2356, language_code: 'en', limit: 50,
            }]) : Promise.resolve(null),
          ])

          const compMetrics = compOverview.status === 'fulfilled' ? compOverview.value : null
          const compKeywords: string[] = compKws.status === 'fulfilled'
            ? (compKws.value?.items ?? []).map((i: any) => i.keyword as string) : []
          const ownKeywords: string[] = ownKws.status === 'fulfilled' && ownKws.value
            ? (ownKws.value?.items ?? []).map((i: any) => i.keyword as string) : []

          const ownSet = new Set(ownKeywords.map(k => k.toLowerCase()))
          const gapKws = compKeywords.filter(k => !ownSet.has(k.toLowerCase()))

          if (compMetrics || compKeywords.length > 0) {
            dfsContext = `\n\nREAL DATAFORSEO DATA:
Competitor organic traffic: ${compMetrics?.metrics?.organic?.etv ?? 'unknown'}
Competitor organic keywords: ${compMetrics?.metrics?.organic?.count ?? 'unknown'}
Competitor top keywords: ${compKeywords.slice(0, 20).join(', ')}
Keyword gaps (competitor ranks, you don't): ${gapKws.slice(0, 20).join(', ')}
Your top keywords: ${ownKeywords.slice(0, 15).join(', ')}
`
          }
        } catch { /* ignore — fall back to pure AI */ }
      }

      const [bpRaw, dataRaw] = await Promise.allSettled([
        callAI(sys,
          `Generate a competitor outrank blueprint.

MY SITE: ${domain || 'yoursite.com'}
COMPETITOR: ${competitor}
TARGET MARKET: ${market}
PRIMARY KEYWORD: "${keyword}"${dfsContext}

Deliver each section with a clear heading:

**1. COMPETITIVE SNAPSHOT**
In 3 sentences: where is the competitor currently beating us, and where do we have a real advantage?

**2. #1 CONTENT OPPORTUNITY**
The single highest-impact content piece to publish in the next 30 days. Include: exact article title, target keyword, word count, content type, and why this page will outrank theirs.

**3. TOP 3 LINK ACQUISITION MOVES**
Three specific link building tactics for this niche in ${market}. For each: tactic name, exact target publication, outreach angle, realistic timeline.

**4. ON-PAGE QUICK WINS (THIS WEEK)**
Three specific on-page changes to implement immediately. Name the exact schema type, title tag formula, or hreflang tag.

**5. 30 / 60 / 90 DAY MILESTONES**
At each milestone: expected ranking position for "${keyword}" and one measurable SEO metric to hit.`,
          1800),

        callAI(sys,
          `Analyse ${domain || 'yoursite.com'} vs ${competitor} in ${market} for keyword "${keyword}".
Return ONLY valid JSON (no markdown, no explanation):
{
  "contentGaps": [
    {"kw":"exact keyword","vol":"8,400","kd":45,"theirPos":3,"yourPos":null,"type":"Product Review","priority":"HIGH"}
  ],
  "linkGaps": [
    {"domain":"site.com","da":65,"type":"Guest Post","angle":"specific pitch angle for this niche"}
  ],
  "onPage": [
    {"item":"Title tag on homepage","impact":"HIGH","effort":"LOW","action":"Exact change to implement"}
  ],
  "sprint": [
    {"week":"Week 1–2","phase":"30-day","task":"Specific actionable task","type":"Content"}
  ]
}
Rules:
- contentGaps: 8–10 items. Product reviews, buying guides, how-to guides. HIGH = high vol + they rank, we don't.
- linkGaps: 6–8 items. Publications relevant to ${market} market.
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
      const g = parsed.contentGaps ?? []
      const l = parsed.linkGaps    ?? []
      const o = parsed.onPage      ?? []
      const s = parsed.sprint      ?? []
      if (g.length) setGaps(g)
      if (l.length) setLinks(l)
      if (o.length) setOnpage(o)
      if (s.length) setSprint(s)
      setTab('blueprint')
      if (bp) saveRecord(bp, g, l, o, s)
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
          <Button variant="primary" onClick={() => generate.mutate()} disabled={generate.isPending || !market.trim() || !isAIReady()}>
            {generate.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
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
          ['history',   `History${records.length      ? ` (${records.length})` : ''}`],
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
                    <th className="text-center pb-2 font-medium">
                      <span className="inline-flex items-center gap-1">VOLUME <InfoTooltip text="Monthly search volume — estimated number of searches per month for this keyword in the target market." /></span>
                    </th>
                    <th className="text-center pb-2 font-medium">
                      <span className="inline-flex items-center gap-1">KD <InfoTooltip text="Keyword Difficulty (0–100) — how hard it is to rank on page 1. Below 40 is achievable; above 70 requires strong domain authority and links." /></span>
                    </th>
                    <th className="text-center pb-2 font-medium">
                      <span className="inline-flex items-center gap-1">THEIR POS <InfoTooltip text="The competitor's current ranking position for this keyword. A position of 1–3 means they dominate this keyword." /></span>
                    </th>
                    <th className="text-center pb-2 font-medium">
                      <span className="inline-flex items-center gap-1">YOUR POS <InfoTooltip text="Your site's current ranking position. '—' means you are not in the top 100 for this keyword." /></span>
                    </th>
                    <th className="text-left pb-2 font-medium pl-4">CONTENT TYPE</th>
                    <th className="text-center pb-2 font-medium">
                      <span className="inline-flex items-center gap-1">PRIORITY <InfoTooltip text="HIGH = high volume + competitor ranks, you don't — biggest opportunity. MED = moderate gap. LOW = low volume or very high difficulty." /></span>
                    </th>
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
                    <div className="flex items-center justify-center gap-0.5 text-[9px] text-muted font-mono-jarvis tracking-widest">
                      DA
                      <InfoTooltip text="Domain Authority (DA) — a 1–100 score predicting a domain's ranking strength. Higher DA = more link equity passed. Target DA 50+ for impactful links." size={10} />
                    </div>
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
                    <th className="text-center pb-2 font-medium w-20">
                      <span className="inline-flex items-center gap-1">IMPACT <InfoTooltip text="Estimated SEO impact if this task is completed. HIGH tasks directly affect rankings; LOW tasks provide marginal or indirect benefit." /></span>
                    </th>
                    <th className="text-center pb-2 font-medium w-20">
                      <span className="inline-flex items-center gap-1">EFFORT <InfoTooltip text="Estimated implementation effort. HIGH effort = developer work or content production. LOW effort = a quick copy or settings change." /></span>
                    </th>
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

      {/* ── HISTORY ── */}
      {tab === 'history' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="mb-0.5">Blueprint History</CardTitle>
              <p className="text-[11px] text-muted">
                Blueprints auto-save after each generation — up to {MAX_HISTORY} stored locally
              </p>
            </div>
            {records.length > 0 && (
              <button onClick={clearAllRecords}
                className="text-[11px] text-danger hover:text-danger/80 cursor-pointer transition-colors font-mono-jarvis">
                Clear all
              </button>
            )}
          </div>

          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <History size={40} className="mb-3 text-muted opacity-30" strokeWidth={1.25} />
              <div className="text-sm text-muted">No saved blueprints yet</div>
              <div className="text-xs text-muted mt-1">Generate a blueprint above — it will appear here automatically</div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {records.map(r => (
                <div key={r.id}
                  className="flex items-center gap-4 p-4 bg-surface border border-border rounded-xl hover:border-accent/40 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold text-tx truncate max-w-40">{r.competitor || '—'}</span>
                      <Badge variant="accent">{r.market}</Badge>
                      <span className="text-[10px] font-mono-jarvis text-muted">{r.domain}</span>
                    </div>
                    <div className="text-[11px] text-muted font-mono-jarvis truncate">{r.keyword}</div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted font-mono-jarvis">
                      <span>{fmtDate(r.savedAt)}</span>
                      {r.gaps.length > 0   && <span>{r.gaps.length} gaps</span>}
                      {r.links.length > 0  && <span>{r.links.length} links</span>}
                      {r.sprint.length > 0 && <span>{r.sprint.length} tasks</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => downloadFullReport(r)}
                      className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer font-mono-jarvis">
                      <Download size={11} /> Download
                    </button>
                    <button onClick={() => loadRecord(r)}
                      className="px-2.5 py-1 rounded-lg border border-accent/40 text-[11px] text-accent hover:bg-accent/10 cursor-pointer transition-colors font-mono-jarvis">
                      Load
                    </button>
                    <button onClick={() => deleteRecord(r.id)}
                      className="text-muted hover:text-danger cursor-pointer transition-colors p-1 rounded">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
