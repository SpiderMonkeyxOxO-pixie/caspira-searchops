import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { featureSlides } from '../data/featureSlides'

const ADVANCE_MS = 6000

export function FeatureCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const regionRef = useRef<HTMLDivElement>(null)

  const go = (next: number) => setIndex((next + featureSlides.length) % featureSlides.length)

  // Auto-advance, unless the viewer is interacting or has asked for less motion.
  useEffect(() => {
    if (paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => setIndex(i => (i + 1) % featureSlides.length), ADVANCE_MS)
    return () => clearTimeout(t)
  }, [index, paused])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') { e.preventDefault(); setPaused(true); go(index + 1) }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); setPaused(true); go(index - 1) }
  }

  const active = featureSlides[index]
  const ActivePanel = active.Panel

  return (
    <section className="max-w-[1340px] mx-auto px-5 sm:px-8 py-24">
      <div className="flex items-baseline gap-3">
        <span className="text-[11px] font-mono-jarvis uppercase tracking-[2.5px] text-[#6b84a0]">See it working</span>
        <span className="text-[11px] font-mono-jarvis text-[#a8bccf]">( {featureSlides.length} )</span>
      </div>
      <h2 className="font-hero font-semibold text-[#0d1b2e] mt-5 mb-10
                     text-[34px] sm:text-[52px] leading-[1.0] tracking-[-0.04em] max-w-[20ch]">
        The tools you'll actually live in.
      </h2>

      <div
        ref={regionRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Product feature tour"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        className="rounded-[20px] bg-[#eef3f8] p-5 sm:p-8 grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] gap-8 outline-none focus-visible:ring-2 focus-visible:ring-[#00b4d8]"
      >
        {/* Tabs. `min-w-0` is required: grid children default to min-width:auto,
            which would let the nowrap tab row push the page wider than the viewport. */}
        <div className="flex flex-col min-w-0">
          <div role="tablist" aria-label="Features" className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
            {featureSlides.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                id={`feat-tab-${s.id}`}
                aria-selected={i === index}
                aria-controls={`feat-panel-${s.id}`}
                tabIndex={i === index ? 0 : -1}
                onClick={() => { setPaused(true); setIndex(i) }}
                className={cn(
                  'text-left whitespace-nowrap lg:whitespace-normal rounded-xl px-4 py-3 transition-colors shrink-0',
                  i === index
                    ? 'bg-white text-[#0d1b2e] shadow-[0_2px_10px_-6px_rgba(13,27,46,0.4)]'
                    : 'text-[#41627a] hover:bg-white/60'
                )}
              >
                <span className="text-[10px] font-mono-jarvis uppercase tracking-[2px] text-[#8ba3bd] block">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[14.5px] font-semibold">{s.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-7 lg:mt-8">
            <h3 className="font-hero font-semibold text-[#0d1b2e] text-[24px] sm:text-[28px] leading-[1.15] tracking-[-0.03em]">
              {active.title}
            </h3>
            <p className="text-[15px] text-[#41627a] mt-3 leading-relaxed max-w-[46ch]">{active.blurb}</p>
          </div>

          <div className="flex items-center gap-2 mt-8">
            <button
              onClick={() => { setPaused(true); go(index - 1) }}
              aria-label="Previous feature"
              className="w-9 h-9 rounded-full border border-[#0d1b2e]/20 flex items-center justify-center hover:border-[#0d1b2e]/50 transition-colors"
            >
              <ChevronLeft size={15} className="text-[#0d1b2e]" />
            </button>
            <button
              onClick={() => { setPaused(true); go(index + 1) }}
              aria-label="Next feature"
              className="w-9 h-9 rounded-full border border-[#0d1b2e]/20 flex items-center justify-center hover:border-[#0d1b2e]/50 transition-colors"
            >
              <ChevronRight size={15} className="text-[#0d1b2e]" />
            </button>
            <span className="ml-2 font-mono-jarvis text-[11px] text-[#8ba3bd]">
              {String(index + 1).padStart(2, '0')} / {String(featureSlides.length).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Panel */}
        <div
          role="tabpanel"
          id={`feat-panel-${active.id}`}
          aria-labelledby={`feat-tab-${active.id}`}
          className="h-[360px] sm:h-[400px] min-w-0"
        >
          <ActivePanel />
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        Showing feature {index + 1} of {featureSlides.length}: {active.label}
      </p>
    </section>
  )
}
