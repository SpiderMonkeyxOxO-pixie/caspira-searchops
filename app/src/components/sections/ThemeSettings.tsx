import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

type Theme = 'dark' | 'light' | 'auto'

const THEMES: { id: Theme; label: string; desc: string; Icon: React.ElementType }[] = [
  { id: 'dark',  label: 'Dark',   desc: 'Dark navy interface — optimised for long sessions and low-light environments.', Icon: Moon },
  { id: 'light', label: 'Light',  desc: 'Clean white interface — great for daytime use and client screen shares.', Icon: Sun },
  { id: 'auto',  label: 'System', desc: 'Follows your OS dark/light preference. Switches automatically at sunset.', Icon: Monitor },
]

function DarkPreview() {
  return (
    <svg viewBox="0 0 240 150" className="w-full rounded-lg">
      <rect width="240" height="150" fill="#040812" />
      <rect x="0" y="0" width="60" height="150" fill="#0b1428" />
      <rect x="0" y="0" width="60" height="30" fill="#0d1829" />
      <rect x="8" y="8" width="14" height="14" rx="3" fill="url(#dg)" />
      <text x="26" y="18" fill="#e8f4fd" fontSize="7" fontFamily="Roboto" fontWeight="700">JARVIS</text>
      {[0,1,2,3,4].map(i => <rect key={i} x="8" y={36 + i*18} width={44} height={10} rx="4" fill={i===0?"#00d4ff20":"#1a2a45"} />)}
      <rect x="68" y="8" width="164" height="60" rx="6" fill="#0b1428" />
      <rect x="68" y="76" width="78" height="66" rx="6" fill="#0b1428" />
      <rect x="154" y="76" width="78" height="66" rx="6" fill="#0b1428" />
      <text x="76" y="22" fill="#00d4ff" fontSize="7" fontFamily="Roboto" fontWeight="700">218K</text>
      <text x="76" y="32" fill="#5a7a9a" fontSize="5" fontFamily="Roboto Mono">SESSIONS</text>
      <defs><linearGradient id="dg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#00d4ff"/><stop offset="1" stopColor="#7c3aed"/></linearGradient></defs>
    </svg>
  )
}

function LightPreview() {
  return (
    <svg viewBox="0 0 240 150" className="w-full rounded-lg">
      <rect width="240" height="150" fill="#f0f4f8" />
      <rect x="0" y="0" width="60" height="150" fill="#ffffff" />
      <rect x="0" y="0" width="60" height="30" fill="#f8fafc" />
      <rect x="8" y="8" width="14" height="14" rx="3" fill="url(#lg)" />
      <text x="26" y="18" fill="#1a2844" fontSize="7" fontFamily="Roboto" fontWeight="700">JARVIS</text>
      {[0,1,2,3,4].map(i => <rect key={i} x="8" y={36 + i*18} width={44} height={10} rx="4" fill={i===0?"#00d4ff20":"#e8edf3"} />)}
      <rect x="68" y="8" width="164" height="60" rx="6" fill="#ffffff" />
      <rect x="68" y="76" width="78" height="66" rx="6" fill="#ffffff" />
      <rect x="154" y="76" width="78" height="66" rx="6" fill="#ffffff" />
      <text x="76" y="22" fill="#0891b2" fontSize="7" fontFamily="Roboto" fontWeight="700">218K</text>
      <text x="76" y="32" fill="#6b84a0" fontSize="5" fontFamily="Roboto Mono">SESSIONS</text>
      <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#00d4ff"/><stop offset="1" stopColor="#7c3aed"/></linearGradient></defs>
    </svg>
  )
}

