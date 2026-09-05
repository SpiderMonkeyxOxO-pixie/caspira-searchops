import { useState } from 'react'
import { Mail, LifeBuoy, Building2, ArrowUpRight, MapPin } from 'lucide-react'
import { PageShell } from '../components/PageShell'
import { MButton } from '../components/MButton'
import { useSeo, organizationSchema } from '../hooks/useSeo'
import { SITE, routes } from '../config'

const channels = [
  {
    icon: Mail,
    title: 'General enquiries',
    body: 'Questions about the product, plans or anything pre-sales.',
    value: SITE.contact.general,
  },
  {
    icon: LifeBuoy,
    title: 'Customer support',
    body: 'Already on a plan and need help? Support is included on every tier.',
    value: SITE.contact.support,
  },
  {
    icon: Building2,
    title: 'Company',
    body: `SearchOps is built and operated by ${SITE.parent.name}.`,
    value: SITE.parent.origin.replace('https://', ''),
    href: SITE.parent.origin,
  },
]

export function MarketingContact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  // No server-side form handler exists yet, so rather than silently dropping
  // submissions this composes a real email the visitor can send. Swap for a
  // Supabase edge function when one is available.
  function send(e: React.FormEvent) {
    e.preventDefault()
    const subject = encodeURIComponent(`Website enquiry from ${name || 'a visitor'}`)
    const body = encodeURIComponent(`${message}\n\n—\n${name}\n${email}`)
    window.location.href = `mailto:${SITE.contact.general}?subject=${subject}&body=${body}`
  }

  useSeo({
    title: 'Contact',
    description: `Get in touch with the ${SITE.name} team — pre-sales questions, customer support, or anything about ${SITE.parent.name}.`,
    path: routes.contact,
    jsonLd: [organizationSchema],
  })

  const field = 'w-full rounded-2xl border border-[#dbe4ee] bg-white px-5 py-3.5 text-[15px] text-[#0d1b2e] placeholder:text-[#8ba3bd] outline-none focus:border-[#00b4d8]'

  return (
    <PageShell
      label="Contact"
      title="Talk to us."
      intro="Questions about plans, the data model, or whether Caspira fits how your team works — send a note and a human will answer."
    >
      <div className="grid md:grid-cols-3 gap-4 mb-14">
        {channels.map(c => {
          const Icon = c.icon
          return (
            <div key={c.title} className="rounded-[18px] border border-[#dbe4ee] px-6 py-7">
              <Icon size={18} className="text-[#00b4d8]" strokeWidth={1.75} />
              <h2 className="font-hero font-semibold text-[#0d1b2e] text-[18px] tracking-[-0.02em] mt-4">
                {c.title}
              </h2>
              <p className="text-[14px] text-[#41627a] mt-2 leading-relaxed">{c.body}</p>
              <a
                href={c.href ?? `mailto:${c.value}`}
                target={c.href ? '_blank' : undefined}
                rel={c.href ? 'noreferrer' : undefined}
                className="inline-flex items-center gap-1 text-[13px] text-[#0284a5] underline underline-offset-2 mt-4 break-words"
              >
                {c.value}{c.href && <ArrowUpRight size={13} />}
              </a>
            </div>
          )
        })}
      </div>

      <section className="rounded-[18px] border border-[#dbe4ee] px-7 py-7 mb-14">
        <div className="flex items-start gap-4">
          <MapPin size={18} className="text-[#00b4d8] shrink-0 mt-0.5" strokeWidth={1.75} />
          <div>
            <h2 className="font-hero font-semibold text-[#0d1b2e] text-[18px] tracking-[-0.02em]">
              Office
            </h2>
            <address className="not-italic text-[14.5px] text-[#41627a] mt-2 leading-relaxed">
              {SITE.legal.entity}<br />
              {SITE.legal.postal.street}<br />
              {SITE.legal.postal.locality} {SITE.legal.postal.postalCode}<br />
              Armenia
            </address>
          </div>
        </div>
      </section>

      <section className="rounded-[20px] bg-[#eef3f8] px-7 sm:px-10 py-10">
        <h2 className="font-hero font-semibold text-[#0d1b2e] text-[28px] tracking-[-0.035em]">
          Send a message
        </h2>
        <p className="text-[15px] text-[#41627a] mt-3 mb-7 max-w-[52ch] leading-relaxed">
          This opens your email client with the message ready to send, so nothing gets lost in a form queue.
        </p>

        <form onSubmit={send} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="c-name" className="block text-[10px] font-mono-jarvis uppercase tracking-[2px] text-[#6b84a0] mb-2">Name</label>
              <input id="c-name" required value={name} onChange={e => setName(e.target.value)} className={field} placeholder="Your name" />
            </div>
            <div>
              <label htmlFor="c-email" className="block text-[10px] font-mono-jarvis uppercase tracking-[2px] text-[#6b84a0] mb-2">Email</label>
              <input id="c-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className={field} placeholder="you@company.com" />
            </div>
          </div>
          <div>
            <label htmlFor="c-msg" className="block text-[10px] font-mono-jarvis uppercase tracking-[2px] text-[#6b84a0] mb-2">Message</label>
            <textarea id="c-msg" required rows={5} value={message} onChange={e => setMessage(e.target.value)} className={`${field} resize-y`} placeholder="What can we help with?" />
          </div>
          <MButton type="submit" variant="solid" size="lg">Send message</MButton>
        </form>
      </section>
    </PageShell>
  )
}
