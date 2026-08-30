import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, RefreshCw, Bell, BellOff, ExternalLink, Zap, Newspaper, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface NewsItem {
  id:          string
  title:       string
  description: string
  link:        string
  pubDate:     string
  pubTs:       number
  source:      string
  category:    string
  color:       string
}

const CATEGORY_COLORS: Record<string, 'red' | 'amber' | 'accent' | 'green' | 'purple' | 'muted'> = {
  'Algorithm':    'red',
  'Technical':    'accent',
  'Content':      'green',
  'Local SEO':    'amber',
  'Link Building':'purple',
  'AI Search':    'purple',
  'General':      'muted',
}

const SOURCE_FILTERS = ['All', 'Google', 'Industry', 'Tools'] as const
type SourceFilter = typeof SOURCE_FILTERS[number]

const REFRESH_INTERVAL = 30 * 60  // 30 min in seconds

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

function isBreaking(ts: number) { return Date.now() - ts < 6 * 3600 * 1000 }
function isNew(ts: number)      { return Date.now() - ts < 24 * 3600 * 1000 }

export function SEONews() {
  const { newsLastSeen, setNewsLastSeen, setNewsUnreadCount } = useStore()

  const [items,        setItems]        = useState<NewsItem[]>([])
  const [loading,      setLoading]      = useState(false)
  const [fetchedAt,    setFetchedAt]    = useState<number | null>(null)
  const [error,        setError]        = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('All')
  const [search,       setSearch]       = useState('')
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [countdown,    setCountdown]    = useState(REFRESH_INTERVAL)
  const countdownRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('news-proxy', { body: {} })
      if (fnErr) throw new Error(fnErr.message)
      const incoming: NewsItem[] = data?.items ?? []
      setItems(incoming)
      setFetchedAt(data?.fetchedAt ?? Date.now())

      // Count unread — items newer than last seen
      const lastTs = newsLastSeen ? new Date(newsLastSeen).getTime() : 0
      const unread = incoming.filter(i => i.pubTs > lastTs).length
      setNewsUnreadCount(unread)

      // Browser notifications for new items
      if (notifEnabled && Notification.permission === 'granted' && lastTs > 0) {
        const fresh = incoming.filter(i => i.pubTs > lastTs).slice(0, 3)
        fresh.forEach(item => {
          new Notification(`📰 ${item.source}`, {
            body: item.title,
          })
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load news')
    } finally {
      if (!silent) setLoading(false)
      setCountdown(REFRESH_INTERVAL)
    }
  }, [newsLastSeen, notifEnabled, setNewsUnreadCount])

  // Mark all read when section is opened
  useEffect(() => {
    setNewsLastSeen(new Date().toISOString())
    setNewsUnreadCount(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initial load
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { fetch() }, [])

  // Auto-refresh countdown
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { fetch(true); return REFRESH_INTERVAL }
        return prev - 1
      })
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [fetch])

  function markAllRead() {
    setNewsLastSeen(new Date().toISOString())
    setNewsUnreadCount(0)
  }

  async function toggleNotifications() {
    if (notifEnabled) { setNotifEnabled(false); return }
    if (!('Notification' in window)) { alert('Browser notifications not supported.'); return }
    const perm = await Notification.requestPermission()
    if (perm === 'granted') setNotifEnabled(true)
    else alert('Notification permission denied. Enable it in browser settings.')
  }

  const lastSeenTs = newsLastSeen ? new Date(newsLastSeen).getTime() : 0

  const filtered = items.filter(item => {
    if (sourceFilter !== 'All') {
      const catMap: Record<SourceFilter, string> = { All: '', Google: 'google', Industry: 'industry', Tools: 'tools' }
      if (!item.source.toLowerCase().includes(catMap[sourceFilter].toLowerCase())) {
        // Match by category field from edge function
        const mapCheck = sourceFilter === 'Google' ? item.source === 'Google Search Central'
          : sourceFilter === 'Industry' ? ['Search Engine Land','SE Journal','SE Roundtable'].includes(item.source)
          : ['Moz Blog','Ahrefs Blog','SEMrush Blog'].includes(item.source)
        if (!mapCheck) return false
      }
    }
    if (search) {
      const q = search.toLowerCase()
      return item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    }
    return true
  })

  const unreadCount = items.filter(i => i.pubTs > lastSeenTs).length

  const countdownMins = Math.floor(countdown / 60)
  const countdownSecs = countdown % 60

  return (
    <div className="space-y-5">

      {/* Header */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="mb-1">SEO News & Updates</CardTitle>
            <p className="text-sm text-muted">
              Live feed from Google Search Central, Search Engine Land, SE Journal, SE Roundtable, Moz, Ahrefs, SEMrush.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {fetchedAt && (
              <span className="text-[10px] text-muted font-mono-jarvis">
                Next refresh in {countdownMins}:{String(countdownSecs).padStart(2, '0')}
              </span>
            )}
            <button
              onClick={toggleNotifications}
              title={notifEnabled ? 'Disable browser notifications' : 'Enable browser notifications'}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                notifEnabled
                  ? 'border-accent3 text-accent3 bg-accent3/10'
                  : 'border-border text-muted hover:border-accent3 hover:text-accent3'
              }`}
            >
              {notifEnabled ? <Bell size={14} /> : <BellOff size={14} />}
            </button>
            {unreadCount > 0 && (
              <Button variant="ghost" className="text-[11px]" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
            <Button variant="primary" onClick={() => fetch()} disabled={loading}>
              {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {loading ? 'Loading…' : 'Refresh'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats row */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'TOTAL ARTICLES', val: items.length,                                  color: '#00d4ff', tip: 'Total articles fetched from all SEO news sources in this refresh cycle.' },
            { label: 'UNREAD',         val: unreadCount,                                   color: unreadCount > 0 ? '#f59e0b' : '#10b981', tip: 'Articles published since you last visited this section. Unread articles are highlighted with a coloured border.' },
            { label: 'BREAKING',       val: items.filter(i => isBreaking(i.pubTs)).length, color: '#ef4444', tip: 'Articles published within the last 6 hours — very recent news that may indicate a live Google algorithm update or major industry event.' },
            { label: 'SOURCES',        val: new Set(items.map(i => i.source)).size,        color: '#7c3aed', tip: 'Number of unique news sources in this feed: Google Search Central, Search Engine Land, SE Journal, SE Roundtable, Moz, Ahrefs, SEMrush.' },
          ].map(s => (
            <Card key={s.label} className="text-center py-4">
              <div className="text-2xl font-display font-black mb-1" style={{ color: s.color }}>{s.val}</div>
              <div className="flex items-center justify-center gap-1 text-[10px] text-muted font-mono-jarvis tracking-widest">
                {s.label}
                <InfoTooltip text={s.tip} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {SOURCE_FILTERS.map(f => (
            <button key={f} onClick={() => setSourceFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all border ${
                sourceFilter === f ? 'bg-accent text-black border-accent' : 'border-border text-muted hover:border-accent'
              }`}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search news…"
            className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors"
          />
        </div>
        <span className="text-[11px] text-muted font-mono-jarvis ml-auto">{filtered.length} articles</span>
      </div>

      {/* News grid */}
      {loading && items.length === 0 ? (
        <Card className="text-center py-16">
          <Loader2 size={28} className="animate-spin text-accent mx-auto mb-3" />
          <div className="text-sm text-muted">Fetching latest SEO news…</div>
        </Card>
      ) : error ? (
        <Card className="text-center py-12">
          <Zap size={28} className="text-danger mx-auto mb-3" strokeWidth={1.5} />
          <div className="text-sm text-muted mb-1">Failed to load news</div>
          <div className="text-xs text-muted font-mono-jarvis mb-4">{error}</div>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Make sure the <span className="text-accent font-mono-jarvis">news-proxy</span> edge function is deployed in your Supabase project.
          </p>
          <Button variant="ghost" className="mt-4" onClick={() => fetch()}>Try again</Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <Newspaper size={40} className="text-muted mx-auto mb-3" strokeWidth={1} />
          <div className="text-sm text-muted">No articles match your filter</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(item => {
            const unread  = item.pubTs > lastSeenTs
            const breaking = isBreaking(item.pubTs)
            const fresh   = isNew(item.pubTs)
            return (
              <div
                key={item.id}
                className={`bg-card border rounded-2xl p-4 flex flex-col gap-3 transition-colors hover:border-accent/40 ${
                  unread ? 'border-accent/30' : 'border-border'
                }`}
              >
                {/* Top row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono-jarvis"
                    style={{ background: item.color + '20', color: item.color, border: `1px solid ${item.color}40` }}
                  >
                    {item.source}
                  </span>
                  {breaking && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger/20 text-danger border border-danger/30 font-mono-jarvis animate-pulse">
                      BREAKING
                    </span>
                  )}
                  {!breaking && fresh && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent3/20 text-accent3 border border-accent3/30 font-mono-jarvis">
                      NEW
                    </span>
                  )}
                  {unread && !breaking && !fresh && (
                    <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                  )}
                  <span className="ml-auto shrink-0 flex items-center gap-1">
                    <Badge variant={CATEGORY_COLORS[item.category] ?? 'muted'}>
                      {item.category}
                    </Badge>
                    {item.category === 'Algorithm' && <InfoTooltip text="Algorithm update — Google changed its ranking signals. Monitor your traffic and rankings closely for the next 2 weeks." size={10} side="left" />}
                    {item.category === 'AI Search' && <InfoTooltip text="AI Search news — changes to Google AI Overviews, ChatGPT Search, Perplexity, or Gemini that affect how SEO content is cited." size={10} side="left" />}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 className={`text-sm font-semibold leading-snug mb-1.5 ${unread ? 'text-tx' : 'text-tx/80'}`}>
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-[11px] text-muted leading-relaxed line-clamp-2">{item.description}</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-1">
                  <span className="text-[10px] text-muted font-mono-jarvis">
                    {relativeTime(item.pubTs)}
                  </span>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-accent hover:underline font-semibold cursor-pointer"
                  >
                    Read <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer hint */}
      {fetchedAt && !loading && (
        <div className="text-center text-[10px] text-muted font-mono-jarvis pb-2">
          Last fetched {relativeTime(fetchedAt)} · Auto-refreshes every 30 min
          {notifEnabled && ' · Browser notifications ON'}
        </div>
      )}
    </div>
  )
}