function AutoPreview() {
  return (
    <svg viewBox="0 0 240 150" className="w-full rounded-lg">
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="1" y2="0">
          <stop offset="50%" stopColor="#040812"/>
          <stop offset="50%" stopColor="#f0f4f8"/>
        </linearGradient>
      </defs>
      <rect width="240" height="150" fill="url(#ag)" />
      <rect x="0" y="0" width="60" height="150" fill="#0b1428" />
      <rect x="120" y="0" width="120" height="150" fill="#f8fafc" />
      {/* moon shape */}
      <path d="M42 75a12 12 0 1 0 16-11.3A9 9 0 0 1 42 75z" fill="#00d4ff" />
      {/* sun shape */}
      <circle cx="190" cy="72" r="7" fill="#f59e0b" />
      {[0,45,90,135,180,225,270,315].map(a => (
        <line key={a}
          x1={190 + Math.cos(a*Math.PI/180)*10} y1={72 + Math.sin(a*Math.PI/180)*10}
          x2={190 + Math.cos(a*Math.PI/180)*13} y2={72 + Math.sin(a*Math.PI/180)*13}
          stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      ))}
      <line x1="120" y1="0" x2="120" y2="150" stroke="#1a2a45" strokeWidth="1" strokeDasharray="4 4" />
    </svg>
  )
}

const PREVIEWS: Record<Theme, React.ReactNode> = {
  dark: <DarkPreview />,
  light: <LightPreview />,
  auto: <AutoPreview />,
}

const ACCENT_COLORS = [
  { id: 'cyan',   color: '#00d4ff', label: 'Cyan (default)' },
  { id: 'purple', color: '#7c3aed', label: 'Purple' },
  { id: 'green',  color: '#10b981', label: 'Emerald' },
  { id: 'orange', color: '#f59e0b', label: 'Amber' },
  { id: 'pink',   color: '#ec4899', label: 'Pink' },
]

export function ThemeSettings() {
  const { theme, setTheme, density, setDensity } = useStore()

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle className="mb-1">Theme Preferences</CardTitle>
        <div className="text-xs text-muted mb-5">Choose how Jarvis looks. Your preference is saved locally and applied immediately.</div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {THEMES.map(({ id, label, desc, Icon }) => (
            <button key={id} onClick={() => setTheme(id)}
              className={cn(
                'text-left p-4 rounded-xl border-2 cursor-pointer transition-all',
                theme === id ? 'border-accent bg-accent/8' : 'border-border hover:border-accent/40'
              )}>
              <div className="mb-3">{PREVIEWS[id]}</div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon size={14} className={theme === id ? 'text-accent' : 'text-muted'} />
                  <span className={cn('font-semibold text-sm', theme === id ? 'text-accent' : 'text-tx')}>{label}</span>
                </div>
                {theme === id && (
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <Check size={11} className="text-black" />
                  </div>
                )}
              </div>
              <div className="text-[11px] text-muted leading-relaxed">{desc}</div>
            </button>
          ))}
        </div>

        <div className="p-3 bg-surface border border-border rounded-lg text-xs text-muted">
          <Monitor size={12} className="inline mr-1.5 text-accent" />
          <span className="text-accent font-semibold">System mode</span> reads your OS preference.
          On macOS: System Preferences → Appearance. On Windows: Settings → Personalisation → Colors.
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">Accent Colour</CardTitle>
        <div className="flex gap-3">
          {ACCENT_COLORS.map(a => (
            <button key={a.id}
              onClick={() => document.documentElement.style.setProperty('--color-accent', a.color)}
              title={a.label}
              className="w-10 h-10 rounded-full border-2 border-border hover:border-tx transition-colors cursor-pointer flex items-center justify-center shrink-0"
              style={{ background: a.color }}>
            </button>
          ))}
        </div>
        <div className="mt-2 text-[11px] text-muted">Click to preview. Accent colour resets on page reload — persistent accent colour coming soon.</div>
      </Card>

      <Card>
        <CardTitle className="mb-3">Display Density</CardTitle>
        <div className="flex gap-3">
          {([
            { id: 'default', label: 'Default', desc: 'Balanced spacing for most workflows' },
            { id: 'compact', label: 'Compact', desc: 'More content, less padding — for power users' },
          ] as const).map(d => (
            <button key={d.id} onClick={() => setDensity(d.id)}
              className={cn('flex-1 p-3 rounded-xl border-2 cursor-pointer transition-all text-left', density === d.id ? 'border-accent bg-accent/8' : 'border-border hover:border-accent/40')}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-tx">{d.label}</span>
                {density === d.id && <Check size={12} className="text-accent" />}
              </div>
              <div className="text-[11px] text-muted">{d.desc}</div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
