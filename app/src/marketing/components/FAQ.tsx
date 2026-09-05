import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FAQItem { q: string; a: string }

export function FAQ({ items }: { items: FAQItem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <div className="max-w-[820px] mx-auto">
      {items.map((item, i) => {
        const open = openIdx === i
        return (
          <div key={item.q} className="border-t border-[#dbe4ee] last:border-b">
            <button
              className="w-full flex items-center justify-between gap-6 py-6 text-left"
              onClick={() => setOpenIdx(open ? null : i)}
              aria-expanded={open}
            >
              <span className="font-hero font-semibold text-[19px] sm:text-[22px] tracking-[-0.02em] text-[#0d1b2e]">
                {item.q}
              </span>
              <span className="w-9 h-9 rounded-full border border-[#0d1b2e]/20 flex items-center justify-center shrink-0">
                <Plus size={15} className={cn('text-[#0d1b2e] transition-transform duration-200', open && 'rotate-45')} />
              </span>
            </button>
            {open && (
              <p className="text-[15px] text-[#41627a] leading-relaxed pb-7 pr-16 max-w-[70ch]">{item.a}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
