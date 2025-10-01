// pages/index.js
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useUser } from '../lib/useUser'
import { useSettings } from '../lib/useSettings'
import { supabase } from '../lib/supabase'
import HeaderBar from '../ui/HeaderBar'
import TabBar from '../ui/TabBar'
import Avatar from '../ui/Avatar'
import FAB from '../ui/FAB'
import ShiftDetailsModal from '../ui/ShiftDetailsModal'

// Parse 'YYYY-MM-DD' as a local date (avoid UTC shift)
function parseDateOnlyLocal(s) {
  if (!s) return new Date(NaN)
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export default function Home() {
  const { user, loading: userLoading } = useUser()
  const { settings } = useSettings()
  const router = useRouter()

  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [stats, setStats] = useState({ net: 0, hours: 0, eff: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  // ShiftDetails modal state
  const [selectedShift, setSelectedShift] = useState(null)

  // Onboarding modal state
  const [onboardOpen, setOnboardOpen] = useState(false)
  const [onFirst, setOnFirst] = useState('')
  const [onLast, setOnLast] = useState('')
  const [onSaving, setOnSaving] = useState(false)
  const [onErr, setOnErr] = useState(null)

  // Currency & tip settings for the modal
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
  const payoutMode = settings?.payout_mode || 'both'
  const showCashInput = payoutMode === 'both' || payoutMode === 'cash_only'
  const showCardInput = payoutMode === 'both' || payoutMode === 'card_only'
  const tipsOnPaycheck = payoutMode === 'on_paycheck'
  const defaultTipoutPct =
    typeof settings?.default_tipout_pct === 'number'
      ? settings.default_tipout_pct
      : null

  // SAFETY: while auth status is loading, render a tiny splash (prevents flashes)
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

  // If not logged in, AuthGuard should redirect; bail here too
  if (!user) return null

  // Load profile + decide onboarding (wait for router to be ready)
  useEffect(() => {
    if (!router.isReady) return
    let mounted = true
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name,last_name')
        .eq('id', user.id)
        .maybeSingle()

      const f = data?.first_name || ''
      const l = data?.last_name || ''
      if (!mounted) return

      setFirst(f)
      setLast(l)
      setOnFirst(f)
      setOnLast(l)

      const wantsOnboard = router.query.onboard === '1'
      const shouldOnboard = !f || !l || wantsOnboard
      setOnboardOpen(!!shouldOnboard)

      if (wantsOnboard) {
        router.replace('/', undefined, { shallow: true })
      }
    })()
    return () => {
      mounted = false
    }
  }, [user, router.isReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Loader to fetch this-month stats + recent (scoped to user)
  async function loadStatsAndRecent() {
    setLoading(true)
    // first day of current month (local)
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

  // Initial load
  useEffect(() => {
    loadStatsAndRecent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const monthLabel = useMemo(() => {
    const now = new Date()
    return now.toLocaleString(undefined, { month: 'long', year: 'numeric' })
  }, [])

  const openAddToday = () => {
    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(today.getDate()).padStart(2, '0')}`
    // no view param -> calendar uses user's default view
    router.push(`/calendar?d=${iso}&add=1`)
  }

  async function saveOnboard(e) {
    e?.preventDefault()
    setOnErr(null)
    const f = onFirst.trim()
    const l = onLast.trim()
    if (!f || !l) {
      setOnErr('Please enter both first and last name.')
      return
    }
    setOnSaving(true)
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, first_name: f, last_name: l })
    setOnSaving(false)
    if (error) {
      setOnErr(error.message)
      return
    }
    setFirst(f)
    setLast(l)
    setOnboardOpen(false)
  }

  // --- ShiftDetailsModal handlers (edit/delete) ---
  async function saveEditedShiftById(shiftId, payload) {
    const { data, error } = await supabase
      .from('shifts')
      .update(payload)
      .eq('id', shiftId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      alert(error.message)
      return
    }
    // Update local list optimistically
    setRecent((prev) => prev.map((r) => (r.id === data.id ? data : r)))
    // Refresh stats
    loadStatsAndRecent()
    setSelectedShift(data)
  }

  async function deleteShiftById(shiftId) {
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', shiftId)
      .eq('user_id', user.id)

    if (error) {
      alert(error.message)
      return
    }
    setRecent((prev) => prev.filter((r) => r.id !== shiftId))
    loadStatsAndRecent()
    setSelectedShift(null)
  }

  return (
    <div className="page">
      <HeaderBar />

      {/* HERO */}
      <div className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-top">
            <div>
              <div className="home-hello">
                {first ? `Hey, ${first}!` : 'Welcome'}
              </div>
              <div className="home-sub">
                Track tips fast. Know your true hourly.
              </div>
            </div>
            <Avatar first={first} last={last} />
          </div>
          <div className="home-actions"></div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="container">
        {/* Fallback nudge only if user dismissed modal without filling */}
        {user && (!first || !last) && !onboardOpen && (
          <div
            className="card"
            style={{ borderColor: '#fde68a', background: 'var(--card-warn)' }}
          >
            <div className="h2" style={{ fontSize: 16 }}>
              Complete your profile
            </div>
            <div className="note" style={{ margin: '6px 0 10px' }}>
              Add your first & last name so your greeting shows up.
            </div>
            <button className="btn" onClick={() => setOnboardOpen(true)}>
              Update now
            </button>
          </div>
        )}

        {/* This month stats */}
        <div className="card">
          <div
            className="h2"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{monthLabel}</span>
          </div>
          <div className="two grid" style={{ marginTop: 8 }}>
            <div className="card home-stat">
              <div className="note">Net tips</div>
              <div className="h1">
                {loading ? '—' : currencyFormatter.format(stats.net)}
              </div>
            </div>
            <div className="card home-stat">
              <div className="note">Hours</div>
              <div className="h1">{loading ? '—' : stats.hours.toFixed(1)}</div>
            </div>
          </div>
          <div className="card home-stat">
            <div className="note">Effective hourly</div>
            <div className="h1">
              {loading ? '—' : `${currencyFormatter.format(stats.eff)}/h`}
            </div>
          </div>
        </div>

        {/* Recent shifts */}
        <div className="card">
          <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
            Recent shifts
          </div>
          {(!user || loading) && <div className="note">Loading…</div>}
          {user && !loading && recent.length === 0 && (
            <div className="note">No shifts yet. Add your first one!</div>
          )}
          {recent.map((r) => {
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSelectedShift(r)
                }}
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
          })}
        </div>
      </div>

      {/* Floating + */}
      <FAB onAddShift={openAddToday} />

      {/* Onboarding Modal (only when logged in AND missing names) */}
      {user && onboardOpen && (!first || !last) && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="h1" style={{ marginBottom: 8 }}>
              Finish your profile
            </div>
            <div className="note" style={{ marginBottom: 12 }}>
              Add your name so we can personalize your dashboard.
            </div>
            <form className="grid" onSubmit={saveOnboard}>
              <input
                className="input"
                placeholder="First name"
                value={onFirst}
                onChange={(e) => setOnFirst(e.target.value)}
                required
              />
              <input
                className="input"
                placeholder="Last name"
                value={onLast}
                onChange={(e) => setOnLast(e.target.value)}
                required
              />
              <button className="btn" type="submit" disabled={onSaving}>
                {onSaving ? 'Saving…' : 'Save'}
              </button>
            </form>
            {onErr && (
              <div
                className="card"
                style={{
                  marginTop: 10,
                  background: '#fee2e2',
                  borderColor: '#fecaca',
                }}
              >
                Error: {onErr}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shift Details Modal (reuse from calendar) */}
      {selectedShift && (
        <ShiftDetailsModal
          shift={selectedShift}
          onClose={() => setSelectedShift(null)}
          onSave={(payload) => saveEditedShiftById(selectedShift.id, payload)}
          onDelete={() => deleteShiftById(selectedShift.id)}
          currencyFormatter={currencyFormatter}
          tipsOnPaycheck={tipsOnPaycheck}
          showCashInput={showCashInput}
          showCardInput={showCardInput}
          defaultTipoutPct={defaultTipoutPct}
        />
      )}

      <TabBar />
    </div>
  )
}
