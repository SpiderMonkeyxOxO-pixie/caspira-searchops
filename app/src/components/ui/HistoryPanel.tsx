import { Clock, Trash2, RotateCcw, Download } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fmtDate } from '@/lib/history'

export interface HistoryEntry {
  id: string
  savedAt: string
  label: string
  sublabel?: string
}

interface HistoryPanelProps<T extends HistoryEntry> {
  records: T[]
  onLoad: (record: T) => void
  onDelete: (id: string) => void
  onClear: () => void
  onDownload?: (record: T) => void
  emptyText?: string
}

export function HistoryPanel<T extends HistoryEntry>({
  records, onLoad, onDelete, onClear, onDownload,
  emptyText = 'No saved results yet. Run the tool to generate and save a result.',
}: HistoryPanelProps<T>) {
  if (records.length === 0) {
    return (
      <Card className="text-center py-14">
        <Clock size={36} className="mx-auto mb-3 text-muted" strokeWidth={1} />
        <div className="text-sm text-muted">{emptyText}</div>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-semibold text-tx">{records.length} saved result{records.length !== 1 ? 's' : ''}</div>
        <button onClick={onClear}
          className="text-[11px] text-danger hover:text-danger/70 flex items-center gap-1 cursor-pointer font-mono-jarvis transition-colors">
          <Trash2 size={11} /> Clear All
        </button>
      </div>

      {records.map(r => (
        <Card key={r.id} className="flex items-center gap-3 py-3">
          <Clock size={13} className="text-muted shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-tx truncate">{r.label}</div>
            {r.sublabel && <div className="text-[11px] text-muted truncate">{r.sublabel}</div>}
            <div className="text-[10px] text-muted font-mono-jarvis mt-0.5">{fmtDate(r.savedAt)}</div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onDownload && (
              <button onClick={() => onDownload(r)}
                className="p-1.5 text-muted hover:text-accent transition-colors cursor-pointer" title="Download">
                <Download size={12} />
              </button>
            )}
            <Button variant="ghost" className="text-[11px] py-1 px-2" onClick={() => onLoad(r)}>
              <RotateCcw size={11} /> Load
            </Button>
            <button onClick={() => onDelete(r.id)}
              className="p-1.5 text-muted hover:text-danger transition-colors cursor-pointer" title="Delete">
              <Trash2 size={11} />
            </button>
          </div>
        </Card>
      ))}
    </div>
  )
}
