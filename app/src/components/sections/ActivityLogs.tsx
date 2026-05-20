import { useState, useEffect } from 'react'
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

function Cursor() {
  return <span className="inline-block w-2 h-3.5 bg-[#00ff41] animate-pulse align-middle ml-0.5" />
}

export function ActivityLogs() {
  const { org } = useAuthStore()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [grep, setGrep] = useState('')
  const [, setTick] = useState(0)

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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Terminal window */}
      <div className="rounded-xl overflow-hidden border border-[#00ff4118] shadow-[0_0_60px_#00ff4108]" style={{ background: '#060606' }}>

        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#111]" style={{ background: '#0d0d0d' }}>
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-[11px] font-mono text-[#444] tracking-widest select-none">
            jarvis — activity-logs — bash — 120×40
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
            <span className="text-[10px] font-mono text-[#00ff41] tracking-widest">LIVE</span>
          </div>
        </div>

        {/* Terminal body */}
        <div className="p-5 font-mono text-xs leading-relaxed" style={{ minHeight: 480 }}>

          {/* Boot header */}
          <div className="mb-4 space-y-0.5 text-[#333] select-none">
            <div>{'// =================================================='}</div>
            <div>{'// JARVIS Activity Log Daemon  v1.0.0'}</div>
            <div>{'// Auto-purge: 48h TTL  |  Realtime: enabled'}</div>
            <div>{'// =================================================='}</div>
          </div>

          {/* Stats block */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#00ff41]">$</span>
              <span className="text-[#888]">jarvis stats --scope=activity</span>
            </div>
            <div className="ml-4 space-y-0.5">
              <div>
                <span className="text-[#555]">total_events   </span>
                <span className="text-[#00ff41] font-bold">{String(logs.length).padStart(4, ' ')}</span>
                <span className="text-[#555] ml-6">active_users   </span>
                <span className="text-[#00d4ff] font-bold">{String(uniqueUsers.length).padStart(4, ' ')}</span>
                <span className="text-[#555] ml-6">sections_hit   </span>
                <span className="text-[#f59e0b] font-bold">{String(uniqueSections.length).padStart(4, ' ')}</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="text-[#1a1a1a] mb-4 select-none">{'─'.repeat(80)}</div>

          {/* grep command / filter input */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#00ff41] shrink-0">$</span>
            <span className="text-[#888] shrink-0">grep -i</span>
            <span className="text-[#555] shrink-0">"</span>
            <input
              value={grep}
              onChange={e => setGrep(e.target.value)}
              placeholder="filter by user or section…"
              className="flex-1 bg-transparent text-[#00d4ff] outline-none placeholder:text-[#2a2a2a] caret-[#00ff41]"
            />
            <span className="text-[#555] shrink-0">"</span>
            <span className="text-[#888] shrink-0">activity.log</span>
            {grep && (
              <button
                onClick={() => setGrep('')}
                className="text-[#444] hover:text-[#888] transition-colors ml-1"
              >
                [clear]
              </button>
            )}
          </div>

          {/* Column header */}
          <div className="flex gap-0 mb-1 text-[10px] text-[#2a2a2a] tracking-widest uppercase select-none">
            <span className="w-[180px] shrink-0">TIMESTAMP</span>
            <span className="w-[210px] shrink-0">USER</span>
            <span className="flex-1">SECTION</span>
            <span className="w-[80px] text-right shrink-0">TTL</span>
          </div>
          <div className="text-[#1a1a1a] mb-2 select-none">{'─'.repeat(80)}</div>

          {/* Log lines */}
          {loading && (
            <div className="text-[#333] mt-4">
              <span className="text-[#00ff41]">$</span>
              <span className="ml-2">loading entries</span>
              <span className="animate-pulse">...</span>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="mt-4 space-y-1">
              <div className="text-[#444]">
                <span className="text-[#ff5f57]">!</span>
                <span className="ml-2">{grep ? `grep: no match for "${grep}"` : 'no log entries found — navigate sections to generate activity'}</span>
              </div>
            </div>
          )}

          {!loading && filtered.map((log, idx) => {
            const meta     = SECTION_META[log.section]
            const ttl      = expiresIn(log.expires_at)
            const isNew    = idx === 0
            const ttlColor = ttl === 'EXPIRED' ? '#ff5f57' : parseInt(ttl) < 2 && ttl.endsWith('h') ? '#ffbd2e' : '#555'

            return (
              <div
                key={log.id}
                className={cn(
                  'flex items-start gap-0 py-[2px] group hover:bg-[#ffffff03] transition-colors rounded',
                  isNew && 'bg-[#00ff4105]'
                )}
              >
                {/* Timestamp */}
                <span className="w-[180px] shrink-0 text-[#2e2e2e] group-hover:text-[#3a3a3a] transition-colors">
                  [{fmtTimestamp(log.visited_at)}]
                </span>

                {/* User */}
                <span className="w-[210px] shrink-0 text-[#00ff41] truncate">
                  {log.user_email ?? 'anonymous'}
                </span>

                {/* Arrow + Section */}
                <span className="flex-1 flex items-center gap-1.5 min-w-0">
                  <span className="text-[#2a2a2a]">→</span>
                  <span className="text-[#00d4ff] truncate">{meta?.label ?? log.section}</span>
                  {isNew && <span className="text-[#00ff41] text-[9px] tracking-widest ml-1">[NEW]</span>}
                </span>

                {/* TTL */}
                <span className="w-[80px] text-right shrink-0" style={{ color: ttlColor }}>
                  {ttl}
                </span>
              </div>
            )
          })}

          {/* Bottom prompt */}
          <div className="mt-4">
            <div className="text-[#1a1a1a] mb-2 select-none">{'─'.repeat(80)}</div>
            {grep && filtered.length > 0 && (
              <div className="text-[#555] mb-2">
                grep: <span className="text-[#00ff41]">{filtered.length}</span> match{filtered.length !== 1 ? 'es' : ''} found
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[#00ff41]">$</span>
              <button
                onClick={fetchLogs}
                disabled={loading}
                className="text-[#555] hover:text-[#888] transition-colors disabled:opacity-40 cursor-pointer"
              >
                {loading ? 'refreshing...' : 'refresh --force'}
              </button>
              <Cursor />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-[#222] text-[10px] select-none">
            {'// logs purge automatically at expires_at  |  max 500 entries  |  realtime via supabase'}
          </div>
        </div>
      </div>
    </div>
  )
}
