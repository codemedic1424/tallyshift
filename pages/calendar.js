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

// ---------- helpers ----------
const S = { ndash: '\u2013', times: '\u00D7', middot: '\u00B7' }

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
  async function handleAddSave(payload) {
    if (!user) return alert('Sign in first')
    const dbRow = { user_id: user.id, ...payload }
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
              <button
                className={`cal-tab ${view === 'day' ? 'active' : ''}`}
                onClick={() => setView('day')}
              >
                Day
              </button>
              <button
                className={`cal-tab ${view === 'week' ? 'active' : ''}`}
                onClick={() => setView('week')}
              >
                Week
              </button>
              <button
                className={`cal-tab ${view === 'month' ? 'active' : ''}`}
                onClick={() => setView('month')}
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
              </div>
            )

            if (isSmall && (view === 'month' || view === 'week')) {
              const label =
                view === 'month'
                  ? date.getDate()
                  : date.toLocaleDateString(undefined, {
                      weekday: 'short',
                      day: 'numeric',
                    })
              return compactCell(label)
            }

            // DESKTOP or day view
            if (view === 'day') {
              return (
                <div key={index} className="cal-cell">
                  <div className="cal-cell-head">
                    <span className={today ? 'cal-cell-today' : ''}>
                      {date.toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {shifts.length === 0 && <div className="note">No shifts</div>}
                  {shifts.map((shift) => {
                    const net =
                      Number(shift.cash_tips || 0) +
                      Number(shift.card_tips || 0) -
                      Number(shift.tip_out_total || 0)
                    const eff =
                      Number(shift.hours || 0) > 0
                        ? net / Number(shift.hours)
                        : 0
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

      {/* MOBILE Day sheet */}
      {daySheetOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setDaySheetOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(560px, 92vw)' }}
          >
            <div className="modal-head">
              <div className="modal-title">
                {parseDateOnlyLocal(daySheetDate).toLocaleDateString()}
              </div>
              <button
                className="cal-btn"
                onClick={() => setDaySheetOpen(false)}
                aria-label="Close day details"
              >
                {S.times}
              </button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gap: 10 }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  openAddFor(parseDateOnlyLocal(daySheetDate))
                  setDaySheetOpen(false)
                }}
              >
                + Add shift
              </button>
              {(byDate.get(daySheetDate) || []).length === 0 && (
                <div className="note">No shifts yet for this day.</div>
              )}
              {(byDate.get(daySheetDate) || []).map((shift) => {
                const cash = Number(shift?.cash_tips ?? 0)
                const card = Number(shift?.card_tips ?? 0)
                const tipout = Number(shift?.tip_out_total ?? 0)
                const hours = Number(shift?.hours ?? 0)
                const net = cash + card - tipout
                const eff = hours > 0 ? net / hours : 0
                const fmt = (n) =>
                  currencyFormatter?.format
                    ? currencyFormatter.format(n)
                    : `$${Number(n || 0).toFixed(2)}`
                return (
                  <div
                    key={shift.id}
                    className="cal-shift"
                    onClick={() => {
                      setSelectedShift(shift)
                      setDaySheetOpen(false)
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setSelectedShift(shift)
                        setDaySheetOpen(false)
                      }
                    }}
                  >
                    <div>
                      <b>{fmt(net)}</b> {S.middot} {hours.toFixed(2)}h
                    </div>
                    <div className="note">{fmt(eff)} /h</div>
                    {shift?.notes ? (
                      <div className="note" style={{ marginTop: 4 }}>
                        {shift.notes}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <div
              className="modal-actions"
              style={{ justifyContent: 'flex-end' }}
            >
              <button
                className="btn secondary"
                onClick={() => setDaySheetOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
        :global(.cal-cell),
        :global(.cal-shift),
        :global(.cal-more) {
          min-width: 0;
        }
        :global(.cal-shift > div),
        :global(.cal-shift .note) {
          min-width: 0;
        }
        @media (max-width: 640px) {
          :global(.cal-header .cal-title) {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  )
}
