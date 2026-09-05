const steps = [
  {
    n: '01',
    title: 'Connect your database',
    body: 'Point Caspira at your own Supabase project. Every keyword, audit and client report is written to infrastructure you own — we never hold a copy.',
  },
  {
    n: '02',
    title: 'Bring your own API keys',
    body: 'DataForSEO, Serper, Claude or OpenRouter, Search Console, GA4. You pay providers directly at their rates — no markup, no reselling, no lock-in.',
  },
  {
    n: '03',
    title: 'Run the whole stack in one place',
    body: 'Research, tracking, audits, AI content and client reporting — 60+ tools and your whole team behind a single login.',
  },
]

export function HowItWorks() {
  return (
    <section className="max-w-[1340px] mx-auto px-5 sm:px-8 pt-24 pb-4">
      <div className="flex items-baseline gap-3">
        <span className="text-[11px] font-mono-jarvis uppercase tracking-[2.5px] text-[#6b84a0]">How it works</span>
        <span className="text-[11px] font-mono-jarvis text-[#a8bccf]">( 3 )</span>
      </div>

      <h2 className="font-hero font-semibold text-[#0d1b2e] mt-5 mb-4
                     text-[34px] sm:text-[52px] leading-[1.0] tracking-[-0.04em] max-w-[22ch]">
        Your keys. Your database. Our command centre.
      </h2>
      <p className="text-[16px] text-[#33475f] max-w-[58ch] leading-relaxed mb-12">
        Caspira is the layer that unifies the tools you already pay for — not another middleman between you and your data.
      </p>

      <div className="grid md:grid-cols-3 gap-5">
        {steps.map(s => (
          <div key={s.n} className="rounded-[18px] border border-[#dbe4ee] px-7 py-8">
            <span className="font-mono-jarvis text-[12px] tracking-[2px] text-[#00b4d8]">{s.n}</span>
            <h3 className="font-hero font-semibold text-[#0d1b2e] text-[22px] leading-[1.15] tracking-[-0.025em] mt-4">
              {s.title}
            </h3>
            <p className="text-[14.5px] text-[#41627a] mt-3 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
