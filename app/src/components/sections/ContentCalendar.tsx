import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Trash2, X, GripVertical, Download } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { downloadCSV } from '@/lib/csv'

interface CalendarItem {
  id: string; title: string; keyword: string
  status: 'planned' | 'drafting' | 'review' | 'scheduled' | 'published'
  date: string; wordCount: string; priority: 'high' | 'medium' | 'low'
}

const STATUS_CFG = {
  planned:   { label: 'Planned',   color: '#6b7280', bg: 'bg-border/60' },
  drafting:  { label: 'Drafting',  color: '#7c3aed', bg: 'bg-accent2/20' },
  review:    { label: 'Review',    color: '#f59e0b', bg: 'bg-accent4/20' },
  scheduled: { label: 'Scheduled', color: '#00d4ff', bg: 'bg-accent/20' },
  published: { label: 'Published', color: '#10b981', bg: 'bg-accent3/20' },
}

const PRIORITY_DOT: Record<CalendarItem['priority'], string> = {
  high: 'bg-danger', medium: 'bg-accent4', low: 'bg-border',
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(d: Date): string { return d.toISOString().split('T')[0] }
function relDate(offset: number): string {
  const d = new Date(); d.setDate(d.getDate() + offset); return fmt(d)
}


function getWeekStart(offset: number): Date {
  const today = new Date()
  const dow = today.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset + offset * 7)
  monday.setHours(0,0,0,0)
  return monday
}

let nextItemId = 200

