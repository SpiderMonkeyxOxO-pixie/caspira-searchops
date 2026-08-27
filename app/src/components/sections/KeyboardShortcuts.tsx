import { useState } from 'react'
import { Keyboard, Search } from 'lucide-react'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import type { NavSection } from '@/types'

interface Shortcut {
  keys: string[]; desc: string; category: string; nav?: NavSection
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { keys: ['G', 'D'],        desc: 'Go to Dashboard',          category: 'Navigation', nav: 'dashboard' },
  { keys: ['G', 'J'],        desc: 'Go to Caspira AI',          category: 'Navigation', nav: 'jarvis' },
  { keys: ['G', 'T'],        desc: 'Go to Rank Tracker',        category: 'Navigation', nav: 'tracker' },
  { keys: ['G', 'K'],        desc: 'Go to Keyword Strategy',    category: 'Navigation', nav: 'keywords' },
  { keys: ['G', 'S'],        desc: 'Go to Site Audit',          category: 'Navigation', nav: 'analyzer' },
  { keys: ['G', 'B'],        desc: 'Go to Backlinks',           category: 'Navigation', nav: 'backlinks' },
  { keys: ['G', 'C'],        desc: 'Go to Content Calendar',    category: 'Navigation', nav: 'contentcal' },
  { keys: ['G', 'R'],        desc: 'Go to Report Scheduler',    category: 'Navigation', nav: 'scheduler' },
  { keys: ['G', 'A'],        desc: 'Go to API Access',          category: 'Navigation', nav: 'apiaccess' },
  { keys: ['G', 'O'],        desc: 'Go to Onboarding',          category: 'Navigation', nav: 'onboarding' },
  // Global
  { keys: ['?'],             desc: 'Show keyboard shortcuts',   category: 'Global',     nav: 'shortcuts' },
  { keys: ['Ctrl', 'K'],     desc: 'Quick navigation (Shortcuts page)', category: 'Global', nav: 'shortcuts' },
  { keys: ['Esc'],           desc: 'Clear key buffer / close modals', category: 'Global' },
  // AI Tools
  { keys: ['Ctrl', 'Enter'], desc: 'Run AI analysis (when input focused)', category: 'AI Tools' },
  // Content
  { keys: ['Ctrl', 'C'],     desc: 'Copy selected snippet / output', category: 'Content' },
  // Coming soon
  { keys: ['Ctrl', 'Z'],     desc: 'Undo last change (coming soon)', category: 'Coming Soon' },
  { keys: ['Ctrl', 'S'],     desc: 'Save current state (coming soon)', category: 'Coming Soon' },
  { keys: ['Ctrl', '/'],     desc: 'Toggle sidebar (coming soon)', category: 'Coming Soon' },
  { keys: ['Alt', '1–9'],    desc: 'Jump to nav section by position (coming soon)', category: 'Coming Soon' },
]

const CATEGORIES = ['All', 'Navigation', 'Global', 'AI Tools', 'Content', 'Coming Soon']

function Key({ k }: { k: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-md border border-border bg-surface text-[11px] font-mono-jarvis text-tx shadow-sm font-semibold">
      {k}
    </kbd>
  )
}

export function KeyboardShortcuts() {
  const { setSection } = useStore()
  const [filter,   setFilter]   = useState('All')
  const [search,   setSearch]   = useState('')

  const filtered = SHORTCUTS.filter(s =>
    (filter === 'All' || s.category === filter) &&
    (search === '' || s.desc.toLowerCase().includes(search.toLowerCase()) || s.keys.join('').toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <Keyboard size={22} className="text-accent" />
          </div>
          <div>
            <CardTitle className="mb-1">Keyboard Shortcuts</CardTitle>
            <div className="text-xs text-muted leading-relaxed">
              Navigate Caspira at speed with keyboard-first controls. Shortcuts work globally — no need to click first.
              Use <Key k="G" /> sequences for section jumps and <Key k="?" /> to return here anytime.
            </div>
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search shortcuts…"
              className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors font-mono-jarvis" />
          </div>
          <div className="flex gap-1">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setFilter(c)}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-mono-jarvis cursor-pointer transition-colors ${filter === c ? 'bg-accent text-black' : 'text-muted hover:text-tx'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          {CATEGORIES.filter(c => c !== 'All').map(cat => {
            const catShortcuts = filtered.filter(s => s.category === cat)
            if (catShortcuts.length === 0) return null
            return (
              <div key={cat}>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest px-2 py-2 mt-3">{cat.toUpperCase()}</div>
                {catShortcuts.map((s, i) => (
                  <div key={i}
                    onClick={() => s.nav && setSection(s.nav)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${s.nav ? 'hover:bg-surface cursor-pointer group' : ''} ${s.category === 'Coming Soon' ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {s.keys.map((k, j) => (
                          <span key={j} className="flex items-center gap-1">
                            <Key k={k} />
                            {j < s.keys.length - 1 && <span className="text-muted text-[10px] font-mono-jarvis">then</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={`text-xs ${s.nav ? 'text-muted group-hover:text-tx' : 'text-muted'} transition-colors`}>
                      {s.desc}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">G-sequence Navigation</CardTitle>
        <div className="text-xs text-muted mb-4 leading-relaxed">
          Press <Key k="G" /> followed by a letter within 1 second to jump to any section instantly.
          Works anywhere in the app — even when search boxes are focused.
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SHORTCUTS.filter(s => s.keys[0] === 'G' && s.nav).map(s => (
            <button key={s.nav} onClick={() => s.nav && setSection(s.nav)}
              className="flex items-center gap-3 p-2.5 bg-surface border border-border rounded-lg hover:border-accent/40 cursor-pointer transition-colors text-left">
              <div className="flex items-center gap-1 shrink-0">
                <Key k="G" />
                <span className="text-muted text-[9px] font-mono-jarvis">→</span>
                <Key k={s.keys[1]} />
              </div>
              <span className="text-xs text-muted">{s.desc.replace('Go to ', '')}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
