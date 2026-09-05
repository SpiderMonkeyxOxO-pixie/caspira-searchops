import { useMarketingTheme } from '../hooks/useMarketingTheme'
import { useHashScroll } from '../hooks/useHashScroll'
import { useSeo, organizationSchema } from '../hooks/useSeo'
import { SITE, routes } from '../config'
import { Navbar } from '../components/Navbar'
import { Hero } from '../components/Hero'
import { FeatureBlocks } from '../components/FeatureBlocks'
import { FeatureCarousel } from '../components/FeatureCarousel'
import { HowItWorks } from '../components/HowItWorks'
import { ToolsIndex } from '../components/ToolsIndex'
import { SavingsBlock } from '../components/SavingsBlock'
import { CTASection } from '../components/CTASection'
import { Footer } from '../components/Footer'

const softwareSchema: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE.name,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: SITE.origin,
  description:
    'Keyword research, rank tracking, technical audits, AI content and client reporting in one platform — running on your own API keys and your own database.',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '15',
    highPrice: '49',
    offerCount: '3',
  },
  publisher: { '@type': 'Organization', name: SITE.parent.name, url: SITE.parent.origin },
}

export function MarketingHome() {
  useMarketingTheme()
  useHashScroll()
  useSeo({
    title: 'Caspira SearchOps — the whole SEO stack in one platform',
    description:
      '60+ SEO tools in one platform — keyword research, rank tracking, technical audits and AI content. Runs on your own API keys and database. 14-day free trial.',
    path: routes.home,
    jsonLd: [organizationSchema, softwareSchema],
  })

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <FeatureBlocks />
      <FeatureCarousel />
      <HowItWorks />
      <ToolsIndex />
      <SavingsBlock />
      <CTASection />
      <Footer />
    </div>
  )
}
