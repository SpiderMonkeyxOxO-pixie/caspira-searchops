import { useState, useEffect } from 'react'
import { Info, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { useStore } from '@/store'
import { SECTION_GUIDES } from '@/data/sectionGuides'
import type { NavSection } from '@/types'

const STORAGE_KEY = 'jarvis-guide-collapsed'

function getCollapsed(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  catch { return {} }
}

function setCollapsed(section: string, value: boolean) {
  const prev = getCollapsed()
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, [section]: value }))
}

export function SectionGuide() {
  const { activeSection, setSection } = useStore()
  const guide = SECTION_GUIDES[activeSection]

  const [open, setOpen] = useState(() => {
    const collapsed = getCollapsed()
    return collapsed[activeSection] !== true
  })

  useEffect(() => {
    const collapsed = getCollapsed()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(collapsed[activeSection] !== true)
  }, [activeSection])

  if (!guide) return null

  function toggle() {
    const next = !open
    setOpen(next)
    setCollapsed(activeSection, !next)
  }

  function navigate(section: NavSection) {
    setSection(section)
  }

  return (
    <div className="mb-5 rounded-xl border border-accent/20 bg-accent/4 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-accent/4 transition-colors cursor-pointer"
      >
        <Info size={13} className="text-accent shrink-0" />
        <span className="text-[11px] font-semibold text-accent font-mono-jarvis tracking-wide flex-1">
          {open ? guide.title : `How to use ${guide.title}`}
        </span>
        {open
          ? <ChevronUp size={13} className="text-muted shrink-0" />
          : <ChevronDown size={13} className="text-muted shrink-0" />
        }
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 border-t border-accent/10">
          {/* Description */}
          <p className="text-xs text-muted leading-relaxed mt-3 mb-4">
            {guide.description}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Steps */}
            <div>
              <div className="text-[10px] font-mono-jarvis tracking-widest text-muted mb-2 font-semibold">
                HOW TO USE
              </div>
              <ol className="space-y-1.5">
                {guide.steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-xs text-tx leading-relaxed">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[9px] font-bold font-mono-jarvis mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Connected sections */}
            <div>
              <div className="text-[10px] font-mono-jarvis tracking-widest text-muted mb-2 font-semibold">
                CONNECTS TO
              </div>
              <div className="flex flex-wrap gap-1.5">
                {guide.connects.map(link => (
                  <button
                    key={link.section}
                    onClick={() => navigate(link.section)}
                    title={link.label}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-accent/25 bg-accent/6 text-[11px] text-accent hover:bg-accent/15 hover:border-accent/50 transition-all cursor-pointer font-medium"
                  >
                    {link.label}
                    <ArrowRight size={9} className="opacity-60" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
