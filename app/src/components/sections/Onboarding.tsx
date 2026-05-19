import { useState, useEffect } from 'react'
import {
  CheckCircle2, ChevronRight, ChevronDown, KeyRound, Globe, BarChart2,
  Swords, CalendarClock, PlugZap, PenLine, Trophy, Activity, Rss,
  Eye, EyeOff, Link, Zap, TrendingUp, Search, RefreshCw, Sparkles,
} from 'lucide-react'
import { getSerperStatus, resetExhaustedKeys } from '@/lib/serper'
import { useStore } from '@/store'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { isAIReady } from '@/lib/ai'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { NavSection, Schedule, WPSite } from '@/types'

interface StoreCheck {
  domain: string; anthropicKey: string; schedules: Schedule[]; wpSites: WPSite[]
  gscConnected: boolean; ga4Connected: boolean; hasAudit: boolean
}

interface Step {
  id: string; title: string; desc: string; Icon: React.ElementType
  actionLabel: string; nav: NavSection; tip: string
  check: (store: StoreCheck) => boolean
}

const STEPS: Step[] = [
  {
    id: 'domain',
    title: 'Set your primary domain',
    desc: 'Add your main casino/iGaming site so Jarvis personalises all analysis and AI outputs to your property.',
    Icon: Globe,
    actionLabel: 'Open Settings',
    nav: 'dashboard',
    tip: 'Use your root domain without www — e.g. "casinoexpert.io" not "www.casinoexpert.io".',
    check: (s) => !!s.domain,
  },
  {
    id: 'apikey',
    title: 'Connect your Anthropic API key',
    desc: 'Unlock all AI tools — Article Writer, Content Grader, Jarvis AI chat, SERP analysis and more.',
    Icon: KeyRound,
    actionLabel: 'Add API Key',
    nav: 'jarvis',
    tip: 'Your key is stored only in your browser localStorage and sent directly to Anthropic — never to our servers.',
    check: () => isAIReady(),
  },
  {
    id: 'audit',
    title: 'Run your first site audit',
    desc: 'Discover Core Web Vitals issues, crawl errors, and on-page opportunities on your casino site.',
    Icon: BarChart2,
    actionLabel: 'Run Audit',
    nav: 'analyzer',
    tip: 'The audit scores your site across 60+ technical and on-page factors relevant to iGaming YMYL content.',
    check: (s) => s.hasAudit,
  },
  {
    id: 'competitors',
    title: 'Add competitors to track',
    desc: 'Monitor 10cric.com, betway.in, or your top-ranking rivals in India/Indonesia for keyword gaps and content moves.',
    Icon: Swords,
    actionLabel: 'Add Competitors',
    nav: 'competitors',
    tip: 'Track 3–5 competitors for best results. For India, focus on sites ranking above you for "best online casino india" and "teen patti online". For Indonesia, target "slot online terpercaya" rivals.',
    check: () => false,
  },
  {
    id: 'schedule',
    title: 'Schedule your first SEO report',
    desc: 'Set up a recurring monthly or weekly report for your client or team inbox.',
    Icon: CalendarClock,
    actionLabel: 'Create Schedule',
    nav: 'scheduler',
    tip: 'Monthly performance reports sent on the 1st work best — clients review SEO on the first Monday of the month.',
    check: (s) => s.schedules.length > 0,
  },
  {
    id: 'gsc',
    title: 'Connect Google Search Console',
    desc: 'Import live query data to see which India/Indonesia casino keywords drive real clicks — clicks, impressions, CTR, and average position.',
    Icon: PlugZap,
    actionLabel: 'Connect GSC',
    nav: 'gsc',
    tip: 'GSC data reveals which queries Googlebot sees you for — even ones you are not actively tracking.',
    check: (s) => s.gscConnected,
  },
  {
    id: 'ga4',
    title: 'Connect Google Analytics 4',
    desc: 'Link GA4 to pull live sessions, conversions, and revenue attribution.',
    Icon: Activity,
    actionLabel: 'Connect GA4',
    nav: 'ga4',
    tip: 'The GSC × GA4 Cross-View maps every keyword from Search Console to its GA4 revenue.',
    check: (s) => s.ga4Connected,
  },
  {
    id: 'wordpress',
    title: 'Connect your WordPress sites',
    desc: 'Add your WordPress sites so Jarvis can publish AI-generated articles directly.',
    Icon: Rss,
    actionLabel: 'Add WordPress Sites',
    nav: 'wordpress',
    tip: 'Use WordPress Application Passwords (WP Admin → Users → Profile) — no plugins needed.',
    check: (s) => s.wpSites.some(w => w.status === 'connected'),
  },
  {
    id: 'article',
    title: 'Generate your first AI article',
    desc: 'Use the Article Writer to produce a 2,000-word iGaming article in one click.',
    Icon: PenLine,
    actionLabel: 'Open Article Writer',
    nav: 'articlewriter',
    tip: 'For India: start with "Best Online Casino India 2026". For Indonesia: "Slot Online Terpercaya 2026".',
    check: () => false,
  },
]

