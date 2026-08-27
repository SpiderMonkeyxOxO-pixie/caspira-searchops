import { useState } from 'react'
import { Rss, Trash2, RefreshCw, CheckCircle2, XCircle, Clock, Globe, ExternalLink, Eye, EyeOff, FileText, Bot, Wrench } from 'lucide-react'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { listMcpTools } from '@/lib/mcp'
import type { WPSite } from '@/types'

function StatusBadge({ s }: { s: WPSite['status'] }) {
  if (s === 'connected') return <Badge variant="green">Connected</Badge>
  if (s === 'error')     return <Badge variant="red">Error</Badge>
  return <Badge variant="muted">Untested</Badge>
}

function StatusIcon({ s }: { s: WPSite['status'] }) {
  if (s === 'connected') return <CheckCircle2 size={14} className="text-accent3 shrink-0" />
  if (s === 'error')     return <XCircle      size={14} className="text-danger shrink-0" />
  return <Clock size={14} className="text-muted shrink-0" />
}

export function WordPressSites() {
  const { wpSites, addWPSite, removeWPSite, updateWPSite } = useStore()

  const [name,     setName]     = useState('')
  const [url,      setUrl]      = useState('https://')
  const [username, setUsername] = useState('')
  const [pass,     setPass]     = useState('')
  const [showPass, setShowPass] = useState(false)
  const [testing,  setTesting]  = useState<number | null>(null)
  const [formErr,  setFormErr]  = useState('')

  const [mcpDrafts, setMcpDrafts]     = useState<Record<number, { url: string; auth: string }>>({})
  const [mcpTesting, setMcpTesting]   = useState<number | null>(null)
  const [mcpErrors,  setMcpErrors]    = useState<Record<number, string>>({})

  function mcpDraft(site: WPSite) {
    return mcpDrafts[site.id] ?? { url: site.mcpUrl ?? '', auth: site.mcpAuth ?? '' }
  }
  function setMcpDraft(site: WPSite, patch: Partial<{ url: string; auth: string }>) {
    setMcpDrafts(prev => ({ ...prev, [site.id]: { ...mcpDraft(site), ...patch } }))
  }

  async function connectMcp(site: WPSite) {
    const draft = mcpDraft(site)
    if (!draft.url.trim()) return
    setMcpTesting(site.id)
    setMcpErrors(prev => ({ ...prev, [site.id]: '' }))
    try {
      const tools = await listMcpTools(draft.url.trim(), draft.auth.trim() || undefined)
      updateWPSite(site.id, {
        mcpUrl: draft.url.trim(),
        mcpAuth: draft.auth.trim(),
        mcpStatus: 'connected',
        mcpToolCount: tools.length,
      })
    } catch (e) {
      updateWPSite(site.id, { mcpUrl: draft.url.trim(), mcpAuth: draft.auth.trim(), mcpStatus: 'error', mcpToolCount: 0 })
      setMcpErrors(prev => ({ ...prev, [site.id]: e instanceof Error ? e.message : 'Failed to connect' }))
    } finally {
      setMcpTesting(null)
    }
  }

  const connected  = wpSites.filter(s => s.status === 'connected').length
  const totalPosts = wpSites.reduce((a, s) => a + s.postCount, 0)

  async function testConnection(site: WPSite) {
    setTesting(site.id)
    try {
      const creds = btoa(`${site.username}:${site.appPassword}`)
      const res = await fetch(`${site.url.replace(/\/$/, '')}/wp-json/wp/v2/users/me`, {
        headers: { Authorization: `Basic ${creds}` },
      })
      updateWPSite(site.id, { status: res.ok ? 'connected' : 'error' })
    } catch {
      updateWPSite(site.id, { status: 'error' })
    } finally {
      setTesting(null)
    }
  }

  function addSite() {
    setFormErr('')
    if (!name.trim() || !url.trim() || !username.trim() || !pass.trim()) {
      setFormErr('All fields are required.')
      return
    }
    addWPSite({
      id: Date.now(),
      name: name.trim(),
      url: url.trim().replace(/\/$/, ''),
      username: username.trim(),
      appPassword: pass.trim(),
      status: 'untested',
      postCount: 0,
      lastPublished: '—',
    })
    setName(''); setUrl('https://'); setUsername(''); setPass('')
  }

  const KPI = [
    { label: 'TOTAL SITES',     val: wpSites.length,                color: 'var(--color-accent)' },
    { label: 'CONNECTED',       val: connected,                      color: '#10b981' },
    { label: 'TOTAL POSTS',     val: totalPosts.toLocaleString(),    color: '#a78bfa' },
    { label: 'AWAITING SETUP',  val: wpSites.length - connected,    color: '#f59e0b' },
  ]

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI.map(k => (
          <Card key={k.label} className="text-center py-4">
            <div className="text-3xl font-display font-black mb-1" style={{ color: k.color }}>{k.val}</div>
            <div className="text-[10px] tracking-widest text-muted font-mono-jarvis">{k.label}</div>
          </Card>
        ))}
      </div>

      {/* Site list */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <CardTitle>Connected Sites</CardTitle>
        </div>

        {wpSites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Rss size={40} className="mb-3 text-muted" strokeWidth={1} />
            <div className="text-sm text-muted mb-1">No WordPress sites added yet</div>
            <div className="text-xs text-muted">Add your first WordPress site using the form below.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Site', 'URL', 'Username', 'Status', 'Posts', 'Last Published', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] tracking-widest text-muted font-mono-jarvis font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wpSites.map(site => (
                  <tr key={site.id} className="border-b border-border hover:bg-surface transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <StatusIcon s={site.status} />
                        <span className="font-semibold text-tx">{site.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 text-accent font-mono-jarvis hover:underline cursor-pointer">
                        {site.url.replace('https://', '')}
                        <ExternalLink size={10} />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted font-mono-jarvis">{site.username}</td>
                    <td className="px-5 py-3"><StatusBadge s={site.status} /></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <FileText size={11} className="text-muted" />
                        <span className="font-semibold text-tx">{site.postCount}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{site.lastPublished}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" className="px-2 py-1 text-[10px]"
                          onClick={() => testConnection(site)}
                          disabled={testing === site.id}>
                          <RefreshCw size={11} className={testing === site.id ? 'animate-spin' : ''} />
                          Test
                        </Button>
                        <Button variant="ghost" className="px-2 py-1 text-[10px] text-danger"
                          onClick={() => removeWPSite(site.id)}>
                          <Trash2 size={11} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add site form */}
      <Card>
        <CardTitle className="mb-4">Add WordPress Site</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">SITE NAME</div>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Acme SaaS Blog"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors font-mono-jarvis" />
          </div>
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">SITE URL</div>
            <input value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://acmesaas.com"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors font-mono-jarvis" />
          </div>
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">WP USERNAME</div>
            <input value={username} onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors font-mono-jarvis" />
          </div>
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">APPLICATION PASSWORD</div>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={pass} onChange={e => setPass(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors font-mono-jarvis pr-10" />
              <button onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-tx cursor-pointer">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="primary" onClick={addSite}>
            Add Site
          </Button>
          {formErr && <span className="text-xs text-danger">{formErr}</span>}
        </div>
      </Card>

      {/* MCP — AI-driven publishing */}
      {wpSites.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <Bot size={15} className="text-accent2" />
            <CardTitle className="mb-0">AI Publishing via MCP</CardTitle>
            <Badge variant="purple">ADVANCED</Badge>
          </div>
          <p className="text-xs text-muted mb-4 leading-relaxed">
            Connect a site's MCP server so Caspira AI can publish or schedule posts itself when you ask it to in chat — e.g. "publish this to Acme Blog next Monday at 9am".
            Requires the site to run an MCP-capable plugin (e.g. the WordPress MCP Adapter) with a post-publishing ability exposed. Separate from — and optional alongside — the instant-publish flow above.
          </p>
          <div className="space-y-3">
            {wpSites.map(site => {
              const draft = mcpDraft(site)
              const err   = mcpErrors[site.id]
              return (
                <div key={site.id} className="p-3 rounded-lg border border-border bg-surface/50">
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-tx">{site.name}</span>
                      {site.mcpStatus === 'connected' && (
                        <Badge variant="green"><Wrench size={9} /> {site.mcpToolCount ?? 0} tool{site.mcpToolCount === 1 ? '' : 's'}</Badge>
                      )}
                      {site.mcpStatus === 'error' && <Badge variant="red">Connection failed</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                    <input value={draft.url} onChange={e => setMcpDraft(site, { url: e.target.value })}
                      placeholder="https://acmesaas.com/wp-json/mcp/mcp-adapter-default-server"
                      className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors font-mono-jarvis" />
                    <input value={draft.auth} onChange={e => setMcpDraft(site, { auth: e.target.value })}
                      placeholder="Authorization header value (e.g. Bearer xxxx or Basic xxxx) — optional"
                      className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors font-mono-jarvis" />
                    <Button variant="ghost" className="text-xs px-3 whitespace-nowrap" onClick={() => connectMcp(site)} disabled={mcpTesting === site.id || !draft.url.trim()}>
                      <RefreshCw size={11} className={mcpTesting === site.id ? 'animate-spin' : ''} />
                      {mcpTesting === site.id ? 'Connecting…' : 'Connect'}
                    </Button>
                  </div>
                  {err && <div className="mt-2 text-[11px] text-danger">{err}</div>}
                </div>
              )
            })}
          </div>
          <div className="mt-3 text-[10px] text-muted font-mono-jarvis flex items-center gap-1">
            <InfoTooltip text="Caspira connects to the site's MCP endpoint using the Streamable HTTP transport (spec 2025-06-18), discovers whatever tools the site exposes, and lets the AI call them mid-conversation in Caspira AI. The Authorization header value is stored only in your browser." />
            Only sites you've connected here appear as AI tools in Caspira AI chat.
          </div>
        </Card>
      )}

      {/* How-to card */}
      <Card className="border-[#00d4ff30] bg-[#00d4ff04]">
        <div className="flex items-start gap-3">
          <Globe size={16} className="text-accent shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs text-muted leading-relaxed">
            <div className="text-tx font-semibold text-sm">How to generate a WordPress Application Password</div>
            <div><span className="text-accent font-mono-jarvis">1.</span> Log in to WP Admin → <span className="text-accent font-mono-jarvis">Users → Your Profile</span></div>
            <div><span className="text-accent font-mono-jarvis">2.</span> Scroll to <span className="text-accent font-mono-jarvis">Application Passwords</span> → type <span className="font-mono-jarvis text-accent">"Caspira"</span> as the name → click <span className="text-accent font-mono-jarvis">Add New</span></div>
            <div><span className="text-accent font-mono-jarvis">3.</span> Copy the generated password — format: <span className="font-mono-jarvis text-accent">xxxx xxxx xxxx xxxx xxxx xxxx</span></div>
            <div><span className="text-accent font-mono-jarvis">4.</span> Paste above and click <span className="text-accent font-mono-jarvis">Add Site</span> — credentials stay in your browser only, never sent to any server</div>
            <div className="pt-1 text-[11px]">Requires WordPress 5.6+ · Works with any hosting (WP Engine, Kinsta, SiteGround, self-hosted)</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
