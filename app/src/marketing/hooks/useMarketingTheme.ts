import { useEffect } from 'react'

/**
 * The public marketing pages always render in the light palette, regardless of
 * whatever theme / hat-mode the signed-in app last wrote to <html>.
 * App.tsx re-applies its own theme when the dashboard mounts.
 */
export function useMarketingTheme() {
  useEffect(() => {
    const root = document.documentElement
    const prevTheme = root.getAttribute('data-theme')
    const prevMode = root.getAttribute('data-mode')

    root.setAttribute('data-theme', 'light')
    root.removeAttribute('data-mode')

    return () => {
      if (prevTheme) root.setAttribute('data-theme', prevTheme)
      if (prevMode) root.setAttribute('data-mode', prevMode)
    }
  }, [])
}
