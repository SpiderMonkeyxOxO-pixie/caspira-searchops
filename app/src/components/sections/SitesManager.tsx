import { useState } from 'react'
import {
  Globe, Plus, Trash2, Edit3, Check, X, Upload,
  CheckCircle2, AlertTriangle, XCircle, Search, ArrowRight,
} from 'lucide-react'
import { useStore } from '@/store'
import { useAuthStore } from '@/store/authStore'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { cn } from '@/lib/utils'
import type { Site } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanDomain(raw: string): string {
  return raw.trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .replace(/\s+/g, '')
}

function parseBulk(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map(cleanDomain)
    .filter(d => d.includes('.') && d.length > 3 && !d.startsWith('.'))
    .filter((d, i, arr) => arr.indexOf(d) === i)
}

function domainToName(domain: string): string {
  return domain
    .replace(/\.(com|in|id|co|net|org|io|co\.id|co\.in)$/, '')
    .replace(/[-_.]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function StatusIcon({ s }: { s: Site['status'] }) {
  if (s === 'good')    return <CheckCircle2 size={14} className="text-accent3 shrink-0" />
  if (s === 'warning') return <AlertTriangle size={14} className="text-accent4 shrink-0" />
  return <XCircle size={14} className="text-danger shrink-0" />
}

// ─── Inline edit row ─────────────────────────────────────────────────────────

function EditRow({ site, onSave, onCancel }: {
  site: Site
  onSave: (patch: Partial<Site>) => void
  onCancel: () => void
}) {
  const [name,    setName]    = useState(site.name)
  const [domain,  setDomain]  = useState(site.domain)
  const [country, setCountry] = useState(site.country ?? '')
  const [client,  setClient]  = useState(site.client  ?? '')
  const [status,  setStatus]  = useState(site.status)

  return (
    <tr className="border-b border-border bg-[#00d4ff05]">
      <td className="px-4 py-2">
        <input value={name} onChange={e => setName(e.target.value)}
          className="w-full bg-surface border border-accent rounded px-2 py-1 text-xs text-tx font-mono-jarvis outline-none" />
      </td>
      <td className="px-4 py-2">
        <input value={domain} onChange={e => setDomain(e.target.value)}
          className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-tx font-mono-jarvis outline-none" />
      </td>
      <td className="px-4 py-2">
        <input value={country} onChange={e => setCountry(e.target.value)}
          placeholder="e.g. India"
          className="w-24 bg-surface border border-border rounded px-2 py-1 text-xs text-tx outline-none" />
      </td>
      <td className="px-4 py-2">
        <input value={client} onChange={e => setClient(e.target.value)}
          placeholder="Client A"
          className="w-24 bg-surface border border-border rounded px-2 py-1 text-xs text-tx outline-none" />
      </td>
      <td className="px-4 py-2">
        <select value={status} onChange={e => setStatus(e.target.value as Site['status'])}
          className="bg-surface border border-border rounded px-2 py-1 text-xs text-tx outline-none">
          <option value="good">Good</option>
          <option value="warning">Warning</option>
          <option value="danger">Danger</option>
        </select>
      </td>
      <td className="px-4 py-2 text-muted">—</td>
      <td className="px-4 py-2">
        <div className="flex gap-1">
          <button onClick={() => onSave({ name, domain: cleanDomain(domain), country: country || undefined, client: client || undefined, status })}
            className="p-1 rounded hover:bg-accent3/20 text-accent3 cursor-pointer">
            <Check size={13} />
          </button>
          <button onClick={onCancel} className="p-1 rounded hover:bg-danger/20 text-danger cursor-pointer">
            <X size={13} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SitesManager() {
  const { sites, addSite, removeSite, updateSite, setSection, domain, setDomain } = useStore()
  const orgId = useAuthStore().org?.id ?? ''

  // Bulk import state
  const [bulkRaw,    setBulkRaw]    = useState('')
  const [bulkParsed, setBulkParsed] = useState<string[]>([])
  const [bulkDone,   setBulkDone]   = useState(false)

  // Add single site state
  const [newName,    setNewName]    = useState('')
  const [newDomain,  setNewDomain]  = useState('')
  const [newCountry, setNewCountry] = useState('')
  const [newClient,  setNewClient]  = useState('')
  const [addErr,     setAddErr]     = useState('')

  // Table state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState<'all'|'good'|'warning'|'danger'>('all')

  const filtered = sites
    .filter(s => filter === 'all' || s.status === filter)
    .filter(s => !search || s.domain.includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase()))

  const good    = sites.filter(s => s.status === 'good').length
  const warning = sites.filter(s => s.status === 'warning').length
  const danger  = sites.filter(s => s.status === 'danger').length

  // ── Bulk import ────────────────────────────────────────────────────

  function handleBulkParse() {
    const existing = new Set(sites.map(s => s.domain))
    const parsed = parseBulk(bulkRaw).filter(d => !existing.has(d))
    setBulkParsed(parsed)
  }

  function handleBulkImport() {
    bulkParsed.forEach(domain => {
      addSite({
        name: domainToName(domain),
        domain,
        score: 0,
        traffic: '—',
        keys: 0,
        issues: 0,
        status: 'warning',
      }, orgId)
    })
    setBulkRaw('')
    setBulkParsed([])
    setBulkDone(true)
    setTimeout(() => setBulkDone(false), 3000)
  }

  function removeBulkItem(d: string) {
    setBulkParsed(prev => prev.filter(x => x !== d))
  }

  // ── Add single ─────────────────────────────────────────────────────

  function handleAdd() {
    setAddErr('')
    const domain = cleanDomain(newDomain)
    if (!domain || !domain.includes('.')) { setAddErr('Enter a valid domain.'); return }
    if (sites.some(s => s.domain === domain)) { setAddErr('This domain is already in your list.'); return }
    addSite({
      name: newName.trim() || domainToName(domain),
      domain,
      score: 0,
      traffic: '—',
      keys: 0,
      issues: 0,
      status: 'warning',
      country: newCountry.trim() || undefined,
      client: newClient.trim() || undefined,
    }, orgId)
    setNewName(''); setNewDomain(''); setNewCountry(''); setNewClient('')
  }

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL SITES',     val: sites.length, color: 'var(--color-accent)',
            tooltip: 'Total number of domains you are currently tracking in Jarvis. Each site can be assigned a client, market, and health status.' },
          { label: 'HEALTHY',         val: good,          color: '#10b981',
            tooltip: 'Sites with a health score of 70 or above, indicating few or no significant SEO issues detected in the latest crawl.' },
          { label: 'NEEDS ATTENTION', val: warning,       color: '#f59e0b',
            tooltip: 'Sites with a health score between 50 and 69. These have moderate SEO issues that should be addressed to prevent ranking drops.' },
          { label: 'CRITICAL',        val: danger,        color: '#ef4444',
            tooltip: 'Sites with a health score below 50. High issue count relative to total pages — at risk of significant ranking loss. Audit immediately.' },
        ].map(k => (
          <Card key={k.label} className="text-center py-4">
            <div className="text-3xl font-display font-black mb-1" style={{ color: k.color }}>{k.val}</div>
            <div className="flex items-center justify-center gap-1 text-[10px] tracking-widest text-muted font-mono-jarvis">
              {k.label}
              <InfoTooltip text={k.tooltip} />
            </div>
          </Card>
        ))}
      </div>

      {/* ── Bulk import ──────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Upload size={15} className="text-accent" />
          <CardTitle>Bulk Import Sites</CardTitle>
          {bulkDone && <Badge variant="green">Imported successfully</Badge>}
        </div>

        {bulkParsed.length === 0 ? (
          <>
            <div className="text-xs text-muted mb-3 leading-relaxed">
              Paste your domains below — one per line, or comma/semicolon separated.
              HTTP/HTTPS and www are stripped automatically. Duplicates are ignored.
            </div>
            <textarea
              value={bulkRaw}
              onChange={e => setBulkRaw(e.target.value)}
              rows={8}
              placeholder={`casinoindian.in\nslotindo.com\nteenpattipro.com\nandarbaharhub.in\nrummypro.in\nslotgacor.id\njudibola.co\ncasinoonline.id\n...`}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors resize-none mb-3"
            />
            <Button variant="primary" onClick={handleBulkParse} disabled={!bulkRaw.trim()}>
              Parse Domains
            </Button>
          </>
        ) : (
          <>
            <div className="text-xs text-muted mb-3">
              <span className="text-accent font-semibold">{bulkParsed.length} new domains</span> ready to import.
              Remove any you don't want, then click Import All.
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4 max-h-64 overflow-y-auto p-1">
              {bulkParsed.map(d => (
                <div key={d} className="flex items-center justify-between gap-2 px-3 py-2 bg-surface border border-border rounded-lg">
                  <span className="text-[11px] font-mono-jarvis text-tx truncate">{d}</span>
                  <button onClick={() => removeBulkItem(d)}
                    className="text-muted hover:text-danger shrink-0 cursor-pointer">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="primary" onClick={handleBulkImport}>
                Import All {bulkParsed.length} Sites
              </Button>
              <Button variant="ghost" onClick={() => { setBulkParsed([]); setBulkRaw('') }}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* ── Sites table ──────────────────────────────────────────────── */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <CardTitle>Your Sites</CardTitle>
            <span className="text-[11px] text-muted font-mono-jarvis">{sites.length} total</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="bg-surface border border-border rounded-lg pl-7 pr-3 py-1.5 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors w-36" />
            </div>
            {/* Filter */}
            {(['all','good','warning','danger'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn('px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all border capitalize',
                  filter === f ? 'bg-accent text-black border-accent' : 'border-border text-muted hover:border-accent'
                )}>{f}</button>
            ))}
          </div>
        </div>

        {sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Globe size={40} className="mb-3 text-muted" strokeWidth={1} />
            <div className="text-sm font-semibold text-tx mb-1">No sites added yet</div>
            <div className="text-xs text-muted mb-4">Use bulk import above to add all your sites at once</div>
            <Button variant="ghost" onClick={() => setSection('agency')}>
              View Agency Dashboard
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted">No sites match your filter</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {[
                    { h: 'Name',    tip: null },
                    { h: 'Domain',  tip: null },
                    { h: 'Country', tip: 'The market/country this site targets. Used to segment traffic in the Agency Dashboard by market and helps track geo-specific SEO performance.' },
                    { h: 'Client',  tip: 'The client or internal team this site belongs to. Used for filtering and portfolio organisation across multiple clients.' },
                    { h: 'Status',  tip: 'Current SEO health status: Good (score 70+), Warning (50–69), or Critical (below 50). Updated after each crawl.' },
                    { h: 'Score',   tip: 'SEO health score from 0–100. Calculated from the ratio of crawl issues to total pages. Run a crawl in Site Analyzer to populate this.' },
                    { h: 'Actions', tip: null },
                  ].map(({ h, tip }) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal">
                      {tip ? (
                        <div className="flex items-center gap-1">{h}<InfoTooltip text={tip} /></div>
                      ) : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(site =>
                  editingId === site.id ? (
                    <EditRow
                      key={site.id}
                      site={site}
                      onSave={(patch) => { updateSite(site.id, patch, orgId); setEditingId(null) }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <tr key={site.id} className="border-b border-border hover:bg-surface transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusIcon s={site.status} />
                          <span className="font-semibold text-tx">{site.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono-jarvis text-accent">{site.domain}</td>
                      <td className="px-4 py-3 text-muted">{site.country ?? '—'}</td>
                      <td className="px-4 py-3 text-muted">{site.client ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={site.status === 'good' ? 'green' : site.status === 'warning' ? 'amber' : 'red'}>
                          {site.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono-jarvis font-bold" style={{
                          color: site.score >= 70 ? '#10b981' : site.score >= 50 ? '#f59e0b' : site.score === 0 ? 'var(--color-muted)' : '#ef4444'
                        }}>
                          {site.score === 0 ? 'Pending' : site.score}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDomain(site.domain)}
                            title={domain === site.domain ? 'Active site' : 'Switch to this site'}
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border',
                              domain === site.domain
                                ? 'bg-accent/15 border-accent/40 text-accent'
                                : 'border-border text-muted hover:border-accent hover:text-accent hover:bg-accent/10'
                            )}
                          >
                            {domain === site.domain
                              ? <><Check size={10} /> Active</>
                              : <><ArrowRight size={10} /> Switch</>
                            }
                          </button>
                          <button onClick={() => setEditingId(site.id)}
                            className="p-1.5 rounded hover:bg-accent/10 text-muted hover:text-accent cursor-pointer transition-colors">
                            <Edit3 size={12} />
                          </button>
                          <button onClick={() => removeSite(site.id, orgId)}
                            className="p-1.5 rounded hover:bg-danger/10 text-muted hover:text-danger cursor-pointer transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Add single site ───────────────────────────────────────────── */}
      <Card>
        <CardTitle className="mb-4">Add Single Site</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="flex items-center gap-1 text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">
              DOMAIN <span className="text-danger">*</span>
              <InfoTooltip text="Enter the root domain (e.g. casinoindian.in). HTTP/HTTPS and www are stripped automatically. This is used to match GSC data and crawl results." side="right" />
            </div>
            <input value={newDomain} onChange={e => setNewDomain(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="casinoindian.in"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
          </div>
          <div>
            <div className="flex items-center gap-1 text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">
              SITE NAME
              <InfoTooltip text="A human-readable label for this site. If left blank, a name is auto-generated from the domain. Used throughout the dashboard for easy identification." side="right" />
            </div>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Auto-generated from domain"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors" />
          </div>
          <div>
            <div className="flex items-center gap-1 text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">
              MARKET / COUNTRY
              <InfoTooltip text="The primary geographic market this site targets (e.g. India, Indonesia). Used to group sites in the Traffic by Market chart in the Agency Dashboard." side="right" />
            </div>
            <input value={newCountry} onChange={e => setNewCountry(e.target.value)}
              placeholder="India, Indonesia…"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors" />
          </div>
          <div>
            <div className="flex items-center gap-1 text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">
              CLIENT / TAG
              <InfoTooltip text="An optional label to group this site by client or category (e.g. Client A, Internal). Shown in the All Sites table for portfolio filtering." side="right" />
            </div>
            <input value={newClient} onChange={e => setNewClient(e.target.value)}
              placeholder="Client A, Personal…"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={handleAdd}>
            <Plus size={13} /> Add Site
          </Button>
          {addErr && <span className="text-xs text-danger">{addErr}</span>}
        </div>
      </Card>
    </div>
  )
}
