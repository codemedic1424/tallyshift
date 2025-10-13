// pages/success.js
import Link from 'next/link'

export default function Success() {
  return (
    <div className="page" style={{ textAlign: 'center', padding: '64px 16px' }}>
      <h1>✅ Payment Successful!</h1>
      <p style={{ marginTop: 12 }}>
        Thanks for upgrading to <b>TallyShift Pro</b>.
      </p>
      <p style={{ marginTop: 8 }}>
        You can now access your Pro features — they’ll unlock automatically in
        your account shortly.
      </p>
      <Link
        href="/profile"
        className="btn btn-primary"
        style={{ display: 'inline-block', marginTop: 24 }}
      >
        Return to Profile
      </Link>
    </div>
  )
}
