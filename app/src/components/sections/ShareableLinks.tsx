import { useState } from 'react'
import { Plus, Copy, Check, Trash2, ExternalLink, Lock, Clock, Eye } from 'lucide-react'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface SharedLink {
  id: string; title: string; domain: string; sections: string[]
  expiry: string; views: number; password: boolean
  url: string; status: 'active' | 'expired'
  created: string
}

const SECTION_OPTIONS = [
  { id: 'dashboard',   label: 'Command Center' },
  { id: 'tracker',     label: 'Rank Tracker' },
  { id: 'backlinks',   label: 'Backlinks' },
  { id: 'technical',   label: 'Technical SEO' },
  { id: 'competitors', label: 'Competitors' },
  { id: 'roadmap',     label: '12-Month Roadmap' },
  { id: 'roi',         label: 'ROI Calculator' },
  { id: 'scheduler',   label: 'Report Schedule' },
]

const EXPIRY_OPTIONS = [
  { id: '7d',    label: '7 days' },
  { id: '30d',   label: '30 days' },
  { id: '90d',   label: '90 days' },
  { id: 'never', label: 'Never' },
]

const DEFAULT_LINKS: SharedLink[] = [
  {
    id: '1', title: 'casinoexpert.io — Full Monthly Report', domain: 'casinoexpert.io',
    sections: ['dashboard', 'tracker', 'backlinks', 'roi'],
    expiry: 'Jun 14, 2026', views: 12, password: false,
    url: 'https://jarvis.app/s/k4x9mQ', status: 'active', created: 'May 1, 2026',
  },
  {
    id: '2', title: 'slotsempire.com — Rankings Only', domain: 'slotsempire.com',
    sections: ['tracker', 'competitors'],
    expiry: 'May 28, 2026', views: 3, password: true,
    url: 'https://jarvis.app/s/rT2pLw', status: 'active', created: 'May 8, 2026',
  },
  {
    id: '3', title: 'April 2026 Performance Review', domain: 'casinoexpert.io',
    sections: ['dashboard', 'tracker', 'backlinks'],
    expiry: 'May 5, 2026', views: 8, password: false,
    url: 'https://jarvis.app/s/aB3cDe', status: 'expired', created: 'Apr 1, 2026',
  },
]

let nextId = 100

