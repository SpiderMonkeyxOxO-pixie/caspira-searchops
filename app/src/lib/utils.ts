import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fmt = {
  usd: (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `$${(n / 1_000).toFixed(1)}K`
    : `$${Math.round(n).toLocaleString()}`,
  k: (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n),
  pct: (n: number) => `${n.toFixed(1)}%`,
}
