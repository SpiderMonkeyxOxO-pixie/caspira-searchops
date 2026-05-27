import { useState, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Loader2, Download, RefreshCw, CheckCircle2, AlertCircle,
  Heading1, FileText, Link2, Zap, Search, AlignLeft,
  ClipboardList, Image, ShieldCheck, ExternalLink, History, BookOpen,
  Wand2, Copy, Check, Sparkles,
} from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'
import { cn } from '@/lib/utils'

/* ── Types ─────────────────────────────────────────────────────────── */

interface CheckItem {
  label: string
  score: number
  max: number
  status: 'Good' | 'Needs Work' | 'Poor'
  note: string
}

interface Recommendation {
  priority: 'High' | 'Medium' | 'Low'
  title: string
  detail: string
}

interface AuditResult {
  score: number
  status: 'Good' | 'Needs Work' | 'Poor'
  aiRecommendation: string
  checklist: CheckItem[]
  recommendations: Recommendation[]
}

interface AuditRecord {
  id: string
  savedAt: string
  label: string
  sublabel: string
  mode: string
  keyword: string
  result: AuditResult
}

interface ReadStats {
  wordCount: number
  readingTime: number
  avgSentLen: number
  longSentences: number
  passivePct: number
  transCount: number
  kwDensity: number
  fleschScore: number
}

interface ImageEntry {
  id: string
  name: string
  preview: string
  altText: string
}

/* ── Constants ─────────────────────────────────────────────────────── */

const CHECKLIST_ICONS: Record<string, React.ReactNode> = {
  'Title / H1':                       <Heading1      size={14} />,
  'Meta Title & Description':          <FileText      size={14} />,
  'URL Slug':                          <Link2         size={14} />,
  'Introduction':                      <Zap           size={14} />,
  'Keyword Usage':                     <Search        size={14} />,
  'Heading Structure':                 <AlignLeft     size={14} />,
  'Content Helpfulness':               <ClipboardList size={14} />,
  'Grammar, Redundancy & Repetition':  <FileText      size={14} />,
  'Internal / External Links':         <ExternalLink  size={14} />,
  'Images & Alt Text':                 <Image         size={14} />,
  'Trust & Accuracy':                  <ShieldCheck   size={14} />,
}

const CHECK_INFO: Record<string, string> = {
  'Title / H1':                      'Evaluates whether the H1 exists, contains the target keyword, and matches search intent. Max 10 pts.',
  'Meta Title & Description':         'Checks meta title (50–60 chars) and meta description (120–160 chars) both contain the keyword. Max 10 pts.',
  'URL Slug':                         'Reviews if the slug is short, contains the keyword, uses hyphens, and avoids stop words. Max 5 pts.',
  'Introduction':                     'Assesses if the keyword appears in the first 100 words, hooks the reader, and matches search intent. Max 10 pts.',
  'Keyword Usage':                    'Checks keyword density (0.5–3%), natural placement in subheadings, and avoidance of stuffing. Max 10 pts.',
  'Heading Structure':                'Evaluates H2/H3 hierarchy, keyword inclusion in headings, and logical section organisation. Max 10 pts.',
  'Content Helpfulness':              'Measures depth, actionability, unique value, and whether it fully answers the reader\'s query. Max 15 pts.',
  'Grammar, Redundancy & Repetition': 'Flags grammar errors, repeated phrases, filler sentences, and redundant ideas that dilute quality. Max 10 pts.',
  'Internal / External Links':        'Counts contextual internal links and credible external sources. Flags missing or broken link opportunities. Max 10 pts.',
  'Images & Alt Text':                'Checks if images have descriptive alt text containing the keyword. Upload images above with alt text for a more accurate score. Max 5 pts.',
  'Trust & Accuracy':                 'Flags unverifiable claims, misleading stats, risky language, or content that could harm reader trust. Max 5 pts.',
}

const PRIORITY_COLOR: Record<string, string> = {
  High:   'bg-danger/10 text-danger border-danger/20',
  Medium: 'bg-accent4/10 text-accent4 border-accent4/20',
  Low:    'bg-border text-muted border-border',
}

const TRANSITION_WORDS = [
  'however','therefore','furthermore','additionally','moreover','consequently',
  'nevertheless','meanwhile','subsequently','although','because','since','while',
  'whereas','thus','hence','accordingly','besides','likewise','similarly',
  'in contrast','on the other hand','for example','for instance','in addition',
  'as a result','in conclusion','to summarize','first','second','third',
  'finally','next','then','also','yet','still','instead','otherwise',
]

const SYSTEM_PROMPT = `You are Jarvis SEO Article Auditor, an expert SEO content editor and article quality evaluator.

Your job is to review one article and return a structured audit report with scoring, issues, recommendations, and revision guidance.

You must evaluate the article for:
- SEO article structure
- Title and heading quality
- Keyword usage
- Search intent match
- Introduction quality
- Content helpfulness
- Grammar
- Redundancy
- Repetitive words
- Repeated ideas
- Readability
- Internal and external link quality
- Image and alt text quality
- Trust, safety, and accuracy
- Risky or exaggerated claims
- Publishing readiness

Important writing rules:
- Be practical and direct.
- Do not give generic advice.
- Do not say "good job" unless it is useful.
- Do not claim the article will rank.
- Do not invent facts that are not in the article.
- Do not recommend adding claims unless they are safe and verifiable.
- Keep recommendations actionable.
- If the article is about gaming, casino, lottery, earning apps, or money-related topics, flag risky claims such as guaranteed income, guaranteed win, risk-free earning, instant withdrawal promise, or misleading bonus claims.
- Focus on reader-first quality, not only keyword usage.

Scoring must be strict but fair.

Return only valid JSON.
Do not include markdown.
Do not include explanations outside the JSON.`

/* ── Utilities ─────────────────────────────────────────────────────── */

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  const stripped = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '')
  const m = stripped.match(/[aeiouy]{1,2}/g)
  return Math.max(1, m ? m.length : 1)
}

function calcReadability(text: string, kw: string): ReadStats | null {
  if (!text.trim()) return null
  const words = text.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().split(/\s+/).length > 1)
  const sentCount = sentences.length || 1
  const avgSentLen = Math.round(wordCount / sentCount)
  const longSentences = sentences.filter(s => s.trim().split(/\s+/).length > 20).length
  const passiveMatches = (text.match(/\b(am|is|are|was|were|be|been|being)\s+\w+ed\b/gi) || []).length
  const passivePct = Math.round((passiveMatches / sentCount) * 100)
  const lc = text.toLowerCase()
  const transCount = TRANSITION_WORDS.filter(w => lc.includes(w)).length
  let kwDensity = 0
  if (kw.trim() && wordCount) {
    const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const matches = (lc.match(new RegExp(esc.toLowerCase(), 'g')) || []).length
    kwDensity = parseFloat(((matches / wordCount) * 100).toFixed(2))
  }
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0)
  const fleschScore = Math.max(0, Math.min(100,
    Math.round(206.835 - 1.015 * (wordCount / sentCount) - 84.6 * (totalSyllables / wordCount))
  ))
  return { wordCount, readingTime, avgSentLen, longSentences, passivePct, transCount, kwDensity, fleschScore }
}

/* ── Traffic dot ───────────────────────────────────────────────────── */

function TrafficDot({ level }: { level: 'good' | 'warning' | 'poor' }) {
  return (
    <span className={cn('inline-block w-2.5 h-2.5 rounded-full shrink-0',
      level === 'good' ? 'bg-accent3' : level === 'warning' ? 'bg-accent4' : 'bg-danger')} />
  )
}

