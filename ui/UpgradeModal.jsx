// ui/UpgradeModal.jsx
import React, { useState, useRef, useEffect } from 'react'
import { useUser } from '../lib/useUser'

// --- Tooltip Component ---
function Tooltip({ text }) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        marginLeft: 6,
        cursor: 'pointer',
        fontWeight: 600,
        color: '#2764c7',
        borderRadius: '50%',
        width: 16,
        height: 16,
        fontSize: 12,
        lineHeight: '16px',
        textAlign: 'center',
        backgroundColor: '#e6eefc',
      }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={() => setVisible(!visible)} // mobile tap toggle
    >
      ?
      {visible && (
        <span
          style={{
            position: 'absolute',
            bottom: '130%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#333',
            color: '#fff',
            fontSize: 12,
            padding: '10px 12px',
            borderRadius: 8,
            boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
            zIndex: 9999,
            maxWidth: 260, // ✅ max width for wrapping
            minWidth: 160, // ✅ prevents tall skinny shapes
            whiteSpace: 'normal', // ✅ allows wrapping
            lineHeight: 1.4,
            textAlign: 'center',
            wordWrap: 'break-word',
          }}
        >
          {text}
          <span
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              marginLeft: -5,
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #333',
            }}
          />
        </span>
      )}
    </span>
  )
}