export function ContentCalendar() {
  const [items,       setItems]       = useState<CalendarItem[]>([])
  const [weekOffset,  setWeekOffset]  = useState(0)
  const [draggedId,   setDraggedId]   = useState<string | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [showAdd,     setShowAdd]     = useState(false)
  const [newTitle,    setNewTitle]    = useState('')
  const [newKeyword,  setNewKeyword]  = useState('')
  const [newStatus,   setNewStatus]   = useState<CalendarItem['status']>('planned')
  const [newDate,     setNewDate]     = useState(relDate(0))
  const [newPriority] = useState<CalendarItem['priority']>('medium')

  const weekStart = getWeekStart(weekOffset)
  const days: { date: Date; dateStr: string; label: string }[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i)
    return {
      date: d,
      dateStr: fmt(d),
      label: `${DAY_NAMES[i]} ${d.getDate()} ${MONTHS[d.getMonth()]}`,
    }
  })

  const rangeLabel = `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()]} — ${fmt(days[6].date).slice(8)} ${MONTHS[days[6].date.getMonth()]} ${days[6].date.getFullYear()}`

  function onDragStart(id: string) { setDraggedId(id) }
  function onDragOver(e: React.DragEvent, dateStr: string) { e.preventDefault(); setDragOverDate(dateStr) }
  function onDragLeave() { setDragOverDate(null) }
  function onDrop(dateStr: string) {
    if (!draggedId) return
    setItems(prev => prev.map(it => it.id === draggedId ? { ...it, date: dateStr } : it))
    setDraggedId(null); setDragOverDate(null)
  }

  function addItem() {
    if (!newTitle.trim()) return
    const item: CalendarItem = {
      id: String(nextItemId++),
      title: newTitle.trim(),
      keyword: newKeyword.trim() || 'casino',
      status: newStatus,
      date: newDate,
      wordCount: '2,000',
      priority: newPriority,
    }
    setItems(prev => [...prev, item])
    setNewTitle(''); setNewKeyword(''); setShowAdd(false)
  }

  function removeItem(id: string) { setItems(prev => prev.filter(it => it.id !== id)) }

  function exportCSV() {
    downloadCSV(
      `content-calendar-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Title', 'Keyword', 'Status', 'Date', 'Word Count', 'Priority'],
      [...items]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(it => [it.title, it.keyword, STATUS_CFG[it.status].label, it.date, it.wordCount, it.priority]),
    )
  }

  const todayStr = fmt(new Date())
  const published = items.filter(it => it.status === 'published').length
  const scheduled = items.filter(it => it.status === 'scheduled').length
  const inProgress = items.filter(it => it.status === 'drafting' || it.status === 'review').length

  return (
    <div className="space-y-5">
      {/* Stats + controls */}
      <div className="flex items-center gap-4">
        <Card className="flex-1 grid grid-cols-3 gap-4 py-4">
          {[
            { label: 'PUBLISHED',    val: published,  color: '#10b981' },
            { label: 'SCHEDULED',   val: scheduled,  color: '#00d4ff' },
            { label: 'IN PROGRESS', val: inProgress, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-display font-black mb-0.5" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[9px] text-muted font-mono-jarvis tracking-widest">{s.label}</div>
            </div>
          ))}
        </Card>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft size={14} /></Button>
          <div className="text-xs font-mono-jarvis text-tx whitespace-nowrap">{rangeLabel}</div>
          <Button variant="ghost" onClick={() => setWeekOffset(w => w + 1)}><ChevronRight size={14} /></Button>
          <Button variant="ghost" onClick={() => setWeekOffset(0)} className="text-[11px]">Today</Button>
          <Button variant="ghost" onClick={exportCSV} disabled={items.length === 0}><Download size={13} /> Export CSV</Button>
          <Button variant="primary" onClick={() => setShowAdd(s => !s)}><Plus size={13} /> Add Article</Button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <Card className="border-accent/30">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1">TITLE</div>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Article title…"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors" />
            </div>
            <div>
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1">KEYWORD</div>
              <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                placeholder="target keyword"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
            </div>
            <div>
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1">DATE</div>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors" />
            </div>
            <div>
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1">STATUS</div>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as CalendarItem['status'])}
                className="w-full bg-surface border border-border rounded-lg px-2 py-2 text-xs text-tx outline-none focus:border-accent transition-colors">
                {(Object.keys(STATUS_CFG) as CalendarItem['status'][]).map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="primary" onClick={addItem} disabled={!newTitle.trim()}>Save</Button>
            <Button variant="ghost" onClick={() => setShowAdd(false)}><X size={13} /> Cancel</Button>
          </div>
        </Card>
      )}

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map(({ date, dateStr, label }) => {
          const dayItems = items.filter(it => it.date === dateStr)
          const isToday  = dateStr === todayStr
          const isOver   = dragOverDate === dateStr
          return (
            <div key={dateStr}
              onDragOver={e => onDragOver(e, dateStr)}
              onDragLeave={onDragLeave}
              onDrop={() => onDrop(dateStr)}
              className={`min-h-48 rounded-xl border transition-colors ${
                isOver   ? 'border-accent/60 bg-[#00d4ff08]' :
                isToday  ? 'border-accent/30 bg-[#00d4ff05]' :
                'border-border bg-surface'
              }`}
            >
              {/* Day header */}
              <div className={`px-2 py-2 border-b border-border text-center ${isToday ? 'text-accent' : 'text-muted'}`}>
                <div className="text-[9px] font-mono-jarvis tracking-widest">{label.split(' ')[0]}</div>
                <div className={`font-display font-black text-base ${isToday ? 'text-accent' : 'text-tx'}`}>
                  {date.getDate()}
                </div>
                {dayItems.length > 0 && (
                  <div className="text-[9px] text-muted mt-0.5">{dayItems.length} article{dayItems.length > 1 ? 's' : ''}</div>
                )}
              </div>

              {/* Cards */}
              <div className="p-1.5 space-y-1.5">
                {dayItems.map(item => {
                  const cfg = STATUS_CFG[item.status]
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => onDragStart(item.id)}
                      className={`group rounded-lg p-2 border cursor-grab active:cursor-grabbing transition-all ${cfg.bg} border-border hover:border-accent/40 ${draggedId === item.id ? 'opacity-40' : ''}`}
                    >
                      <div className="flex items-start gap-1 mb-1">
                        <GripVertical size={10} className="text-muted shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-semibold text-tx leading-snug line-clamp-2">{item.title}</div>
                        </div>
                        <button onClick={() => removeItem(item.id)}
                          className="shrink-0 text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
                          <Trash2 size={9} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
                        <span className="text-[9px] font-mono-jarvis" style={{ color: cfg.color }}>{cfg.label}</span>
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ml-auto ${PRIORITY_DOT[item.priority]}`} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="text-[10px] text-muted font-mono-jarvis">Status:</div>
        {(Object.entries(STATUS_CFG) as [CalendarItem['status'], typeof STATUS_CFG.planned][]).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1 text-[10px] text-muted">
            <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
            {cfg.label}
          </span>
        ))}
        <div className="ml-4 text-[10px] text-muted font-mono-jarvis">Priority:</div>
        {([['high','#ef4444'],['medium','#f59e0b'],['low','#6b7280']] as const).map(([p,c]) => (
          <span key={p} className="flex items-center gap-1 text-[10px] text-muted">
            <span className="w-2 h-2 rounded-full" style={{ background: c }} />{p}
          </span>
        ))}
        <div className="ml-auto text-[10px] text-muted font-mono-jarvis italic">Drag cards to reschedule</div>
      </div>
    </div>
  )
}
