import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Copy, Check, RefreshCw, History } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'
import { cn } from '@/lib/utils'

interface SnippetRecord {
  id: string; savedAt: string; label: string; sublabel: string
  tone: string; articleExcerpt: string; snippets: Record<string, Snippet>
}

interface Platform {
  id: string; name: string; limit: number; color: string
  hint: string; hashtagStyle: 'moderate' | 'heavy' | 'minimal'
}

interface Snippet { platform: string; text: string; hashtags: string }

const PLATFORMS: Platform[] = [
  { id: 'linkedin', name: 'LinkedIn',  limit: 3000, color: '#0077B5', hint: 'Professional tone, value-first, 3–5 hashtags', hashtagStyle: 'minimal' },
  { id: 'twitter',  name: 'X (Twitter)', limit: 280, color: '#000000', hint: 'Punchy, hook in line 1, 2–3 hashtags', hashtagStyle: 'minimal' },
  { id: 'facebook', name: 'Facebook',  limit: 2000, color: '#1877F2', hint: 'Conversational, question-based, engaging', hashtagStyle: 'minimal' },
  { id: 'instagram',name: 'Instagram', limit: 2200, color: '#E1306C', hint: 'Visual hook, 15–20 hashtags in caption', hashtagStyle: 'heavy' },
  { id: 'threads',  name: 'Threads',   limit: 500,  color: '#000000', hint: 'Casual, opinion-driven, conversational', hashtagStyle: 'minimal' },
]


const TONES = ['Expert & Authoritative', 'Casual & Friendly', 'Data-Driven', 'Story-Based'] as const

function PlatformLogo({ id, color }: { id: string; color: string }) {
  const logos: Record<string, React.ReactNode> = {
    linkedin: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
        <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
      </svg>
    ),
    twitter: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    facebook: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>
    ),
    instagram: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="1" fill={color} stroke="none"/>
      </svg>
    ),
    threads: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.5 12.068c0-3.52.85-6.374 2.495-8.423C5.845 1.24 8.598.059 12.18.035h.013c3.057.017 5.583.95 7.507 2.773C22.113 4.8 23.1 7.42 23.1 10.8c0 4.48-1.556 7.22-4.664 8.144a2.84 2.84 0 0 1-.8.116c-1.27 0-2.1-.69-2.3-1.9-.22 1.28-.73 1.9-1.76 1.9-.45 0-.87-.12-1.24-.36v.45c0 1.5.77 2.28 2.28 2.28 1.08 0 1.97-.38 2.67-1.14l.83.97c-.87.97-2.1 1.48-3.55 1.48-2.36 0-3.78-1.38-3.78-3.7v-4.1c0-1.17.37-2.04 1.08-2.58-.5-.14-.93-.44-1.24-.88-.3-.43-.45-.95-.45-1.53 0-1.12.5-1.97 1.47-2.47.74-.38 1.67-.58 2.76-.58 2.04 0 3.46.78 4.22 2.3.45.9.68 2.07.68 3.5"/>
      </svg>
    ),
  }
  return <span className="shrink-0">{logos[id]}</span>
}

