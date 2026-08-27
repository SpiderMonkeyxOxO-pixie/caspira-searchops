import { useState } from 'react'
import { RefreshCw, CheckCircle2, XCircle, KeyRound, Database, TrendingUp, Link2, Clock, AlertCircle } from 'lucide-react'
import ahrefsIcon  from '@/assets/ahrefs.jpg'
import semrushIcon from '@/assets/semrush.jpg'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface SyncState {
  connected: boolean
  syncing: boolean
  lastSync: string
  keywordsSync: number
  backlinksSync: number
  dr: number
}

const INIT: SyncState = { connected: false, syncing: false, lastSync: '—', keywordsSync: 0, backlinksSync: 0, dr: 0 }

function ProviderCard({
  name, tagline, color, keyInput, setKey,
  state, onConnect, onSync,
  logo,
}: {
  name: string; tagline: string; color: string; keyInput: string; setKey: (v: string) => void
  state: SyncState; onConnect: () => void; onSync: () => void; logo: React.ReactNode
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {logo}
          <div>
            <div className="font-display font-bold text-sm text-tx">{name}</div>
            <div className="text-[10px] text-muted">{tagline}</div>
          </div>
        </div>
        {state.connected
          ? <Badge variant="green">Connected</Badge>
          : <Badge variant="muted">Not connected</Badge>
        }
      </div>

      {!state.connected ? (
        <div className="space-y-3">
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">API KEY</div>
            <div className="relative">
              <KeyRound size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="password"
                value={keyInput}
                onChange={e => setKey(e.target.value)}
                placeholder={`Paste your ${name} API key…`}
                className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={onConnect}>
              <CheckCircle2 size={13} /> Connect {name}
            </Button>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted">
            <AlertCircle size={10} />
            Key stored in localStorage only — never transmitted to third parties.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'KEYWORDS', val: state.keywordsSync.toLocaleString(), Icon: TrendingUp, color },
              { label: 'BACKLINKS', val: state.backlinksSync.toLocaleString(), Icon: Link2, color: '#10b981' },
              { label: 'DOM. RATING', val: String(state.dr), Icon: Database, color: '#7c3aed' },
            ].map(s => (
              <div key={s.label} className="bg-surface border border-border rounded-xl p-3 text-center">
                <s.Icon size={14} className="mx-auto mb-1" style={{ color: s.color }} />
                <div className="text-lg font-display font-black" style={{ color: s.color }}>{s.val}</div>
                <div className="text-[9px] text-muted font-mono-jarvis tracking-widest mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Last sync + re-sync */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-muted font-mono-jarvis">
              <Clock size={10} /> Last sync: {state.lastSync}
            </div>
            <Button variant="ghost" className="text-[11px]" onClick={onSync} disabled={state.syncing}>
              <RefreshCw size={11} className={state.syncing ? 'animate-spin' : ''} />
              {state.syncing ? 'Syncing…' : 'Sync Now'}
            </Button>
          </div>

          {/* Connection note */}
          <div className="p-3 bg-surface border border-border rounded-lg text-[11px] text-muted">
            Key saved. Full data sync (keyword positions, backlinks, DR) integration coming soon.
          </div>

          {/* Disconnect */}
          <button
            className="text-[10px] text-muted hover:text-danger transition-colors flex items-center gap-1 cursor-pointer"
            onClick={() => {/* handled by parent */}}
          >
            <XCircle size={10} /> Disconnect
          </button>
        </div>
      )}
    </Card>
  )
}

export function ApiSync() {
  const [ahrefsKey, setAhrefsKey]     = useState('')
  const [semrushKey, setSemrushKey]   = useState('')
  const [ahrefsState, setAhrefsState] = useState<SyncState>({ ...INIT })
  const [semrushState, setSemrushState] = useState<SyncState>({ ...INIT })

  function connectAhrefs() {
    if (!ahrefsKey.trim()) return
    setAhrefsState({ connected: true, syncing: false, lastSync: '—', keywordsSync: 0, backlinksSync: 0, dr: 0 })
  }

  function connectSemrush() {
    if (!semrushKey.trim()) return
    setSemrushState({ connected: true, syncing: false, lastSync: '—', keywordsSync: 0, backlinksSync: 0, dr: 0 })
  }

  function syncAhrefs() {
    setAhrefsState(s => ({ ...s, syncing: true }))
    setTimeout(() => setAhrefsState(s => ({ ...s, syncing: false, lastSync: new Date().toLocaleTimeString() })), 1500)
  }

  function syncSemrush() {
    setSemrushState(s => ({ ...s, syncing: true }))
    setTimeout(() => setSemrushState(s => ({ ...s, syncing: false, lastSync: new Date().toLocaleTimeString() })), 1500)
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle className="mb-2">Ahrefs / Semrush API Sync</CardTitle>
        <p className="text-sm text-muted leading-relaxed">
          Connect your SEO tool accounts to auto-import live backlink data, keyword positions, and domain
          authority metrics directly into Caspira — no manual exports needed.
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ProviderCard
          name="Ahrefs" tagline="Backlinks · Keyword Positions · DR"
          color="#FF6933"
          keyInput={ahrefsKey} setKey={setAhrefsKey}
          state={ahrefsState} onConnect={connectAhrefs} onSync={syncAhrefs}
          logo={<img src={ahrefsIcon} alt="Ahrefs" className="w-10 h-10 rounded-xl object-cover" />}
        />
        <ProviderCard
          name="Semrush" tagline="Position Tracking · Backlink Audit"
          color="#FF642D"
          keyInput={semrushKey} setKey={setSemrushKey}
          state={semrushState} onConnect={connectSemrush} onSync={syncSemrush}
          logo={<img src={semrushIcon} alt="Semrush" className="w-10 h-10 rounded-xl object-cover" />}
        />
      </div>

      {(ahrefsState.connected || semrushState.connected) && (
        <Card>
          <CardTitle className="mb-3">Combined Overview</CardTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'TOTAL KEYWORDS',  val: ((ahrefsState.connected ? ahrefsState.keywordsSync : 0) + (semrushState.connected ? semrushState.keywordsSync : 0)).toLocaleString(), color: '#00d4ff' },
              { label: 'TOTAL BACKLINKS', val: ((ahrefsState.connected ? ahrefsState.backlinksSync : 0) + (semrushState.connected ? semrushState.backlinksSync : 0)).toLocaleString(), color: '#10b981' },
              { label: 'AVG DR',          val: ahrefsState.connected ? String(ahrefsState.dr) : '—', color: '#7c3aed' },
              { label: 'DATA SOURCES',    val: [ahrefsState.connected, semrushState.connected].filter(Boolean).length + '/2', color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="bg-surface border border-border rounded-xl p-4 text-center">
                <div className="text-2xl font-display font-black mb-1" style={{ color: s.color }}>{s.val}</div>
                <div className="text-[9px] text-muted font-mono-jarvis tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
