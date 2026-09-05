import { MButton } from './MButton'
import { RankTrackerMock, SiteAuditMock } from './mocks'

export function FeatureBlocks() {
  return (
    <section id="product" className="max-w-[1340px] mx-auto px-5 sm:px-8 pb-6 scroll-mt-24">
      <div className="grid lg:grid-cols-[1.15fr_1fr] gap-5">
        {/* Screenshots sit in their own row and bleed off the BOTTOM only —
            never absolutely positioned, so they can't overlap the copy. */}
        <div className="overflow-hidden rounded-[20px] bg-[#c9b6f7] flex flex-col">
          <div className="px-8 sm:px-11 pt-11">
            <h2 className="font-hero font-semibold text-[#160b2e] text-[34px] sm:text-[44px] leading-[1.02] tracking-[-0.035em] max-w-[15ch]">
              See every ranking move before your client does.
            </h2>
            <p className="text-[15px] text-[#160b2e]/75 mt-5 max-w-[44ch] leading-relaxed">
              Daily rank tracking, Search Console and GA4 in one view — with the pages losing traffic surfaced automatically.
            </p>
            <a href="/app" className="inline-block mt-7">
              <MButton variant="white" size="lg">Try it free</MButton>
            </a>
          </div>
          <div className="px-8 sm:px-11 pt-10 -mb-24 sm:-mb-28 h-[380px]">
            <RankTrackerMock />
          </div>
        </div>

        <div className="overflow-hidden rounded-[20px] bg-[#d7eef4] flex flex-col">
          <div className="px-8 sm:px-11 pt-11">
            <h2 className="font-hero font-semibold text-[#062230] text-[34px] sm:text-[44px] leading-[1.02] tracking-[-0.035em] max-w-[13ch]">
              Audit it. Fix it. Ship it.
            </h2>
            <p className="text-[15px] text-[#062230]/75 mt-5 max-w-[40ch] leading-relaxed">
              Crawl the site, score every page, and hand your team the exact fixes — titles, canonicals, Core Web Vitals, redirects.
            </p>
            <a href="/app" className="inline-block mt-7">
              <MButton variant="solid" size="lg">See the audit</MButton>
            </a>
          </div>
          <div className="px-8 sm:px-11 pt-10 -mb-24 sm:-mb-28 h-[380px]">
            <SiteAuditMock />
          </div>
        </div>
      </div>
    </section>
  )
}
