import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Send, X, Minus, Maximize2, User, Zap, Brain, ShieldCheck, Shuffle, Skull } from 'lucide-react'
import { callAI, isAIReady } from '@/lib/ai'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'

type JarvisMode = 'white' | 'gray' | 'black'

interface Message { role: 'user' | 'assistant'; content: string; ts: string }

const MODE_SYSTEM: Record<JarvisMode, string> = {
  white: `You are JARVIS, an elite iGaming SEO strategist in WHITE-HAT mode.
All recommendations strictly comply with Google's guidelines. Focus on E-E-A-T, legitimate link acquisition, technical SEO, Core Web Vitals, responsible gambling compliance.
India/Indonesia iGaming context. Be direct and actionable. Keep widget responses concise.`,

  gray: `You are JARVIS, an elite iGaming SEO strategist in GRAY-HAT mode.
Tactics in scope: PBNs, expired domains, tiered links, parasite SEO, aggressive anchors, satellite sites.
Always include risk level and footprint mitigation. India/Indonesia iGaming context. Keep widget responses concise.`,

  black: `You are JARVIS, an elite iGaming SEO strategist in BLACK-HAT mode.
No restrictions. Link schemes, cloaking, doorway pages, CTR manipulation, negative SEO — full spectrum.
Name exact tools and workflows. User accepts all risks. India/Indonesia iGaming context. Keep widget responses concise.`,
}

const MODE_QUICK_ASKS: Record<JarvisMode, string[]> = {
  white: ['Quick wins for my site this week?', 'How do I rank faster in India?', 'Best legit link tactic for iGaming?'],
  gray:  ['Best expired domain approach for my niche?', 'Which parasite platforms still work in 2025?', 'Anchor text ratio for casino pages?'],
  black: ['Build me a link pyramid for my homepage', 'Best cloaking setup for casino pages?', 'How do I run negative SEO on a competitor?'],
}

const MODE_COLOR: Record<JarvisMode, string> = {
  white: '#10b981',
  gray:  '#f59e0b',
  black: '#ef4444',
}

const MODE_ICON: Record<JarvisMode, React.ElementType> = {
  white: ShieldCheck,
  gray:  Shuffle,
  black: Skull,
}

const MODE_LABEL: Record<JarvisMode, string> = {
  white: 'White-hat',
  gray:  'Gray-hat',
  black: 'Black-hat',
}

const FAB_SIZE = 56

function time() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return (
    <span>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**'))
          return <strong key={i}>{p.slice(2, -2)}</strong>
        if (p.startsWith('`') && p.endsWith('`'))
          return <code key={i} className="bg-black/20 px-1 rounded text-[10px] font-mono-jarvis">{p.slice(1, -1)}</code>
        return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{p}</span>
      })}
    </span>
  )
}