// ── API Connection card ────────────────────────────────────────
interface ApiCard {
  id:          string
  label:       string
  description: string
  badge:       string
  badgeColor:  'green' | 'amber' | 'purple'
  placeholder: string
  docsUrl:     string
  Icon:        React.ElementType
  storeKey:    'anthropicKey' | 'openRouterKey' | 'openPageRankKey' | 'dataForSEOKey' | 'serpApiKey' | 'searchFitKey'
  setter:      'setAnthropicKey' | 'setOpenRouterKey' | 'setOpenPageRankKey' | 'setDataForSEOKey' | 'setSerpApiKey' | 'setSearchFitKey'
  hint:        string
}

const API_CARDS: ApiCard[] = [
  {
    id: 'openrouter', label: 'OpenRouter', description: 'Multi-model gateway — access 200+ LLMs including free Llama, DeepSeek, Gemini & more.',
    badge: 'FREE', badgeColor: 'green', placeholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
    Icon: Zap, storeKey: 'openRouterKey', setter: 'setOpenRouterKey',
    hint: 'Free tier available · Llama 3.3 70B, DeepSeek R1, Gemini Flash & 200+ models',
  },
  {
    id: 'anthropic', label: 'Anthropic Claude', description: 'Powers all AI writing, analysis, and Jarvis AI chat.',
    badge: 'PAID', badgeColor: 'purple', placeholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com',
    Icon: Zap, storeKey: 'anthropicKey', setter: 'setAnthropicKey',
    hint: '14 AI tools unlocked · Jarvis AI, Article Writer, Content Grader, and more',
  },
  {
    id: 'searchfit', label: 'SearchFit SEO', description: 'Free AI SEO toolkit — audit, strategy, optimize, markup, keywords, visibility.',
    badge: 'FREE', badgeColor: 'green', placeholder: 'sf-...',
    docsUrl: 'https://searchfit.ai',
    Icon: Sparkles, storeKey: 'searchFitKey', setter: 'setSearchFitKey',
    hint: 'Audit, keyword research, content optimization, schema markup, AI visibility',
  },
  {
    id: 'openpagerank', label: 'OpenPageRank', description: 'Domain rating (0–10) and global rank only. No traffic, keywords, or backlink details.',
    badge: 'FREE', badgeColor: 'green', placeholder: 'xxxxxxxx-xxxx-xxxx-...',
    docsUrl: 'https://www.domainranking.org',
    Icon: Link, storeKey: 'openPageRankKey', setter: 'setOpenPageRankKey',
    hint: 'Site Explorer DR score — domain rating and global rank position',
  },
  {
    id: 'dataforseo', label: 'DataForSEO', description: 'Rank tracking, keyword data, and SERP results.',
    badge: 'PAID', badgeColor: 'amber', placeholder: 'login:password',
    docsUrl: 'https://dataforseo.com',
    Icon: TrendingUp, storeKey: 'dataForSEOKey', setter: 'setDataForSEOKey',
    hint: 'Rank Tracker, Keyword Explorer, Update SERP · ~$0.0006 per check',
  },
  {
    id: 'serpapi', label: 'SerpAPI', description: 'Real-time SERP data — 100 free searches per month.',
    badge: 'FREEMIUM', badgeColor: 'amber', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxx...',
    docsUrl: 'https://serpapi.com',
    Icon: Search, storeKey: 'serpApiKey', setter: 'setSerpApiKey',
    hint: '100 free searches/month · Rank Tracker, Update SERP alternative',
  },
]

