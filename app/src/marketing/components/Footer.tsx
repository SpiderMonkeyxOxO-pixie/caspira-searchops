import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { SITE, routes } from '../config'

interface FooterLink { label: string; href: string; external?: boolean }

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Overview', href: '/#product' },
      { label: 'Tools', href: '/#tools' },
      { label: 'Pricing', href: routes.pricing },
      { label: 'Log in', href: '/app' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: routes.about },
      { label: 'Contact', href: routes.contact },
      { label: SITE.parent.name, href: SITE.parent.origin, external: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: routes.privacy },
      { label: 'Terms of Service', href: routes.terms },
      { label: 'Disclaimer', href: routes.disclaimer },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-[#e5ecf4] bg-white">
      <div className="max-w-[1340px] mx-auto px-5 sm:px-8 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <div className="font-hero font-extrabold text-[22px] tracking-[-0.02em] text-[#0d1b2e]">CASPIRA</div>
          <div className="text-[9px] text-[#8ba3bd] tracking-[3px] font-mono-jarvis uppercase mt-1.5">SearchOps</div>
          <p className="text-[13px] text-[#6b84a0] mt-5 leading-relaxed max-w-[34ch]">
            The whole SEO stack — research, tracking, audits, AI content and client reporting — in one platform.
          </p>
          <a
            href={SITE.parent.origin}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[13px] text-[#0284a5] mt-5 hover:underline underline-offset-2"
          >
            A {SITE.parent.name} product <ArrowUpRight size={13} />
          </a>
        </div>

        {columns.map(col => (
          <div key={col.title}>
            <div className="text-[10px] font-mono-jarvis uppercase tracking-[2.5px] text-[#8ba3bd] mb-4">{col.title}</div>
            <ul className="space-y-2.5">
              {col.links.map(l => (
                <li key={l.label}>
                  {l.external ? (
                    <a href={l.href} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1 text-[14px] text-[#33475f] hover:text-[#0d1b2e] transition-colors">
                      {l.label} <ArrowUpRight size={12} />
                    </a>
                  ) : (
                    <Link to={l.href} className="text-[14px] text-[#33475f] hover:text-[#0d1b2e] transition-colors">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-[#e5ecf4]">
        <div className="max-w-[1340px] mx-auto px-5 sm:px-8 py-6 text-[12px] text-[#8ba3bd] flex flex-col sm:flex-row gap-2 justify-between">
          <span>© {new Date().getFullYear()} {SITE.legal.entity}. All rights reserved.</span>
          <address className="not-italic">{SITE.legal.address}</address>
        </div>
      </div>
    </footer>
  )
}
