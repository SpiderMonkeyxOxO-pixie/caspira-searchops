import { useEffect } from 'react'
import { SITE } from '../config'

interface SeoOptions {
  title: string
  description: string
  /** Route path, e.g. '/pricing'. Used for the canonical + og:url. */
  path: string
  /** Keep low-value pages out of the index without blocking crawl. */
  noindex?: boolean
  /** JSON-LD objects to attach to this page. */
  jsonLd?: Record<string, unknown>[]
}

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.setAttribute('data-seo', 'managed')
  return el
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
  el.setAttribute('data-seo', 'managed')
}

/**
 * Client-side head management for the marketing routes.
 *
 * NOTE: this runs in the browser, so Googlebot (which renders JS) will see it,
 * but link-preview scrapers that do NOT run JS — Slack, LinkedIn, Facebook,
 * X — will only ever see the static tags in index.html. Pre-rendering these
 * routes at build time is the fix; see docs in index.html.
 */
export function useSeo({ title, description, path, noindex, jsonLd }: SeoOptions) {
  useEffect(() => {
    const url = SITE.origin + path
    const fullTitle = path === '/' ? title : `${title} | ${SITE.name}`

    document.title = fullTitle
    upsertMeta('meta[name="description"]', { name: 'description', content: description })
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large',
    })
    upsertLink('canonical', url)

    upsertMeta('meta[property="og:title"]',       { property: 'og:title', content: fullTitle })
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description })
    upsertMeta('meta[property="og:type"]',        { property: 'og:type', content: 'website' })
    upsertMeta('meta[property="og:url"]',         { property: 'og:url', content: url })
    upsertMeta('meta[property="og:site_name"]',   { property: 'og:site_name', content: SITE.name })
    upsertMeta('meta[name="twitter:card"]',        { name: 'twitter:card', content: 'summary_large_image' })
    upsertMeta('meta[name="twitter:title"]',       { name: 'twitter:title', content: fullTitle })
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description })

    const scripts: HTMLScriptElement[] = (jsonLd ?? []).map(obj => {
      const s = document.createElement('script')
      s.type = 'application/ld+json'
      s.setAttribute('data-seo', 'jsonld')
      s.textContent = JSON.stringify(obj)
      document.head.appendChild(s)
      return s
    })

    return () => { scripts.forEach(s => s.remove()) }
  }, [title, description, path, noindex, jsonLd])
}

/** Organization schema tying this product back to the parent company. */
export const organizationSchema: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE.name,
  legalName: SITE.legal.entity,
  taxID: SITE.legal.taxNumber,
  url: SITE.origin,
  areaServed: SITE.legal.serviceRegions.split(', '),
  parentOrganization: {
    '@type': 'Organization',
    name: SITE.parent.name,
    url: SITE.parent.origin,
  },
  address: {
    '@type': 'PostalAddress',
    streetAddress: SITE.legal.postal.street,
    addressLocality: SITE.legal.postal.locality,
    postalCode: SITE.legal.postal.postalCode,
    addressCountry: SITE.legal.postal.country,
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: SITE.contact.support,
  },
}
