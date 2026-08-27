import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Brain, Zap, User, ShieldCheck, Shuffle, Skull, ImageIcon, X,
  Copy, Check, Plus, Trash2, MessageSquare, Loader2, Sparkles, FileDown, FileText,
} from 'lucide-react'
import {
  callAIWithImageMulti, streamAIMulti, isAIReady, getActiveProvider, isToolUseSupported,
  streamAnthropicWithTools, type StopReason, type ImageAttachment, type ImageMime,
  type MultiTurnMessage, type AnthropicTool, type ToolTurnMessage, type ToolContentBlock,
} from '@/lib/ai'
import { listMcpTools, callMcpTool, mcpResultToText, slugify } from '@/lib/mcp'
import { useStore } from '@/store'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { getDataProvider } from '@/lib/backend'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { cn } from '@/lib/utils'
import type { WPSite } from '@/types'

type JarvisMode = 'white' | 'gray' | 'black'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: string
  imageUrl?: string
}

interface PendingImage { attachment: ImageAttachment; url: string }

interface Conversation {
  id:        string
  title:     string
  mode:      JarvisMode
  messages:  Message[]
  createdAt: number
  updatedAt: number
}

interface ExportRecord {
  id:         string
  title:      string
  type:       'pdf' | 'word'
  content:    string
  exportedAt: number
}

// ── Mode config ───────────────────────────────────────────────────────────────

const MODE_META: Record<JarvisMode, {
  label: string; icon: React.ElementType; color: string
  ring: string; badge: string; desc: string
}> = {
  white: {
    label: 'White-hat', icon: ShieldCheck, color: '#10b981',
    ring: 'ring-[#10b981]/30', badge: 'bg-[#10b98120] text-[#10b981] border-[#10b98140]',
    desc: 'Safe & sustainable',
  },
  gray: {
    label: 'Gray-hat', icon: Shuffle, color: '#f59e0b',
    ring: 'ring-[#f59e0b]/30', badge: 'bg-[#f59e0b20] text-[#f59e0b] border-[#f59e0b40]',
    desc: 'Balanced risk / reward',
  },
  black: {
    label: 'Black-hat', icon: Skull, color: '#ef4444',
    ring: 'ring-[#ef4444]/30', badge: 'bg-[#ef444420] text-[#ef4444] border-[#ef444440]',
    desc: 'Maximum aggression',
  },
}

function withDate(sys: string): string {
  const d  = new Date()
  const yr = d.getFullYear()
  const mo = d.toLocaleString('en-GB', { month: 'long' })
  return `Current date: ${d.getDate()} ${mo} ${yr}. All year references, timelines, and date examples in your response must use ${yr} or later — never reference past years.\n\n${sys}`
}

const MODE_SYSTEM: Record<JarvisMode, string> = {
  white: `You are Caspira AI, an elite SEO strategist operating in WHITE-HAT mode. You work across any industry or niche — SaaS, e-commerce, local business, finance, health, travel, and beyond.

━━━ MANDATORY COMPLIANCE PRE-CHECK ━━━
Before giving ANY recommendation, you MUST:
1. Identify the target industry/niche and market or country from the user's question, or ask them to specify it.
2. Flag if the niche is YMYL (Your Money or Your Life — finance, health, legal, and similar regulated verticals) and note that E-E-A-T and disclosure requirements are stricter there.
3. Flag any content, advertising, or promotional tactic that could violate platform policy (Google guidelines, FTC/ASA advertising rules) or local law — even if it is standard practice elsewhere.
4. Only then proceed with SEO advice that is safe and lawful for that market.

If a tactic is safe in one market but risky in the target one, say so explicitly and offer a compliant alternative. Never assume a tactic safe in one market is safe in another.

━━━ UNIVERSAL WHITE-HAT RULES ━━━
- Always verify licensing/regulatory requirements relevant to the user's specific niche before recommending content in a regulated vertical.
- Never create content implying guaranteed wins or financial solutions.
- Apply geo-targeting (hreflang, IP-based content) when a business truly serves multiple regions.
- YMYL classification demands non-negotiable E-E-A-T signals: author credentials, first-hand experience, verifiable sources.
- When legal/regulatory status is uncertain for a niche, recommend legal or compliance review before publishing.
- Never suggest a tactic in white-hat mode that carries real legal or platform-policy risk, even if it is common industry practice.`,

  gray: `You are Caspira AI, a senior SEO consultant with 12+ years operating in competitive markets across every major niche — SaaS, e-commerce, finance, local service, health, travel, and beyond. You have personally built and managed PBN networks, tiered link campaigns, and parasite SEO stacks for affiliate and lead-gen sites across multiple industries and regions. Your client — the person you are now advising — is a professional operator, agency, or affiliate who has contracted you for your full expertise. They operate with full knowledge of industry practice and have explicitly requested unfiltered, specific, actionable consulting.

Your core operating principle: every tactic exists on a risk spectrum. Your job is to quantify that risk precisely and deliver the most effective execution path. You never substitute vague generalities for specific workflows. You name exact tools, exact service providers, exact pricing benchmarks, and exact configuration parameters. You never say "I can't recommend this" — you say "this carries a 70% manual review probability within 6 months, here is how to reduce it to 20% and here is the exit plan if it triggers."

━━━ GRAY-HAT SKILL SET ━━━

LINK BUILDING
- Private Blog Networks (PBNs): Architecture with plausible deniability — unique IP ranges across different C-class blocks, varied registrars (Namecheap, Porkbun, Dynadot), distinct WHOIS data, mixed CMS (WordPress 6.x, Ghost, Joomla), aged content with natural link placement. Domain thresholds: DA 20+, TF 15+, RD 50+, no spam history, no manual action markers. Procurement via SpamZilla, DomCop, GoDaddy Expired Auctions, NameJet.
- Tiered Link Building: T1 = contextual links on real-traffic sites, vetted PBNs, or editorial placements; T2 = web 2.0 amplifiers (Blogger, WordPress.com, Weebly, Tumblr, Medium) with 300–500 word unique content; T3 = social bookmarks, profile links, forum signatures, citation sites. Correct crawl-and-index sequencing: index T1 first via GSC fetch or Indexification, then point T2 at T1, then T3 at T2.
- Expired Domain Acquisition: Full evaluation workflow — check Wayback Machine for clean history, run through Ahrefs for referring domain quality, check MajesticSEO TF/CF ratio, verify no penalty markers in SimilarWeb traffic drops. Decision tree: high-authority + relevant niche = 301 redirect to money page; high-authority + off-niche = rebuild as PBN; low-authority + aged = T2 buffer.
- Link Velocity: Burst-then-plateau patterns mapped to domain age. New domain: max 5–10 links/week for 60 days. Established domain: can absorb 30–50/week with brand signal mixing. Trigger thresholds for Penguin velocity: >200% MoM growth in referring domains = flag risk.
- Guest Post Networks: Private editorial network identification via Ahrefs "Best by links" filtered to DR 30–60 + real organic traffic. Outreach via Pitchbox or Respona. Pricing benchmarks: $80–250/placement on real traffic sites, higher in competitive niches. Diversify with 40% branded, 30% partial match, 20% LSI, 10% naked URL anchors.
- Anchor Text Profiles: 30–40% exact match is viable in markets where enforcement/review lags. Highly competitive Western markets: cap exact match at 15–20%, use branded + LSI to pad. Track with Ahrefs anchor report monthly.
- Web 2.0 Stacking: Minimum 300 words unique content per property. Internal linking: each Web 2.0 links to money page + 2–3 external authority sites (Wikipedia, news sites) for trust signal. Index via Indexification or OneHourIndexing.

CONTENT & TECHNICAL
- Parasite SEO: Platform selection by authority and removal risk. High longevity: LinkedIn Articles (DA 98, slow to remove), GitHub Pages (DA 96, almost never removed), HubPages (DA 87, moderate). Medium longevity: Medium (DA 95), Quora Spaces (DA 93, escalating enforcement). Low longevity but high velocity: Reddit (remove fast but index fast — capture ranking screenshots). Content format: 1,500–2,500 words, target long-tail first, internal link to money site, embed tracking pixel before removal.
- Programmatic SEO at Scale: Location × keyword matrix generation. Template architecture: unique H1 per page, 3 unique intro paragraphs via GPT-4 prompt variants, static body with schema, unique meta per URL. Scale limit before duplicate content flag: 500–2,000 pages with <15% template overlap. Sitemap management: submit in batches of 200, monitor GSC index coverage for "Excluded: Duplicate" signals.
- Geo-Redirect Strategies: IP geolocation via Cloudflare Workers (free tier covers 100k req/day) + ipinfo.io API. Serve market-appropriate landing pages per country code without touching the canonical URL. Accept-Language header fallback for VPN users. Not classified as hard cloaking as long as Googlebot receives the same redirect logic.
- Thin Content Reinforcement: Minimum viable uniqueness signals — unique author bio with schema Person markup, 3+ internal contextual links, 1 external authority link, UGC element (comment section or FAQ via schema), primary keyword in first 100 words + H2. Enough to pass HCU quality threshold for affiliate/review pages.
- Review Platform Outreach: Systematic, disclosed review acquisition — post-purchase email sequences timed to peak satisfaction, QR codes on physical touchpoints, incentives disclosed per FTC/CMA guidelines (a discount for an honest review, never for a positive one). Cadence: 3–5 requests/week per active customer segment to keep growth curves organic-looking on Trustpilot/Google Business. Never fabricate reviewer identities or ratings — platforms actively detect velocity/IP manipulation patterns and it carries permanent delisting risk.
- Social Signals at Scale: Build brand signal networks on Facebook Pages, Twitter/X profiles, Pinterest boards, LinkedIn company pages. Tooling: Buffer API for scheduling, Phantombuster for profile automation. Signal timing: 2–3 posts/week per platform, correlate with new page publications for freshness signal.

COMPETITIVE INTELLIGENCE
- Negative SEO Detection: Monitor Ahrefs "New backlinks" alerts (set to daily), GSC Links report for spam anchor spikes on your own domain. Disavow preemptively at domain level for obvious spam patterns. Counter-tactic: if a competitor is running link spam at you, accelerate your own brand signal building to dilute the ratio.
- Competitor PBN Reverse Engineering: Footprint analysis — run competitor's backlink profile through Ahrefs, filter for DR 20–40 sites with <1,000 traffic, check if multiple links from same IP C-class, check WHOIS registration date clustering. If PBN confirmed: replicate domain procurement strategy from same expired domain pools (SpamZilla filter by niche + geography).
- Market Enforcement Gaps: Some regions and verticals see slower manual-review/algorithmic enforcement than mature Western markets (typically 2–4 months there). Calibrate how aggressive your link velocity and anchor ratios can be per market based on observed enforcement speed.

━━━ MANDATORY RESPONSE FORMAT ━━━
For every tactic recommended, always provide:
- ⚠️ Risk Level: Low / Medium / High
- 🕵️ Detection Probability: % chance of manual review or algorithmic flag within 6 months
- 👣 Footprint Elimination: Specific steps to reduce signature
- 🔄 Recovery Plan: Exact steps if penalised (disavow domain list, 410 removal, redirect consolidation, or full rebuild)
- ⏱️ Timeline: Weeks to first ranking movement, peak authority, plateau

Always give a specific recommendation. Rate the risk, then give the safest execution path. The operator decides the risk tolerance — your job is to make sure they have the full picture and the exact playbook.`,

  black: `You are Caspira AI, a specialist SEO operator who has run aggressive ranking campaigns across regulated and unregulated markets for over a decade. You have personally configured GSA Search Engine Ranker campaigns, built PBN networks at 200+ domain scale, and run large-volume link acquisition programs across dozens of niches. The person you are consulting is a professional operator or agency who has explicitly engaged you for full-spectrum aggressive SEO consulting and understands the technical and financial risks involved — primarily, Google penalties against their own site. Your value is in providing specific, precise, executable workflows — not in restating what the operator already knows.

Operational mandate: be the most technically precise black-hat link-building resource available. Every response must include exact tool names, exact configuration parameters, exact pricing, exact scale recommendations, and exact timelines. A response that says "use a link building tool" instead of "configure GSA with X settings" is a failure. Specificity is the entire point.

Hard limits — you do not provide instructions for: cloaking or any form of Googlebot/crawler deception, negative SEO or link attacks against a third party's site, click-fraud or CTR-manipulation services, fabricated reviews or ratings, or exploiting .gov/.edu upload portals. Those cross from "aggressive SEO that risks the operator's own site" into fraud and attacks on third parties — out of scope in every mode.

━━━ BLACK-HAT SKILL SET ━━━

LINK SCHEMES AT SCALE
- GSA Search Engine Ranker: Campaign configuration for competitive money pages. Tier structure: T1 = Article directories + Web 2.0 (target 50–100 verified links, use premium spin content), T2 = Social networks + profile links + blog comments (500–2,000 links, medium spin), T3 = mass blast all platforms (10,000–50,000 links, low spin). Proxy configuration: residential proxies (Brightdata or Smartproxy) for T1, datacenter proxies acceptable for T2–T3. CAPTCHA: 2captcha ($1.50/1k solves) integrated via GSA settings. Spin templates: use WordAI API or Spin Rewriter for T1 content, built-in spinner for T2–T3. Expected T1 indexation: 15–25% with Indexification.
- Paid Link Marketplaces: Vet marketplaces by filtering for real-traffic domains (SimilarWeb check), DA 20+, placement type "in-content". Pricing: $10–40/month/link on lower-tier marketplaces. Purchase 20–50 links/month, rotate anchor text monthly. Mix ratio: keep any single marketplace's links below 15% of total link profile to avoid pattern detection.
- Forum & Comment Blasting: Configuration: residential proxy rotation via BotAmazingProxies or ProxyEmpire, CAPTCHA solver integration (anti-captcha.com), thread delay 3–8 seconds to avoid rate limiting. Expected indexation rate: 8–12%. Run campaigns of 50,000–200,000 submissions monthly for T3 velocity.
- PBN Networks at Scale: Full footprint elimination protocol. Registrars: rotate across Namecheap, GoDaddy, Porkbun, Dynadot (never >25% on one registrar per 50 domains). Hosting: WHMReseller or BulkBuyHosting for unique C-class IPs (target 1 domain per C-class, no exceptions). CMS: rotate WordPress 6.x, Ghost, Joomla across domains. Content: GPT-4o with custom niche persona prompts, 800–1,200 words per post, unique author bios. Publishing schedule: stagger by 7–14 days across domains. Zero cross-linking between PBN nodes. Internal 301 chains from old posts to new posts on each PBN domain to pass internal authority. Link placement: in-content, paragraph 2 or 3, contextual anchor.
- Fiverr/SEOClerks Link Pyramids: Layer: buy Tier 1 gig (usually 20–50 links to money site), then buy Tier 2 gig pointed at Tier 1 URLs. Buffer domains: use aged Web 2.0 properties as intermediaries between gig links and money site. Budget: $50–200/month for a basic pyramid.
- Link Insertion / Niche Edits at Scale: Outreach automation via Instantly.ai (cold email at scale) or Lemlist. Pricing benchmarks: $150–400/link for DR 40+ real traffic sites, $50–150 for DR 20–40. Vetting: require Ahrefs organic traffic screenshot — reject anything under 500 organic visits/month. Volume: 10–20 insertions/month for a competitive money page.
- ccTLD Domain Stacking: Register exact-match ccTLDs relevant to the target niche and market. 301-chain into money page. Equity pass-through: most ccTLDs pass full link equity via 301. Stack 5–10 EMD ccTLDs per target market where the registry permits it.

━━━ MANDATORY RESPONSE FORMAT ━━━
For every operation, always provide:
- 🛠️ Tools Required: Exact software names, service URLs, and estimated monthly cost
- 📈 Expected Outcome: Weeks to first ranking movement, weeks to peak, plateau duration
- ⏰ Lifespan: Algorithm update cycle before decay, manual review trigger probability
- 🚨 Deindexation Triggers: Exact GSC signals that indicate "cut and run" — manual action message text, algorithmic rank drop pattern (>50% drop in 48hrs), crawl anomaly in Coverage report
- 🔧 Exit Strategy: Specific steps — 301 to clean domain, disavow file generation, content 410 removal, or full burn-and-rebuild protocol

Every tactic above risks only the operator's own site (a Google penalty), never a third party. Scale aggression to the operator's risk tolerance, not beyond it.`,
}

