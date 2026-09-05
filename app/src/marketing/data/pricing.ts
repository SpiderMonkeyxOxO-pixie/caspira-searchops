export interface PricingTier {
  name: string
  price: string
  period: string
  tagline: string
  cta: string
  ctaVariant: 'primary' | 'ghost'
  highlighted: boolean
  badge?: string
  features: string[]
}

export const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    price: '$15',
    period: '/ month',
    tagline: 'For freelancers and solo SEOs.',
    cta: 'Start free trial',
    ctaVariant: 'ghost',
    highlighted: false,
    features: [
      'Up to 3 tracked sites',
      '1 user',
      'All 60+ SEO tools included',
      'Connect your own database and API keys',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    price: '$25',
    period: '/ month',
    tagline: 'For growing in-house teams.',
    cta: 'Start free trial',
    ctaVariant: 'primary',
    highlighted: true,
    badge: 'Most Popular',
    features: [
      'Up to 15 tracked sites',
      'Up to 5 team seats with role permissions',
      'Report Scheduler & Case Study Builder',
      'Priority email support, 1 business day response',
      'All Starter features included',
    ],
  },
  {
    name: 'Agency',
    price: '$49',
    period: '/ month',
    tagline: 'For agencies managing many client domains.',
    cta: 'Start free trial',
    ctaVariant: 'ghost',
    highlighted: false,
    features: [
      'Unlimited tracked sites',
      'Unlimited team seats & role permissions',
      'White-label client share links',
      'Priority support, same-day response',
      'All Pro features included',
    ],
  },
]

export const pricingFaq: { q: string; a: string }[] = [
  {
    q: 'Do I need my own API keys?',
    a: 'Yes. Caspira connects to the data providers you choose — DataForSEO, Serper, Claude or OpenRouter, Google Search Console and GA4 — using your own keys. You pay those providers directly at their rates, with no markup from us, and you can switch or cancel any of them without leaving Caspira.',
  },
  {
    q: 'Where is my data stored?',
    a: 'In your own database. You point Caspira at your own Supabase project, so every keyword, audit, report and client record lives in infrastructure you control. We never hold a copy of your SEO data.',
  },
  {
    q: 'So what am I paying Caspira for?',
    a: 'The platform itself — 60+ integrated tools, the team workspace with role permissions, client reporting and share links, and continuous updates. You supply the data sources and the storage; we supply the system that ties all of it together in one place.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes — every plan starts with a 14-day free trial, no credit card required. You will need your own database and at least one data provider key to see live data during the trial.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes, upgrade or downgrade at any time from your workspace billing settings — changes are prorated automatically.',
  },
  {
    q: 'What happens if I cancel?',
    a: 'You lose access to the Caspira interface, but not your data — it stays in your own database, under your control, exactly where it already was.',
  },
]
