import { useEffect, useRef, useState } from 'react'

/**
 * Layered hero backdrop, cheapest-first so nothing blocks first paint:
 *   1. CSS gradient   — paints instantly, and is the fallback if everything else fails
 *   2. poster JPG     — 14KB, gives the video's look with no video download
 *   3. video          — mounted only AFTER first paint, and only on capable clients
 *   4. white scrim    — protects headline contrast over the busier edges
 *
 * The video is deliberately skipped on small screens (data + LCP) and when the
 * viewer has asked for reduced motion.
 */
export function HeroBackground() {
  const [playVideo, setPlayVideo] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const smallScreen = window.matchMedia('(max-width: 768px)').matches
    if (reducedMotion || smallScreen) return
    // Mount on the frame after paint so the download never competes with LCP.
    const id = requestAnimationFrame(() => setPlayVideo(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Don't burn CPU decoding video that's scrolled out of view.
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {})
        else el.pause()
      },
      { threshold: 0.05 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [playVideo])

  return (
    <>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#e2f5fb_0%,#e9eefb_52%,#ffffff_100%)]" />
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: "url('/hero-bg-poster.jpg')" }}
      />
      {playVideo && (
        <video
          ref={videoRef}
          className="absolute inset-0 -z-10 w-full h-full object-cover"
          poster="/hero-bg-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
      )}
      {/* Keeps #0d1b2e text comfortably above WCAG AA over the busier edges. */}
      <div className="absolute inset-0 -z-10 bg-white/35" />
      {/* Fades the backdrop into the white page below it. */}
      <div className="absolute inset-x-0 bottom-0 h-32 -z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,#ffffff_100%)]" />
    </>
  )
}