export function SocialSnippets() {
  const [articleText, setArticleText] = useState(`Best Online Casinos UK 2026: Expert Tested & Ranked\n\nAfter testing over 40 UKGC-licensed casinos across eight core criteria — licensing, bonus fairness, payout speed, game library, mobile experience, customer support, responsible gambling tools, and software quality — we've identified the casinos that genuinely outperform the rest.\n\nWelcome bonus: 100% up to £250 + 50 free spins (30x wagering — below the UK average of 35x). Payout speed: 0-24 hours via PayPal.`)
  const [tone,       setTone]       = useState<typeof TONES[number]>('Expert & Authoritative')
  const [snippets,   setSnippets]   = useState<Record<string, Snippet>>({})
  const [copied,     setCopied]     = useState<string | null>(null)
  const [selected,   setSelected]   = useState<string>('linkedin')
  const [tab,        setTab]        = useState<'tool' | 'history'>('tool')

  const { records, save, remove, clear } = useHistory<SnippetRecord>('jarvis_socialsnippets_history')

  const generate = useMutation({
    mutationFn: async () => {
      return callClaude(
        'You are an expert iGaming social media strategist. Create platform-optimised social captions for casino affiliate content.',
        `Turn this casino article into social media snippets for 5 platforms. Tone: ${tone}.

ARTICLE:
${articleText.slice(0, 1500)}

Return JSON:
{
  "linkedin": {"platform":"linkedin","text":"professional post (max 1300 chars)","hashtags":"3-5 tags"},
  "twitter":  {"platform":"twitter","text":"punchy tweet (max 280 chars)","hashtags":"2-3 tags"},
  "facebook": {"platform":"facebook","text":"engaging post (max 500 chars)","hashtags":"2-3 tags"},
  "instagram": {"platform":"instagram","text":"visual caption (max 300 chars body)","hashtags":"15-20 gambling/casino hashtags"},
  "threads":  {"platform":"threads","text":"conversational post (max 500 chars)","hashtags":""}
}

Make each one platform-native and casino/iGaming appropriate.`,
        1600,
      )
    },
    onSuccess: (data) => {
      if (data) {
        try {
          const match = data.match(/\{[\s\S]*\}/)
          if (!match) return
          const s = JSON.parse(match[0]) as Record<string, Snippet>
          setSnippets(s)
          save({ id: crypto.randomUUID(), savedAt: new Date().toISOString(), label: articleText.slice(0, 60).trim(), sublabel: `${tone} · ${Object.keys(s).length} platforms`, tone, articleExcerpt: articleText.slice(0, 500), snippets: s })
        } catch { /* keep */ }
      }
    },
  })

  function handleCopy(id: string) {
    const s = snippets[id]
    if (!s) return
    navigator.clipboard.writeText(s.text + (s.hashtags ? '\n\n' + s.hashtags : ''))
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const selectedPlatform = PLATFORMS.find(p => p.id === selected)!
  const selectedSnippet  = snippets[selected]
  const fullText = selectedSnippet ? selectedSnippet.text + (selectedSnippet.hashtags ? '\n\n' + selectedSnippet.hashtags : '') : ''
  const charCount = fullText.length

  return (
    <div className="space-y-5">
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab('tool')} className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer', tab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>Social Snippets</button>
        <button onClick={() => setTab('history')} className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer', tab === 'history' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          <History size={11} /> History {records.length > 0 && `(${records.length})`}
        </button>
      </div>
      {tab === 'history' ? (
        <HistoryPanel records={records} onLoad={r => { setSnippets(r.snippets); setTone(r.tone as typeof TONES[number]); setArticleText(r.articleExcerpt); setTab('tool') }} onDelete={remove} onClear={clear} emptyText="No snippets saved yet. Generate social snippets to save results." />
      ) : (<>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Input */}
        <Card className="lg:col-span-2 space-y-4">
          <CardTitle>Social Snippet Generator</CardTitle>
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">ARTICLE TEXT / PASTE CONTENT</div>
            <textarea value={articleText} onChange={e => setArticleText(e.target.value)} rows={12}
              placeholder="Paste your casino article here…"
              className="w-full bg-surface border border-border rounded-lg p-3 text-xs text-tx outline-none focus:border-accent transition-colors resize-none scrollbar-thin" />
          </div>
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">TONE</div>
            <div className="grid grid-cols-2 gap-1">
              {TONES.map(t => (
                <button key={t} onClick={() => setTone(t)}
                  className={`py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer border transition-all ${tone === t ? 'bg-accent2 text-white border-accent2' : 'border-border text-muted hover:border-accent'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Button variant="primary" className="w-full justify-center" onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            {generate.isPending ? 'Generating…' : 'Generate 5 Snippets'}
          </Button>
          {!isAIReady() && <div className="text-[10px] text-muted">Add an AI key in Onboarding.</div>}
        </Card>

        {/* Outputs */}
        <div className="lg:col-span-3 space-y-4">
          {/* Platform tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {PLATFORMS.map(p => (
              <button key={p.id} onClick={() => setSelected(p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-all ${selected === p.id ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border text-muted hover:border-accent/30'}`}>
                <PlatformLogo id={p.id} color={selected === p.id ? '#00d4ff' : '#6b7280'} />
                {p.name}
              </button>
            ))}
          </div>

          {/* Selected platform preview */}
          {selectedSnippet && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <PlatformLogo id={selectedPlatform.id} color={selectedPlatform.color} />
                  <CardTitle>{selectedPlatform.name}</CardTitle>
                  <Badge variant={charCount > selectedPlatform.limit ? 'red' : charCount > selectedPlatform.limit * 0.85 ? 'amber' : 'green'}>
                    {charCount} / {selectedPlatform.limit}
                  </Badge>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="ghost" className="text-[11px]" onClick={() => generate.mutate()} disabled={generate.isPending}>
                    <RefreshCw size={11} className={generate.isPending ? 'animate-spin' : ''} /> Regenerate
                  </Button>
                  <Button variant="primary" className="text-[11px]" onClick={() => handleCopy(selected)}>
                    {copied === selected ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                  </Button>
                </div>
              </div>

              <div className="text-[10px] text-muted font-mono-jarvis mb-2">{selectedPlatform.hint}</div>

              <div className="bg-surface border border-border rounded-xl p-4 whitespace-pre-wrap text-sm text-tx leading-relaxed">
                {selectedSnippet.text}
                {selectedSnippet.hashtags && (
                  <div className="mt-3 text-accent2 text-xs">{selectedSnippet.hashtags}</div>
                )}
              </div>
            </Card>
          )}

          {/* All platform quick view */}
          <div className="grid grid-cols-1 gap-2">
            {PLATFORMS.filter(p => p.id !== selected).map(p => {
              const s = snippets[p.id]
              if (!s) return null
              return (
                <div key={p.id} className="flex items-start gap-3 p-3 bg-surface border border-border rounded-xl">
                  <PlatformLogo id={p.id} color={p.color} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold mb-1" style={{ color: p.color }}>{p.name}</div>
                    <div className="text-xs text-muted leading-snug line-clamp-2">{s.text}</div>
                  </div>
                  <button onClick={() => handleCopy(p.id)}
                    className="shrink-0 p-1.5 text-muted hover:text-accent transition-colors cursor-pointer">
                    {copied === p.id ? <Check size={12} className="text-accent3" /> : <Copy size={12} />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      </>)}
    </div>
  )
}
