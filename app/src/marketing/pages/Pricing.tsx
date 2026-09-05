import { useMarketingTheme } from '../hooks/useMarketingTheme'
import { useSeo, organizationSchema } from '../hooks/useSeo'
import { pricingTiers } from '../data/pricing'
import { SITE, routes } from '../config'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { PricingTable } from '../components/PricingTable'
import { FAQ } from '../components/FAQ'
import { CTASection } from '../components/CTASection'
import { pricingFaq } from '../data/pricing'

/** Mirrors the FAQ actually rendered on this page — required for FAQ rich results. */
const faqSchema: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: pricingFaq.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

const productSchema: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: SITE.name,
  description: 'Search intelligence platform with 60+ SEO tools, running on your own database and API keys.',
  brand: { '@type': 'Brand', name: SITE.parent.name },
  offers: pricingTiers.map(t => ({
    '@type': 'Offer',
    name: t.name,
    price: t.price.replace('$', ''),
    priceCurrency: 'USD',
    url: SITE.origin + routes.pricing,
    availability: 'https://schema.org/InStock',
  })),
}

export function MarketingPricing() {
  useMarketingTheme()
  useSeo({
    title: 'Pricing',
    description:
      'Plans from $15/month. All 60+ SEO tools on every tier, with a 14-day free trial. Runs on your own database and API keys — we never mark up data.',
    path: routes.pricing,
    jsonLd: [organizationSchema, productSchema, faqSchema],
  })

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="relative overflow-hidden isolate">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#e2f5fb_0%,#ffffff_100%)]" />
        <div className="max-w-[1340px] mx-auto px-5 sm:px-8 pt-20 pb-14 text-center">
          <span className="text-[11px] font-mono-jarvis uppercase tracking-[2.5px] text-[#6b84a0]">Pricing</span>
          <h1 className="font-hero font-semibold text-[#0d1b2e] mt-5 mx-auto max-w-[16ch]
                         text-[42px] sm:text-[64px] leading-[0.98] tracking-[-0.04em]">
            Every tool, every plan.
          </h1>
          <p className="text-[17px] text-[#33475f] mt-6 max-w-[46ch] mx-auto leading-[1.5]">
            All 60+ tools are included on every tier. Pick by team size and how many sites you run.
          </p>
        </div>
      </section>

      <section className="max-w-[1340px] mx-auto px-5 sm:px-8 pb-24">
        <PricingTable />
        <p className="text-[13.5px] text-[#6b84a0] text-center mt-8 max-w-[62ch] mx-auto leading-relaxed">
          Every plan runs on your own database and your own provider keys — DataForSEO, Serper, Claude or OpenRouter, Search Console and GA4. You pay those providers directly at their rates; we never mark up data.
        </p>
      </section>

      <section className="max-w-[1340px] mx-auto px-5 sm:px-8 pb-24">
        <h2 className="font-hero font-semibold text-[#0d1b2e] text-[32px] sm:text-[46px] leading-[1.0] tracking-[-0.04em] text-center mb-12">
          Questions, answered.
        </h2>
        <FAQ items={pricingFaq} />
      </section>

      <CTASection showPricingLink={false} />
      <Footer />
    </div>
  )
}
