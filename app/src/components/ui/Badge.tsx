import { cn } from '@/lib/utils'

type Variant = 'accent' | 'purple' | 'green' | 'amber' | 'red' | 'muted'

const variants: Record<Variant, string> = {
  accent: 'bg-[#00d4ff20] text-[#00d4ff] border border-[#00d4ff30]',
  purple: 'bg-[#7c3aed20] text-[#a78bfa] border border-[#7c3aed30]',
  green:  'bg-[#10b98120] text-[#10b981] border border-[#10b98130]',
  amber:  'bg-[#f59e0b20] text-[#f59e0b] border border-[#f59e0b30]',
  red:    'bg-[#ef444420] text-[#ef4444] border border-[#ef444430]',
  muted:  'bg-border/30 text-muted border border-border',
}

export function Badge({ variant = 'accent', className, children }: {
  variant?: Variant
  className?: string
  children: React.ReactNode
}) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
      variants[variant], className
    )}>
      {children}
    </span>
  )
}