export default function UpgradeModal({ onClose }) {
  const { user } = useUser()
  const [showAll, setShowAll] = useState(false)
  const [maxHeight, setMaxHeight] = useState('0px')
  const extraRef = useRef(null)
  const [loading, setLoading] = useState(false)

  // Animate height based on content
  useEffect(() => {
    if (extraRef.current) {
      setMaxHeight(showAll ? `${extraRef.current.scrollHeight}px` : '0px')
    }
  }, [showAll])

  const MONTHLY_PRICE_ID = 'price_1SHoYhQaqUr5y4XCeCPStF1G'
  const FOUNDER_PRICE_ID = 'price_1SHoZqQaqUr5y4XCDPBf5kIR'

  const handleUpgrade = async (priceId, isLifetime) => {
    if (!user) return alert('Please sign in first.')
    try {
      setLoading(true) // ✅ show loading popup
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: user.id, isLifetime }),
      })
      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
      } else {
        alert('Something went wrong creating your checkout session.')
      }
    } catch (err) {
      console.error('Upgrade error:', err)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setLoading(false) // ✅ hide loading popup if error occurs
    }
  }

  const featureStyle = {
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  }
  const checkIcon = (
    <span
      style={{
        display: 'inline-block',
        width: 18,
        height: 18,
        borderRadius: '50%',
        backgroundColor: '#4f8ef7',
        color: 'white',
        fontSize: 12,
        lineHeight: '18px',
        textAlign: 'center',
        marginRight: 8,
      }}
    >
      ✓
    </span>
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
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
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 20,
          width: '100%',
          maxWidth: 800,
          padding: 30,
          position: 'relative',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 14,
            background: 'transparent',
            border: 'none',
            fontSize: 22,
            color: '#999',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2
            style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#111' }}
          >
            Unlock Pro Features
          </h2>
          <p style={{ fontSize: 14, color: '#666', marginTop: 6 }}>
            Start your <strong>7-day free trial</strong> today — cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div
          style={{
            display: 'flex',
            flexDirection: window.innerWidth < 768 ? 'column' : 'row',
            gap: 16,
          }}
        >
          {/* --- Pro --- */}
          <div
            style={{
              flex: 1,
              borderRadius: 16,
              padding: 24,
              background: 'linear-gradient(180deg, #eef4ff 0%, #ffffff 90%)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ width: '100%' }}>
              <h3
                style={{
                  color: '#2764c7',
                  fontSize: 18,
                  marginBottom: 6,
                  textAlign: 'center',
                }}
              >
                TallyShift Pro
              </h3>
              <p
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  margin: '4px 0',
                  textAlign: 'center',
                }}
              >
                $4.99 <span style={{ fontSize: 16, color: '#666' }}>/mo</span>
              </p>

              <p
                style={{
                  fontSize: 13,
                  color: '#666',
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                Includes 7-day free trial - Cancel anytime.
              </p>

              {/* Default features */}
              <div style={{ textAlign: 'left', marginBottom: 6 }}>
                <div style={featureStyle}>
                  {checkIcon} Multi-location tracking
                </div>
                <div style={featureStyle}>{checkIcon} Section Tracking</div>
                <div style={featureStyle}>
                  {checkIcon} Weather Insights
                  <Tooltip text="Location address required. See how you perform based on the weather at your location(s)! Adds advanced insights to track performance by weather reports." />
                </div>
                <div style={featureStyle}>
                  {checkIcon} Schedule integrations
                  <Tooltip text="Automatically sync your work schedule into TallyShift from supported apps (like HotSchedules or 7shifts). If you can export your calendar from your account, TallyShift can accept that .ical link" />
                </div>
              </div>

              {/* Smooth expandable content */}
              <div
                ref={extraRef}
                style={{
                  overflow: 'hidden',
                  transition: 'max-height 0.4s ease',
                  maxHeight,
                }}
              >
                <div style={{ textAlign: 'left', marginTop: 4 }}>
                  <div style={featureStyle}>{checkIcon} CSV export tools</div>
                  <div style={featureStyle}>
                    {checkIcon} All upcoming features
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <button
                  onClick={() => setShowAll(!showAll)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2764c7',
                    fontSize: 13,
                    cursor: 'pointer',
                    marginTop: 8,
                  }}
                >
                  {showAll ? 'Hide features ▲' : 'See all features ▼'}
                </button>
              </div>
            </div>

            {/* Footer button */}
            <button
              onClick={() => handleUpgrade(MONTHLY_PRICE_ID, false)}
              style={{
                background: '#2764c7',
                color: 'white',
                border: 'none',
                borderRadius: 50,
                padding: '10px 22px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 20,
                boxShadow: '0 3px 8px rgba(0,0,0,0.1)',
              }}
            >
              Start Free Trial
            </button>
          </div>

          {/* --- Founder --- */}
          <div
            style={{
              flex: 1,
              borderRadius: 16,
              padding: 24,
              background: 'linear-gradient(180deg, #fff7e0 0%, #ffffff 90%)',
              border: '1px solid #ffd37a',
              boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ width: '100%' }}>
              <h3
                style={{
                  color: '#a06a00',
                  fontSize: 18,
                  marginBottom: 6,
                  textAlign: 'center',
                }}
              >
                Founder – Lifetime Access
              </h3>
              <p
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  margin: '4px 0',
                  textAlign: 'center',
                }}
              >
                $49{' '}
                <span style={{ fontSize: 16, color: '#666' }}>one-time</span>
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: '#666',
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                Support a small startup 💛
              </p>

              <div style={{ textAlign: 'left' }}>
                <div style={featureStyle}>
                  {checkIcon} All Pro features forever
                </div>
                <div style={featureStyle}>
                  {checkIcon} No monthly payments ever
                </div>
                <div style={featureStyle}>
                  {checkIcon} “Founder” badge in app
                </div>
                <div style={featureStyle}>
                  {checkIcon} Future updates included
                </div>
              </div>
            </div>

            <button
              onClick={() => handleUpgrade(FOUNDER_PRICE_ID, true)}
              style={{
                background: '#ffb800',
                color: '#663d00',
                border: 'none',
                borderRadius: 50,
                padding: '10px 22px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 20,
                boxShadow: '0 3px 8px rgba(0,0,0,0.1)',
              }}
            >
              Get Lifetime Access
            </button>
          </div>
        </div>

        {/* Cancel */}
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#777',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Nevermind
          </button>
        </div>
      </div>
      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255,255,255,0.8)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            fontFamily: 'system-ui, sans-serif',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              padding: '22px 28px',
              background: '#fff',
              borderRadius: 14,
              boxShadow: '0 4px 18px rgba(0,0,0,0.12)',
              textAlign: 'center',
              maxWidth: 260,
              animation: 'slideUp 0.25s ease-out',
            }}
          >
            <div
              id="loading-text"
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#111',
                marginBottom: 6,
                transition: 'opacity 0.3s ease',
              }}
            >
              Redirecting…
            </div>
            <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
              Taking you to Stripe for secure checkout.
            </p>

            {/* Spinner */}
            <div
              style={{
                margin: '16px auto 0',
                width: 30,
                height: 30,
                border: '3px solid #e1e1e1',
                borderTopColor: '#2764c7', // ✅ your TallyShift blue
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />

            {/* Hidden "Redirected" success text that fades in after 2.5s */}
            <div
              id="redirected-text"
              style={{
                display: 'none',
                marginTop: 10,
                fontSize: 13,
                color: '#2764c7',
                fontWeight: 500,
                opacity: 0,
                transition: 'opacity 0.5s ease',
              }}
            >
              Redirected! ✈️
            </div>
          </div>

          {/* Inline animation keyframes */}
          <style>
            {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes slideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}
          </style>

          {/* JS-controlled delayed message */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
          setTimeout(() => {
            const txt = document.getElementById('redirected-text');
            if (txt) {
              txt.style.display = 'block';
              requestAnimationFrame(() => (txt.style.opacity = 1));
            }
          }, 2500);
        `,
            }}
          />
        </div>
      )}
    </div>
  )
}
