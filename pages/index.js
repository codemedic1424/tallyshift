// pages/index.js
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useSpring, animated } from '@react-spring/web'
import { useUser } from '../lib/useUser'
import { useSettings } from '../lib/useSettings'
import { supabase } from '../lib/supabase'
import HeaderBar from '../ui/HeaderBar'
import TabBar from '../ui/TabBar'
import FAB from '../ui/FAB'
import ProfileCompletionModal from '../ui/ProfileCompletionModal'
import WalkthroughModal from '../ui/WalkthroughModal'

function parseDateOnlyLocal(s) {
  if (!s) return new Date(NaN)
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function AnimatedNumber({ value, formatter }) {
  const [done, setDone] = useState(false)
  const { val } = useSpring({
    from: { val: 0 },
    to: { val: value },
    config: { mass: 1, tension: 90, friction: 35 },
    onRest: () => setDone(true),
  })

  return (
    <animated.span
      style={{
        display: 'inline-block',
        transition: 'all 0.8s ease',
        transform: done ? 'scale(1.20)' : 'scale(1)',
        color: done ? '#22c55e' : 'inherit',
        textShadow: done ? '0 0 10px rgba(34,197,94,0.4)' : 'none',
        fontSize: done ? '1.15em' : '1em',
      }}
    >
      {val.to((v) => (formatter ? formatter(v) : v.toFixed(2)))}
    </animated.span>
  )
}

export default function Home() {
  const { user, loading: userLoading } = useUser()
  const { settings } = useSettings()
  const router = useRouter()

  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ net: 0, hours: 0, eff: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedShift, setSelectedShift] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [showNameModal, setShowNameModal] = useState(false)
  const [showWalkthrough, setShowWalkthrough] = useState(false)

  const currencyCode = settings?.currency || 'USD'
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [currencyCode],
  )

  // Load profile info
  // Load or create profile and trigger onboarding
  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'first_name,last_name,avatar_path,first_time_complete,walkthrough_seen',
        )
        .eq('id', user.id)
        .maybeSingle() // returns null if no row

      if (error && error.code !== 'PGRST116') {
        console.error('Profile load error:', error)
        return
      }

      // 🚀 No profile yet — create a blank one and trigger name modal
      if (!data) {
        const { error: insertErr } = await supabase.from('profiles').insert({
          id: user.id,
          first_name: null,
          last_name: null,
          first_time_complete: false,
          walkthrough_seen: false,
        })
        if (insertErr) console.error('Profile insert error:', insertErr)
        setShowNameModal(true)
        return
      }

      // 🧭 Existing profile
      setProfile(data)

      // ✅ Trigger onboarding modals based on flags
      if (!data.first_time_complete) {
        setShowNameModal(true)
      } else if (!data.walkthrough_seen) {
        setShowWalkthrough(true)
      }

      // Load avatar if present
      if (data.avatar_path) {
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(data.avatar_path)
        setAvatarUrl(publicUrlData.publicUrl)
      }
    })()
  }, [user?.id])

  async function loadStatsAndRecent() {
    setLoading(true)
    const now = new Date()
    const startISO = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10)

    const { data: monthRows } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startISO)
      .order('date', { ascending: true })

    const net = (monthRows || []).reduce(
      (a, r) =>
        a +
        (Number(r.cash_tips || 0) +
          Number(r.card_tips || 0) -
          Number(r.tip_out_total || 0)),
      0,
    )
    const hours = (monthRows || []).reduce(
      (a, r) => a + Number(r.hours || 0),
      0,
    )
    const eff = hours > 0 ? net / hours : 0

    const { data: last5 } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(5)

    setStats({ net, hours, eff })
    setRecent(last5 || [])
    setLoading(false)
  }

  useEffect(() => {
    if (user) loadStatsAndRecent()
  }, [user?.id])

  const monthLabel = new Date().toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const openAddToday = () => {
    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(today.getDate()).padStart(2, '0')}`
    router.push(`/calendar?d=${iso}&add=1`)
  }

  if (userLoading) {
    return (
      <div className="page">
        <HeaderBar />
        <div className="container">
          <div className="card">Loading…</div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="page">
      <HeaderBar />

      {/* Hero bar */}
      <div className="hero-bar">
        <div className="hero-content">
          <div>
            <div className="hero-greeting">
              {profile?.first_name
                ? `Hey, ${profile.first_name}!`
                : 'Hey there!'}
            </div>
            <div className="hero-sub">{monthLabel}</div>
          </div>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="User Avatar"
              className="hero-avatar"
              width={72}
              height={72}
              onClick={() => router.push('/profile')}
            />
          ) : (
            <div
              className="hero-avatar-fallback"
              onClick={() => router.push('/profile')}
            >
              {profile?.first_name?.[0]?.toUpperCase() || ''}
              {profile?.last_name?.[0]?.toUpperCase() || ''}
            </div>
          )}
        </div>
      </div>

      <div className="container" style={{ display: 'grid', gap: 16 }}>
        {/* Performance Summary */}
        <div className="card perf-card">
          <h2 className="perf-title">This Month</h2>
          <div className="perf-stack">
            <div className="stat-block">
              <div className="note">Net Tips</div>
              <div className="h1">
                {loading ? (
                  '—'
                ) : (
                  <AnimatedNumber
                    value={stats.net}
                    formatter={(v) => currencyFormatter.format(v)}
                  />
                )}
              </div>
            </div>
            <div className="stat-block">
              <div className="note">Hours</div>
              <div className="h1">{loading ? '—' : stats.hours.toFixed(1)}</div>
            </div>
            <div className="stat-block">
              <div className="note">Effective Hourly</div>
              <div className="h1">
                {loading ? '—' : `${currencyFormatter.format(stats.eff)}/h`}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Shifts */}
        <div className="card">
          <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
            Recent Shifts
          </div>
          {loading ? (
            <div className="note">Loading…</div>
          ) : recent.length === 0 ? (
            <div className="note">
              No shifts yet. Click the blue “+” button to add your first one!
            </div>
          ) : (
            recent.map((r) => {
              const net =
                Number(r.cash_tips || 0) +
                Number(r.card_tips || 0) -
                Number(r.tip_out_total || 0)
              const eff = Number(r.hours || 0) > 0 ? net / Number(r.hours) : 0
              return (
                <div
                  key={r.id}
                  className="card home-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedShift(r)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="home-row-left">
                    <div className="home-row-date">
                      {parseDateOnlyLocal(r.date).toLocaleDateString()}
                    </div>
                    {r.notes && (
                      <div
                        className="note"
                        style={{
                          marginTop: 2,
                          maxWidth: 260,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {r.notes}
                      </div>
                    )}
                  </div>
                  <div className="home-row-right">
                    <div className="home-row-amt">
                      {currencyFormatter.format(net)}
                    </div>
                    <div className="note">
                      {Number(r.hours || 0).toFixed(2)}h ·{' '}
                      {currencyFormatter.format(eff)}/h
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <FAB onAddShift={openAddToday} />
      <TabBar />

      <style jsx>{`
        .hero-bar {
          background: linear-gradient(135deg, #2563eb 0%, #22c55e 100%);
          color: #fff;
          padding: 18px 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        .hero-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .hero-greeting {
          font-size: 22px;
          font-weight: 600;
        }
        .hero-sub {
          font-size: 14px;
          opacity: 0.9;
        }
        .hero-avatar {
          border-radius: 50%;
          border: 3px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.25);
          object-fit: cover;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }
        .hero-avatar:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }
        .perf-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
          padding: 20px;
          text-align: center;
        }
        .perf-title {
          margin-bottom: 16px;
          font-size: 17px;
          font-weight: 600;
        }
        .perf-stack {
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-items: center;
        }
        .stat-block {
          width: 100%;
        }
        .hero-avatar-fallback {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: white;
          font-weight: 700;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 3px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.25);
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }
        .hero-avatar-fallback:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }
      `}</style>
      {showNameModal && (
        <ProfileCompletionModal
          userId={user.id}
          onComplete={() => {
            setShowNameModal(false)
            setShowWalkthrough(true)
          }}
        />
      )}

      {showWalkthrough && (
        <WalkthroughModal
          userId={user.id}
          onFinish={() => setShowWalkthrough(false)}
        />
      )}
    </div>
  )
}
