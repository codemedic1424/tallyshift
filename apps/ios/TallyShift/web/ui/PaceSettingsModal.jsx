// ui/PaceSettingsModal.jsx
import { createPortal } from 'react-dom'

export default function PaceSettingsModal({
  open,
  onClose,
  paceType,
  setPaceType,
  expectedShifts,
  setExpectedShifts,
}) {
  if (!open) return null

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 360,
          width: 'calc(100vw - 32px)',
          maxHeight: '85vh',
        }}
      >
        <div className="modal-head">
          <div className="modal-title">Customize pace</div>
          <button className="cal-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body" style={{ padding: 16 }}>
          <label
            className="field"
            style={{ display: 'grid', gap: 4, marginBottom: 12 }}
          >
            <span className="field-label">Show</span>
            <select
              className="input"
              value={paceType}
              onChange={(e) => setPaceType(e.target.value)}
            >
              <option value="weekly">Weekly Pace</option>
              <option value="monthly">Monthly Pace</option>
            </select>
          </label>

          <label
            className="field"
            style={{ display: 'grid', gap: 4, marginBottom: 16 }}
          >
            <span className="field-label">
              {paceType === 'weekly'
                ? 'Total shifts this week'
                : 'Total shifts this month'}
            </span>
            <input
              type="number"
              min="1"
              max="60"
              value={expectedShifts}
              onChange={(e) => {
                const val = e.target.value
                // Allow empty or 0 temporarily so user can backspace
                if (val === '' || val === '0') {
                  setExpectedShifts('')
                } else {
                  setExpectedShifts(Number(val))
                }
              }}
              className="input"
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                localStorage.setItem('pace_type', paceType)
                localStorage.setItem(
                  'pace_expected_shifts',
                  String(expectedShifts),
                )
                onClose()
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: grid;
          place-items: center;
          z-index: 10000;
          padding: 16px;
        }
        .modal-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .modal-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border, #eee);
        }
        .modal-title {
          font-weight: 700;
          font-size: 16px;
        }
        .modal-body {
          flex: 1;
          overflow-y: auto;
        }
      `}</style>
    </div>,
    document.body,
  )
}
