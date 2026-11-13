import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | Fullstack Starter',
  description: 'How Fullstack Starter collects, uses, shares, and deletes personal data.',
}

const headingClass = 'mt-10 scroll-mt-6 text-xl font-semibold'
const paragraphClass = 'mt-3 leading-7 text-muted-foreground'
const listClass = 'mt-3 list-disc space-y-2 pl-6 leading-7 text-muted-foreground marker:text-foreground'
const linkClass = 'font-medium text-foreground underline underline-offset-4'

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-muted-foreground">Effective date: [effective date]</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-normal sm:text-5xl">Privacy Policy</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          This policy explains how Taonity processes personal data when you use Fullstack Starter,
          including when you sign in. Taonity is an independent project and is the
          controller of the data described here.
        </p>
      </div>

      <section aria-labelledby="scope">
        <h2 className={headingClass} id="scope">1. Scope and contact</h2>
        <p className={paragraphClass}>
          This policy applies to the Fullstack Starter website and its API (the “Service”).
          Questions, privacy requests, and account or data deletion
          requests may be sent to{' '}
          <a className={linkClass} href="mailto:taonity.org@gmail.com">taonity.org@gmail.com</a>.
        </p>
      </section>

      <section aria-labelledby="data-collected">
        <h2 className={headingClass} id="data-collected">2. Data we collect</h2>
        <ul className={listClass}>
          <li>
            <strong className="text-foreground">Sign-in profile data.</strong> If you sign in, the
            Service receives your user identifier, display name, email address, and profile picture
            from your sign-in provider. The Service does not receive your provider password.
          </li>
          <li>
            <strong className="text-foreground">Account and activity data.</strong> The Service
            stores access status, assigned role, access requests, and administrative actions.
          </li>
          <li>
            <strong className="text-foreground">Technical data.</strong> Servers may process IP
            address, request time and path, browser or user-agent information, response status,
            security events, and diagnostic logs to operate and protect the Service.
          </li>
        </ul>
      </section>

      <section aria-labelledby="uses">
        <h2 className={headingClass} id="uses">3. How and why we use data</h2>
        <ul className={listClass}>
          <li>Authenticate users and maintain sessions.</li>
          <li>Administer access and roles.</li>
          <li>Prevent abuse, investigate incidents, debug failures, and keep an audit trail.</li>
          <li>Meet legal obligations and enforce the <Link className={linkClass} href="/terms">Terms of Service</Link>.</li>
        </ul>
        <p className={paragraphClass}>
          Where a legal basis is required, processing is based on providing the Service you request,
          Taonity’s legitimate interests in operating and securing the Service,
          compliance with legal obligations, or consent where
          the law requires it. You may object to processing based on legitimate interests by using
          the contact above.
        </p>
      </section>

      <section aria-labelledby="disclosure">
        <h2 className={headingClass} id="disclosure">4. Disclosure and public visibility</h2>
        <p className={paragraphClass}>Data may be disclosed only as follows:</p>
        <ul className={listClass}>
          <li>
            Your sign-in provider processes authentication and profile requests under its own policies.
          </li>
          <li>
            Infrastructure providers may process data solely to host, store, monitor, back up, and
            secure the Service on Taonity’s behalf.
          </li>
          <li>
            Data may be disclosed when required by law, to protect rights and safety, or when you
            expressly direct the disclosure.
          </li>
        </ul>
        <p className={paragraphClass}>
          Taonity does not sell personal data.
        </p>
      </section>

      <section aria-labelledby="cookies">
        <h2 className={headingClass} id="cookies">5. Cookies and local storage</h2>
        <p className={paragraphClass}>
          The Service uses only functionality and security storage: an HTTP-only session cookie
          (configured to expire after seven days), a CSRF-protection cookie, temporary OAuth or
          authentication-error state, and browser local storage for interface preferences. These are
          not used for advertising or cross-site tracking. Blocking them may prevent login or other
          protected actions.
        </p>
      </section>

      <section aria-labelledby="retention">
        <h2 className={headingClass} id="retention">6. Retention and deletion</h2>
        <ul className={listClass}>
          <li>Authentication sessions are configured to expire after seven days.</li>
          <li>Administrative audit records are deleted after 14 days.</li>
          <li>
            Profile and account data is retained only while needed to provide account and
            access-control functions. It is promptly deleted when no longer
            needed, when the Service closes, or following a valid
            deletion request, unless retention is legally required.
          </li>
          <li>
            Security logs and backups are retained for the shortest period reasonably needed for
            operations, incident response, and legal obligations, then deleted or overwritten.
          </li>
        </ul>
      </section>

      <section aria-labelledby="rights">
        <h2 className={headingClass} id="rights">7. Your choices and rights</h2>
        <p className={paragraphClass}>
          Depending on where you live, you may ask to access, correct, update, export, restrict,
          object to, or delete your personal data, or withdraw consent. You may also complain to
          your local data-protection authority. Taonity does not discriminate against users for
          exercising privacy rights.
        </p>
        <p className={paragraphClass}>
          To make a request, email <a className={linkClass} href="mailto:taonity.org@gmail.com">taonity.org@gmail.com</a>{' '}
          from an address where you can receive a reply and include your user ID or the
          record involved. Additional information will be requested only when reasonably
          necessary to verify the request. Use the same email address to request
          deletion. Taonity will respond within the period required by applicable law.
        </p>
      </section>

      <section aria-labelledby="transfers">
        <h2 className={headingClass} id="transfers">8. International processing</h2>
        <p className={paragraphClass}>
          The Service is available internationally, and data may be processed in countries other
          than your own. Where required, Taonity relies on legally recognized safeguards for such
          transfers.
        </p>
      </section>

      <section aria-labelledby="security">
        <h2 className={headingClass} id="security">9. Security</h2>
        <p className={paragraphClass}>
          Taonity uses reasonable technical and organizational safeguards, including encrypted
          network transport in production, restricted administrative access, HTTP-only and secure
          session cookies, CSRF protection, access controls, and data minimization. No system is
          completely secure. If an incident creates a legally reportable risk, affected users and
          relevant authorities will be notified as required.
        </p>
      </section>

      <section aria-labelledby="children">
        <h2 className={headingClass} id="children">10. Children</h2>
        <p className={paragraphClass}>
          The Service is not directed to anyone under 13 or under the higher minimum age required
          in their country. Contact Taonity if you believe data from an ineligible child has been
          processed so it can be deleted.
        </p>
      </section>

      <section aria-labelledby="changes">
        <h2 className={headingClass} id="changes">11. Changes to this policy</h2>
        <p className={paragraphClass}>
          This policy may change as the Service, law, or data practices change. The updated version
          will be posted here with a new effective date. Material changes will receive additional
          notice when reasonably possible.
        </p>
      </section>
    </article>
  )
}