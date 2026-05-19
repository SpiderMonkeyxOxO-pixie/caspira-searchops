import { useState } from 'react'
import { Clock, Plus, Trash2, ToggleLeft, ToggleRight, Mail, Calendar, Bell, AlarmClock } from 'lucide-react'
import { useStore } from '@/store'
import { useAuthStore } from '@/store/authStore'
import type { Schedule } from '@/types'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

const FREQS  = ['Daily', 'Weekly', 'Bi-weekly', 'Monthly']
const DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', '1st', '15th']
const TIMES  = ['7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '12:00 PM', '5:00 PM']
const REPORT_TYPES = [
  'Monthly iGaming SEO Performance Report',
  'Weekly Casino Rankings Digest',
  'Bonus Page Technical Audit Summary',
  'Gambling Niche Backlink Growth Report',
  'Casino Review Content Performance',
  'Competitor Casino Site Insights',
  'SERP Feature Ownership Tracker',
  'E-E-A-T Compliance Summary',
]

function empty(): Omit<Schedule, 'next'> & { next: string } {
  return { name: '', freq: 'Weekly', day: 'Mon', time: '9:00 AM', emails: '', active: true, next: '' }
}

function calcNext(freq: string, day: string, time: string): string {
  const now = new Date()
  const days: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 }
  if (freq === 'Daily') {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ` ${time}`
  }
  if (freq === 'Monthly' || day === '1st' || day === '15th') {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, day === '15th' ? 15 : 1)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ` ${time}`
  }
  const target = days[day] ?? 1
  const d = new Date(now)
  const diff = (target - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + diff)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ` ${time}`
}

export function Scheduler() {
  const { schedules, saveSchedule, toggleSchedule, deleteSchedule } = useStore()
  const orgId = useAuthStore().org?.id ?? ''
  const [form, setForm] = useState<ReturnType<typeof empty>>(empty())
  const [showForm, setShowForm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim())   e.name   = 'Report name is required'
    if (!form.emails.trim()) e.emails = 'At least one email is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const next = calcNext(form.freq, form.day, form.time)
    saveSchedule({ ...form, next }, orgId)
    setForm(empty())
    setShowForm(false)
  }

  const active   = schedules.filter(s => s.active).length
  const upcoming = schedules[0]?.next ?? '—'

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <Bell size={16} />,     label: 'TOTAL REPORTS',    val: schedules.length, color: '#00d4ff' },
          { icon: <ToggleRight size={16} />, label: 'ACTIVE',         val: active,           color: '#10b981' },
          { icon: <Clock size={16} />,    label: 'NEXT SEND',         val: upcoming,         color: '#f59e0b', small: true },
        ].map(s => (
          <Card key={s.label} className="flex items-center gap-3 py-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: s.color + '20', color: s.color }}>
              {s.icon}
            </div>
            <div>
              <div className={`font-display font-black ${s.small ? 'text-sm' : 'text-2xl'} leading-tight`}
                style={{ color: s.color }}>{s.val}</div>
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Scheduled reports */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Scheduled Reports</CardTitle>
          <Button variant="primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={13} /> New Schedule
          </Button>
        </div>

        {/* New form */}
        {showForm && (
          <div className="mb-5 p-4 bg-surface border border-accent/30 rounded-xl space-y-3">
            <div className="text-xs font-semibold text-accent font-mono-jarvis tracking-widest mb-2">NEW REPORT SCHEDULE</div>

            <div>
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">REPORT TYPE</div>
              <select value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors">
                <option value="">Select or type below…</option>
                {REPORT_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Or type custom report name"
                className="w-full mt-1.5 bg-card border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors font-mono-jarvis"
              />
              {errors.name && <div className="text-[10px] text-danger mt-1">{errors.name}</div>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">FREQUENCY</div>
                <select value={form.freq} onChange={e => setForm(f => ({ ...f, freq: e.target.value }))}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors">
                  {FREQS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">DAY</div>
                <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors">
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">TIME</div>
                <select value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors">
                  {TIMES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">EMAIL RECIPIENTS</div>
              <div className="relative">
                <Mail size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input value={form.emails} onChange={e => setForm(f => ({ ...f, emails: e.target.value }))}
                  placeholder="email@client.com, team@agency.com"
                  className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors font-mono-jarvis"
                />
              </div>
              {errors.emails && <div className="text-[10px] text-danger mt-1">{errors.emails}</div>}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="primary" onClick={handleSave}>Save Schedule</Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setErrors({}) }}>Cancel</Button>
            </div>
          </div>
        )}

        {schedules.length === 0 ? (
          <div className="text-center py-10 text-muted text-sm">
            No scheduled reports yet. Create your first schedule above.
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((s, i) => (
              <div key={i} className={`flex items-center gap-4 p-3.5 rounded-xl border transition-colors ${s.active ? 'border-border bg-surface' : 'border-border/50 bg-surface/50 opacity-60'}`}>
                <div className="w-9 h-9 rounded-lg bg-[#00d4ff15] flex items-center justify-center shrink-0">
                  <Calendar size={15} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-tx truncate mb-0.5">{s.name}</div>
                  <div className="flex items-center gap-3 text-[11px] text-muted font-mono-jarvis flex-wrap">
                    <span>{s.freq} · {s.day} · {s.time}</span>
                    <span className="flex items-center gap-1"><Mail size={10} />{s.emails}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] text-muted font-mono-jarvis mb-1">NEXT</div>
                  <div className="text-[11px] text-tx font-mono-jarvis">{s.next}</div>
                </div>
                <Badge variant={s.active ? 'green' : 'muted'}>{s.active ? 'Active' : 'Paused'}</Badge>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => toggleSchedule(i, orgId)} className="p-1.5 text-muted hover:text-accent transition-colors cursor-pointer" title={s.active ? 'Pause' : 'Resume'}>
                    {s.active ? <ToggleRight size={16} className="text-accent" /> : <ToggleLeft size={16} />}
                  </button>
                  <button onClick={() => deleteSchedule(i, orgId)} className="p-1.5 text-muted hover:text-danger transition-colors cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tips */}
      <Card>
        <CardTitle className="mb-3">Automation Tips</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { Icon: Calendar,    tip: 'Schedule monthly reports to arrive the 1st of each month — clients review on the first Monday.' },
            { Icon: Mail,        tip: 'Use comma-separated emails to send to entire team and client at once (max 10 recipients).' },
            { Icon: AlarmClock,  tip: 'Schedule weekly digests for Monday 8 AM so your client starts the week with fresh SEO data.' },
            { Icon: Bell,        tip: 'Create a "Technical Alert" daily report to catch ranking drops within 24 hours.' },
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-surface border border-border rounded-lg">
              <t.Icon size={14} className="text-accent shrink-0 mt-0.5" />
              <span className="text-xs text-muted leading-relaxed">{t.tip}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