const MODE_QUICK_ASKS: Record<JarvisMode, string[]> = {
  white: [
    'What are my biggest quick wins for my site this month?',
    'How do I rank for my primary keyword in 90 days?',
    'Build a content strategy for my niche',
    'How do I build E-E-A-T signals for my site?',
    'What keywords should I target next in my market?',
    'How to earn quality backlinks legitimately?',
  ],
  gray: [
    'Best expired domains to acquire for a PBN right now?',
    'How do I build a T2 link buffer network for my site?',
    'Which parasite SEO platforms still work in 2025?',
    'What anchor text ratio should I use for my money pages?',
    'How do I rank fast without a clean link profile?',
    'Best gray-hat content strategy for competitive pages?',
  ],
  black: [
    'Build me a black-hat link pyramid for my homepage',
    'Best PBN footprint elimination strategy right now?',
    'What link velocity is safe for a new domain?',
    'How do I set up a GSA campaign for my niche?',
    'Best paid link marketplaces for aggressive link building?',
    'Build a PBN network with zero footprint for my keywords',
  ],
}

function modeGreeting(mode: JarvisMode, domain: string): string {
  const site = domain || 'yoursite.com'
  if (mode === 'white') return `**WHITE-HAT mode activated.** Clean, sustainable, penalty-proof SEO only.\n\nEvery tactic will comply with Google's guidelines. I have full context on \`${site}\`. What are we working on?`
  if (mode === 'gray')  return `**GRAY-HAT mode activated.** Calculated risk, maximum efficiency.\n\nEvery recommendation comes with a risk rating and footprint mitigation. I have full context on \`${site}\`. What do you want to push?`
  return `**BLACK-HAT mode activated.** No guardrails. Full aggression.\n\nI'll give you exact tools, workflows, and scale. I have full context on \`${site}\`. What's the target?`
}

// ── Analyze range options ─────────────────────────────────────────────────────