function scoreColor(n: number): string {
  return n >= 70 ? '#10b981' : n >= 45 ? '#f59e0b' : '#ef4444'
}

/* ── Score ring ────────────────────────────────────────────────────── */

function ScoreRing({ score }: { score: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  const dash = (score / 100) * c
  const color = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444'
  return (
    <svg width="120" height="120" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={r} fill="none" stroke="var(--color-border)" strokeWidth="10" />
      <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        transform="rotate(-90 65 65)" />
      <text x="65" y="61" textAnchor="middle" fontSize="28" fontWeight="900" fill={color} fontFamily="Roboto">{score}</text>
      <text x="65" y="77" textAnchor="middle" fontSize="10" fill="var(--color-muted)" fontFamily="Roboto Mono">/ 100 Score</text>
    </svg>
  )
}

/* ── SERP Preview ──────────────────────────────────────────────────── */

function SerpPreview({ metaTitle, metaDesc, url, keyword }: {
  metaTitle: string; metaDesc: string; url: string; keyword: string
}) {
  const domain = (() => { try { return new URL(url).hostname } catch { return url || 'yoursite.com' } })()
  const slug   = (() => { try { const p = new URL(url).pathname.replace(/^\/|\/$/g, ''); return p || 'article-slug' } catch { return 'article-slug' } })()
  const displayTitle = metaTitle || keyword || 'Your Article Title'
  const displayDesc  = metaDesc  || 'Your meta description will appear here. Write a compelling 120–160 character description.'

  const hilite = (text: string) => {
    if (!keyword.trim()) return <>{text}</>
    const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const parts = text.split(new RegExp(`(${esc})`, 'gi'))
    return <>{parts.map((p, i) =>
      p.toLowerCase() === keyword.toLowerCase()
        ? <strong key={i} className="font-bold">{p}</strong>
        : p
    )}</>
  }

  const titleHasKw = keyword ? displayTitle.toLowerCase().includes(keyword.toLowerCase()) : null
  const descHasKw  = keyword ? displayDesc.toLowerCase().includes(keyword.toLowerCase())  : null

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-xl p-4 border border-[#dadce0]">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-5 h-5 rounded-full bg-[#f1f3f4] flex items-center justify-center">
            <span className="text-[8px] font-black text-[#5f6368]">G</span>
          </div>
          <span className="text-[12px] text-[#202124] font-medium">{domain}</span>
          <span className="text-[12px] text-[#70757a]">› {slug.replace(/\//g, ' › ')}</span>
        </div>
        <div className="text-[19px] text-[#1a0dab] font-normal leading-tight mb-1 line-clamp-1">
          {hilite(displayTitle.slice(0, 70))}
        </div>
        <div className="text-[13px] text-[#4d5156] leading-snug line-clamp-2">
          {hilite(displayDesc.slice(0, 165))}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono-jarvis px-1">
        <span>Title <span className={metaTitle.length > 60 ? 'text-danger' : metaTitle.length > 50 ? 'text-accent4' : metaTitle.length > 0 ? 'text-accent3' : 'text-muted'}>{metaTitle.length}/60</span></span>
        <span>Desc <span className={metaDesc.length > 160 ? 'text-danger' : metaDesc.length > 140 ? 'text-accent4' : metaDesc.length > 0 ? 'text-accent3' : 'text-muted'}>{metaDesc.length}/160</span></span>
        {titleHasKw !== null && <span>KW in title <span className={titleHasKw ? 'text-accent3' : 'text-danger'}>{titleHasKw ? '✓' : '✗'}</span></span>}
        {descHasKw  !== null && <span>KW in desc <span className={descHasKw  ? 'text-accent3' : 'text-danger'}>{descHasKw  ? '✓' : '✗'}</span></span>}
      </div>
    </div>
  )
}

/* ── Readability panel ─────────────────────────────────────────────── */

function ReadabilityPanel({ stats, cornerstone }: { stats: ReadStats; cornerstone: boolean }) {
  const minWords = cornerstone ? 2000 : 600
  const fleschLevel: 'good' | 'warning' | 'poor' = stats.fleschScore >= 60 ? 'good' : stats.fleschScore >= 45 ? 'warning' : 'poor'
  const fleschLabel = stats.fleschScore >= 80 ? 'Easy' : stats.fleschScore >= 60 ? 'Standard' : stats.fleschScore >= 45 ? 'Fairly Hard' : 'Difficult'
  const fleschColor = fleschLevel === 'good' ? '#10b981' : fleschLevel === 'warning' ? '#f59e0b' : '#ef4444'

  const tiles: { label: string; value: string; level: 'good' | 'warning' | 'poor'; hint: string }[] = [
    {
      label: 'Word Count',
      value: stats.wordCount.toLocaleString(),
      level: stats.wordCount >= minWords ? 'good' : stats.wordCount >= minWords * 0.6 ? 'warning' : 'poor',
      hint: cornerstone ? `Cornerstone: >${minWords} words required` : `>${minWords} words recommended`,
    },
    {
      label: 'Reading Time',
      value: `${stats.readingTime} min`,
      level: 'good',
      hint: 'Estimated at 200 words per minute',
    },
    {
      label: 'Avg Sentence',
      value: `${stats.avgSentLen} words`,
      level: stats.avgSentLen <= 20 ? 'good' : stats.avgSentLen <= 26 ? 'warning' : 'poor',
      hint: stats.longSentences > 0 ? `${stats.longSentences} sentences exceed 20 words` : 'All sentences within ideal range',
    },
    {
      label: 'Passive Voice',
      value: `${stats.passivePct}%`,
      level: stats.passivePct <= 10 ? 'good' : stats.passivePct <= 20 ? 'warning' : 'poor',
      hint: stats.passivePct > 10 ? 'Keep passive voice below 10% of sentences' : 'Passive voice within acceptable range',
    },
    {
      label: 'Transitions',
      value: `${stats.transCount} found`,
      level: stats.transCount >= 5 ? 'good' : stats.transCount >= 2 ? 'warning' : 'poor',
      hint: stats.transCount < 5 ? 'Use more transition words for better flow' : 'Good use of transition words',
    },
    {
      label: 'KW Density',
      value: stats.kwDensity > 0 ? `${stats.kwDensity}%` : '—',
      level: stats.kwDensity >= 0.5 && stats.kwDensity <= 3 ? 'good' : stats.kwDensity > 0 && stats.kwDensity < 4 ? 'warning' : 'poor',
      hint: stats.kwDensity === 0 ? 'Enter a keyword above to measure density' : stats.kwDensity < 0.5 ? 'Under-optimised — below 0.5%' : stats.kwDensity > 3 ? 'Risk of keyword stuffing — above 3%' : 'Optimal density range (0.5–3%)',
    },
  ]

  return (
    <div className="space-y-3">
      {/* Flesch Reading Ease — featured tile */}
      <div className="flex items-center gap-5 p-4 bg-bg border border-border rounded-xl">
        <div className="text-center shrink-0">
          <div className="font-display font-black text-4xl leading-none" style={{ color: fleschColor }}>{stats.fleschScore}</div>
          <div className="text-[9px] text-muted mt-0.5">/ 100</div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <TrafficDot level={fleschLevel} />
            <span className="text-xs font-bold text-tx">Flesch Reading Ease — <span style={{ color: fleschColor }}>{fleschLabel}</span></span>
          </div>
          <div className="text-[10px] text-muted leading-relaxed">
            Ideal web content: <strong className="text-tx">60–70</strong> · 80+ = too simple · Below 45 = too academic.
            {stats.fleschScore < 60 && stats.fleschScore >= 45 && ' Shorten sentences and use simpler words.'}
            {stats.fleschScore < 45 && ' Significantly simplify — split long sentences, replace jargon.'}
            {stats.fleschScore >= 80 && ' Consider adding more depth and technical detail.'}
          </div>
        </div>
        {/* Mini scale bar */}
        <div className="hidden sm:flex flex-col gap-1 shrink-0 w-28">
          <div className="h-2 rounded-full bg-border overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${stats.fleschScore}%`, background: fleschColor }} />
          </div>
          <div className="flex justify-between text-[9px] text-muted font-mono-jarvis">
            <span>Hard</span><span>Easy</span>
          </div>
        </div>
      </div>

      {/* 6-metric grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map(t => (
          <div key={t.label} className="bg-bg border border-border rounded-xl p-3 flex flex-col gap-1.5 group relative">
            <div className="flex items-center gap-1.5">
              <TrafficDot level={t.level} />
              <span className="text-[10px] text-muted font-mono-jarvis tracking-wide truncate">{t.label}</span>
            </div>
            <div className="font-display font-black text-lg text-tx">{t.value}</div>
            <div className="absolute bottom-full left-0 mb-1 w-48 bg-bg border border-border rounded-lg p-2 text-[10px] text-muted leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
              {t.hint}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Check card ────────────────────────────────────────────────────── */

function CheckCard({ item }: { item: CheckItem }) {
  const pct   = (item.score / item.max) * 100
  const level: 'good' | 'warning' | 'poor' = pct >= 70 ? 'good' : pct >= 40 ? 'warning' : 'poor'
  const color = level === 'good' ? '#10b981' : level === 'warning' ? '#f59e0b' : '#ef4444'
  return (
    <div className="bg-bg border border-border rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-muted shrink-0">
            {CHECKLIST_ICONS[item.label] ?? <FileText size={14} />}
          </div>
          <span className="text-xs font-semibold text-tx leading-tight truncate">{item.label}</span>
          <InfoTooltip text={CHECK_INFO[item.label] ?? item.label} />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <TrafficDot level={level} />
          <span className="text-[10px] font-bold" style={{ color }}>{item.status}</span>
        </div>
      </div>
      <div className="text-[11px] font-semibold" style={{ color }}>{item.score}/{item.max} points</div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-[11px] text-muted leading-relaxed">{item.note}</p>
    </div>
  )
}

/* ── Main component ────────────────────────────────────────────────── */

export function ArticleAudit() {
  const [tab,        setTab]        = useState<'tool' | 'history'>('tool')
  const [mode,       setMode]       = useState<'pre' | 'post'>('pre')
  const [docsUrl,    setDocsUrl]    = useState('')
  const [pubUrl,     setPubUrl]     = useState('')
  const [keyword,    setKeyword]    = useState('')
  const [metaTitle,  setMetaTitle]  = useState('')
  const [metaDesc,   setMetaDesc]   = useState('')
  const [audience,   setAudience]   = useState('')
  const [type,       setType]       = useState<'Post' | 'Page'>('Post')
  const [content,    setContent]    = useState('')
  const [cornerstone,setCornerstone]= useState(false)
  const [result,     setResult]     = useState<AuditResult | null>(null)
  const [fixed,      setFixed]      = useState<Set<number>>(new Set())
  const [error,      setError]      = useState<string | null>(null)
  const [rewritten,  setRewritten]  = useState<string | null>(null)
  const [copied,     setCopied]     = useState(false)
  const [images,       setImages]       = useState<ImageEntry[]>([])
  const [rewriteResult,setRewriteResult] = useState<AuditResult | null>(null)
  const [lsiTerms,     setLsiTerms]     = useState<string[] | null>(null)

  const { records, save, remove, clear } = useHistory<AuditRecord>('jarvis_article_audit_history')

  const readStats = useMemo(() => calcReadability(content, keyword), [content, keyword])

  const passed    = result?.checklist.filter(c => c.status === 'Good').length ?? 0
  const needsWork = result?.checklist.filter(c => c.status !== 'Good').length ?? 0

  /* ── Audit AI call ──────────────────────────────────────────────── */

  const runAudit = useMutation({
    mutationFn: async () => {
      const typeNote = type === 'Post'
        ? 'Post Type: Blog Post — evaluate for recency signals, category/tag structure, RSS discoverability, and reader engagement hooks. Date freshness matters.'
        : 'Post Type: Article (Page) — evaluate as evergreen static content. Prioritise depth, breadcrumb/navigation context, internal linking from site nav, and URL permanence. No recency expectation.'
      const wordCountNote = cornerstone
        ? 'Cornerstone Content: YES — apply stricter evaluation, 2000+ words expected, must be highly comprehensive.'
        : type === 'Post'
          ? 'Word Count Expectation: 600–1500 words is standard and acceptable for a Blog Post. Do NOT recommend 2000+ words — that threshold only applies to Cornerstone content.'
          : 'Word Count Expectation: 800–2000 words is appropriate for an Article/Page. Do NOT recommend 2000+ words unless Cornerstone is enabled.'
      const userMsg = `Audit Mode: ${mode === 'pre' ? 'Pre-Publish' : 'Post-Publish'}
${typeNote}
${wordCountNote}
Google Docs URL: ${docsUrl || 'N/A'}
Published URL: ${pubUrl || 'N/A'}
Target Keyword: ${keyword || 'N/A'}
Meta Title: ${metaTitle || 'N/A'}
Meta Description: ${metaDesc || 'N/A'}
Audience: ${audience || 'N/A'}

ARTICLE CONTENT:
${content.slice(0, 4000) || '[No content provided — evaluate based on available metadata only]'}

IMAGES IN ARTICLE (${images.length}):
${images.length > 0
  ? images.map((img, idx) => {
      const kw = keyword.trim().toLowerCase()
      const hasKw = kw ? img.altText.toLowerCase().includes(kw) : null
      return `  Image ${idx + 1}: "${img.name}" — Alt text: "${img.altText || 'MISSING — no alt text provided'}"${hasKw !== null ? ` — Keyword in alt: ${hasKw ? 'YES' : 'NO'}` : ''}`
    }).join('\n')
  : '  No images uploaded. Score based on any img/markdown image syntax found in article text, or 0/5 if none detected.'}

Return this exact JSON structure (no markdown, no extra text):
{
  "score": <0-100 integer>,
  "status": "<Good|Needs Work|Poor>",
  "aiRecommendation": "<2-3 sentence overall assessment: what the article does well, what its biggest weakness is, and the single most important action to improve it>",
  "checklist": [
    { "label": "Title / H1", "score": <0-10>, "max": 10, "status": "<Good|Needs Work|Poor>", "note": "<specific 1-sentence finding>" },
    { "label": "Meta Title & Description", "score": <0-10>, "max": 10, "status": "<Good|Needs Work|Poor>", "note": "<specific 1-sentence finding>" },
    { "label": "URL Slug", "score": <0-5>, "max": 5, "status": "<Good|Needs Work|Poor>", "note": "<specific 1-sentence finding>" },
    { "label": "Introduction", "score": <0-10>, "max": 10, "status": "<Good|Needs Work|Poor>", "note": "<specific 1-sentence finding>" },
    { "label": "Keyword Usage", "score": <0-10>, "max": 10, "status": "<Good|Needs Work|Poor>", "note": "<specific 1-sentence finding>" },
    { "label": "Heading Structure", "score": <0-10>, "max": 10, "status": "<Good|Needs Work|Poor>", "note": "<specific 1-sentence finding>" },
    { "label": "Content Helpfulness", "score": <0-15>, "max": 15, "status": "<Good|Needs Work|Poor>", "note": "<specific 1-sentence finding>" },
    { "label": "Grammar, Redundancy & Repetition", "score": <0-10>, "max": 10, "status": "<Good|Needs Work|Poor>", "note": "<specific 1-sentence finding>" },
    { "label": "Internal / External Links", "score": <0-10>, "max": 10, "status": "<Good|Needs Work|Poor>", "note": "<specific 1-sentence finding>" },
    { "label": "Images & Alt Text", "score": <0-5>, "max": 5, "status": "<Good|Needs Work|Poor>", "note": "<specific 1-sentence finding>" },
    { "label": "Trust & Accuracy", "score": <0-5>, "max": 5, "status": "<Good|Needs Work|Poor>", "note": "<specific 1-sentence finding>" }
  ],
  "recommendations": [
    { "priority": "<High|Medium|Low>", "title": "<short action title>", "detail": "<1-sentence specific instruction>" }
  ]
}`
      const yr = new Date().getFullYear()
      return callClaude(`Current year: ${yr}. Never reference past years in any output.\n\n${SYSTEM_PROMPT}`, userMsg, 4000)
    },
    onSuccess: (data) => {
      if (!data) { setError('No response received. Check your API key in Onboarding.'); return }
      try {
        const cleaned = data.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
        const match = cleaned.match(/\{[\s\S]*\}/)
        if (!match) { setError('AI returned an unexpected format. Try again.'); return }
        const parsed = JSON.parse(match[0]) as AuditResult
        setResult(parsed)
        setRewritten(null)
        setRewriteResult(null)
        setError(null)
        setFixed(new Set())
        save({
          id: crypto.randomUUID(),
          savedAt: new Date().toISOString(),
          label: keyword || 'Article Audit',
          sublabel: `Score: ${parsed.score}/100 · ${parsed.status} · ${mode === 'pre' ? 'Pre-Publish' : 'Post-Publish'}`,
          mode: mode === 'pre' ? 'Pre-Publish' : 'Post-Publish',
          keyword,
          result: parsed,
        })
      } catch (e) {
        console.error('[ArticleAudit] parse error:', e, '\nRaw:', data)
        setError('Failed to parse AI response. Try again.')
      }
    },
    onError: (e: Error) => {
      setError(e.message || 'AI call failed. Check your API key in Onboarding.')
    },
  })

  /* ── Re-audit rewritten article ────────────────────────────────── */

  const reaudit = useMutation({
    mutationFn: async (rewrittenContent: string) => {
      const imgLines = images.length > 0
        ? images.map((img, i) => {
            const hasKw = keyword && img.altText ? img.altText.toLowerCase().includes(keyword.toLowerCase()) : null
            return `  Image ${i + 1}: "${img.name}" Alt: "${img.altText || 'MISSING'}"${hasKw !== null ? ` KW in alt: ${hasKw ? 'YES' : 'NO'}` : ''}`
          }).join('\n')
        : '  No images uploaded.'
      const reauditTypeNote = type === 'Post'
        ? 'Post Type: Blog Post — evaluate for recency signals, category/tag structure, and engagement hooks.'
        : 'Post Type: Article (Page) — evergreen static content; prioritise depth, internal nav links, and URL permanence.'
      const reauditWordCount = cornerstone
        ? 'Cornerstone Content: YES — stricter evaluation, 2000+ words expected.'
        : type === 'Post'
          ? 'Word Count Expectation: 600–1500 words is standard for a Blog Post. Do NOT recommend 2000+ words — only applies to Cornerstone.'
          : 'Word Count Expectation: 800–2000 words is appropriate for an Article/Page. Do NOT recommend 2000+ words unless Cornerstone is enabled.'
      const userMsg = `Audit Mode: ${mode === 'pre' ? 'Pre-Publish' : 'Post-Publish'}
${reauditTypeNote}
${reauditWordCount}
Google Docs URL: ${docsUrl || 'N/A'}
Published URL: ${pubUrl || 'N/A'}
Target Keyword: ${keyword || 'N/A'}
Meta Title: ${metaTitle || 'N/A'}
Meta Description: ${metaDesc || 'N/A'}
Audience: ${audience || 'N/A'}

ARTICLE CONTENT (AI REWRITTEN VERSION — re-evaluate thoroughly):
${rewrittenContent.slice(0, 4000)}

IMAGES (${images.length}):
${imgLines}

Return this exact JSON structure (no markdown, no extra text):
{
  "score": <0-100 integer>,
  "status": "<Good|Needs Work|Poor>",
  "aiRecommendation": "<2-3 sentence assessment of this rewritten version specifically>",
  "checklist": [
    { "label": "Title / H1", "score": <0-10>, "max": 10, "status": "<Good|Needs Work|Poor>", "note": "<finding>" },
    { "label": "Meta Title & Description", "score": <0-10>, "max": 10, "status": "<Good|Needs Work|Poor>", "note": "<finding>" },
    { "label": "URL Slug", "score": <0-5>, "max": 5, "status": "<Good|Needs Work|Poor>", "note": "<finding>" },
    { "label": "Introduction", "score": <0-10>, "max": 10, "status": "<Good|Needs Work|Poor>", "note": "<finding>" },
    { "label": "Keyword Usage", "score": <0-10>, "max": 10, "status": "<Good|Needs Work|Poor>", "note": "<finding>" },
    { "label": "Heading Structure", "score": <0-10>, "max": 10, "status": "<Good|Needs Work|Poor>", "note": "<finding>" },
    { "label": "Content Helpfulness", "score": <0-15>, "max": 15, "status": "<Good|Needs Work|Poor>", "note": "<finding>" },
    { "label": "Grammar, Redundancy & Repetition", "score": <0-10>, "max": 10, "status": "<Good|Needs Work|Poor>", "note": "<finding>" },
    { "label": "Internal / External Links", "score": <0-10>, "max": 10, "status": "<Good|Needs Work|Poor>", "note": "<finding>" },
    { "label": "Images & Alt Text", "score": <0-5>, "max": 5, "status": "<Good|Needs Work|Poor>", "note": "<finding>" },
    { "label": "Trust & Accuracy", "score": <0-5>, "max": 5, "status": "<Good|Needs Work|Poor>", "note": "<finding>" }
  ],
  "recommendations": [
    { "priority": "<High|Medium|Low>", "title": "<action>", "detail": "<instruction>" }
  ]
}`
      const yr = new Date().getFullYear()
      return callClaude(`Current year: ${yr}. Never reference past years in any output.\n\n${SYSTEM_PROMPT}`, userMsg, 4000)
    },
    onSuccess: (data) => {
      if (!data) return
      try {
        const cleaned = data.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
        const match = cleaned.match(/\{[\s\S]*\}/)
        if (!match) return
        setRewriteResult(JSON.parse(match[0]) as AuditResult)
      } catch { /* ignore parse errors on re-audit */ }
    },
  })

  /* ── Rewrite AI call ────────────────────────────────────────────── */

  const rewriteArticle = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error('No audit result available.')
      const issues = result.checklist.map(c => `- ${c.label} scored ${c.score}/${c.max} (${c.status}): ${c.note}`).join('\n')

      const userMsg = `You are a senior SEO content editor. The article below scored ${result.score}/100. Your rewrite must score 80 or higher on the same audit rubric. Do not polish — rebuild where needed.

TARGET KEYWORD: ${keyword || 'N/A'}
AUDIENCE: ${audience || 'N/A'}
POST TYPE: ${type === 'Post' ? 'Blog Post' : 'Article (Page)'}
${cornerstone ? 'CORNERSTONE: Yes — 2000+ words required. Must be the most comprehensive resource on this topic.' : ''}

ORIGINAL ARTICLE:
${content || '[No content provided]'}

CURRENT AUDIT FINDINGS (all 11 items):
${issues}

OVERALL ASSESSMENT: ${result.aiRecommendation || 'N/A'}

── SCORING RULES — hit these to reach 80+ ──

TITLE / H1 (10 pts — must score 9+):
• Keyword in first 3 words of H1
• Specific and compelling — not generic
• One H1 only

META TITLE & DESCRIPTION (10 pts — must score 8+):
• Output as: Meta Title: [50–60 chars with keyword]
• Output as: Meta Description: [120–160 chars, keyword present, ends with a CTA]

URL SLUG (5 pts — must score 5):
• Output as: Suggested Slug: [keyword-first, hyphens, no stop words, under 6 words]

INTRODUCTION (10 pts — must score 9+):
• Keyword appears within the first 50 words
• Opens with a reader problem, striking fact, or direct question — not a generic definition
• Clearly signals what the article delivers

KEYWORD USAGE (10 pts — must score 9+):
• Natural keyword usage 3–5 times in body
• Keyword or close variant in at least 2 H2 or H3 headings
• Density 0.5–3% — never stuffed

HEADING STRUCTURE (10 pts — must score 9+):
• Logical H2 → H3 hierarchy — no skipped levels
• Each H2 covers a distinct topic section
• Headings are descriptive, not vague ("Step 1" alone is not enough)

CONTENT HELPFULNESS (15 pts — most important, must score 13+):
• Answer the reader's query completely — no vague advice
• Include specific examples, steps, or comparisons
• Each section must add unique value — remove padding
• Word count target: ${cornerstone ? '2000+ words (Cornerstone)' : type === 'Post' ? '600–1500 words (Blog Post) — do not pad to 2000' : '800–2000 words (Article/Page)'}
• Think: what would a 5-star expert answer look like?

GRAMMAR, REDUNDANCY & REPETITION (10 pts — must score 9+):
• Cut all filler phrases: "it is important to note", "in today's world", "needless to say"
• No sentence repeats an idea already made — every sentence earns its place
• Keep average sentence length under 20 words
• Active voice throughout — passive only where it reads more naturally

INTERNAL / EXTERNAL LINKS (10 pts — must score 8+):
• Add 2–3 contextual internal link placeholders: [Internal Link: Anchor Text → /suggested-url]
• Add 1–2 external source references: [External Source: Publication Name → topic]

IMAGES & ALT TEXT (5 pts — must score 4+):
• Add image placeholders at natural visual breaks: [Image: alt text containing keyword]
• At least one image per major H2 section

TRUST & ACCURACY (5 pts — must score 5):
• Remove or qualify any unverifiable claims
• No guaranteed results, guaranteed income, or misleading bonus language
• Cite sources inline where statistics or facts are stated

── OUTPUT FORMAT (follow exactly) ──
Meta Title: [title]
Meta Description: [description]
Suggested Slug: [slug]

[Full rewritten article starting with H1, then H2/H3 sections, body, placeholders]

No commentary. No "Here is the rewrite". Start directly with "Meta Title:".`

      const currentYear = new Date().getFullYear()
      return callClaude(
        `Current year: ${currentYear}. All year references in your output must use ${currentYear} or later — never use past years. You are a senior SEO content editor. Rewrite articles to score 80+ on a strict SEO audit rubric. Follow the output format exactly. No preamble.`,
        userMsg,
        8000,
      )
    },
    onSuccess: (data) => {
      if (data) {
        const trimmed = data.trim()
        setRewritten(trimmed)
        reaudit.mutate(trimmed)
      }
    },
    onError: (e: Error) => {
      setError(e.message || 'Rewrite failed. Try again.')
    },
  })

  /* ── LSI / Semantic keyword suggestion ─────────────────────────── */

  const runLSI = useMutation({
    mutationFn: async () => {
      if (!keyword.trim()) throw new Error('Enter a target keyword first.')
      const userMsg = `Target keyword: "${keyword}"
Post type: ${type === 'Post' ? 'Blog Post' : 'Article (Page)'}
Audience: ${audience || 'general'}
${content.trim() ? `Article excerpt:\n${content.slice(0, 2000)}` : ''}

Return a JSON object with exactly 10 LSI and semantically related keywords or phrases that a well-optimised, top-ranking article on this topic should include. Include: NLP entities, co-occurring terms, topic cluster keywords, long-tail variants. Do NOT repeat the main keyword.

Return only: {"terms": ["term 1", "term 2", "term 3", "term 4", "term 5", "term 6", "term 7", "term 8", "term 9", "term 10"]}`
      return callClaude(
        'You are an SEO semantic keyword expert. Return only valid JSON. No markdown, no explanations.',
        userMsg,
        600,
      )
    },
    onSuccess: (data) => {
      if (!data) return
      try {
        const cleaned = data.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
        const match = cleaned.match(/\{[\s\S]*\}/)
        if (!match) return
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed.terms)) setLsiTerms(parsed.terms as string[])
      } catch { /* ignore parse errors */ }
    },
    onError: (e: Error) => {
      setError(e.message || 'LSI generation failed. Check your API key.')
    },
  })

  function copyRewritten() {
    if (!rewritten) return
    navigator.clipboard.writeText(rewritten).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleImageFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).slice(0, 5 - images.length).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = e => {
        setImages(prev => [...prev, {
          id: crypto.randomUUID(),
          name: file.name,
          preview: e.target?.result as string,
          altText: '',
        }])
      }
      reader.readAsDataURL(file)
    })
  }

  /* ── PDF export ─────────────────────────────────────────────────── */

  function exportPDF() {
    if (!result) return
    const scoreColor = result.score >= 70 ? '#10b981' : result.score >= 45 ? '#f59e0b' : '#ef4444'
    const rs = readStats
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Article SEO Audit — ${keyword || 'Report'}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;color:#111;padding:32px;max-width:860px;margin:0 auto}
    h1{font-size:22px;font-weight:900;margin-bottom:4px}
    .sub{font-size:11px;color:#666;margin-bottom:24px}
    .hero{display:flex;align-items:center;gap:32px;margin-bottom:20px;padding:20px;border:1px solid #e5e7eb;border-radius:12px}
    .score{font-size:56px;font-weight:900;line-height:1;color:${scoreColor}}
    .score span{font-size:18px;color:#999;font-weight:400}
    .status{font-size:14px;font-weight:700;color:${scoreColor};margin-top:4px}
    .stats{display:flex;gap:12px;flex:1}
    .stat{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:10px;text-align:center}
    .stat-n{font-size:22px;font-weight:900}
    .stat-l{font-size:10px;color:#666;margin-top:2px}
    .ai-rec{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:12px;color:#166534;line-height:1.6}
    .ai-rec strong{font-size:10px;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:4px;color:#15803d}
    .read-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:20px}
    .read-tile{border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px}
    .read-label{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
    .read-val{font-size:15px;font-weight:900}
    h2{font-size:13px;font-weight:700;margin:20px 0 8px;padding-bottom:5px;border-bottom:1px solid #e5e7eb;text-transform:uppercase;letter-spacing:.05em}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#f9fafb;text-align:left;padding:7px 10px;font-weight:600;border-bottom:2px solid #e5e7eb}
    td{padding:7px 10px;border-bottom:1px solid #f3f4f6;vertical-align:top}
    .good{color:#10b981;font-weight:700}.bad{color:#f59e0b;font-weight:700}.poor{color:#ef4444;font-weight:700}
    .rec{margin-bottom:7px;padding:9px 12px;border-left:3px solid;border-radius:0 6px 6px 0;font-size:11.5px}
    .High{border-color:#ef4444;background:#fef2f2}.Medium{border-color:#f59e0b;background:#fffbeb}.Low{border-color:#9ca3af;background:#f9fafb}
    .rec-title{font-weight:700;margin-bottom:2px}
    .tag{font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;display:inline-block;margin-right:5px}
    .tag-High{background:#fee2e2;color:#ef4444}.tag-Medium{background:#fef3c7;color:#d97706}.tag-Low{background:#f3f4f6;color:#6b7280}
    footer{margin-top:28px;font-size:10px;color:#aaa;text-align:center;border-top:1px solid #e5e7eb;padding-top:10px}
    @media print{body{padding:16px}@page{margin:1cm}}
  </style>
</head>
<body>
  <h1>Article SEO Audit Report${cornerstone ? ' — Cornerstone' : ''}</h1>
  <div class="sub">
    Mode: <strong>${mode === 'pre' ? 'Pre-Publish' : 'Post-Publish'}</strong>
    ${keyword  ? ` · Keyword: <strong>${keyword}</strong>` : ''}
    ${pubUrl   ? ` · URL: ${pubUrl}` : ''}
    ${audience ? ` · Audience: ${audience}` : ''}
    · Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
  </div>

  <div class="hero">
    <div>
      <div class="score">${result.score}<span>/100</span></div>
      <div class="status">${result.status}</div>
    </div>
    <div class="stats">
      <div class="stat"><div class="stat-n" style="color:#10b981">${passed}</div><div class="stat-l">Passed</div></div>
      <div class="stat"><div class="stat-n" style="color:#f59e0b">${needsWork}</div><div class="stat-l">Needs Work</div></div>
      <div class="stat"><div class="stat-n">${result.checklist.length}</div><div class="stat-l">Total Checks</div></div>
    </div>
  </div>

  ${result.aiRecommendation ? `
  <div class="ai-rec">
    <strong>AI Overall Assessment</strong>
    ${result.aiRecommendation}
  </div>` : ''}

  ${rs ? `
  <h2>Readability Analysis</h2>
  <div class="read-grid">
    <div class="read-tile"><div class="read-label">Words</div><div class="read-val">${rs.wordCount.toLocaleString()}</div></div>
    <div class="read-tile"><div class="read-label">Reading</div><div class="read-val">${rs.readingTime} min</div></div>
    <div class="read-tile"><div class="read-label">Avg Sentence</div><div class="read-val">${rs.avgSentLen}w</div></div>
    <div class="read-tile"><div class="read-label">Passive Voice</div><div class="read-val">${rs.passivePct}%</div></div>
    <div class="read-tile"><div class="read-label">Transitions</div><div class="read-val">${rs.transCount}</div></div>
    <div class="read-tile"><div class="read-label">KW Density</div><div class="read-val">${rs.kwDensity > 0 ? rs.kwDensity + '%' : '—'}</div></div>
  </div>` : ''}

  <h2>Checklist Evaluation</h2>
  <table>
    <thead><tr><th>Category</th><th>Score</th><th>Status</th><th>Finding</th></tr></thead>
    <tbody>
      ${result.checklist.map(c => {
        const pct = (c.score / c.max) * 100
        const cls = pct >= 70 ? 'good' : pct >= 40 ? 'bad' : 'poor'
        return `<tr><td><strong>${c.label}</strong></td><td style="color:#6b7280">${c.score}/${c.max}</td><td class="${cls}">${c.status}</td><td>${c.note}</td></tr>`
      }).join('')}
    </tbody>
  </table>

  ${result.recommendations.length > 0 ? `
  <h2>Recommendations</h2>
  ${result.recommendations.map(r => `
  <div class="rec ${r.priority}">
    <div class="rec-title"><span class="tag tag-${r.priority}">${r.priority}</span>${r.title}</div>
    <div style="color:#555;margin-top:2px">${r.detail}</div>
  </div>`).join('')}` : ''}

  <footer>Generated by Jarvis SEO · Article SEO Audit Tool</footer>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
  }

  /* ── JSX ────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1">SEO Article Audit Tool</div>
            <h1 className="font-display font-black text-2xl text-tx mb-1">Article SEO Scoring Dashboard</h1>
            <p className="text-xs text-muted leading-relaxed max-w-xl">
              Audit unpublished Google Docs drafts before publishing, then audit the live site URL after publishing.
              Includes live SERP preview, readability analysis, traffic-light scoring, and PDF export.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" onClick={exportPDF} disabled={!result} className="flex items-center gap-1.5 text-xs">
              <Download size={13} /> Export PDF
            </Button>
            <Button variant="primary" onClick={() => runAudit.mutate()} disabled={runAudit.isPending} className="flex items-center gap-1.5 text-xs">
              {runAudit.isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {runAudit.isPending ? 'Auditing…' : 'Run Audit'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab('tool')}
          className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
            tab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          Audit Tool
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
          onLoad={r => { setKeyword(r.keyword); setResult(r.result); setFixed(new Set()); setRewritten(null); setTab('tool') }}
          onDelete={remove}
          onClear={clear}
          emptyText="No audit history yet. Run your first audit to save results."
        />
      ) : (
        <>
          {/* Main row: Input + Right column */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* ── Input panel ──────────────────────────────────── */}
            <Card className="lg:col-span-2 space-y-3">
              <CardTitle>Audit Input</CardTitle>

              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">AUDIT MODE</div>
                <div className="flex p-1 bg-bg border border-border rounded-lg w-fit gap-1">
                  {(['pre', 'post'] as const).map(m => (
                    <button key={m} onClick={() => setMode(m)}
                      className={cn('px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                        mode === m ? 'bg-tx text-bg' : 'text-muted hover:text-tx')}>
                      {m === 'pre' ? 'Pre-Publish' : 'Post-Publish'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">GOOGLE DOCS LINK</div>
                <input value={docsUrl} onChange={e => setDocsUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/…"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
              </div>

              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">PUBLISHED ARTICLE URL</div>
                <input value={pubUrl} onChange={e => setPubUrl(e.target.value)}
                  placeholder="https://example.com/article-slug/"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
              </div>

              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">TARGET KEYWORD</div>
                <input value={keyword} onChange={e => setKeyword(e.target.value)}
                  placeholder="e.g. online casino safety checklist"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
              </div>

              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">META TITLE <span className="text-accent3/70">(SERP preview)</span></div>
                <input value={metaTitle} onChange={e => setMetaTitle(e.target.value)}
                  placeholder="e.g. ABC Rummy App Review 2025 — Safe to Play?"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
              </div>

              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">META DESCRIPTION <span className="text-accent3/70">(SERP preview)</span></div>
                <textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)} rows={2}
                  placeholder="Write a 120–160 character description…"
                  className="w-full bg-surface border border-border rounded-lg p-3 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors resize-none scrollbar-thin" />
              </div>

              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">AUDIENCE</div>
                <input value={audience} onChange={e => setAudience(e.target.value)}
                  placeholder="e.g. India"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
              </div>

              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">POST TYPE</div>
                <div className="flex p-1 bg-bg border border-border rounded-lg w-fit gap-1">
                  {(['Post', 'Page'] as const).map(t => (
                    <button key={t} onClick={() => setType(t)}
                      className={cn('px-5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                        type === t ? 'bg-tx text-bg' : 'text-muted hover:text-tx')}>
                      {t === 'Post' ? 'Post' : 'Article (Page)'}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-muted mt-1.5 leading-relaxed">
                  {type === 'Post'
                    ? 'Blog post — evaluated for recency, categories/tags, RSS, and date signals.'
                    : 'Static page — evaluated for evergreen depth, navigation links, and URL structure.'}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">ARTICLE CONTENT</div>
                <textarea value={content} onChange={e => setContent(e.target.value)} rows={7}
                  placeholder="Paste the full article text here for a complete audit…"
                  className="w-full bg-surface border border-border rounded-lg p-3 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors resize-none scrollbar-thin" />
              </div>

              {/* Images */}
              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">
                  IMAGES &amp; ALT TEXT
                  <span className="text-accent3/70 ml-1">({images.length}/5 · add alt text for accurate scoring)</span>
                </div>
                {images.length < 5 && (
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-accent3/50 hover:bg-accent3/5 transition-all mb-2">
                    <Image size={16} className="text-muted mb-1" />
                    <span className="text-[10px] text-muted">Click to upload images (JPG, PNG, WebP)</span>
                    <input type="file" accept="image/*" multiple className="hidden"
                      onChange={e => handleImageFiles(e.target.files)} />
                  </label>
                )}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {images.map(img => (
                      <div key={img.id} className="bg-surface border border-border rounded-xl p-2 space-y-1.5">
                        <div className="relative">
                          <img src={img.preview} alt={img.altText || img.name}
                            className="w-full h-24 object-cover rounded-lg" />
                          <button
                            onClick={() => setImages(prev => prev.filter(i => i.id !== img.id))}
                            className="absolute top-1 right-1 w-5 h-5 bg-danger text-white rounded-full text-xs flex items-center justify-center hover:bg-danger/80 transition-colors leading-none">
                            ×
                          </button>
                          {img.altText && keyword && img.altText.toLowerCase().includes(keyword.toLowerCase()) && (
                            <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-accent3 text-white px-1.5 py-0.5 rounded">KW ✓</span>
                          )}
                        </div>
                        <div className="text-[9px] text-muted truncate font-mono-jarvis">{img.name}</div>
                        <input
                          value={img.altText}
                          onChange={e => setImages(prev => prev.map(i => i.id === img.id ? { ...i, altText: e.target.value } : i))}
                          placeholder="Enter alt text…"
                          className="w-full bg-bg border border-border rounded-lg px-2 py-1 text-[10px] text-tx outline-none focus:border-accent transition-colors" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setCornerstone(c => !c)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer',
                  cornerstone ? 'bg-accent3/5 border-accent3/30' : 'bg-bg border-border hover:border-accent3/30'
                )}>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <BookOpen size={13} className={cornerstone ? 'text-accent3' : 'text-muted'} />
                    <span className="text-xs font-semibold text-tx">Cornerstone Content</span>
                  </div>
                  <div className="text-[10px] text-muted mt-0.5 ml-5">Pillar article — applies stricter SEO standards</div>
                </div>
                <div className={cn('w-10 h-[22px] rounded-full transition-colors relative shrink-0',
                  cornerstone ? 'bg-accent3' : 'bg-border')}>
                  <span className={cn('absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform',
                    cornerstone ? 'translate-x-[18px]' : 'translate-x-0')} />
                </div>
              </button>

              {!isAIReady() && <div className="text-[10px] text-muted">Add an AI key in Onboarding.</div>}
            </Card>

            {/* ── Right column ──────────────────────────────────── */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <Card>
                <CardTitle className="mb-3">SERP Preview</CardTitle>
                <SerpPreview metaTitle={metaTitle} metaDesc={metaDesc} url={pubUrl} keyword={keyword} />
              </Card>

              {error && result && (
                <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger">
                  <AlertCircle size={13} className="shrink-0" /> {error}
                </div>
              )}

              {result ? (
                <Card>
                  <CardTitle className="mb-2">Audit Result</CardTitle>
                  <div className="text-[11px] text-muted font-mono-jarvis space-y-0.5 mb-3">
                    <div>Mode: <span className="text-tx">{mode === 'pre' ? 'Pre-Publish' : 'Post-Publish'}</span>{cornerstone && <span className="ml-2 text-accent3">· Cornerstone</span>}</div>
                    {pubUrl  && <div>URL: <span className="text-accent truncate">{pubUrl}</span></div>}
                    {keyword && <div>Keyword: <span className="text-tx">{keyword}</span></div>}
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    <ScoreRing score={result.score} />
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <div className="bg-accent3/5 border border-accent3/20 rounded-xl p-3 text-center">
                        <div className="font-display font-black text-2xl text-accent3">{passed}</div>
                        <div className="text-[10px] text-muted mt-0.5">Passed</div>
                      </div>
                      <div className="bg-accent4/5 border border-accent4/20 rounded-xl p-3 text-center">
                        <div className="font-display font-black text-2xl text-accent4">{needsWork}</div>
                        <div className="text-[10px] text-muted mt-0.5">Needs Work</div>
                      </div>
                      <div className="bg-surface border border-border rounded-xl p-3 text-center">
                        <div className="font-display font-black text-xl text-tx">{result.status}</div>
                        <div className="text-[10px] text-muted mt-0.5">Status</div>
                      </div>
                    </div>
                  </div>

                  {/* AI Overall Recommendation */}
                  {result.aiRecommendation && (
                    <div className="p-3 bg-accent3/5 border border-accent3/20 rounded-xl">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent3 animate-pulse inline-block" />
                        <span className="text-[10px] font-bold text-accent3 font-mono-jarvis tracking-widest">AI OVERALL ASSESSMENT</span>
                      </div>
                      <p className="text-[11px] text-tx leading-relaxed">{result.aiRecommendation}</p>
                    </div>
                  )}
                </Card>
              ) : (
                <Card className="flex flex-col items-center justify-center text-center min-h-36">
                  {error ? (
                    <>
                      <AlertCircle size={32} className="mb-2 text-danger" strokeWidth={1.5} />
                      <div className="text-sm font-semibold text-danger mb-1">Audit Failed</div>
                      <div className="text-xs text-muted max-w-xs leading-relaxed">{error}</div>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={36} className="mb-2 text-muted" strokeWidth={1} />
                      <div className="text-sm text-muted">Fill in the inputs and click Run Audit</div>
                    </>
                  )}
                </Card>
              )}
            </div>
          </div>

          {/* Readability Panel */}
          {readStats && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <CardTitle>Readability Analysis</CardTitle>
                <span className="text-[10px] text-muted font-mono-jarvis">Live · updates as you type</span>
              </div>
              <ReadabilityPanel stats={readStats} cornerstone={cornerstone} />
            </Card>
          )}

          {/* LSI & Semantic Keywords */}
          <Card>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <CardTitle>LSI &amp; Semantic Keywords</CardTitle>
                <div className="text-[10px] text-muted mt-0.5">
                  Terms your article should include to match Google's semantic understanding of the topic.
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => runLSI.mutate()}
                disabled={runLSI.isPending || !keyword.trim()}
                className="flex items-center gap-1.5 text-xs shrink-0"
              >
                {runLSI.isPending
                  ? <><Loader2 size={12} className="animate-spin" /> Generating…</>
                  : <><Sparkles size={12} /> Generate</>}
              </Button>
            </div>

            {runLSI.isPending ? (
              <div className="flex items-center gap-2 py-4 text-xs text-muted">
                <Loader2 size={14} className="animate-spin text-accent2" /> Analysing keyword and article context…
              </div>
            ) : lsiTerms ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {lsiTerms.map(term => {
                    const found = !!content && content.toLowerCase().includes(term.toLowerCase())
                    return (
                      <span
                        key={term}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors',
                          found
                            ? 'bg-accent3/10 text-accent3 border-accent3/20'
                            : 'bg-surface text-muted border-border'
                        )}
                      >
                        {found && <span className="mr-1">✓</span>}{term}
                      </span>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted font-mono-jarvis">
                  <span>
                    <span className="text-accent3 font-bold">
                      {lsiTerms.filter(t => content && content.toLowerCase().includes(t.toLowerCase())).length}
                    </span>
                    /{lsiTerms.length} terms found in article
                    {lsiTerms.filter(t => content && content.toLowerCase().includes(t.toLowerCase())).length < lsiTerms.length && (
                      <span className="ml-2 text-accent4">· Add missing terms naturally into the content</span>
                    )}
                  </span>
                  <button
                    onClick={() => runLSI.mutate()}
                    disabled={runLSI.isPending}
                    className="text-[10px] text-muted hover:text-tx transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <Sparkles size={24} className="text-muted" strokeWidth={1} />
                <div className="text-xs text-muted">
                  {keyword.trim()
                    ? 'Click Generate to get 10 semantic keywords for this topic.'
                    : 'Enter a target keyword above, then click Generate.'}
                </div>
              </div>
            )}
          </Card>

          {/* Checklist */}
          {result && (
            <Card>
              <CardTitle className="mb-4">Checklist Evaluation</CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.checklist.map(item => (
                  <CheckCard key={item.label} item={item} />
                ))}
              </div>
            </Card>
          )}

          {/* Recommendations */}
          {result && result.recommendations.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-accent4" />
                  <CardTitle>Recommendations</CardTitle>
                </div>
                <Button
                  variant="primary"
                  onClick={() => rewriteArticle.mutate()}
                  disabled={rewriteArticle.isPending || !content.trim()}
                  className="flex items-center gap-1.5 text-xs"
                >
                  {rewriteArticle.isPending
                    ? <><Loader2 size={12} className="animate-spin" /> Rewriting…</>
                    : <><Wand2 size={12} /> Rewrite Article with AI</>}
                </Button>
              </div>
              <div className="space-y-2.5">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className={cn(
                    'flex items-start justify-between gap-4 p-4 rounded-xl border transition-all',
                    fixed.has(i) ? 'opacity-40 bg-surface' : 'bg-bg border-border'
                  )}>
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 mt-0.5', PRIORITY_COLOR[rec.priority])}>
                        {rec.priority}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-tx mb-0.5">{rec.title}</div>
                        <div className="text-[11px] text-muted leading-relaxed">{rec.detail}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setFixed(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s })}
                      className={cn(
                        'text-[11px] font-semibold px-3 py-1.5 rounded-lg border shrink-0 cursor-pointer transition-all',
                        fixed.has(i)
                          ? 'bg-accent3/10 text-accent3 border-accent3/20'
                          : 'bg-surface border-border text-muted hover:text-tx hover:border-accent'
                      )}>
                      {fixed.has(i) ? '✓ Fixed' : 'Mark Fixed'}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Rewritten Article Output */}
          {(rewriteArticle.isPending || rewritten) && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Wand2 size={15} className="text-accent2" />
                  <CardTitle>AI Rewritten Article</CardTitle>
                  {result && rewritten && (
                    <span className="text-[10px] font-mono-jarvis text-muted ml-1">
                      · {result.recommendations.length} fixes applied
                    </span>
                  )}
                </div>
                {rewritten && (
                  <button
                    onClick={copyRewritten}
                    className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-border bg-surface text-muted hover:text-tx hover:border-accent cursor-pointer transition-all">
                    {copied ? <><Check size={12} className="text-accent3" /> Copied!</> : <><Copy size={12} /> Copy Article</>}
                  </button>
                )}
              </div>

              {/* Score comparison block */}
              {result && rewritten && (
                <div className="mb-4 p-4 bg-surface border border-border rounded-xl">
                  <div className="flex items-center gap-6">
                    {/* Original score */}
                    <div className="text-center">
                      <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1">ORIGINAL</div>
                      <div className="font-display font-black text-3xl" style={{ color: scoreColor(result.score) }}>{result.score}</div>
                      <div className="text-[9px] text-muted">/100</div>
                    </div>
                    <div className="text-2xl text-muted font-light">→</div>
                    {/* Re-audit score */}
                    <div className="text-center">
                      <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1">REWRITTEN</div>
                      {reaudit.isPending ? (
                        <div className="flex flex-col items-center gap-1">
                          <Loader2 size={20} className="animate-spin text-accent2" />
                          <div className="text-[9px] text-muted">Scoring…</div>
                        </div>
                      ) : rewriteResult ? (
                        <div className="font-display font-black text-3xl" style={{ color: scoreColor(rewriteResult.score) }}>{rewriteResult.score}</div>
                      ) : (
                        <div className="text-[10px] text-muted">—</div>
                      )}
                      <div className="text-[9px] text-muted">/100</div>
                    </div>
                    {/* Delta */}
                    {rewriteResult && (
                      <div className={cn('font-display font-black text-2xl', rewriteResult.score > result.score ? 'text-accent3' : rewriteResult.score < result.score ? 'text-danger' : 'text-muted')}>
                        {rewriteResult.score > result.score ? `+${rewriteResult.score - result.score}` : rewriteResult.score < result.score ? `${rewriteResult.score - result.score}` : '±0'}
                      </div>
                    )}
                    {/* Mini stats for rewritten */}
                    {rewriteResult && (
                      <div className="flex gap-3 ml-auto">
                        <div className="text-center">
                          <div className="font-display font-black text-xl text-accent3">{rewriteResult.checklist.filter(c => c.status === 'Good').length}</div>
                          <div className="text-[9px] text-muted">Passed</div>
                        </div>
                        <div className="text-center">
                          <div className="font-display font-black text-xl text-accent4">{rewriteResult.checklist.filter(c => c.status !== 'Good').length}</div>
                          <div className="text-[9px] text-muted">Still Needs Work</div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Re-audit AI assessment */}
                  {rewriteResult?.aiRecommendation && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent3 inline-block" />
                        <span className="text-[10px] font-bold text-accent3 font-mono-jarvis tracking-widest">REWRITTEN VERSION ASSESSMENT</span>
                      </div>
                      <p className="text-[11px] text-tx leading-relaxed">{rewriteResult.aiRecommendation}</p>
                    </div>
                  )}
                </div>
              )}

              {rewriteArticle.isPending ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 size={28} className="animate-spin text-accent2" />
                  <div className="text-sm text-muted">Rewriting article with all recommendations applied…</div>
                  <div className="text-xs text-muted">This may take 20–40 seconds</div>
                </div>
              ) : rewritten ? (
                <textarea
                  readOnly
                  value={rewritten}
                  rows={20}
                  className="w-full bg-bg border border-border rounded-xl p-4 text-xs text-tx font-mono-jarvis leading-relaxed outline-none resize-none scrollbar-thin"
                />
              ) : null}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
