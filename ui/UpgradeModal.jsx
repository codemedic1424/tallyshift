// ui/UpgradeModal.jsx
import React from 'react'
import { useUser } from '../lib/useUser'

export default function UpgradeModal({ onClose }) {
  const { user } = useUser()

  // Live Stripe price IDs — replace with your real ones if needed
  const MONTHLY_PRICE_ID = 'price_1SHoYhQaqUr5y4XCeCPStF1G' // monthly sub
  const FOUNDER_PRICE_ID = 'price_1SHoZqQaqUr5y4XCDPBf5kIR' // founder lifetime

  const handleUpgrade = async (priceId, isLifetime) => {
    if (!user) return alert('Please sign in first.')

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          isLifetime,
        }),
      })
      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned:', data)
        alert('Something went wrong creating your checkout session.')
      }
    } catch (err) {
      console.error('Upgrade error:', err)
      alert('Failed to start checkout. Please try again.')
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ textAlign: 'center', padding: '24px 16px' }}
      >
        <div className="h1" style={{ marginBottom: 8 }}>
          Upgrade to TallyShift Pro
        </div>
        <p className="note" style={{ marginBottom: 16 }}>
          Choose your plan type below:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="btn btn-primary"
            onClick={() => handleUpgrade(MONTHLY_PRICE_ID, false)}
          >
            Monthly Subscription – $4.99 / month
          </button>

          <button
            className="btn secondary"
            onClick={() => handleUpgrade(FOUNDER_PRICE_ID, true)}
          >
            Founder Lifetime Access – $49.99 one-time
          </button>

          <button
            className="btn secondary"
            style={{ marginTop: 10 }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
