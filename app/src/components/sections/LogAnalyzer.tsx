import { useState, useRef } from 'react'
import { ScrollText, FolderUp, TrendingDown, TrendingUp, AlertCircle, Bot, Filter } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface LogEntry { url: string; hits: number; status: number; bot: boolean; waste: boolean }
interface DayEntry  { day: string; crawls: number; pages: number }


const STATUS_COLOR: Record<number, string> = { 200: '#10b981', 301: '#7c3aed', 302: '#f59e0b', 404: '#ef4444', 410: '#ef4444' }

type FilterMode = 'all' | 'waste' | '404' | '301' | '200'

const FILTERS: { key: FilterMode; label: string }[] = [
  { key: 'all',   label: 'All URLs' },
  { key: '200',   label: '200 OK' },
  { key: '301',   label: '3xx Redirects' },
  { key: '404',   label: '4xx Errors' },
  { key: 'waste', label: 'Crawl Waste' },
]

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs">
      <div className="text-muted font-mono-jarvis mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="text-tx">{p.name}: <span className="font-semibold text-accent">{p.value}</span></div>
      ))}
    </div>
  )
}

export function LogAnalyzer() {
  const [loaded,  setLoaded]  = useState(false)
  const [filter,  setFilter]  = useState<FilterMode>('all')
  const [logEntries] = useState<LogEntry[]>([])
  const [crawlDays]  = useState<DayEntry[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const totalCrawls  = crawlDays.reduce((s, d) => s + d.crawls, 0)
  const wasteEntries = logEntries.filter(e => e.waste)
  const wasteHits    = wasteEntries.reduce((s, e) => s + e.hits, 0)
  const errCount     = logEntries.filter(e => e.status >= 400).length

  const filtered = logEntries.filter(e =>
    filter === 'all'   ? true :
    filter === 'waste' ? e.waste :
    filter === '404'   ? e.status >= 400 :
    filter === '301'   ? (e.status === 301 || e.status === 302) :
    e.status === 200
  )

  if (!loaded) {
    return (
      <div className="space-y-5">
        <Card>
          <CardTitle className="mb-3">Log File Analyzer</CardTitle>
          <p className="text-sm text-muted mb-6 leading-relaxed">
            Upload your server access log and Jarvis identifies exactly what Googlebot is crawling,
            where crawl budget is being wasted, and which pages Google is ignoring on your casino site.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { Icon: Bot,          label: 'Googlebot Tracking',   desc: 'Separate bot traffic from human visits' },
              { Icon: TrendingDown, label: 'Crawl Budget Waste',   desc: 'Identify 4xx, redirect chains, low-value URLs consuming crawl' },
              { Icon: AlertCircle,  label: 'Crawl Gaps',           desc: 'Pages Googlebot hasn\'t crawled in 30+ days' },
            ].map(({ Icon, label, desc }) => (
              <div key={label} className="p-4 bg-surface border border-border rounded-xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#00d4ff15] flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-accent" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-tx mb-0.5">{label}</div>
                  <div className="text-[10px] text-muted leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-accent/50 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".log,.txt,.gz" className="hidden" onChange={() => setLoaded(true)} />
            <ScrollText size={36} className="mx-auto mb-3 text-muted" strokeWidth={1} />
            <div className="text-sm font-semibold text-tx mb-1">Drop your access log here</div>
            <div className="text-xs text-muted mb-4">Supports Apache, Nginx, and Cloudflare log formats (.log, .txt, .gz)</div>
            <div className="flex justify-center gap-2">
              <Button variant="primary" onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>
                <FolderUp size={13} /> Browse Log File
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 p-3 bg-surface border border-border rounded-xl text-xs text-muted">
        <ScrollText size={13} className="text-accent shrink-0" />
        Log file uploaded. Full Apache/Nginx log parsing coming soon — data will populate automatically once parsing is live.
        <button onClick={() => setLoaded(false)} className="ml-auto text-accent hover:underline cursor-pointer shrink-0">Upload different file</button>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'GOOGLEBOT REQUESTS', val: totalCrawls.toLocaleString(), color: '#00d4ff' },
          { label: 'AVG / DAY',          val: Math.round(totalCrawls / 14), color: '#7c3aed' },
          { label: 'CRAWL WASTE HITS',   val: wasteHits,                    color: '#ef4444' },
          { label: 'ERROR URLS',         val: errCount,                     color: '#f59e0b' },
        ].map(s => (
          <Card key={s.label} className="text-center py-4">
            <div className="text-3xl font-display font-black mb-1" style={{ color: s.color }}>{s.val}</div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Daily crawl chart */}
      <Card>
        <CardTitle className="mb-4">Googlebot Crawl Activity — Last 14 Days</CardTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={crawlDays} barSize={14} barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--color-muted)', fontFamily: 'Roboto Mono' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--color-muted)', fontFamily: 'Roboto Mono' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="crawls" fill="#00d4ff" radius={[3,3,0,0]} name="Googlebot requests" />
            <Bar dataKey="pages"  fill="#7c3aed" radius={[3,3,0,0]} name="Unique pages" />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-1 text-[10px] text-muted">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent inline-block" />Requests</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent2 inline-block" />Unique pages</span>
        </div>
      </Card>

      {/* Crawl waste alert */}
      {wasteEntries.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-[#ef444415] border border-[#ef444430] rounded-xl">
          <AlertCircle size={16} className="text-danger mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-sm text-tx mb-1">
              {wasteHits} Googlebot requests wasted on low-value URLs
            </div>
            <div className="text-xs text-muted leading-relaxed">
              {wasteEntries.length} URLs (404 pages, redirect chains, 410 gone) are consuming {Math.round((wasteHits / totalCrawls) * 100)}% of your crawl budget.
              Fix or consolidate these to free up crawl for your casino review and bonus pages.
            </div>
          </div>
        </div>
      )}

      {/* URL table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>URL Crawl Log</CardTitle>
          <div className="flex gap-1">
            <Filter size={11} className="text-muted mr-1 self-center" />
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-mono-jarvis tracking-wide cursor-pointer transition-colors ${filter === f.key ? 'bg-accent text-black' : 'text-muted hover:text-tx'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          {filtered.map((entry, i) => (
            <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border ${entry.waste ? 'bg-[#ef444408] border-[#ef444430]' : 'bg-surface border-border'}`}>
              {entry.waste
                ? <TrendingDown size={12} className="text-danger shrink-0" />
                : <TrendingUp   size={12} className="text-accent3 shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono-jarvis text-tx truncate">{entry.url}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono-jarvis" style={{ color: STATUS_COLOR[entry.status] ?? '#6b7280' }}>
                  {entry.status}
                </span>
                <span className="text-[10px] text-muted font-mono-jarvis">{entry.hits} hits</span>
                {entry.waste && <Badge variant="red">Waste</Badge>}
                {entry.bot  && <Badge variant="muted">Bot</Badge>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-surface border border-border rounded-lg text-xs text-muted">
          <span className="text-accent font-semibold">Recommendation:</span>
          {' '}Fix the {wasteEntries.length} crawl-waste URLs — consolidate redirect chains to single 301s, and either 301 or 410 all 404 pages. This will redirect Googlebot toward your casino review and bonus pages.
        </div>
      </Card>
    </div>
  )
}
