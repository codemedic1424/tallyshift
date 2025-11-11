// ui/HeaderBar.js
import { useRouter } from 'next/router'
import { useUser } from '../lib/useUser'
import { supabase } from '../lib/supabase'
import { Crown as CrownIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function HeaderBar({ title }) {
  const router = useRouter()
  const { user } = useUser()
  const [tier, setTier] = useState(null)

  // get plan tier from profile
  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan_tier, pro_override')
        .eq('id', user.id)
        .single()
      if (!error && data) {
        if (data.pro_override) setTier('pro')
        else if (data.plan_tier === 'founder') setTier('founder')
        else if (data.plan_tier === 'pro') setTier('pro')
        else setTier(null)
      }
    })()
  }, [user])

  const isHome = router.pathname === '/' || router.pathname === '/index'

  return (
    <header
      className="header-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'row',
        padding: '12px 16px',
        background: 'var(--bg)',
        boxShadow: 'var(--shadow-soft)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        minHeight: 56,
      }}
    >
      {/* LEFT — TallyShift logo + badge */}
      <div
        className="header-title-group"
        onClick={() => router.push('/dashboard')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') router.push('/dashboard')
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
        }}
      >
        <img
          src="/TallyShiftLogo.svg"
          alt="TallyShift"
          style={{
            height: 22,
            width: 'auto',
            display: 'block',
            objectFit: 'contain',
          }}
        />

        {tier === 'pro' && (
          <span
            className="badge-tier-inline pro"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 3s linear infinite',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              lineHeight: 1,
            }}
          >
            <CrownIcon size={14} /> PRO
          </span>
        )}

        {tier === 'founder' && (
          <span
            className="badge-tier-inline founder"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              background: 'linear-gradient(90deg, #8b5cf6, #3b82f6, #8b5cf6)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 3s linear infinite',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              lineHeight: 1,
            }}
          >
            <CrownIcon size={14} /> FOUNDER
          </span>
        )}
      </div>

      {/* RIGHT — Page title */}
      {!isHome && (
        <div
          className="page-title"
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text)',
            textTransform: 'capitalize',
          }}
        >
          {title}
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: -200% 0%;
          }
        }
      `}</style>
    </header>
  )
}
