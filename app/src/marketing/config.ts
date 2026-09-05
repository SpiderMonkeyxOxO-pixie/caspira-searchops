/**
 * Single source of truth for the public marketing site.
 * Anything a lawyer or the business owner must confirm is marked TODO(business).
 */
export const SITE = {
  name: 'Caspira SearchOps',
  /** Where this marketing site + app are served from. */
  origin: 'https://searchops.caspirasolutions.com',
  /** Parent company site — every public page links back to it. */
  parent: {
    name: 'Caspira Solutions',
    origin: 'https://caspirasolutions.com',
  },
  contact: {
    // Single monitored inbox for now — split into separate support/privacy
    // addresses here if that ever changes; the pages read from this object.
    general: 'caspirasolutioncontact@gmail.com',
    support: 'caspirasolutioncontact@gmail.com',
    privacy: 'caspirasolutioncontact@gmail.com',
  },
  legal: {
    entity: 'Caspira Solutions LLC',
    address: 'Vagharshyan Street 12/12, Arabkir District, Yerevan 0012, Armenia',
    // Inferred from the registered address. TODO(business): have counsel confirm
    // this is the governing law you actually want in the Terms.
    jurisdiction: 'Armenia',
    registrationNumber: '999.110.1554400',
    taxNumber: '02939828',
    serviceRegions: 'Europe, Middle East, Asia-Pacific',
    postal: {
      street: 'Vagharshyan Street 12/12',
      locality: 'Arabkir District, Yerevan',
      postalCode: '0012',
      country: 'AM',
    },
  },
  /** Last substantive revision of the legal pages. */
  legalUpdated: '2026-09-04',
} as const

export const routes = {
  home: '/',
  pricing: '/pricing',
  about: '/about',
  contact: '/contact',
  privacy: '/privacy',
  terms: '/terms',
  disclaimer: '/disclaimer',
} as const

/** Public pages that belong in sitemap.xml, with their relative crawl priority. */
export const publicRoutes: { path: string; priority: string; changefreq: string }[] = [
  { path: routes.home,       priority: '1.0', changefreq: 'weekly' },
  { path: routes.pricing,    priority: '0.9', changefreq: 'weekly' },
  { path: routes.about,      priority: '0.6', changefreq: 'monthly' },
  { path: routes.contact,    priority: '0.6', changefreq: 'monthly' },
  { path: routes.terms,      priority: '0.3', changefreq: 'yearly' },
  { path: routes.privacy,    priority: '0.3', changefreq: 'yearly' },
  { path: routes.disclaimer, priority: '0.3', changefreq: 'yearly' },
]
