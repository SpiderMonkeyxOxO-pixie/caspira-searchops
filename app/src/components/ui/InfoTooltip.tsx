import { useState, useRef } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  text: string
  size?: number
  side?: 'top' | 'bottom' | 'left' | 'right'
  width?: string
  className?: string
}

export function InfoTooltip({ text, size = 12, side = 'top', width = 'w-52', className }: Props) {
  const [show, setShow] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function open()  { clearTimeout(timer.current); setShow(true) }
  function close() { timer.current = setTimeout(() => setShow(false), 120) }

  const positionCls = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  }[side]

  const arrowCls = {
    top:    'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-0 border-t-[var(--color-border)]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-0 border-b-[var(--color-border)]',
    left:   'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-0 border-l-[var(--color-border)]',
    right:  'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-0 border-r-[var(--color-border)]',
  }[side]

  return (
    <span className={cn('relative inline-flex items-center', className)}>
      <button
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

      {show && (
        <span
          className={cn(
            'absolute z-[9990] pointer-events-none',
            positionCls,
            width,
          )}
          onMouseEnter={open}
          onMouseLeave={close}
        >
          <span className="block px-3 py-2 rounded-lg bg-surface border border-border shadow-xl text-xs text-tx leading-relaxed">
            {text}
          </span>
          <span className={cn('absolute w-0 h-0 border-4', arrowCls)} />
        </span>
      )}
    </span>
  )
}
