import React from 'react'

export default function DaySheetModal({
  open,
  date,
  shifts = [],
  onClose,
  onAdd,
  onOpenShift,
  currencyFormatter,
}) {
  if (!open) return null

  const S = { times: '\u00D7', middot: '\u00B7' }
  function parseDateOnlyLocal(s) {
    if (!s) return new Date(NaN)
    const [y, m, d] = String(s).split('-').map(Number)
    return new Date(y, (m || 1) - 1, d || 1)
  }

  const dayLabel = parseDateOnlyLocal(date).toLocaleDateString()

  return (
    <div
      className="modal-backdrop day-sheet"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-card day-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(560px, 92vw)', maxHeight: '85vh' }}
      >
        <div className="modal-head">
          <div className="modal-title">{dayLabel}</div>
          <button className="cal-btn" onClick={onClose} aria-label="Close">
            {S.times}
          </button>
        </div>

        <div className="modal-body">
          <button
            className="btn btn-primary add-btn"
            onClick={() => onAdd(parseDateOnlyLocal(date))}
          >
            + Add shift
          </button>

          {shifts.length === 0 ? (
            <div className="note empty">No shifts yet for this day.</div>
          ) : (
            <div className="shift-list">
              {shifts.map((shift) => {
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
                    className="shift-chip"
                    onClick={() => onOpenShift?.(shift)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onOpenShift?.(shift)
                    }}
                  >
                    <div className="chip-header">
                      <span className="net">{fmt(net)}</span>
                      <span className="divider">{S.middot}</span>
                      <span className="hours">{hours.toFixed(2)}h</span>
                      <span className="eff">({fmt(eff)} /h)</span>
                    </div>
                    {shift?.notes && (
                      <div className="chip-notes">{shift.notes}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn secondary" onClick={onClose}>
            Close
          </button>
        </div>

        <style jsx>{`
          /* Center the modal and give breathing room from the top/bottom */
          .modal-backdrop.day-sheet {
            position: fixed;
            inset: 0;
            z-index: 10000;
            background: rgba(0, 0, 0, 0.45);
            display: grid;
            place-items: center; /* centers vertically & horizontally */
            padding: 16px; /* <-- this is the top/bottom padding you want */
          }

          /* Ensure the card itself lays out correctly and doesn't overflow */
          .modal-card.day-sheet {
            width: min(560px, 92vw);
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          /* (Optional) consistent padding on header/footer for a tidy frame) */
          .modal-head {
            padding: 12px 16px;
            border-bottom: 1px solid var(--border);
          }
          .modal-actions {
            padding: 12px 16px;
            border-top: 1px solid var(--border);
          }

          /* Keep body scrollable inside the fixed-height card */
          .modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 16px 16px 16px; /* inner content padding (you already had this) */
          }

          .add-btn {
            width: 100%;
            margin-top: 4px;
            padding: 12px;
            font-weight: 600;
            border-radius: 12px;
          }

          .empty {
            text-align: center;
            padding: 20px 0;
          }

          .shift-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .shift-chip {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 14px 16px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
            transition:
              background 0.2s,
              transform 0.1s;
            cursor: pointer;
          }

          .shift-chip:hover {
            background: var(--hover);
            transform: translateY(-1px);
          }

          .chip-header {
            display: flex;
            align-items: baseline;
            flex-wrap: wrap;
            gap: 6px;
            font-weight: 600;
          }

          .net {
            color: var(--brand);
            font-size: 1rem;
          }

          .hours,
          .eff {
            font-size: 0.9rem;
            color: var(--text-muted);
          }

          .chip-notes {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-top: 4px;
          }
        `}</style>
      </div>
    </div>
  )
}
