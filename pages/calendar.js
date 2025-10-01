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

// Safe symbol constants
const S = {
  ellipsis: '\u2026',
  ndash: '\u2013',
  middot: '\u00B7',
  times: '\u00D7',
  prev: '\u2039',
  next: '\u203A',
}

// ===== Local date helpers (no UTC shift) =====
function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
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
// Local-safe YYYY-MM-DD from a Date
function isoDate(d) {
  const x = new Date(d)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
// Parse 'YYYY-MM-DD' as a local date (no UTC shift)
function parseDateOnlyLocal(s) {
  if (!s) return new Date(NaN)
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export default function CalendarPage({ theme, setTheme }) {
  const { user, loading } = useUser()
  const { settings } = useSettings()
  const router = useRouter()

  const [view, setView] = useState('month')
  const [viewInitialized, setViewInitialized] = useState(false)
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))
  const [rows, setRows] = useState([])
  const [selectedShift, setSelectedShift] = useState(null)

  // New Add Shift modal state (component handles its own form)
  const [addOpen, setAddOpen] = useState(false)
  const [addDate, setAddDate] = useState(isoDate(new Date()))

  const weekStartSetting =
    settings?.week_start === 'sunday' ? 'sunday' : 'monday'
  const defaultViewSetting =
    settings?.default_calendar_view === 'day' ||
    settings?.default_calendar_view === 'week' ||
    settings?.default_calendar_view === 'month'
      ? settings.default_calendar_view
      : null

  const selectView = (next) => {
    setView(next)
    setViewInitialized(true)
  }

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
  const currencySymbol = useMemo(() => {
    const sample = currencyFormatter.format(0)
    const symbol = sample.replace(/[0-9.,\s\u00A0]/g, '').trim()
    return symbol || currencyCode
  }, [currencyFormatter, currencyCode])

  const payoutMode = settings?.payout_mode || 'both'
  const showCashInput = payoutMode === 'both' || payoutMode === 'cash_only'
  const showCardInput = payoutMode === 'both' || payoutMode === 'card_only'
  const tipsOnPaycheck = payoutMode === 'on_paycheck'
  const defaultTipoutPct =
    typeof settings?.default_tipout_pct === 'number'
      ? settings.default_tipout_pct
      : null

  // ===== URL params -> view/cursor + add modal =====
  useEffect(() => {
    const v = router.query.view
    if (v === 'day' || v === 'week' || v === 'month') {
      setView(v)
      setViewInitialized(true)
    }
    // cursor date (if provided)
    if (router.query.d) {
      const d = parseDateOnlyLocal(String(router.query.d))
      if (!isNaN(d)) setCursor(startOfDay(d))
    }
    // open Add modal if add=1 (with or without d)
    if (router.query.add === '1') {
      const maybeDate = router.query.d
        ? parseDateOnlyLocal(String(router.query.d))
        : new Date()
      const safeDate = isNaN(maybeDate) ? new Date() : maybeDate
      setAddDate(isoDate(safeDate))
      setAddOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.view, router.query.d, router.query.add])

  // Default view (from settings) if not set by router
  useEffect(() => {
    if (viewInitialized) return
    if (defaultViewSetting) {
      setView(defaultViewSetting)
      setViewInitialized(true)
    }
  }, [defaultViewSetting, viewInitialized])

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

  // Load rows for visible range
  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { start, end } = range
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .gte('date', isoDate(start))
        .lt('date', isoDate(end))
        .order('date', { ascending: true })
      if (!error) setRows(data || [])
    })()
  }, [user, range.start?.getTime(), range.end?.getTime()])

  // Maps + totals
  const byDate = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const k = r.date
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(r)
    }
    return map
  }, [rows])

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

  // Keyboard nav
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
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  if (loading)
    return (
      <div className="container">
        <div className="card">Loading{S.ellipsis}</div>
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

  function openAddFor(dateObj) {
    setAddDate(isoDate(dateObj))
    setAddOpen(true)
  }

  // Insert from AddShiftModal
  async function saveNewShift(payload) {
    const { data, error } = await supabase
      .from('shifts')
      .insert({ user_id: user.id, ...payload })
      .select('*')
      .single()

    if (error) {
      alert(error.message)
      return
    }
    setRows((prev) => [...prev, data])
  }

  // Edit/Delete handlers (keep inside component so user is in scope)
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
    setRows((prev) => prev.map((r) => (r.id === data.id ? data : r)))
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
    setRows((prev) => prev.filter((r) => r.id !== shiftId))
    setSelectedShift(null)
  }

  // Cells for current view
  const cells = []
  if (view === 'day') {
    cells.push(startOfDay(cursor))
  } else if (view === 'week') {
    const start = startOfWeek(cursor, weekStartSetting)
    for (let i = 0; i < 7; i++) cells.push(addDays(start, i))
  } else {
    const start = range.start
    for (let i = 0; i < 42; i++) cells.push(addDays(start, i))
  }

  return (
    <div className="page">
      <HeaderBar />
      <div className="container">
        {/* Header */}
        <div className="cal-header">
          <div className="cal-title">{range.label}</div>
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
            >
              {S.prev}
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
            >
              {S.next}
            </button>
            <div className="cal-tabs">
              <button
                className={`cal-tab ${view === 'day' ? 'active' : ''}`}
                onClick={() => selectView('day')}
              >
                Day
              </button>
              <button
                className={`cal-tab ${view === 'week' ? 'active' : ''}`}
                onClick={() => selectView('week')}
              >
                Week
              </button>
              <button
                className={`cal-tab ${view === 'month' ? 'active' : ''}`}
                onClick={() => selectView('month')}
              >
                Month
              </button>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="two grid" style={{ marginBottom: 8 }}>
          <div className="card">
            <div className="note">Net</div>
            <div className="h1">{currencyFormatter.format(totals.net)}</div>
          </div>
          <div className="card">
            <div className="note">Hours</div>
            <div className="h1">{totals.hours.toFixed(1)}</div>
          </div>
        </div>
        <div className="card">
          <div className="note">Effective hourly</div>
          <div className="h1">{currencyFormatter.format(totals.eff)} /h</div>
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
              ? 'cal-month'
              : view === 'week'
                ? 'cal-week'
                : 'cal-day'
          }`}
        >
          {cells.map((date, index) => {
            const today = sameDate(date, new Date())
            const iso = isoDate(date)
            const shifts = byDate.get(iso) || []
            const preview = shifts.slice(0, 3)
            const more = Math.max(0, shifts.length - preview.length)
            const inMonth =
              date.getMonth() === cursor.getMonth() || view !== 'month'
            return (
              <div
                key={index}
                className="cal-cell"
                style={{ opacity: view === 'month' && !inMonth ? 0.45 : 1 }}
              >
                <div className="cal-cell-head">
                  <span className={today ? 'cal-cell-today' : ''}>
                    {date.getDate()}
                  </span>
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
                        {shift.hours}h
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

      {/* Shift Details Modal */}
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

      {/* Add Shift Modal */}
      <AddShiftModal
        open={addOpen}
        initialDate={addDate}
        onClose={() => setAddOpen(false)}
        onSave={saveNewShift}
        currencyFormatter={currencyFormatter}
        currencySymbol={currencySymbol}
        tipsOnPaycheck={tipsOnPaycheck}
        showCashInput={showCashInput}
        showCardInput={showCardInput}
        defaultTipoutPct={defaultTipoutPct}
      />
    </div>
  )
}
