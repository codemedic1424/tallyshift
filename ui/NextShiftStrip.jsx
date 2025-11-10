// ui/NextShiftStrip.jsx
import { useMemo } from 'react'

export default function NextShiftStrip({
  nextShift, // { title, start_ts, end_ts, location_name }
  isPro, // boolean
  hasCalendarSync, // boolean
  onUpgrade, // () => void
  onDismiss, // () => void
  canDismiss = false,
  onAdd,
}) {
  // Format helpers
  const clickable = !!nextShift && typeof onAdd === 'function'
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

  // CASE 1: We have an upcoming shift
  if (nextShift) {
    const handleClick = () => {
      if (clickable) onAdd(nextShift)
    }
    const handleKeyDown = (e) => {
      if (!clickable) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onAdd(nextShift)
      }
    }

    return (
      <div
        className={`nextshift ${clickable ? 'clickable' : ''}`}
        onClick={handleClick}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={handleKeyDown}
        aria-label={clickable ? 'Add this scheduled shift' : 'Next shift'}
      >
        <div className="left">
          <div className="title">Next shift</div>
          <div className="line">
            <strong>{nextShift.title || 'Scheduled shift'}</strong>
          </div>
          <div className="line">
            {nextShift.start_ts ? fmt.dateTime(nextShift.start_ts) : 'TBD'}
            {nextShift.start_ts && nextShift.end_ts
              ? ` · ${fmt.timeRange(nextShift.start_ts, nextShift.end_ts)}`
              : null}
          </div>
          {nextShift.location_name ? (
            <div className="loc">📍 {nextShift.location_name}</div>
          ) : null}
        </div>

        {canDismiss && (
          <button
            className="x"
            aria-label="Dismiss"
            onClick={(e) => {
              e.stopPropagation() // ⛔ don’t trigger onAdd
              onDismiss()
            }}
          >
            ×
          </button>
        )}

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
            gap: 8px;
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

          .title {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #0369a1;
          }
          .line {
            font-size: 14px;
          }
          .loc {
            font-size: 13px;
            color: #0c4a6e;
            margin-top: 2px;
          }
          .x {
            background: transparent;
            border: 0;
            font-size: 20px;
            line-height: 1;
            color: #0c4a6e;
            cursor: pointer;
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
      <div>No upcoming shifts found.</div>
      {canDismiss && (
        <button className="ghost" onClick={onDismiss}>
          Dismiss
        </button>
      )}

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
        }
        .ghost {
          background: transparent;
          border: 0;
          color: #374151;
          padding: 8px 10px;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
