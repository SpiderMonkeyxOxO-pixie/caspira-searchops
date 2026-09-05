import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { MButton } from './MButton'

const links = [
  { label: 'Product', href: '/#product' },
  { label: 'Tools', href: '/#tools' },
  { label: 'Pricing', href: '/pricing' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-[#e5ecf4]">
      <nav className="max-w-[1340px] mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between gap-8">
        <Link to="/" className="flex flex-col leading-none shrink-0">
          <span className="font-hero font-extrabold text-[19px] tracking-[-0.02em] text-[#0d1b2e]">CASPIRA</span>
          <span className="text-[9px] text-[#8ba3bd] tracking-[3px] font-mono-jarvis uppercase mt-1">SearchOps</span>
        </Link>

        <div className="hidden md:flex items-center gap-9">
          {links.map(l => (
            <Link key={l.label} to={l.href}
              className="text-[15px] text-[#33475f] hover:text-[#0d1b2e] transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <a href="/app"><MButton variant="outline">Log in</MButton></a>
          <a href="/app"><MButton variant="solid">Start free trial</MButton></a>
        </div>

        <button className="md:hidden text-[#0d1b2e]" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-[#e5ecf4] bg-white px-5 py-5 flex flex-col gap-4">
          {links.map(l => (
            <Link key={l.label} to={l.href} className="text-[15px] text-[#33475f]" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="flex gap-2.5 pt-1">
            <a href="/app" className="flex-1"><MButton variant="outline" className="w-full">Log in</MButton></a>
            <a href="/app" className="flex-1"><MButton variant="solid" className="w-full">Start free trial</MButton></a>
          </div>
        </div>
      )}
    </header>
  )
}
