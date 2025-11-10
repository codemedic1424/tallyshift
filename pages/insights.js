// pages/insights.js
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '../lib/useUser'
import { useSettings } from '../lib/useSettings'
import { supabase } from '../lib/supabase'
import HeaderBar from '../ui/HeaderBar'
import TabBar from '../ui/TabBar'
import ShiftDetailsModal from '../ui/ShiftDetailsModal'
import PaceSettingsModal from '../ui/PaceSettingsModal'
import { useSpring, animated } from '@react-spring/web'
import Seg from '../ui/Seg'

function AnimatedNumber({ value, formatter }) {
  const [done, setDone] = useState(false)

  const { val } = useSpring({
    from: { val: 0 },
    to: { val: value },
    config: { mass: 1, tension: 90, friction: 35 },
    onRest: () => {
      setDone(true)
      setTimeout(() => setDone(true))
    },
  })

  return (
    <animated.span
      style={{
        display: 'inline-block',
        transition: 'all 0.8s ease',
        transform: done ? 'scale(1.20)' : 'scale(1)',
        color: done ? '#22c55e' : 'inherit',
        textShadow: done ? '0 0 10px rgba(34,197,94,0.4)' : 'none',
        fontSize: done ? '1.15em' : '1em', // adds that little size pop
      }}
    >
      {val.to((v) =>
        formatter
          ? formatter(Number(v.toFixed(2))) + (v % 1 === 0 ? '.00' : '') // 👈 add .00 if it's a whole number
          : v.toFixed(2),
      )}
    </animated.span>
  )
}

// ---- date utils (local-safe) ----
function parseDateOnlyLocal(s) {
  if (!s) return new Date(NaN)
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
function isoDate(d) {
  const x = new Date(d)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function firstOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function lastOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function firstOfYear(d) {
  return new Date(d.getFullYear(), 0, 1)
}

// ---- small sparkline ----
function Sparkline({
  values,
  width = 320,
  height = 60,
  stroke = 'currentColor',
}) {
  if (!values || values.length === 0) return null
  const max = Math.max(1, ...values)
  const min = Math.min(0, ...values)
  const dx = width / (values.length - 1 || 1)
  const scaleY = (v) =>
    max === min ? height / 2 : height - ((v - min) / (max - min)) * height
  const points = values.map((v, i) => `${i * dx},${scaleY(v)}`).join(' ')
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" />
    </svg>
  )
}

const TF = {
  THIS_MONTH: 'this_month',
  LAST_3: 'last_3',
  YTD: 'ytd',
}
// ---- PaceCard ----
function PaceCard({ rows, currencyFormatter, settings }) {
  const [open, setOpen] = useState(false)
  const [paceType, setPaceType] = useState('monthly')
  const [expectedShifts, setExpectedShifts] = useState(20)

  // Load saved prefs
  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedType = localStorage.getItem('pace_type')
    const savedShifts = Number(localStorage.getItem('pace_expected_shifts'))
    if (savedType === 'weekly' || savedType === 'monthly')
      setPaceType(savedType)
    if (!Number.isNaN(savedShifts) && savedShifts > 0) {
      setExpectedShifts(savedShifts)
    }
  }, [])

  // Determine week start
  const weekStartsOnMonday = settings?.week_start === 'monday'
  const today = new Date()
  let relevantShifts = rows

  if (paceType === 'weekly') {
    const currentDay = today.getDay()
    const offset = weekStartsOnMonday ? currentDay - 1 : currentDay
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - (offset < 0 ? 6 : offset))
    const startIso = startOfWeek.toISOString().split('T')[0]
    relevantShifts = rows.filter((r) => r.date >= startIso)
  } else {
    const month = today.getMonth()
    const year = today.getFullYear()
    relevantShifts = rows.filter((r) => {
      const d = parseDateOnlyLocal(r.date)
      return d.getMonth() === month && d.getFullYear() === year
    })
  }

  const totalNet = relevantShifts.reduce(
    (a, r) =>
      a +
      (Number(r.cash_tips || 0) +
        Number(r.card_tips || 0) -
        Number(r.tip_out_total || 0)),
    0,
  )
  const shiftCount = relevantShifts.length
  const avgPerShift = shiftCount > 0 ? totalNet / shiftCount : 0
  const projectedTotal = avgPerShift * expectedShifts

  const title = paceType === 'weekly' ? 'Weekly Pace' : 'Monthly Pace'

  return (
    <>
      <div
        className="card pace-card"
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
      >
        <div className="edit-gear">
          <span className="gear-icon">⚙</span>
        </div>

        <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
          {title}
        </div>

        {shiftCount === 0 ? (
          <div className="note">No shifts recorded yet.</div>
        ) : (
          <>
            <div className="note" style={{ marginBottom: 6 }}>
              {shiftCount} shift{shiftCount === 1 ? '' : 's'} so far
            </div>
            <div className="h1" style={{ marginBottom: 4 }}>
              On pace for {currencyFormatter.format(projectedTotal)}
            </div>
            <div className="note">
              Avg/shift {currencyFormatter.format(avgPerShift)} ·{' '}
              {expectedShifts} expected {paceType === 'weekly' ? '/wk' : '/mo'}
            </div>
          </>
        )}
      </div>

      <PaceSettingsModal
        open={open}
        onClose={() => setOpen(false)}
        paceType={paceType}
        setPaceType={setPaceType}
        expectedShifts={expectedShifts}
        setExpectedShifts={setExpectedShifts}
      />

      {/* Scoped styles for this card */}
      <style jsx>{`
        .pace-card {
          position: relative;
          cursor: pointer;
          transition:
            transform 0.1s ease,
            box-shadow 0.1s ease;
        }
        .pace-card:active {
          transform: scale(0.98);
        }
        .edit-gear {
          box-shadow: 0 2px 8px rgba(34, 197, 94, 0.25);
          position: absolute;
          top: 10px;
          right: 10px;
          background: #ffffff;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(0, 0, 0, 0.08);
          pointer-events: none; /* ensures clicks still open the card */
        }
        .gear-icon {
          font-size: 16px;
          color: #4b5563;
          opacity: 0.9;
        }
      `}</style>
    </>
  )
}

