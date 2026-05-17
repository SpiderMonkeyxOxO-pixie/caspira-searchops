// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SOURCES = [
  { name: 'Google Search Central', url: 'https://developers.google.com/search/blog/rss.xml',        category: 'google',   color: '#4285f4' },
  { name: 'Search Engine Land',    url: 'https://searchengineland.com/feed',                          category: 'industry', color: '#ff6b2c' },
  { name: 'SE Journal',            url: 'https://www.searchenginejournal.com/feed/',                  category: 'industry', color: '#e94235' },
  { name: 'SE Roundtable',         url: 'https://www.seroundtable.com/rss.xml',                      category: 'industry', color: '#1a73e8' },
  { name: 'Moz Blog',              url: 'https://moz.com/blog/feed',                                  category: 'tools',    color: '#00a4bd' },
  { name: 'Ahrefs Blog',           url: 'https://ahrefs.com/blog/feed/',                              category: 'tools',    color: '#f96854' },
  { name: 'SEMrush Blog',          url: 'https://www.semrush.com/blog/feed/',                         category: 'tools',    color: '#ff642d' },
]

interface NewsItem {
  id:          string
  title:       string
  description: string
  link:        string
  pubDate:     string
  pubTs:       number
  source:      string
  category:    string
  color:       string
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m  = xml.match(re)
  if (!m) return ''
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim()
}

function extractLink(itemXml: string): string {
  // Prefer plain <link>…</link> content
  const plain = itemXml.match(/<link>([\s\S]*?)<\/link>/i)
  if (plain) {
    const v = plain[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
    if (v.startsWith('http')) return v
  }
  // Atom-style <link href="…" />
  const attr = itemXml.match(/<link[^>]+href="([^"]+)"/)
  if (attr) return attr[1]
  // Fall back to guid
  return extractTag(itemXml, 'guid')
}

function detectCategory(title: string, desc: string): string {
  const text = (title + ' ' + desc).toLowerCase()
  if (/algorithm|core update|ranking|penalty|spam|helpful content/.test(text)) return 'Algorithm'
  if (/technical|crawl|index|robots|sitemap|javascript|core web vitals|cwv|lcp|cls|fid/.test(text)) return 'Technical'
  if (/content|e-e-a-t|eeat|ymyl|writing|copywriting|blog/.test(text)) return 'Content'
  if (/local seo|google business|gmb|gbp|maps/.test(text)) return 'Local SEO'
  if (/link build|backlink|authority|domain rating/.test(text)) return 'Link Building'
  if (/ai overview|sgе|sge|ai search|gemini|chatgpt|bingchat/.test(text)) return 'AI Search'
  return 'General'
}

function parseSource(xml: string, source: typeof SOURCES[0]): NewsItem[] {
  const items: NewsItem[] = []
  const itemRe = /<item>([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemRe.exec(xml)) !== null && items.length < 8) {
    const raw   = match[1]
    const title = extractTag(raw, 'title')
    if (!title) continue
    const link  = extractLink(raw)
    if (!link)  continue
    const desc    = extractTag(raw, 'description').slice(0, 280)
    const pubDate = extractTag(raw, 'pubDate')
    const pubTs   = pubDate ? new Date(pubDate).getTime() : Date.now()
    items.push({
      id:          link,
      title,
      description: desc,
      link,
      pubDate,
      pubTs:       isNaN(pubTs) ? Date.now() : pubTs,
      source:      source.name,
      category:    detectCategory(title, desc),
      color:       source.color,
    })
  }
  return items
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const results = await Promise.allSettled(
      SOURCES.map(async (src) => {
        const res = await fetch(src.url, {
          headers: { 'User-Agent': 'Jarvis-SEO-Bot/1.0' },
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const xml = await res.text()
        return parseSource(xml, src)
      })
    )

    const all: NewsItem[] = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') all.push(...r.value)
      else console.warn(`[news-proxy] ${SOURCES[i].name} failed:`, r.reason)
    })

    // Sort newest first
    all.sort((a, b) => b.pubTs - a.pubTs)

    return new Response(JSON.stringify({ items: all, fetchedAt: Date.now() }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), items: [] }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