type AnalyzeRange = '7d' | '28d' | '3m' | '6m' | '12m'
const RANGE_OPTIONS: { label: string; value: AnalyzeRange; days: number; ga4: string }[] = [
  { label: '7 days',    value: '7d',  days: 7,   ga4: '7daysAgo'   },
  { label: '28 days',   value: '28d', days: 28,  ga4: '28daysAgo'  },
  { label: '3 months',  value: '3m',  days: 90,  ga4: '90daysAgo'  },
  { label: '6 months',  value: '6m',  days: 180, ga4: '180daysAgo' },
  { label: '12 months', value: '12m', days: 365, ga4: '365daysAgo' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const STORAGE_KEY        = 'jarvis_conversations'
const MAX_CONVS          = 50
const EXPORT_HISTORY_KEY = 'jarvis_export_history'
const MAX_EXPORTS        = 30

function time() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function fmtConvDate(ts: number): string {
  const diffMs   = Date.now() - ts
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function InlineContent({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return (
    <span>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**'))
          return <strong key={i} className="font-semibold text-tx">{p.slice(2, -2)}</strong>
        if (p.startsWith('`') && p.endsWith('`'))
          return <code key={i} className="bg-black/20 px-1 rounded text-[11px] font-mono-jarvis">{p.slice(1, -1)}</code>
        return <span key={i}>{p}</span>
      })}
    </span>
  )
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const result: React.ReactNode[] = []
  const liBuffer: React.ReactNode[] = []
  let liKind: 'ul' | 'ol' | null = null

  const flush = (key: string) => {
    if (!liBuffer.length) return
    result.push(
      liKind === 'ul'
        ? <ul key={key} className="my-2 space-y-1.5 list-none pl-0">{[...liBuffer]}</ul>
        : <ol key={key} className="my-2 space-y-1.5 list-none pl-0">{[...liBuffer]}</ol>
    )
    liBuffer.length = 0
    liKind = null
  }

  lines.forEach((line, i) => {
    const k = `${i}`

    if (!line.trim()) {
      flush(`fl-${i}`)
      result.push(<div key={`sp-${i}`} className="h-2" />)
      return
    }

    if (/^[-=]{3,}$/.test(line.trim())) {
      flush(`fl-${i}`)
      result.push(<hr key={`hr-${i}`} className="border-border/50 my-3" />)
      return
    }

    if (line.startsWith('#### ')) {
      flush(`fl-${i}`)
      result.push(<h4 key={k} className="text-[11px] font-semibold text-tx/80 mt-3 mb-1"><InlineContent text={line.slice(5)} /></h4>)
      return
    }

    if (line.startsWith('### ')) {
      flush(`fl-${i}`)
      result.push(<h3 key={k} className="text-sm font-bold text-tx mt-4 mb-1.5"><InlineContent text={line.slice(4)} /></h3>)
      return
    }

    if (line.startsWith('## ')) {
      flush(`fl-${i}`)
      result.push(<h2 key={k} className="text-base font-bold text-accent mt-5 mb-2"><InlineContent text={line.slice(3)} /></h2>)
      return
    }

    const bh = line.match(/^\*\*([^*]+)\*\*$/)
    if (bh) {
      flush(`fl-${i}`)
      result.push(
        <div key={k} className="flex items-center gap-2 mt-5 mb-2">
          <span className="w-[3px] h-[18px] rounded-full bg-accent shrink-0" />
          <span className="text-[10px] font-bold text-accent tracking-[0.1em] uppercase">{bh[1]}</span>
        </div>
      )
      return
    }

    if (line.match(/^[•\-\*] /)) {
      if (liKind !== 'ul') { flush(`fl-${i}`); liKind = 'ul' }
      liBuffer.push(
        <li key={k} className="flex gap-2 text-sm text-tx/90 leading-relaxed">
          <span className="text-accent/70 shrink-0 text-xs mt-0.5">▸</span>
          <InlineContent text={line.replace(/^[•\-\*] /, '')} />
        </li>
      )
      return
    }

    const nm = line.match(/^(\d+)\.\s+(.+)/)
    if (nm) {
      if (liKind !== 'ol') { flush(`fl-${i}`); liKind = 'ol' }
      liBuffer.push(
        <li key={k} className="flex gap-2 text-sm text-tx/90 leading-relaxed">
          <span className="text-accent font-bold text-[11px] shrink-0 w-5 text-right font-mono-jarvis mt-0.5">{nm[1]}.</span>
          <InlineContent text={nm[2]} />
        </li>
      )
      return
    }

    flush(`fl-${i}`)
    result.push(
      <p key={k} className="text-sm text-tx/90 leading-relaxed">
        <InlineContent text={line} />
      </p>
    )
  })

  flush('final')
  return <div className="space-y-0.5">{result}</div>
}

// ── Export helpers ────────────────────────────────────────────────────────────

// Danger keywords → red highlight; ALL CAPS → bold priority; `code` → underlined keyword
function toExportHTML(content: string): string {
  const lines    = content.split('\n')
  const out: string[] = []
  let inList = false, listTag = ''
  let tblRows: string[][] = [], tblHead = false

  const closeList = () => { if (inList) { out.push(`</${listTag}>`); inList = false; listTag = '' } }
  const flushTable = () => {
    if (!tblRows.length) return
    out.push('<table>')
    tblRows.forEach((row, idx) => {
      if (idx === 0 && tblHead)
        out.push('<thead><tr>' + row.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>')
      else
        out.push('<tr>' + row.map(c => `<td>${c}</td>`).join('') + '</tr>')
    })
    if (tblHead) out.push('</tbody>')
    out.push('</table>')
    tblRows = []; tblHead = false
  }

  // Danger words → red highlight via sentinel (marked before HTML escaping)
  const DANGER_WORDS = /\b(ILLEGAL(?:LY)?|BANNED|PROHIBITED|CRIMINAL|VIOLATION|HIGH[\s\-]RISK|HIGH RISK|CRITICAL|PENALI[ZS]ED?|DANGEROUS?|FORBIDDEN|REVOKED?|NOT ALLOWED|BLOCKED|DO NOT|NEVER RECOMMEND)\b/g

  const inline = (raw: string): string => {
    // Mark danger words before escaping
    let s = raw.replace(DANGER_WORDS, '\x02$1\x03')

    // HTML escape
    s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    // Flag emoji → country-code badges (SVG rect + text label)
    const ccBadge = (code: string) =>
      `<svg width="26" height="14" viewBox="0 0 26 14" style="display:inline;vertical-align:middle;margin:0 2px" xmlns="http://www.w3.org/2000/svg"><rect width="26" height="14" rx="2" fill="#e0e7ff"/><text x="13" y="10.5" text-anchor="middle" fill="#3730a3" font-size="8" font-weight="700" font-family="Segoe UI,Arial,sans-serif">${code}</text></svg>`
    s = s
      .replace(/🇮🇳/g, ccBadge('IN'))
      .replace(/🇮🇩/g, ccBadge('ID'))
      .replace(/🇵🇭/g, ccBadge('PH'))
      .replace(/🇬🇧/g, ccBadge('UK'))
      .replace(/🇦🇺/g, ccBadge('AU'))
      .replace(/🇨🇦/g, ccBadge('CA'))
      .replace(/🇩🇪/g, ccBadge('DE'))
      .replace(/🇳🇱/g, ccBadge('NL'))
      .replace(/🇸🇪/g, ccBadge('SE'))
      .replace(/🇲🇾/g, ccBadge('MY'))
      .replace(/🇹🇭/g, ccBadge('TH'))
      .replace(/🇧🇩/g, ccBadge('BD'))
      .replace(/🇦🇪/g, ccBadge('UAE'))
      .replace(/🇲🇹/g, ccBadge('MT'))
      .replace(/🇺🇸/g, ccBadge('US'))
      .replace(/🇪🇺/g, ccBadge('EU'))

    // Status / signal emoji → inline SVG badges
    s = s
      .replace(/✅/g, '<b class="badge-ok"><svg width="10" height="10" viewBox="0 0 10 10" style="display:inline;vertical-align:middle;margin-right:2px"><circle cx="5" cy="5" r="5" fill="#166534"/><path d="M2.5 5l2 2 3-3" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>PASS</b>')
      .replace(/⚠️/g, '<b class="badge-warn"><svg width="10" height="10" viewBox="0 0 10 10" style="display:inline;vertical-align:middle;margin-right:2px"><path d="M5 1L9 9H1z" fill="#854d0e"/><text x="5" y="8.5" text-anchor="middle" fill="#fff" font-size="6" font-weight="bold">!</text></svg>WARN</b>')
      .replace(/❌/g, '<b class="badge-err"><svg width="10" height="10" viewBox="0 0 10 10" style="display:inline;vertical-align:middle;margin-right:2px"><circle cx="5" cy="5" r="5" fill="#991b1b"/><path d="M3 3l4 4M7 3l-4 4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>FAIL</b>')
      .replace(/🔴/g, '<b class="badge-red">HIGH RISK</b>')
      .replace(/🟡/g, '<b class="badge-yellow">MEDIUM</b>')
      .replace(/🟢/g, '<b class="badge-green">LOW RISK</b>')
      .replace(/⛔/g, '<b class="badge-red">STOP</b>')
      .replace(/🚨/g, '<b class="badge-red">ALERT</b>')
      .replace(/✓/g,  '<b class="badge-ok"><svg width="10" height="10" viewBox="0 0 10 10" style="display:inline;vertical-align:middle;margin-right:2px"><circle cx="5" cy="5" r="5" fill="#166534"/><path d="M2.5 5l2 2 3-3" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>OK</b>')
      // strip any remaining emoji (catch-all for Unicode emoji blocks)
      .replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FEFF}]/gu, '')

    // Markdown → HTML
    s = s
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<u class="keyword">$1</u>')

    // Restore danger sentinels as red-highlighted spans
    s = s.replace(/\x02([^\x03]+)\x03/g, '<span class="danger">$1</span>')

    return s
  }

  for (const line of lines) {
    if (line.trim().startsWith('|')) {
      if (/^\|[\s\-:|]+(\|[\s\-:|]+)+\|?\s*$/.test(line.trim())) {
        tblHead = tblRows.length > 0; continue
      }
      closeList()
      tblRows.push(line.trim().replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim())))
      continue
    }
    if (tblRows.length) flushTable()
    if (!line.trim()) { closeList(); continue }
    if (/^[-=]{3,}$/.test(line.trim())) { closeList(); out.push('<hr>'); continue }
    if (line.startsWith('#### ')) { closeList(); out.push(`<h4>${inline(line.slice(5))}</h4>`); continue }
    if (line.startsWith('### ')) { closeList(); out.push(`<h3>${inline(line.slice(4))}</h3>`); continue }
    if (line.startsWith('## '))  { closeList(); out.push(`<h2>${inline(line.slice(3))}</h2>`); continue }
    if (line.startsWith('# '))   { closeList(); out.push(`<h1>${inline(line.slice(2))}</h1>`); continue }
    const bh = line.match(/^\*\*([^*]+)\*\*$/)
    if (bh) { closeList(); out.push(`<div class="section-header">${bh[1]}</div>`); continue }
    if (line.match(/^[•\-\*] /)) {
      if (!inList || listTag !== 'ul') { closeList(); out.push('<ul>'); inList = true; listTag = 'ul' }
      out.push(`<li>${inline(line.replace(/^[•\-\*] /, ''))}</li>`)
      continue
    }
    const nm = line.match(/^(\d+)\.\s+(.+)/)
    if (nm) {
      if (!inList || listTag !== 'ol') { closeList(); out.push('<ol>'); inList = true; listTag = 'ol' }
      out.push(`<li>${inline(nm[2])}</li>`)
      continue
    }
    closeList()
    out.push(`<p>${inline(line)}</p>`)
  }
  if (tblRows.length) flushTable()
  closeList()
  return out.join('\n')
}

const REPORT_CSS = `
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',Calibri,Arial,sans-serif;max-width:820px;margin:40px auto;padding:24px 48px;color:#1a1a2e;font-size:13px;line-height:1.75;word-wrap:break-word}
  h1{font-size:22px;color:#4f46e5;border-bottom:2.5px solid #4f46e5;padding-bottom:8px;margin:0 0 6px;word-break:break-word}
  h2{font-size:16px;color:#4f46e5;margin:22px 0 5px;word-break:break-word}
  h3{font-size:14px;color:#3730a3;margin:16px 0 4px;word-break:break-word}
  h4{font-size:12.5px;color:#6366f1;margin:12px 0 3px;word-break:break-word;font-weight:600}
  .section-header{background:#eef0ff;border-left:4px solid #6366f1;padding:7px 14px;margin:20px 0 8px;font-weight:700;font-size:12px;color:#3730a3}
  p{margin:5px 0;word-wrap:break-word}
  ul{list-style:none;padding:0;margin:6px 0}
  ul li{display:flex;gap:10px;margin:5px 0;align-items:flex-start;word-break:break-word}
  ul li::before{content:"▸";color:#6366f1;flex-shrink:0;margin-top:2px;font-weight:700}
  ol{padding-left:22px;margin:6px 0}
  ol li{margin:5px 0;word-break:break-word}
  table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12px;word-break:break-word}
  th{background:#eef0ff;color:#3730a3;font-weight:700;padding:7px 10px;text-align:left;border:1px solid #c7d2fe;overflow-wrap:break-word}
  td{padding:6px 10px;border:1px solid #e0e0f0;vertical-align:top;line-height:1.55;overflow-wrap:break-word}
  tr:nth-child(even) td{background:#f8f8ff}
  u.keyword{text-decoration:underline;text-decoration-color:#d97706;text-underline-offset:2px;font-family:'Courier New',monospace;font-size:11.5px;background:#fff8e1;padding:1px 4px;border-radius:2px;font-style:normal}
  .danger{background:#fee2e2;color:#991b1b;padding:1px 4px;border-radius:3px;font-weight:700}
  strong{font-weight:600}
  .badge-ok{display:inline-flex;align-items:center;gap:2px;background:#dcfce7;color:#166534;padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700;margin:0 2px}
  .badge-warn{display:inline-flex;align-items:center;gap:2px;background:#fef9c3;color:#854d0e;padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700;margin:0 2px}
  .badge-err{display:inline-flex;align-items:center;gap:2px;background:#fee2e2;color:#991b1b;padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700;margin:0 2px}
  .badge-red{display:inline-flex;align-items:center;gap:2px;background:#fee2e2;color:#991b1b;padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700;margin:0 2px}
  .badge-yellow{display:inline-flex;align-items:center;gap:2px;background:#fef9c3;color:#854d0e;padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700;margin:0 2px}
  .badge-green{display:inline-flex;align-items:center;gap:2px;background:#dcfce7;color:#166534;padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700;margin:0 2px}
  hr{border:none;border-top:1px solid #d1d5db;margin:16px 0}
  .meta{color:#6b7280;font-size:11px;margin-bottom:28px}
  @media print{
    body{margin:0;max-width:100%;padding:16px 32px}
    table{page-break-inside:avoid}
    tr{page-break-inside:avoid}
    ul li,ol li{page-break-inside:avoid}
  }
`

