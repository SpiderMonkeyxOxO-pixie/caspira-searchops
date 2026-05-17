import { useState, useRef } from 'react'
import { FolderUp, CheckCircle2, Filter } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface CrawlIssue {
  url: string
  type: 'broken' | 'redirect' | 'duplicate-title' | 'missing-meta' | 'thin-content' | '4xx'
  code: number | null
  priority: 'critical' | 'high' | 'medium' | 'low'
  detail: string
}

const TYPE_LABELS: Record<CrawlIssue['type'], string> = {
  'broken':          'Broken Link',
  'redirect':        'Redirect Issue',
  'duplicate-title': 'Duplicate Title',
  'missing-meta':    'Missing Meta',
  'thin-content':    'Thin Content',
  '4xx':             '4xx Error',
}

const TYPE_BADGE: Record<CrawlIssue['type'], 'red' | 'amber' | 'muted'> = {
  'broken':          'red',
  '4xx':             'red',
  'redirect':        'amber',
  'duplicate-title': 'amber',
  'thin-content':    'amber',
  'missing-meta':    'muted',
}

const PRIORITY_COLOR: Record<CrawlIssue['priority'], string> = {
  critical: '#ef4444',
  high:     '#f59e0b',
  medium:   '#7c3aed',
  low:      '#6b7280',
}

type FilterType = 'all' | CrawlIssue['type']

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',             label: 'All' },
  { key: '4xx',             label: '4xx' },
  { key: 'redirect',        label: 'Redirects' },
  { key: 'broken',          label: 'Broken' },
  { key: 'duplicate-title', label: 'Duplicates' },
  { key: 'missing-meta',    label: 'Missing Meta' },
  { key: 'thin-content',    label: 'Thin Content' },
]

export function CrawlImport() {
  const [loaded, setLoaded] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<'priority' | 'type'>('priority')
  const [issues] = useState<CrawlIssue[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

  const displayed = issues
    .filter(i => filter === 'all' || i.type === filter)
    .sort((a, b) => sortBy === 'priority'
      ? PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      : a.type.localeCompare(b.type)
    )

  const critical = issues.filter(i => i.priority === 'critical').length
  const high = issues.filter(i => i.priority === 'high').length


  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    setLoaded(true)
  }

  if (!loaded) {
    return (
      <div className="space-y-5">
        <Card>
          <CardTitle className="mb-3">Screaming Frog Import</CardTitle>
          <p className="text-sm text-muted mb-5 leading-relaxed">
            Upload a Screaming Frog CSV export and Jarvis will parse, prioritise, and surface actionable
            fixes for your iGaming site — ranked by SEO impact.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              dragging ? 'border-accent bg-[#00d4ff08]' : 'border-border hover:border-accent/50'
            }`}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={() => setLoaded(true)} />
            <FolderUp size={40} className="mx-auto mb-3 text-muted" strokeWidth={1} />
            <div className="font-semibold text-sm text-tx mb-1">Drop your Screaming Frog CSV here</div>
            <div className="text-xs text-muted mb-4">or click to browse — supports Internal HTML, Response Codes, and All Tabs exports</div>
            <div className="flex justify-center gap-2">
              <Button variant="primary" onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>
                <FolderUp size={13} /> Browse File
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Broken links & 4xx pages', desc: 'Every internal link pointing to a dead URL, prioritised by inbound link count' },
              { label: 'Redirect chain analysis',  desc: 'Multi-hop redirects costing crawl budget and diluting PageRank' },
              { label: 'Thin & duplicate content', desc: 'Pages below word-count thresholds and canonical conflicts' },
            ].map(({ label, desc }) => (
              <div key={label} className="p-3 bg-surface border border-border rounded-lg">
                <div className="font-semibold text-xs text-tx mb-1">{label}</div>
                <div className="text-[10px] text-muted leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'URLS CRAWLED', val: '1,248',              color: '#00d4ff' },
          { label: 'TOTAL ISSUES', val: issues.length,    color: '#f59e0b' },
          { label: 'CRITICAL',     val: critical,              color: '#ef4444' },
          { label: 'HIGH',         val: high,                  color: '#f59e0b' },
        ].map(s => (
          <Card key={s.label} className="text-center py-4">
            <div className="text-3xl font-display font-black mb-1" style={{ color: s.color }}>{s.val}</div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Filters + sort */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1 flex-wrap">
            <Filter size={12} className="text-muted mr-1" />
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-mono-jarvis tracking-wide transition-colors cursor-pointer ${filter === f.key ? 'bg-accent text-black' : 'text-muted hover:text-tx'}`}>
                {f.label}
                {f.key !== 'all' && (
                  <span className="ml-1 opacity-60">{issues.filter(i => i.type === f.key).length}</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted font-mono-jarvis">
            <span>Sort:</span>
            {['priority','type'].map(s => (
              <button key={s} onClick={() => setSortBy(s as 'priority' | 'type')}
                className={`cursor-pointer transition-colors ${sortBy === s ? 'text-accent' : 'hover:text-tx'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {displayed.length === 0 && (
          <div className="text-center py-10 text-sm text-muted">
            {issues.length === 0
              ? 'Upload a Screaming Frog CSV — full parsing coming in the next update.'
              : 'No issues match the current filter.'}
          </div>
        )}
        <div className="space-y-2">
          {displayed.map((issue, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-surface border border-border rounded-lg">
              <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: PRIORITY_COLOR[issue.priority] }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono-jarvis text-accent truncate mb-0.5">{issue.url}</div>
                <div className="text-[10px] text-muted leading-relaxed">{issue.detail}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {issue.code && (
                  <span className="text-[10px] font-mono-jarvis text-muted">{issue.code}</span>
                )}
                <Badge variant={TYPE_BADGE[issue.type]}>{TYPE_LABELS[issue.type]}</Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="primary">
            <CheckCircle2 size={13} /> Export Fix List
          </Button>
          <Button variant="ghost" onClick={() => setLoaded(false)}>
            <FolderUp size={13} /> Import New Crawl
          </Button>
        </div>
      </Card>
    </div>
  )
}
