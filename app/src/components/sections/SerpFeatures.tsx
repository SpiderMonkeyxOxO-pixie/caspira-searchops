import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Search, TrendingUp, Star, MapPin, ShoppingCart, Image, Video, BookOpen, HelpCircle, ChevronUp, ChevronDown, Check, History } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { useStore } from '@/store'
import { callDFS, isDFSReady, LOCATION_CODES, COUNTRIES } from '@/lib/dataforseo'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'
import { cn } from '@/lib/utils'

interface SerpFeature {
  feature: string
  icon: string
  keywords: { kw: string; position: number; owned: boolean }[]
  opportunity: 'high' | 'medium' | 'low'
  tip: string
}

interface SerpFeaturesRecord {
  id: string
  savedAt: string
  label: string
  sublabel: string
  url: string
  features: SerpFeature[]
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  'Featured Snippet': <Star size={13} />,
  'Local Pack':       <MapPin size={13} />,
  'Shopping':         <ShoppingCart size={13} />,
  'Image Pack':       <Image size={13} />,
  'Video Carousel':   <Video size={13} />,
  'People Also Ask':  <HelpCircle size={13} />,
  'Knowledge Panel':  <BookOpen size={13} />,
  'Top Stories':      <TrendingUp size={13} />,
}

const FEATURE_TOOLTIPS: Record<string, string> = {
  'Featured Snippet': 'A boxed answer shown above all organic results (Position 0). Captured with direct, concise answers to question keywords — ideal for "how to" and "what is" queries.',
  'People Also Ask':  'Expandable question boxes below the Featured Snippet. Each question you win expands to show more related questions, creating a PAA chain effect.',
  'Knowledge Panel':  'A sidebar card showing entity information (brand, founder, social links). Strengthened by Organization schema and Wikipedia/Wikidata presence.',
  'Local Pack':       'A map + 3 listings shown for geo-intent queries. Requires a verified Google Business Profile and local SEO signals.',
  'Shopping':         'Product listing ads shown for commercial queries. Requires Google Merchant Center and structured Product schema with price data.',
  'Image Pack':       'A horizontal strip of images shown for visual queries. Optimise with descriptive filenames, alt text, and image schema.',
  'Video Carousel':   'Video results shown for how-to and review queries. Optimise YouTube videos with timestamps and VideoObject schema.',
  'Top Stories':      'A carousel of recent news articles. Requires Google News inclusion and NewsArticle schema with a recent publication date.',
}

const OPP_COLOR: Record<string, 'green' | 'amber' | 'red'> = {
  high: 'green', medium: 'amber', low: 'red',
}

const FEATURE_TYPE_MAP: Record<string, string> = {
  featured_snippet: 'Featured Snippet',
  people_also_ask:  'People Also Ask',
  local_pack:       'Local Pack',
  shopping:         'Shopping',
  images:           'Image Pack',
  video:            'Video Carousel',
  top_stories:      'Top Stories',
  knowledge_graph:  'Knowledge Panel',
}

