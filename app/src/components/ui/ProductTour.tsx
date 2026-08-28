import { useEffect, useState, useCallback } from 'react'
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'
import { useStore } from '@/store'
import type { NavSection } from '@/types'

interface TourStep {
  target: string | null   // data-tour anchor value, or null for a centered card
  navigateTo?: NavSection // switch to this section before showing the step
  title: string
  body: string
}

const TOUR_STEPS: TourStep[] = [
  {
    target: null,
    title: 'Welcome to Caspira SearchOps',
    body: "Let's take 60 seconds to get you oriented — a handful of quick stops, then you're on your own.",
  },
  {
    target: 'sidebar-nav',
    title: 'Everything lives here',
    body: "The sidebar is organized by what you're trying to do — Research, Tracking, AI Tools, Content, and more. Scroll down any time for the full list.",
  },
  {
    target: 'nav-dashboard',
    navigateTo: 'dashboard',
    title: 'Command Center is home',
    body: 'Your live KPIs — clicks, impressions, top queries — pull in automatically once you connect Search Console.',
  },
  {
    target: 'site-selector',
    title: 'Add your site first',
    body: "This is the one thing everything else depends on. Click here to add your first site — it feeds every tool in the platform.",
  },
  {
    target: 'nav-analyzer',
    navigateTo: 'analyzer',
    title: 'Site Audit finds what to fix',
    body: 'A full technical and on-page crawl of your site — broken links, missing meta, slow pages — with fixes ranked by impact.',
  },
  {
    target: 'nav-tracker',
    navigateTo: 'tracker',
    title: 'Rank Tracker watches your keywords',
    body: 'Track daily position changes for the keywords that matter, and see movement over time before your competitors do.',
  },
  {
    target: 'nav-articlewriter',
    navigateTo: 'articlewriter',
    title: 'Article Writer drafts content for you',
    body: 'Generate SEO-optimized articles from a topic or target keyword, ready to review and publish.',
  },
  {
    target: 'nav-jarvis',
    title: 'Meet Caspira AI',
    body: 'Your AI strategist already has full context on your connected site — no copying reports into a separate chatbot. Just ask.',
  },
  {
    target: 'nav-team',
    navigateTo: 'team',
    title: 'Bring your team in',
    body: 'Invite teammates, assign roles, and manage access — everyone works from the same live data.',
  },
  {
    target: 'settings-gear',
    title: 'One more thing',
    body: 'Add your AI key and connect Search Console, GA4, or Bing here to unlock everything above.',
  },
  {
    target: null,
    title: "That's the tour",
    body: "You're ready. Restart this anytime from Onboarding if you ever want a refresher.",
  },
]

interface Rect { top: number; left: number; width: number; height: number }

function measure(anchor: string | null): Rect | null {
  if (!anchor) return null
  const el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

export function ProductTour() {
  const tourActive     = useStore(s => s.tourActive)
  const tourStep       = useStore(s => s.tourStep)
  const setTourStep    = useStore(s => s.setTourStep)
  const setTourActive  = useStore(s => s.setTourActive)
  const setTourDismissed = useStore(s => s.setTourDismissed)
  const setSection     = useStore(s => s.setSection)

  const [rect, setRect] = useState<Rect | null>(null)
  const step = TOUR_STEPS[tourStep]
  const isLast  = tourStep === TOUR_STEPS.length - 1
  const isFirst = tourStep === 0

  const recompute = useCallback(() => {
    if (!step) return
    setRect(measure(step.target))
  }, [step])

  useEffect(() => {
    if (!tourActive) return
    if (step?.navigateTo) setSection(step.navigateTo)
    // Two rAFs: one for the section switch to commit, one for layout to settle.
    let raf1 = 0, raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(recompute)
    })
    window.addEventListener('resize', recompute)
    window.addEventListener('scroll', recompute, true)
    return () => {
      cancelAnimationFrame(raf1); cancelAnimationFrame(raf2)
      window.removeEventListener('resize', recompute)
      window.removeEventListener('scroll', recompute, true)
    }
  }, [tourActive, tourStep, step, recompute, setSection])

  if (!tourActive || !step) return null

  function end() {
    setTourActive(false)
    setTourDismissed(true)
  }
  function next() {
    if (isLast) { end(); return }
    setTourStep(tourStep + 1)
  }
  function back() {
    if (!isFirst) setTourStep(tourStep - 1)
  }

  const PAD = 8
  const spot = rect ? {
    top: rect.top - PAD, left: rect.left - PAD,
    width: rect.width + PAD * 2, height: rect.height + PAD * 2,
  } : null

  // Card placement: prefer below the spotlight, then above, then whichever side
  // has more room — but always clamp on-screen regardless, since a very tall
  // target (e.g. the full sidebar nav list) can leave neither side with enough
  // room for a naive below/above choice.
  const CARD_W = 320
  const CARD_H_EST = 190
  const MARGIN = 16
  let cardStyle: React.CSSProperties
  if (spot) {
    const roomBelow = window.innerHeight - (spot.top + spot.height)
    const roomAbove = spot.top
    const preferBelow = roomBelow >= CARD_H_EST || roomBelow >= roomAbove
    const rawTop = preferBelow ? spot.top + spot.height + 14 : spot.top - CARD_H_EST - 14
    const top  = Math.min(Math.max(rawTop, MARGIN), window.innerHeight - CARD_H_EST - MARGIN)
    const left = Math.min(Math.max(spot.left + spot.width / 2 - CARD_W / 2, MARGIN), window.innerWidth - CARD_W - MARGIN)
    cardStyle = { left, top }
  } else {
    cardStyle = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  }

  return (
    <div className="fixed inset-0 z-[10000]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Backdrop with spotlight cutout via box-shadow */}
      {spot ? (
        <div
          className="fixed rounded-xl transition-all duration-300 pointer-events-none"
          style={{
            top: spot.top, left: spot.left, width: spot.width, height: spot.height,
            boxShadow: '0 0 0 9999px rgba(5,8,14,.8), 0 0 0 2px var(--color-accent, #22d3ee)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[rgba(5,8,14,.8)]" />
      )}

      {/* Card */}
      <div
        className="fixed w-80 bg-card border border-border rounded-2xl shadow-2xl p-5"
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-1.5 text-accent">
            <Sparkles size={13} />
            <span className="text-[10px] font-mono-jarvis tracking-widest uppercase">
              Step {tourStep + 1} of {TOUR_STEPS.length}
            </span>
          </div>
          <button onClick={end} className="text-muted hover:text-tx transition-colors cursor-pointer shrink-0" aria-label="Skip tour">
            <X size={15} />
          </button>
        </div>
        <div className="font-display font-bold text-sm text-tx mb-1.5">{step.title}</div>
        <div className="text-xs text-muted leading-relaxed mb-4">{step.body}</div>
        <div className="flex items-center justify-between gap-2">
          <button onClick={end} className="text-[11px] text-muted hover:text-tx transition-colors cursor-pointer font-mono-jarvis">
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button onClick={back} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-muted hover:text-tx hover:border-accent transition-colors text-[11px] cursor-pointer">
                <ArrowLeft size={11} /> Back
              </button>
            )}
            <button onClick={next} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-black font-semibold text-[11px] cursor-pointer hover:opacity-90 transition-opacity">
              {isLast ? 'Finish' : 'Next'} {!isLast && <ArrowRight size={11} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
