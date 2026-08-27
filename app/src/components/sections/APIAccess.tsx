import { useState } from 'react'
import { Copy, Check, Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface APIKey { id: string; name: string; key: string; created: string; lastUsed: string; requests: number; status: 'active' | 'revoked' }

interface Endpoint { method: 'GET' | 'POST' | 'DELETE'; path: string; desc: string; params?: string }

const ENDPOINTS: Endpoint[] = [
  { method: 'GET',  path: '/api/v1/rankings',       desc: 'Get all tracked keyword rankings with position history', params: '?domain=yoursite.com&limit=100' },
  { method: 'GET',  path: '/api/v1/backlinks',      desc: 'Fetch backlink profile — total count, DR, new/lost', params: '?domain=yoursite.com' },
  { method: 'GET',  path: '/api/v1/keywords',       desc: 'Keyword research data with volume, KD, intent', params: '?q=best+project+management+software' },
  { method: 'GET',  path: '/api/v1/sites',          desc: 'List all tracked sites and their current SEO scores', params: '' },
  { method: 'POST', path: '/api/v1/analyze',        desc: 'Trigger a full site audit for a given domain', params: '' },
  { method: 'GET',  path: '/api/v1/reports',        desc: 'Retrieve scheduled report history and next send dates', params: '?status=active' },
  { method: 'GET',  path: '/api/v1/competitors',    desc: 'Get tracked competitors and keyword gap data', params: '?domain=yoursite.com' },
  { method: 'DELETE', path: '/api/v1/keywords/:id', desc: 'Remove a keyword from rank tracking', params: '' },
]

const CODE_EXAMPLES: Record<string, string> = {
  javascript: `const CASPIRA_KEY = 'jvs_your_api_key_here'

const res = await fetch('https://api.caspira.app/v1/rankings?domain=yoursite.com', {
  headers: {
    'Authorization': \`Bearer \${CASPIRA_KEY}\`,
    'Content-Type': 'application/json',
  }
})

const { rankings, total } = await res.json()
console.log(\`Tracking \${total} keywords\`, rankings)`,

  python: `import requests

CASPIRA_KEY = "jvs_your_api_key_here"

response = requests.get(
    "https://api.caspira.app/v1/rankings",
    params={"domain": "yoursite.com"},
    headers={"Authorization": f"Bearer {CASPIRA_KEY}"}
)

data = response.json()
print(f"Tracking {data['total']} keywords")
for kw in data['rankings'][:5]:
    print(f"  {kw['keyword']}: #{kw['position']}")`,

  curl: `curl -X GET "https://api.caspira.app/v1/rankings?domain=yoursite.com" \\
  -H "Authorization: Bearer jvs_your_api_key_here" \\
  -H "Content-Type: application/json"`,
}

const METHOD_COLOR: Record<Endpoint['method'], string> = {
  GET: '#10b981', POST: '#00d4ff', DELETE: '#ef4444',
}

function genKey(): string {
  return 'jvs_' + Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('')
}

let nextKeyId = 10

export function APIAccess() {
  const [keys,       setKeys]       = useState<APIKey[]>([
    { id: '1', name: 'Production',  key: 'jvs_k4x9mQpR2wL7nT3vY8cB5dF1hJ6eA0', created: 'May 1, 2026', lastUsed: '2 hours ago',  requests: 2841, status: 'active' },
    { id: '2', name: 'Dev / Testing', key: 'jvs_rT2pLwX9mK4dA7nH3yC8bQ1eV5fG6', created: 'Apr 15, 2026', lastUsed: '3 days ago', requests: 412, status: 'active' },
  ])
  const [showKey,    setShowKey]    = useState<string | null>(null)
  const [copied,     setCopied]     = useState<string | null>(null)
  const [newName,    setNewName]    = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [codeLang,   setCodeLang]   = useState<'javascript' | 'python' | 'curl'>('javascript')
  const [openEp,     setOpenEp]     = useState<string | null>(null)

  function createKey() {
    if (!newName.trim()) return
    const key: APIKey = {
      id: String(nextKeyId++),
      name: newName.trim(),
      key: genKey(),
      created: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      lastUsed: 'Never',
      requests: 0,
      status: 'active',
    }
    setKeys(prev => [key, ...prev])
    setShowKey(key.id)
    setNewName(''); setShowForm(false)
  }

  function revokeKey(id: string) {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'revoked' } : k))
  }

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id); setTimeout(() => setCopied(null), 2000)
  }

  const totalRequests = keys.reduce((s, k) => s + k.requests, 0)

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'ACTIVE KEYS',    val: keys.filter(k => k.status === 'active').length, color: '#10b981' },
          { label: 'TOTAL REQUESTS', val: totalRequests.toLocaleString(),                  color: '#00d4ff' },
          { label: 'RATE LIMIT',     val: '1,000/hr',                                     color: '#7c3aed' },
        ].map(s => (
          <Card key={s.label} className="text-center py-4">
            <div className="text-3xl font-display font-black mb-1" style={{ color: s.color }}>{s.val}</div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* API Keys */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>API Keys</CardTitle>
            <Button variant="primary" className="text-[11px]" onClick={() => setShowForm(s => !s)}>
              <Plus size={12} /> New Key
            </Button>
          </div>

          {showForm && (
            <div className="flex gap-2 mb-4">
              <input value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createKey()}
                placeholder="Key name (e.g. Production)"
                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors font-mono-jarvis" />
              <Button variant="primary" onClick={createKey} disabled={!newName.trim()}>Create</Button>
            </div>
          )}

          <div className="space-y-3">
            {keys.map(k => (
              <div key={k.id} className={`p-3 border rounded-xl transition-colors ${k.status === 'revoked' ? 'opacity-50 border-border' : 'border-border hover:border-accent/30'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-tx">{k.name}</span>
                    <Badge variant={k.status === 'active' ? 'green' : 'muted'}>{k.status}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowKey(showKey === k.id ? null : k.id)}
                      className="p-1 text-muted hover:text-accent transition-colors cursor-pointer">
                      {showKey === k.id ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button onClick={() => copy(k.key, k.id)}
                      className="p-1 text-muted hover:text-accent transition-colors cursor-pointer">
                      {copied === k.id ? <Check size={12} className="text-accent3" /> : <Copy size={12} />}
                    </button>
                    {k.status === 'active' && (
                      <button onClick={() => revokeKey(k.id)} className="p-1 text-muted hover:text-danger transition-colors cursor-pointer">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-code rounded-lg px-3 py-2 font-mono-jarvis text-[10px] text-accent3 break-all">
                  {showKey === k.id ? k.key : k.key.slice(0, 12) + '•'.repeat(20)}
                </div>
                <div className="flex gap-3 mt-2 text-[10px] text-muted font-mono-jarvis">
                  <span>Created: {k.created}</span>
                  <span>Last used: {k.lastUsed}</span>
                  <span>{k.requests.toLocaleString()} requests</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Code examples */}
        <Card>
          <CardTitle className="mb-3">Quick Start</CardTitle>
          <div className="flex gap-1 mb-3">
            {(['javascript','python','curl'] as const).map(l => (
              <button key={l} onClick={() => setCodeLang(l)}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-mono-jarvis cursor-pointer transition-colors ${codeLang === l ? 'bg-accent text-black' : 'text-muted hover:text-tx'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="relative">
            <pre className="bg-code rounded-xl border border-border p-4 text-[10px] font-mono-jarvis text-accent3 overflow-x-auto whitespace-pre leading-relaxed max-h-52">
              {CODE_EXAMPLES[codeLang]}
            </pre>
            <button onClick={() => copy(CODE_EXAMPLES[codeLang], 'code')}
              className="absolute top-2 right-2 p-1.5 bg-border/80 rounded-md text-muted hover:text-accent transition-colors cursor-pointer">
              {copied === 'code' ? <Check size={11} className="text-accent3" /> : <Copy size={11} />}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            {[
              { label: 'Base URL',    val: 'api.caspira.app/v1' },
              { label: 'Auth',        val: 'Bearer token header' },
              { label: 'Rate limit',  val: '1,000 req/hour' },
              { label: 'Format',      val: 'JSON' },
            ].map(r => (
              <div key={r.label} className="flex justify-between p-2 bg-surface border border-border rounded-lg">
                <span className="text-muted">{r.label}</span>
                <span className="text-tx font-mono-jarvis font-semibold">{r.val}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Endpoints */}
      <Card>
        <CardTitle className="mb-4">API Endpoints</CardTitle>
        <div className="space-y-1.5">
          {ENDPOINTS.map(ep => {
            const key = ep.method + ep.path
            const isOpen = openEp === key
            return (
              <div key={key} className="border border-border rounded-xl overflow-hidden">
                <button onClick={() => setOpenEp(isOpen ? null : key)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors cursor-pointer text-left">
                  <span className="text-[11px] font-bold font-mono-jarvis w-14 shrink-0 text-center py-0.5 rounded"
                    style={{ color: METHOD_COLOR[ep.method], background: METHOD_COLOR[ep.method] + '20' }}>
                    {ep.method}
                  </span>
                  <code className="text-xs font-mono-jarvis text-accent flex-1">{ep.path}</code>
                  <span className="text-[11px] text-muted hidden md:block">{ep.desc}</span>
                  {isOpen ? <ChevronUp size={13} className="text-muted shrink-0" /> : <ChevronDown size={13} className="text-muted shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-2">
                    <div className="text-xs text-muted">{ep.desc}</div>
                    {ep.params && (
                      <div>
                        <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1">EXAMPLE</div>
                        <code className="text-[11px] font-mono-jarvis text-accent3 bg-code rounded-lg px-3 py-2 block">
                          GET https://api.caspira.app/v1{ep.path}{ep.params}
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