export function SerpFeatures() {
  const { domain } = useStore()
  const [url,      setUrl]      = useState(domain || '')
  const [kwInput,  setKwInput]  = useState('')
  const [features, setFeatures] = useState<SerpFeature[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tab,      setTab]      = useState<'tool' | 'history'>('tool')
  const [country,  setCountry]  = useState('us')

  const { records, save, remove, clear } = useHistory<SerpFeaturesRecord>('jarvis_serpfeatures_history')

  async function fetchRealFeatures(keywords: string[]): Promise<SerpFeature[]> {
    const locationCode = LOCATION_CODES[country] ?? 2840
    const featureMap = new Map<string, { keywords: { kw: string; position: number; owned: boolean }[] }>()

    await Promise.allSettled(keywords.slice(0, 5).map(async (kw) => {
      const result = await callDFS('serp/google/organic/live/advanced', [{
        keyword: kw, location_code: locationCode, language_code: 'en', depth: 10,
      }])
      const items = (result?.items ?? []) as Array<{ type: string; rank_absolute?: number; url?: string }>
      const cleanDomain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase()

      // Find own position
      const ownItem = items.find(i => i.type === 'organic' && i.url?.toLowerCase().includes(cleanDomain))
      const ownPos  = ownItem?.rank_absolute ?? null

      // Detect special feature types
      for (const item of items) {
        const featureName = FEATURE_TYPE_MAP[item.type]
        if (!featureName) continue
        const existing = featureMap.get(featureName) ?? { keywords: [] }
        existing.keywords.push({
          kw,
          position: ownPos ?? 0,
          owned: item.url?.toLowerCase().includes(cleanDomain) ?? false,
        })
        featureMap.set(featureName, existing)
      }
    }))

    return Array.from(featureMap.entries()).map(([feature, data]) => ({
      feature,
      icon: '',
      keywords: data.keywords,
      opportunity: data.keywords.some(k => k.owned) ? 'medium' as const : 'high' as const,
      tip: '',
    }))
  }

  const analyze = useMutation({
    mutationFn: async () => {
      const keywords = kwInput.split('\n').map(k => k.trim()).filter(Boolean)

      if (isDFSReady() && keywords.length > 0) {
        const realFeatures = await fetchRealFeatures(keywords)
        // Enrich with AI tips
        const aiRaw = await callClaude(
          'You are a SERP feature analyst. Add actionable tips for each detected feature.',
          `These SERP features were ACTUALLY DETECTED for site "${url}" via DataForSEO:
${realFeatures.map(f => `- ${f.feature}: detected on ${f.keywords.length} keyword(s)`).join('\n')}

Return ONLY a JSON array adding a "tip" field to each (same feature names, same order):
[{"feature":"Featured Snippet","keywords":[],"opportunity":"high","tip":"specific actionable tip"}]`,
          800,
        )
        try {
          const match = aiRaw?.match(/\[[\s\S]*\]/)
          if (match) {
            const aiParsed = JSON.parse(match[0]) as SerpFeature[]
            return realFeatures.map((f, i) => ({ ...f, tip: aiParsed[i]?.tip ?? '' }))
          }
        } catch { /* use real features without tips */ }
        return realFeatures
      }

      // Fallback: pure AI
      return callClaude(
        'You are a SERP feature analyst. Identify which rich-result features a site could capture.',
        `Analyse SERP feature opportunities for: ${url || 'a general SEO website'}

Return ONLY a JSON array:
[{"feature":"Featured Snippet","keywords":[{"kw":"...","position":4,"owned":false}],"opportunity":"high","tip":"specific actionable tip"}]

Include 5-6 features from: Featured Snippet, People Also Ask, Image Pack, Video Carousel, Local Pack, Shopping, Top Stories, Knowledge Panel.
opportunity: high=easy win, medium=requires work, low=unlikely.`,
        1200,
      )
    },
    onSuccess: (data) => {
      if (!data) return
      let parsed: SerpFeature[] = []
      if (Array.isArray(data)) {
        parsed = data as SerpFeature[]
      } else if (typeof data === 'string') {
        try {
          const match = data.match(/\[[\s\S]*\]/)
          if (match) parsed = JSON.parse(match[0]) as SerpFeature[]
        } catch { /* keep */ }
      }
      if (parsed.length > 0) {
        setFeatures(parsed)
        save({
          id: crypto.randomUUID(),
          savedAt: new Date().toISOString(),
          label: url || 'General site',
          sublabel: `${parsed.filter(f => f.opportunity === 'high').length} high-opp features · ${parsed.length} total`,
          url,
          features: parsed,
        })
      }
    },
  })

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab('tool')}
          className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
            tab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          SERP Features
        </button>
        <button onClick={() => setTab('history')}
          className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
            tab === 'history' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          <History size={11} /> History {records.length > 0 && `(${records.length})`}
        </button>
      </div>

      {tab === 'history' ? (
        <HistoryPanel
          records={records}
          onLoad={r => { setUrl(r.url); setFeatures(r.features); setExpanded(null); setTab('tool') }}
          onDelete={remove}
          onClear={clear}
          emptyText="No SERP feature history yet. Analyse a domain to save results."
        />
      ) : (
        <>
          {/* Input */}
          <Card>
            <CardTitle className="mb-3">SERP Feature Tracker</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input value={url} onChange={e => setUrl(e.target.value)}
                  placeholder="yoursite.com"
                  className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors font-mono-jarvis"
                />
              </div>
              <div className="md:col-span-2">
                <textarea value={kwInput} onChange={e => setKwInput(e.target.value)}
                  placeholder={'Keywords to check (one per line — DFS detects real features):\nbest project management software\nhow to choose running shoes'}
                  rows={3}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors resize-none font-mono-jarvis"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select value={country} onChange={e => setCountry(e.target.value)}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-tx outline-none cursor-pointer font-mono-jarvis">
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
              <Button variant="primary" onClick={() => analyze.mutate()} disabled={analyze.isPending}>
                {analyze.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                {analyze.isPending ? 'Analysing…' : isDFSReady() && kwInput.trim() ? 'Detect Real Features' : 'Analyse SERP Features'}
              </Button>
              {isDFSReady() && kwInput.trim() && (
                <span className="text-[10px] text-accent3 font-mono-jarvis">● Live DataForSEO detection</span>
              )}
            </div>
            {!isAIReady() && <div className="mt-2 text-[11px] text-muted">Add an AI key in Onboarding.</div>}
          </Card>

          {features.length > 0 && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'FEATURES TRACKED', val: features.length,                                                                color: '#00d4ff', tip: 'Total SERP features analysed for this domain. Each feature (e.g. Featured Snippet, PAA) represents a distinct SERP real-estate opportunity.' },
                  { label: 'OWNED',            val: features.reduce((s, f) => s + (f.keywords?.filter(k => k.owned).length ?? 0), 0), color: '#10b981', tip: 'Keywords where your site currently holds this SERP feature. Owning features increases click share beyond your organic position.' },
                  { label: 'OPPORTUNITIES',    val: features.filter(f => f.opportunity === 'high').length,                          color: '#f59e0b', tip: 'High-opportunity features where your site has a realistic chance of capture. Prioritise these with targeted schema, content restructuring, or FAQ additions.' },
                ].map(s => (
                  <Card key={s.label} className="text-center py-4">
                    <div className="text-3xl font-display font-black mb-1" style={{ color: s.color }}>{s.val}</div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-muted font-mono-jarvis tracking-widest">
                      {s.label}
                      <InfoTooltip text={s.tip} />
                    </div>
                  </Card>
                ))}
              </div>

              {/* Feature list */}
              <div className="space-y-3">
                {features.map(f => {
                  const isOpen = expanded === f.feature
                  const owned = f.keywords?.filter(k => k.owned).length ?? 0
                  return (
                    <Card key={f.feature} className="cursor-pointer hover:border-accent transition-colors"
                      onClick={() => setExpanded(isOpen ? null : f.feature)}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#00d4ff15] flex items-center justify-center text-accent shrink-0">
                          {FEATURE_ICONS[f.feature] ?? <Star size={13} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-sm text-tx">{f.feature}</span>
                            {FEATURE_TOOLTIPS[f.feature] && (
                              <InfoTooltip text={FEATURE_TOOLTIPS[f.feature]} />
                            )}
                            <Badge variant={OPP_COLOR[f.opportunity ?? 'medium']}>
                              {(f.opportunity ?? 'medium').toUpperCase()}
                            </Badge>
                            {owned > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10b98120] text-accent3">
                                {owned} owned
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted font-mono-jarvis">
                            {f.keywords?.length ?? 0} keywords tracked
                          </div>
                        </div>
                        {isOpen ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
                      </div>

                      {isOpen && (
                        <div className="mt-4 pt-4 border-t border-border space-y-3">
                          <div className="space-y-1.5">
                            {(f.keywords ?? []).map(k => (
                              <div key={k.kw} className="flex items-center gap-3 text-xs">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${k.owned ? 'bg-accent3' : 'bg-border'}`} />
                                <span className="flex-1 text-tx font-mono-jarvis">{k.kw}</span>
                                <span className="text-muted">Pos #{k.position}</span>
                                {k.owned
                                  ? <span className="flex items-center gap-0.5 text-[10px] text-accent3">Owned <Check size={9} /></span>
                                  : <span className="text-[10px] text-muted">Not owned</span>
                                }
                              </div>
                            ))}
                          </div>
                          <div className="bg-surface border border-border rounded-lg p-3">
                            <div className="text-[10px] text-accent font-mono-jarvis tracking-widest mb-1">HOW TO WIN IT</div>
                            <div className="text-xs text-tx leading-relaxed">{f.tip}</div>
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </>
          )}

          {features.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Search size={40} className="mb-3 text-muted" strokeWidth={1} />
              <div className="text-sm text-muted">Enter your domain to discover SERP feature opportunities</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
