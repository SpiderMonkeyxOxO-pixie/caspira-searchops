import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  text: string
  size?: number
  side?: 'top' | 'bottom' | 'left' | 'right'
  width?: string
  className?: string
}

export function InfoTooltip({ text, size = 12, side = 'top', width = 'w-56', className }: Props) {
  const [show, setShow]     = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const [flip, setFlip]     = useState(side)
  const btnRef = useRef<HTMLButtonElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const timer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function open()  { clearTimeout(timer.current); setShow(true) }
  function close() { timer.current = setTimeout(() => { setShow(false); setCoords(null) }, 150) }

  useEffect(() => {
    if (!show || !btnRef.current || !tipRef.current) return
    const btn = btnRef.current.getBoundingClientRect()
    const tip = tipRef.current.getBoundingClientRect()
    const GAP = 8
    const vw  = window.innerWidth
    const vh  = window.innerHeight
    let top = 0, left = 0, s = side

    if (side === 'top') {
      top  = btn.top - tip.height - GAP
      left = btn.left + btn.width / 2 - tip.width / 2
      if (top < 8) { s = 'bottom'; top = btn.bottom + GAP }
    } else if (side === 'bottom') {
      top  = btn.bottom + GAP
      left = btn.left + btn.width / 2 - tip.width / 2
      if (top + tip.height > vh - 8) { s = 'top'; top = btn.top - tip.height - GAP }
    } else if (side === 'left') {
      top  = btn.top + btn.height / 2 - tip.height / 2
      left = btn.left - tip.width - GAP
      if (left < 8) { s = 'right'; left = btn.right + GAP }
    } else {
      top  = btn.top + btn.height / 2 - tip.height / 2
      left = btn.right + GAP
      if (left + tip.width > vw - 8) { s = 'left'; left = btn.left - tip.width - GAP }
    }

    // Clamp within viewport
    left = Math.max(8, Math.min(left, vw - tip.width - 8))
    top  = Math.max(8, Math.min(top,  vh - tip.height - 8))

    setFlip(s)
    setCoords({ top, left })
  }, [show, side])

  if (!text) return null

  const arrowCls = {
    top:    'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-0 border-t-[var(--color-border)]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-0 border-b-[var(--color-border)]',
    left:   'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-0 border-l-[var(--color-border)]',
    right:  'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-0 border-r-[var(--color-border)]',
  }[flip]

  return (
    <span className={cn('relative inline-flex items-center', className)}>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        className="text-muted hover:text-accent transition-colors focus:outline-none"
        tabIndex={-1}
        aria-label="More info"
      >
        <Info size={size} strokeWidth={2} />
      </button>

      {show && createPortal(
        <div
          ref={tipRef}
          className={cn('fixed z-99999', width, !coords && 'opacity-0')}
          style={coords ? { top: coords.top, left: coords.left } : { top: -9999, left: -9999 }}
          onMouseEnter={open}
          onMouseLeave={close}
        >
          <span className="block px-3 py-2 rounded-lg bg-surface border border-border shadow-2xl text-xs text-tx leading-relaxed whitespace-normal">
            {text}
          </span>
          <span className={cn('absolute w-0 h-0 border-4', arrowCls)} />
        </div>,
        document.body
      )}
    </span>
  )
}
