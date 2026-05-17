import { useState } from 'react'
import { GitMerge, MousePointerClick, PoundSterling, BarChart2, ArrowUpRight, ArrowDownRight, Search, Activity } from 'lucide-react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardTitle } from '@/components/ui/Card'

interface CrossRow {
  query: string
  clicks: number
  impressions: number
  ctr: string
  position: number
  sessions: number
  conversions: number
  revenue: string
  revenueNum: number
  trend: 'up' | 'down' | 'flat'
}

const CROSS_DATA: CrossRow[] = [
  { query: 'best online casino uk',         clicks: 4820, impressions: 38200, ctr: '12.6%', position: 2.1, sessions: 4611, conversions: 184, revenue: '£14,720', revenueNum: 14720, trend: 'up' },
  { query: 'no deposit bonus casino',       clicks: 3940, impressions: 52100, ctr: '7.6%',  position: 3.4, sessions: 3761, conversions: 219, revenue: '£17,520', revenueNum: 17520, trend: 'up' },
  { query: 'casinos not on gamstop',        clicks: 3210, impressions: 29800, ctr: '10.8%', position: 1.8, sessions: 3061, conversions: 152, revenue: '£12,160', revenueNum: 12160, trend: 'up' },
  { query: 'fastest payout casino',         clicks: 2880, impressions: 24100, ctr: '11.9%', position: 2.7, sessions: 2742, conversions: 96,  revenue: '£7,680',  revenueNum: 7680,  trend: 'flat' },
  { query: 'online slots real money',       clicks: 2540, impressions: 41300, ctr: '6.1%',  position: 4.2, sessions: 2415, conversions: 61,  revenue: '£4,880',  revenueNum: 4880,  trend: 'down' },
  { query: 'live dealer casino uk',         clicks: 1920, impressions: 18700, ctr: '10.3%', position: 3.1, sessions: 1821, conversions: 54,  revenue: '£4,320',  revenueNum: 4320,  trend: 'up' },
  { query: 'bitcoin casino no deposit',     clicks: 1610, impressions: 12800, ctr: '12.6%', position: 2.9, sessions: 1534, conversions: 72,  revenue: '£5,760',  revenueNum: 5760,  trend: 'up' },
  { query: 'low wagering casino bonus',     clicks: 1340, impressions: 11200, ctr: '11.9%', position: 3.8, sessions: 1271, conversions: 48,  revenue: '£3,840',  revenueNum: 3840,  trend: 'flat' },
  { query: 'how to win at slots',           clicks: 1180, impressions: 31400, ctr: '3.8%',  position: 6.4, sessions: 1121, conversions: 14,  revenue: '£1,120',  revenueNum: 1120,  trend: 'down' },
  { query: 'casino welcome bonus',          clicks: 980,  impressions: 15600, ctr: '6.3%',  position: 5.1, sessions: 932,  conversions: 31,  revenue: '£2,480',  revenueNum: 2480,  trend: 'flat' },
]

const SCATTER_DATA = CROSS_DATA.map(d => ({
  x: d.impressions,
  y: d.revenueNum,
  name: d.query,
}))

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { name: string; x: number; y: number } }[] }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs">
      <div className="text-tx font-semibold mb-1 max-w-40 leading-snug">{d.name}</div>
      <div className="text-muted font-mono-jarvis">{d.x.toLocaleString()} impressions</div>
      <div className="text-accent3 font-mono-jarvis">£{d.y.toLocaleString()} revenue</div>
    </div>
  )
}

