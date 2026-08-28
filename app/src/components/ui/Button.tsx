import { cn } from '@/lib/utils'

type Variant = 'primary' | 'ghost' | 'ai' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-[#00d4ff] text-black font-bold hover:bg-[#00bfe6]',
  ghost:   'bg-transparent text-muted border border-border hover:border-accent hover:text-accent',
  ai:      'bg-[#7c3aed] text-white hover:bg-[#6d28d9]',
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
