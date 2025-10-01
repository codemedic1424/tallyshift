// pages/insights.js
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '../lib/useUser'
import { useSettings } from '../lib/useSettings'
import { supabase } from '../lib/supabase'
import HeaderBar from '../ui/HeaderBar'
import TabBar from '../ui/TabBar'
import ShiftDetailsModal from '../ui/ShiftDetailsModal'

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
      // previous month
      const prevRef = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const pStart = firstOfMonth(prevRef)
      const pEnd = lastOfMonth(prevRef)
      return { start, end, pStart, pEnd }
    }
    if (tf === TF.LAST_3) {
      const end = parseDateOnlyLocal(isoDate(new Date()))
      const start = addDays(end, -89)
      // previous 90 days
      const pEnd = addDays(start, -1)
      const pStart = addDays(pEnd, -89)
      return { start, end, pStart, pEnd }
    }
    // YTD
    const end = parseDateOnlyLocal(isoDate(new Date()))
    const start = firstOfYear(end)
    // last year's YTD to same date
    const lastYear = end.getFullYear() - 1
    const pStart = new Date(lastYear, 0, 1)
    const pEnd = new Date(lastYear, end.getMonth(), end.getDate())
    return { start, end, pStart, pEnd }
  }

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

  // timeframe label
  const tfLabel =
    timeframe === TF.THIS_MONTH
      ? 'This month'
      : timeframe === TF.LAST_3
        ? 'Last 3 months'
        : 'Year to date'

  // ---------- UI ----------
  return (
    <div className="page">
      <HeaderBar />
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
            <button
              className={`cal-tab ${timeframe === TF.THIS_MONTH ? 'active' : ''}`}
              onClick={() => setTimeframe(TF.THIS_MONTH)}
            >
              This month
            </button>
            <button
              className={`cal-tab ${timeframe === TF.LAST_3 ? 'active' : ''}`}
              onClick={() => setTimeframe(TF.LAST_3)}
            >
              Last 3 months
            </button>
            <button
              className={`cal-tab ${timeframe === TF.YTD ? 'active' : ''}`}
              onClick={() => setTimeframe(TF.YTD)}
            >
              Year to date
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="three grid" style={{ gap: 12 }}>
          <div className="card">
            <div className="note">Net tips ({tfLabel})</div>
            <div className="h1">{currencyFormatter.format(curNet)}</div>
            {netDeltaPct != null && (
              <div
                className="note"
                style={{ color: netDeltaPct >= 0 ? '#16a34a' : '#dc2626' }}
              >
                {netDeltaPct >= 0 ? '▲' : '▼'}{' '}
                {Math.abs(netDeltaPct).toFixed(1)}% vs previous period
              </div>
            )}
          </div>
          <div className="card">
            <div className="note">Hours ({tfLabel})</div>
            <div className="h1">{curHours.toFixed(1)}</div>
          </div>
          <div className="card">
            <div className="note">Effective hourly ({tfLabel})</div>
            <div className="h1">{currencyFormatter.format(curEff)} /h</div>
            {effDeltaPct != null && (
              <div
                className="note"
                style={{ color: effDeltaPct >= 0 ? '#16a34a' : '#dc2626' }}
              >
                {effDeltaPct >= 0 ? '▲' : '▼'}{' '}
                {Math.abs(effDeltaPct).toFixed(1)}% vs previous period
              </div>
            )}
          </div>
        </div>

        {/* Pace + Sparkline */}
        <div className="two grid" style={{ gap: 12 }}>
          <div className="card">
            <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
              Monthly pace
            </div>
            {!showProjection ? (
              <div className="note">Projection available on “This month”.</div>
            ) : (
              <>
                <div className="note" style={{ marginBottom: 6 }}>
                  Day {paceDay} of {paceDaysTotal}
                </div>
                <div className="h1" style={{ marginBottom: 4 }}>
                  On pace for {currencyFormatter.format(projectedNet || 0)}
                </div>
                <div className="note">
                  Avg/day so far:{' '}
                  {currencyFormatter.format(curNet / (paceDay || 1) || 0)}
                </div>
              </>
            )}
          </div>

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

        {/* Cash vs Card */}
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
            // refresh current timeframe after edit
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
    </div>
  )
}
