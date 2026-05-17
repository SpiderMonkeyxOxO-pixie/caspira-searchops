import { useState } from 'react'
import { Bell, Plus, X, ExternalLink, TrendingUp, Clock, AlertCircle, PenLine, Filter } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface Alert {
  id: string
  competitor: string
  title: string
  url: string
  targetKeywords: string[]
  estVolume: string
  published: string
  threat: 'high' | 'medium' | 'low'
  read: boolean
}

const DEFAULT_COMPETITORS: string[] = []

const THREAT_BADGE: Record<Alert['threat'], 'red' | 'amber' | 'muted'> = {
  high: 'red', medium: 'amber', low: 'muted',
}

export function ContentSpy() {
  const [competitors, setCompetitors] = useState<string[]>(DEFAULT_COMPETITORS)
  const [alerts,      setAlerts]      = useState<Alert[]>([])
  const [newComp,     setNewComp]     = useState('')
  const [filter,      setFilter]      = useState<'all' | string>('all')
  const [threatFilter, setThreatFilter] = useState<'all' | Alert['threat']>('all')

  function addCompetitor() {
    const v = newComp.trim()
    if (v && !competitors.includes(v)) {
      setCompetitors(c => [...c, v])
      setNewComp('')
    }
  }

  function markRead(id: string) {
    setAlerts(a => a.map(al => al.id === id ? { ...al, read: true } : al))
  }

  const filtered = alerts.filter(a =>
    (filter === 'all' || a.competitor === filter) &&
    (threatFilter === 'all' || a.threat === threatFilter)
  )

  const unread = alerts.filter(a => !a.read).length
  const highThreats = alerts.filter(a => a.threat === 'high').length

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'NEW ALERTS',       val: unread,                     color: '#ef4444' },
          { label: 'HIGH THREAT',      val: highThreats,                color: '#f59e0b' },
          { label: 'COMPETITORS TRACKED', val: competitors.length,      color: '#00d4ff' },
        ].map(s => (
          <Card key={s.label} className="text-center py-4">
            <div className="text-3xl font-display font-black mb-1" style={{ color: s.color }}>
              {s.val}
            </div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Competitors sidebar */}
        <Card className="lg:col-span-1">
          <CardTitle className="mb-3">Tracked Competitors</CardTitle>
          <div className="space-y-1.5 mb-3">
            {competitors.map(c => (
              <div key={c} className="flex items-center justify-between p-2 bg-surface border border-border rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-[#00d4ff15] flex items-center justify-center text-[9px] font-bold text-accent">
                    {c[0].toUpperCase()}
                  </div>
                  <span className="text-xs text-tx font-mono-jarvis">{c}</span>
                </div>
                <button onClick={() => setCompetitors(cs => cs.filter(x => x !== c))}
                  className="text-muted hover:text-danger transition-colors cursor-pointer">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <input value={newComp} onChange={e => setNewComp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCompetitor()}
              placeholder="Add competitor…"
              className="flex-1 bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
            <button onClick={addCompetitor}
              className="w-7 h-7 flex items-center justify-center bg-accent rounded-lg cursor-pointer hover:bg-accent/80 transition-colors">
              <Plus size={13} className="text-black" />
            </button>
          </div>
          <div className="mt-4 p-3 bg-surface border border-border rounded-lg">
            <div className="text-[10px] text-accent font-mono-jarvis tracking-widest mb-1 flex items-center gap-1">
              <Bell size={9} /> ALERT SETTINGS
            </div>
            <div className="text-[10px] text-muted leading-relaxed">
              Jarvis monitors competitor RSS feeds, sitemaps, and new URLs daily. High-threat alerts are sent within 2 hours.
            </div>
          </div>
        </Card>

        {/* Alerts feed */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CardTitle>Content Alerts</CardTitle>
              {unread > 0 && <Badge variant="red">{unread} new</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <Filter size={11} className="text-muted" />
              <select value={filter} onChange={e => setFilter(e.target.value)}
                className="bg-surface border border-border rounded-lg px-2 py-1 text-[11px] text-tx outline-none focus:border-accent font-mono-jarvis">
                <option value="all">All sites</option>
                {competitors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {(['all', 'high', 'medium', 'low'] as const).map(t => (
                <button key={t} onClick={() => setThreatFilter(t)}
                  className={`text-[10px] px-2 py-1 rounded-lg font-mono-jarvis cursor-pointer transition-colors ${threatFilter === t ? 'bg-accent text-black' : 'text-muted hover:text-tx'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-h-140 overflow-y-auto scrollbar-thin">
            {filtered.map(alert => (
              <div key={alert.id}
                className={`p-4 border rounded-xl transition-colors ${!alert.read ? 'border-accent/30 bg-[#00d4ff05]' : 'border-border'}`}
                onClick={() => markRead(alert.id)}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 text-[10px] font-bold text-muted">
                    {alert.competitor[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[11px] font-mono-jarvis text-muted">{alert.competitor}</span>
                      <Badge variant={THREAT_BADGE[alert.threat]}>{alert.threat} threat</Badge>
                      {!alert.read && <span className="w-2 h-2 rounded-full bg-accent shrink-0" />}
                    </div>
                    <div className="font-semibold text-sm text-tx mb-2 leading-snug">{alert.title}</div>

                    {/* Target keywords */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {alert.targetKeywords.map(kw => (
                        <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-[#7c3aed20] text-accent2 font-mono-jarvis">
                          {kw}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3 text-[10px] text-muted font-mono-jarvis">
                        <span className="flex items-center gap-1"><TrendingUp size={9} />{alert.estVolume}/mo</span>
                        <span className="flex items-center gap-1"><Clock size={9} />{alert.published}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <Button variant="ghost" className="text-[10px] py-1 px-2">
                          <ExternalLink size={10} /> View
                        </Button>
                        <Button variant="primary" className="text-[10px] py-1 px-2">
                          <PenLine size={10} /> Write Response
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <AlertCircle size={32} className="text-muted mb-2" strokeWidth={1} />
                <div className="text-sm text-muted">No alerts match the current filter</div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
