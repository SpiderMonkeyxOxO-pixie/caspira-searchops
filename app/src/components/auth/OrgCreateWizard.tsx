import { useState } from 'react'
import { Building2, ArrowRight, Loader2 } from 'lucide-react'
import { getDataProvider } from '@/lib/backend'
import type { AuthUser } from '@/lib/backend'

interface Props {
  user: AuthUser
  onCreated: () => void
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function OrgCreateWizard({ user, onCreated }: Props) {
  const [orgName, setOrgName]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error,   setError]     = useState<string | null>(null)

  const slug = slugify(orgName)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim()) return
    setLoading(true)
    setError(null)

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out — your session may have expired. Sign out and sign back in.')), 10_000)
      )
      const rpc = getDataProvider().callProcedure('jarvis_create_org', {
        p_name: orgName.trim(),
        p_slug: slug,
      })
      await Promise.race([rpc, timeout])

      onCreated()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create organization'
      setError(msg.includes('unique') ? 'That workspace ID is already taken — try a different name.' : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="fixed w-125 h-125 rounded-full bg-[#00d4ff06] blur-[120px] pointer-events-none -top-24 -right-24" />
      <div className="fixed w-100 h-100 rounded-full bg-[#7c3aed06] blur-[120px] pointer-events-none bottom-48 -left-24" />

      <div className="w-full max-w-md relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mb-4 shadow-[0_0_40px_#00d4ff30]">
            <img src="/jarvis-icon.png" alt="Caspira" className="w-full h-full object-cover" />
          </div>
          <div className="font-display font-black text-2xl tracking-wide text-tx">CASPIRA SEARCHOPS</div>
          <div className="text-[10px] text-muted tracking-[3px] font-mono-jarvis uppercase mt-1">AI Search Intelligence Platform</div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-[0_8px_40px_#00000040]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Building2 size={18} className="text-accent" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-tx">Create your organization</h2>
              <p className="text-xs text-muted">You're signed in as {user.email}</p>
            </div>
          </div>

          <p className="text-sm text-muted mb-6 leading-relaxed">
            Your organization is your Caspira workspace. You can invite your SEO team, assign roles, and manage multiple sites from here.
          </p>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">
              {error}
            </div>
          )}

          <form onSubmit={create} className="space-y-4">
            <div>
              <label className="block text-xs text-muted font-mono-jarvis mb-1.5">ORGANIZATION NAME</label>
              <input
                type="text" value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="e.g. Acme SEO Agency"
                required
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors"
              />
              {slug && (
                <p className="mt-1.5 text-[11px] text-muted font-mono-jarvis">
                  Workspace ID: <span className="text-accent">{slug}</span>
                </p>
              )}
            </div>

            <button
              type="submit" disabled={loading || !orgName.trim()}
              className="w-full py-2.5 rounded-lg bg-linear-to-r from-accent to-[#0099cc] text-black font-bold text-sm
                         cursor-pointer transition-all hover:-translate-y-px hover:shadow-[0_6px_25px_#00d4ff40]
                         disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0
                         flex items-center justify-center gap-2">
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Creating…</>
                : <><ArrowRight size={14} /> Create Organization</>
              }
            </button>
          </form>

          <button
            onClick={() => window.location.replace('/?logout=1')}
            className="mt-6 w-full text-center text-xs text-muted hover:text-tx transition-colors cursor-pointer font-mono-jarvis">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
