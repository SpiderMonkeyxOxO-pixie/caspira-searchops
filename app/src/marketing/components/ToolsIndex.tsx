import { Plus } from 'lucide-react'
import { featureCategories } from '../data/features'

export function ToolsIndex() {
  return (
    <section id="tools" className="max-w-[1340px] mx-auto px-5 sm:px-8 py-24 scroll-mt-24">
      <div className="flex items-baseline gap-3">
        <span className="text-[11px] font-mono-jarvis uppercase tracking-[2.5px] text-[#6b84a0]">Tools</span>
        <span className="text-[11px] font-mono-jarvis text-[#a8bccf]">( 60+ )</span>
      </div>

      <h2 className="font-hero font-semibold text-[#0d1b2e] mt-5 mb-12
                     text-[34px] sm:text-[52px] leading-[1.0] tracking-[-0.04em] uppercase max-w-[20ch]">
        One login. Every job you do.
      </h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {featureCategories.map(cat => (
          <div key={cat.title} className="rounded-[18px] bg-[#e7f0f2] px-7 py-7 flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <span className="text-[10px] font-mono-jarvis uppercase tracking-[2px] text-[#5b7a8c] pt-1">
                {cat.title}
              </span>
              <span className="w-9 h-9 rounded-full border border-[#0d1b2e]/20 flex items-center justify-center shrink-0">
                <Plus size={15} className="text-[#0d1b2e]" />
              </span>
            </div>

            <p className="font-hero font-semibold text-[#0d1b2e] text-[21px] leading-[1.18] tracking-[-0.025em] mt-4">
              {cat.description}
            </p>

            <ul className="mt-5 pt-4 border-t border-[#0d1b2e]/10 flex flex-wrap gap-x-4 gap-y-1.5">
              {cat.tools.map(t => (
                <li key={t} className="text-[13px] text-[#41627a]">{t}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
