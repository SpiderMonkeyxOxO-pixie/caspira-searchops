import { ArrowUpRight } from 'lucide-react'
import { PageShell } from '../components/PageShell'
import { CTASection } from '../components/CTASection'
import { MButton } from '../components/MButton'
import { useSeo, organizationSchema } from '../hooks/useSeo'
import { SITE, routes } from '../config'

const principles = [
  {
    n: '01',
    title: 'Your data stays yours',
    body: 'Caspira runs against your own database. We do not hold a copy of your keyword history, audits or client reports, and we cannot sell what we never store.',
  },
  {
    n: '02',
    title: 'No markup on data',
    body: 'You connect your own provider keys and pay them directly at their rates. We make money from software, not from reselling API calls at a margin.',
  },
  {
    n: '03',
    title: 'One system, not fifteen tabs',
    body: 'Research, tracking, audits, content and reporting were never separate problems. They only became separate products because they were sold separately.',
  },
]

export function MarketingAbout() {
  useSeo({
    title: 'About',
    description:
      'Caspira SearchOps is a search intelligence platform from Caspira Solutions — 60+ SEO tools in one system that runs on your own database and your own API keys.',
    path: routes.about,
    jsonLd: [organizationSchema],
  })

  return (
    <PageShell
      label="About"
      title="We build the layer that ties SEO work together."
      intro={`${SITE.name} is a product of ${SITE.parent.name}. It exists because the average SEO team pays five vendors to answer one question: what should we work on next?`}
    >
      <section>
        <h2 className="font-hero font-semibold text-[#0d1b2e] text-[30px] tracking-[-0.035em] mb-5">
          What we actually do
        </h2>
        <p className="text-[16px] text-[#41627a] leading-[1.7] mb-4">
          Caspira SearchOps is a single workspace for the whole search workflow — keyword research,
          rank tracking, competitor analysis, technical audits, AI-assisted content and client
          reporting. Sixty-plus tools, one login, one set of permissions for your team.
        </p>
        <p className="text-[16px] text-[#41627a] leading-[1.7]">
          What makes it structurally different is where the data lives. Caspira connects to
          <em> your </em> database and <em> your </em> provider accounts. We supply the system;
          you supply the storage and the data sources. That means no vendor lock-in, no markup on
          API calls, and no copy of your clients' performance data sitting on our servers.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="font-hero font-semibold text-[#0d1b2e] text-[30px] tracking-[-0.035em] mb-8">
          How we think about it
        </h2>
        <div className="space-y-5">
          {principles.map(p => (
            <div key={p.n} className="rounded-[18px] border border-[#dbe4ee] px-7 py-7">
              <span className="font-mono-jarvis text-[12px] tracking-[2px] text-[#00b4d8]">{p.n}</span>
              <h3 className="font-hero font-semibold text-[#0d1b2e] text-[21px] leading-[1.2] tracking-[-0.025em] mt-3">
                {p.title}
              </h3>
              <p className="text-[15px] text-[#41627a] mt-3 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-hero font-semibold text-[#0d1b2e] text-[30px] tracking-[-0.035em] mb-8">
          Company details
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Legal entity',        value: SITE.legal.entity },
            { label: 'Headquarters',        value: 'Yerevan, Armenia' },
            { label: 'Registration number', value: SITE.legal.registrationNumber },
            { label: 'Tax number',          value: SITE.legal.taxNumber },
            { label: 'Service regions',     value: SITE.legal.serviceRegions },
            { label: 'Core focus',          value: 'Technology and Business Operations' },
          ].map(d => (
            <div key={d.label} className="rounded-[14px] border border-[#dbe4ee] px-5 py-4">
              <div className="text-[10px] font-mono-jarvis uppercase tracking-[2px] text-[#8ba3bd]">{d.label}</div>
              <div className="text-[15px] text-[#0d1b2e] font-medium mt-1.5">{d.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-[18px] bg-[#eef3f8] px-8 py-9">
        <h2 className="font-hero font-semibold text-[#0d1b2e] text-[24px] tracking-[-0.03em]">
          Part of {SITE.parent.name}
        </h2>
        <p className="text-[15.5px] text-[#41627a] mt-4 leading-[1.7]">
          SearchOps is built and operated by {SITE.parent.name}. You can find the company, its other
          work and how to reach the team on the main site.
        </p>
        <a href={SITE.parent.origin} target="_blank" rel="noreferrer" className="inline-block mt-6">
          <MButton variant="solid" size="lg">
            Visit {SITE.parent.name} <ArrowUpRight size={16} />
          </MButton>
        </a>
      </section>

      <div className="mt-20 -mx-5 sm:-mx-8">
        <CTASection />
      </div>
    </PageShell>
  )
}
