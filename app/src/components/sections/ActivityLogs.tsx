import { useState, useEffect } from 'react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { NAV } from '@/lib/nav'
import { cn } from '@/lib/utils'

const SECTION_META: Record<string, { label: string; icon: React.ElementType }> = {}
for (const group of NAV) {
  for (const item of group.items) {
    SECTION_META[item.id] = { label: item.label, icon: item.icon }
  }
}

interface LogEntry {
  id: string
  user_email: string | null
  section: string
  visited_at: string
  expires_at: string
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function expiresIn(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'EXPIRED'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return h === 0 ? `${m}m` : `${h}h ${m}m`
}

function exportCSV(rows: LogEntry[]) {
  const headers = ['Timestamp', 'User', 'Section', 'TTL', 'Expires At']
  const lines = rows.map(l => [
    fmtTimestamp(l.visited_at),
    l.user_email ?? 'anonymous',
    SECTION_META[l.section]?.label ?? l.section,
    expiresIn(l.expires_at),
    fmtTimestamp(l.expires_at),
  ].map(v => `"${v}"`).join(','))
  const csv  = [headers.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function Cursor() {
  return <span className="inline-block w-2 h-3.5 bg-[#00ff41] animate-pulse align-middle ml-0.5" />
}

export function ActivityLogs() {
  const { org } = useAuthStore()
  const [logs, setLogs]     = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [grep, setGrep]     = useState('')
  const [, setTick]         = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  async function fetchLogs() {
    if (!org) return
    setLoading(true)
    const { data } = await supabase
      .from('jarvis_activity_logs')
      .select('id, user_email, section, visited_at, expires_at')
      .eq('org_id', org.id)
      .gt('expires_at', new Date().toISOString())
      .order('visited_at', { ascending: false })
      .limit(500)
    setLogs(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
    if (!org) return
    const channel = supabase
      .channel(`activity-logs-${org.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'jarvis_activity_logs',
        filter: `org_id=eq.${org.id}`,
      }, payload => {
        setLogs(prev => [payload.new as LogEntry, ...prev].slice(0, 500))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [org?.id])

  const uniqueUsers    = [...new Set(logs.map(l => l.user_email).filter(Boolean))] as string[]
  const uniqueSections = [...new Set(logs.map(l => l.section))]

  const filtered = logs.filter(l => {
    if (!grep.trim()) return true
    const q = grep.toLowerCase()
    return (
      l.user_email?.toLowerCase().includes(q) ||
      l.section.toLowerCase().includes(q) ||
      (SECTION_META[l.section]?.label ?? '').toLowerCase().includes(q)
    )
  })

  // Break out of the section's p-6 padding to fill the full viewport width/height
  return (
    <div className="-m-6 flex flex-col" style={{ height: 'calc(100vh - 57px)', background: '#060606' }}>

      {/* ── Title bar ── */}
      <div
        className="flex items-center gap-2 px-5 py-3 border-b border-[#111] shrink-0"
        style={{ background: '#0d0d0d' }}
      >
        {/* Traffic lights */}
        <div className="w-3 h-3 rounded-full bg-[#ff5f57] cursor-pointer hover:brightness-110" />
        <div className="w-3 h-3 rounded-full bg-[#ffbd2e] cursor-pointer hover:brightness-110" />
        <div className="w-3 h-3 rounded-full bg-[#28c840] cursor-pointer hover:brightness-110" />

        <span className="ml-3 text-[11px] font-mono text-[#3a3a3a] tracking-widest select-none">
          jarvis — activity-logs — bash — 120×40
        </span>

        <div className="ml-auto flex items-center gap-5">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
            <span className="text-[10px] font-mono text-[#00ff41] tracking-widest">LIVE</span>
          </div>

          {/* Export CSV */}
          <button
            onClick={() => exportCSV(filtered)}
            disabled={filtered.length === 0}
            className="text-[10px] font-mono text-[#555] hover:text-[#00ff41] border border-[#1a1a1a] hover:border-[#00ff4130] px-2.5 py-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed tracking-widest"
          >
            [export.csv]
          </button>

          {/* Refresh */}
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="text-[10px] font-mono text-[#555] hover:text-accent border border-[#1a1a1a] hover:border-[#00d4ff30] px-2.5 py-1 rounded transition-colors disabled:opacity-30 tracking-widest"
          >
            {loading ? '[refreshing...]' : '[refresh]'}
          </button>
        </div>
      </div>

      {/* ── Terminal body ── */}
      <div className="flex-1 overflow-y-auto p-6 font-mono text-xs leading-relaxed scrollbar-thin" style={{ scrollbarColor: '#1a1a1a transparent' }}>

        {/* Boot comment block */}
        <div className="mb-5 space-y-0.5 text-[#252525] select-none">
          <div>{'// ================================================================'}</div>
          <div>{'//  JARVIS Activity Log Daemon  v1.0.0'}</div>
          <div>{'//  Auto-purge TTL: 48h  |  Realtime: enabled  |  Max entries: 500'}</div>
          <div>{'// ================================================================'}</div>
        </div>

        {/* Stats */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[#00ff41]">$</span>
            <span className="text-[#555]">jarvis stats --scope=activity --format=inline</span>
          </div>
          <div className="ml-4 flex items-center gap-8 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="text-[#444]">total_events  </span>
              <span className="text-[#00ff41] font-bold text-sm">{logs.length}</span>
              <InfoTooltip text="Total section visits logged in the last 48 hours across all users in your org." side="bottom" />
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#444]">active_users  </span>
              <span className="text-accent font-bold text-sm">{uniqueUsers.length}</span>
              <InfoTooltip text="Number of unique team members who have visited at least one section in the last 48 hours." side="bottom" />
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#444]">sections_hit  </span>
              <span className="text-accent4 font-bold text-sm">{uniqueSections.length}</span>
              <InfoTooltip text="Number of distinct sections visited. Helps you see which parts of the platform your team is actively using." side="bottom" />
            </span>
            {grep && <span><span className="text-[#444]">grep_matches  </span><span className="text-[#a855f7] font-bold text-sm">{filtered.length}</span></span>}
          </div>
        </div>

        {/* Divider */}
        <div className="text-[#181818] mb-5 select-none overflow-hidden">{'─'.repeat(120)}</div>

        {/* grep filter */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[#00ff41]">$</span>
          <span className="text-[#555]">grep -i</span>
          <span className="text-[#333]">"</span>
          <input
            value={grep}
            onChange={e => setGrep(e.target.value)}
            placeholder="filter by user or section…"
            className="flex-1 bg-transparent text-accent outline-none placeholder:text-[#252525] caret-[#00ff41]"
          />
          <span className="text-[#333]">"</span>
          <span className="text-[#555]">activity.log</span>
          {grep && (
            <button onClick={() => setGrep('')} className="text-[#333] hover:text-[#666] transition-colors ml-1">
              [x]
            </button>
          )}
        </div>

        {/* Column headers */}
        <div className="grid font-mono text-[10px] text-[#252525] uppercase tracking-widest mb-1 select-none"
          style={{ gridTemplateColumns: '200px 240px 1fr 90px' }}>
          <span>TIMESTAMP</span>
          <span>USER</span>
          <span>SECTION</span>
          <span className="text-right">TTL</span>
        </div>
        <div className="text-[#181818] mb-2 select-none overflow-hidden">{'─'.repeat(120)}</div>

        {/* Loading */}
        {loading && (
          <div className="text-[#333] py-4">
            <span className="text-[#00ff41]">$</span>
            <span className="ml-2 text-[#444]">fetching entries</span>
            <span className="animate-pulse text-[#00ff41]">...</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="py-4 space-y-1">
            <div className="text-[#444]">
              <span className="text-[#ff5f57]">!</span>
              <span className="ml-2">
                {grep
                  ? `grep: no match for "${grep}" in activity.log`
                  : 'activity.log is empty — navigate sections to generate entries'}
              </span>
            </div>
          </div>
        )}

        {/* Log rows */}
        {!loading && filtered.map((log, idx) => {
          const meta     = SECTION_META[log.section]
          const ttl      = expiresIn(log.expires_at)
          const isNew    = idx === 0
          const ttlColor = ttl === 'EXPIRED' ? '#ff5f57' : ttl.endsWith('m') && parseInt(ttl) < 60 ? '#ffbd2e' : '#3a3a3a'

          return (
            <div
              key={log.id}
              className={cn(
                'grid py-0.75 group hover:bg-[#ffffff03] transition-colors rounded-sm',
                isNew && 'bg-[#00ff4104]'
              )}
              style={{ gridTemplateColumns: '200px 240px 1fr 90px' }}
            >
              <span className="text-[#2a2a2a] group-hover:text-[#383838] transition-colors truncate">
                [{fmtTimestamp(log.visited_at)}]
              </span>

              <span className="text-[#00ff41] truncate pr-4">
                {log.user_email ?? 'anonymous'}
              </span>

              <span className="flex items-center gap-2 min-w-0">
                <span className="text-[#252525]">→</span>
                <span className="text-accent truncate">{meta?.label ?? log.section}</span>
                {isNew && (
                  <span className="text-[9px] text-[#00ff41] border border-[#00ff4130] px-1 rounded tracking-widest shrink-0">
                    NEW
                  </span>
                )}
              </span>

              <span className="text-right font-mono shrink-0" style={{ color: ttlColor }}>
                {ttl}
              </span>
            </div>
          )
        })}

        {/* Bottom prompt */}
        <div className="mt-6">
          <div className="text-[#181818] mb-3 select-none overflow-hidden">{'─'.repeat(120)}</div>
          {grep && filtered.length > 0 && (
            <div className="text-[#333] mb-2">
              <span className="text-[#a855f7]">{filtered.length}</span>
              <span className="text-[#444]"> match{filtered.length !== 1 ? 'es' : ''} for </span>
              <span className="text-accent">"{grep}"</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[#00ff41]">$</span>
            <span className="text-[#2a2a2a]">_</span>
            <Cursor />
          </div>
        </div>

        {/* Footer comment */}
        <div className="mt-8 text-[#1a1a1a] text-[10px] select-none">
          {'// logs purge automatically at expires_at  |  max 500 entries  |  realtime via supabase  |  export via [export.csv]'}
        </div>
      </div>
    </div>
  )
}
