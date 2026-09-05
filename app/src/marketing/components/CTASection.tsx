import { ArrowRight } from 'lucide-react'
import { MButton } from './MButton'

export function CTASection({ showPricingLink = true }: { showPricingLink?: boolean }) {
  return (
    <section className="max-w-[1340px] mx-auto px-5 sm:px-8 pb-24">
      <div className="rounded-[20px] bg-[linear-gradient(135deg,#d7eef4_0%,#dfe4fa_100%)] px-8 py-20 text-center">
        <h2 className="font-hero font-semibold text-[#0d1b2e] text-[38px] sm:text-[58px] leading-[1.0] tracking-[-0.04em] max-w-[16ch] mx-auto">
          Start ranking this month.
        </h2>
        <p className="text-[16px] text-[#33475f] mt-5 max-w-[44ch] mx-auto">
          Full access to all 60+ tools for 14 days. No credit card required.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-9">
          <a href="/app"><MButton variant="solid" size="lg">Start free trial <ArrowRight size={16} /></MButton></a>
          {showPricingLink && (
            <a href="/pricing"><MButton variant="outline" size="lg">See pricing</MButton></a>
          )}
        </div>
      </div>
    </section>
  )
}
