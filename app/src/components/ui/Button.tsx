import { cn } from '@/lib/utils'

type Variant = 'primary' | 'ghost' | 'ai' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-linear-to-r from-[#00d4ff] to-[#0099cc] text-black font-bold shadow-[0_4px_15px_#00d4ff30] hover:-translate-y-px hover:shadow-[0_6px_25px_#00d4ff40]',
  ghost:   'bg-transparent text-muted border border-border hover:border-accent hover:text-accent',
  ai:      'bg-linear-to-r from-[#7c3aed] to-[#9333ea] text-white hover:-translate-y-px hover:shadow-[0_6px_25px_#7c3aed40]',
  danger:  'bg-[#ef444420] text-[#ef4444] border border-[#ef444430] hover:bg-[#ef444430]',
}

export function Button({ variant = 'ghost', className, children, ...props }: {
  variant?: Variant
  className?: string
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold',
        'cursor-pointer transition-all duration-200 font-sans border-none outline-none',
        variants[variant], className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
