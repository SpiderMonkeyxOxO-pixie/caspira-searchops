import { Link } from 'react-router-dom'
import { useMarketingTheme } from '../hooks/useMarketingTheme'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { MButton } from '../components/MButton'
import { useSeo } from '../hooks/useSeo'
import { routes } from '../config'

const suggestions = [
  { label: 'Product overview', to: routes.home },
  { label: 'Pricing', to: routes.pricing },
  { label: 'About', to: routes.about },
  { label: 'Contact', to: routes.contact },
]

export function MarketingNotFound() {
  useMarketingTheme()
  useSeo({
    title: 'Page not found',
    description: 'That page does not exist.',
    path: '/404',
    noindex: true,
  })

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-[1340px] w-full mx-auto px-5 sm:px-8 py-28">
        <span className="text-[11px] font-mono-jarvis uppercase tracking-[2.5px] text-[#6b84a0]">Error 404</span>
        <h1 className="font-hero font-semibold text-[#0d1b2e] mt-5 max-w-[16ch]
                       text-[44px] sm:text-[68px] leading-[0.98] tracking-[-0.04em]">
          That page isn't here.
        </h1>
        <p className="text-[17px] text-[#33475f] mt-6 max-w-[48ch] leading-[1.55]">
          The link may be broken or the page may have moved. Here's where most people are headed:
        </p>

        <div className="flex flex-wrap gap-2.5 mt-9">
          {suggestions.map(s => (
            <Link key={s.to} to={s.to}>
              <MButton variant="outline" size="lg">{s.label}</MButton>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