export function CrossView() {
  const [sortCol, setSortCol] = useState<'revenue' | 'conversions' | 'clicks'>('revenue')

  const totalRevenue = CROSS_DATA.reduce((s, r) => s + r.revenueNum, 0)
  const totalConv    = CROSS_DATA.reduce((s, r) => s + r.conversions, 0)
  const totalClicks  = CROSS_DATA.reduce((s, r) => s + r.clicks, 0)

  const sorted = [...CROSS_DATA].sort((a, b) =>
    sortCol === 'revenue' ? b.revenueNum - a.revenueNum :
    sortCol === 'conversions' ? b.conversions - a.conversions :
    b.clicks - a.clicks
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#00d4ff15] flex items-center justify-center shrink-0">
            <GitMerge size={18} className="text-accent" />
          </div>
          <div>
            <CardTitle>GSC + GA4 Cross-View</CardTitle>
            <div className="text-[11px] text-muted font-mono-jarvis mt-0.5">Search Console impressions/clicks merged with GA4 conversions and revenue</div>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'ORGANIC REVENUE',   val: `£${(totalRevenue/1000).toFixed(0)}K`,         Icon: PoundSterling,    color: '#10b981' },
          { label: 'CONVERSIONS',       val: totalConv.toLocaleString(),                    Icon: MousePointerClick, color: '#00d4ff' },
          { label: 'ORGANIC CLICKS',    val: `${(totalClicks/1000).toFixed(1)}K`,            Icon: Search,           color: '#7c3aed' },
          { label: 'QUERIES TRACKED',   val: CROSS_DATA.length,                             Icon: BarChart2,        color: '#f59e0b' },
        ].map(({ label, val, Icon, color }) => (
          <Card key={label} className="py-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: color + '20' }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div className="text-2xl font-display font-black" style={{ color }}>{val}</div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mt-1">{label}</div>
          </Card>
        ))}
      </div>

      {/* Scatter + Attribution table */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <Card className="lg:col-span-2">
          <CardTitle className="mb-1">Impressions vs Revenue</CardTitle>
          <div className="text-[10px] text-muted font-mono-jarvis mb-3">Each dot = one query</div>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="x" type="number" name="impressions" tick={{ fontSize: 9, fill: 'var(--color-muted)', fontFamily: 'Roboto Mono' }}
                tickFormatter={v => `${(v/1000).toFixed(0)}K`} axisLine={false} tickLine={false} />
              <YAxis dataKey="y" type="number" name="revenue" tick={{ fontSize: 9, fill: 'var(--color-muted)', fontFamily: 'Roboto Mono' }}
                tickFormatter={v => `£${(v/1000).toFixed(0)}K`} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Scatter data={SCATTER_DATA} fill="#00d4ff" opacity={0.8} />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <CardTitle>Revenue Attribution by Query</CardTitle>
            <div className="flex items-center gap-1 text-[10px] text-muted font-mono-jarvis">
              Sort:
              {(['revenue','conversions','clicks'] as const).map(s => (
                <button key={s} onClick={() => setSortCol(s)}
                  className={`ml-1 cursor-pointer transition-colors ${sortCol === s ? 'text-accent' : 'hover:text-tx'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin">
            {sorted.map((row, i) => (
              <div key={row.query} className="flex items-center gap-2 p-2 bg-surface border border-border rounded-lg text-[11px]">
                <span className="w-4 text-muted font-mono-jarvis text-center shrink-0">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-tx truncate font-medium">{row.query}</div>
                  <div className="flex gap-2 mt-0.5 text-[10px] text-muted font-mono-jarvis">
                    <span>Pos {row.position}</span>
                    <span>CTR {row.ctr}</span>
                    <span>{row.clicks.toLocaleString()} clicks</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-accent3 font-semibold font-mono-jarvis">{row.revenue}</div>
                  <div className="text-[10px] text-muted font-mono-jarvis">{row.conversions} conv</div>
                </div>
                <span className={`flex items-center gap-0.5 shrink-0 ${
                  row.trend === 'up' ? 'text-accent3' : row.trend === 'down' ? 'text-danger' : 'text-muted'
                }`}>
                  {row.trend === 'up' ? <ArrowUpRight size={10}/> : row.trend === 'down' ? <ArrowDownRight size={10}/> : null}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Insight banner */}
      <Card className="bg-linear-to-br from-[#10b98108] to-transparent border-[#10b98130]">
        <div className="flex items-start gap-3">
          <Activity size={16} className="text-accent3 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-sm text-tx mb-1">Top Revenue Insight</div>
            <div className="text-xs text-muted leading-relaxed">
              <span className="text-accent font-semibold">"no deposit bonus casino"</span> generates the highest revenue (£17,520/mo) despite ranking #3.4 — moving to #1
              could add an estimated <span className="text-accent3 font-semibold">£8,400/mo</span> in incremental organic revenue based on current CVR of 5.8%.
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
