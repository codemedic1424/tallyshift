// ui/AddShiftModal.jsx
import { useEffect, useMemo, useState } from 'react'
import { useSettings } from '../lib/useSettings'

// Local-safe YYYY-MM-DD from a Date
function isoDate(d) {
  const x = new Date(d)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function AddShiftModal({
  open,
  initialDate, // 'YYYY-MM-DD'
  onClose, // () => void
  onSave, // (payload) => Promise<void>
  currencyFormatter, // Intl.NumberFormat
  currencySymbol, // string (e.g. "$")
  tipsOnPaycheck, // boolean
  showCashInput, // boolean
  showCardInput, // boolean
  defaultTipoutPct, // number | null
}) {
  const { settings } = useSettings()

  const [saving, setSaving] = useState(false)

  // form state
  const [date, setDate] = useState(initialDate || isoDate(new Date()))
  const [hours, setHours] = useState('')
  const [sales, setSales] = useState('')
  const [cash, setCash] = useState('')
  const [card, setCard] = useState('')
  const [tipOut, setTipOut] = useState('')
  const [notes, setNotes] = useState('')
  const [tipOutDirty, setTipOutDirty] = useState(false)

  // location / job selectors
  const multipleLocations = !!settings?.multiple_locations
  const activeLocations = useMemo(
    () => (settings?.locations || []).filter((l) => l?.active),
    [settings?.locations],
  )
  const defaultLocationId = useMemo(() => {
    if (!settings) return null
    const id = settings.default_location_id || activeLocations[0]?.id || null
    return id
  }, [settings, activeLocations])

  const [locationId, setLocationId] = useState(defaultLocationId)
  useEffect(() => {
    setLocationId(defaultLocationId)
  }, [defaultLocationId])

  const currentLocation = useMemo(
    () => activeLocations.find((l) => l.id === locationId) || null,
    [activeLocations, locationId],
  )

  const locationTracksJobs = !!currentLocation?.track_jobs
  const activeJobsForLocation = useMemo(
    () => (currentLocation?.jobs || []).filter((j) => j.active),
    [currentLocation],
  )
  const [jobId, setJobId] = useState(null)

  // keep jobId in sync with selected location
  useEffect(() => {
    if (!locationTracksJobs) {
      setJobId(null)
      return
    }
    if (activeJobsForLocation.length === 0) {
      setJobId(null)
      return
    }
    // if previously selected job still exists & active, keep it; else select first
    if (jobId && activeJobsForLocation.some((j) => j.id === jobId)) return
    setJobId(activeJobsForLocation[0]?.id || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationTracksJobs, currentLocation?.id, activeJobsForLocation.length])

  // reset form on open
  useEffect(() => {
    if (!open) return
    setDate(initialDate || isoDate(new Date()))
    setHours('')
    setSales('')
    setCash('')
    setCard('')
    setTipOut('')
    setNotes('')
    setTipOutDirty(false)
    // reset location/job to defaults on each open
    setLocationId(defaultLocationId || null)
    setJobId(null)
  }, [open, initialDate, defaultLocationId])

  // helpers
  const sanitizeCurrencyValue = (input) => {
    if (!input) return ''
    const digits = String(input).replace(/\D/g, '')
    if (!digits) return ''
    return (parseInt(digits, 10) / 100).toFixed(2)
  }
  const formatCurrencyValue = (input) => {
    if (!input) return ''
    const n = Number(input)
    return Number.isNaN(n) ? '' : n.toFixed(2)
  }
  const sanitizeHoursValue = (input) => {
    if (!input) return ''
    const digits = String(input).replace(/\D/g, '')
    if (!digits) return ''
    return (parseInt(digits, 10) / 100).toFixed(2)
  }
  const formatHoursOnBlur = (val) => {
    if (!val) return ''
    const n = Number(val)
    if (Number.isNaN(n)) return ''
    // IMPORTANT: no quarter-hour snapping; just normalize to 2 decimals
    return n.toFixed(2)
  }

  // auto-calc tip-out
  useEffect(() => {
    if (!open) return
    if (tipOutDirty) return
    if (defaultTipoutPct == null) return
    if (tipsOnPaycheck) return
    const cashV = showCashInput ? Number(formatCurrencyValue(cash) || 0) : 0
    const cardV = showCardInput ? Number(formatCurrencyValue(card) || 0) : 0
    const totalTips = cashV + cardV
    if (totalTips <= 0) {
      if (tipOut !== '') setTipOut('')
      return
    }
    const computed = ((totalTips * defaultTipoutPct) / 100).toFixed(2)
    if (tipOut !== computed) setTipOut(computed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    cash,
    card,
    tipOut,
    tipOutDirty,
    defaultTipoutPct,
    tipsOnPaycheck,
    showCashInput,
    showCardInput,
  ])

  const renderCurrencyInput = (
    value,
    onChange,
    onBlur,
    placeholder = '0.00',
  ) => (
    <div style={{ position: 'relative', width: '100%' }}>
      <span
        style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#6b7280',
          fontSize: 14,
        }}
      >
        {currencySymbol}
      </span>
      <input
        type="text"
        inputMode="decimal"
        className="input"
        style={{ paddingLeft: 28 }}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete="off"
      />
    </div>
  )

  if (!open) return null

  async function handleSave() {
    setSaving(true)
    const payload = {
      date,
      // respect Track Hours / Track Sales
      hours: settings?.track_hours ? Number(hours || 0) : 0,
      sales: settings?.track_sales
        ? Number(formatCurrencyValue(sales) || 0)
        : 0,

      cash_tips:
        !tipsOnPaycheck && showCashInput
          ? Number(formatCurrencyValue(cash) || 0)
          : 0,
      card_tips:
        !tipsOnPaycheck && showCardInput
          ? Number(formatCurrencyValue(card) || 0)
          : 0,
      tip_out_total: Number(formatCurrencyValue(tipOut) || 0),
      notes,

      // NEW: location & job
      location_id: currentLocation?.id || null,
      job_type_id: locationTracksJobs ? jobId || null : null,
    }
    try {
      await onSave(payload)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        onClose()
        setTipOutDirty(false)
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, calc(100vw - 32px))',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div className="modal-head" style={{ alignItems: 'flex-start' }}>
          <div className="modal-title">Add shift</div>
          <button
            className="cal-btn"
            onClick={() => {
              onClose()
              setTipOutDirty(false)
            }}
            aria-label="Close add shift modal"
          >
            ×
          </button>
        </div>

        <div
          className="modal-body"
          style={{
            display: 'grid',
            gap: 20,
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {/* Shift basics */}
          <div style={{ display: 'grid', gap: 12 }}>
            <div
              className="note"
              style={{
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: '#6b7280',
              }}
            >
              Shift basics
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <label className="field">
                <span className="field-label">Date</span>
                <input
                  className="input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>

              {/* Location (read-only when multi is off; select when on) */}
              <label className="field">
                <span className="field-label">Location</span>
                {multipleLocations ? (
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
                ) : (
                  <input
                    className="input"
                    value={
                      (currentLocation?.name ||
                        activeLocations.find((l) => l.id === defaultLocationId)
                          ?.name ||
                        '') + ''
                    }
                    readOnly
                  />
                )}
              </label>

              {/* Job (only if this location tracks jobs) */}
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

              {/* Hours (respect setting) */}
              {settings?.track_hours && (
                <label className="field">
                  <span className="field-label">Hours worked</span>
                  <input
                    className="input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={hours}
                    onChange={(e) =>
                      setHours(sanitizeHoursValue(e.target.value))
                    }
                    onBlur={() => setHours((v) => formatHoursOnBlur(v))}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Sales & tips (respect Track Sales) */}
          <div style={{ display: 'grid', gap: 12 }}>
            <div
              className="note"
              style={{
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: '#6b7280',
              }}
            >
              Sales & tips
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {settings?.track_sales && (
                <label className="field">
                  <span className="field-label">Sales</span>
                  {renderCurrencyInput(
                    sales,
                    (e) => setSales(sanitizeCurrencyValue(e.target.value)),
                    () => setSales((prev) => formatCurrencyValue(prev)),
                  )}
                </label>
              )}

              {!tipsOnPaycheck ? (
                <>
                  {showCashInput && (
                    <label className="field">
                      <span className="field-label">Cash tips</span>
                      {renderCurrencyInput(
                        cash,
                        (e) => setCash(sanitizeCurrencyValue(e.target.value)),
                        () => setCash((prev) => formatCurrencyValue(prev)),
                      )}
                    </label>
                  )}
                  {showCardInput && (
                    <label className="field">
                      <span className="field-label">Card tips</span>
                      {renderCurrencyInput(
                        card,
                        (e) => setCard(sanitizeCurrencyValue(e.target.value)),
                        () => setCard((prev) => formatCurrencyValue(prev)),
                      )}
                    </label>
                  )}
                </>
              ) : (
                <div className="note" style={{ marginTop: -4 }}>
                  Tips are recorded on your paycheck per profile settings.
                </div>
              )}

              <label className="field">
                <span className="field-label">Tip-out</span>
                {renderCurrencyInput(
                  tipOut,
                  (e) => {
                    setTipOutDirty(true)
                    setTipOut(sanitizeCurrencyValue(e.target.value))
                  },
                  () =>
                    setTipOut((prev) =>
                      prev ? formatCurrencyValue(prev) : '',
                    ),
                )}
                {defaultTipoutPct != null && !tipsOnPaycheck && (
                  <div className="note" style={{ marginTop: 4 }}>
                    Auto-filled at {defaultTipoutPct}% of tips. Adjust if
                    needed.
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Notes */}
          <div style={{ display: 'grid', gap: 8 }}>
            <div
              className="note"
              style={{
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: '#6b7280',
              }}
            >
              Notes
            </div>
            <textarea
              className="input"
              rows={3}
              value={notes}
              placeholder="Anything worth remembering about this shift?"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div
          className="modal-actions"
          style={{ justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}
        >
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save shift'}
          </button>
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
