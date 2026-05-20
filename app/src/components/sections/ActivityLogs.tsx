import { useState, useEffect } from 'react'
import { ClipboardList, RefreshCw, ChevronDown, User2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { NAV } from '@/lib/nav'
import { cn } from '@/lib/utils'

// Build label + icon lookup from NAV config
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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function expiresIn(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'expired'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

function avatarColor(email: string): string {
  const colors = [
    'bg-accent/20 text-accent',
    'bg-accent2/20 text-accent2',
    'bg-accent3/20 text-accent3',
    'bg-accent4/20 text-accent4',
    'bg-danger/20 text-danger',
  ]
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) & 0xffffffff
  return colors[Math.abs(hash) % colors.length]
}

export function ActivityLogs() {
  const { org } = useAuthStore()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSection, setFilterSection] = useState<string>('all')
  const [filterUser, setFilterUser] = useState<string>('all')
  const [, setTick] = useState(0)

  // Re-render every minute so relative times stay fresh
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

  const uniqueUsers = [...new Set(logs.map(l => l.user_email).filter(Boolean))] as string[]
  const uniqueSections = [...new Set(logs.map(l => l.section))]
  const isFiltered = filterSection !== 'all' || filterUser !== 'all'

  const filtered = logs.filter(l => {
    if (filterSection !== 'all' && l.section !== filterSection) return false
    if (filterUser !== 'all' && l.user_email !== filterUser) return false
    return true
  })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <ClipboardList size={20} className="text-accent" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-tx">Activity Logs</h1>
            <p className="text-xs text-muted mt-0.5">Who visited which section — entries auto-purge after 48 hours</p>
          </div>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-surface2 text-sm text-muted transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={13} className={cn(loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total events', value: filtered.length },
          { label: 'Active users', value: uniqueUsers.length },
          { label: 'Sections visited', value: uniqueSections.length },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-surface border border-border p-4">
            <div className="text-2xl font-display font-bold text-tx">{s.value}</div>
            <div className="text-xs text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-surface border border-border text-sm text-tx focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
          >
            <option value="all">All users</option>
            {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterSection}
            onChange={e => setFilterSection(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-surface border border-border text-sm text-tx focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
          >
            <option value="all">All sections</option>
            {uniqueSections.map(s => (
              <option key={s} value={s}>{SECTION_META[s]?.label ?? s}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>

        {isFiltered && (
          <button
            onClick={() => { setFilterUser('all'); setFilterSection('all') }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-tx hover:bg-surface2 transition-colors"
          >
            <X size={11} />
            Clear filters
          </button>
        )}

        {isFiltered && (
          <span className="text-xs text-muted ml-auto">
            {filtered.length} of {logs.length} events
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-surface border border-border overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_1fr_90px_72px] text-[10px] font-mono-jarvis text-muted uppercase tracking-widest px-4 py-2.5 border-b border-border bg-surface2">
          <span>User</span>
          <span>Section</span>
          <span>When</span>
          <span>Expires</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-32 text-muted text-sm gap-2">
            <RefreshCw size={14} className="animate-spin" />
            Loading…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted gap-2">
            <ClipboardList size={24} strokeWidth={1.25} className="opacity-40" />
            <span className="text-sm">
              {isFiltered ? 'No events match the current filters' : 'No activity recorded yet — navigate around to generate logs'}
            </span>
          </div>
        )}

        {!loading && filtered.map(log => {
          const meta = SECTION_META[log.section]
          const Icon = meta?.icon
          const initials = log.user_email ? log.user_email[0].toUpperCase() : '?'
          const colorCls = log.user_email ? avatarColor(log.user_email) : 'bg-surface2 text-muted'

          return (
            <div
              key={log.id}
              className="grid grid-cols-[1fr_1fr_90px_72px] px-4 py-3 border-b border-border/50 last:border-0 hover:bg-surface2/40 transition-colors"
            >
              {/* User */}
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold', colorCls)}>
                  {log.user_email ? initials : <User2 size={11} />}
                </div>
                <span className="text-xs text-tx truncate">{log.user_email ?? 'Unknown'}</span>
              </div>

              {/* Section */}
              <div className="flex items-center gap-2 min-w-0">
                {Icon && <Icon size={13} className="text-muted shrink-0" />}
                <span className="text-xs text-tx truncate">{meta?.label ?? log.section}</span>
              </div>

              {/* When */}
              <div className="flex items-center">
                <span className="text-xs text-muted">{relativeTime(log.visited_at)}</span>
              </div>

              {/* Expires */}
              <div className="flex items-center">
                <span className={cn(
                  'text-xs font-mono-jarvis',
                  expiresIn(log.expires_at) === 'expired' ? 'text-danger' : 'text-muted'
                )}>
                  {expiresIn(log.expires_at)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-muted text-center">
        Logs auto-delete 48 hours after creation via pg_cron (hourly sweep). Max 500 entries shown.
      </p>
    </div>
  )
}
