import { cn } from '@/lib/utils'

type Variant = 'solid' | 'outline' | 'white' | 'accent'
type Size = 'md' | 'lg'

const variants: Record<Variant, string> = {
  solid:   'bg-[#0d1b2e] text-white hover:bg-[#16283f]',
  outline: 'bg-transparent text-[#0d1b2e] border border-[#0d1b2e]/25 hover:border-[#0d1b2e]/60',
  white:   'bg-white text-[#0d1b2e] hover:bg-white/90',
  accent:  'bg-[#00d4ff] text-[#04121c] hover:bg-[#00bfe6]',
}

const sizes: Record<Size, string> = {
  md: 'px-5 py-2.5 text-[13px]',
  lg: 'px-7 py-3.5 text-[15px]',
}

export function MButton({
  variant = 'solid', size = 'md', className, children, ...props
}: {
  variant?: Variant
  size?: Size
  className?: string
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold',
        'cursor-pointer transition-colors duration-200 outline-none whitespace-nowrap',
        variants[variant], sizes[size], className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