function ApiConnectionCard({ card }: { card: ApiCard }) {
  const store  = useStore()
  const value  = store[card.storeKey] as string
  const setter = store[card.setter]  as (k: string) => void

  const [input,   setInput]   = useState(value)
  const [visible, setVisible] = useState(false)
  const [saved,   setSaved]   = useState(false)

  const isConnected  = !!value
  const badgeVariant = card.badgeColor === 'green' ? 'green' : card.badgeColor === 'amber' ? 'amber' : 'purple'

  function handleSave() {
    setter(input.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <Card className={`space-y-3 ${isConnected ? 'border-accent3/40' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isConnected ? 'bg-accent3/20' : 'bg-surface'}`}>
            <card.Icon size={15} className={isConnected ? 'text-accent3' : 'text-muted'} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-tx">{card.label}</span>
              <Badge variant={badgeVariant}>{card.badge}</Badge>
              {isConnected && (
                <span className="flex items-center gap-1 text-[10px] text-accent3 font-mono-jarvis">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent3 animate-pulse inline-block" />
                  Connected
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted mt-0.5">{card.description}</div>
          </div>
        </div>
        <a href={card.docsUrl} target="_blank" rel="noreferrer"
          className="text-[10px] text-accent hover:underline shrink-0 font-mono-jarvis">
          Get key ↗
        </a>
      </div>

      <div className="flex gap-2">
        <input
          type={visible ? 'text' : 'password'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder={card.placeholder}
          autoComplete="off"
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors"
        />
        <button onClick={() => setVisible(v => !v)}
          className="px-2.5 rounded-lg border border-border text-muted hover:text-tx transition-colors">
          {visible ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <Button variant="primary" onClick={handleSave} className="text-xs px-3">
          {saved ? <><CheckCircle2 size={12} /> Saved</> : 'Save'}
        </Button>
        {isConnected && (
          <Button variant="ghost" onClick={() => { setter(''); setInput('') }}
            className="text-xs px-3 text-danger hover:text-danger">
            Remove
          </Button>
        )}
      </div>

      <div className="text-[10px] text-muted font-mono-jarvis">
        {isConnected ? `● Active · ${card.hint}` : `○ ${card.hint}`}
      </div>
    </Card>
  )
}

// ── Serper multi-key card (special UI) ────────────────────────
function SerperCard() {
  const { serperKeys, setSerperKeys } = useStore()
  const [input,  setInput]  = useState(serperKeys)
  const [saved,  setSaved]  = useState(false)
  const [, forceUpdate]     = useState(0)

  const status      = getSerperStatus()
  const isConnected = status.total > 0

  function handleSave() {
    setSerperKeys(input.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  function handleReset() {
    resetExhaustedKeys()
    forceUpdate(n => n + 1)
  }

  return (
    <Card className={`space-y-3 ${isConnected ? 'border-accent3/40' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isConnected ? 'bg-accent3/20' : 'bg-surface'}`}>
            <Search size={15} className={isConnected ? 'text-accent3' : 'text-muted'} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-tx">Serper API</span>
              <Badge variant="green">FREE TIER</Badge>
              <Badge variant="amber">AUTO-ROTATE</Badge>
              {isConnected && (
                <span className="flex items-center gap-1 text-[10px] text-accent3 font-mono-jarvis">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent3 animate-pulse inline-block" />
                  {status.active}/{status.total} active
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted mt-0.5">
              Real-time Google SERP data. Add multiple keys — Jarvis auto-rotates when credits run out.
            </div>
          </div>
        </div>
        <a href="https://serper.dev" target="_blank" rel="noreferrer"
          className="text-[10px] text-accent hover:underline shrink-0 font-mono-jarvis">
          Get key ↗
        </a>
      </div>

      {/* Multi-key textarea */}
      <div>
        <div className="text-[10px] text-muted font-mono-jarvis mb-1.5">
          ONE KEY PER LINE — exhausted keys are skipped automatically, reset after 24 h
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={'xxxxxxxxxxxxxxxxxxxxxxxx...\nyyyyyyyyyyyyyyyyyyyyyyyy...\nzzzzzzzzzzzzzzzzzzzzzzzz...'}
          rows={3}
          autoComplete="off"
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors resize-none"
        />
      </div>

      {/* Key status badges */}
      {isConnected && (
        <div className="flex items-center gap-2 flex-wrap">
          {serperKeys.split(/[\n,|]/).map(k => k.trim()).filter(Boolean).map((k, i) => {
            const isKeyExhausted = getSerperStatus().exhaustedKeys.has(k)
            return (
              <span key={i}
                className={`text-[10px] font-mono-jarvis px-2 py-0.5 rounded-full border ${
                  isKeyExhausted
                    ? 'border-danger/40 text-danger bg-danger/10'
                    : 'border-accent3/40 text-accent3 bg-accent3/10'
                }`}>
                Key {i + 1}: ...{k.slice(-6)} {isKeyExhausted ? '✗ exhausted' : '✓ active'}
              </span>
            )
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="primary" onClick={handleSave} className="text-xs px-3">
          {saved ? <><CheckCircle2 size={12} /> Saved</> : 'Save Keys'}
        </Button>
        {status.exhausted > 0 && (
          <Button variant="ghost" onClick={handleReset} className="text-xs px-3">
            <RefreshCw size={12} /> Reset Exhausted ({status.exhausted})
          </Button>
        )}
        {isConnected && (
          <Button variant="ghost" onClick={() => { setSerperKeys(''); setInput('') }}
            className="text-xs px-3 text-danger hover:text-danger">
            Remove All
          </Button>
        )}
      </div>

      <div className="text-[10px] text-muted font-mono-jarvis">
        {isConnected
          ? `● ${status.active} active key${status.active !== 1 ? 's' : ''} · ${status.exhausted} exhausted · auto-resets after 24h · Rank Tracker, Keyword Explorer, Update SERP`
          : '○ Rank Tracker, Keyword Explorer, Update SERP · 2,500 free searches/month per key'}
      </div>
    </Card>
  )
}

// ── OpenRouter Model Picker ─────────────────────────────────────
const FREE_MODELS = [
  { id: 'deepseek/deepseek-chat-v3-0324:free',      label: 'DeepSeek Chat V3 (Free) ★' },
  { id: 'deepseek/deepseek-r1:free',                label: 'DeepSeek R1 (Free)'         },
  { id: 'google/gemini-2.0-flash-exp:free',         label: 'Gemini 2.0 Flash (Free)'    },
  { id: 'meta-llama/llama-3.3-70b-instruct:free',  label: 'Llama 3.3 70B (Free)'       },
  { id: 'qwen/qwen-2.5-72b-instruct:free',          label: 'Qwen 2.5 72B (Free)'        },
  { id: 'microsoft/phi-4:free',                     label: 'Microsoft Phi-4 (Free)'     },
  { id: 'anthropic/claude-3.5-sonnet',              label: 'Claude 3.5 Sonnet (Paid)'   },
  { id: 'openai/gpt-4o-mini',                       label: 'GPT-4o Mini (Paid)'         },
]

function OpenRouterModelPicker() {
  const { openRouterModel, setOpenRouterModel, openRouterKey } = useStore()
  if (!openRouterKey) return null
  return (
    <div className="mt-2 flex items-center gap-2 px-1">
      <span className="text-[10px] text-muted font-mono-jarvis shrink-0">Model:</span>
      <select
        value={openRouterModel}
        onChange={e => setOpenRouterModel(e.target.value)}
        className="flex-1 bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-tx outline-none cursor-pointer"
      >
        {FREE_MODELS.map(m => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  )
}

// ── AI Provider Switcher ────────────────────────────────────────
function AiProviderSwitcher() {
  const { aiProvider, setAiProvider, anthropicKey, openRouterKey } = useStore()
  const opts = [
    { id: 'openrouter' as const, label: 'OpenRouter',       sub: 'Free · 200+ models',   connected: !!openRouterKey },
    { id: 'anthropic'  as const, label: 'Anthropic Claude', sub: 'Paid · claude-sonnet', connected: !!anthropicKey },
  ]
  return (
    <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Zap size={13} className="text-accent" />
        <span className="text-xs font-semibold text-tx">Active AI Provider</span>
        <span className="text-[10px] text-muted ml-auto">Powers Jarvis AI, Keyword Explorer, AI Visibility &amp; more</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {opts.map(o => (
          <button
            key={o.id}
            onClick={() => setAiProvider(o.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              aiProvider === o.id
                ? 'border-accent bg-accent/10 text-tx'
                : 'border-border text-muted hover:border-accent/40'
            }`}
          >
            <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${
              aiProvider === o.id ? 'border-accent bg-accent' : 'border-muted'
            }`} />
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">{o.label}</div>
              <div className="text-[10px] text-muted">{o.sub}</div>
            </div>
            {o.connected
              ? <span className="ml-auto text-[9px] text-accent3 font-mono-jarvis shrink-0">● ON</span>
              : <span className="ml-auto text-[9px] text-muted font-mono-jarvis shrink-0">○ OFF</span>
            }
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────
export function Onboarding() {
  const store  = useStore()
  const { org } = useAuthStore()
  const { setSection } = store
  const [expanded, setExpanded] = useState<string | null>('domain')
  const [manual,   setManual]   = useState<Set<string>>(new Set())
  const [apiOpen,  setApiOpen]  = useState(true)

  const [gscConnected, setGscConnected] = useState(false)
  const [ga4Connected, setGa4Connected] = useState(false)
  const [hasAudit,     setHasAudit]     = useState(false)

  useEffect(() => {
    const orgId = org?.id
    if (!orgId) return
    Promise.all([
      supabase.from('jarvis_gsc_connections').select('org_id').eq('org_id', orgId).maybeSingle(),
      supabase.from('jarvis_ga4_connections').select('org_id').eq('org_id', orgId).maybeSingle(),
      supabase.from('jarvis_crawl_jobs').select('id').eq('org_id', orgId).eq('status', 'completed').limit(1),
    ]).then(([gscRes, ga4Res, auditRes]) => {
      setGscConnected(!!gscRes.data)
      setGa4Connected(!!ga4Res.data)
      setHasAudit(!!(auditRes.data as { id: string }[] | null)?.length)
    }).catch(() => {})
  }, [org?.id])

  const storeCheck: StoreCheck = { ...store, gscConnected, ga4Connected, hasAudit }
  const isComplete = (step: Step) => step.check(storeCheck) || manual.has(step.id)
  const completedCount = STEPS.filter(s => isComplete(s)).length
  const progress = Math.round((completedCount / STEPS.length) * 100)
  const allDone  = completedCount === STEPS.length

  const connectedApis = [
    store.anthropicKey, store.openRouterKey, store.searchFitKey,
    store.openPageRankKey, store.dataForSEOKey, store.serpApiKey, store.serperKeys,
  ].filter(Boolean).length

  function markDone(id: string) {
    setManual(prev => { const n = new Set(prev); n.add(id); return n })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            {allDone
              ? <Trophy size={22} className="text-accent4" />
              : <div className="font-display font-black text-xl text-accent">{completedCount}/{STEPS.length}</div>
            }
          </div>
          <div className="flex-1">
            <CardTitle className="mb-1">
              {allDone ? 'Setup Complete — Jarvis is Ready' : 'Getting Started with Jarvis'}
            </CardTitle>
            <div className="text-xs text-muted leading-relaxed mb-3">
              {allDone
                ? "All modules are unlocked. You're set up to run a full iGaming SEO operation from Jarvis."
                : `Complete ${STEPS.length - completedCount} more step${STEPS.length - completedCount !== 1 ? 's' : ''} to unlock every Jarvis module.`
              }
            </div>
            <div className="h-2.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted font-mono-jarvis mt-1">
              <span>{progress}% complete</span>
              <span>{completedCount} of {STEPS.length} steps done</span>
            </div>
          </div>
        </div>
        {allDone && (
          <div className="p-3 bg-[#f59e0b15] border border-[#f59e0b30] rounded-xl text-xs text-tx text-center">
            <Trophy size={14} className="inline mr-1.5 text-accent4" />
            You've unlocked all {STEPS.length} onboarding steps. Time to start ranking.
          </div>
        )}
      </Card>

      {/* ── API Connections ────────────────────────────────── */}
      <Card className="p-0 overflow-hidden">
        <button
          onClick={() => setApiOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <KeyRound size={15} className="text-accent" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm text-tx">API Connections</div>
              <div className="text-[11px] text-muted">
                {connectedApis > 0
                  ? `${connectedApis} of ${API_CARDS.length} APIs connected`
                  : 'Connect external APIs to unlock all data features'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connectedApis > 0 && (
              <span className="text-[11px] text-accent3 font-mono-jarvis">
                {connectedApis} active
              </span>
            )}
            {apiOpen ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
          </div>
        </button>

        {apiOpen && (
          <div className="px-5 pb-5 border-t border-border pt-4 space-y-3">
            <p className="text-xs text-muted">
              All keys are stored only in your browser — never sent to Jarvis servers.
              Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-mono-jarvis">Enter</kbd> or click Save after entering each key.
            </p>

            {/* AI Provider Switcher */}
            <AiProviderSwitcher />

            {API_CARDS.map(card => (
              <div key={card.id}>
                <ApiConnectionCard card={card} />
                {card.id === 'openrouter' && <OpenRouterModelPicker />}
              </div>
            ))}
            <SerperCard />
          </div>
        )}
      </Card>

      {/* ── Setup Steps ────────────────────────────────────── */}
      <div className="space-y-2">
        {STEPS.map((step, i) => {
          const done   = isComplete(step)
          const isOpen = expanded === step.id
          const { Icon } = step
          return (
            <Card key={step.id} className={`p-0 overflow-hidden ${done ? 'opacity-90' : ''}`}>
              <button
                onClick={() => setExpanded(isOpen ? null : step.id)}
                className="w-full flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-surface transition-colors text-left"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-accent3' : 'bg-border'}`}>
                  {done
                    ? <CheckCircle2 size={16} className="text-black" />
                    : <span className="text-[11px] font-bold text-muted">{i + 1}</span>
                  }
                </div>
                <Icon size={16} className={done ? 'text-accent3 shrink-0' : 'text-accent shrink-0'} />
                <div className="flex-1 min-w-0 text-left">
                  <div className={`font-semibold text-sm ${done ? 'text-muted line-through' : 'text-tx'}`}>{step.title}</div>
                  {!isOpen && <div className="text-[11px] text-muted truncate">{step.desc}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {done && <Badge variant="green">Done</Badge>}
                  {isOpen ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 border-t border-border pt-4 space-y-3">
                  <div className="text-sm text-muted leading-relaxed">{step.desc}</div>
                  <div className="p-3 bg-surface border border-border rounded-lg text-[11px] text-muted leading-relaxed">
                    <span className="text-accent font-semibold">Tip: </span>{step.tip}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" onClick={() => setSection(step.nav)}>
                      {step.actionLabel}
                    </Button>
                    {!done && (
                      <Button variant="ghost" onClick={() => markDone(step.id)} className="text-[11px]">
                        <CheckCircle2 size={12} /> Mark as done
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