export function ShareableLinks() {
  const { domain } = useStore()
  const [links,         setLinks]         = useState<SharedLink[]>(DEFAULT_LINKS)
  const [showForm,      setShowForm]      = useState(false)
  const [title,         setTitle]         = useState(`${domain || 'yoursite.com'} — Monthly SEO Report`)
  const [selectedSecs,  setSelectedSecs]  = useState<string[]>(['dashboard','tracker','backlinks'])
  const [expiry,        setExpiry]        = useState('30d')
  const [withPassword,  setWithPassword]  = useState(false)
  const [copied,        setCopied]        = useState<string | null>(null)

  function toggleSection(id: string) {
    setSelectedSecs(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  function generateLink() {
    const code = Math.random().toString(36).slice(2, 8)
    const expiryDate = expiry === 'never' ? 'Never' :
      new Date(Date.now() + parseInt(expiry) * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    const link: SharedLink = {
      id: String(nextId++),
      title,
      domain: domain || 'yoursite.com',
      sections: selectedSecs,
      expiry: expiryDate,
      views: 0,
      password: withPassword,
      url: `https://jarvis.app/s/${code}`,
      status: 'active',
      created: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    }
    setLinks(prev => [link, ...prev])
    setShowForm(false)
  }

  function copyLink(url: string, id: string) {
    navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function deleteLink(id: string) {
    setLinks(prev => prev.filter(l => l.id !== id))
  }

  const active  = links.filter(l => l.status === 'active').length
  const expired = links.filter(l => l.status === 'expired').length
  const totalViews = links.reduce((s, l) => s + l.views, 0)

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'ACTIVE LINKS',  val: active,      color: '#10b981' },
          { label: 'TOTAL VIEWS',   val: totalViews,  color: '#00d4ff' },
          { label: 'EXPIRED',       val: expired,     color: '#6b7280' },
        ].map(s => (
          <Card key={s.label} className="text-center py-4">
            <div className="text-3xl font-display font-black mb-1" style={{ color: s.color }}>{s.val}</div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="border-accent/30">
          <CardTitle className="mb-4">Create Shareable Link</CardTitle>
          <div className="space-y-4">
            <div>
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">LINK TITLE</div>
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors" />
            </div>

            <div>
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-2">SECTIONS TO INCLUDE</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {SECTION_OPTIONS.map(s => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <div onClick={() => toggleSection(s.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${selectedSecs.includes(s.id) ? 'bg-accent border-accent' : 'border-border'}`}>
                      {selectedSecs.includes(s.id) && <Check size={10} className="text-black" />}
                    </div>
                    <span className="text-xs text-tx">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">EXPIRY</div>
                <div className="flex gap-1">
                  {EXPIRY_OPTIONS.map(e => (
                    <button key={e.id} onClick={() => setExpiry(e.id)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer border transition-all ${expiry === e.id ? 'bg-accent text-black border-accent' : 'border-border text-muted hover:border-accent'}`}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">OPTIONS</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div onClick={() => setWithPassword(p => !p)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${withPassword ? 'bg-accent border-accent' : 'border-border'}`}>
                    {withPassword && <Check size={10} className="text-black" />}
                  </div>
                  <span className="text-xs text-tx">Require password</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="primary" onClick={generateLink} disabled={selectedSecs.length === 0 || !title.trim()}>
                Generate Link
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Links table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Shared Links</CardTitle>
          {!showForm && (
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus size={13} /> New Link
            </Button>
          )}
        </div>

        {/* What clients see notice */}
        <div className="flex items-start gap-2 p-3 bg-[#00d4ff08] border border-[#00d4ff30] rounded-lg mb-4">
          <Eye size={13} className="text-accent mt-0.5 shrink-0" />
          <div className="text-xs text-muted">
            <span className="text-accent font-semibold">Read-only view: </span>
            Clients see live data without login — no editing, no settings, no billing information. Each link can be revoked instantly.
          </div>
        </div>

        <div className="space-y-3">
          {links.map(link => (
            <div key={link.id} className={`p-4 rounded-xl border transition-colors ${link.status === 'expired' ? 'opacity-60 border-border' : 'border-border hover:border-accent/30'}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm text-tx">{link.title}</span>
                    <Badge variant={link.status === 'active' ? 'green' : 'muted'}>{link.status}</Badge>
                    {link.password && <Badge variant="purple"><Lock size={9} className="mr-0.5" /> Password</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted font-mono-jarvis flex-wrap">
                    <span className="flex items-center gap-1"><Clock size={9} /> Expires: {link.expiry}</span>
                    <span className="flex items-center gap-1"><Eye size={9} /> {link.views} views</span>
                    <span>Created: {link.created}</span>
                  </div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {link.sections.map(s => {
                      const sec = SECTION_OPTIONS.find(o => o.id === s)
                      return sec ? (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border text-muted font-mono-jarvis">
                          {sec.label}
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="text-[10px] font-mono-jarvis text-muted max-w-32 truncate">{link.url}</div>
                  <button onClick={() => copyLink(link.url, link.id)}
                    className="p-1.5 text-muted hover:text-accent transition-colors cursor-pointer">
                    {copied === link.id ? <Check size={13} className="text-accent3" /> : <Copy size={13} />}
                  </button>
                  <button className="p-1.5 text-muted hover:text-accent transition-colors cursor-pointer">
                    <ExternalLink size={13} />
                  </button>
                  <button onClick={() => deleteLink(link.id)} className="p-1.5 text-muted hover:text-danger transition-colors cursor-pointer">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
