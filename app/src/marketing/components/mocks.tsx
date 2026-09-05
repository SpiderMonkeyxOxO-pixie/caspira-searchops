import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, Cell } from 'recharts'
import {
  LayoutGrid, LineChart as LineIcon, Search, Sparkles, Wrench, FileBarChart,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const rail = [LayoutGrid, LineIcon, Search, Sparkles, Wrench, FileBarChart]

/** Shared app chrome — the sidebar rail + titlebar every mock sits inside. */
export function MockShell({
  title, active, badge = 'Live', children, className,
}: {
  title: string
  active: number
  badge?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      'rounded-2xl bg-white border border-[#dbe4ee] overflow-hidden',
      'shadow-[0_24px_60px_-30px_rgba(13,27,46,0.45)]',
      className
    )}>
      <div className="flex h-full">
        <div className="w-12 bg-[#f4f7fb] border-r border-[#e5ecf4] flex flex-col items-center py-3 gap-1 shrink-0">
          {rail.map((Icon, i) => (
            <div key={i} className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              i === active ? 'bg-[#00d4ff]/15 text-[#0284a5] border border-[#00d4ff]/40' : 'text-[#8ba3bd]'
            )}>
              <Icon size={14} strokeWidth={1.75} />
            </div>
          ))}
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="h-11 border-b border-[#e5ecf4] flex items-center justify-between px-4 shrink-0">
            <span className="text-[11px] font-mono-jarvis uppercase tracking-[2px] text-[#1a2844]">{title}</span>
            <span className="text-[10px] font-mono-jarvis uppercase tracking-[1.5px] text-[#10b981]">● {badge}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  )
}

const Row = ({ left, right, tone = 'default' }: { left: React.ReactNode; right: React.ReactNode; tone?: 'default' | 'up' | 'down' }) => (
  <div className="flex items-center justify-between gap-3 py-2 border-t border-[#eef3f8] first:border-t-0">
    <span className="text-[12.5px] text-[#1a2844] truncate">{left}</span>
    <span className={cn(
      'font-mono-jarvis text-[11px] shrink-0',
      tone === 'up' ? 'text-[#10b981]' : tone === 'down' ? 'text-[#ef4444]' : 'text-[#6b84a0]'
    )}>{right}</span>
  </div>
)

const trend = [320, 352, 331, 402, 438, 470, 452, 528, 566, 601, 655, 712].map((v, d) => ({ d, v }))

