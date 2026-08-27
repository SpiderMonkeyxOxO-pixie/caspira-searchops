import { useState } from 'react'
import { Eye, EyeOff, X, Settings, CheckCircle2, Lock, RefreshCw } from 'lucide-react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/Button'

function KeyInput({
  label, value, onChange, placeholder, show, onToggle, hint, badge,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder: string; show: boolean; onToggle: () => void
  hint?: string; badge?: string
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-[11px] tracking-widest text-muted font-mono-jarvis">{label}</label>
        {badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent3/20 text-accent3 font-mono-jarvis">{badge}</span>}
      </div>
      <div className="flex gap-2">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-2.5 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors"
        />
        <button onClick={onToggle} className="px-3 rounded-lg border border-border text-muted hover:text-tx transition-colors">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {hint && <div className="text-[10px] text-muted mt-1.5">{hint}</div>}
    </div>
  )
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    aiProvider, setAiProvider,
    anthropicKey, setAnthropicKey,
    geminiKey, setGeminiKey,
    psiKey, setPsiKey,
    openRouterKey, setOpenRouterKey,
    openRouterModel, setOpenRouterModel,
    backendUrl, setBackendUrl,
    backendKey, setBackendKey,
    googleClientId, setGoogleClientId,
    dataForSEOKey, setDataForSEOKey,
    serperKeys, setSerperKeys,
  } = useStore()

  const [providerInput,     setProviderInput]     = useState(aiProvider)
  const [urlInput,          setUrlInput]          = useState(backendUrl)
  const [keyInput,          setKeyInput]          = useState(backendKey)
  const [googleInput,       setGoogleInput]       = useState(googleClientId)
  const [anthropicInput,    setAnthropicInput]    = useState(anthropicKey)
  const [geminiInput,       setGeminiInput]       = useState(geminiKey)
  const [openRouterInput,   setOpenRouterInput]   = useState(openRouterKey)
  const [openRouterModelIn, setOpenRouterModelIn] = useState(openRouterModel)
  const [psiInput,          setPsiInput]          = useState(psiKey)
  const [dfsInput,          setDfsInput]          = useState(dataForSEOKey)
  const [serperInput,       setSerperInput]       = useState(serperKeys)

  const [showKey,        setShowKey]        = useState(false)
  const [showAnthropic,  setShowAnthropic]  = useState(false)
  const [showGemini,     setShowGemini]     = useState(false)
  const [showOpenRouter, setShowOpenRouter] = useState(false)
  const [showPsi,        setShowPsi]        = useState(false)
  const [showDfs,        setShowDfs]        = useState(false)
  const [showSerper,     setShowSerper]     = useState(false)
  const [saved,          setSaved]          = useState(false)

  if (!open) return null

  const backendChanged = urlInput.trim() !== backendUrl || keyInput.trim() !== backendKey

  function handleSave() {
    setAiProvider(providerInput)
    setAnthropicKey(anthropicInput.trim())
    setGeminiKey(geminiInput.trim())
    setOpenRouterKey(openRouterInput.trim())
    setOpenRouterModel(openRouterModelIn.trim())
    setPsiKey(psiInput.trim())
    setDataForSEOKey(dfsInput.trim())
    setSerperKeys(serperInput.trim())
    setBackendUrl(urlInput.trim())
    setBackendKey(keyInput.trim())
    setGoogleClientId(googleInput.trim())
    setSaved(true)
    if (backendChanged) {
      setTimeout(() => window.location.reload(), 800)
    } else {
      setTimeout(() => { setSaved(false); onClose() }, 900)
    }
  }

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-tx transition-colors">
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 font-display font-bold text-lg mb-1">
            <Settings size={18} className="text-accent" />
            CASPIRA Settings
          </div>
          <div className="text-xs text-muted">All keys stored in your browser only — never on any server.</div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-8 pb-6 flex-1 space-y-6">

          {/* ── Infrastructure ── */}
          <div className="pb-6 border-b border-border">
            <div className="text-[10px] tracking-widest text-muted font-mono-jarvis mb-3 font-semibold">SUPABASE BACKEND</div>

            {/* Project URL */}
            <div className="mb-3">
              <label className="text-[11px] tracking-widest text-muted font-mono-jarvis block mb-1.5">
                PROJECT URL
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://xxxxxxxxxxxx.supabase.co"
                autoComplete="off"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors"
              />
              <div className="text-[10px] text-muted mt-1">supabase.com → Project Settings → API → Project URL</div>
            </div>

            {/* Anon Key */}
            <div className="mb-4">
              <label className="text-[11px] tracking-widest text-muted font-mono-jarvis block mb-1.5">
                ANON KEY
              </label>
              <div className="flex gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  autoComplete="off"
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-2.5 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors"
                />
                <button onClick={() => setShowKey(v => !v)} className="px-3 rounded-lg border border-border text-muted hover:text-tx transition-colors">
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div className="text-[10px] text-muted mt-1">supabase.com → Project Settings → API → anon / public key</div>
            </div>

            {/* Google OAuth Client ID */}
            <div className="mb-1">
              <label className="text-[11px] tracking-widest text-muted font-mono-jarvis block mb-1.5">
                GOOGLE OAUTH CLIENT ID
              </label>
              <input
                type="text"
                value={googleInput}
                onChange={e => setGoogleInput(e.target.value)}
                placeholder="xxxxxxxxxx.apps.googleusercontent.com"
                autoComplete="off"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors"
              />
              <div className="text-[10px] text-muted mt-1">Required for GSC & GA4 OAuth — console.cloud.google.com</div>
            </div>

            {backendChanged && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400 mt-3">
                <RefreshCw size={11} />
                Backend changes will reload the page to apply.
              </div>
            )}
          </div>

          {/* ── AI Keys ── */}
          <div className="pb-6 border-b border-border">
            <div className="text-[10px] tracking-widest text-muted font-mono-jarvis mb-3 font-semibold">AI PROVIDERS</div>

            {/* Active provider toggle */}
            <div className="mb-4">
              <label className="text-[11px] tracking-widest text-muted font-mono-jarvis block mb-1.5">ACTIVE PROVIDER</label>
              <div className="flex gap-2">
                {(['openrouter', 'anthropic'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProviderInput(p)}
                    className={`flex-1 py-2 rounded-lg text-xs font-mono-jarvis border transition-colors ${
                      providerInput === p
                        ? 'bg-accent/10 border-accent text-accent'
                        : 'bg-surface border-border text-muted hover:text-tx'
                    }`}
                  >
                    {p === 'openrouter' ? 'OpenRouter (free models ✓)' : 'Anthropic (Claude)'}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-muted mt-1">
                {providerInput === 'openrouter'
                  ? 'Caspira AI will use your OpenRouter key — free models available'
                  : 'Caspira AI will use your Anthropic key — Claude Sonnet 4.6'}
              </div>
            </div>

            <KeyInput
              label="ANTHROPIC API KEY"
              value={anthropicInput}
              onChange={setAnthropicInput}
              placeholder="sk-ant-..."
              show={showAnthropic}
              onToggle={() => setShowAnthropic(v => !v)}
              hint={anthropicKey ? `Active · sk-ant-...${anthropicKey.slice(-6)}` : 'console.anthropic.com'}
            />

            <KeyInput
              label="GOOGLE GEMINI API KEY"
              value={geminiInput}
              onChange={setGeminiInput}
              placeholder="AIza..."
              show={showGemini}
              onToggle={() => setShowGemini(v => !v)}
              hint={geminiKey ? `Active · AIza...${geminiKey.slice(-6)}` : 'aistudio.google.com · 1M tokens/day free'}
              badge="FREE"
            />

            <KeyInput
              label="OPENROUTER API KEY"
              value={openRouterInput}
              onChange={setOpenRouterInput}
              placeholder="sk-or-v1-..."
              show={showOpenRouter}
              onToggle={() => setShowOpenRouter(v => !v)}
              hint={openRouterKey ? `Active · sk-or-...${openRouterKey.slice(-6)}` : 'openrouter.ai · free models available'}
              badge="FREE"
            />

            <div className="mb-1">
              <label className="text-[11px] tracking-widest text-muted font-mono-jarvis block mb-1.5">OPENROUTER MODEL</label>
              <input
                type="text"
                value={openRouterModelIn}
                onChange={e => setOpenRouterModelIn(e.target.value)}
                placeholder="deepseek/deepseek-chat-v3-0324:free"
                autoComplete="off"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors"
              />
              <div className="text-[10px] text-muted mt-1">openrouter.ai/models — paste any model ID</div>
            </div>
          </div>

          {/* ── Tool API Keys ── */}
          <div>
            <div className="text-[10px] tracking-widest text-muted font-mono-jarvis mb-4 font-semibold">TOOL API KEYS</div>

            <KeyInput
              label="PAGESPEED INSIGHTS API KEY"
              value={psiInput}
              onChange={setPsiInput}
              placeholder="AIza..."
              show={showPsi}
              onToggle={() => setShowPsi(v => !v)}
              hint={psiKey ? `Active · AIza...${psiKey.slice(-6)}` : 'Enables Technical SEO audits · console.cloud.google.com'}
              badge="FREE"
            />

            <KeyInput
              label="SERPER API KEY"
              value={serperInput}
              onChange={setSerperInput}
              placeholder="your-serper-api-key"
              show={showSerper}
              onToggle={() => setShowSerper(v => !v)}
              hint={serperKeys ? 'Active · Rank Tracker, Keyword Explorer, SERP data' : 'serper.dev · powers Rank Tracker + Keyword Explorer · ~$50/mo for 50k queries'}
              badge="PAID"
            />

            <KeyInput
              label="DATAFORSEO CREDENTIALS"
              value={dfsInput}
              onChange={setDfsInput}
              placeholder="login@email.com:password"
              show={showDfs}
              onToggle={() => setShowDfs(v => !v)}
              hint={dataForSEOKey ? 'Active · Competitors domain metrics enabled' : 'Organic keywords, traffic, backlinks · dataforseo.com · ~$0.001/query'}
              badge="PAID"
            />
          </div>

          {/* Lock notice */}
          <div className="flex items-start gap-2 bg-surface border border-border rounded-lg p-3">
            <Lock size={12} className="text-muted mt-0.5 shrink-0" />
            <div className="text-[11px] text-muted leading-relaxed">
              Everything is stored in your browser's localStorage. Keys are sent directly to each service — Caspira never sees them.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-border shrink-0 flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>
            {saved ? <><CheckCircle2 size={13} /> {backendChanged ? 'Reloading…' : 'Saved!'}</> : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}
