import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { MButton } from './MButton'
import { HeroBackground } from './HeroBackground'

export function Hero() {
  const [domain, setDomain] = useState('')

  function analyze(e: React.FormEvent) {
    e.preventDefault()
    const q = domain.trim()
    window.location.href = q ? `/app?domain=${encodeURIComponent(q)}` : '/app'
  }

  return (
    // `isolate` makes this a stacking context so the -z-10 backdrop layers paint
    // inside the hero instead of behind the page's white wrapper.
    <section className="relative overflow-hidden isolate">
      <HeroBackground />

      <div className="max-w-[1340px] mx-auto px-5 sm:px-8 pt-24 sm:pt-32 pb-20 sm:pb-24 text-center">
        <h1 className="font-hero font-semibold text-[#0d1b2e] mx-auto max-w-[15ch]
                       text-[46px] sm:text-[64px] lg:text-[84px]
                       leading-[0.98] tracking-[-0.04em]">
          Own every result that matters
        </h1>

        <p className="text-[17px] sm:text-[19px] text-[#33475f] mt-6 max-w-[46ch] mx-auto leading-[1.5]">
          Keyword research, rank tracking, technical audits and AI content — the whole SEO stack in one platform, running on your own API keys and your own database.
        </p>

        <form onSubmit={analyze} className="mt-9 mx-auto w-full max-w-[600px]">
          <div className="flex items-center gap-2 bg-white rounded-full p-2 pl-6 border border-[#dbe4ee]
                          shadow-[0_18px_50px_-24px_rgba(13,27,46,0.5)]">
            <input
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="Enter your domain"
              aria-label="Enter your domain"
              className="flex-1 min-w-0 bg-transparent outline-none text-[15px] text-[#0d1b2e] placeholder:text-[#8ba3bd]"
            />
            <MButton type="submit" variant="accent" size="lg" className="shrink-0">
              Analyze free <ArrowRight size={16} />
            </MButton>
          </div>
        </form>

        <p className="text-[13px] text-[#6b84a0] mt-4">
          14-day free trial · No credit card required
        </p>
      </div>
    </section>
  )
}
