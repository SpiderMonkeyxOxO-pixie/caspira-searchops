import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { getAuthProvider } from '@/lib/backend'

type Mode = 'login' | 'signup' | 'forgot'

export function AuthPage() {
  const [mode,     setMode]     = useState<Mode>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const auth = getAuthProvider()
      if (mode === 'login') {
        const { error } = await auth.signInWithPassword(email, password)
        if (error) throw new Error(error)

      } else if (mode === 'signup') {
        const { error } = await auth.signUp(email, password, { full_name: name })
        if (error) throw new Error(error)
        setSuccess('Check your email to confirm your account, then come back to sign in.')

      } else {
        const { error } = await auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        })
        if (error) throw new Error(error)
        setSuccess('Password reset link sent — check your inbox.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mb-4 border border-border">
            <img src="/jarvis-icon.png" alt="Caspira" className="w-full h-full object-cover" />
          </div>
          <div className="font-display font-black text-2xl tracking-wide text-tx">CASPIRA SEARCHOPS</div>
          <div className="text-[10px] text-muted tracking-[3px] font-mono-jarvis uppercase mt-1">AI Search Intelligence Platform</div>
          <div className="text-xs text-accent/80 italic mt-2">Structure Your Search Growth.</div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-[0_8px_40px_#00000040]">
          <h2 className="font-display font-bold text-lg text-tx mb-1">
            {mode === 'login'  ? 'Welcome back'        :
             mode === 'signup' ? 'Create your account' :
             'Reset your password'}
          </h2>
          <p className="text-sm text-muted mb-6">
            {mode === 'login'  ? 'Sign in to your Caspira workspace'  :
             mode === 'signup' ? 'Start managing your SEO'    :
             "We'll send a reset link to your email"}
          </p>

          {error   && <div className="mb-4 px-3 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">{error}</div>}
          {success && <div className="mb-4 px-3 py-2.5 rounded-lg bg-accent3/10 border border-accent3/30 text-accent3 text-xs">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs text-muted font-mono-jarvis mb-1.5">FULL NAME</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-muted font-mono-jarvis mb-1.5">EMAIL</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-xs text-muted font-mono-jarvis mb-1.5">PASSWORD</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Min 8 characters' : '••••••••'}
                    required minLength={8}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-tx outline-none focus:border-accent transition-colors"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-tx transition-colors cursor-pointer">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {mode === 'login' && (
                  <button type="button" onClick={() => setMode('forgot')}
                    className="mt-1.5 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer font-mono-jarvis">
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg bg-accent text-black font-bold text-sm
                         cursor-pointer transition-colors hover:bg-[#00bfe6]
                         disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {mode === 'login'  ? 'Sign in'          :
               mode === 'signup' ? 'Create account'   :
               'Send reset link'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-muted">
            {mode === 'login' ? (
              <>Don't have an account?{' '}
                <button onClick={() => { setMode('signup'); setError(null); setSuccess(null) }}
                  className="text-accent hover:underline cursor-pointer font-semibold">Sign up</button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
                  className="text-accent hover:underline cursor-pointer font-semibold">Sign in</button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-muted mt-6 font-mono-jarvis">
          CASPIRA SEARCHOPS · AI Search Intelligence Platform · Pro
        </p>
      </div>
    </div>
  )
}
