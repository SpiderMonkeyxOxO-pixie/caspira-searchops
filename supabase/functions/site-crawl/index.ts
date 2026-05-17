// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_PAGES  = 100
const BATCH_SIZE = 10
const BOT_UA     = 'Jarvis-SEO-Crawler/1.0'

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
    .map(m => m[1].replace(/<[^>]+>/g, '').trim())
    .filter(Boolean)
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

// ── Issue detection ───────────────────────────────────────────
interface Issue { type: string; severity: 'high' | 'med' | 'low'; message: string }

function detectIssues(p: {
  statusCode: number; title: string | null; metaDesc: string | null
  h1Count: number; noindex: boolean; words: number; imgNoAlt: number; canonical: string | null
}): Issue[] {
  const out: Issue[] = []
  if (p.statusCode >= 400)
    out.push({ type: 'error_page',    severity: 'high', message: `HTTP ${p.statusCode} error` })
  if (!p.title)
    out.push({ type: 'missing_title', severity: 'high', message: 'Missing title tag' })
  else if (p.title.length < 30)
    out.push({ type: 'title_short',   severity: 'med',  message: `Title too short (${p.title.length} chars)` })
  else if (p.title.length > 60)
    out.push({ type: 'title_long',    severity: 'med',  message: `Title too long (${p.title.length} chars)` })
  if (!p.metaDesc)
    out.push({ type: 'missing_meta',  severity: 'med',  message: 'Missing meta description' })
  else if (p.metaDesc.length < 70)
    out.push({ type: 'meta_short',    severity: 'low',  message: `Meta description too short (${p.metaDesc.length} chars)` })
  else if (p.metaDesc.length > 160)
    out.push({ type: 'meta_long',     severity: 'med',  message: `Meta description too long (${p.metaDesc.length} chars)` })
  if (p.h1Count === 0)
    out.push({ type: 'missing_h1',   severity: 'high', message: 'No H1 tag found' })
  if (p.h1Count > 1)
    out.push({ type: 'multiple_h1',  severity: 'med',  message: `${p.h1Count} H1 tags (should be exactly 1)` })
  if (p.noindex)
    out.push({ type: 'noindex',      severity: 'high', message: 'Page is noindexed — not visible to Google' })
  if (p.words > 0 && p.words < 300)
    out.push({ type: 'thin_content', severity: 'med',  message: `Thin content (${p.words} words, aim for 300+)` })
  if (!p.canonical)
    out.push({ type: 'no_canonical', severity: 'low',  message: 'No canonical tag' })
  if (p.imgNoAlt > 0)
    out.push({ type: 'img_no_alt',   severity: 'low',  message: `${p.imgNoAlt} image(s) missing alt text` })
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
      const res = await fetch(base + path, {
        headers: { 'User-Agent': BOT_UA },
        signal:  AbortSignal.timeout(10_000),
      })
      if (!res.ok) continue
      const xml  = await res.text()
      const locs = extractLocs(xml)

      if (xml.includes('<sitemapindex')) {
        // Sitemap index — fetch all sub-sitemaps in parallel
        const subResults = await Promise.all(
          locs.slice(0, 10).map(async sub => {
            try {
              const r = await fetch(sub, { headers: { 'User-Agent': BOT_UA }, signal: AbortSignal.timeout(8_000) })
              return r.ok ? extractLocs(await r.text()) : []
            } catch { return [] }
          })
        )
        return subResults.flat().slice(0, MAX_PAGES)
      }
      if (locs.length > 0) return locs.slice(0, MAX_PAGES)
    } catch { /* try next */ }
  }
  return []
}

// ── Page crawler ──────────────────────────────────────────────
interface PageResult {
  url: string; statusCode: number
  title: string | null;  titleLen: number
  metaDesc: string | null; metaLen: number
  h1: string | null; h1Count: number
  canonical: string | null; isNoindex: boolean
  wordCount: number; imgTotal: number; imgNoAlt: number
  issues: Issue[]
}

async function crawlPage(url: string): Promise<PageResult> {
  try {
    const res  = await fetch(url, {
      headers:  { 'User-Agent': BOT_UA, 'Accept': 'text/html' },
      redirect: 'follow',
      signal:   AbortSignal.timeout(8_000),
    })
    const statusCode = res.status
    const html       = await res.text()
    const title      = getTitle(html)
    const metaDesc   = getMetaDesc(html)
    const canonical  = getCanonical(html)
    const h1s        = getH1s(html)
    const noindex    = checkNoindex(html)
    const words      = countWords(html)
    const imgs       = imgStats(html)
    const issues     = detectIssues({
      statusCode, title, metaDesc, h1Count: h1s.length,
      noindex, words, imgNoAlt: imgs.noAlt, canonical,
    })
    return {
      url, statusCode,
      title,   titleLen: title?.length ?? 0,
      metaDesc, metaLen: metaDesc?.length ?? 0,
      h1: h1s[0] ?? null, h1Count: h1s.length,
      canonical, isNoindex: noindex,
      wordCount: words, imgTotal: imgs.total, imgNoAlt: imgs.noAlt,
      issues,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Request failed'
    return {
      url, statusCode: 0,
      title: null, titleLen: 0, metaDesc: null, metaLen: 0,
      h1: null, h1Count: 0, canonical: null, isNoindex: false,
      wordCount: 0, imgTotal: 0, imgNoAlt: 0,
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Create crawl job
    const { data: job, error: jobErr } = await supabase
      .from('jarvis_crawl_jobs')
      .insert({ org_id, site_url, status: 'running' })
      .select('id').single()
    if (jobErr) throw new Error(jobErr.message)
    const jobId = job.id

    // Fetch URLs from sitemap
    const urls = await getSitemapUrls(site_url)
    if (urls.length === 0) {
      await supabase.from('jarvis_crawl_jobs').update({
        status: 'failed', finished_at: new Date().toISOString(),
        error: 'No sitemap found at /sitemap.xml or /sitemap_index.xml',
      }).eq('id', jobId)
      return new Response(JSON.stringify({ error: 'No sitemap found' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    await supabase.from('jarvis_crawl_jobs').update({ total_pages: urls.length }).eq('id', jobId)

    // Crawl pages in batches
    const results: PageResult[] = []
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = await Promise.all(urls.slice(i, i + BATCH_SIZE).map(crawlPage))
      results.push(...batch)
    }

    // Persist page results (chunked to avoid payload limits)
    const rows = results.map(r => ({
      job_id: jobId, org_id,
      url: r.url, status_code: r.statusCode,
      title: r.title, title_len: r.titleLen,
      meta_desc: r.metaDesc, meta_len: r.metaLen,
      h1: r.h1, h1_count: r.h1Count,
      canonical: r.canonical, is_noindex: r.isNoindex,
      word_count: r.wordCount, img_total: r.imgTotal, img_no_alt: r.imgNoAlt,
      issues: r.issues,
    }))
    for (let i = 0; i < rows.length; i += 50) {
      await supabase.from('jarvis_crawl_pages').insert(rows.slice(i, i + 50))
    }

    // Complete the job
    const allIssues = results.flatMap(r => r.issues)
    const summary   = {
      high: allIssues.filter(i => i.severity === 'high').length,
      med:  allIssues.filter(i => i.severity === 'med').length,
      low:  allIssues.filter(i => i.severity === 'low').length,
    }
    await supabase.from('jarvis_crawl_jobs').update({
      status: 'completed', finished_at: new Date().toISOString(),
      total_pages: results.length, issues: allIssues.length,
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
