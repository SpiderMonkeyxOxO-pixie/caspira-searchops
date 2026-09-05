import { useMarketingTheme } from '../hooks/useMarketingTheme'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

/** Shared frame for every inner page: light theme, nav, page header, footer. */
export function PageShell({
  label, title, intro, children, wide = false,
}: {
  label: string
  title: string
  intro?: string
  children: React.ReactNode
  wide?: boolean
}) {
  useMarketingTheme()
  // Header and body share one measure so the H1 lines up with the copy beneath it.
  const measure = wide ? 'max-w-[1340px]' : 'max-w-[820px]'

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="relative overflow-hidden isolate">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#e2f5fb_0%,#ffffff_100%)]" />
        <div className={`${measure} mx-auto px-5 sm:px-8 pt-20 pb-14`}>
          <span className="text-[11px] font-mono-jarvis uppercase tracking-[2.5px] text-[#6b84a0]">{label}</span>
          <h1 className="font-hero font-semibold text-[#0d1b2e] mt-5 max-w-[18ch]
                         text-[40px] sm:text-[60px] leading-[0.98] tracking-[-0.04em]">
            {title}
          </h1>
          {intro && (
            <p className="text-[17px] text-[#33475f] mt-6 max-w-[62ch] leading-[1.55]">{intro}</p>
          )}
        </div>
      </section>

      <main className={`${measure} mx-auto px-5 sm:px-8 pb-24`}>
        {children}
      </main>

      <Footer />
    </div>
  )
}

/** Long-form legal / policy copy. */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="[&>h2]:font-hero [&>h2]:font-semibold [&>h2]:text-[#0d1b2e] [&>h2]:text-[26px]
                    [&>h2]:tracking-[-0.03em] [&>h2]:mt-12 [&>h2]:mb-4
                    [&>h3]:font-semibold [&>h3]:text-[#0d1b2e] [&>h3]:text-[17px] [&>h3]:mt-8 [&>h3]:mb-3
                    [&>p]:text-[15.5px] [&>p]:text-[#41627a] [&>p]:leading-[1.7] [&>p]:mb-4
                    [&>ul]:mb-5 [&>ul]:space-y-2
                    [&>ul>li]:text-[15.5px] [&>ul>li]:text-[#41627a] [&>ul>li]:leading-[1.7]
                    [&>ul>li]:pl-5 [&>ul>li]:relative
                    [&>ul>li]:before:content-['—'] [&>ul>li]:before:absolute [&>ul>li]:before:left-0
                    [&>ul>li]:before:text-[#a8bccf]
                    [&_a]:text-[#0284a5] [&_a]:underline [&_a]:underline-offset-2">
      {children}
    </div>
  )
}
