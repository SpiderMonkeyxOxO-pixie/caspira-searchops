import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Search, TrendingUp, Star, MapPin, ShoppingCart, Image, Video, BookOpen, HelpCircle, ChevronUp, ChevronDown, Check } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface SerpFeature {
  feature: string
  icon: string
  keywords: { kw: string; position: number; owned: boolean }[]
  opportunity: 'high' | 'medium' | 'low'
  tip: string
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
  'Featured Snippet': 'A boxed answer shown above all organic results (Position 0). Captured with direct, concise answers to question keywords — ideal for "how to" and "what is" casino queries.',
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


export function SerpFeatures() {
  const { domain } = useStore()
  const [url, setUrl] = useState(domain || '')
  const [features, setFeatures] = useState<SerpFeature[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  const analyze = useMutation({
    mutationFn: async () => {
      return callClaude(
        'You are a SERP feature analyst. Identify which rich-result features a site could capture.',
        `Analyse SERP feature opportunities for: ${url || 'a general SEO website'}

Return ONLY a JSON array:
[
  {
    "feature": "Featured Snippet",
    "keywords": [{"kw":"...","position":4,"owned":false}],
    "opportunity": "high",
    "tip": "specific actionable tip"
  }
]

Include 5-6 features from: Featured Snippet, People Also Ask, Image Pack, Video Carousel, Local Pack, Shopping, Top Stories, Knowledge Panel.
opportunity: high=easy win, medium=requires work, low=unlikely.`,
        1200,
      )
    },
    onSuccess: (data) => {
      if (data) {
        try {
          const match = data.match(/\[[\s\S]*\]/)
          if (match) setFeatures(JSON.parse(match[0]) as SerpFeature[])
        } catch { /* keep mock */ }
      }
    },
  })

  return (
    <div className="space-y-5">
      {/* Input */}
      <Card>
        <CardTitle className="mb-3">SERP Feature Tracker</CardTitle>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={url} onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyze.mutate()}
              placeholder="yoursite.com"
              className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors font-mono-jarvis"
            />
          </div>
          <Button variant="primary" onClick={() => analyze.mutate()} disabled={analyze.isPending}>
            {analyze.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            {analyze.isPending ? 'Analysing…' : 'Analyse SERP Features'}
          </Button>
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
                      {/* Keywords table */}
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
                      {/* Tip */}
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
    </div>
  )
}
