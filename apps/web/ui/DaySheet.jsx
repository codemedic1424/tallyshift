// ui/DaySheet.jsx
import React from 'react'

function parseDateOnlyLocal(s) {
  if (!s) return new Date(NaN)
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export default function DaySheet({
  open,
  dateISO, // 'YYYY-MM-DD'
  shifts = [],
  currencyFormatter,
  onAdd, // () => void
  onSelectShift, // (shift) => void
  onClose, // () => void
}) {
  if (!open) return null

  const dateLabel = parseDateOnlyLocal(dateISO).toLocaleDateString()
  const fmt = (n) =>
    currencyFormatter?.format
      ? currencyFormatter.format(n)
      : `$${Number(n || 0).toFixed(2)}`

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(560px, 92vw)' }}
      >
        {/* Head */}
        <div className="modal-head">
          <div className="modal-title">{dateLabel}</div>
          <button
            className="cal-btn"
            onClick={onClose}
            aria-label="Close day details"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'grid', gap: 10 }}>
          {/* empty message first (if no shifts) */}
          {shifts.length === 0 && (
            <div className="note">No shifts yet for this day.</div>
          )}

          {/* shifts list (when present) */}
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
                className="cal-shift"
                onClick={() => {
                  onSelectShift?.(shift)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSelectShift?.(shift)
                }}
              >
                <div>
                  <b>{fmt(net)}</b> · {hours.toFixed(2)}h
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

          {/* add button at the very bottom */}
          <button className="btn btn-primary" onClick={onAdd}>
            + Add shift
          </button>
        </div>

        {/* Footer */}
        <div className="modal-actions" style={{ justifyContent: 'flex-end' }}>
          <button className="btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
