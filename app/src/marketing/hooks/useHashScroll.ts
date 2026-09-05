import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * React Router does not scroll to `#hash` targets on client-side navigation, so
 * in-app anchor links (Product, Tools) would otherwise do nothing. This scrolls
 * to the target whenever the hash changes, including when arriving from another
 * route — where the section may not be mounted on the first frame.
 *
 * Vertical offset for the sticky navbar comes from `scroll-mt-*` on the targets.
 */
export function useHashScroll() {
  const { hash, key } = useLocation()

  useEffect(() => {
    if (!hash) return

    let frame = 0
    let attempts = 0

    const tryScroll = () => {
      const el = document.querySelector(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
      // Section may not have mounted yet on a cross-route navigation.
      if (attempts++ < 20) frame = requestAnimationFrame(tryScroll)
    }

    frame = requestAnimationFrame(tryScroll)
    return () => cancelAnimationFrame(frame)
  }, [hash, key])
}
