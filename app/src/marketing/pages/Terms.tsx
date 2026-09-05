/**
 * DRAFT — NOT LEGAL ADVICE.
 * Reviewed by nobody. Have counsel review it and fill every SITE.legal
 * placeholder before publishing. See src/marketing/config.ts.
 */
import { PageShell, Prose } from '../components/PageShell'
import { useSeo } from '../hooks/useSeo'
import { SITE, routes } from '../config'

export function MarketingTerms() {
  useSeo({
    title: 'Terms of Service',
    description: `The terms governing use of ${SITE.name} — subscriptions, acceptable use, your data and your own API provider accounts.`,
    path: routes.terms,
  })

  return (
    <PageShell
      label="Legal"
      title="Terms of Service"
      intro={`Last updated ${SITE.legalUpdated}. These terms govern your use of ${SITE.name}, operated by ${SITE.legal.entity}. By creating a workspace you agree to them.`}
    >
      <Prose>
        <h2>1. What the service is</h2>
        <p>
          {SITE.name} is software that unifies search-marketing workflows in one interface. It is a
          tool layer: you connect your own database for storage and your own third-party accounts
          for data. We provide the application, not the data and not the storage.
        </p>

        <h2>2. Your account</h2>
        <p>
          You must provide accurate registration details and keep your credentials secure. You are
          responsible for everything that happens under your workspace, including actions taken by
          team members you invite. Workspace owners control role permissions and are responsible for
          who they grant access to.
        </p>

        <h2>3. Your database and your API keys</h2>
        <p>
          You are responsible for the database you connect, including its availability, backups and
          security, and for the third-party provider accounts whose keys you supply. Charges incurred
          on those provider accounts are between you and that provider — we do not resell their
          services and do not control their pricing, rate limits or availability.
        </p>
        <p>
          If a provider changes its terms, pricing or API, features that depend on it may stop
          working through no fault of ours. We will make reasonable efforts to maintain
          compatibility but cannot guarantee it.
        </p>

        <h2>4. Subscriptions and billing</h2>
        <ul>
          <li>Paid plans begin with a free trial as described at the time of sign-up</li>
          <li>Subscriptions renew automatically each billing period until cancelled</li>
          <li>You may cancel at any time; cancellation takes effect at the end of the current period</li>
          <li>Plan changes are prorated automatically</li>
          <li>Fees are exclusive of taxes unless stated otherwise</li>
        </ul>
        <p>
          We may change our prices. If we do, we will give existing subscribers advance notice before
          the change applies to their renewal.
        </p>

        <h2>5. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the service to break the law, or to breach a third party's rights</li>
          <li>Violate the terms of any data provider you connect through the platform</li>
          <li>Attempt to gain unauthorised access to the service or other customers' workspaces</li>
          <li>Resell, sublicense or white-label the platform except where your plan expressly permits it</li>
          <li>Reverse engineer, copy or create derivative works from the software</li>
        </ul>
        <p>
          The platform includes features that can generate aggressive optimisation strategies. You
          are solely responsible for deciding what to act on, and for complying with the guidelines of
          the search engines and platforms you operate on.
        </p>

        <h2>6. Intellectual property</h2>
        <p>
          The software, its interface and its underlying code remain the property of{' '}
          {SITE.legal.entity}. Your subscription grants you a limited, non-exclusive,
          non-transferable right to use it for the duration of your plan. Content and data you create
          or store remain yours.
        </p>

        <h2>7. Availability</h2>
        <p>
          We aim to keep the service available and will give notice of planned maintenance where
          practical, but we do not guarantee uninterrupted availability. The service also depends on
          systems we do not control, including your database and your data providers.
        </p>

        <h2>8. Disclaimers and liability</h2>
        <p>
          The service is provided on an "as is" and "as available" basis. Rankings, traffic estimates,
          keyword metrics and AI-generated output are estimates and suggestions, not guarantees of
          any outcome. See our <a href={routes.disclaimer}>disclaimer</a> for detail.
        </p>
        <p>
          To the maximum extent permitted by law, our aggregate liability arising from your use of the
          service is limited to the amount you paid us in the twelve months preceding the claim. We
          are not liable for indirect or consequential loss, including lost profits, lost rankings or
          lost data held in systems we do not operate.
        </p>

        <h2>9. Termination</h2>
        <p>
          You may stop using the service at any time. We may suspend or terminate a workspace that
          breaches these terms, or where required by law. On termination your access ends; the data
          in your own database is unaffected and remains yours.
        </p>

        <h2>10. Governing law</h2>
        <p>
          These terms are governed by the laws of {SITE.legal.jurisdiction}, and disputes are subject
          to the courts of that jurisdiction.
        </p>

        <h2>11. Contact</h2>
        <p>
          {SITE.legal.entity}<br />
          {SITE.legal.address}<br />
          Registration number {SITE.legal.registrationNumber} · Tax number {SITE.legal.taxNumber}<br />
          <a href={`mailto:${SITE.contact.general}`}>{SITE.contact.general}</a>
        </p>
      </Prose>
    </PageShell>
  )
}