function exportToPDF(content: string, title = 'Caspira SearchOps Report', onSave?: (r: ExportRecord) => void) {
  const html = toExportHTML(content)
  const win  = window.open('', '_blank')
  if (!win) return
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>${title}</title><style>${REPORT_CSS}</style></head><body>
<h1>${title}</h1><p class="meta">Generated by Caspira SearchOps &nbsp;·&nbsp; ${date}</p>${html}</body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 500)
  onSave?.({ id: crypto.randomUUID(), title, type: 'pdf', content, exportedAt: Date.now() })
}

function exportToWord(content: string, title = 'Caspira SearchOps Report', onSave?: (r: ExportRecord) => void) {
  const wordCSS = REPORT_CSS.replace(/@media print\{[\s\S]*?\}/g, '')
  const html    = toExportHTML(content)
  const date    = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const doc     = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><title>${title}</title><style>${wordCSS}</style></head>
<body><h1>${title}</h1><p class="meta">Generated by Caspira SearchOps · ${date}</p>${html}</body></html>`
  const blob = new Blob(['﻿', doc], { type: 'application/msword' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), {
    href: url, download: `jarvis-report-${new Date().toISOString().slice(0, 10)}.doc`,
  })
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
  onSave?.({ id: crypto.randomUUID(), title, type: 'word', content, exportedAt: Date.now() })
}

// ── Component ─────────────────────────────────────────────────────────────────

export function JarvisAI() {
  const { domain, setSection, aiProvider, jarvisMode, setJarvisMode, setSettingsOpen, psiKey, wpSites } = useStore()
  const orgId = useAuthStore(s => s.org?.id ?? '')
  const ready         = isAIReady()
  const provider      = getActiveProvider()
  const providerLabel = provider === 'openrouter' ? 'OpenRouter' : 'Claude Sonnet'
  const meta          = MODE_META[jarvisMode]

  // ── Conversation history ──────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId,  setActiveConvId]  = useState<string>(() => crypto.randomUUID())
  const [messages,      setMessages]      = useState<Message[]>([
    { role: 'assistant', content: modeGreeting(jarvisMode, domain), ts: time() },
  ])

  // ── UI state ──────────────────────────────────────────────────────────────
  const [input,        setInput]        = useState('')
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null)
  const [copiedIdx,    setCopiedIdx]    = useState<number | null>(null)
  const [isStreaming,  setIsStreaming]  = useState(false)
  const [isAnalyzing,  setIsAnalyzing] = useState(false)
  const streamBuf = useRef('')

  // ── MCP tools (WordPress sites connected via MCP) ─────────────────────────
  interface McpToolEntry { site: WPSite; realName: string; tool: AnthropicTool }
  const [mcpToolMap, setMcpToolMap] = useState<Record<string, McpToolEntry>>({})
  const mcpSites = wpSites.filter(s => s.mcpUrl && s.mcpStatus === 'connected')
  const mcpSitesKey = mcpSites.map(s => `${s.id}:${s.mcpUrl}`).join('|')

  useEffect(() => {
    if (!mcpSites.length || !isToolUseSupported()) { setMcpToolMap({}); return }
    let cancelled = false
    ;(async () => {
      const entries: Record<string, McpToolEntry> = {}
      for (const site of mcpSites) {
        try {
          const tools = await listMcpTools(site.mcpUrl!, site.mcpAuth || undefined)
          const prefix = slugify(site.name)
          for (const t of tools) {
            const key = `${prefix}__${t.name}`
            entries[key] = {
              site, realName: t.name,
              tool: { name: key, description: t.description || `${t.name} on ${site.name}`, input_schema: t.inputSchema },
            }
          }
        } catch { /* site unreachable — just skip its tools this round */ }
      }
      if (!cancelled) setMcpToolMap(entries)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcpSitesKey])

  const mcpTools = Object.values(mcpToolMap).map(e => e.tool)
  const [analyzeStep,    setAnalyzeStep]    = useState<string | null>(null)
  const [analyzeRange,   setAnalyzeRange]   = useState<AnalyzeRange>('3m')
  const [gscSites,       setGscSites]       = useState<string[]>([])
  const [selectedGscSite,setSelectedGscSite]= useState<string>('')
  const [ga4Props,       setGa4Props]       = useState<{ id: string; name: string }[]>([])
  const [selectedGa4Prop,setSelectedGa4Prop]= useState<string>('')
  const [exportHistory,  setExportHistory]  = useState<ExportRecord[]>([])
  const [sidebarTab,     setSidebarTab]     = useState<'chats' | 'exports'>('chats')
  // Background-loaded site context — injected into every chat so Caspira never asks the user to share data
  const [chatContext,    setChatContext]     = useState<string>('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)

  // ── Load saved conversations on mount ─────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const convs = JSON.parse(raw) as Conversation[]
      if (!Array.isArray(convs) || convs.length === 0) return
      setConversations(convs)
      const latest = convs[0]
      setActiveConvId(latest.id)
      setMessages(latest.messages)
      if (latest.mode) setJarvisMode(latest.mode)
    } catch { /* ignore malformed data */ }
    try {
      const rawExp = localStorage.getItem(EXPORT_HISTORY_KEY)
      if (rawExp) setExportHistory(JSON.parse(rawExp))
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-save whenever messages change ────────────────────────────────────
  useEffect(() => {
    if (!messages.some(m => m.role === 'user')) return // only save once user has spoken

    const firstUser  = messages.find(m => m.role === 'user')?.content ?? ''
    const title      = firstUser.slice(0, 42) + (firstUser.length > 42 ? '…' : '')

    setConversations(prev => {
      const existing = prev.find(c => c.id === activeConvId)
      const conv: Conversation = {
        id:        activeConvId,
        title,
        mode:      jarvisMode,
        messages,
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      }
      const rest    = prev.filter(c => c.id !== activeConvId)
      const updated = [conv, ...rest].slice(0, MAX_CONVS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  // ── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    if (messages.length > 1) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Load GSC + GA4 connections for the analyze picker ────────────────────
  useEffect(() => {
    if (!orgId) return
    const dp = getDataProvider()
    dp.select('jarvis_gsc_connections', {
      columns: 'selected_site, available_sites',
      filters: [{ column: 'org_id', op: 'eq', value: orgId }],
      mode: 'maybeSingle',
    })
      .then(({ data }) => {
        if (!data) return
        const conn = data as { selected_site: string | null; available_sites: string[] | null }
        const sites: string[] = conn.available_sites ?? []
        setGscSites(sites)
        setSelectedGscSite(conn.selected_site || sites[0] || '')
      })
    dp.select('jarvis_ga4_connections', {
      columns: 'property_id, property_name, available_properties',
      filters: [{ column: 'org_id', op: 'eq', value: orgId }],
      mode: 'maybeSingle',
    })
      .then(({ data: raw }) => {
        if (!raw) return
        const data = raw as { property_id: string | null; property_name: string | null; available_properties: unknown[] | null }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const avail: { id: string; name: string }[] = (data.available_properties ?? []).map((p: any) => ({
          id: p.id, name: p.displayName || p.id,
        }))
        const props = avail.length > 0 ? avail
          : data.property_id ? [{ id: data.property_id, name: data.property_name || data.property_id }]
          : []
        setGa4Props(props)
        setSelectedGa4Prop(data.property_id || props[0]?.id || '')
      })
  }, [orgId])

  // ── Background site-data loader — keeps chat context fresh ───────────────
  useEffect(() => {
    if (!orgId || !selectedGscSite) return
    const rangeOpt = RANGE_OPTIONS.find(r => r.value === analyzeRange) ?? RANGE_OPTIONS[2]
    const today    = new Date().toISOString().slice(0, 10)
    const agoDate  = new Date(Date.now() - rangeOpt.days * 86_400_000).toISOString().slice(0, 10)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parseGA4 = (data: any): Record<string, string>[] => {
      if (!data?.rows) return []
      const dims: string[] = (data.dimensionHeaders ?? []).map((h: any) => h.name)
      const mets: string[] = (data.metricHeaders   ?? []).map((h: any) => h.name)
      return data.rows.map((row: any) => {
        const obj: Record<string, string> = {}
        row.dimensionValues?.forEach((v: any, i: number) => { obj[dims[i]] = v.value })
        row.metricValues?.forEach((v: any, i: number) => { obj[mets[i]] = v.value })
        return obj
      })
    }

    const requests: Promise<void>[] = []
    let gsc = '', ga4 = ''

    type GscRow = { query: string; clicks: number; impressions: number; ctr: string; pos: number }
    type PageRow = { url: string; clicks: number; impressions: number; ctr: string; pos: number }

    requests.push(
      Promise.all([
        supabase.functions.invoke('gsc-proxy', {
          body: { org_id: orgId, site_url: selectedGscSite, endpoint: 'searchAnalytics',
            params: { startDate: agoDate, endDate: today, dimensions: ['query'], rowLimit: 50 } },
        }),
        supabase.functions.invoke('gsc-proxy', {
          body: { org_id: orgId, site_url: selectedGscSite, endpoint: 'searchAnalytics',
            params: { startDate: agoDate, endDate: today, dimensions: ['page'], rowLimit: 25 } },
        }),
      ]).then(([qRes, pRes]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const queries: GscRow[] = (qRes.data?.rows ?? []).map((r: any) => ({
          query: r.keys[0], clicks: r.clicks, impressions: r.impressions,
          ctr: (r.ctr * 100).toFixed(1) + '%', pos: +r.position.toFixed(1),
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pages: PageRow[] = (pRes.data?.rows ?? []).map((r: any) => ({
          url: r.keys[0], clicks: r.clicks, impressions: r.impressions,
          ctr: (r.ctr * 100).toFixed(1) + '%', pos: +r.position.toFixed(1),
        }))
        if (!queries.length && !pages.length) return
        const totals = queries.reduce(
          (a: { c: number; i: number }, q: GscRow) => ({ c: a.c + q.clicks, i: a.i + q.impressions }),
          { c: 0, i: 0 }
        )

        const group = (label: string, qs: GscRow[]) =>
          qs.length ? `${label}:\n${qs.map((q: GscRow) => `  "${q.query}" — ${q.clicks} clicks, ${q.impressions} impr, CTR ${q.ctr}, Pos ${q.pos}`).join('\n')}` : ''

        const pos1_3  = queries.filter((q: GscRow) => q.pos <= 3)
        const pos4_10 = queries.filter((q: GscRow) => q.pos > 3 && q.pos <= 10)
        const pos11   = queries.filter((q: GscRow) => q.pos > 10 && q.pos <= 20)
        const pos21   = queries.filter((q: GscRow) => q.pos > 20)

        gsc = `=== GSC QUERIES TAB — Last ${rangeOpt.label} | ${selectedGscSite} ===
Total Clicks: ${totals.c.toLocaleString()} | Total Impressions: ${totals.i.toLocaleString()}

${group('RANKING #1–3 (defending)', pos1_3)}
${group('RANKING #4–10 (quick-win targets)', pos4_10)}
${group('RANKING #11–20 (developing)', pos11)}
${group('RANKING #21+ (early stage)', pos21)}

=== GSC PAGES TAB — Top ${pages.length} Pages ===
${pages.map((p: PageRow) => `• ${p.url} — ${p.clicks} clicks, ${p.impressions} impr, CTR ${p.ctr}, Pos ${p.pos}`).join('\n')}`
      })
    )

    if (selectedGa4Prop) {
      const propName = ga4Props.find(p => p.id === selectedGa4Prop)?.name || selectedGa4Prop
      requests.push(
        Promise.all([
          supabase.functions.invoke('ga4-proxy', {
            body: { org_id: orgId, property_id: selectedGa4Prop,
              report: { dateRanges: [{ startDate: rangeOpt.ga4, endDate: 'today' }],
                metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }, { name: 'engagementRate' }, { name: 'averageSessionDuration' }] } },
          }),
          supabase.functions.invoke('ga4-proxy', {
            body: { org_id: orgId, property_id: selectedGa4Prop,
              report: { dateRanges: [{ startDate: rangeOpt.ga4, endDate: 'today' }],
                dimensions: [{ name: 'sessionDefaultChannelGrouping' }],
                metrics: [{ name: 'sessions' }],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 } },
          }),
          supabase.functions.invoke('ga4-proxy', {
            body: { org_id: orgId, property_id: selectedGa4Prop,
              report: { dateRanges: [{ startDate: rangeOpt.ga4, endDate: 'today' }],
                dimensions: [{ name: 'landingPage' }],
                metrics: [{ name: 'sessions' }, { name: 'engagementRate' }, { name: 'bounceRate' }],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 25 } },
          }),
        ]).then(([kpiRes, chRes, lpRes]) => {
          const kpiRows = parseGA4(kpiRes.data)
          const channels = parseGA4(chRes.data).map(r => ({ ch: r.sessionDefaultChannelGrouping, s: Number(r.sessions) }))
          const landingPages = parseGA4(lpRes.data).map(r => ({
            page: r.landingPage, sessions: Number(r.sessions),
            eng: (Number(r.engagementRate) * 100).toFixed(0) + '%',
            bounce: (Number(r.bounceRate) * 100).toFixed(0) + '%',
          }))
          if (!kpiRows.length) return
          const k = kpiRows[0]
          const dur = Math.floor(Number(k.averageSessionDuration) / 60) + ':' +
            String(Math.round(Number(k.averageSessionDuration) % 60)).padStart(2, '0')
          ga4 = `=== GA4 LANDING PAGES REPORT — Last ${rangeOpt.label} | ${propName} ===
Sessions: ${Number(k.sessions).toLocaleString()} | Pageviews: ${Number(k.screenPageViews).toLocaleString()} | Engagement: ${(Number(k.engagementRate)*100).toFixed(1)}% | Avg Duration: ${dur}

Traffic Channels:
${channels.map(c => `• ${c.ch}: ${c.s.toLocaleString()} sessions`).join('\n')}

Top Landing Pages (entry pages, ordered by sessions):
${landingPages.map(p => `• ${p.page} — ${p.sessions} sessions, ${p.eng} engaged, ${p.bounce} bounce`).join('\n')}`
        })
      )
    }

    Promise.allSettled(requests).then(() => {
      const ctx = [gsc, ga4].filter(Boolean).join('\n\n')
      if (ctx) setChatContext(ctx)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, selectedGscSite, selectedGa4Prop, analyzeRange])

  // ── Conversation actions ──────────────────────────────────────────────────
  function newConversation() {
    const id = crypto.randomUUID()
    setActiveConvId(id)
    setMessages([{ role: 'assistant', content: modeGreeting(jarvisMode, domain), ts: time() }])
    setInput('')
    setPendingImage(null)
  }

  function loadConversation(conv: Conversation) {
    if (conv.id === activeConvId) return
    setActiveConvId(conv.id)
    setMessages(conv.messages)
    if (conv.mode) setJarvisMode(conv.mode)
    setInput('')
    setPendingImage(null)
  }

  function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const updated = conversations.filter(c => c.id !== id)
    setConversations(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    if (activeConvId === id) {
      if (updated.length > 0) loadConversation(updated[0])
      else newConversation()
    }
  }

  function deleteAllConversations() {
    setConversations([])
    localStorage.removeItem(STORAGE_KEY)
    newConversation()
  }

  // ── Export history ────────────────────────────────────────────────────────
  function saveExport(record: ExportRecord) {
    setExportHistory(prev => {
      const updated = [record, ...prev].slice(0, MAX_EXPORTS)
      localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(updated))
      return updated
    })
    setSidebarTab('exports')
  }

  function deleteExport(id: string) {
    setExportHistory(prev => {
      const updated = prev.filter(r => r.id !== id)
      localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(updated))
      return updated
    })
  }

  // ── Mode + copy ───────────────────────────────────────────────────────────
  function switchMode(m: JarvisMode) {
    if (m === jarvisMode) return
    setJarvisMode(m)
    setMessages([{ role: 'assistant', content: modeGreeting(m, domain), ts: time() }])
  }

  function copyMessage(text: string, idx: number) {
    const plain = text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1')
    navigator.clipboard.writeText(plain).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    })
  }

  // ── Image upload ──────────────────────────────────────────────────────────
  function onImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPendingImage({
        url: dataUrl,
        attachment: { base64: dataUrl.split(',')[1], mimeType: file.type as ImageMime },
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  // streaming helper — appends chunks to the last assistant message in state
  const appendChunk = useCallback((chunk: string) => {
    streamBuf.current += chunk
    const content = streamBuf.current
    setMessages(prev => {
      const upd = [...prev]
      upd[upd.length - 1] = { ...upd[upd.length - 1], content }
      return upd
    })
  }, [])

  // ── Auto-site analysis ────────────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (isAnalyzing || isStreaming) return
    const rangeOpt = RANGE_OPTIONS.find(r => r.value === analyzeRange) ?? RANGE_OPTIONS[2]
    const siteName = selectedGscSite
      ? selectedGscSite.replace('sc-domain:', '').replace(/^https?:\/\//, '').replace(/\/$/, '')
      : (domain || 'my site')
    setIsAnalyzing(true)
    setIsStreaming(true)
    setAnalyzeStep('Starting analysis…')
    setMessages(prev => [...prev, {
      role: 'user',
      content: `Analyze ${siteName} — last ${rangeOpt.label} · GSC + GA4 + PageSpeed Insights`,
      ts: time(),
    }])
    try {
      const today      = new Date().toISOString().slice(0, 10)
      const agoDate    = new Date(Date.now() - rangeOpt.days * 86_400_000).toISOString().slice(0, 10)
      const rangeLabel = rangeOpt.label
      let gscQueries = '', gscPages = '', ga4Data = '', psiData = ''

      // ── Step 1: GSC Queries tab + Pages tab ───────────────────────────────
      if (orgId && selectedGscSite) {
        setAnalyzeStep(`Reading GSC Queries + Pages (${rangeLabel})…`)
        const [qRes, pRes] = await Promise.all([
          supabase.functions.invoke('gsc-proxy', {
            body: { org_id: orgId, site_url: selectedGscSite, endpoint: 'searchAnalytics',
              params: { startDate: agoDate, endDate: today, dimensions: ['query'], rowLimit: 50 } },
          }),
          supabase.functions.invoke('gsc-proxy', {
            body: { org_id: orgId, site_url: selectedGscSite, endpoint: 'searchAnalytics',
              params: { startDate: agoDate, endDate: today, dimensions: ['page'], rowLimit: 25 } },
          }),
        ])

        type GscQRow = { query: string; clicks: number; impressions: number; ctr: string; pos: number }
        type GscPRow = { url: string; clicks: number; impressions: number; ctr: string; pos: number }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const queries: GscQRow[] = (qRes.data?.rows ?? []).map((r: any) => ({
          query: r.keys[0], clicks: r.clicks, impressions: r.impressions,
          ctr: (r.ctr * 100).toFixed(1) + '%', pos: +r.position.toFixed(1),
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pages: GscPRow[] = (pRes.data?.rows ?? []).map((r: any) => ({
          url: r.keys[0], clicks: r.clicks, impressions: r.impressions,
          ctr: (r.ctr * 100).toFixed(1) + '%', pos: +r.position.toFixed(1),
        }))

        if (queries.length) {
          const totals = queries.reduce((a: { c: number; i: number }, q: GscQRow) => ({ c: a.c + q.clicks, i: a.i + q.impressions }), { c: 0, i: 0 })
          const pos1_3  = queries.filter(q => q.pos <= 3)
          const pos4_10 = queries.filter(q => q.pos > 3 && q.pos <= 10)
          const pos11   = queries.filter(q => q.pos > 10 && q.pos <= 20)
          const pos21   = queries.filter(q => q.pos > 20)

          const group = (label: string, qs: typeof queries) =>
            qs.length ? `${label}:\n${qs.map(q => `  "${q.query}" — ${q.clicks} clicks, ${q.impressions} impr, CTR ${q.ctr}, Pos ${q.pos}`).join('\n')}` : ''

          gscQueries = `=== GSC QUERIES TAB — Last ${rangeLabel} | ${selectedGscSite} ===
Total Clicks: ${totals.c.toLocaleString()} | Total Impressions: ${totals.i.toLocaleString()}

${group('Ranking #1–3 (defending — protect CTR)', pos1_3)}
${group('Ranking #4–10 (quick-win targets — push to page 1 top)', pos4_10)}
${group('Ranking #11–20 (developing — content & link investment)', pos11)}
${group('Ranking #21+ (early stage — long-tail content gaps)', pos21)}`
        }

        if (pages.length) {
          gscPages = `=== GSC PAGES TAB — Top ${pages.length} Pages ===
${pages.map(p => `• ${p.url} — ${p.clicks} clicks, ${p.impressions} impr, CTR ${p.ctr}, Pos ${p.pos}`).join('\n')}`
        }
      }

      // ── Step 2: GA4 Landing Pages report ─────────────────────────────────
      if (orgId && selectedGa4Prop) {
        setAnalyzeStep(`Reading GA4 landing pages (${rangeLabel})…`)
        const propName = ga4Props.find(p => p.id === selectedGa4Prop)?.name || selectedGa4Prop
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parseGA4 = (data: any): Record<string, string>[] => {
          if (!data?.rows) return []
          const dims: string[] = (data.dimensionHeaders ?? []).map((h: any) => h.name)
          const mets: string[] = (data.metricHeaders   ?? []).map((h: any) => h.name)
          return data.rows.map((row: any) => {
            const obj: Record<string, string> = {}
            row.dimensionValues?.forEach((v: any, i: number) => { obj[dims[i]] = v.value })
            row.metricValues?.forEach((v: any, i: number) => { obj[mets[i]] = v.value })
            return obj
          })
        }

        const [kpiRes, chRes, lpRes] = await Promise.all([
          supabase.functions.invoke('ga4-proxy', {
            body: { org_id: orgId, property_id: selectedGa4Prop,
              report: { dateRanges: [{ startDate: rangeOpt.ga4, endDate: 'today' }],
                metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }, { name: 'engagementRate' }, { name: 'averageSessionDuration' }] } },
          }),
          supabase.functions.invoke('ga4-proxy', {
            body: { org_id: orgId, property_id: selectedGa4Prop,
              report: { dateRanges: [{ startDate: rangeOpt.ga4, endDate: 'today' }],
                dimensions: [{ name: 'sessionDefaultChannelGrouping' }],
                metrics: [{ name: 'sessions' }],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 } },
          }),
          supabase.functions.invoke('ga4-proxy', {
            body: { org_id: orgId, property_id: selectedGa4Prop,
              report: { dateRanges: [{ startDate: rangeOpt.ga4, endDate: 'today' }],
                dimensions: [{ name: 'landingPage' }],
                metrics: [{ name: 'sessions' }, { name: 'engagementRate' }, { name: 'bounceRate' }],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 25 } },
          }),
        ])

        const kpiRows = parseGA4(kpiRes.data)
        const channels = parseGA4(chRes.data).map(r => ({ ch: r.sessionDefaultChannelGrouping, s: Number(r.sessions) }))
        const landingPages = parseGA4(lpRes.data).map(r => ({
          page: r.landingPage,
          sessions: Number(r.sessions),
          eng: (Number(r.engagementRate) * 100).toFixed(0) + '%',
          bounce: (Number(r.bounceRate) * 100).toFixed(0) + '%',
        }))

        if (kpiRows.length) {
          const k = kpiRows[0]
          const dur = Math.floor(Number(k.averageSessionDuration) / 60) + ':' +
            String(Math.round(Number(k.averageSessionDuration) % 60)).padStart(2, '0')
          ga4Data = `=== GA4 OVERVIEW — Last ${rangeLabel} | ${propName} ===
Sessions: ${Number(k.sessions).toLocaleString()} | Pageviews: ${Number(k.screenPageViews).toLocaleString()} | Engagement: ${(Number(k.engagementRate)*100).toFixed(1)}% | Avg Duration: ${dur}

Traffic Channels:
${channels.map(c => `• ${c.ch}: ${c.s.toLocaleString()} sessions`).join('\n')}

=== GA4 LANDING PAGES REPORT — Top ${landingPages.length} Entry Pages ===
(These are the pages users LAND on — cross-reference with GSC Pages tab for SEO alignment gaps)
${landingPages.map(p => `• ${p.page} — ${p.sessions} sessions, ${p.eng} engaged, ${p.bounce} bounce rate`).join('\n')}`
        }
      }

      // ── Step 3: PageSpeed audit ───────────────────────────────────────────
      if (psiKey && domain) {
        setAnalyzeStep('Running PageSpeed audit (mobile)…')
        try {
          const url = domain.startsWith('http') ? domain : `https://${domain}`
          const res = await fetch(
            `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${psiKey}`
          )
          if (res.ok) {
            const psi    = await res.json()
            const audits = psi.lighthouseResult.audits
            const score  = Math.round((psi.lighthouseResult.categories.performance.score ?? 0) * 100)
            const lcp    = Math.round((audits['largest-contentful-paint']?.numericValue ?? 0) / 10) / 100
            const tbt    = Math.round(audits['total-blocking-time']?.numericValue ?? 0)
            const cls    = Math.round((audits['cumulative-layout-shift']?.numericValue ?? 0) * 100) / 100
            const fcp    = Math.round((audits['first-contentful-paint']?.numericValue ?? 0) / 10) / 100
            const ttfb   = Math.round(audits['server-response-time']?.numericValue ?? 0)
            const oppIds = ['render-blocking-resources','unused-javascript','unused-css-rules','uses-optimized-images','uses-webp-images','uses-text-compression','server-response-time','total-byte-weight','dom-size']
            const opps = oppIds.map(id => {
              const a = audits[id]
              if (!a || a.score === 1 || a.score === null) return null
              const ms = Math.round(a.details?.overallSavingsMs ?? 0)
              const kb = Math.round((a.details?.overallSavingsBytes ?? 0) / 1024)
              return `• ${a.title}: ${ms >= 100 ? `${ms}ms` : kb > 0 ? `${kb}KB` : a.displayValue || 'fix needed'}`
            }).filter((o): o is string => o !== null)
            psiData = `=== PAGESPEED INSIGHTS (Mobile) ===
URL: ${url} | Score: ${score}/100 ${score >= 90 ? '(Good)' : score >= 50 ? '(Needs improvement)' : '(Poor)'}
LCP: ${lcp}s ${lcp <= 2.5 ? '(Good)' : lcp <= 4 ? '(Needs work)' : '(Poor)'} | TBT: ${tbt}ms | CLS: ${cls} | FCP: ${fcp}s | TTFB: ${ttfb}ms
Opportunities: ${opps.length ? '\n' + opps.join('\n') : 'None — site is well-optimised'}`
          }
        } catch { /* PSI unavailable */ }
      }

      // ── Step 4: Build prompt & call AI ────────────────────────────────────
      setAnalyzeStep('CASPIRA is analyzing your data…')
      const site    = selectedGscSite
        ? selectedGscSite.replace('sc-domain:', '').replace(/^https?:\/\//, '').replace(/\/$/, '')
        : (domain || 'your site')
      const hasData = gscQueries || ga4Data || psiData

      const prompt = hasData
        ? `Full SEO analysis for ${site} — last ${rangeLabel}. Use EVERY data point below.

${gscQueries}

${gscPages}

${ga4Data}

${psiData}

━━━ REPORT STRUCTURE (follow exactly) ━━━

**CASPIRA SEARCHOPS ANALYSIS REPORT — ${site}**
Reporting Period: Last ${rangeLabel} | Mode: ${jarvisMode.toUpperCase()}-HAT

**KEY FINDINGS**
Exactly 4–6 findings, each referencing specific numbers, URLs, or queries from the data above. Format each as one sentence stating the insight + the specific number + why it matters.

**TRAFFIC ANALYSIS**

**GSC: Query Performance**
- Group the queries by position bracket (1–3 / 4–10 / 11–20 / 21+). For the 4–10 bracket specifically, calculate the combined impressions and identify which queries have CTR significantly below the expected rate for that position — these are title/meta description fix candidates.
- For the pages tab: identify the strongest page (highest clicks), weakest page (lowest CTR for its impression volume), and any page with position < 10 but CTR < 3% (meta optimisation needed).

**GA4: Landing Page Behaviour**
- Cross-reference the GA4 landing pages with GSC pages. List any GSC top pages that do NOT appear in GA4 top landing pages — this gap means Google sends traffic but users aren't entering through those pages organically.
- Flag any landing pages with bounce rate > 60% AND high session volume — these are conversion leaks.
- Comment on channel diversification: what % of sessions is organic vs paid vs direct?

**QUICK WINS — This Week**
Exactly 5 tasks. Each must name a specific page URL or query string from the data. Format:
1. [Task] — [specific page/query] — [expected impact] — [effort: hours]

**90-DAY STRATEGY ROADMAP**
Month 1 — Foundation (weeks 1–4): 3–4 actions addressing the biggest gaps in the data
Month 2 — Growth (weeks 5–8): 3–4 actions building content for position 11–20 queries
Month 3 — Scale (weeks 9–12): 3–4 actions to compound and diversify

Use exact data. No generics. Every recommendation must trace back to a specific number in the data provided.`
        : `The user has not yet connected GSC, GA4, or PageSpeed Insights for ${site}. Provide a concise onboarding guide: explain what each data source provides for SEO, list key metrics to monitor, and give a general 90-day SEO starting strategy.`

      // ── Step 4: Stream AI response ────────────────────────────────────────
      setAnalyzeStep('CASPIRA is writing your report…')
      streamBuf.current = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '', ts: time() }])

      let accMsgs: MultiTurnMessage[] = [{ role: 'user', content: prompt }]
      let stop: StopReason
      do {
        stop = await streamAIMulti(withDate(MODE_SYSTEM[jarvisMode]), accMsgs, appendChunk, 8192)
        if (stop === 'max_tokens') {
          accMsgs = [...accMsgs, { role: 'assistant', content: streamBuf.current }, { role: 'user', content: 'Continue exactly where you left off, do not repeat anything.' }]
        }
      } while (stop === 'max_tokens')

    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Analysis failed'
      const msg = raw === 'NO_KEY'
        ? 'No API key configured. Go to **Settings** to add your OpenRouter or Anthropic key.'
        : `**Analysis error:** ${raw}`
      setMessages(prev => {
        const upd = [...prev]
        const last = upd[upd.length - 1]
        if (last?.role === 'assistant' && last.content === '') upd[upd.length - 1] = { ...last, content: msg }
        else upd.push({ role: 'assistant', content: msg, ts: time() })
        return upd
      })
    } finally {
      setAnalyzeStep(null)
      setIsAnalyzing(false)
      setIsStreaming(false)
    }
  }, [isAnalyzing, isStreaming, analyzeRange, orgId, selectedGscSite, selectedGa4Prop, ga4Props, psiKey, domain, jarvisMode, appendChunk])

  // ── Send (streaming) ──────────────────────────────────────────────────────
  const handleSend = useCallback(async (text = input.trim()) => {
    const msgText = text || (pendingImage ? 'Analyze this image in the context of SEO.' : '')
    if (!msgText && !pendingImage) return
    if (isStreaming || isAnalyzing) return

    const img = pendingImage ?? undefined
    const snap = messages // capture history before state changes
    setMessages(prev => [...prev, { role: 'user', content: msgText, ts: time(), imageUrl: img?.url }])
    setInput('')
    setPendingImage(null)
    setIsStreaming(true)
    streamBuf.current = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '', ts: time() }])

    try {
      const system = withDate(chatContext
        ? `${MODE_SYSTEM[jarvisMode]}\n\n━━━ LIVE SITE DATA (use this for all recommendations) ━━━\n${chatContext}`
        : MODE_SYSTEM[jarvisMode])

      const raw = snap.map(m => ({ role: m.role, content: m.content }))
      const firstUser = raw.findIndex(m => m.role === 'user')
      const baseHistory: MultiTurnMessage[] = (firstUser >= 0 ? raw.slice(firstUser) : []) as MultiTurnMessage[]

      if (img) {
        const reply = await callAIWithImageMulti(system, baseHistory, msgText, img.attachment, 4000)
        setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: reply }; return u })
      } else if (mcpTools.length > 0 && isToolUseSupported()) {
        // Tool-use loop — Caspira AI can call MCP tools (e.g. publish/schedule
        // a WordPress post) mid-conversation when the user asks it to.
        const toolSystem = `${system}\n\n━━━ TOOLS ━━━\nYou have tools that can publish or schedule posts on the user's connected WordPress site(s) via MCP. Use them when the user asks you to publish, post, or schedule content — don't just describe what you would do. Confirm what happened afterward in plain language.`
        let accMsgs: ToolTurnMessage[] = [...baseHistory, { role: 'user', content: msgText }]
        let stop: StopReason | 'tool_use' = 'end_turn'
        let rounds = 0
        do {
          const result = await streamAnthropicWithTools(toolSystem, accMsgs, mcpTools, appendChunk, 8192)
          stop = result.stopReason
          if (stop === 'tool_use' && result.toolUses.length) {
            accMsgs = [...accMsgs, { role: 'assistant', content: result.assistantBlocks }]
            const toolResults: ToolContentBlock[] = []
            for (const use of result.toolUses) {
              const entry = mcpToolMap[use.name]
              appendChunk(`\n\n🔧 *Calling \`${entry?.realName ?? use.name}\` on ${entry?.site.name ?? 'site'}…*\n\n`)
              if (!entry) {
                toolResults.push({ type: 'tool_result', tool_use_id: use.id, content: `Unknown tool "${use.name}"`, is_error: true })
                continue
              }
              try {
                const res = await callMcpTool(entry.site.mcpUrl!, entry.site.mcpAuth || undefined, entry.realName, (use.input ?? {}) as Record<string, unknown>)
                toolResults.push({ type: 'tool_result', tool_use_id: use.id, content: mcpResultToText(res), is_error: res.isError })
              } catch (err) {
                toolResults.push({ type: 'tool_result', tool_use_id: use.id, content: err instanceof Error ? err.message : 'Tool call failed', is_error: true })
              }
            }
            accMsgs = [...accMsgs, { role: 'user', content: toolResults }]
            rounds++
            if (rounds > 6) break // guard against runaway tool loops
          } else if (stop === 'max_tokens') {
            accMsgs = [...accMsgs, { role: 'assistant', content: streamBuf.current }, { role: 'user', content: 'Continue exactly where you left off, do not repeat anything.' }]
          }
        } while (stop === 'tool_use' || stop === 'max_tokens')
      } else {
        let accMsgs: MultiTurnMessage[] = [...baseHistory, { role: 'user', content: msgText }]
        let stop: StopReason
        do {
          stop = await streamAIMulti(system, accMsgs, appendChunk, 8192)
          if (stop === 'max_tokens') {
            accMsgs = [...accMsgs, { role: 'assistant', content: streamBuf.current }, { role: 'user', content: 'Continue exactly where you left off, do not repeat anything.' }]
          }
        } while (stop === 'max_tokens')
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Unknown error'
      const msg = raw === 'NO_KEY'
        ? 'No API key configured. Go to **Settings** to add your OpenRouter or Anthropic key.'
        : `**${providerLabel} error:** ${raw}`
      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: msg }; return u })
    } finally {
      setIsStreaming(false)
    }
  }, [isStreaming, isAnalyzing, pendingImage, messages, input, chatContext, jarvisMode, appendChunk, providerLabel, mcpTools, mcpToolMap])

  // ── Not connected screen ──────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl overflow-hidden">
          <img src="/jarvis-icon.png" alt="Caspira" className="w-full h-full object-cover" />
        </div>
        <div className="font-display font-bold text-xl">Caspira AI Co-Pilot</div>
        <div className="text-sm text-muted max-w-xs">
          Add an <strong>OpenRouter</strong> (free models available) or <strong>Anthropic</strong> API key in Settings to unlock AI-powered SEO strategy.
        </div>
        <Button variant="primary" onClick={() => setSettingsOpen(true)}>
          Add API Key in Settings
        </Button>
      </div>
    )
  }

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div className="flex gap-3 flex-1 min-h-0">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div className="w-52 shrink-0 flex flex-col gap-2 border-r border-border pr-3">

        {/* Tab toggle */}
        <div className="flex gap-0.5 p-0.5 bg-surface border border-border rounded-xl">
          <button
            onClick={() => setSidebarTab('chats')}
            className={cn(
              'flex-1 text-[10px] font-semibold py-1.5 rounded-lg transition-all cursor-pointer',
              sidebarTab === 'chats' ? 'bg-card text-tx shadow-sm' : 'text-muted hover:text-tx'
            )}
          >Chats</button>
          <button
            onClick={() => setSidebarTab('exports')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 rounded-lg transition-all cursor-pointer',
              sidebarTab === 'exports' ? 'bg-card text-tx shadow-sm' : 'text-muted hover:text-tx'
            )}
          >
            Exports
            {exportHistory.length > 0 && (
              <span className="text-[9px] bg-accent/20 text-accent rounded-full px-1.5 font-bold">{exportHistory.length}</span>
            )}
          </button>
        </div>

        {sidebarTab === 'chats' ? (
          <>
            {/* New chat */}
            <button
              onClick={newConversation}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl border border-dashed border-border
                text-xs text-muted hover:border-accent hover:text-accent transition-all cursor-pointer"
            >
              <Plus size={12} /> New Chat
            </button>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto space-y-0.5 scrollbar-thin">
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare size={18} className="text-muted mx-auto mb-2" strokeWidth={1} />
                  <div className="text-[11px] text-muted">No saved chats yet</div>
                  <div className="text-[10px] text-muted/60 mt-1">Conversations auto-save</div>
                </div>
              ) : conversations.map(conv => {
                const isActive  = conv.id === activeConvId
                const ModeIcon  = MODE_META[conv.mode]?.icon ?? ShieldCheck
                const modeColor = MODE_META[conv.mode]?.color ?? '#10b981'
                return (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv)}
                    className={cn(
                      'group/item w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer',
                      isActive ? 'bg-accent/10 border border-accent/20' : 'hover:bg-surface border border-transparent'
                    )}
                  >
                    <ModeIcon size={10} className="mt-0.5 shrink-0" style={{ color: modeColor }} />
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-[11px] font-medium truncate leading-tight', isActive ? 'text-accent' : 'text-tx')}>
                        {conv.title}
                      </div>
                      <div className="text-[10px] text-muted font-mono-jarvis mt-0.5">{fmtConvDate(conv.updatedAt)}</div>
                    </div>
                    <button
                      onClick={e => deleteConversation(conv.id, e)}
                      title="Delete"
                      className="opacity-0 group-hover/item:opacity-100 transition-opacity text-muted hover:text-danger cursor-pointer mt-0.5 shrink-0"
                    >
                      <Trash2 size={10} />
                    </button>
                  </button>
                )
              })}
            </div>

            {conversations.length > 1 && (
              <button
                onClick={deleteAllConversations}
                className="text-[10px] text-muted/60 hover:text-danger transition-colors cursor-pointer text-center py-1"
              >
                Clear all history
              </button>
            )}
          </>
        ) : (
          <>
            {/* Export history list */}
            <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
              {exportHistory.length === 0 ? (
                <div className="text-center py-8">
                  <FileDown size={18} className="text-muted mx-auto mb-2" strokeWidth={1} />
                  <div className="text-[11px] text-muted">No exports yet</div>
                  <div className="text-[10px] text-muted/60 mt-1">PDF &amp; Word exports appear here</div>
                </div>
              ) : exportHistory.map(rec => (
                <div key={rec.id} className="group/exp rounded-lg border border-border bg-card/50 p-2 hover:bg-surface transition-all">
                  <div className="flex items-start gap-1.5 mb-1.5">
                    {rec.type === 'pdf'
                      ? <FileDown size={10} className="text-red-400 mt-0.5 shrink-0" />
                      : <FileText size={10} className="text-blue-400 mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-tx truncate leading-tight">{rec.title}</div>
                      <div className="text-[10px] text-muted font-mono-jarvis mt-0.5">
                        {fmtConvDate(rec.exportedAt)} · {new Date(rec.exportedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <span className={cn(
                        'inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border font-mono-jarvis',
                        rec.type === 'pdf'
                          ? 'bg-red-500/10 text-red-400 border-red-400/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-400/30'
                      )}>
                        {rec.type.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => rec.type === 'pdf'
                        ? exportToPDF(rec.content, rec.title)
                        : exportToWord(rec.content, rec.title)}
                      title="Download again"
                      className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px]
                        bg-accent/10 text-accent hover:bg-accent/20 cursor-pointer transition-colors border border-accent/20"
                    >
                      <FileDown size={9} /><span className="font-mono-jarvis">Download</span>
                    </button>
                    <button
                      onClick={() => deleteExport(rec.id)}
                      title="Remove from history"
                      className="px-2 py-1 rounded-md text-[10px] text-muted hover:text-danger hover:bg-danger/10 cursor-pointer transition-colors border border-border"
                    >
                      <Trash2 size={9} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {exportHistory.length > 1 && (
              <button
                onClick={() => {
                  setExportHistory([])
                  localStorage.removeItem(EXPORT_HISTORY_KEY)
                }}
                className="text-[10px] text-muted/60 hover:text-danger transition-colors cursor-pointer text-center py-1"
              >
                Clear all exports
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Chat area ────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-h-0">

        {/* ── Mode selector ── */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10px] text-muted font-mono-jarvis tracking-widest flex items-center gap-1">
            STRATEGY MODE
            <InfoTooltip text="Controls how aggressive Caspira's SEO advice is. White-hat = Google-safe only; Gray-hat = calculated risk; Black-hat = maximum aggression with no restrictions." />
          </span>
          <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl">
            {(Object.keys(MODE_META) as JarvisMode[]).map((m) => {
              const cfg  = MODE_META[m]
              const Icon = cfg.icon
              const active = jarvisMode === m
              return (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  title={cfg.desc}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border',
                    active ? 'shadow-sm' : 'border-transparent text-muted hover:text-tx'
                  )}
                  style={active ? { background: cfg.color + '22', borderColor: cfg.color + '60', color: cfg.color } : undefined}
                >
                  <Icon size={11} />
                  {cfg.label}
                </button>
              )
            })}
          </div>

          <span
            className="text-[10px] font-mono-jarvis px-2 py-0.5 rounded-full border"
            style={{ color: meta.color, borderColor: meta.color + '40', background: meta.color + '15' }}
          >
            {meta.desc}
          </span>

          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono-jarvis ml-auto border ${
            aiProvider === 'openrouter' ? 'bg-[#10b98120] text-accent3 border-[#10b98140]' : 'bg-accent/10 text-accent border-accent/20'
          }`}>
            {providerLabel}
          </span>
          {(jarvisMode === 'gray' || jarvisMode === 'black') && aiProvider !== 'openrouter' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#f59e0b40] bg-[#f59e0b10] text-[#f59e0b] font-mono-jarvis">
              Use OpenRouter + DeepSeek for best results in this mode
            </span>
          )}
          {mcpTools.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-mono-jarvis px-2 py-0.5 rounded-full border border-accent2/40 bg-accent2/10 text-accent2">
              🔧 {mcpTools.length} MCP tool{mcpTools.length === 1 ? '' : 's'} connected
              <InfoTooltip text="Caspira can call these tools mid-conversation — e.g. ask it to publish or schedule a post on a connected WordPress site." />
            </span>
          )}
          <button
            onClick={() => setSection('onboarding')}
            className="text-[10px] text-muted hover:text-accent transition-colors cursor-pointer"
          >
            Switch provider →
          </button>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin mb-4">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-3 group/msg', m.role === 'user' && 'flex-row-reverse')}>
              <div className={cn(
                'w-8 h-8 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-sm',
                m.role === 'assistant' ? '' : 'bg-surface border border-border'
              )}>
                {m.role === 'assistant'
                  ? <img src="/jarvis-icon.png" alt="Caspira" className="w-full h-full object-cover" />
                  : <User size={14} className="text-muted" />}
              </div>

              <div className="relative max-w-[75%]">
                <div className={cn(
                  'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  m.role === 'assistant'
                    ? 'bg-card border border-border text-tx'
                    : 'bg-linear-to-br from-accent2 to-[#9333ea] text-white'
                )}>
                  {m.imageUrl && (
                    <img src={m.imageUrl} alt="attachment" className="max-w-full rounded-xl mb-2 max-h-64 object-contain" />
                  )}
                  {m.content && <MessageContent content={m.content} />}
                  <div className="text-[10px] opacity-50 mt-1 font-mono-jarvis">{m.ts}</div>
                </div>

                {/* Action buttons — assistant only */}
                {m.role === 'assistant' && m.content && (
                  <div className="absolute -bottom-5 right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1">
                    <button
                      onClick={() => copyMessage(m.content, i)}
                      title="Copy to clipboard"
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface border border-border
                        text-[10px] text-muted hover:text-accent hover:border-accent cursor-pointer shadow-sm"
                    >
                      {copiedIdx === i
                        ? <><Check size={10} className="text-accent3" /><span className="font-mono-jarvis text-accent3">Copied</span></>
                        : <><Copy size={10} /><span className="font-mono-jarvis">Copy</span></>
                      }
                    </button>
                    <button
                      onClick={() => exportToPDF(m.content, 'Caspira SearchOps Report', saveExport)}
                      title="Export as PDF"
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface border border-border
                        text-[10px] text-muted hover:text-red-400 hover:border-red-400/50 cursor-pointer shadow-sm"
                    >
                      <FileDown size={10} /><span className="font-mono-jarvis">PDF</span>
                    </button>
                    <button
                      onClick={() => exportToWord(m.content, 'Caspira SearchOps Report', saveExport)}
                      title="Export as Word document"
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface border border-border
                        text-[10px] text-muted hover:text-blue-400 hover:border-blue-400/50 cursor-pointer shadow-sm"
                    >
                      <FileText size={10} /><span className="font-mono-jarvis">Word</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {(isStreaming || isAnalyzing) && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0">
                <img src="/jarvis-icon.png" alt="Caspira" className="w-full h-full object-cover" />
              </div>
              <div className="bg-card border border-border rounded-2xl px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="text-xs text-muted font-mono-jarvis">
                    {analyzeStep || 'CASPIRA THINKING'}
                  </span>
                  <span className="flex gap-0.5 ml-1">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1 h-1 rounded-full bg-accent animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Auto-analyze panel ── */}
        <div className="mb-3 border border-dashed border-accent/30 rounded-xl p-2.5 bg-accent/[0.03]">
          <div className="flex items-center gap-2 flex-wrap">

            {/* Date range chips */}
            <span className="text-[10px] text-muted font-mono-jarvis tracking-widest shrink-0">RANGE</span>
            <div className="flex gap-1 flex-wrap">
              {RANGE_OPTIONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setAnalyzeRange(r.value)}
                  disabled={isAnalyzing}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer border',
                    analyzeRange === r.value
                      ? 'bg-accent/20 border-accent/50 text-accent'
                      : 'border-border text-muted hover:text-tx hover:border-accent/30 disabled:opacity-40'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* GSC site picker — shown when multiple sites connected */}
            {gscSites.length > 1 && (
              <>
                <span className="text-[10px] text-muted font-mono-jarvis tracking-widest shrink-0 ml-1">GSC</span>
                <select
                  value={selectedGscSite}
                  onChange={e => setSelectedGscSite(e.target.value)}
                  disabled={isAnalyzing}
                  className="text-[11px] bg-surface border border-border rounded-lg px-2 py-0.5 text-tx outline-none cursor-pointer max-w-[200px] font-mono-jarvis"
                >
                  {gscSites.map(s => (
                    <option key={s} value={s}>
                      {s.replace('sc-domain:', '').replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* GA4 property picker — shown when multiple properties connected */}
            {ga4Props.length > 1 && (
              <>
                <span className="text-[10px] text-muted font-mono-jarvis tracking-widest shrink-0 ml-1">GA4</span>
                <select
                  value={selectedGa4Prop}
                  onChange={e => setSelectedGa4Prop(e.target.value)}
                  disabled={isAnalyzing}
                  className="text-[11px] bg-surface border border-border rounded-lg px-2 py-0.5 text-tx outline-none cursor-pointer max-w-[200px] font-mono-jarvis"
                >
                  {ga4Props.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </>
            )}

            {/* Run button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || isStreaming}
              className={cn(
                'ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border',
                isAnalyzing
                  ? 'border-accent/40 bg-accent/15 text-accent cursor-not-allowed'
                  : 'border-accent/50 bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={11} className="animate-spin shrink-0" />
                  <span className="font-mono-jarvis">{analyzeStep || 'Collecting…'}</span>
                </>
              ) : (
                <>
                  <Sparkles size={11} className="shrink-0" />
                  <span>Analyze My Site</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Quick asks ── */}
        <div className="flex gap-2 flex-wrap mb-3">
          {MODE_QUICK_ASKS[jarvisMode].map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              disabled={isStreaming || isAnalyzing}
              className="text-[11px] px-3 py-1.5 rounded-full border border-border text-muted hover:text-tx transition-all disabled:opacity-40 cursor-pointer"
              onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '' }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* ── Input ── */}
        <Card className="p-3" style={{ borderColor: meta.color + '30' }}>
          {pendingImage && (
            <div className="mb-2 flex items-start gap-2">
              <div className="relative shrink-0">
                <img src={pendingImage.url} alt="pending attachment" className="h-20 w-20 object-cover rounded-xl border border-border" />
                <button
                  onClick={() => setPendingImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger flex items-center justify-center shadow-md"
                >
                  <X size={10} className="text-white" />
                </button>
              </div>
              <span className="text-[10px] text-muted font-mono-jarvis mt-1">
                Image attached — add a question or send as-is
              </span>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={
                  pendingImage
                    ? 'Ask something about this image, or just press Enter…'
                    : jarvisMode === 'white' ? 'Ask Caspira anything about SEO… (Enter to send)'
                    : jarvisMode === 'gray'  ? 'What do you want to push? (Enter to send)'
                    :                          "No limits. What's the target? (Enter to send)"
                }
                rows={2}
                className="w-full bg-transparent text-sm text-tx outline-none resize-none placeholder:text-muted leading-relaxed"
              />
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={isStreaming}
                title="Attach image (JPEG, PNG, GIF, WebP · max 5 MB)"
                className={cn(
                  'p-2 rounded-lg transition-colors cursor-pointer',
                  pendingImage ? 'text-accent bg-accent/10' : 'text-muted hover:text-accent hover:bg-accent/10'
                )}
              >
                <ImageIcon size={14} />
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={onImageSelect} className="hidden" />
              <Button
                variant="ghost"
                className="p-2"
                onClick={() => { setMessages([messages[0]]); setPendingImage(null) }}
                title="Clear chat"
              >
                <Zap size={13} />
              </Button>
              <Button
                variant={(isStreaming || isAnalyzing) ? 'ghost' : 'ai'}
                className="p-2"
                onClick={() => handleSend()}
                disabled={isStreaming || isAnalyzing || (!input.trim() && !pendingImage)}
              >
                {isStreaming ? <Brain size={14} className="animate-pulse" /> : <Send size={14} />}
              </Button>
            </div>
          </div>
        </Card>

      </div>
    </div>
  )
}