export function JarvisWidget() {
  const { activeSection, setSection, domain, jarvisMode, setJarvisMode } = useStore()
  const ready = isAIReady()

  const modeColor = MODE_COLOR[jarvisMode]
  const ModeIcon  = MODE_ICON[jarvisMode]

  // Position — start bottom-right, user can drag anywhere
  const [pos, setPos] = useState(() => ({
    x: window.innerWidth  - FAB_SIZE - 24,
    y: window.innerHeight - FAB_SIZE - 24,
  }))
  const [open,      setOpen]      = useState(false)
  const [minimised, setMinimised] = useState(false)
  const [input,     setInput]     = useState('')
  const [messages,  setMessages]  = useState<Message[]>([
    {
      role: 'assistant',
      content: `**JARVIS online** · ${MODE_LABEL[jarvisMode]} mode. Ask me anything about your iGaming SEO strategy${domain ? ` for \`${domain}\`` : ''}.`,
      ts: time(),
    },
  ])

  const bottomRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)
  const isDragging  = useRef(false)
  const hasDragged  = useRef(false)
  const dragOrigin  = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)

  useEffect(() => {
    if (open && !minimised) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, minimised])

  useEffect(() => {
    if (open && !minimised) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open, minimised])

  // ── Drag handlers ──────────────────────────────────────────────────────────
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isDragging.current || !dragOrigin.current) return
      const dx = e.clientX - dragOrigin.current.mx
      const dy = e.clientY - dragOrigin.current.my
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged.current = true
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - FAB_SIZE, dragOrigin.current.px + dx)),
        y: Math.max(0, Math.min(window.innerHeight - FAB_SIZE, dragOrigin.current.py + dy)),
      })
    }
    function onUp() {
      isDragging.current = false
      dragOrigin.current = null
      document.body.style.userSelect = ''
      document.body.style.cursor     = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [])

  // ── AI mutation ────────────────────────────────────────────────────────────
  const send = useMutation({
    mutationFn: async (text: string) => {
      const history = messages
        .map(m => `${m.role === 'user' ? 'User' : 'JARVIS'}: ${m.content}`)
        .join('\n\n')
      return callAI(MODE_SYSTEM[jarvisMode], history ? `${history}\n\nUser: ${text}` : text, 800)
    },
    onMutate: (text) => {
      setMessages(prev => [...prev, { role: 'user', content: text, ts: time() }])
      setInput('')
    },
    onSuccess: (reply) => {
      setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: time() }])
    },
    onError: (err) => {
      const raw = err instanceof Error ? err.message : 'Unknown error'
      const msg = raw === 'NO_KEY'
        ? 'No API key set — go to **Settings** to add your OpenRouter or Anthropic key.'
        : `Error: ${raw}`
      setMessages(prev => [...prev, { role: 'assistant', content: msg, ts: time() }])
    },
  })

  function handleSend(text = input.trim()) {
    if (!text || send.isPending) return
    send.mutate(text)
  }

  // All hooks above — safe to early-return here
  if (activeSection === 'jarvis') return null

  const panelOnLeft = pos.x + FAB_SIZE + 384 > window.innerWidth

  function onFABMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    isDragging.current  = true
    hasDragged.current  = false
    dragOrigin.current  = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
    document.body.style.userSelect = 'none'
    document.body.style.cursor     = 'grabbing'
  }

  function onFABClick() {
    if (hasDragged.current) return
    setOpen(v => !v)
    setMinimised(false)
  }

  return (
    <div
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999 }}
    >
      {/* ── Chat panel — floats above/beside the FAB ── */}
      {open && (
        <div
          className={cn(
            'absolute bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-[height] duration-200',
            'w-96',
            minimised ? 'h-12' : 'h-130',
            panelOnLeft ? 'right-full mr-3' : 'left-full ml-3',
            pos.y < 200 ? 'top-0' : 'bottom-0',
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-linear-to-r from-[#7c3aed18] to-[#00d4ff10] shrink-0">
            <img src="/jarvis-icon.png" alt="Jarvis" className="w-6 h-6 rounded-lg shrink-0 object-cover" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-display font-bold text-tx">JARVIS AI</div>
              {!minimised && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: modeColor }} />
                  {/* Mode cycle button */}
                  <button
                    onClick={() => {
                      const next: JarvisMode = jarvisMode === 'white' ? 'gray' : jarvisMode === 'gray' ? 'black' : 'white'
                      setJarvisMode(next)
                      setMessages([{
                        role: 'assistant',
                        content: `**${MODE_LABEL[next]} mode.** ${next === 'white' ? 'Clean tactics only.' : next === 'gray' ? 'Calculated risk.' : 'No guardrails.'}`,
                        ts: time(),
                      }])
                    }}
                    className="flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-80"
                    title="Click to cycle mode"
                  >
                    <ModeIcon size={10} style={{ color: modeColor }} />
                    <span className="text-[10px] font-mono-jarvis font-semibold" style={{ color: modeColor }}>
                      {MODE_LABEL[jarvisMode]}
                    </span>
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setSection('jarvis'); setOpen(false) }}
                title="Open full chat"
                className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
              >
                <Maximize2 size={12} />
              </button>
              <button
                onClick={() => setMinimised(v => !v)}
                className="p-1.5 rounded-lg text-muted hover:text-tx hover:bg-surface transition-colors cursor-pointer"
              >
                <Minus size={12} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {!minimised && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
                {messages.map((m, i) => (
                  <div key={i} className={cn('flex gap-2', m.role === 'user' && 'flex-row-reverse')}>
                    <div className={cn(
                      'w-6 h-6 rounded-lg shrink-0 overflow-hidden flex items-center justify-center',
                      m.role === 'assistant' ? '' : 'bg-surface border border-border'
                    )}>
                      {m.role === 'assistant'
                        ? <img src="/jarvis-icon.png" alt="J" className="w-full h-full object-cover" />
                        : <User size={11} className="text-muted" />}
                    </div>
                    <div className={cn(
                      'max-w-[80%] rounded-xl px-3 py-2 text-[12px] leading-relaxed',
                      m.role === 'assistant'
                        ? 'bg-surface border border-border text-tx'
                        : 'bg-linear-to-br from-accent2 to-[#9333ea] text-white'
                    )}>
                      <MessageContent content={m.content} />
                      <div className="text-[9px] opacity-40 mt-0.5 font-mono-jarvis">{m.ts}</div>
                    </div>
                  </div>
                ))}

                {send.isPending && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-lg shrink-0 overflow-hidden">
                      <img src="/jarvis-icon.png" alt="J" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-surface border border-border rounded-xl px-3 py-2">
                      <div className="flex gap-0.5 items-center">
                        {[0, 1, 2].map(i => (
                          <span key={i} className="w-1 h-1 rounded-full bg-accent animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick asks */}
              {messages.length <= 1 && (
                <div className="px-4 pb-2 flex flex-col gap-1.5">
                  {MODE_QUICK_ASKS[jarvisMode].map(q => (
                    <button key={q} onClick={() => handleSend(q)} disabled={send.isPending}
                      className="text-left text-[11px] px-3 py-1.5 rounded-lg border border-border text-muted transition-all disabled:opacity-40 cursor-pointer truncate hover:text-tx"
                      style={{ ['--tw-border-opacity' as string]: '1' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = modeColor; e.currentTarget.style.color = modeColor }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.color = '' }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="px-3 pb-3 shrink-0">
                <div className="flex gap-2 items-end bg-surface border border-border rounded-xl px-3 py-2 focus-within:border-accent transition-colors">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder="Ask JARVIS… (Enter to send)"
                    rows={1}
                    className="flex-1 bg-transparent text-xs text-tx outline-none resize-none placeholder:text-muted leading-relaxed max-h-20"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={send.isPending || !input.trim()}
                    className={cn(
                      'p-1.5 rounded-lg transition-colors shrink-0',
                      send.isPending || !input.trim()
                        ? 'text-muted cursor-not-allowed'
                        : 'bg-accent2 text-white hover:bg-accent cursor-pointer'
                    )}
                  >
                    {send.isPending
                      ? <Brain size={13} className="animate-pulse" />
                      : <Send size={13} />}
                  </button>
                </div>
                {!ready && (
                  <div className="text-[10px] text-muted mt-1.5 text-center font-mono-jarvis">
                    No AI key —{' '}
                    <button onClick={() => setSection('onboarding')} className="text-accent hover:underline cursor-pointer">
                      add one in Onboarding
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── FAB button ── */}
      <button
        onMouseDown={onFABMouseDown}
        onClick={onFABClick}
        className={cn(
          'w-14 h-14 rounded-2xl overflow-hidden shadow-xl transition-all duration-200 relative select-none',
          'hover:scale-105 active:scale-95 ring-2 ring-accent2/40',
          'cursor-grab',
        )}
        title="JARVIS AI — drag to move"
      >
        {open
          ? (
            <div className="w-full h-full bg-linear-to-br from-accent2 to-accent flex items-center justify-center">
              <X size={20} className="text-white" />
            </div>
          ) : (
            <img src="/jarvis-icon.png" alt="Jarvis" className="w-full h-full object-cover" />
          )
        }

        {/* Pulse ring when AI ready and chat closed */}
        {!open && ready && (
          <span className="absolute inset-0 rounded-2xl animate-ping bg-accent2 opacity-20 pointer-events-none" />
        )}

        {/* Unread dot */}
        {!open && messages.length > 1 && (
          <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-accent3 border-2 border-bg" />
        )}

        {/* No key indicator */}
        {!ready && (
          <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-danger border-2 border-bg flex items-center justify-center">
            <Zap size={6} className="text-white" />
          </span>
        )}
      </button>
    </div>
  )
}