export default function Insights() {
  const { user, loading } = useUser()
  const { settings } = useSettings()

  const [timeframe, setTimeframe] = useState(TF.THIS_MONTH)
  const [rows, setRows] = useState([])
  const [compareRows, setCompareRows] = useState([]) // previous period for % delta
  const [selectedShift, setSelectedShift] = useState(null)
  const [fetching, setFetching] = useState(false)

  // Currency & modal settings
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

  // ---- timeframe to ranges (and comparison range) ----
  function getRanges(tf) {
    const now = new Date()
    if (tf === TF.THIS_MONTH) {
      const start = firstOfMonth(now)
      const end = lastOfMonth(now)
      const prevRef = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const pStart = firstOfMonth(prevRef)
      const pEnd = lastOfMonth(prevRef)
      return { start, end, pStart, pEnd }
    }
    if (tf === TF.LAST_3) {
      const end = parseDateOnlyLocal(isoDate(new Date()))
      const start = addDays(end, -89)
      const pEnd = addDays(start, -1)
      const pStart = addDays(pEnd, -89)
      return { start, end, pStart, pEnd }
    }
    const end = parseDateOnlyLocal(isoDate(new Date()))
    const start = firstOfYear(end)
    const lastYear = end.getFullYear() - 1
    const pStart = new Date(lastYear, 0, 1)
    const pEnd = new Date(lastYear, end.getMonth(), end.getDate())
    return { start, end, pStart, pEnd }
  }
  // ---- tag utils ----
  // Accepts: array of strings/objects, JSON stringified array, or CSV string
  function getTagList(val) {
    if (!val) return []

    const toName = (x) =>
      typeof x === 'object' && x !== null
        ? String(x.name ?? x.label ?? x.title ?? '').trim()
        : String(x ?? '').trim()

    if (Array.isArray(val)) return val.map(toName).filter(Boolean)

    if (typeof val === 'string') {
      // Try JSON array first
      try {
        const parsed = JSON.parse(val)
        if (Array.isArray(parsed)) return parsed.map(toName).filter(Boolean)
      } catch {}
      // Fallback CSV
      return val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }

    return []
  }

  // Normalize keys so colors match regardless of case/spacing
  const normTagKey = (s) =>
    String(s || '')
      .trim()
      .toLowerCase()

  async function fetchRange(tf) {
    if (!user) return
    setFetching(true)
    const { start, end, pStart, pEnd } = getRanges(tf)
    const [cur, prev] = await Promise.all([
      supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', isoDate(start))
        .lte('date', isoDate(end))
        .order('date', { ascending: true }),
      supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', isoDate(pStart))
        .lte('date', isoDate(pEnd))
        .order('date', { ascending: true }),
    ])
    setRows(cur.data || [])
    setCompareRows(prev.data || [])
    setFetching(false)
  }

  useEffect(() => {
    if (!user) return
    fetchRange(timeframe)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, timeframe])

  if (loading)
    return (
      <div className="container">
        <div className="card">Loading…</div>
      </div>
    )

  if (!user)
    return (
      <div className="page">
        <HeaderBar />
        <div className="container">
          <div className="card">
            Please <Link href="/login">sign in</Link>.
          </div>
        </div>
        <TabBar />
      </div>
    )

  // ---------- metrics helpers ----------
  const sumNet = (rs) =>
    rs.reduce(
      (a, r) =>
        a +
        (Number(r.cash_tips || 0) +
          Number(r.card_tips || 0) -
          Number(r.tip_out_total || 0)),
      0,
    )
  const sumHours = (rs) => rs.reduce((a, r) => a + Number(r.hours || 0), 0)
  const effHourly = (rs) => {
    const n = sumNet(rs)
    const h = sumHours(rs)
    return h > 0 ? n / h : 0
  }

  const curNet = sumNet(rows)
  const curHours = sumHours(rows)
  const curEff = effHourly(rows)
  const prevNet = sumNet(compareRows)
  const prevEff = effHourly(compareRows)
  const netDeltaPct = prevNet > 0 ? ((curNet - prevNet) / prevNet) * 100 : null
  const effDeltaPct = prevEff > 0 ? ((curEff - prevEff) / prevEff) * 100 : null
  // --- Tip % calculation ---
  const sumSales = (rs) => rs.reduce((a, r) => a + Number(r.sales || 0), 0)

  const curSales = sumSales(rows)
  const prevSales = sumSales(compareRows)

  const curTipPct = curSales > 0 ? ((curNet / curSales) * 100).toFixed(1) : 0
  const prevTipPct =
    prevSales > 0 ? ((prevNet / prevSales) * 100).toFixed(1) : 0

  const tipPctDelta =
    prevTipPct > 0 ? ((curTipPct - prevTipPct) / prevTipPct) * 100 : null

  // ✅ overall average tip % for comparison in Location Breakdown
  const overallTipPct = curSales > 0 ? (curNet / curSales) * 100 : 0

  // projection only for THIS_MONTH
  const showProjection = timeframe === TF.THIS_MONTH
  let projectedNet = null
  let paceDay = null
  let paceDaysTotal = null
  if (showProjection) {
    const now = new Date()
    const start = firstOfMonth(now)
    const end = lastOfMonth(now)
    paceDaysTotal = end.getDate()
    paceDay = Math.max(
      1,
      Math.min(
        Math.floor(
          (parseDateOnlyLocal(isoDate(now)) - start) / (1000 * 60 * 60 * 24),
        ) + 1,
        paceDaysTotal,
      ),
    )
    const perDay = paceDay > 0 ? curNet / paceDay : 0
    projectedNet = perDay * paceDaysTotal
  }

  // cash vs card split (current range)
  const curCash = rows.reduce((a, r) => a + Number(r.cash_tips || 0), 0)
  const curCard = rows.reduce((a, r) => a + Number(r.card_tips || 0), 0)
  const totalTips = curCash + curCard
  const cashPct = totalTips > 0 ? (curCash / totalTips) * 100 : 0
  const cardPct = totalTips > 0 ? (curCard / totalTips) * 100 : 0

  // day-of-week stats (current range)
  const dowAgg = Array.from({ length: 7 }, () => ({
    sumNet: 0,
    sumHours: 0,
    count: 0,
  }))
  for (const r of rows) {
    const d = parseDateOnlyLocal(r.date)
    if (isNaN(d)) continue
    const net =
      Number(r.cash_tips || 0) +
      Number(r.card_tips || 0) -
      Number(r.tip_out_total || 0)
    dowAgg[d.getDay()].sumNet += net
    dowAgg[d.getDay()].sumHours += Number(r.hours || 0)
    dowAgg[d.getDay()].count += 1
  }
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dowStats = dowAgg.map((o, i) => ({
    label: dowNames[i],
    avgNet: o.count ? o.sumNet / o.count : 0,
    avgEff: o.sumHours > 0 ? o.sumNet / o.sumHours : 0,
    count: o.count,
  }))
  const maxAvgNet = Math.max(1, ...dowStats.map((d) => d.avgNet))

  // best shift in current range
  const bestShift =
    rows
      .map((r) => ({
        row: r,
        net:
          Number(r.cash_tips || 0) +
          Number(r.card_tips || 0) -
          Number(r.tip_out_total || 0),
        eff:
          Number(r.hours || 0) > 0
            ? (Number(r.cash_tips || 0) +
                Number(r.card_tips || 0) -
                Number(r.tip_out_total || 0)) /
              Number(r.hours || 1)
            : 0,
      }))
      .sort((a, b) => b.net - a.net)[0] || null

  // sparkline: last 30 days within selection window
  const today = parseDateOnlyLocal(isoDate(new Date()))
  const last30Start = addDays(today, -29)
  const dailyMap = new Map()
  for (let i = 0; i < 30; i++) {
    const d = addDays(last30Start, i)
    dailyMap.set(isoDate(d), 0)
  }
  for (const r of rows) {
    const k = String(r.date)
    if (!dailyMap.has(k)) continue
    const val =
      Number(r.cash_tips || 0) +
      Number(r.card_tips || 0) -
      Number(r.tip_out_total || 0)
    dailyMap.set(k, (dailyMap.get(k) || 0) + val)
  }
  const sparkValues = Array.from(dailyMap.values())
  const sparkMax = Math.max(1, ...sparkValues)
  const sparkMin = Math.min(0, ...sparkValues)

  // top notes keywords (quick + dirty)
  const stop = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'of',
    'to',
    'in',
    'on',
    'for',
    'it',
    'is',
    'was',
    'be',
    'at',
    'as',
    'with',
    'i',
    'we',
    'they',
    'you',
    'this',
    'that',
    'my',
    'our',
    'their',
    'from',
    'by',
    'had',
    'were',
    'are',
    'me',
    'us',
  ])
  const counts = new Map()
  for (const r of rows) {
    if (!r.notes) continue
    const tokens = String(r.notes)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
    for (const t of tokens) {
      if (t.length < 3 || stop.has(t)) continue
      counts.set(t, (counts.get(t) || 0) + 1)
    }
  }
  const topKeywords = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)

  const tfLabel =
    timeframe === TF.THIS_MONTH
      ? 'This month'
      : timeframe === TF.LAST_3
        ? 'Last 3 months'
        : 'Year to date'

  const compareLabel =
    timeframe === TF.THIS_MONTH
      ? 'v. Last Month'
      : timeframe === TF.LAST_3
        ? 'v. Last 3 Months'
        : 'v. Last Year'

  // ---------- UI ----------
  return (
    <div className="page">
      <HeaderBar title="Insights" />
      <div className="container" style={{ display: 'grid', gap: 12 }}>
        {/* Controls */}
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div className="h1" style={{ margin: 0 }}>
            Insights
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Seg
              value={timeframe}
              onChange={(v) => setTimeframe(v)}
              options={[
                { value: TF.THIS_MONTH, label: 'This month' },
                { value: TF.LAST_3, label: 'Last 3 months' },
                { value: TF.YTD, label: 'Year to date' },
              ]}
              compact
            />
          </div>
        </div>
        {/* Combined KPI Card */}
        <div className="card kpi-summary">
          <div
            className="h1"
            style={{
              fontSize: 16,
              marginBottom: 10,
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            Performance Summary ({tfLabel})
          </div>

          <div className="kpi-grid">
            <div className="kpi-item">
              <div className="note">Net tips</div>
              <div className="h1">
                <AnimatedNumber
                  value={curNet}
                  formatter={currencyFormatter.format}
                />
              </div>

              {netDeltaPct != null && (
                <div
                  className="note delta"
                  style={{
                    color: netDeltaPct >= 0 ? '#16a34a' : '#dc2626',
                    fontWeight: 500,
                  }}
                >
                  {netDeltaPct >= 0 ? '▲' : '▼'}{' '}
                  {Math.abs(netDeltaPct).toFixed(1)}%{'  '}
                  <span style={{ color: '#6b7280', fontWeight: 400 }}>
                    {compareLabel}
                  </span>
                </div>
              )}
            </div>

            <div className="divider" />

            <div className="kpi-item">
              <div className="note">Tip %</div>
              <div className="h1">
                {curSales > 0 ? Number(curTipPct).toFixed(1) + '%' : '—'}
              </div>

              {tipPctDelta != null && (
                <div
                  className="note delta"
                  style={{
                    color: tipPctDelta >= 0 ? '#16a34a' : '#dc2626',
                    fontWeight: 500,
                  }}
                >
                  {tipPctDelta >= 0 ? '▲' : '▼'}{' '}
                  {Math.abs(tipPctDelta).toFixed(1)}%{'  '}
                  <span style={{ color: '#6b7280', fontWeight: 400 }}>
                    {compareLabel}
                  </span>
                </div>
              )}
            </div>

            <div className="divider" />

            <div className="kpi-item">
              <div className="note">Effective hourly</div>
              <div className="h1">{currencyFormatter.format(curEff)} /h</div>
              {effDeltaPct != null && (
                <div
                  className="note delta"
                  style={{
                    color: effDeltaPct >= 0 ? '#16a34a' : '#dc2626',
                    fontWeight: 500,
                  }}
                >
                  {effDeltaPct >= 0 ? '▲' : '▼'}{' '}
                  {Math.abs(effDeltaPct).toFixed(1)}%{'  '}
                  <span style={{ color: '#6b7280', fontWeight: 400 }}>
                    {compareLabel}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Pace + Sparkline */}
        <div className="two grid" style={{ gap: 12 }}>
          <PaceCard
            rows={rows}
            currencyFormatter={currencyFormatter}
            settings={settings}
          />

          <div className="card">
            <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
              Daily net (last 30 days in range)
            </div>
            <Sparkline values={sparkValues} />
            <div
              className="note"
              style={{ display: 'flex', justifyContent: 'space-between' }}
            >
              <span>Min {currencyFormatter.format(sparkMin)}</span>
              <span>Max {currencyFormatter.format(sparkMax)}</span>
            </div>
          </div>
        </div>
        {/* Cash vs Card — only show if both are tracked */}
        {payoutMode === 'both' && (
          <div className="card">
            <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
              Cash vs Card ({tfLabel})
            </div>
            {totalTips === 0 ? (
              <div className="note">No tips recorded.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="note" style={{ width: 64 }}>
                    Cash
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 10,
                      background: '#e5e7eb',
                      borderRadius: 6,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${cashPct}%`,
                        height: '100%',
                        background: '#10b981',
                      }}
                    />
                  </div>
                  <div
                    className="note"
                    style={{ width: 120, textAlign: 'right' }}
                  >
                    {currencyFormatter.format(curCash)} ({cashPct.toFixed(0)}%)
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="note" style={{ width: 64 }}>
                    Card
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 10,
                      background: '#e5e7eb',
                      borderRadius: 6,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${cardPct}%`,
                        height: '100%',
                        background: '#3b82f6',
                      }}
                    />
                  </div>
                  <div
                    className="note"
                    style={{ width: 120, textAlign: 'right' }}
                  >
                    {currencyFormatter.format(curCard)} ({cardPct.toFixed(0)}%)
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Day-of-week performance */}
        <div className="card">
          <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
            Day of week ({tfLabel})
          </div>
          {dowStats.every((d) => d.count === 0) ? (
            <div className="note">Not enough data yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {dowStats.map((d) => (
                <div
                  key={d.label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 160px 60px',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div className="note">{d.label}</div>
                  <div
                    style={{
                      height: 10,
                      background: '#e5e7eb',
                      borderRadius: 6,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(d.avgNet / maxAvgNet) * 100}%`,
                        height: '100%',
                        background: '#6366f1',
                      }}
                      title={`${currencyFormatter.format(d.avgNet)} avg net`}
                    />
                  </div>
                  <div className="note" style={{ textAlign: 'right' }}>
                    {currencyFormatter.format(d.avgNet)} avg ·{' '}
                    {currencyFormatter.format(d.avgEff)} /h
                  </div>
                  <div className="note" title={`${d.count} shifts`}>
                    {d.count}×
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Weather Breakdown — Pro only */}
        {(user?.plan_tier === 'pro' || user?.plan_tier === 'founder') &&
          settings?.track_weather && (
            <div className="card">
              <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
                Weather breakdown ({tfLabel})
              </div>
              {rows.every((r) => !r.weather_snapshot) ? (
                <div className="note">
                  No weather data found for this range yet.
                </div>
              ) : (
                (() => {
                  // Aggregate by weather summary
                  const agg = {}
                  for (const r of rows) {
                    const snap = r.weather_snapshot
                    if (!snap?.summary) continue
                    const key = snap.summary
                    const net =
                      Number(r.cash_tips || 0) +
                      Number(r.card_tips || 0) -
                      Number(r.tip_out_total || 0)
                    const sales = Number(r.sales || 0)
                    if (!agg[key])
                      agg[key] = { count: 0, sumNet: 0, sumSales: 0 }
                    agg[key].count++
                    agg[key].sumNet += net
                    agg[key].sumSales += sales
                  }

                  // Build + sort by avgTipPct
                  const weatherEntries = Object.entries(agg)
                    .map(([summary, stats]) => ({
                      summary,
                      ...stats,
                      avgNet: stats.count > 0 ? stats.sumNet / stats.count : 0,
                      avgTipPct:
                        stats.sumSales > 0
                          ? (stats.sumNet / stats.sumSales) * 100
                          : null,
                    }))
                    .sort((a, b) => b.avgTipPct - a.avgTipPct)

                  const topTipPct =
                    weatherEntries.length > 0 &&
                    weatherEntries[0].avgTipPct != null
                      ? weatherEntries[0].avgTipPct
                      : null

                  const emojiMap = {
                    Sunny: '☀️',
                    Clear: '☀️',
                    Cloudy: '☁️',
                    Overcast: '☁️',
                    Rain: '🌧️',
                    Rainy: '🌧️',
                    Thunderstorm: '⛈️',
                    Storm: '⛈️',
                    Snow: '❄️',
                    Windy: '💨',
                    Fog: '🌫️',
                    Haze: '🌤️',
                  }

                  if (weatherEntries.length === 0)
                    return (
                      <div className="note">No weather data available.</div>
                    )

                  return (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {weatherEntries.map((w) => {
                        const isTop =
                          topTipPct != null && w.avgTipPct === topTipPct
                        return (
                          <div
                            key={w.summary}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr auto auto auto',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <div>
                              <span style={{ marginRight: 6 }}>
                                {emojiMap[w.summary] || '🌦️'}
                              </span>
                              {w.summary}
                            </div>
                            <div className="note">{w.count} shifts</div>
                            <div className="note">
                              {currencyFormatter.format(w.avgNet)} avg
                            </div>
                            <div
                              className="tip-pill"
                              style={{
                                padding: '3px 10px',
                                borderRadius: '999px',
                                fontSize: 13,
                                fontWeight: 600,
                                background: isTop
                                  ? 'rgba(34,197,94,0.12)'
                                  : 'rgba(107,114,128,0.12)',
                                color: isTop ? '#16a34a' : '#374151',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Tip{' '}
                              {w.avgTipPct != null
                                ? `${w.avgTipPct.toFixed(1)}%`
                                : '—'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()
              )}
            </div>
          )}

        {/* Location Breakdown — Pro only */}
        {(user?.plan_tier === 'pro' || user?.plan_tier === 'founder') &&
          settings?.multiple_locations && (
            <div className="card">
              <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
                Location breakdown ({tfLabel})
              </div>
              {rows.every((r) => !r.location_id) ? (
                <div className="note">
                  No location data found for this range yet.
                </div>
              ) : (
                (() => {
                  // Build quick lookup of location_id → name from settings
                  const locMap = {}
                  if (Array.isArray(settings?.locations)) {
                    for (const loc of settings.locations) {
                      locMap[loc.id] = loc.name || '(Unnamed)'
                    }
                  }

                  // Aggregate by location_id
                  const agg = {}
                  for (const r of rows) {
                    const locId = r.location_id || 'unknown'
                    const locName = locMap[locId] || 'Unknown location'

                    const net =
                      Number(r.cash_tips || 0) +
                      Number(r.card_tips || 0) -
                      Number(r.tip_out_total || 0)
                    const sales = Number(r.sales || 0)

                    if (!agg[locId])
                      agg[locId] = {
                        name: locName,
                        count: 0,
                        sumNet: 0,
                        sumSales: 0,
                      }

                    agg[locId].count++
                    agg[locId].sumNet += net
                    agg[locId].sumSales += sales
                  }

                  const entries = Object.values(agg)
                    .map((loc) => ({
                      ...loc,
                      avgNet: loc.sumNet / loc.count,
                      avgTipPct:
                        loc.sumSales > 0
                          ? (loc.sumNet / loc.sumSales) * 100
                          : null,
                    }))
                    .sort((a, b) => b.avgTipPct - a.avgTipPct)

                  const topTipPct =
                    entries.length > 0 && entries[0].avgTipPct != null
                      ? entries[0].avgTipPct
                      : null

                  return (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {entries.map((loc) => {
                        const isAbove =
                          loc.avgTipPct != null && loc.avgTipPct > overallTipPct
                        return (
                          <div
                            key={loc.name}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr auto auto auto',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <div>{loc.name}</div>
                            <div className="note">{loc.count} shifts</div>
                            <div className="note">
                              {currencyFormatter.format(loc.avgNet)} avg
                            </div>
                            <div
                              className="tip-pill"
                              style={{
                                padding: '3px 10px',
                                borderRadius: '999px',
                                fontSize: 13,
                                fontWeight: 600,
                                background: isAbove
                                  ? 'rgba(34,197,94,0.12)'
                                  : 'rgba(107,114,128,0.12)',
                                color: isAbove ? '#16a34a' : '#374151',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Tip{' '}
                              {loc.avgTipPct != null
                                ? `${loc.avgTipPct.toFixed(1)}%`
                                : '—'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()
              )}
            </div>
          )}

        {/* Section Breakdown — grouped by Location */}
        {(user?.plan_tier === 'pro' || user?.plan_tier === 'founder') &&
          settings?.track_sections && (
            <div className="card">
              <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
                Section breakdown ({tfLabel})
              </div>

              {rows.every(
                (r) => !Array.isArray(r.sections) || r.sections.length === 0,
              ) ? (
                <div className="note">
                  No section data found for this range yet.
                </div>
              ) : (
                (() => {
                  // Map location IDs to names
                  const locMap = {}
                  if (Array.isArray(settings?.locations)) {
                    for (const loc of settings.locations) {
                      locMap[loc.id] = loc.name || 'Unknown location'
                    }
                  }

                  // Aggregate by location → section
                  const agg = {}
                  for (const r of rows) {
                    const locId = r.location_id || 'unknown'
                    const locName = locMap[locId] || 'Unknown location'
                    const sections = Array.isArray(r.sections)
                      ? r.sections
                      : r.sections
                        ? [r.sections]
                        : ['(Unspecified)']

                    const net =
                      Number(r.cash_tips || 0) +
                      Number(r.card_tips || 0) -
                      Number(r.tip_out_total || 0)
                    const sales = Number(r.sales || 0)

                    for (const sec of sections) {
                      const section = sec || '(Unspecified)'
                      if (!agg[locId]) agg[locId] = { locName, sections: {} }
                      if (!agg[locId].sections[section])
                        agg[locId].sections[section] = {
                          count: 0,
                          sumNet: 0,
                          sumSales: 0,
                        }
                      agg[locId].sections[section].count++
                      agg[locId].sections[section].sumNet += net
                      agg[locId].sections[section].sumSales += sales
                    }
                  }

                  // Convert to entries grouped by location
                  const locations = Object.values(agg)

                  return (
                    <div style={{ display: 'grid', gap: 18 }}>
                      {locations.map((loc) => {
                        const entries = Object.entries(loc.sections)
                          .map(([name, s]) => ({
                            name,
                            count: s.count,
                            avgNet: s.sumNet / s.count || 0,
                            avgTipPct:
                              s.sumSales > 0
                                ? (s.sumNet / s.sumSales) * 100
                                : null,
                          }))
                          .sort(
                            (a, b) => (b.avgTipPct || 0) - (a.avgTipPct || 0),
                          )

                        const topTipPct =
                          entries.length > 0 && entries[0].avgTipPct != null
                            ? entries[0].avgTipPct
                            : null

                        return (
                          <div
                            key={loc.locName}
                            style={{ display: 'grid', gap: 8 }}
                          >
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: 15,
                                borderBottom: '1px solid #eee',
                                paddingBottom: 4,
                              }}
                            >
                              {loc.locName}
                            </div>
                            <div style={{ display: 'grid', gap: 6 }}>
                              {entries.map((s) => {
                                const isTop =
                                  topTipPct != null && s.avgTipPct === topTipPct
                                return (
                                  <div
                                    key={s.name}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '1fr auto auto auto',
                                      alignItems: 'center',
                                      gap: 8,
                                    }}
                                  >
                                    <div className="note">{s.name}</div>
                                    <div className="note">{s.count} shifts</div>
                                    <div className="note">
                                      {currencyFormatter.format(s.avgNet)} avg
                                    </div>
                                    <div
                                      className="tip-pill"
                                      style={{
                                        padding: '3px 10px',
                                        borderRadius: '999px',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        background: isTop
                                          ? 'rgba(34,197,94,0.12)'
                                          : 'rgba(107,114,128,0.12)',
                                        color: isTop ? '#16a34a' : '#374151',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      Tip{' '}
                                      {s.avgTipPct != null
                                        ? `${s.avgTipPct.toFixed(1)}%`
                                        : '—'}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()
              )}
            </div>
          )}
        {/* Tag Breakdown — grouped by Location (fixed keys + colors + no [object Object]) */}
        {(user?.plan_tier === 'pro' || user?.plan_tier === 'founder') &&
          settings?.track_tags && (
            <div className="card">
              <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
                Tag breakdown ({tfLabel})
              </div>

              {rows.every((r) => getTagList(r.tags).length === 0) ? (
                <div className="note">
                  No tag data found for this range yet.
                </div>
              ) : (
                (() => {
                  // Location lookup (id -> name)
                  const locMap = {}
                  if (Array.isArray(settings?.locations)) {
                    for (const loc of settings.locations) {
                      locMap[loc.id] = loc.name || 'Unknown location'
                    }
                  }

                  // Tag metadata (normalized key -> {color,label})
                  const tagMeta = {}
                  if (Array.isArray(settings?.tags)) {
                    for (const t of settings.tags) {
                      const key = normTagKey(t?.name)
                      if (key)
                        tagMeta[key] = {
                          color: t?.color || null,
                          label: t?.name || '',
                        }
                    }
                  }

                  // Aggregate by location -> tagKey
                  const agg = {}
                  for (const r of rows) {
                    const locId = r.location_id || 'unknown'
                    const locName = locMap[locId] || 'Unknown location'
                    const tagNames = getTagList(r.tags)
                    if (!tagNames.length) continue

                    const net =
                      Number(r.cash_tips || 0) +
                      Number(r.card_tips || 0) -
                      Number(r.tip_out_total || 0)
                    const sales = Number(r.sales || 0)

                    if (!agg[locId]) agg[locId] = { locName, tags: {} }

                    for (const name of tagNames) {
                      const key = normTagKey(name)
                      if (!key) continue
                      if (!agg[locId].tags[key]) {
                        agg[locId].tags[key] = {
                          label: name,
                          count: 0,
                          sumNet: 0,
                          sumSales: 0,
                        }
                      }
                      agg[locId].tags[key].count++
                      agg[locId].tags[key].sumNet += net
                      agg[locId].tags[key].sumSales += sales
                    }
                  }

                  const locations = Object.values(agg)
                  if (locations.length === 0) {
                    return <div className="note">No tag data available.</div>
                  }

                  return (
                    <div style={{ display: 'grid', gap: 18 }}>
                      {locations.map((loc) => {
                        const entries = Object.entries(loc.tags)
                          .map(([key, s]) => ({
                            key,
                            label: s.label,
                            count: s.count,
                            avgNet: s.sumNet / s.count || 0,
                            avgTipPct:
                              s.sumSales > 0
                                ? (s.sumNet / s.sumSales) * 100
                                : null,
                          }))
                          .sort(
                            (a, b) => (b.avgTipPct || 0) - (a.avgTipPct || 0),
                          )

                        const topTipPct =
                          entries.length > 0 && entries[0].avgTipPct != null
                            ? entries[0].avgTipPct
                            : null

                        return (
                          <div
                            key={loc.locName}
                            style={{ display: 'grid', gap: 8 }}
                          >
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: 15,
                                borderBottom: '1px solid #eee',
                                paddingBottom: 4,
                              }}
                            >
                              {loc.locName}
                            </div>

                            <div style={{ display: 'grid', gap: 6 }}>
                              {entries.map((t) => {
                                const meta = tagMeta[t.key] || {}
                                const display = meta.label || t.label || t.key
                                const isTop =
                                  topTipPct != null && t.avgTipPct === topTipPct
                                return (
                                  <div
                                    key={t.key}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '1fr auto auto auto',
                                      alignItems: 'center',
                                      gap: 8,
                                    }}
                                  >
                                    <div
                                      className="note"
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <span
                                        style={{
                                          display: 'inline-block',
                                          width: 10,
                                          height: 10,
                                          borderRadius: '50%',
                                          background: meta.color || '#d1d5db',
                                          marginRight: 8,
                                        }}
                                      />
                                      {display}
                                    </div>
                                    <div className="note">{t.count} shifts</div>
                                    <div className="note">
                                      {currencyFormatter.format(t.avgNet)} avg
                                    </div>
                                    <div
                                      className="tip-pill"
                                      style={{
                                        padding: '3px 10px',
                                        borderRadius: '999px',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        background: isTop
                                          ? 'rgba(34,197,94,0.12)'
                                          : 'rgba(107,114,128,0.12)',
                                        color: isTop ? '#16a34a' : '#374151',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      Tip{' '}
                                      {t.avgTipPct != null
                                        ? `${t.avgTipPct.toFixed(1)}%`
                                        : '—'}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()
              )}
            </div>
          )}

        {/* Top keywords from notes */}
        <div className="card">
          <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
            Top notes keywords ({tfLabel})
          </div>
          {topKeywords.length === 0 ? (
            <div className="note">No notes yet.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {topKeywords.map(([word, count]) => (
                <span
                  key={word}
                  className="tag"
                  style={{
                    padding: '4px 8px',
                    borderRadius: 999,
                    border: '1px solid var(--card-border)',
                  }}
                >
                  {word}{' '}
                  <span className="note" style={{ marginLeft: 6 }}>
                    {count}×
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Best shift highlight */}
        <div className="card">
          <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
            Best shift ({tfLabel})
          </div>
          {!bestShift ? (
            <div className="note">No shifts in range.</div>
          ) : (
            <div
              className="card"
              role="button"
              tabIndex={0}
              onClick={() => setSelectedShift(bestShift.row)}
              onKeyDown={(e) =>
                e.key === 'Enter' && setSelectedShift(bestShift.row)
              }
              style={{ cursor: 'pointer' }}
            >
              <div className="h2" style={{ fontSize: 16 }}>
                {parseDateOnlyLocal(bestShift.row.date).toLocaleDateString()}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <b>Net:</b> {currencyFormatter.format(bestShift.net)}
                </div>
                <div>
                  <b>Hours:</b> {Number(bestShift.row.hours || 0).toFixed(2)}
                </div>
                <div>
                  <b>Eff:</b> {currencyFormatter.format(bestShift.eff)} /h
                </div>
                {bestShift.row.notes && (
                  <div className="note" style={{ width: '100%' }}>
                    {bestShift.row.notes}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <TabBar />

      {/* Modal for view/edit/delete */}
      {selectedShift && (
        <ShiftDetailsModal
          shift={selectedShift}
          onClose={() => setSelectedShift(null)}
          onSave={async (payload) => {
            const { data, error } = await supabase
              .from('shifts')
              .update(payload)
              .eq('id', selectedShift.id)
              .eq('user_id', user.id)
              .select('*')
              .single()
            if (error) {
              alert(error.message)
              return
            }
            await fetchRange(timeframe)
            setSelectedShift(data)
          }}
          onDelete={async () => {
            const { error } = await supabase
              .from('shifts')
              .delete()
              .eq('id', selectedShift.id)
              .eq('user_id', user.id)
            if (error) {
              alert(error.message)
              return
            }
            await fetchRange(timeframe)
            setSelectedShift(null)
          }}
          currencyFormatter={currencyFormatter}
          tipsOnPaycheck={tipsOnPaycheck}
          showCashInput={showCashInput}
          showCardInput={showCardInput}
          defaultTipoutPct={defaultTipoutPct}
        />
      )}

      {/* Inline styles for KPI layout & overflow handling */}
      {/* Combined KPI styles */}
      <style jsx>{`
        .kpi-summary {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .kpi-grid {
          display: flex;
          justify-content: space-around;
          align-items: stretch;
          text-align: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .kpi-item {
          flex: 1;
          min-width: 100px;
        }
        .divider {
          width: 1px;
          background: #e5e7eb;
        }
        @media (max-width: 600px) {
          .kpi-grid {
            flex-direction: column;
          }
          .divider {
            height: 1px;
            width: 100%;
          }
        }
      `}</style>

      {/* Inline styles for KPI layout & overflow handling */}
      <style jsx>{`
  /* Responsive KPI grid: 3 → 2 → 1 columns */
  :global(.grid.three) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  ...
`}</style>

      <style jsx>{`
        /* Responsive KPI grid: 3 → 2 → 1 columns */
        :global(.grid.three) {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        @media (max-width: 880px) {
          :global(.grid.three) {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 560px) {
          :global(.grid.three) {
            grid-template-columns: 1fr;
          }
        }

        /* Prevent text overflow in KPI cards */
        :global(.card.kpi) {
          min-width: 0;
        }
        :global(.card.kpi .h1),
        :global(.card.kpi .note) {
          min-width: 0;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        /* Make wide KPIs span full row on tighter screens */
        @media (max-width: 880px) {
          :global(.card.kpi.kpi-wide) {
            grid-column: 1 / -1;
          }
        }

        /* Smallest phones: slightly reduce big number size */
        @media (max-width: 380px) {
          :global(.card.kpi .h1) {
            font-size: 18px;
          }
        }
      `}</style>
      {/* --- Insights “Pro” Styling --- */}
      <style jsx>{`
        /* Beautiful gradient background only for Insights page */
        :global(.page) {
          background: radial-gradient(
            circle at top right,
            #f3f4f6 0%,
            #ffffff 60%
          );
        }

        /* Softer, cleaner card look */
        :global(.page .card) {
          background: linear-gradient(145deg, #ffffff, #f9fafb);
          border: 1px solid #f1f1f1;
          border-radius: 16px;
          box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.05),
            0 6px 16px rgba(0, 0, 0, 0.08);
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }
        :global(.page .card:hover) {
          transform: translateY(-3px);
          box-shadow:
            0 4px 8px rgba(0, 0, 0, 0.08),
            0 10px 24px rgba(0, 0, 0, 0.12);
        }

        /* Accent bar on card titles */
        :global(.page .card .h2) {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        :global(.page .card .h2)::before {
          content: '';
          width: 5px;
          height: 18px;
          border-radius: 2px;
          background: var(--brand, #22c55e);
          display: inline-block;
        }

        /* Page typography */
        :global(.page) {
          font-family:
            'Inter',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            Roboto,
            sans-serif;
          letter-spacing: -0.01em;
        }

        /* Subtle lift for buttons */
        :global(.page .btn) {
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
          transition:
            transform 0.1s ease,
            box-shadow 0.15s ease;
        }
        :global(.page .btn:active) {
          transform: scale(0.97);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        }

        /* Animated gear icon */
        :global(.gear-icon) {
          transition: transform 0.4s ease;
        }
        :global(.pace-card:active .gear-icon) {
          transform: rotate(180deg);
        }

        /* KPI summary polish */
        :global(.page .kpi-summary) {
          background: #ffffffb3;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 16px;
          backdrop-filter: blur(6px);
        }
      `}</style>
    </div>
  )
}
