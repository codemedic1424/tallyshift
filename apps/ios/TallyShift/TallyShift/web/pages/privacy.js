// pages/privacy.js
import Link from 'next/link'
import Head from 'next/head'

export default function PrivacyPage() {
  return (
    <div className="privacy-page">
      <Head>
        <title>Privacy Policy – TallyShift</title>
      </Head>

      <div className="container">
        <h1>Privacy Policy</h1>
        <p>
          <em>Last updated: {new Date().toLocaleDateString()}</em>
        </p>

        <h2>1. Overview</h2>
        <p>
          Your privacy matters to us. This Privacy Policy explains how{' '}
          <strong>TallyShift</strong> collects, uses, and protects your
          information when you use the app or website.
        </p>

        <h2>2. Information We Collect</h2>
        <p>
          We collect only the information needed to operate and improve
          TallyShift. This may include:
        </p>
        <ul>
          <li>Your name and email when you create an account</li>
          <li>
            Shift data, tips, income, and related inputs you choose to track
          </li>
          <li>
            Subscription or payment details handled securely through Stripe
          </li>
          <li>Basic device and usage data to help us improve performance</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <p>We use your data to:</p>
        <ul>
          <li>Provide and personalize your TallyShift experience</li>
          <li>Maintain your account and track your saved information</li>
          <li>Improve the app and develop new features</li>
          <li>Send essential account or billing emails</li>
          <li>
            Send optional updates or feature announcements (only if you opted
            in)
          </li>
        </ul>

        <h2>4. Data Storage & Security</h2>
        <p>
          Your information is securely stored using <strong>Supabase</strong>{' '}
          and <strong>Stripe</strong>. We follow industry-standard security
          practices to prevent unauthorized access, alteration, or loss of your
          data.
        </p>

        <h2>5. Third-Party Services</h2>
        <p>
          We use trusted third-party services for hosting, analytics, and
          payments (such as Vercel, Supabase, and Stripe). These services may
          collect limited technical data as described in their own privacy
          policies.
        </p>

        <h2>6. Data Retention</h2>
        <p>
          We keep your information for as long as your account is active. You
          can delete your account anytime, and all associated data will be
          permanently removed from our systems within a reasonable period.
        </p>

        <h2>7. Your Rights</h2>
        <p>
          You can request to view, update, or delete your data at any time by
          contacting us at{' '}
          <a href="mailto:support@tallyshift.com">support@tallyshift.com</a>.
        </p>

        <h2>8. Children’s Privacy</h2>
        <p>
          TallyShift is intended for adults working in the service industry. We
          do not knowingly collect information from individuals under 16.
        </p>

        <h2>9. Updates to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Any changes will
          be posted on this page with a revised “last updated” date.
        </p>

        <h2>10. Contact Us</h2>
        <p>
          If you have any questions or concerns, reach out anytime at{' '}
          <a href="mailto:support@tallyshift.com">support@tallyshift.com</a>.
        </p>

        <div className="footer-link">
          <Link href="/">← Back to TallyShift</Link>
        </div>
      </div>

      <style jsx>{`
        .privacy-page {
          padding: 40px 20px;
          max-width: 800px;
          margin: 0 auto;
          color: #111827;
        }
        h1 {
          font-size: 2rem;
          margin-bottom: 0.25em;
        }
        h2 {
          font-size: 1.25rem;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        p,
        li {
          line-height: 1.6;
        }
        ul {
          margin: 0.5em 0 1em 1.5em;
        }
        a {
          color: #2563eb;
        }
        .footer-link {
          margin-top: 2em;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
