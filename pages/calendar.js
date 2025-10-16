// pages/calendar.js
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { useUser } from '../lib/useUser'
import { useSettings } from '../lib/useSettings'
import HeaderBar from '../ui/HeaderBar'
import TabBar from '../ui/TabBar'
import ShiftDetailsModal from '../ui/ShiftDetailsModal'
import AddShiftModal from '../ui/AddShiftModal'
import DaySheetModal from '../ui/DaySheetModal'

// ---------- helpers ----------
const S = { ndash: '\u2013', times: '\u00D7', middot: '\u00B7' }

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
// Compact header label for small screens
function fmtHeaderLabel(view, cursor, weekStart) {
  const d = startOfDay(cursor)
  const shortMD = (x) =>
    x.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const longFull = (x) => x.toLocaleDateString()

  if (view === 'day') {
    // Desktop: full date   •  Mobile: "Oct 6"
    return window.matchMedia?.('(max-width: 640px)').matches
      ? shortMD(d)
      : longFull(d)
  }

  if (view === 'week') {
    const start = startOfWeek(d, weekStart)
    const end = addDays(start, 6)
    const sameMonth =
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear()

    // Desktop: full date range  •  Mobile: "Oct 6–12" or "Sep 29–Oct 5"
    if (window.matchMedia?.('(max-width: 640px)').matches) {
      return sameMonth
        ? `${start.toLocaleDateString(undefined, { month: 'short' })} ${start.getDate()}–${end.getDate()}`
        : `${shortMD(start)}–${shortMD(end)}`
    }
    return `${longFull(start)} ${S.ndash} ${longFull(end)}`
  }

  // view === 'month'
  return window.matchMedia?.('(max-width: 640px)').matches
    ? d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) // "Oct 2025"
    : fmtMonth(d) // "October 2025"
}

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function startOfWeek(d, weekStart = 'monday') {
  const x = startOfDay(d)
  const startIndex = weekStart === 'sunday' ? 0 : 1
  const diff = (x.getDay() - startIndex + 7) % 7
  x.setDate(x.getDate() - diff)
  return x
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
function fmtMonth(d) {
  return d.toLocaleString(undefined, { month: 'long', year: 'numeric' })
}
function sameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
// Stable local YYYY-MM-DD
function dateKeyLocal(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function parseDateOnlyLocal(s) {
  if (!s) return new Date(NaN)
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
function useIsSmall(bp = 640) {
  const [small, setSmall] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`)
    const onChange = (e) => setSmall(e.matches)
    setSmall(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [bp])
  return small
}

export default function CalendarPage({ theme, setTheme }) {
  const { user, loading } = useUser()
  const { settings } = useSettings()
  const router = useRouter()

  const [view, setView] = useState('month') // 'day' | 'week' | 'month'
  const [viewInitialized, setViewInitialized] = useState(false)
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))
  const [rows, setRows] = useState([])
  const [selectedShift, setSelectedShift] = useState(null)

  // Add-shift modal (external component)
  const [addOpen, setAddOpen] = useState(false)
  const [addDate, setAddDate] = useState(dateKeyLocal(new Date()))

  // mobile day sheet
  const [daySheetOpen, setDaySheetOpen] = useState(false)
  const [daySheetDate, setDaySheetDate] = useState(dateKeyLocal(new Date()))

  // settings-driven flags
  const weekStartSetting =
    settings?.week_start === 'sunday' ? 'sunday' : 'monday'
  const defaultViewSetting =
    settings?.default_calendar_view === 'day' ||
    settings?.default_calendar_view === 'week' ||
    settings?.default_calendar_view === 'month'
      ? settings.default_calendar_view
      : null

  const isSmall = useIsSmall(640)

  // currency + payout flags (still used throughout this page)
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
  const tipsOnPaycheck = payoutMode === 'on_paycheck'
  const showCashInput =
    !tipsOnPaycheck && (payoutMode === 'both' || payoutMode === 'cash_only')
  const showCardInput =
    !tipsOnPaycheck && (payoutMode === 'both' || payoutMode === 'card_only')
  const defaultTipoutPct =
    typeof settings?.default_tipout_pct === 'number'
      ? settings.default_tipout_pct
      : null

  // --- initial view from URL or settings (do NOT force switch on mobile) ---
  useEffect(() => {
    const v = router.query.view
    if (v === 'day' || v === 'week' || v === 'month') {
      setView(v)
      setViewInitialized(true)
    }
    if (router.query.d) {
      const d = parseDateOnlyLocal(String(router.query.d))
      if (!isNaN(d)) setCursor(startOfDay(d))
      if (router.query.add === '1') {
        const iso = dateKeyLocal(d)
        setAddDate(iso)
        setAddOpen(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.view, router.query.d])

  useEffect(() => {
    if (viewInitialized) return
    if (defaultViewSetting) {
      setView(defaultViewSetting)
      setViewInitialized(true)
    }
  }, [defaultViewSetting, viewInitialized])

  // range for current view
  const range = useMemo(() => {
    if (view === 'day') {
      const start = startOfDay(cursor)
      const end = addDays(start, 1)
      return { start, end, label: start.toLocaleDateString() }
    }
    if (view === 'week') {
      const start = startOfWeek(cursor, weekStartSetting)
      const end = addDays(start, 7)
      const label = `${start.toLocaleDateString()} ${S.ndash} ${addDays(start, 6).toLocaleDateString()}`
      return { start, end, label }
    }
    const start = startOfWeek(startOfMonth(cursor), weekStartSetting)
    const last = endOfMonth(cursor)
    const end = addDays(startOfWeek(addDays(last, 7), weekStartSetting), 0)
    return { start, end, label: fmtMonth(cursor) }
  }, [view, cursor, weekStartSetting])

  // fetch rows in range (scoped to user)
  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { start, end } = range
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', dateKeyLocal(start))
        .lt('date', dateKeyLocal(end))
        .order('date', { ascending: true })
      if (!error) setRows(data || [])
    })()
  }, [user, range.start?.getTime(), range.end?.getTime()])

  // map by date
  const byDate = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const k = r.date // 'YYYY-MM-DD'
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(r)
    }
    return map
  }, [rows])

  // totals for visible period (month totals only include this month)
  const totals = useMemo(() => {
    let activeRows = rows
    if (view === 'month') {
      activeRows = rows.filter((r) => {
        const d = parseDateOnlyLocal(r.date)
        return (
          d.getFullYear() === cursor.getFullYear() &&
          d.getMonth() === cursor.getMonth()
        )
      })
    }
    const net = activeRows.reduce(
      (acc, r) =>
        acc +
        (Number(r.cash_tips || 0) +
          Number(r.card_tips || 0) -
          Number(r.tip_out_total || 0)),
      0,
    )
    const totalHours = activeRows.reduce(
      (acc, r) => acc + Number(r.hours || 0),
      0,
    )
    const eff = totalHours > 0 ? net / totalHours : 0
    return { net, hours: totalHours, eff }
  }, [rows, view, cursor])

  const weekdayLabels = useMemo(() => {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    if (weekStartSetting === 'sunday') return labels
    return labels.slice(1).concat(labels.slice(0, 1))
  }, [weekStartSetting])

  // keyboard
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight') {
        if (view === 'day') setCursor((c) => addDays(c, 1))
        if (view === 'week') setCursor((c) => addDays(c, 7))
        if (view === 'month')
          setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
      }
      if (e.key === 'ArrowLeft') {
        if (view === 'day') setCursor((c) => addDays(c, -1))
        if (view === 'week') setCursor((c) => addDays(c, -7))
        if (view === 'month')
          setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
      }
      if (e.key === 'Escape') {
        setSelectedShift(null)
        setAddOpen(false)
        setDaySheetOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  // open add for a given JS Date
  function openAddFor(dateObj) {
    const k = dateKeyLocal(dateObj)
    setAddDate(k)
    setAddOpen(true)
  }

  // save new shift coming back from AddShiftModal
  // Replace the existing handleAddSave in pages/calendar.js with this:

  async function handleAddSave(payload) {
    if (!user) return alert('Sign in first')

    // --- (A) Try to fetch a weather snapshot (if enabled + coords available) ---
    let weather_snapshot = null
    try {
      if (settings?.track_weather && payload?.date) {
        // Choose the location to use for weather:
        const locIdFromShift = payload?.location_id || null
        const locs = Array.isArray(settings?.locations)
          ? settings.locations
          : []
        const byId = (id) => locs.find((l) => l.id === id)
        const defaultId = settings?.default_location_id || locs[0]?.id || null

        const loc =
          (locIdFromShift && byId(locIdFromShift)) ||
          (defaultId && byId(defaultId)) ||
          locs[0] ||
          null

        if (loc?.lat != null && loc?.lon != null) {
          const res = await fetch('/api/fetch-weather', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: payload.date, // 'YYYY-MM-DD'
              lat: loc.lat,
              lon: loc.lon,
            }),
          })
          const data = await res.json().catch(() => null)
          if (data?.ok && data?.snapshot) {
            weather_snapshot = data.snapshot
          }
        } else {
          // (Optional) console log to help debug missing coords
          console.warn('track_weather is on, but location is missing lat/lon')
        }
      }
    } catch (err) {
      console.error('Weather fetch failed (non-blocking):', err)
    }

    // --- (B) Insert the new row (include weather_snapshot if we have it) ---
    const dbRow = {
      user_id: user.id,
      ...payload,
      ...(weather_snapshot ? { weather_snapshot } : {}), // only include if fetched
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
    setRows((prev) => [...prev, data])
    setAddOpen(false)
  }

  if (loading)
    return (
      <div className="container">
        <div className="card">Loading…</div>
      </div>
    )
  if (!user)
    return (
      <div className="page">
        <HeaderBar theme={theme} setTheme={setTheme} />
        <div className="container">
          <div className="card">
            Please <Link href="/login">sign in</Link> to view the calendar.
          </div>
        </div>
        <TabBar />
      </div>
    )

  // cells to render
  const cells = []
  if (view === 'day') {
    cells.push(startOfDay(cursor))
  } else if (view === 'week') {
    const start = startOfWeek(cursor, weekStartSetting)
    for (let i = 0; i < 7; i++) cells.push(addDays(start, i))
  } else {
    const start = startOfWeek(startOfMonth(cursor), weekStartSetting)
    for (let i = 0; i < 42; i++) cells.push(addDays(start, i))
  }

  return (
    <div className="page">
      <HeaderBar title="Calendar" />
      <div className="container">
        {/* Header */}
        <div className="cal-header">
          <div className="cal-title">
            {fmtHeaderLabel(view, cursor, weekStartSetting)}
          </div>

          <div className="cal-controls">
            <button className="cal-btn" onClick={() => setCursor(new Date())}>
              Today
            </button>
            <button
              className="cal-btn"
              onClick={() => {
                if (view === 'day') setCursor(addDays(cursor, -1))
                if (view === 'week') setCursor(addDays(cursor, -7))
                if (view === 'month')
                  setCursor(
                    new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
                  )
              }}
              aria-label="Previous period"
            >
              ‹
            </button>
            <button
              className="cal-btn"
              onClick={() => {
                if (view === 'day') setCursor(addDays(cursor, 1))
                if (view === 'week') setCursor(addDays(cursor, 7))
                if (view === 'month')
                  setCursor(
                    new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
                  )
              }}
              aria-label="Next period"
            >
              ›
            </button>
            <div className="cal-tabs">
              <select
                className="cal-select"
                value={view}
                onChange={(e) => setView(e.target.value)}
                aria-label="Change calendar view"
              >
                <option value="day">Day view</option>
                <option value="week">Week view</option>
                <option value="month">Month view</option>
              </select>
            </div>
          </div>
        </div>

        {/* Compact KPI Summary */}
        <div className="card kpi-summary compact" style={{ marginBottom: 8 }}>
          <div className="kpi-grid">
            <div className="kpi-item">
              <div className="note">Net</div>
              <div className="h1 small">
                {currencyFormatter.format(totals.net)}
              </div>
            </div>

            <div className="divider" />

            <div className="kpi-item">
              <div className="note">Hours</div>
              <div className="h1 small">{totals.hours.toFixed(1)}</div>
            </div>

            <div className="divider" />

            <div className="kpi-item">
              <div className="note">Hourly</div>
              <div className="h1 small">
                {currencyFormatter.format(totals.eff)} /h
              </div>
            </div>
          </div>
        </div>

        {/* Weekday headers */}
        {view !== 'day' && (
          <div className="cal-grid cal-week" style={{ marginBottom: 6 }}>
            {weekdayLabels.map((label) => (
              <div key={label} className="note" style={{ textAlign: 'center' }}>
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        <div
          className={`cal-grid ${
            view === 'month'
              ? isSmall
                ? 'cal-month compact'
                : 'cal-month'
              : view === 'week'
                ? isSmall
                  ? 'cal-week compact'
                  : 'cal-week'
                : 'cal-day'
          }`}
        >
          {cells.map((date, index) => {
            const today = sameDate(date, new Date())
            const key = dateKeyLocal(date)
            const shifts = byDate.get(key) || []
            const hasShifts = shifts.length > 0
            const preview = shifts.slice(0, 3)
            const more = Math.max(0, shifts.length - preview.length)
            const inMonth =
              date.getMonth() === cursor.getMonth() || view !== 'month'
            // pick an emoji from the first shift that has weather
            const weatherEmoji = (() => {
              const snap = (shifts.find((s) => s?.weather_snapshot) || {})
                ?.weather_snapshot
              if (!snap) return null
              // prefer WMO code if you stored it
              const code =
                typeof snap.weathercode === 'number' ? snap.weathercode : null
              if (code === 0) return '☀️'
              if ([1, 2, 3].includes(code)) return '⛅️'
              if ([45, 48].includes(code)) return '🌫️'
              if ([51, 53, 55, 56, 57].includes(code)) return '🌦️'
              if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️'
              if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️'
              if ([95, 96, 99].includes(code)) return '⛈️'

              // fallback: try a string field like "icon" or "summary"
              const icon = (snap.icon || snap.summary || '').toLowerCase()
              if (icon.includes('sun') || icon.includes('clear')) return '☀️'
              if (icon.includes('cloud')) return '☁️'
              if (icon.includes('rain') || icon.includes('shower')) return '🌧️'
              if (icon.includes('snow')) return '❄️'
              if (icon.includes('storm') || icon.includes('thunder'))
                return '⛈️'
              if (icon.includes('fog')) return '🌫️'
              return '🌡️'
            })()

            // COMPACT (mobile for week/month)
            const compactCell = (innerLabel) => (
              <div
                key={index}
                className={`cal-cell compact ${hasShifts ? 'busy' : ''}`}
                style={{ opacity: view === 'month' && !inMonth ? 0.45 : 1 }}
                onClick={() => {
                  setDaySheetDate(key)
                  setDaySheetOpen(true)
                }}
              >
                <div className="cal-cell-head">
                  <span className={today ? 'cal-cell-today' : ''}>
                    {innerLabel}
                  </span>
                </div>
                {hasShifts && <div className="dot" aria-hidden />}
                {weatherEmoji && (
                  <div
                    className="weather-emoji-small"
                    title="Weather"
                    aria-hidden
                  >
                    {weatherEmoji}
                  </div>
                )}
              </div>
            )

            if (isSmall && (view === 'month' || view === 'week')) {
              const label =
                view === 'month'
                  ? date.getDate()
                  : date.toLocaleDateString(undefined, {
                      day: 'numeric',
                    })
              return compactCell(label)
            }

            // DESKTOP or day view
            if (view === 'day') {
              // ---- Weather model for the day (first shift that has weather) ----
              const wxSnap =
                (shifts.find((s) => s?.weather_snapshot) || {})
                  ?.weather_snapshot || null
              const weather = (() => {
                if (!wxSnap) return null
                const code =
                  typeof wxSnap.weathercode === 'number'
                    ? wxSnap.weathercode
                    : null
                const emoji =
                  code === 0
                    ? '☀️'
                    : [1, 2, 3].includes(code)
                      ? '⛅️'
                      : [45, 48].includes(code)
                        ? '🌫️'
                        : [51, 53, 55, 56, 57].includes(code)
                          ? '🌦️'
                          : [61, 63, 65, 66, 67, 80, 81, 82].includes(code)
                            ? '🌧️'
                            : [71, 73, 75, 77, 85, 86].includes(code)
                              ? '❄️'
                              : [95, 96, 99].includes(code)
                                ? '⛈️'
                                : String(wxSnap.summary || '')
                                      .toLowerCase()
                                      .includes('cloud')
                                  ? '☁️'
                                  : '🌡️'

                const toF = (c) => Math.round((c * 9) / 5 + 32)
                const tAvg =
                  typeof wxSnap.t_avg_f === 'number'
                    ? Math.round(wxSnap.t_avg_f)
                    : typeof wxSnap.t_avg_c === 'number'
                      ? toF(wxSnap.t_avg_c)
                      : null
                const tMax =
                  typeof wxSnap.t_max_f === 'number'
                    ? Math.round(wxSnap.t_max_f)
                    : typeof wxSnap.t_max_c === 'number'
                      ? toF(wxSnap.t_max_c)
                      : null
                const tMin =
                  typeof wxSnap.t_min_f === 'number'
                    ? Math.round(wxSnap.t_min_f)
                    : typeof wxSnap.t_min_c === 'number'
                      ? toF(wxSnap.t_min_c)
                      : null
                const tempLine =
                  tAvg != null
                    ? `${tAvg}°`
                    : tMin != null && tMax != null
                      ? `${tMin}° / ${tMax}°`
                      : tMax != null
                        ? `${tMax}°`
                        : tMin != null
                          ? `${tMin}°`
                          : null

                const precipIn =
                  typeof wxSnap.precip_in === 'number'
                    ? wxSnap.precip_in
                    : typeof wxSnap.precip_mm === 'number'
                      ? Math.round((wxSnap.precip_mm / 25.4) * 100) / 100
                      : null
                const precipText =
                  precipIn != null && precipIn > 0
                    ? `${precipIn.toFixed(precipIn < 0.1 ? 2 : 1)} in`
                    : null
                const summary = wxSnap.summary || 'Weather'

                return { emoji, tempLine, precipText, summary }
              })()

              return (
                <div key={index} className="cal-cell day-card">
                  {/* Header */}
                  <div className="cal-day-head">
                    <div className={`title ${today ? 'cal-cell-today' : ''}`}>
                      {date.toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                      })}
                    </div>
                    {weather && (
                      <div className="wx-badge" title="Weather" aria-hidden>
                        {weather.emoji}
                      </div>
                    )}
                  </div>

                  {/* Weather strip (only if available) */}
                  {weather && (
                    <div className="day-weather">
                      <div className="left">
                        <span className="emoji">{weather.emoji}</span>
                        <div className="stack">
                          <div className="summary">
                            <strong>{weather.summary}</strong>
                          </div>
                          <div className="sub">
                            {weather.tempLine ? (
                              <span>Temp: {weather.tempLine}</span>
                            ) : null}
                            {weather.precipText ? (
                              <span> · Precip: {weather.precipText}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Shifts list */}
                  {shifts.length === 0 ? (
                    <div
                      className="cal-shift cal-empty"
                      onClick={() => openAddFor(date)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && openAddFor(date)}
                      aria-label="Add a shift for this day"
                    >
                      <div className="note">No shifts yet. Tap to add.</div>
                    </div>
                  ) : (
                    <div className="shift-list">
                      {shifts.map((shift) => {
                        const cash = Number(shift?.cash_tips ?? 0)
                        const card = Number(shift?.card_tips ?? 0)
                        const tipout = Number(shift?.tip_out_total ?? 0)
                        const hours = Number(shift?.hours ?? 0)
                        const net = cash + card - tipout
                        const eff = hours > 0 ? net / hours : 0
                        return (
                          <div
                            key={shift.id}
                            className="shift-chip-day"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedShift(shift)
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setSelectedShift(shift)
                            }}
                          >
                            <div className="row">
                              <b className="net">
                                {currencyFormatter.format(net)}
                              </b>
                              <span className="dot">·</span>
                              <span className="hours">{hours.toFixed(2)}h</span>
                              <span className="eff">
                                ({currencyFormatter.format(eff)} /h)
                              </span>
                            </div>
                            {shift?.notes ? (
                              <div className="notes">{shift.notes}</div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <div
                key={index}
                className="cal-cell"
                style={{ opacity: view === 'month' && !inMonth ? 0.45 : 1 }}
              >
                <div className="cal-cell-head">
                  <span className={today ? 'cal-cell-today' : ''}>
                    {view === 'month'
                      ? date.getDate()
                      : date.toLocaleDateString(undefined, { day: 'numeric' })}
                  </span>
                  {weatherEmoji && (
                    <div className="weather-emoji" title="Weather" aria-hidden>
                      {weatherEmoji}
                    </div>
                  )}
                  <button
                    className="cal-btn"
                    title="Add shift"
                    onClick={() => openAddFor(date)}
                  >
                    +
                  </button>
                </div>

                {preview.map((shift) => {
                  const net =
                    Number(shift.cash_tips || 0) +
                    Number(shift.card_tips || 0) -
                    Number(shift.tip_out_total || 0)
                  const eff =
                    Number(shift.hours || 0) > 0 ? net / Number(shift.hours) : 0
                  return (
                    <div
                      key={shift.id}
                      className="cal-shift"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedShift(shift)
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setSelectedShift(shift)
                      }}
                    >
                      <div>
                        <b>{currencyFormatter.format(net)}</b> {S.middot}{' '}
                        {Number(shift.hours || 0).toFixed(2)}h
                      </div>
                      <div className="note">
                        {currencyFormatter.format(eff)} /h
                      </div>
                    </div>
                  )
                })}
                {more > 0 && <div className="cal-more">+{more} more</div>}
              </div>
            )
          })}
        </div>
      </div>
      <TabBar />

      {/* Shift details modal (edit/delete) */}
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
            if (error) return alert(error.message)
            setRows((prev) => prev.map((r) => (r.id === data.id ? data : r)))
            setSelectedShift(data)
          }}
          onDelete={async () => {
            const { error } = await supabase
              .from('shifts')
              .delete()
              .eq('id', selectedShift.id)
              .eq('user_id', user.id)
            if (error) return alert(error.message)
            setRows((prev) => prev.filter((r) => r.id !== selectedShift.id))
            setSelectedShift(null)
          }}
          currencyFormatter={currencyFormatter}
          tipsOnPaycheck={tipsOnPaycheck}
          showCashInput={showCashInput}
          showCardInput={showCardInput}
          defaultTipoutPct={defaultTipoutPct}
        />
      )}

      <DaySheetModal
        open={daySheetOpen}
        date={daySheetDate}
        shifts={byDate.get(daySheetDate) || []}
        onClose={() => setDaySheetOpen(false)}
        onAdd={(dateObj) => {
          openAddFor(dateObj)
          setDaySheetOpen(false)
        }}
        onOpenShift={(shift) => {
          setSelectedShift(shift)
          setDaySheetOpen(false)
        }}
        currencyFormatter={currencyFormatter}
      />

      {addOpen && (
        <AddShiftModal
          open={true}
          initialDate={addDate}
          onClose={() => setAddOpen(false)}
          onSave={handleAddSave}
        />
      )}

      {/* Inline compact styles specific to this page */}

      <style jsx>{`
        /* === Calendar Grid (compact modes) === */
        :global(.cal-grid.cal-week.compact),
        :global(.cal-grid.cal-month.compact) {
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
        }
        :global(.cal-cell.compact) {
          min-height: 56px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        :global(.cal-cell.compact .cal-cell-head) {
          margin-bottom: 2px;
          font-size: 12px;
        }
        :global(.cal-btn.cal-btn-mini) {
          padding: 2px 8px;
          border-radius: 999px;
        }
        :global(.cal-cell.compact .dot) {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--brand, #2563eb);
          align-self: flex-start;
          margin-left: 2px;
        }
        :global(.cal-cell.compact.busy) {
          background: #f9fafb;
        }

        /* Avoid overflow in shift previews */
        :global(.cal-cell),
        :global(.cal-shift),
        :global(.cal-more),
        :global(.cal-shift > div),
        :global(.cal-shift .note) {
          min-width: 0;
        }

        /* === Controls row: align & unify sizes === */
        :global(.cal-controls) {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        :global(.cal-btn),
        :global(.cal-select) {
          display: inline-flex;
          align-items: center;
          height: 32px; /* same height across buttons & select */
          padding: 0 10px; /* same horizontal padding */
          font-size: 12px; /* same text size */
          line-height: 1;
          border-radius: 10px;
          box-sizing: border-box;
        }

        /* View dropdown (used on all breakpoints) */
        :global(.cal-tabs) {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        :global(.cal-select) {
          width: 160px; /* set width; adjust to taste */
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--text);
          appearance: none;
          -webkit-appearance: none;
          padding-right: 28px; /* room for chevrons */
          background-image:
            linear-gradient(45deg, transparent 50%, #6b7280 50%),
            linear-gradient(135deg, #6b7280 50%, transparent 50%);
          background-position:
            right 12px center,
            right 6px center;
          background-size:
            6px 6px,
            6px 6px;
          background-repeat: no-repeat;
        }
        :global(.cal-select:focus) {
          outline: 2px solid var(--brand);
          outline-offset: 2px;
        }

        /* Title & select tweaks on small screens */
        @media (max-width: 640px) {
          :global(.cal-header .cal-title) {
            font-size: 16px;
          }
        }
        @media (max-width: 420px) {
          :global(.cal-select) {
            width: 140px;
          }
          :global(.cal-shift.cal-empty) {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 10px;
            background: #f9fafb;
            border: 1px dashed var(--border, #e5e7eb);
            border-radius: 10px;
            cursor: pointer;
          }
        }
        :global(.cal-cell) {
          position: relative;
        }
        :global(.cal-cell.compact) {
          position: relative; /* so the badge can anchor to this cell */
        }

        :global(.weather-emoji-small) {
          position: absolute;
          top: 4px;
          right: 6px;
          font-size: 12px;
          line-height: 1;
          opacity: 0.9;
          pointer-events: none; /* don’t block taps */
          user-select: none;
        }
        :global(.weather-emoji) {
          position: absolute;
          top: 16px;
          left: 25px;
          font-size: 14px;
          line-height: 1;
          opacity: 0.9;
          pointer-events: none; /* don’t block taps */
          user-select: none;
        }
        /* Day card container */
        :global(.cal-grid.cal-day .day-card) {
          display: grid;
          gap: 12px;
        }

        /* Header with small emoji at top-right */
        :global(.cal-grid.cal-day .cal-day-head) {
          position: relative;
          display: flex;
          align-items: baseline;
          justify-content: space-between;
        }
        :global(.cal-grid.cal-day .cal-day-head .title) {
          font-weight: 600;
        }
        :global(.cal-grid.cal-day .cal-day-head .wx-badge) {
          font-size: 16px;
          line-height: 1;
          opacity: 0.95;
          user-select: none;
          pointer-events: none;
        }

        /* Weather strip */
        :global(.cal-grid.cal-day .day-weather) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--border, #e5e7eb);
          background: linear-gradient(135deg, #eff6ff, #f0fdfa);
          box-shadow: 0 6px 18px rgba(30, 58, 138, 0.06);
        }
        :global(.cal-grid.cal-day .day-weather .left) {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        :global(.cal-grid.cal-day .day-weather .emoji) {
          font-size: 22px;
        }
        :global(.cal-grid.cal-day .day-weather .stack) {
          display: grid;
          gap: 2px;
          min-width: 0;
        }
        :global(.cal-grid.cal-day .day-weather .summary) {
          font-weight: 800;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        :global(.cal-grid.cal-day .day-weather .sub) {
          font-size: 12px;
          color: #475569;
        }

        /* Shift chips */
        :global(.cal-grid.cal-day .shift-list) {
          display: grid;
          gap: 8px;
        }
        :global(.cal-grid.cal-day .shift-chip-day) {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
          cursor: pointer;
          transition:
            background 0.15s,
            transform 0.08s;
        }
        :global(.cal-grid.cal-day .shift-chip-day:hover) {
          background: var(--hover);
          transform: translateY(-1px);
        }
        :global(.cal-grid.cal-day .shift-chip-day .row) {
          display: flex;
          align-items: baseline;
          gap: 6px;
          flex-wrap: wrap;
        }
        :global(.cal-grid.cal-day .shift-chip-day .net) {
          color: var(--brand, #2563eb);
        }
        :global(.cal-grid.cal-day .shift-chip-day .hours),
        :global(.cal-grid.cal-day .shift-chip-day .eff) {
          color: var(--text-muted);
          font-size: 13px;
        }
        :global(.cal-grid.cal-day .shift-chip-day .notes) {
          margin-top: 4px;
          font-size: 13px;
          color: var(--text-muted);
        }
      `}</style>
      <style jsx>{`
        .kpi-summary.compact {
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #fff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .kpi-grid {
          display: flex;
          justify-content: space-between;
          align-items: center;
          text-align: center;
          gap: 8px;
        }

        .kpi-item {
          flex: 1;
          min-width: 80px;
        }

        .h1.small {
          font-size: 16px;
          font-weight: 600;
          margin-top: 2px;
        }

        .note {
          font-size: 12px;
          color: #6b7280;
        }

        .divider {
          width: 1px;
          height: 24px;
          background: #e5e7eb;
          opacity: 0.8;
        }

        @media (max-width: 600px) {
          .kpi-grid {
            gap: 6px;
          }
          .h1.small {
            font-size: 15px;
          }
          .divider {
            height: 20px;
          }
        }
      `}</style>
    </div>
  )
}
