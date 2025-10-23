// pages/terms.js
import Link from 'next/link'
import Head from 'next/head'

export default function TermsPage() {
  return (
    <div className="terms-page">
      <Head>
        <title>Terms & Conditions – TallyShift</title>
      </Head>

      <div className="container">
        <h1>Terms & Conditions</h1>
        <p>
          <em>Last updated: {new Date().toLocaleDateString()}</em>
        </p>

        <h2>1. Overview</h2>
        <p>
          Welcome to <strong>TallyShift</strong>. By creating an account or
          using this app, you agree to these Terms & Conditions. Please read
          them carefully before using the service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          TallyShift helps service industry workers track tips, shifts, and
          related insights. The app is provided for personal use and financial
          awareness. TallyShift does not provide accounting, tax, or financial
          advice.
        </p>

        <h2>3. Accounts</h2>
        <p>
          To use TallyShift, you must create an account with accurate
          information. You are responsible for maintaining the security of your
          login credentials and any data you enter into the app.
        </p>

        <h2>4. Subscriptions & Payments</h2>
        <p>
          Some features may require a paid subscription. All payments are
          processed securely through our payment provider, Stripe. Subscriptions
          renew automatically unless canceled. You may cancel anytime through
          your account’s billing portal.
        </p>

        <h2>5. Data & Privacy</h2>
        <p>
          We respect your privacy. Your data belongs to you and is only used to
          provide and improve the service. See our{' '}
          <Link href="/privacy">Privacy Policy</Link> for more details.
        </p>

        <h2>6. Acceptable Use</h2>
        <p>
          You agree not to misuse TallyShift or attempt to disrupt, copy, or
          reverse-engineer any part of the app. Please use it responsibly and
          only for lawful purposes.
        </p>

        <h2>7. Disclaimer</h2>
        <p>
          TallyShift is provided “as is” without warranties of any kind. We make
          no guarantees that insights, calculations, or analytics are free from
          error. Always verify important financial information independently.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, TallyShift and its creators
          are not liable for any indirect, incidental, or consequential damages
          arising from your use of the app.
        </p>

        <h2>9. Changes to These Terms</h2>
        <p>
          We may update these Terms occasionally. Continued use of TallyShift
          after changes are published means you accept the new terms.
        </p>

        <h2>10. Contact</h2>
        <p>
          Questions? Reach us anytime at{' '}
          <a href="mailto:support@tallyshift.com">support@tallyshift.com</a>.
        </p>

        <div className="footer-link">
          <Link href="/">← Back to TallyShift</Link>
        </div>
      </div>

      <style jsx>{`
        .terms-page {
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
        p {
          line-height: 1.6;
          margin-bottom: 1em;
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
