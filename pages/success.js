// pages/success.js
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export default function Success() {
  const router = useRouter()
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    // Show confetti briefly on load
    setShowConfetti(true)
    const timer = setTimeout(() => setShowConfetti(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #eef4ff 0%, #ffffff 100%)',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 20,
          boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
          textAlign: 'center',
          maxWidth: 420,
          width: '100%',
          padding: '40px 28px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 🎉 Confetti effect */}
        {showConfetti && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              backgroundImage:
                'radial-gradient(circle at 10% 10%, #4f8ef7 1px, transparent 1px), radial-gradient(circle at 80% 20%, #ffb800 1px, transparent 1px), radial-gradient(circle at 30% 90%, #4f8ef7 1px, transparent 1px), radial-gradient(circle at 60% 60%, #ffb800 1px, transparent 1px)',
              backgroundSize: '100px 100px',
              opacity: 0.6,
              animation: 'confetti 2s ease forwards',
            }}
          />
        )}

        <CheckCircle2
          size={56}
          color="#2764c7"
          style={{ margin: '0 auto 16px' }}
        />

        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#111',
            marginBottom: 10,
          }}
        >
          Welcome to <span style={{ color: '#2764c7' }}>TallyShift Pro</span>!
        </h1>
        <p
          style={{
            color: '#555',
            fontSize: 15,
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          Your upgrade was successful. You now have access to all Pro features,
          insights, and tools.
        </p>

        <button
          onClick={() => {
            localStorage.setItem('tallyshift-show-upgrade-animation', 'true')
            router.push('/profile')
          }}
          style={{
            background: '#2764c7',
            color: 'white',
            border: 'none',
            borderRadius: 50,
            padding: '12px 26px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(39,100,199,0.3)',
            transition: 'background 0.2s ease, transform 0.2s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Start Using TallyShift Pro →
        </button>

        <style>{`
          @keyframes confetti {
            0% { background-position: 0 0, 0 0, 0 0, 0 0; opacity: 0.8; }
            100% { background-position: 100px 150px, 80px 180px, 120px 90px, 60px 120px; opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  )
}
