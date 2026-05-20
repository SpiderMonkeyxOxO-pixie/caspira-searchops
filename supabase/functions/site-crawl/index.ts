// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_PAGES  = 150
const BATCH_SIZE = 5
const BOT_UA     = 'Jarvis-SEO-Crawler/1.0 (compatible; Googlebot)'

// ── HTML extractors ───────────────────────────────────────────
function getTitle(html: string): string | null {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    ?.replace(/<[^>]+>/g, '').trim() ?? null
}
function getMetaDesc(html: string): string | null {
  return (
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']*)[^>]+name=["']description["']/i)?.[1] ??
    null
  )?.trim() ?? null
}
function getCanonical(html: string): string | null {
  return (
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i)?.[1] ??
    html.match(/<link[^>]+href=["']([^"']*)[^>]+rel=["']canonical["']/i)?.[1] ??
    null
  )?.trim() ?? null
}
function getH1s(html: string): string[] {
  return [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean)
}
function getH2Count(html: string): number {
  return (html.match(/<h2[\s>]/gi) ?? []).length
}
function checkNoindex(html: string): boolean {
  return /<meta[^>]+content=["'][^"']*noindex[^"']*["']/i.test(html)
}
function countWords(html: string): number {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ').trim()
    .split(' ').filter(w => w.length > 2).length
}
function imgStats(html: string): { total: number; noAlt: number } {
  const imgs = [...html.matchAll(/<img[^>]*/gi)]
  return {
    total: imgs.length,
    noAlt: imgs.filter(m => !/alt=["'][^"']+/i.test(m[0])).length,
  }
}
function hasSchemaMarkup(html: string): boolean {
  return /<script[^>]+type=["']application\/ld\+json["']/i.test(html)
}
function hasOgTitle(html: string): boolean {
  return /<meta[^>]+property=["']og:title["']/i.test(html)
}
function hasOgImage(html: string): boolean {
  return /<meta[^>]+property=["']og:image["']/i.test(html)
}
function hasTwitterCard(html: string): boolean {
  return /<meta[^>]+name=["']twitter:card["']/i.test(html)
}
function hasMixedContent(html: string, pageUrl: string): boolean {
  if (!pageUrl.startsWith('https://')) return false
  return /src=["']http:\/\//i.test(html) || /href=["']http:\/\//i.test(html)
}
function extractInternalLinks(html: string, baseUrl: string): string[] {
  try {
    const base = new URL(baseUrl)
    const seen = new Set<string>()
    const links: string[] = []
    for (const [, href] of html.matchAll(/href=["']([^"'#?]+)/gi)) {
      try {
        const u = new URL(href, baseUrl)
        if (u.hostname !== base.hostname) continue
        if (!u.protocol.startsWith('http')) continue
        // Skip non-HTML resources
        if (/\.(jpg|jpeg|png|gif|svg|webp|pdf|zip|css|js|xml|ico|woff|ttf)$/i.test(u.pathname)) continue
        const normalized = u.origin + (u.pathname === '/' ? '/' : u.pathname.replace(/\/$/, ''))
        if (!seen.has(normalized)) { seen.add(normalized); links.push(normalized) }
      } catch { /* invalid URL */ }
    }
    return links
  } catch { return [] }
}

// ── Issue detection — 25+ checks ─────────────────────────────
interface Issue { type: string; severity: 'high' | 'med' | 'low'; message: string }

function detectIssues(p: {
  statusCode: number; title: string | null; metaDesc: string | null
  h1Count: number; h2Count: number; noindex: boolean; words: number
  imgNoAlt: number; canonical: string | null; hasSchema: boolean
  hasOgTitle: boolean; hasOgImage: boolean; hasTwitterCard: boolean
  responseTime: number; htmlSize: number; urlLength: number
  redirectDetected: boolean; mixedContent: boolean
}): Issue[] {
  const out: Issue[] = []

  // HTTP status
  if (p.statusCode >= 500)
    out.push({ type: 'server_error',    severity: 'high', message: `Server error (HTTP ${p.statusCode})` })
  else if (p.statusCode >= 400)
    out.push({ type: 'error_page',      severity: 'high', message: `Broken page (HTTP ${p.statusCode})` })

  // Title
  if (!p.title)
    out.push({ type: 'missing_title',   severity: 'high', message: 'Missing title tag' })
  else if (p.title.length < 30)
    out.push({ type: 'title_short',     severity: 'med',  message: `Title too short (${p.title.length} chars — aim 30-60)` })
  else if (p.title.length > 60)
    out.push({ type: 'title_long',      severity: 'med',  message: `Title too long (${p.title.length} chars — max 60)` })

  // Meta description
  if (!p.metaDesc)
    out.push({ type: 'missing_meta',    severity: 'med',  message: 'Missing meta description' })
  else if (p.metaDesc.length < 70)
    out.push({ type: 'meta_short',      severity: 'low',  message: `Meta description short (${p.metaDesc.length} chars — aim 70-160)` })
  else if (p.metaDesc.length > 160)
    out.push({ type: 'meta_long',       severity: 'med',  message: `Meta description too long (${p.metaDesc.length} chars — max 160)` })

  // Headings
  if (p.h1Count === 0)
    out.push({ type: 'missing_h1',      severity: 'high', message: 'No H1 tag found' })
  if (p.h1Count > 1)
    out.push({ type: 'multiple_h1',     severity: 'med',  message: `${p.h1Count} H1 tags found — should be exactly 1` })
  if (p.h2Count === 0)
    out.push({ type: 'missing_h2',      severity: 'low',  message: 'No H2 tags — weak heading structure' })

  // Indexability
  if (p.noindex)
    out.push({ type: 'noindex',         severity: 'high', message: 'Page is noindexed — invisible to Google' })

  // Content quality
  if (p.words > 0 && p.words < 300)
    out.push({ type: 'thin_content',    severity: 'med',  message: `Thin content (${p.words} words — aim 300+)` })

  // Canonicalization
  if (!p.canonical)
    out.push({ type: 'no_canonical',    severity: 'low',  message: 'No canonical tag — Google may choose its own' })

  // Images
  if (p.imgNoAlt > 0)
    out.push({ type: 'img_no_alt',      severity: 'low',  message: `${p.imgNoAlt} image(s) missing alt text` })

  // Performance
  if (p.responseTime > 3000)
    out.push({ type: 'slow_server',     severity: 'high', message: `Slow server response (${(p.responseTime/1000).toFixed(1)}s — aim < 0.8s)` })
  else if (p.responseTime > 1500)
    out.push({ type: 'slow_server_med', severity: 'med',  message: `Moderate server response (${(p.responseTime/1000).toFixed(1)}s)` })

  // Page size
  if (p.htmlSize > 500_000)
    out.push({ type: 'page_too_large',  severity: 'high', message: `Huge HTML page (${(p.htmlSize/1024).toFixed(0)}KB — aim < 100KB)` })
  else if (p.htmlSize > 100_000)
    out.push({ type: 'page_large',      severity: 'med',  message: `Large HTML page (${(p.htmlSize/1024).toFixed(0)}KB — aim < 100KB)` })

  // Redirects
  if (p.redirectDetected)
    out.push({ type: 'redirect',        severity: 'low',  message: 'URL redirects — update internal links to final destination' })

  // Structured data
  if (!p.hasSchema)
    out.push({ type: 'no_schema',       severity: 'low',  message: 'No JSON-LD structured data (schema.org markup)' })

  // Social / Open Graph
  if (!p.hasOgTitle)
    out.push({ type: 'no_og_title',     severity: 'low',  message: 'Missing og:title — poor social media preview' })
  if (!p.hasOgImage)
    out.push({ type: 'no_og_image',     severity: 'low',  message: 'Missing og:image — no image when shared on social' })
  if (!p.hasTwitterCard)
    out.push({ type: 'no_twitter_card', severity: 'low',  message: 'Missing Twitter Card meta tags' })

  // Security
  if (p.mixedContent)
    out.push({ type: 'mixed_content',   severity: 'high', message: 'Mixed content — HTTP resources loaded on HTTPS page' })

  // URL hygiene
  if (p.urlLength > 100)
    out.push({ type: 'url_too_long',    severity: 'low',  message: `URL too long (${p.urlLength} chars — aim < 75)` })

  return out
}

// ── Sitemap fetcher ───────────────────────────────────────────
function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(m => m[1])
}
async function getSitemapUrls(siteUrl: string): Promise<string[]> {
  const base = siteUrl.replace(/\/$/, '')
  for (const path of ['/sitemap.xml', '/sitemap_index.xml', '/sitemap']) {
    try {
      const res = await fetch(base + path, { headers: { 'User-Agent': BOT_UA }, signal: AbortSignal.timeout(10_000) })
      if (!res.ok) continue
      const xml  = await res.text()
      const locs = extractLocs(xml)
      if (xml.includes('<sitemapindex')) {
        const subs = await Promise.all(
          locs.slice(0, 10).map(async sub => {
            try {
              const r = await fetch(sub, { headers: { 'User-Agent': BOT_UA }, signal: AbortSignal.timeout(8_000) })
              return r.ok ? extractLocs(await r.text()) : []
            } catch { return [] }
          })
        )
        return subs.flat().slice(0, MAX_PAGES)
      }
      if (locs.length > 0) return locs.slice(0, MAX_PAGES)
    } catch { /* try next path */ }
  }
  return []
}

// ── Robots.txt checker ────────────────────────────────────────
async function getRobotsDisallowed(siteUrl: string): Promise<string[]> {
  try {
    const res = await fetch(siteUrl.replace(/\/$/, '') + '/robots.txt', {
      headers: { 'User-Agent': BOT_UA }, signal: AbortSignal.timeout(5_000)
    })
    if (!res.ok) return []
    const text = await res.text()
    return [...text.matchAll(/^Disallow:\s*(.+)/gim)].map(m => m[1].trim())
  } catch { return [] }
}
function isDisallowed(path: string, disallowList: string[]): boolean {
  return disallowList.some(d => d && path.startsWith(d))
}

// ── Page crawler ──────────────────────────────────────────────
interface PageResult {
  url: string; statusCode: number
  title: string | null; titleLen: number
  metaDesc: string | null; metaLen: number
  h1: string | null; h1Count: number; h2Count: number
  canonical: string | null; isNoindex: boolean
  wordCount: number; imgTotal: number; imgNoAlt: number
  hasSchema: boolean; hasOgTitle: boolean; hasOgImage: boolean; hasTwitterCard: boolean
  responseTime: number; htmlSize: number
  redirectDetected: boolean; mixedContent: boolean
  internalLinks: string[]
  crawlDepth: number
  issues: Issue[]
  // set in post-processing
  inboundLinks?: number
}

async function crawlPage(url: string, depth: number, disallowed: string[]): Promise<PageResult> {
  try {
    const urlPath = new URL(url).pathname
    if (isDisallowed(urlPath, disallowed)) {
      return {
        url, statusCode: 0, title: null, titleLen: 0, metaDesc: null, metaLen: 0,
        h1: null, h1Count: 0, h2Count: 0, canonical: null, isNoindex: false,
        wordCount: 0, imgTotal: 0, imgNoAlt: 0, hasSchema: false, hasOgTitle: false,
        hasOgImage: false, hasTwitterCard: false, responseTime: 0, htmlSize: 0,
        redirectDetected: false, mixedContent: false, internalLinks: [], crawlDepth: depth,
        issues: [{ type: 'robots_disallowed', severity: 'low', message: 'Blocked by robots.txt' }],
      }
    }

    const t0  = Date.now()
    const res = await fetch(url, {
      headers: { 'User-Agent': BOT_UA, 'Accept': 'text/html' },
      redirect: 'follow',
      signal:   AbortSignal.timeout(8_000),
    })
    const responseTime    = Date.now() - t0
    const statusCode      = res.status
    const redirectDetected = res.redirected && res.url !== url

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) {
      return {
        url, statusCode, title: null, titleLen: 0, metaDesc: null, metaLen: 0,
        h1: null, h1Count: 0, h2Count: 0, canonical: null, isNoindex: false,
        wordCount: 0, imgTotal: 0, imgNoAlt: 0, hasSchema: false, hasOgTitle: false,
        hasOgImage: false, hasTwitterCard: false, responseTime, htmlSize: 0,
        redirectDetected, mixedContent: false, internalLinks: [], crawlDepth: depth,
        issues: [{ type: 'non_html', severity: 'low', message: `Non-HTML content type: ${contentType}` }],
      }
    }

    const html        = await res.text()
    const htmlSize    = new TextEncoder().encode(html).length
    const title       = getTitle(html)
    const metaDesc    = getMetaDesc(html)
    const canonical   = getCanonical(html)
    const h1s         = getH1s(html)
    const h2Count     = getH2Count(html)
    const noindex     = checkNoindex(html)
    const words       = countWords(html)
    const imgs        = imgStats(html)
    const hasSchema   = hasSchemaMarkup(html)
    const ogTitle     = hasOgTitle(html)
    const ogImage     = hasOgImage(html)
    const twitterCard = hasTwitterCard(html)
    const mixed       = hasMixedContent(html, url)
    const intLinks    = extractInternalLinks(html, url)
    const urlLen      = url.length

    const issues = detectIssues({
      statusCode, title, metaDesc, h1Count: h1s.length, h2Count,
      noindex, words, imgNoAlt: imgs.noAlt, canonical,
      hasSchema, hasOgTitle: ogTitle, hasOgImage: ogImage, hasTwitterCard: twitterCard,
      responseTime, htmlSize, urlLength: urlLen, redirectDetected, mixedContent: mixed,
    })

    return {
      url, statusCode, title, titleLen: title?.length ?? 0,
      metaDesc, metaLen: metaDesc?.length ?? 0,
      h1: h1s[0] ?? null, h1Count: h1s.length, h2Count,
      canonical, isNoindex: noindex, wordCount: words,
      imgTotal: imgs.total, imgNoAlt: imgs.noAlt,
      hasSchema, hasOgTitle: ogTitle, hasOgImage: ogImage, hasTwitterCard: twitterCard,
      responseTime, htmlSize, redirectDetected, mixedContent: mixed,
      internalLinks: intLinks, crawlDepth: depth, issues,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Request failed'
    return {
      url, statusCode: 0, title: null, titleLen: 0, metaDesc: null, metaLen: 0,
      h1: null, h1Count: 0, h2Count: 0, canonical: null, isNoindex: false,
      wordCount: 0, imgTotal: 0, imgNoAlt: 0, hasSchema: false, hasOgTitle: false,
      hasOgImage: false, hasTwitterCard: false, responseTime: 0, htmlSize: 0,
      redirectDetected: false, mixedContent: false, internalLinks: [], crawlDepth: depth,
      issues: [{ type: 'fetch_error', severity: 'high', message: `Could not fetch: ${msg}` }],
    }
  }
}

// ── Entry point ───────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { org_id, site_url } = await req.json()
    if (!org_id || !site_url) throw new Error('Missing org_id or site_url')

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Create crawl job
    const { data: job, error: jobErr } = await sb
      .from('jarvis_crawl_jobs')
      .insert({ org_id, site_url, status: 'running' })
      .select('id').single()
    if (jobErr) throw new Error(jobErr.message)
    const jobId = job.id

    // ── 1. Seed URLs: sitemap + homepage fallback ─────────────
    const sitemapUrls  = await getSitemapUrls(site_url)
    const disallowed   = await getRobotsDisallowed(site_url)
    const seedUrls     = sitemapUrls.length > 0 ? sitemapUrls : [site_url]

    const visited = new Set<string>()
    const queue: Array<{ url: string; depth: number }> = []

    for (const u of seedUrls) {
      const normalized = u.replace(/\/$/, '') || u
      if (!visited.has(normalized)) {
        visited.add(normalized)
        queue.push({ url: normalized, depth: 0 })
      }
    }

    await sb.from('jarvis_crawl_jobs').update({ total_pages: queue.length }).eq('id', jobId)

    // ── 2. BFS crawl ──────────────────────────────────────────
    const results: PageResult[] = []
    const inboundCount = new Map<string, number>()

    while (queue.length > 0 && results.length < MAX_PAGES) {
      const batchSize   = Math.min(BATCH_SIZE, MAX_PAGES - results.length)
      const batch       = queue.splice(0, batchSize)
      const batchResults = await Promise.allSettled(
        batch.map(({ url, depth }) => crawlPage(url, depth, disallowed))
      )

      for (let i = 0; i < batch.length; i++) {
        const r = batchResults[i]
        if (r.status !== 'fulfilled') continue
        const page = r.value
        results.push(page)

        // Track inbound links for orphan detection
        for (const link of page.internalLinks) {
          inboundCount.set(link, (inboundCount.get(link) ?? 0) + 1)
        }

        // Discover new pages via link following
        for (const link of page.internalLinks) {
          const norm = link.replace(/\/$/, '') || link
          if (!visited.has(norm) && results.length + queue.length < MAX_PAGES) {
            visited.add(norm)
            queue.push({ url: norm, depth: batch[i].depth + 1 })
          }
        }
      }

      // Update job progress
      await sb.from('jarvis_crawl_jobs')
        .update({ total_pages: results.length })
        .eq('id', jobId)
    }

    // ── 3. Post-processing ────────────────────────────────────
    const titlesSeen   = new Map<string, string>()
    const metasSeen    = new Map<string, string>()

    for (const page of results) {
      // Duplicate title detection
      if (page.title) {
        const key = page.title.toLowerCase().trim()
        if (titlesSeen.has(key)) {
          page.issues.push({
            type: 'duplicate_title', severity: 'med',
            message: `Duplicate title — same as ${titlesSeen.get(key)}`,
          })
        } else {
          titlesSeen.set(key, page.url)
        }
      }

      // Duplicate meta description detection
      if (page.metaDesc) {
        const key = page.metaDesc.toLowerCase().trim()
        if (metasSeen.has(key)) {
          page.issues.push({
            type: 'duplicate_meta', severity: 'med',
            message: `Duplicate meta description — same as ${metasSeen.get(key)}`,
          })
        } else {
          metasSeen.set(key, page.url)
        }
      }

      // Orphan page detection (not linked from any crawled page, and not a seed)
      const inbound = inboundCount.get(page.url) ?? inboundCount.get(page.url + '/') ?? 0
      page.inboundLinks = inbound
      if (inbound === 0 && page.crawlDepth > 0) {
        page.issues.push({
          type: 'orphan_page', severity: 'med',
          message: 'Orphan page — no internal links pointing here from other crawled pages',
        })
      }
    }

    // ── 4. Persist page results ───────────────────────────────
    const rows = results.map(r => ({
      job_id: jobId, org_id,
      url: r.url, status_code: r.statusCode,
      title: r.title, title_len: r.titleLen,
      meta_desc: r.metaDesc, meta_len: r.metaLen,
      h1: r.h1, h1_count: r.h1Count,
      canonical: r.canonical, is_noindex: r.isNoindex,
      word_count: r.wordCount, img_total: r.imgTotal, img_no_alt: r.imgNoAlt,
      issues: r.issues,
      // new columns
      response_time:    r.responseTime,
      html_size:        r.htmlSize,
      crawl_depth:      r.crawlDepth,
      inbound_links:    r.inboundLinks ?? 0,
      has_schema:       r.hasSchema,
      has_og_tags:      r.hasOgTitle && r.hasOgImage,
      redirect_detected: r.redirectDetected,
      h2_count:         r.h2Count,
    }))

    for (let i = 0; i < rows.length; i += 50) {
      await sb.from('jarvis_crawl_pages').insert(rows.slice(i, i + 50))
    }

    // ── 5. Complete the job ───────────────────────────────────
    const allIssues = results.flatMap(r => r.issues)
    const summary = {
      high: allIssues.filter(i => i.severity === 'high').length,
      med:  allIssues.filter(i => i.severity === 'med').length,
      low:  allIssues.filter(i => i.severity === 'low').length,
    }

    await sb.from('jarvis_crawl_jobs').update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      total_pages: results.length,
      issues: allIssues.length,
    }).eq('id', jobId)

    return new Response(
      JSON.stringify({ success: true, jobId, totalPages: results.length, totalIssues: allIssues.length, summary }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[site-crawl]', msg)
    return new Response(JSON.stringify({ error: msg }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
