import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSettings } from '../lib/useSettings'

function parseDateOnlyLocal(s) {
  if (!s) return new Date(NaN)
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export default function ShiftDetailsModal({
  shift,
  onClose,
  onSave,
  onDelete,
  currencyFormatter,
}) {
  const { settings } = useSettings()

  const payoutMode = settings?.payout_mode || 'both'
  const multipleLocations = !!settings?.multiple_locations
  const tipsOnPaycheck = payoutMode === 'on_paycheck'
  const showCashInput =
    !tipsOnPaycheck && (payoutMode === 'both' || payoutMode === 'cash_only')
  const showCardInput =
    !tipsOnPaycheck && (payoutMode === 'both' || payoutMode === 'card_only')

  const activeLocations = useMemo(
    () => (settings?.locations || []).filter((l) => l?.active),
    [settings?.locations],
  )
  const defaultLocationId =
    settings?.default_location_id || activeLocations[0]?.id || null
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const [editDate, setEditDate] = useState('')
  const [editHours, setEditHours] = useState('')
  const [editSales, setEditSales] = useState('')
  const [editCash, setEditCash] = useState('')
  const [editCard, setEditCard] = useState('')
  const [editTipOut, setEditTipOut] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [locationId, setLocationId] = useState(defaultLocationId)
  const [jobId, setJobId] = useState(null)

  useEffect(() => {
    if (!shift) return
    setEditDate(String(shift.date))
    setEditHours(Number(shift.hours || 0).toFixed(2))
    setEditSales(format(shift.sales))
    setEditCash(format(shift.cash_tips))
    setEditCard(format(shift.card_tips))
    setEditTipOut(format(shift.tip_out_total))
    setEditNotes(shift.notes || '')
    setLocationId(shift.location_id || defaultLocationId)
    setJobId(shift.job_type_id || null)
  }, [shift, defaultLocationId])

  const format = (n) => (n == null ? '' : Number(n).toFixed(2))
  const clean = (val) => {
    const digits = String(val).replace(/\D/g, '')
    return digits ? (parseInt(digits, 10) / 100).toFixed(2) : ''
  }

  useEffect(() => {
    if (!shift) return
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [shift])

  async function handleSave() {
    setSaving(true)
    await onSave({
      date: editDate,
      hours: Number(editHours || 0),
      sales: Number(editSales || 0),
      cash_tips: !tipsOnPaycheck && showCashInput ? Number(editCash || 0) : 0,
      card_tips: !tipsOnPaycheck && showCardInput ? Number(editCard || 0) : 0,
      tip_out_total: Number(editTipOut || 0),
      notes: editNotes,
      location_id: locationId || defaultLocationId,
      job_type_id: jobId || null,
    }).finally(() => setSaving(false))
    setEditMode(false)
  }

  if (!shift) return null

  const net =
    Number(shift.cash_tips || 0) +
    Number(shift.card_tips || 0) -
    Number(shift.tip_out_total || 0)
  const eff = Number(shift.hours || 0) > 0 ? net / Number(shift.hours) : 0

  const currentLocation =
    activeLocations.find((l) => l.id === locationId) || null
  const locationTracksJobs = !!currentLocation?.track_jobs
  const activeJobsForLocation = useMemo(
    () => (currentLocation?.jobs || []).filter((j) => j.active),
    [currentLocation],
  )

  return createPortal(
    <div className="modal-backdrop" onClick={() => onClose?.()}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2 className="modal-title">
            {editMode
              ? 'Edit Shift'
              : parseDateOnlyLocal(shift.date).toLocaleDateString()}
          </h2>
          <button className="close-btn" onClick={() => onClose?.()}>
            ×
          </button>
        </header>

        {/* scrollable body */}
        <div className="modal-body">
          {!editMode ? (
            <>
              <div className="stats">
                <div>
                  <div className="note">Net</div>
                  <div className="h2">{currencyFormatter.format(net)}</div>
                </div>
                <div>
                  <div className="note">Hours</div>
                  <div className="h2">
                    {Number(shift.hours || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="note">Hourly</div>
                  <div className="h2">{currencyFormatter.format(eff)} /h</div>
                </div>
              </div>
              {/* Weather snapshot card */}
              {shift?.weather_snapshot && (
                <div className="weather-summary">
                  <div className="weather-left">
                    <div className="emoji">
                      {(() => {
                        const code = shift.weather_snapshot.weathercode
                        if (code === 0) return '☀️'
                        if ([1, 2, 3].includes(code)) return '⛅'
                        if ([45, 48].includes(code)) return '🌫️'
                        if ([61, 63, 65, 80, 81, 82].includes(code)) return '🌧️'
                        if ([71, 73, 75, 77, 85, 86].includes(code)) return '🌨️'
                        if ([95, 96, 99].includes(code)) return '⛈️'
                        return '🌤️'
                      })()}
                    </div>
                    <div className="weather-main">
                      <div className="temp">
                        {shift.weather_snapshot.t_avg_f != null
                          ? `${Math.round(shift.weather_snapshot.t_avg_f)}°`
                          : shift.weather_snapshot.t_max_f != null &&
                              shift.weather_snapshot.t_min_f != null
                            ? `${Math.round(shift.weather_snapshot.t_min_f)}° / ${Math.round(
                                shift.weather_snapshot.t_max_f,
                              )}°`
                            : null}
                      </div>
                      <div className="label">
                        {shift.weather_snapshot.summary || 'Weather'}
                      </div>
                    </div>
                  </div>
                  <div className="weather-right">
                    {shift.weather_snapshot.precip_in > 0 && (
                      <div className="precip">
                        💧 {shift.weather_snapshot.precip_in.toFixed(2)} in
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="fields">
                {/* Always show location */}
                <div className="field-row">
                  <span>Location</span>
                  <b>{currentLocation?.name || '—'}</b>
                </div>

                {locationTracksJobs && (
                  <div className="field-row">
                    <span>Job</span>
                    <b>
                      {activeJobsForLocation.find((j) => j.id === jobId)
                        ?.name || '—'}
                    </b>
                  </div>
                )}
                {settings?.track_sales && (
                  <div className="field-row">
                    <span>Sales</span>
                    <b>{currencyFormatter.format(Number(shift.sales || 0))}</b>
                  </div>
                )}
                {showCashInput && (
                  <div className="field-row">
                    <span>Cash Tips</span>
                    <b>
                      {currencyFormatter.format(Number(shift.cash_tips || 0))}
                    </b>
                  </div>
                )}
                {showCardInput && (
                  <div className="field-row">
                    <span>Card Tips</span>
                    <b>
                      {currencyFormatter.format(Number(shift.card_tips || 0))}
                    </b>
                  </div>
                )}
                <div className="field-row">
                  <span>Tip-out</span>
                  <b>
                    {currencyFormatter.format(Number(shift.tip_out_total || 0))}
                  </b>
                </div>
              </div>

              {shift.notes && (
                <div className="notes">
                  <div className="note-label">Notes</div>
                  <div className="note-text">{shift.notes}</div>
                </div>
              )}
            </>
          ) : (
            <>
              <label className="field">
                <span className="field-label">Date</span>
                <input
                  type="date"
                  className="input"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  style={{ width: '100%', minWidth: 0 }}
                />
              </label>

              {/* Always show location */}
              {multipleLocations ? (
                <label className="field">
                  <span className="field-label">Location</span>
                  <select
                    className="input"
                    value={locationId || ''}
                    onChange={(e) => setLocationId(e.target.value || null)}
                  >
                    {activeLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name || '(untitled)'}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="field">
                  <span className="field-label">Location</span>
                  <input
                    className="input"
                    type="text"
                    value={currentLocation?.name || ''}
                    readOnly
                  />
                </label>
              )}

              {locationTracksJobs && (
                <label className="field">
                  <span className="field-label">Job</span>
                  <select
                    className="input"
                    value={jobId || ''}
                    onChange={(e) => setJobId(e.target.value || null)}
                  >
                    {activeJobsForLocation.length === 0 ? (
                      <option value="">(no active jobs)</option>
                    ) : (
                      activeJobsForLocation.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.name || '(untitled)'}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              )}

              {settings?.track_hours && (
                <label className="field">
                  <span className="field-label">Hours</span>
                  <input
                    className="input"
                    type="text"
                    inputMode="decimal"
                    value={editHours}
                    onChange={(e) => setEditHours(clean(e.target.value))}
                  />
                </label>
              )}

              {settings?.track_sales && (
                <label className="field">
                  <span className="field-label">Sales</span>
                  <input
                    className="input"
                    type="text"
                    inputMode="decimal"
                    value={editSales}
                    onChange={(e) => setEditSales(clean(e.target.value))}
                  />
                </label>
              )}

              {showCashInput && (
                <label className="field">
                  <span className="field-label">Cash tips</span>
                  <input
                    className="input"
                    type="text"
                    inputMode="decimal"
                    value={editCash}
                    onChange={(e) => setEditCash(clean(e.target.value))}
                  />
                </label>
              )}

              {showCardInput && (
                <label className="field">
                  <span className="field-label">Card tips</span>
                  <input
                    className="input"
                    type="text"
                    inputMode="decimal"
                    value={editCard}
                    onChange={(e) => setEditCard(clean(e.target.value))}
                  />
                </label>
              )}

              <label className="field">
                <span className="field-label">Tip-out</span>
                <input
                  className="input"
                  type="text"
                  inputMode="decimal"
                  value={editTipOut}
                  onChange={(e) => setEditTipOut(clean(e.target.value))}
                />
              </label>

              <label className="field">
                <span className="field-label">Notes</span>
                <textarea
                  className="input"
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </label>
            </>
          )}
        </div>

        {/* fixed footer */}
        <footer className="modal-actions">
          {editMode ? (
            <>
              <button
                className="btn primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                className="btn secondary"
                onClick={() => setEditMode(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                className="btn danger"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={() => setEditMode(true)}>
                  Edit
                </button>
                <button className="btn secondary" onClick={onClose}>
                  Close
                </button>
              </div>
            </>
          )}
        </footer>

        {confirmingDelete && (
          <div
            className="confirm-overlay"
            onClick={() => setConfirmingDelete(false)}
          >
            <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
              <h2>Delete this shift?</h2>
              <p>This can’t be undone.</p>
              <div className="actions">
                <button
                  className="btn secondary"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancel
                </button>
                <button className="btn danger" onClick={onDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          padding: 16px;
        }
        .modal-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
          width: min(640px, 92vw);
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .modal-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #eee;
          flex-shrink: 0;
        }
        .modal-title {
          font-size: 18px;
          font-weight: 700;
        }
        .close-btn {
          background: transparent;
          font-size: 26px;
          border: none;
          cursor: pointer;
        }
        .modal-body {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: grid;
          gap: 16px;
        }
        .modal-actions {
          position: sticky;
          bottom: 0;
          background: #fff;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 20px;
          border-top: 1px solid #eee;
          flex-shrink: 0;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          background: #f9fafb;
          border-radius: 12px;
          padding: 12px 8px;
          text-align: center;
          gap: 8px;
        }
        .field-row {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #f0f0f0;
          padding: 8px 0;
          font-size: 14px;
        }
        .notes {
          background: #f9fafb;
          border-radius: 10px;
          padding: 10px;
        }
        .btn {
          border-radius: 10px;
          padding: 8px 14px;
          font-size: 14px;
          cursor: pointer;
          border: none;
        }
        .btn.primary {
          background: var(--brand, #22c55e);
          color: #fff;
        }
        .btn.secondary {
          background: #f3f4f6;
        }
        .btn.danger {
          background: #ef4444;
          color: #fff;
        }
        .confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10001;
        }
        .confirm-card {
          background: #fff;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          width: min(360px, 90vw);
          text-align: center;
        }
        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 16px;
        }
        :global(.modal-card input[type='date']) {
          height: 40px;
          padding: 0 12px;
          font-size: 14px;
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          -webkit-appearance: none;
        }
        :global(.modal-card input[type='date']::-webkit-datetime-edit),
        :global(.modal-card input[type='date']::-webkit-date-and-time-value) {
          padding: 0;
          line-height: 40px;
        }
        :global(
          .modal-card input[type='date']::-webkit-calendar-picker-indicator
        ) {
          margin-right: 6px;
        }
        :global(body.modal-open) {
          overflow: hidden !important;
          touch-action: none;
        }
        .weather-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
          border: 0px solid var(--border, #e5e7eb);
          border-radius: 12px;
          padding: 10px 14px;
          margin-bottom: 0px;
          gap: 10px;
        }

        .weather-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .weather-main {
          display: grid;
          gap: 2px;
        }

        .weather-main .temp {
          font-weight: 700;
          font-size: 16px;
          color: #111827;
        }

        .weather-main .label {
          font-size: 13px;
          color: #374151;
        }

        .weather-right {
          font-size: 13px;
          color: #374151;
          white-space: nowrap;
        }

        .emoji {
          font-size: 22px;
          line-height: 1;
        }
      `}</style>
    </div>,
    document.body,
  )
}
