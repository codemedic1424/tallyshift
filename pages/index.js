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
import RecentShiftCard from '../ui/RecentShiftCard'
import UpgradeModal from '../ui/UpgradeModal'
import NextShiftStrip from '../ui/NextShiftStrip'
import AddShiftModal from '../ui/AddShiftModal'

function isLikelyIcsUrl(u) {
  if (!u || typeof u !== 'string') return false
  const s = u.trim()
  return (
    s.length > 8 &&
    (s.toLowerCase().endsWith('.ics') || /^https?:\/\//i.test(s))
  )
}

function dateKeyLocal(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function extractIcsUrlsFromSettings(settings) {
  const urls = new Set()

  // Per-location (your actual structure)
  const locs = Array.isArray(settings?.locations) ? settings.locations : []
  for (const l of locs) {
    const enabled = !!l?.calendar_sync_enabled
    const url = l?.calendar_feed_url
    if (enabled && isLikelyIcsUrl(url)) {
      urls.add(String(url).trim())
    }
  }

  return Array.from(urls)
}

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
  const [latest, setLatest] = useState(null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [nextShift, setNextShift] = useState(null)
  const [hideNextShiftCard, setHideNextShiftCard] = useState(false) // persistent dismiss
  const [isPro, setIsPro] = useState(false)
  const [hasCalSync, setHasCalSync] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addDate, setAddDate] = useState(null)
  const [prefillShift, setPrefillShift] = useState(null)

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

  useEffect(() => {
    if (!settings) return
    const urls = extractIcsUrlsFromSettings(settings)
    setHasCalSync(urls.length > 0)
  }, [settings])

  // Load profile info
  // Load or create profile and trigger onboarding
  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'first_name,last_name,avatar_path,first_time_complete,walkthrough_seen,plan_tier',
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
      setIsPro(
        ['pro', 'founder'].includes((data?.plan_tier || '').toLowerCase()),
      )

      // ✅ Trigger onboarding modals based on flags
      if (!data.first_time_complete) {
        setShowNameModal(true)
      } else if (!data.walkthrough_seen) {
        setShowWalkthrough(true)
      }
    })()
  }, [user?.id])
  useEffect(() => {
    const v = localStorage.getItem('hide_next_shift_card')
    setHideNextShiftCard(v === '1')
  }, [])
  useEffect(() => {
    // If user turns calendar sync ON, always show the strip again
    if (hasCalSync && hideNextShiftCard) {
      localStorage.removeItem('hide_next_shift_card')
      setHideNextShiftCard(false)
    }
  }, [hasCalSync, hideNextShiftCard])

  const dismissNextShift = () => {
    // Only allow dismissal when calendar sync is OFF
    if (!hasCalSync) {
      localStorage.setItem('hide_next_shift_card', '1')
      setHideNextShiftCard(true)
    }
  }

  // ✅ Load avatar once profile is ready
  useEffect(() => {
    if (!profile?.avatar_path) return

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(profile.avatar_path)

    if (publicUrlData?.publicUrl) {
      setAvatarUrl(publicUrlData.publicUrl)
    } else {
      // fallback in case getPublicUrl fails
      setAvatarUrl(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_path}`,
      )
    }
  }, [profile?.avatar_path])

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

    setStats({ net, hours, eff })
    setRecent(last5 || [])
    setLatest(last5?.[0] || null) // ← add this line
    setLoading(false)
  }
  async function loadNextShift() {
    if (!hasCalSync || !user) {
      setNextShift(null)
      return
    }

    function openAddFromNextShift(ns) {
      const start = ns.start_ts ? new Date(ns.start_ts) : null
      const end = ns.end_ts ? new Date(ns.end_ts) : null
      const hours =
        start && end ? (end.getTime() - start.getTime()) / 3600000 : ''

      const isoDate = start ? dateKeyLocal(start) : dateKeyLocal(new Date())

      setPrefillShift({
        date: isoDate, // 'YYYY-MM-DD'
        hours: hours || '',
        location_id: ns.location_id || '',
        location_name: ns.location_name || '',
        notes: ns.title || '',
        summary: ns.title || '',
        original_calendar_id: ns.id || null, // for deletion after save
        original_calendar_external_id: ns.external_id, // prevents re-import
      })

      setAddDate(isoDate)
      setAddOpen(true)
    }

    // resolve location name from settings.locations
    const locName = (locId) => {
      const loc = (settings?.locations || []).find((l) => l.id === locId)
      return loc?.name || ''
    }

    try {
      const nowIso = new Date().toISOString() // e.g. "2025-11-09T22:55:00.000Z"
      const today = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"

      const { data, error } = await supabase
        .from('calendar_shifts')
        .select(
          'id, summary, start_time, end_time, location_id, is_all_day, date, external_id',
        )
        .eq('user_id', user.id)
        .or(
          [
            // starts in the future
            `start_time.gte.${nowIso}`,
            // currently in progress (start <= now < end)
            `and(start_time.lte.${nowIso},end_time.gt.${nowIso})`,
            // all-day events today or later
            `and(is_all_day.eq.true,date.gte.${today})`,
          ].join(','),
        )
        // Prefer timed events first, then all-day by date
        .order('start_time', { ascending: true, nullsFirst: false })
        .order('date', { ascending: true, nullsFirst: false })
        .limit(1)

      if (error) throw error

      const ev = data?.[0]
      if (!ev) return setNextShift(null)

      setNextShift({
        id: ev.id,
        title: ev.summary || 'Scheduled shift',
        start_ts: ev.start_time || (ev.date ? `${ev.date}T00:00:00Z` : null),
        end_ts: ev.end_time || null,
        location_id: ev.location_id || null,
        location_name: locName(ev.location_id),
        external_id: ev.external_id || null,
      })
    } catch (e) {
      console.error('loadNextShift failed:', e)
      setNextShift(null)
    }
  }
  async function handleAddSave(payload) {
    if (!user) return alert('Sign in first')

    const originalCalendarId = prefillShift?.original_calendar_id || null

    const dbRow = {
      user_id: user.id,
      ...payload,
    }

    // Maintain linkage so the same calendar event won’t be re-imported
    if (prefillShift?.original_calendar_external_id) {
      dbRow.imported_from_calendar_id =
        prefillShift.original_calendar_external_id
    } else if (prefillShift?.original_calendar_id) {
      dbRow.imported_from_calendar_id = prefillShift.original_calendar_id
    }

    const { data, error } = await supabase
      .from('shifts')
      .insert(dbRow)
      .select('*')
      .single()

    if (error) {
      alert(error.message)
      return
    }

    // If created from an upcoming calendar entry, delete that row
    if (originalCalendarId) {
      const { error: delErr } = await supabase
        .from('calendar_shifts')
        .delete()
        .eq('id', originalCalendarId)
        .eq('user_id', user.id)

      if (delErr)
        console.error('Error deleting imported calendar shift:', delErr)
    }

    // Close modal & refresh UI bits
    setPrefillShift(null)
    setAddOpen(false)
    if (hasCalSync) loadNextShift()
    loadStatsAndRecent()
  }

  useEffect(() => {
    if (!user) return
    // Only try to load upcoming events if calendar is connected
    if (hasCalSync) loadNextShift()
  }, [user?.id, hasCalSync])

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
  function openAddFromNextShift(ns) {
    const start = ns.start_ts ? new Date(ns.start_ts) : null
    const end = ns.end_ts ? new Date(ns.end_ts) : null
    const hours =
      start && end ? (end.getTime() - start.getTime()) / 3600000 : ''

    const isoDate = start ? dateKeyLocal(start) : dateKeyLocal(new Date())

    setPrefillShift({
      date: isoDate,
      hours: hours || '',
      location_id: ns.location_id || '',
      location_name: ns.location_name || '',
      notes: ns.title || '',
      summary: ns.title || '',
      original_calendar_id: ns.id || null,
      original_calendar_external_id: ns.external_id || null,
    })

    setAddDate(isoDate)
    setAddOpen(true)
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
              onError={() => setAvatarUrl(null)} // 👈 resets to fallback if broken
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

      {/* Next Shift / Calendar CTA (dismissible) */}
      {!hideNextShiftCard && (
        <NextShiftStrip
          nextShift={nextShift}
          isPro={isPro}
          hasCalendarSync={hasCalSync}
          onUpgrade={() => setShowUpgrade(true)}
          onDismiss={dismissNextShift}
          canDismiss={!hasCalSync}
          onAdd={openAddFromNextShift}
        />
      )}

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

        {/* Most Recent Shift (replaces Recent Shifts) */}
        <div className="card">
          {loading ? (
            <div className="note">Loading…</div>
          ) : latest ? (
            <RecentShiftCard
              shift={latest}
              currencyFormatter={currencyFormatter}
            />
          ) : (
            <div className="note">
              No shifts yet. Click the blue “+” button to add your first one!
            </div>
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
      {addOpen && (
        <AddShiftModal
          open={true}
          initialDate={addDate}
          initialValues={prefillShift || {}}
          onClose={() => {
            setAddOpen(false)
            setPrefillShift(null)
          }}
          onSave={handleAddSave}
        />
      )}

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      {showWalkthrough && (
        <WalkthroughModal
          userId={user.id}
          onFinish={() => setShowWalkthrough(false)}
        />
      )}
    </div>
  )
}
