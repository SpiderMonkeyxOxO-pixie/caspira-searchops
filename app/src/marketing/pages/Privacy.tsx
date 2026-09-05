/**
 * DRAFT — NOT LEGAL ADVICE.
 * This describes the product's actual data handling as implemented in code, but it
 * has not been reviewed by a lawyer. Have counsel review it, and fill every
 * SITE.legal placeholder, before publishing. See src/marketing/config.ts.
 */
import { PageShell, Prose } from '../components/PageShell'
import { useSeo } from '../hooks/useSeo'
import { SITE, routes } from '../config'

export function MarketingPrivacy() {
  useSeo({
    title: 'Privacy Policy',
    description: `How ${SITE.name} handles personal data. Your SEO data stays in your own database and your provider API keys stay in your browser — we never store either.`,
    path: routes.privacy,
  })

  return (
    <PageShell
      label="Legal"
      title="Privacy Policy"
      intro={`Last updated ${SITE.legalUpdated}. This policy explains what ${SITE.legal.entity} collects when you use ${SITE.name}, and — just as importantly — what we deliberately do not collect.`}
    >
      <Prose>
        <h2>The short version</h2>
        <p>
          Caspira SearchOps is designed so that we hold as little of your data as possible.
          Your SEO data lives in a database you own and control. Your data-provider API keys are
          stored in your own browser. We hold the minimum needed to run your account.
        </p>

        <h2>What we collect</h2>
        <h3>Account information</h3>
        <p>
          When you create a workspace we store your email address, a securely hashed password (or
          your identity-provider reference if you sign in with Google), your display name, your
          organisation name and the role assigned to you within that organisation.
        </p>
        <h3>Billing information</h3>
        <p>
          When you subscribe to a paid plan, payment is processed by our third-party payment
          provider. We receive and store a customer reference, your plan, and your subscription
          status. We do not receive or store your full card number.
        </p>
        <h3>Service and diagnostic data</h3>
        <p>
          We log activity needed to operate and secure the service — sign-in events, actions taken
          within a workspace, and technical error reports. Support correspondence you send us is
          retained so we can help you.
        </p>

        <h2>What we do not collect</h2>
        <ul>
          <li>
            <strong>Your SEO data.</strong> Keyword histories, rank tracking, crawls, audits,
            content drafts and client reports are written to the database you connect. We do not
            keep a copy and cannot read it.
          </li>
          <li>
            <strong>Your API keys.</strong> Keys for services such as DataForSEO, Serper, Claude
            or OpenRouter are stored in your own browser's local storage. When you run a task, the
            key is passed through our proxy to that provider solely to fulfil that request. We do
            not write it to our database.
          </li>
          <li>
            <strong>Your card details.</strong> These are handled entirely by our payment provider.
          </li>
        </ul>

        <h2>Google Search Console and GA4</h2>
        <p>
          If you connect Google Search Console or Google Analytics, you authorise access through
          Google's OAuth flow. The resulting access tokens are stored so that scheduled reports and
          dashboards continue to work, and are used only to retrieve the data you asked us to show
          you. You can revoke this access at any time from your Google account, which immediately
          ends our ability to read that data.
        </p>

        <h2>Caching</h2>
        <p>
          To reduce the number of billable calls made against your provider accounts, responses from
          some integrations are cached temporarily in our infrastructure. Cached responses expire
          automatically and are not used for any purpose other than serving your own workspace.
        </p>

        <h2>Cookies and local storage</h2>
        <p>
          We use browser storage for your authentication session, your interface preferences, your
          workspace configuration and the API keys described above. We do not use third-party
          advertising or cross-site tracking cookies.
        </p>

        <h2>Who we share data with</h2>
        <p>We share personal data only with the providers required to run the service:</p>
        <ul>
          <li>Our infrastructure and authentication provider, which hosts your account records</li>
          <li>Our payment provider, for subscriptions and invoicing</li>
          <li>Google, where you have connected Search Console or Analytics</li>
          <li>The data and AI providers whose keys you supply, when you run a task using them</li>
        </ul>
        <p>We do not sell personal data, and we do not share it for advertising purposes.</p>

        <h2>Retention and deletion</h2>
        <p>
          Account records are retained while your workspace is active. If you cancel, we retain your
          account record for a limited period to allow reactivation and to meet accounting
          obligations, then delete it. Because your SEO data lives in your own database, deleting it
          is entirely within your control and is unaffected by cancelling your subscription.
        </p>

        <h2>Your rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, export or delete
          the personal data we hold about you, and to object to certain processing. To exercise any
          of these, contact <a href={`mailto:${SITE.contact.privacy}`}>{SITE.contact.privacy}</a>.
        </p>

        <h2>Security</h2>
        <p>
          Data in transit is encrypted with TLS. Access to production systems is restricted to
          personnel who need it. No system is perfectly secure, so we encourage you to use a strong,
          unique password and to enable multi-factor authentication on your Google account where it
          is used to sign in.
        </p>

        <h2>Changes</h2>
        <p>
          If we make a material change to this policy we will update the date above and notify
          workspace owners by email before the change takes effect.
        </p>

        <h2>Contact</h2>
        <p>
          {SITE.legal.entity} is the data controller for the personal data described above.
        </p>
        <p>
          {SITE.legal.entity}<br />
          {SITE.legal.address}<br />
          Registration number {SITE.legal.registrationNumber} · Tax number {SITE.legal.taxNumber}<br />
          <a href={`mailto:${SITE.contact.privacy}`}>{SITE.contact.privacy}</a>
        </p>
      </Prose>
    </PageShell>
  )
}
