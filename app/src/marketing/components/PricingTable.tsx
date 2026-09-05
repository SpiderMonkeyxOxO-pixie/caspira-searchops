import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MButton } from './MButton'
import { pricingTiers } from '../data/pricing'

export function PricingTable() {
  return (
    <div className="grid md:grid-cols-3 gap-5 items-stretch">
      {pricingTiers.map(tier => {
        const dark = tier.highlighted
        return (
          <div
            key={tier.name}
            className={cn(
              'rounded-[20px] px-8 py-9 flex flex-col',
              dark ? 'bg-[#0d1b2e]' : 'bg-[#eef3f8]'
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={cn(
                'text-[11px] font-mono-jarvis uppercase tracking-[2.5px]',
                dark ? 'text-white/60' : 'text-[#6b84a0]'
              )}>
                {tier.name}
              </span>
              {tier.badge && (
                <span className="text-[10px] font-semibold uppercase tracking-[1.5px] rounded-full px-3 py-1 bg-[#00d4ff] text-[#04121c]">
                  {tier.badge}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1.5 mt-5">
              <span className={cn(
                'font-hero font-extrabold text-[52px] leading-none tracking-[-0.04em]',
                dark ? 'text-white' : 'text-[#0d1b2e]'
              )}>
                {tier.price}
              </span>
              <span className={cn('text-[13px]', dark ? 'text-white/50' : 'text-[#6b84a0]')}>
                {tier.period}
              </span>
            </div>

            <p className={cn('text-[14px] mt-3 leading-relaxed', dark ? 'text-white/65' : 'text-[#41627a]')}>
              {tier.tagline}
            </p>

            <a href="/app" className="block mt-7">
              <MButton variant={dark ? 'accent' : 'solid'} size="lg" className="w-full">
                {tier.cta}
              </MButton>
            </a>

            <ul className="mt-8 space-y-3 flex-1">
              {tier.features.map(f => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check size={15} className={cn('shrink-0 mt-0.5', dark ? 'text-[#00d4ff]' : 'text-[#10b981]')} />
                  <span className={cn('text-[13.5px] leading-snug', dark ? 'text-white/75' : 'text-[#41627a]')}>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
