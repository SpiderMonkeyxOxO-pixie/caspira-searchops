import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { PenLine, Loader2, Copy, Check, RotateCcw, ChevronDown, ChevronUp, Rss, ExternalLink, CheckCircle2 } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const WORD_COUNTS = [1500, 2000, 2500, 3000]
const TONES = ['Expert', 'Conversational', 'Formal', 'Engaging'] as const
const CATEGORIES = ['Casino Review', 'Bonus Guide', 'Game Guide', 'Comparison', 'News Update'] as const

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length
}

function readingTime(words: number) {
  return Math.ceil(words / 200)
}

interface PublishResult { success: boolean; url?: string; id?: number; error?: string }

export function ArticleWriter() {
  const { wpSites, updateWPSite, setSection } = useStore()

  const [topic,     setTopic]     = useState('')
  const [keyword,   setKeyword]   = useState('')
  const [secKws,    setSecKws]    = useState('')
  const [wordCount, setWordCount] = useState(2000)
  const [tone,      setTone]      = useState<typeof TONES[number]>('Expert')
  const [category,  setCategory]  = useState<typeof CATEGORIES[number]>('Casino Review')
  const [article,   setArticle]   = useState('')
  const [copied,    setCopied]    = useState(false)
  const [expanded,  setExpanded]  = useState(false)

  // WordPress publish state
  const [wpTitle,      setWpTitle]      = useState('')
  const [wpSlug,       setWpSlug]       = useState('')
  const [wpStatus,     setWpStatus]     = useState<'draft' | 'publish'>('draft')
  const [selectedSite, setSelectedSite] = useState<number | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null)

  useEffect(() => {
    if (article) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWpTitle(topic)
      setWpSlug(topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
      setPublishResult(null)
      if (wpSites.length > 0 && !selectedSite) setSelectedSite(wpSites[0].id)
    }
  }, [article, topic, wpSites, selectedSite])

  async function publishToWP() {
    if (!selectedSite) return
    const site = wpSites.find(s => s.id === selectedSite)
    if (!site) return
    setIsPublishing(true)
    setPublishResult(null)
    try {
      const creds = btoa(`${site.username}:${site.appPassword}`)
      const res = await fetch(`${site.url}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: wpTitle, content: article, status: wpStatus, slug: wpSlug }),
      })
      if (!res.ok) throw new Error(`WordPress returned ${res.status} — check credentials or CORS settings`)
      const data = await res.json() as { link: string; id: number }
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      updateWPSite(site.id, { postCount: site.postCount + 1, lastPublished: today, status: 'connected' })
      setPublishResult({ success: true, url: data.link, id: data.id })
    } catch (e) {
      setPublishResult({ success: false, error: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setIsPublishing(false)
    }
  }

  const generate = useMutation({
    mutationFn: async () => {
      return callClaude(
        'You are an expert iGaming SEO content writer specialising in UK casino affiliate content. Write E-E-A-T compliant articles that rank on Google.',
        `Write a ${wordCount}-word SEO article for the UK online casino niche.

Topic: ${topic}
Primary keyword: "${keyword}"
Secondary keywords: ${secKws}
Tone: ${tone}
Category: ${category}

Requirements:
- Include the primary keyword in the H1, first paragraph, and 2-3 subheadings
- Write a compelling introduction with a clear value proposition
- Include 4-6 H2 sections with H3 subsections
- Add a Responsible Gambling section (required for UK iGaming YMYL content)
- Include an FAQ section (3-4 questions)
- Add an E-E-A-T author/expertise signal in the introduction
- Use specific data points, statistics, and UK-specific casino examples
- End with a clear call to action

Format with markdown headings. Target exactly ${wordCount} words.`,
        4096,
      )
    },
    onSuccess: (data) => { if (data) setArticle(data) },
  })

  function handleCopy() {
    navigator.clipboard.writeText(article)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const words   = article ? countWords(article) : 0
  const minutes = readingTime(words)

  const PREVIEW_CUTOFF = 1200
  const isLong = article.length > PREVIEW_CUTOFF

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Brief form */}
        <Card className="lg:col-span-1 space-y-4">
          <CardTitle>Article Brief</CardTitle>

          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">TOPIC / TITLE</div>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
          </div>

          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">PRIMARY KEYWORD</div>
            <input value={keyword} onChange={e => setKeyword(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
          </div>

          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">SECONDARY KEYWORDS</div>
            <textarea value={secKws} onChange={e => setSecKws(e.target.value)} rows={2}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors resize-none" />
          </div>

          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">WORD COUNT</div>
            <div className="flex gap-1">
              {WORD_COUNTS.map(w => (
                <button key={w} onClick={() => setWordCount(w)}
                  className={cn('flex-1 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all border',
                    wordCount === w ? 'bg-accent text-black border-accent' : 'border-border text-muted hover:border-accent'
                  )}>{w}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">TONE</div>
            <div className="grid grid-cols-2 gap-1">
              {TONES.map(t => (
                <button key={t} onClick={() => setTone(t)}
                  className={cn('py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all border',
                    tone === t ? 'bg-accent2 text-white border-accent2' : 'border-border text-muted hover:border-accent'
                  )}>{t}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">CATEGORY</div>
            <select value={category} onChange={e => setCategory(e.target.value as typeof CATEGORIES[number])}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <Button variant="primary" className="w-full justify-center" onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            {generate.isPending ? 'Writing article…' : `Generate ${wordCount}-Word Article`}
          </Button>
          {!isAIReady() && <div className="text-[10px] text-muted">Add an AI key in Onboarding to generate articles.</div>}
        </Card>

        {/* Output */}
        <Card className="lg:col-span-2">
          {article ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="green">{words.toLocaleString()} words</Badge>
                  <Badge variant="accent">{minutes} min read</Badge>
                  <Badge variant="purple">{tone}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" className="text-[11px]" onClick={handleCopy}>
                    {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                  </Button>
                  <Button variant="ghost" className="text-[11px]" onClick={() => { setArticle(''); generate.reset() }}>
                    <RotateCcw size={11} /> New
                  </Button>
                </div>
              </div>

              <div className="bg-code rounded-xl border border-border p-5 overflow-hidden">
                <div className="prose prose-sm max-w-none">
                  <div className="text-tx text-sm leading-relaxed font-sans whitespace-pre-wrap">
                    {isLong && !expanded ? article.slice(0, PREVIEW_CUTOFF) + '…' : article}
                  </div>
                </div>
                {isLong && (
                  <button onClick={() => setExpanded(e => !e)}
                    className="mt-4 flex items-center gap-1 text-xs text-accent hover:underline cursor-pointer">
                    {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Read full article</>}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-80 text-center">
              <PenLine size={40} className="mb-3 text-muted" strokeWidth={1} />
              <div className="text-sm text-muted mb-1">Fill in the brief and click Generate</div>
              <div className="text-xs text-muted">Produces E-E-A-T compliant, YMYL-safe casino content</div>
            </div>
          )}
        </Card>
      </div>

      {/* WordPress publish panel — shown when article is ready */}
      {article && wpSites.length === 0 && (
        <Card className="border-[#00d4ff30] bg-[#00d4ff04]">
          <div className="flex items-center gap-3">
            <Rss size={16} className="text-accent shrink-0" />
            <div className="flex-1 text-xs text-muted">
              Connect your WordPress sites to publish this article directly from Jarvis
            </div>
            <Button variant="ghost" className="text-[11px] shrink-0" onClick={() => setSection('wordpress')}>
              Add WordPress Site
            </Button>
          </div>
        </Card>
      )}

      {article && wpSites.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <CardTitle>Publish to WordPress</CardTitle>
            <Badge variant={publishResult?.success ? 'green' : 'accent'}>
              {publishResult?.success
                ? 'Published'
                : `${wpSites.filter(s => s.status === 'connected').length} site${wpSites.filter(s => s.status === 'connected').length !== 1 ? 's' : ''} connected`}
            </Badge>
          </div>

          {publishResult?.success ? (
            <div className="flex items-center gap-3 p-4 bg-[#10b98115] border border-[#10b98130] rounded-xl">
              <CheckCircle2 size={18} className="text-accent3 shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-tx">
                  {wpStatus === 'draft' ? 'Saved as draft' : 'Published live'} — Post #{publishResult.id}
                </div>
                <div className="text-xs text-muted mt-0.5 font-mono-jarvis truncate">{publishResult.url}</div>
              </div>
              {publishResult.url && (
                <a href={publishResult.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" className="text-[11px]">
                    <ExternalLink size={11} /> View
                  </Button>
                </a>
              )}
              <Button variant="ghost" className="text-[11px]" onClick={() => setPublishResult(null)}>
                Publish Again
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="lg:col-span-2">
                  <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">POST TITLE</div>
                  <input value={wpTitle} onChange={e => setWpTitle(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors" />
                </div>
                <div>
                  <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">SLUG</div>
                  <input value={wpSlug} onChange={e => setWpSlug(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
                </div>
                <div>
                  <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">TARGET SITE</div>
                  <select value={selectedSite ?? ''} onChange={e => setSelectedSite(Number(e.target.value))}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors">
                    {wpSites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-1">
                  {(['draft', 'publish'] as const).map(s => (
                    <button key={s} onClick={() => setWpStatus(s)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all border capitalize',
                        wpStatus === s ? 'bg-accent text-black border-accent' : 'border-border text-muted hover:border-accent'
                      )}>{s === 'publish' ? 'Publish Now' : 'Save as Draft'}</button>
                  ))}
                </div>
                <Button variant="primary" onClick={publishToWP} disabled={!selectedSite || isPublishing}>
                  {isPublishing ? <Loader2 size={13} className="animate-spin" /> : null}
                  {isPublishing ? 'Publishing…' : 'Send to WordPress'}
                </Button>
                {publishResult?.success === false && (
                  <div className="text-xs text-danger max-w-sm">{publishResult.error}</div>
                )}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  )
}