export function RankTrackerMock() {
  return (
    <MockShell title="Rank Tracker" active={1} className="h-full">
      <div className="px-4 pt-3">
        <div className="flex items-baseline gap-2">
          <span className="font-hero font-extrabold text-[26px] tracking-[-0.03em] text-[#0d1b2e] leading-none">12,840</span>
          <span className="text-[11px] font-semibold text-[#10b981]">+38%</span>
        </div>
        <div className="text-[10px] font-mono-jarvis uppercase tracking-[1.5px] text-[#8ba3bd] mt-1">Organic clicks · 90d</div>
        <div className="h-[64px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} fill="url(#mkFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="px-4 pb-4 mt-1">
        <Row left="project management software" right="#3  +4" tone="up" />
        <Row left="seo audit checklist" right="#5  +2" tone="up" />
        <Row left="ai content writer" right="#8  +11" tone="up" />
        <Row left="technical seo crawler" right="#6  −1" tone="down" />
      </div>
    </MockShell>
  )
}

export function SiteAuditMock() {
  const issues = [
    { t: 'Missing meta description', n: 12, bad: false },
    { t: 'Title tag too long', n: 8, bad: false },
    { t: 'Broken internal link', n: 3, bad: true },
    { t: 'Image missing alt text', n: 21, bad: false },
  ]
  return (
    <MockShell title="Site Audit" active={4} className="h-full">
      <div className="px-4 pt-4 flex items-center gap-4">
        <div className="w-[54px] h-[54px] rounded-full border-[5px] border-[#10b981] flex items-center justify-center shrink-0">
          <span className="font-hero font-extrabold text-[17px] text-[#0d1b2e] leading-none">92</span>
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-mono-jarvis uppercase tracking-[1.5px] text-[#8ba3bd]">Health score</div>
          <div className="text-[12.5px] text-[#1a2844] mt-1">142 checks passed · 44 to fix</div>
        </div>
      </div>
      <div className="px-4 pb-4 mt-3">
        {issues.map(i => (
          <div key={i.t} className="flex items-center justify-between gap-3 py-2 border-t border-[#eef3f8]">
            <span className="flex items-center gap-2 min-w-0">
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', i.bad ? 'bg-[#ef4444]' : 'bg-[#f59e0b]')} />
              <span className="text-[12.5px] text-[#1a2844] truncate">{i.t}</span>
            </span>
            <span className="font-mono-jarvis text-[11px] text-[#6b84a0] shrink-0">{i.n}</span>
          </div>
        ))}
      </div>
    </MockShell>
  )
}

export function KeywordExplorerMock() {
  const kws = [
    { k: 'seo reporting software', v: '8.1K', kd: 34 },
    { k: 'white label seo reports', v: '2.9K', kd: 21 },
    { k: 'automated seo audit', v: '1.7K', kd: 28 },
    { k: 'rank tracking api', v: '900', kd: 15 },
  ]
  return (
    <MockShell title="Keyword Explorer" active={2} badge="Enriched" className="h-full">
      <div className="px-4 pt-3">
        <div className="rounded-lg border border-[#e5ecf4] px-3 py-2 text-[12px] text-[#6b84a0] bg-[#fafcfe]">
          seo reporting <span className="text-[#a8bccf]">— 412 related terms</span>
        </div>
        <div className="flex items-center justify-between text-[9px] font-mono-jarvis uppercase tracking-[1.5px] text-[#8ba3bd] mt-3 pb-1.5 border-b border-[#eef3f8]">
          <span>Keyword</span><span>Vol · KD</span>
        </div>
      </div>
      <div className="px-4 pb-4">
        {kws.map(k => (
          <div key={k.k} className="flex items-center justify-between gap-3 py-2 border-t border-[#eef3f8] first:border-t-0">
            <span className="text-[12.5px] text-[#1a2844] truncate">{k.k}</span>
            <span className="flex items-center gap-2 shrink-0 font-mono-jarvis text-[11px]">
              <span className="text-[#1a2844]">{k.v}</span>
              <span className={cn('px-1.5 rounded', k.kd < 25 ? 'bg-[#10b98118] text-[#10b981]' : 'bg-[#f59e0b18] text-[#b57500]')}>
                {k.kd}
              </span>
            </span>
          </div>
        ))}
      </div>
    </MockShell>
  )
}

export function ContentGapMock() {
  const bars = [
    { n: 'you', v: 34, me: true }, { n: 'comp a', v: 78 },
    { n: 'comp b', v: 61 }, { n: 'comp c', v: 52 },
  ]
  return (
    <MockShell title="Content Gap" active={2} badge="3 rivals" className="h-full">
      <div className="px-4 pt-3">
        <div className="text-[10px] font-mono-jarvis uppercase tracking-[1.5px] text-[#8ba3bd]">Keywords they rank for, you don't</div>
        <div className="font-hero font-extrabold text-[26px] tracking-[-0.03em] text-[#0d1b2e] leading-none mt-1.5">1,284</div>
        <div className="h-[72px] mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                {bars.map((b, i) => <Cell key={i} fill={b.me ? '#00d4ff' : '#dbe4ee'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex mt-1.5">
          {bars.map(b => (
            <span key={b.n} className={cn(
              'flex-1 text-center text-[9px] font-mono-jarvis uppercase tracking-[1px]',
              b.me ? 'text-[#0284a5]' : 'text-[#a8bccf]'
            )}>{b.n}</span>
          ))}
        </div>
      </div>
      <div className="px-4 pb-4 mt-2">
        <Row left="best seo tools for agencies" right="opportunity" tone="up" />
        <Row left="seo audit template" right="opportunity" tone="up" />
        <Row left="serp tracking guide" right="opportunity" tone="up" />
      </div>
    </MockShell>
  )
}

export function ArticleWriterMock() {
  return (
    <MockShell title="Article Writer" active={3} badge="AI" className="h-full">
      <div className="px-4 pt-3">
        <div className="flex gap-1.5 flex-wrap">
          {['H1', '6 × H2', '1,800 words', 'Claude'].map(t => (
            <span key={t} className="text-[10px] font-mono-jarvis px-2 py-0.5 rounded-full bg-[#eef3f8] text-[#41627a]">{t}</span>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="text-[13px] font-semibold text-[#0d1b2e]">The complete SEO reporting checklist</div>
          {[100, 92, 97, 74].map((w, i) => (
            <div key={i} className="h-2 rounded bg-[#eef3f8]" style={{ width: `${w}%` }} />
          ))}
          <div className="text-[12px] font-semibold text-[#0d1b2e] pt-2">Why reporting cadence matters</div>
          {[96, 88].map((w, i) => (
            <div key={i} className="h-2 rounded bg-[#eef3f8]" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
      <div className="px-4 pb-4 mt-3 flex items-center gap-2 border-t border-[#eef3f8] pt-3">
        <span className="text-[10px] font-mono-jarvis uppercase tracking-[1.5px] text-[#8ba3bd]">SEO score</span>
        <span className="font-mono-jarvis text-[12px] text-[#10b981]">94 / 100</span>
      </div>
    </MockShell>
  )
}

export function AgencyViewMock() {
  const sites = [
    { d: 'client-one.com', s: 94, t: '+18%' },
    { d: 'client-two.io', s: 81, t: '+7%' },
    { d: 'client-three.co', s: 67, t: '−3%' },
    { d: 'client-four.net', s: 88, t: '+12%' },
  ]
  return (
    <MockShell title="Agency View" active={0} badge="4 sites" className="h-full">
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between text-[9px] font-mono-jarvis uppercase tracking-[1.5px] text-[#8ba3bd] pb-1.5 border-b border-[#eef3f8]">
          <span>Domain</span><span>Health · Traffic</span>
        </div>
      </div>
      <div className="px-4 pb-4">
        {sites.map(s => (
          <div key={s.d} className="flex items-center justify-between gap-3 py-2.5 border-t border-[#eef3f8] first:border-t-0">
            <span className="text-[12.5px] text-[#1a2844] truncate">{s.d}</span>
            <span className="flex items-center gap-2 shrink-0 font-mono-jarvis text-[11px]">
              <span className={cn(
                'px-1.5 rounded',
                s.s >= 85 ? 'bg-[#10b98118] text-[#10b981]' : s.s >= 75 ? 'bg-[#f59e0b18] text-[#b57500]' : 'bg-[#ef444418] text-[#ef4444]'
              )}>{s.s}</span>
              <span className={s.t.startsWith('+') ? 'text-[#10b981]' : 'text-[#ef4444]'}>{s.t}</span>
            </span>
          </div>
        ))}
      </div>
    </MockShell>
  )
}
