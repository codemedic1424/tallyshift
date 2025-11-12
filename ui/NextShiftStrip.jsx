// ui/NextShiftStrip.jsx
import { useEffect, useMemo, useState } from 'react'

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function relIn(minutes) {
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h && r) return `In ${h} hour${h === 1 ? '' : 's'} ${r} min`
  if (h) return `In ${h} hour${h === 1 ? '' : 's'}`
  return `In ${m} minute${m === 1 ? '' : 's'}`
}

export default function NextShiftStrip({
  nextShift, // { title, start_ts, end_ts, location_name }
  isPro, // boolean
  hasCalendarSync, // boolean
  onUpgrade, // () => void
  onDismiss, // () => void
  canDismiss = false,
  onAdd,
  onSync, // () => Promise<void> | void
}) {
  // Format helpers
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000) // update every 30s
    return () => clearInterval(t)
  }, [])

  const clickable =
    !!nextShift && (typeof onAdd === 'function' || typeof onSync === 'function')
  const fmt = useMemo(
    () => ({
      dateTime: (ts) =>
        new Date(ts).toLocaleString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
      timeRange: (a, b) =>
        `${new Date(a).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}–${new Date(b).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
    }),
    [],
  )
  // CASE 1: We have an upcoming/ongoing/recent shift
  if (nextShift) {
    const doPrimary = async () => {
      // Current or passed *today* → open AddShiftModal
      if ((isStarted || isPassedToday) && typeof onAdd === 'function') {
        onAdd(nextShift)
        return
      }
      // Upcoming → sync calendar
      if (isUpcoming && typeof onSync === 'function') {
        await onSync()
        return
      }
      // Fallback (if no start date or no onSync provided): open Add
      if (typeof onAdd === 'function') onAdd(nextShift)
    }
    const handleClick = () => {
      if (clickable) void doPrimary()
    }
    const handleKeyDown = (e) => {
      if (!clickable) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        void doPrimary()
      }
    }

    const start = nextShift.start_ts ? new Date(nextShift.start_ts) : null
    const end = nextShift.end_ts ? new Date(nextShift.end_ts) : null
    const isStarted = start && now >= start && (!end || now < end)
    const isPassed =
      start &&
      ((end && now >= end) ||
        (!end && now.getTime() - start.getTime() > 2 * 3600000))
    const isPassedToday = !!(isPassed && start && sameDay(start, now))
    const isUpcoming = !!(start && now < start)

    // --- Build details we ALWAYS show ---
    const titleText = nextShift.title || 'Scheduled shift'
    const whenText = start
      ? end
        ? `${fmt.dateTime(start)} · ${fmt.timeRange(start, end)}`
        : fmt.dateTime(start)
      : 'TBD'
    const locText = nextShift.location_name
      ? `📍 ${nextShift.location_name}`
      : ''

    // --- New status placement (left "kicker" + right CTA chip) ---
    let kicker = 'Next shift' // small label top-left
    let dayHint = '' // Today / Tomorrow / Fri, Nov 14
    let ctaLabel = '' // chip text on the right
    let ctaKind = '' // '', 'accent', 'primary'

    const started = start && now >= start && (!end || now < end)
    const passed =
      start &&
      ((end && now >= end) ||
        (!end && now.getTime() - start.getTime() > 2 * 3600000))

    if (started) {
      kicker = 'CURRENT SHIFT'
      dayHint = sameDay(start, now)
        ? 'Today'
        : start
          ? start.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })
          : ''
      ctaLabel = 'Tap to log shift'
      ctaKind = 'primary'
    } else if (passed) {
      kicker = 'RECENT SHIFT'
      dayHint = sameDay(start, now)
        ? 'Today'
        : start
          ? start.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })
          : ''
      ctaLabel = 'Tap to log shift'
      ctaKind = 'primary'
    } else if (start) {
      const tomorrow = new Date(now)
      tomorrow.setDate(now.getDate() + 1)
      if (sameDay(start, now)) {
        kicker = 'NEXT SHIFT'
        dayHint = 'Today'
        const mins = (start.getTime() - now.getTime()) / 60000
        ctaLabel = mins <= 1 ? 'Now' : relIn(mins) // e.g. "In 30 minutes"
        ctaKind = 'accent'
      } else if (sameDay(start, tomorrow)) {
        kicker = 'NEXT SHIFT'
        dayHint = 'Tomorrow'
        ctaLabel = 'Tomorrow'
        ctaKind = ''
      } else {
        kicker = 'NEXT SHIFT'
        dayHint = start.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
        ctaLabel = dayHint
        ctaKind = ''
      }
    }

    return (
      <div
        className={`nextshift ${clickable ? 'clickable' : ''}`}
        onClick={handleClick}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={handleKeyDown}
        aria-label={
          clickable
            ? isUpcoming && typeof onSync === 'function'
              ? 'Sync calendar'
              : 'Add this scheduled shift'
            : 'Next shift'
        }
      >
        {/* LEFT: info */}
        <div className="left">
          <div className="title">{kicker}</div>
          {dayHint ? <div className="line hint">{dayHint}</div> : null}

          <div className="line">
            <strong>{titleText}</strong>
          </div>

          <div className="meta">
            {locText ? <span>{locText}</span> : null}
            {locText ? <span className="dot">•</span> : null}
            <span>{whenText}</span>
          </div>
        </div>

        {/* RIGHT: big CTA chip */}
        <div className="right">
          {ctaLabel ? (
            <div className={`ctaChip ${ctaKind}`}>{ctaLabel}</div>
          ) : null}

          {canDismiss && (
            <button
              className="x"
              aria-label="Dismiss"
              onClick={(e) => {
                e.stopPropagation()
                onDismiss()
              }}
            >
              ×
            </button>
          )}
        </div>

        <style jsx>{`
          .nextshift {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #0ea5e910;
            border: 1px solid #bae6fd;
            color: #075985;
            border-radius: 14px;
            padding: 12px 14px;
            gap: 10px;
            transition:
              background 0.15s,
              transform 0.06s;
          }
          .nextshift.clickable {
            cursor: pointer;
          }
          .nextshift.clickable:hover {
            background: #0ea5e91a;
          }
          .nextshift.clickable:active {
            transform: translateY(1px);
          }

          .left {
            min-width: 0;
          }
          .right {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: auto;
            flex-shrink: 0;
          }

          .title {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #0369a1;
          }
          .hint {
            margin-top: 2px;
            font-size: 12px;
            color: #0c4a6e;
            opacity: 0.85;
          }
          .line {
            font-size: 14px;
          }
          .meta {
            margin-top: 2px;
            font-size: 13px;
            color: #0c4a6e;
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
          }
          .dot {
            opacity: 0.6;
          }

          /* CTA chip */
          .ctaChip {
            padding: 8px 12px;
            border-radius: 999px;
            font-weight: 800;
            font-size: 12px;
            line-height: 1;
            border: 1px solid #93c5fd;
            background: #eff6ff;
            box-shadow: 0 2px 6px rgba(14, 165, 233, 0.18);
            user-select: none;
            pointer-events: none; /* whole card is clickable */
            white-space: nowrap;
          }
          .ctaChip.accent {
            border-color: #60a5fa;
            background: #dbeafe;
          }
          .ctaChip.primary {
            border-color: #1d4ed8;
            background: #2563eb;
            color: white;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
          }

          .x {
            background: transparent;
            border: 0;
            font-size: 20px;
            line-height: 1;
            color: #0c4a6e;
            cursor: pointer;
            pointer-events: auto;
          }

          @media (max-width: 420px) {
            .ctaChip {
              padding: 7px 10px;
              font-size: 11px;
            }
          }
        `}</style>
      </div>
    )
  }

  // CASE 2: No calendar connected
  if (!hasCalendarSync) {
    if (!isPro) {
      return (
        <div className="cta">
          <div className="copy">
            <div className="h">Sync your calendar</div>
            <div className="p">See your upcoming shifts here (Pro).</div>
          </div>
          <div className="actions">
            <button className="btn" onClick={onUpgrade}>
              Upgrade
            </button>
            {canDismiss && (
              <button className="ghost" onClick={onDismiss}>
                Dismiss
              </button>
            )}
          </div>

          <style jsx>{`
            .cta {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              background: #22c55e10;
              border: 1px solid #bbf7d0;
              color: #065f46;
              border-radius: 14px;
              padding: 12px 14px;
            }
            .h {
              font-weight: 700;
              font-size: 14px;
            }
            .p {
              font-size: 13px;
              opacity: 0.9;
            }
            .actions {
              display: flex;
              gap: 8px;
            }
            .btn {
              background: #16a34a;
              color: #fff;
              border: 0;
              border-radius: 10px;
              padding: 8px 12px;
              cursor: pointer;
            }
            .ghost {
              background: transparent;
              border: 0;
              color: #065f46;
              padding: 8px 10px;
              cursor: pointer;
            }
          `}</style>
        </div>
      )
    }

    // Pro but not connected: gentle nudge (no Upgrade button)
    return (
      <div
        className="cta pro clickable"
        onClick={() => {
          try {
            localStorage.setItem('ts-open-settings', '1')
          } catch {}
          window.location.href = '/profile?open=settings'
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            try {
              localStorage.setItem('ts-open-settings', '1')
            } catch {}
            window.location.href = '/profile?open=settings'
          }
        }}
      >
        <div className="copy">
          <div className="h">Connect your schedule</div>
          <div className="p">Add your .ics to show the next shift here.</div>
        </div>

        {canDismiss && (
          <button
            className="ghost"
            onClick={(e) => {
              e.stopPropagation() // prevent triggering profile nav
              onDismiss()
            }}
          >
            Dismiss
          </button>
        )}

        <style jsx>{`
          .cta.pro {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            background: #fef3c7;
            border: 1px solid #fde68a;
            color: #92400e;
            border-radius: 14px;
            padding: 12px 14px;
            transition:
              background 0.15s,
              transform 0.06s;
          }
          .cta.pro.clickable {
            cursor: pointer;
          }
          .cta.pro.clickable:hover {
            background: #fde68a55;
          }
          .cta.pro.clickable:active {
            transform: translateY(1px);
          }
          .h {
            font-weight: 700;
            font-size: 14px;
          }
          .p {
            font-size: 13px;
            opacity: 0.9;
          }
          .ghost {
            background: transparent;
            border: 0;
            color: #92400e;
            padding: 8px 10px;
            cursor: pointer;
          }
        `}</style>
      </div>
    )
  }

  // CASE 3: Calendar connected but no upcoming shift
  return (
    <div className="neutral">
      <div className="msg">No upcoming shifts found.</div>

      <div className="actions">
        <button
          className="btnSync"
          onClick={async (e) => {
            e.preventDefault()
            e.stopPropagation()
            if (typeof onSync === 'function') {
              await onSync()
            }
          }}
        >
          Sync calendar
        </button>

        {canDismiss && (
          <button className="ghost" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>

      <style jsx>{`
        .neutral {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          color: #374151;
          border-radius: 14px;
          padding: 12px 14px;
          gap: 10px;
        }
        .msg {
          font-size: 14px;
        }
        .actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .btnSync {
          background: #2563eb;
          border: 1px solid #1d4ed8;
          color: #fff;
          border-radius: 999px;
          padding: 8px 12px;
          font-weight: 800;
          font-size: 12px;
          line-height: 1;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
          cursor: pointer;
          transition:
            background 0.15s ease,
            transform 0.06s ease;
        }
        .btnSync:hover {
          background: #1d4ed8;
        }
        .btnSync:active {
          transform: translateY(1px);
        }
        .ghost {
          background: transparent;
          border: 0;
          color: #374151;
          padding: 8px 10px;
          cursor: pointer;
        }
        @media (max-width: 420px) {
          .btnSync {
            padding: 7px 10px;
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  )
}
