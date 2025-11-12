// pages/insights.js
import Link from 'next/link'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useUser } from '../lib/useUser'
import { useSettings } from '../lib/useSettings'
import { supabase } from '../lib/supabase'
import HeaderBar from '../ui/HeaderBar'
import TabBar from '../ui/TabBar'
import ShiftDetailsModal from '../ui/ShiftDetailsModal'
import { useSpring, animated } from '@react-spring/web'
import Seg from '../ui/Seg'

function useDebouncedEffect(fn, deps, delay = 600) {
  const t = useRef()
  useEffect(() => {
    clearTimeout(t.current)
    t.current = setTimeout(() => fn(), delay)
    return () => clearTimeout(t.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

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

const TF = {
  THIS_MONTH: 'this_month',
  LAST_3: 'last_3',
  YTD: 'ytd',
}
// ---- GoalPaceCard (goal tracker with suggestions + shifts-remaining clamp) ----

// local-safe helpers available in this file:
// parseDateOnlyLocal, addDays already exist above in your page file.

function startEndOfThisWeek(today, mondayStart) {
  const d = new Date(today)
  const dow = d.getDay() // 0=Sun..6=Sat
  const offset = mondayStart ? (dow === 0 ? 6 : dow - 1) : dow
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  start.setDate(d.getDate() - offset)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function startEndOfThisMonth(today) {
  const y = today.getFullYear()
  const m = today.getMonth()
  const start = new Date(y, m, 1, 0, 0, 0, 0)
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function iso(d) {
  return d.toISOString().split('T')[0]
}

function sumNetRows(rows) {
  return rows.reduce(
    (a, r) =>
      a +
      (Number(r.cash_tips || 0) +
        Number(r.card_tips || 0) -
        Number(r.tip_out_total || 0)),
    0,
  )
}
function GoalPaceCard({ rows, currencyFormatter, settings }) {
  const { user } = useUser()

  // ---------- persisted state (mirrors DB row) ----------
  const [paceType, setPaceType] = useState('monthly') // 'weekly' | 'monthly'
  const [weeklyGoalCents, setWeeklyGoalCents] = useState(0)
  const [monthlyGoalCents, setMonthlyGoalCents] = useState(0)
  const [shiftsRemainingWeekly, setShiftsRemainingWeekly] = useState(0)
  const [shiftsRemainingMonthly, setShiftsRemainingMonthly] = useState(0)
  const [loadingRow, setLoadingRow] = useState(true)
  // display string so we can control leading zeros
  const [plannedStr, setPlannedStr] = useState('0')
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const prevGoalMetRef = useRef(false)

  // keep display string in sync when type or values change (and when clamp fires)
  useEffect(() => {
    const v =
      paceType === 'weekly' ? shiftsRemainingWeekly : shiftsRemainingMonthly
    setPlannedStr(String(Math.max(0, v || 0)))
  }, [paceType, shiftsRemainingWeekly, shiftsRemainingMonthly])

  // helper to set shifts (writes to correct side, clamps, and updates display)
  function updatePlanned(val) {
    const v = Math.max(0, Math.min(maxFeasibleShifts, Number(val || 0)))
    if (paceType === 'weekly') setShiftsRemainingWeekly(v)
    else setShiftsRemainingMonthly(v)
    setPlannedStr(String(v))
  }

  // masked input value for the *current* type
  const goalCentsCurrent =
    paceType === 'weekly' ? weeklyGoalCents : monthlyGoalCents
  const goal = useMemo(() => (goalCentsCurrent || 0) / 100, [goalCentsCurrent])
  const formatCents = (c) => currencyFormatter.format((c || 0) / 100)

  // derived helpers that respect the current type
  const plannedShifts =
    paceType === 'weekly' ? shiftsRemainingWeekly : shiftsRemainingMonthly
  const setPlannedShifts = (v) =>
    paceType === 'weekly'
      ? setShiftsRemainingWeekly(v)
      : setShiftsRemainingMonthly(v)

  const setMaskedGoal = (next) => {
    if (paceType === 'weekly') setWeeklyGoalCents(next)
    else setMonthlyGoalCents(next)
  }

  // ---------- initial load / ensure row ----------
  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setLoadingRow(true)
      const { data, error } = await supabase
        .from('pace_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cancelled) return
      if (error) console.error('pace_goals fetch error', error)

      if (!data) {
        // create default row
        const { error: insErr } = await supabase.from('pace_goals').insert({
          user_id: user.id,
          pace_type: 'monthly',
          weekly_goal_cents: 0,
          monthly_goal_cents: 0,
          shifts_remaining_weekly: 0,
          shifts_remaining_monthly: 0,
        })
        if (insErr) console.error('pace_goals insert error', insErr)
        setPaceType('monthly')
        setWeeklyGoalCents(0)
        setMonthlyGoalCents(0)
        setShiftsRemainingWeekly(0)
        setShiftsRemainingMonthly(0)
      } else {
        setPaceType(data.pace_type || 'monthly')
        setWeeklyGoalCents(data.weekly_goal_cents || 0)
        setMonthlyGoalCents(data.monthly_goal_cents || 0)
        setShiftsRemainingWeekly(data.shifts_remaining_weekly || 0)
        setShiftsRemainingMonthly(data.shifts_remaining_monthly || 0)
        // hydrate masked input for the current type
      }
      setLoadingRow(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  // ---------- debounced save (upsert) ----------
  useDebouncedEffect(
    () => {
      if (!user || loadingRow) return
      const payload = {
        user_id: user.id,
        pace_type: paceType,
        weekly_goal_cents: weeklyGoalCents,
        monthly_goal_cents: monthlyGoalCents,
        shifts_remaining_weekly: shiftsRemainingWeekly,
        shifts_remaining_monthly: shiftsRemainingMonthly,
        updated_at: new Date().toISOString(),
      }
      supabase
        .from('pace_goals')
        .upsert(payload, { onConflict: 'user_id' })
        .then(({ error }) => {
          if (error) console.error('pace_goals save error', error)
        })
    },
    [
      user?.id,
      paceType,
      weeklyGoalCents,
      monthlyGoalCents,
      shiftsRemainingWeekly,
      shiftsRemainingMonthly,
      loadingRow,
    ],
    600,
  )

  // ---------- your existing math (unchanged) ----------
  const weekStartsOnMonday = settings?.week_start === 'monday'
  const today = new Date()
  const { start: weekStart, end: weekEnd } = startEndOfThisWeek(
    today,
    weekStartsOnMonday,
  )
  const { start: monthStart, end: monthEnd } = startEndOfThisMonth(today)
  const currentPeriod =
    paceType === 'weekly'
      ? { start: weekStart, end: weekEnd }
      : { start: monthStart, end: monthEnd }
  const startIso = iso(currentPeriod.start)
  const endIso = iso(currentPeriod.end)

  const currentShifts = rows.filter(
    (r) => r.date >= startIso && r.date <= endIso,
  )
  const totalNet = sumNetRows(currentShifts)
  const completedShifts = currentShifts.length

  const isoToday = iso(today)
  const trueMaxDaysLeft =
    Math.max(
      0,
      Math.floor(
        (parseDateOnlyLocal(endIso) - parseDateOnlyLocal(isoToday)) /
          (1000 * 60 * 60 * 24),
      ),
    ) + 1
  const maxFeasibleShifts = trueMaxDaysLeft

  const [wasClamped, setWasClamped] = useState(false)
  const effectiveShiftsRemaining = Math.min(
    plannedShifts || 0,
    maxFeasibleShifts,
  )
  useEffect(() => {
    prevGoalMetRef.current = false
  }, [paceType, startIso, endIso])

  useEffect(() => {
    const clamped = (plannedShifts || 0) > maxFeasibleShifts
    setWasClamped(clamped)
    if (clamped) setPlannedShifts(maxFeasibleShifts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxFeasibleShifts])

  const target = goal > 0 ? goal : 0
  const remainingToGoal = Math.max(0, target - totalNet)
  const neededPerShift =
    effectiveShiftsRemaining > 0
      ? remainingToGoal / effectiveShiftsRemaining
      : 0
  const EPS = 0.005 // ~½ cent
  const hasGoal = Number.isFinite(goalCentsCurrent) && goalCentsCurrent > 0
  const goalMet = hasGoal && totalNet + EPS >= goal
  const periodOver = maxFeasibleShifts === 0
  const pct = target > 0 ? Math.min(100, (totalNet / target) * 100) : 0
  const title = paceType === 'weekly' ? 'Weekly Goal' : 'Monthly Goal'
  const tfPill = paceType === 'weekly' ? 'This week' : 'This month'
  const formatMoney = (v) => currencyFormatter.format(Math.max(0, v || 0))
  // 🎉 Confetti celebration when goal is met
  useEffect(() => {
    if (loadingRow) return
    if (typeof window === 'undefined') return
    if (isEditingGoal) return // 👈 do not celebrate while typing
    if (!goalMet) {
      prevGoalMetRef.current = false // track transition
      return
    }
    if (prevGoalMetRef.current) return // only fire on false -> true

    // Respect reduced motion
    const prefersReduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    )?.matches
    if (prefersReduced) return

    // Build a "meaningful state" key so we celebrate when:
    // - user switches weekly/monthly (paceType)
    // - period changes (start/end)
    // - goal changes (goalCents)
    // - progress changes (totalNet)
    // This also guarantees a celebration on browser refresh (ref resets).
    const celebrationKey = [
      paceType,
      startIso,
      endIso,
      `goal:${goalCentsCurrent}`, // cents so it's precise
      `net:${Math.round(totalNet * 100)}`, // cents as well
    ].join('|')

    // De-dupe within the same render lifecycle, but allow on any new key
    if (!window.__paceConfettiLastKey) window.__paceConfettiLastKey = null
    if (window.__paceConfettiLastKey === celebrationKey) return

    let cancelled = false
    ;(async () => {
      const confetti = (await import('canvas-confetti')).default

      // Main burst
      confetti({
        particleCount: 150,
        spread: 80,
        startVelocity: 45,
        ticks: 200,
        origin: { y: 0.6 },
      })

      // Side streams for ~2s
      const duration = 2000
      const end = Date.now() + duration
      ;(function frame() {
        if (cancelled) return
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } })
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } })
        if (Date.now() < end) requestAnimationFrame(frame)
      })()

      // Mark last celebration for this exact state
      window.__paceConfettiLastKey = celebrationKey
      prevGoalMetRef.current = true
    })()

    return () => {
      cancelled = true
    }
  }, [
    goalMet,
    paceType,
    startIso,
    endIso,
    goalCentsCurrent,
    totalNet,
    loadingRow,
    isEditingGoal,
  ])

  // ---------- UI (unchanged, but with setMaskedGoal / setPlannedShifts) ----------
  return (
    <>
      <div
        className={`card goal-pace-card ${goalMet ? 'met' : ''} ${periodOver ? 'over' : ''}`}
      >
        <div className="top-row">
          <div className="h2" style={{ fontSize: 16 }}>
            {title}
          </div>
          <Seg
            value={paceType}
            onChange={(v) => setPaceType(v)}
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            compact
          />
        </div>

        <div className="progress-wrap" title={`${pct.toFixed(0)}%`}>
          <div className="progress">
            <div className="bar" style={{ width: `${pct}%` }} />
          </div>
          <div className="progress-row">
            <div className="note">
              {goalMet ? 'Goal met' : 'Progress'} · {pct.toFixed(0)}%
              <span className="pill tf">{tfPill}</span>
              {wasClamped && (
                <span className="pill warn">
                  Auto-adjusted to {maxFeasibleShifts} shift
                  {maxFeasibleShifts === 1 ? '' : 's'}
                </span>
              )}
              {periodOver && <span className="pill muted">Period ended</span>}
            </div>
            <div className="note">
              {formatMoney(totalNet)} / {formatMoney(target)}
            </div>
          </div>
        </div>

        <div className="goal-row" onClick={(e) => e.stopPropagation()}>
          <div className="field">
            <label className="note">Goal amount</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={formatCents(goalCentsCurrent)}
              onFocus={() => setIsEditingGoal(true)}
              onBlur={() => setIsEditingGoal(false)}
              onKeyDown={(e) => {
                const nav = [
                  'ArrowLeft',
                  'ArrowRight',
                  'ArrowUp',
                  'ArrowDown',
                  'Tab',
                  'Home',
                  'End',
                ]
                if (nav.includes(e.key)) return
                if (e.key === 'Backspace') {
                  e.preventDefault()
                  setMaskedGoal(Math.floor((goalCentsCurrent || 0) / 10))
                  return
                }

                if (e.key === 'Delete') {
                  e.preventDefault()
                  setMaskedGoal(0)
                  return
                }
                if (/^[0-9]$/.test(e.key)) {
                  e.preventDefault()
                  const digit = Number(e.key)
                  const next = (goalCentsCurrent || 0) * 10 + digit

                  const MAX_CENTS = 999999999
                  setMaskedGoal(Math.min(next, MAX_CENTS))
                  return
                }
                if (e.key === 'Enter') return
                e.preventDefault()
              }}
              onChange={() => {}}
              onPaste={(e) => {
                e.preventDefault()
                const text = (e.clipboardData?.getData('text') || '').replace(
                  /\D/g,
                  '',
                )
                if (!text) return
                const cents = Number(text)
                if (!Number.isNaN(cents)) setMaskedGoal(cents)
              }}
            />
            <div className="sub-note">
              Type numbers only. Last two are cents.
            </div>
          </div>

          {/* your suggestions block stays the same; it still calls setGoalCents -> now setMaskedGoal */}
        </div>

        <div className="stats" onClick={(e) => e.stopPropagation()}>
          <div className="stat">
            <div className="label">Completed shifts</div>
            <div className="value">{completedShifts}</div>
          </div>

          <div className="divider" />

          <div className="stat">
            <div className="label">Shifts remaining (planned)</div>
            <div className="stepper">
              <button
                onClick={() =>
                  updatePlanned((plannedStr ? Number(plannedStr) : 0) - 1)
                }
                aria-label="decrease shifts"
              >
                −
              </button>

              {/* use text + inputMode to control leading zeros cleanly */}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={plannedStr}
                onChange={(e) => {
                  // keep only digits
                  const digits = (e.target.value || '').replace(/\D/g, '')
                  // strip leading zeros but keep a single 0 if empty
                  const cleaned = digits.replace(/^0+(?=\d)/, '') || '0'
                  setPlannedStr(cleaned)
                }}
                onBlur={() => {
                  // commit to state/DB on blur (also clamps to max feasible)
                  updatePlanned(Number(plannedStr))
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur()
                  }
                }}
              />

              <button
                onClick={() =>
                  updatePlanned((plannedStr ? Number(plannedStr) : 0) + 1)
                }
                aria-label="increase shifts"
              >
                +
              </button>
            </div>

            <div className="sub-note">
              Max possible this {paceType === 'weekly' ? 'week' : 'month'}:{' '}
              {maxFeasibleShifts}
            </div>
          </div>

          <div className="divider" />

          <div className="stat">
            <div className="label">Needed per shift</div>
            <div className="value">
              {periodOver ? '—' : formatMoney(neededPerShift)}
            </div>
            <div className="sub-note">to hit your goal</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .goal-pace-card {
          position: relative;
          padding-bottom: 14px;
          transition:
            transform 0.12s ease,
            box-shadow 0.12s ease;
        }
        .goal-pace-card.met {
          outline: 2px solid rgba(34, 197, 94, 0.25);
          box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.08) inset;
        }
        .goal-pace-card.over {
          opacity: 0.92;
        }

        .top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 6px;
        }

        .progress-wrap {
          display: grid;
          gap: 8px;
          margin: 6px 0 2px;
        }
        .progress {
          height: 12px;
          background: #e5e7eb;
          border-radius: 999px;
          overflow: hidden;
        }
        .bar {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #22c55e, #16a34a);
          transition: width 0.6s ease;
        }
        .progress-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pill {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          margin-left: 8px;
        }
        .pill.tf {
          background: #eef2ff;
          color: #4338ca;
        }
        .pill.warn {
          background: #fff7ed;
          color: #9a3412;
        }
        .pill.muted {
          background: #f3f4f6;
          color: #374151;
        }

        .goal-row {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 12px;
          margin-top: 12px;
        }
        @media (max-width: 560px) {
          .goal-row {
            grid-template-columns: 1fr;
          }
        }
        .field {
          display: grid;
          gap: 6px;
        }
        .field input[type='number'],
        .field input[type='text'] {
          height: 36px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 0 10px;
          font-weight: 600;
          width: 100%;
          background: #fff;
          font-variant-numeric: tabular-nums; /* keeps digits from shifting */
        }

        .suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .sug {
          border: 1px solid #e5e7eb;
          background: #fff;
          border-radius: 999px;
          padding: 6px 10px;
          font-weight: 600;
        }

        .stats {
          display: grid;
          grid-template-columns: 1fr 1px 1fr 1px 1fr;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
        }
        @media (max-width: 560px) {
          .stats {
            grid-template-columns: 1fr;
          }
          .divider {
            display: none;
          }
        }
        .stat .label {
          font-size: 12px;
          color: #6b7280;
        }
        .stat .value {
          font-size: 18px;
          font-weight: 700;
        }
        .sub-note {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 4px;
        }
        .divider {
          width: 1px;
          height: 36px;
          background: #e5e7eb;
        }

        /* Inputs/steppers */
        .stepper {
          display: grid;
          grid-template-columns: 36px 1fr 36px;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
        }
        .stepper button {
          height: 36px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #fff;
          font-size: 20px;
          line-height: 1;
        }
        .stepper input {
          height: 36px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          text-align: center;
          font-weight: 700;
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
  const todayLocal = parseDateOnlyLocal(isoDate(new Date()))
  const last30Start = addDays(todayLocal, -29)

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
        {/* Goal Pace (full width) */}
        <GoalPaceCard
          rows={rows}
          currencyFormatter={currencyFormatter}
          settings={settings}
        />

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
