import { MButton } from './MButton'
import { pricingTiers } from '../data/pricing'

// Always quote the featured plan's real price — never a second hardcoded copy of it.
const featured = pricingTiers.find(t => t.highlighted) ?? pricingTiers[0]

const stack = [
  { name: 'Keyword research tool', price: 129 },
  { name: 'Rank tracker', price: 99 },
  { name: 'Technical audit crawler', price: 149 },
  { name: 'AI writing assistant', price: 49 },
  { name: 'Reporting dashboard', price: 79 },
]

const total = stack.reduce((s, i) => s + i.price, 0)

export function SavingsBlock() {
  return (
    <section className="max-w-[1340px] mx-auto px-5 sm:px-8 pb-24">
      <div className="rounded-[20px] bg-[#0d1b2e] px-8 sm:px-14 py-14 sm:py-16 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="font-hero font-semibold text-white text-[36px] sm:text-[52px] leading-[1.0] tracking-[-0.04em] max-w-[14ch]">
            Five subscriptions. Or one.
          </h2>
          <p className="text-[16px] text-white/65 mt-5 max-w-[42ch] leading-relaxed">
            Most teams stitch together a keyword tool, a rank tracker, a crawler, a writer and a reporting layer — five retail markups on the same underlying data. Caspira replaces the five with one platform, running on your own API keys at cost.
          </p>
          <a href="/pricing" className="inline-block mt-8">
            <MButton variant="accent" size="lg">Compare plans</MButton>
          </a>
        </div>

        <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-7">
          {stack.map(s => (
            <div key={s.name} className="flex items-center justify-between py-2.5 text-[14px]">
              <span className="text-white/55">{s.name}</span>
              <span className="text-white/40 line-through font-mono-jarvis">${s.price}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-white/15 text-[15px]">
            <span className="text-white/70">Typical stack</span>
            <span className="text-white font-mono-jarvis font-semibold">${total}/mo</span>
          </div>
          <div className="flex items-center justify-between pt-4 mt-3 border-t border-white/15">
            <span className="text-white font-semibold text-[15px]">Caspira SearchOps</span>
            <span className="font-hero font-extrabold text-[#00d4ff] text-[30px] tracking-[-0.03em] leading-none">{featured.price}</span>
          </div>
          <p className="text-[12px] text-white/40 mt-4 leading-relaxed">
            Plus your own provider usage, billed directly by them at their rates. We never mark up data.
          </p>
        </div>
      </div>
    </section>
  )
}
