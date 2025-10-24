// ui/AddShiftModal.jsx
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
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
  currencyFormatter, // Intl.NumberFormat (optional)
  currencySymbol = '$', // string
  tipsOnPaycheck, // boolean (optional)
  showCashInput, // boolean (optional)
  showCardInput, // boolean (optional)
  defaultTipoutPct, // number | null
  initialValues = {},
}) {
  const { settings, saveSettings } = useSettings()

  // ----- derive payout display from settings if props aren't provided -----
  const payoutMode = settings?.payout_mode ?? 'both'
  const tipsOnPaycheckEff =
    typeof tipsOnPaycheck === 'boolean'
      ? tipsOnPaycheck
      : payoutMode === 'on_paycheck'
  const showCashInputEff =
    typeof showCashInput === 'boolean'
      ? showCashInput
      : payoutMode === 'both' || payoutMode === 'cash_only'
  const showCardInputEff =
    typeof showCardInput === 'boolean'
      ? showCardInput
      : payoutMode === 'both' || payoutMode === 'card_only'
  // derive tipout pct from prop OR settings
  const tipoutEnabled = !!settings?.default_tipout_enabled
  const defaultTipoutPctEff =
    typeof defaultTipoutPct === 'number'
      ? defaultTipoutPct
      : tipoutEnabled && typeof settings?.default_tipout_pct === 'number'
        ? settings.default_tipout_pct
        : null

  const [saving, setSaving] = useState(false)

  // form state
  const [date, setDate] = useState(initialDate || isoDate(new Date()))
  const [hours, setHours] = useState('')
  const [sales, setSales] = useState('')
  const [cash, setCash] = useState('')
  const [card, setCard] = useState('')
  const [tipOut, setTipOut] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedSections, setSelectedSections] = useState([])
  const [tipOutDirty, setTipOutDirty] = useState(false)
  const [selectedTags, setSelectedTags] = useState([])
  const [discount, setDiscount] = useState('')
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showSectionsModal, setShowSectionsModal] = useState(false)
  const [showTagsModal, setShowTagsModal] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#c7d2fe')
  const isDirty =
    !!(hours || sales || cash || card || tipOut || discount || notes) ||
    selectedSections.length > 0 ||
    selectedTags.length > 0

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

  // --- Location setup ---
  // Prefer initialValues.location_id (e.g., imported shift) over defaults
  const [locationId, setLocationId] = useState(
    initialValues?.location_id || defaultLocationId || null,
  )

  // Update when defaults change (but don't overwrite a prefilled value)
  useEffect(() => {
    if (initialValues?.location_id) {
      setLocationId(initialValues.location_id)
    } else {
      setLocationId(defaultLocationId || null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultLocationId, initialValues?.location_id])

  const currentLocation = useMemo(
    () => activeLocations.find((l) => l.id === locationId) || null,
    [activeLocations, locationId],
  )

  const sectionsForLocation = useMemo(() => {
    if (!settings?.track_sections) return []
    return currentLocation?.sections || []
  }, [settings?.track_sections, currentLocation])

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
    if (jobId && activeJobsForLocation.some((j) => j.id === jobId)) return
    setJobId(activeJobsForLocation[0]?.id || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationTracksJobs, currentLocation?.id, activeJobsForLocation.length])

  // reset form when opening (only depends on `open`)
  useEffect(() => {
    if (!open) return

    // if we have prefilled data (e.g. from a calendar shift)
    if (initialValues && Object.keys(initialValues).length > 0) {
      setDate(initialValues.date || initialDate || isoDate(new Date()))
      setHours(initialValues.hours ? String(initialValues.hours) : '')
      setSales(initialValues.sales ? String(initialValues.sales) : '')
      setCash(initialValues.cash ? String(initialValues.cash) : '')
      setCard(initialValues.card ? String(initialValues.card) : '')
      setTipOut(initialValues.tip_out ? String(initialValues.tip_out) : '')
      setNotes('')
      setLocationId(initialValues.location_id || defaultLocationId || null)
      setJobId(null)
      setDiscount('')
      setSelectedSections(
        Array.isArray(initialValues.sections) ? initialValues.sections : [],
      )
      setSelectedTags(
        Array.isArray(initialValues.tags) ? initialValues.tags : [],
      )
    } else {
      // default blank form if no prefill
      setDate(initialDate || isoDate(new Date()))
      setHours('')
      setSales('')
      setCash('')
      setCard('')
      setTipOut('')
      setNotes('')
      setLocationId(defaultLocationId || null)
      setJobId(null)
      setDiscount('')
      setSelectedSections([])
      setSelectedTags([])
    }

    setTipOutDirty(false)
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues])

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
    if (defaultTipoutPctEff == null) return
    if (tipsOnPaycheckEff) return
    const cashV = showCashInputEff ? Number(formatCurrencyValue(cash) || 0) : 0
    const cardV = showCardInputEff ? Number(formatCurrencyValue(card) || 0) : 0
    const totalTips = cashV + cardV
    if (totalTips <= 0) {
      if (tipOut !== '') setTipOut('')
      return
    }
    const computed = ((totalTips * defaultTipoutPctEff) / 100).toFixed(2)
    if (tipOut !== computed) setTipOut(computed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    cash,
    card,
    tipOut,
    tipOutDirty,
    defaultTipoutPctEff,
    tipsOnPaycheckEff,
    showCashInputEff,
    showCardInputEff,
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
      hours: settings?.track_hours ? Number(hours || 0) : 0,
      sales: settings?.track_sales
        ? Number(formatCurrencyValue(sales) || 0)
        : 0,
      cash_tips:
        !tipsOnPaycheckEff && showCashInputEff
          ? Number(formatCurrencyValue(cash) || 0)
          : 0,
      card_tips:
        !tipsOnPaycheckEff && showCardInputEff
          ? Number(formatCurrencyValue(card) || 0)
          : 0,
      tip_out_total: Number(formatCurrencyValue(tipOut) || 0),
      notes,
      location_id: currentLocation?.id || null,
      job_type_id: locationTracksJobs ? jobId || null : null,
      discount_total: settings?.track_discounts
        ? Number(formatCurrencyValue(discount) || 0)
        : 0,
      sections: settings?.track_sections ? selectedSections : [],
      tags: selectedTags.map((t) => ({
        name: String(t.name).trim(),
        color: t.color || '#3b82f6',
      })),
    }
    try {
      await onSave(payload)

      if (settings?.track_tags && selectedTags.length > 0) {
        const norm = (s) => String(s || '').trim()
        const existing = Array.isArray(settings?.tags) ? settings.tags : []
        const existingNames = new Set(
          existing.map((t) => norm(t.name).toLowerCase()),
        )
        const toAddMap = new Map()

        for (const t of selectedTags) {
          const name = norm(t.name)
          if (!name) continue
          const key = name.toLowerCase()
          if (!existingNames.has(key)) {
            toAddMap.set(key, { name, color: t.color || '#3b82f6' })
          }
        }

        const newOnes = Array.from(toAddMap.values())
        if (newOnes.length > 0) {
          await saveSettings({ ...settings, tags: [...existing, ...newOnes] })
        }
      }

      onClose?.()
    } finally {
      setSaving(false)
    }
  }

  // ---------- Render (portal) ----------
  return createPortal(
    <div
      className="modal-backdrop"
      onClick={() => {
        if (isDirty) {
          setShowDiscardConfirm(true)
          return
        }
        onClose?.()
        setTipOutDirty(false)
      }}
      style={{
        position: 'fixed',
        inset: 0,
        height: '100dvh',
        zIndex: 10000, // must be above .tabbar z-index
        background: 'rgba(0,0,0,.45)',
        display: 'grid',
        placeItems: 'center',
        isolation: 'isolate',
      }}
    >
      <style jsx>{`
        /* Normalize the date input ONLY inside this modal */
        :global(.modal-card input[type='date']) {
          height: 40px; /* match your control height */
          padding: 0 12px; /* same horizontal padding */
          font-size: 14px; /* same text size as others */
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          -webkit-appearance: none;
        }
        /* Trim WebKit's internal padding so it doesn't look taller */
        :global(.modal-card input[type='date']::-webkit-datetime-edit),
        :global(.modal-card input[type='date']::-webkit-date-and-time-value) {
          padding: 0;
          line-height: 40px; /* vertically centers the text */
        }
        :global(
          .modal-card input[type='date']::-webkit-calendar-picker-indicator
        ) {
          margin-right: 6px; /* avoid chevron clipping */
        }
      `}</style>

      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          zIndex: 10001,
          width: 'calc(100vw - 32px)',
          maxWidth: 640,
          maxHeight: 'calc(100dvh - 24px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 18px 50px rgba(0,0,0,.18)',
        }}
      >
        {/* Header */}
        <div
          className="modal-head"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: 16,
            borderBottom: '1px solid #eee',
          }}
        >
          <div className="modal-title">Add shift</div>
          <button
            className="cal-btn"
            onClick={() => {
              if (isDirty) {
                setShowDiscardConfirm(true)
                return
              }
              onClose?.()
              setTipOutDirty(false)
            }}
            aria-label="Close add shift modal"
            style={{ fontSize: 24, lineHeight: 1, background: 'transparent' }}
          >
            ×
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          className="modal-body"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            display: 'grid',
            gap: 20,
            padding: 16,
            // leave room for sticky actions + tab bar + device safe area
            paddingBottom:
              'calc(var(--tabbar-h, 64px) + env(safe-area-inset-bottom, 0px) + 80px)',
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
                  style={{ width: '100%', minWidth: 0 }}
                />
              </label>

              {/* Location */}
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

              {/* Hours */}
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

          {/* Sales & tips */}
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

              {!tipsOnPaycheckEff ? (
                <>
                  {showCashInputEff && (
                    <label className="field">
                      <span className="field-label">Cash tips</span>
                      {renderCurrencyInput(
                        cash,
                        (e) => setCash(sanitizeCurrencyValue(e.target.value)),
                        () => setCash((prev) => formatCurrencyValue(prev)),
                      )}
                    </label>
                  )}
                  {showCardInputEff && (
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

              {settings?.default_tipout_enabled && (
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
                  {defaultTipoutPctEff != null && !tipsOnPaycheckEff && (
                    <div className="note" style={{ marginTop: 4 }}>
                      Auto-filled at {defaultTipoutPctEff}% of tips. Adjust if
                      needed.
                    </div>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* --- Estimated Tip % --- */}
          {sales && Number(sales) > 0 && (
            <div
              style={{
                margin: '8px 0 12px',
                padding: '8px 12px',
                borderRadius: 8,
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <span>Est. Tip %</span>
              <span style={{ fontWeight: 700, color: '#16a34a' }}>
                {(
                  ((Number(cash || 0) +
                    Number(card || 0) -
                    Number(tipOut || 0)) /
                    Number(sales || 1)) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
          )}

          {/* Additional Info */}
          {(settings?.track_sections || settings?.track_tags) && (
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
                Additional Info
              </div>

              {/* Sections chooser */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedSections.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedSections.map((sec) => (
                      <div
                        key={sec}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 10px',
                          borderRadius: 999,
                          border: '1px solid var(--border)',
                          background: '#fff',
                          fontSize: 13,
                        }}
                      >
                        <span>{sec}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSections((prev) =>
                              prev.filter((s) => s !== sec),
                            )
                          }
                          style={{
                            border: 'none',
                            background: 'transparent',
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#6b7280',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {selectedTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedTags.map((tag) => (
                      <div
                        key={tag.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 10px',
                          borderRadius: 999,
                          background: tag.color,
                          border: '1px solid rgba(0,0,0,0.08)',
                          color: '#1f2937',
                          fontSize: 13,
                        }}
                      >
                        <span>{tag.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTags((prev) =>
                              prev.filter((t) => t.name !== tag.name),
                            )
                          }
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#6b7280',
                            fontWeight: 700,
                            borderRadius: 999,
                            padding: '0 6px',
                            cursor: 'pointer',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => setShowSectionsModal(true)}
                  >
                    + Add Section(s)
                  </button>

                  {settings?.track_tags && (
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => setShowTagsModal(true)}
                    >
                      + Add Tag(s)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Other Details */}
          {settings?.track_discounts && (
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
                Other Details
              </div>

              <label className="field">
                <span className="field-label">Discounts</span>
                {renderCurrencyInput(
                  discount,
                  (e) => setDiscount(sanitizeCurrencyValue(e.target.value)),
                  () => setDiscount((prev) => formatCurrencyValue(prev)),
                )}
              </label>
            </div>
          )}

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
          <button
            className="btn secondary"
            onClick={() => {
              if (isDirty) {
                setShowDiscardConfirm(true)
                return
              }
              onClose?.()
              setTipOutDirty(false)
            }}
          >
            Cancel
          </button>
        </div>
      </div>
      {showDiscardConfirm && (
        <div
          className="modal-backdrop"
          onClick={() => setShowDiscardConfirm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20000, // ⬅️ bump this higher than 10000/10001
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(400px, 90vw)',
              borderRadius: 16,
              background: '#fff',
              padding: 20,
              boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
              display: 'grid',
              gap: 16,
              zIndex: 20001, // ⬅️ also bump this
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              Discard this shift?
            </div>
            <div style={{ fontSize: 14, color: '#374151' }}>
              You’ve entered some information. If you discard now, it will be
              lost.
            </div>
            <div
              style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}
            >
              <button
                className="btn secondary"
                onClick={() => setShowDiscardConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  setShowDiscardConfirm(false)
                  onClose?.()
                  setTipOutDirty(false)
                }}
              >
                Discard Shift
              </button>
            </div>
          </div>
        </div>
      )}
      {showSectionsModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowSectionsModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20000,
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(400px, 90vw)',
              borderRadius: 16,
              background: '#fff',
              padding: 20,
              boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
              display: 'grid',
              gap: 16,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 18 }}>Select Sections</div>

            <div style={{ display: 'grid', gap: 8 }}>
              {sectionsForLocation
                .filter((s) => s.trim().length > 0)
                .map((sec) => (
                  <label
                    key={sec}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSections.includes(sec)}
                      onChange={(e) => {
                        setSelectedSections((prev) =>
                          e.target.checked
                            ? [...prev, sec]
                            : prev.filter((s) => s !== sec),
                        )
                      }}
                    />
                    <span>{sec}</span>
                  </label>
                ))}
            </div>

            <div
              style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}
            >
              <button
                className="btn secondary"
                onClick={() => setShowSectionsModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowSectionsModal(false)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {showTagsModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowTagsModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20000,
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(400px, 90vw)',
              borderRadius: 16,
              background: '#fff',
              padding: 20,
              boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
              display: 'grid',
              gap: 16,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 18 }}>Select Tags</div>

            {/* Existing Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(settings?.tags || []).map((tag) => {
                const selected = selectedTags.some((t) => t.name === tag.name)
                return (
                  <div
                    key={tag.name}
                    onClick={() =>
                      setSelectedTags((prev) =>
                        selected
                          ? prev.filter((t) => t.name !== tag.name)
                          : [...prev, tag],
                      )
                    }
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: tag.color,
                      border: selected
                        ? '2px solid #111827'
                        : '1px solid rgba(0,0,0,0.1)',
                      color: '#1f2937',
                      fontSize: 13,
                    }}
                  >
                    <span>{tag.name}</span>
                    {selected && <strong>✓</strong>}
                  </div>
                )
              })}
            </div>

            {/* New Tag Input */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                Add New Tag
              </div>
              <input
                className="input"
                type="text"
                placeholder="Tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  '#fde68a',
                  '#fbcfe8',
                  '#a5f3fc',
                  '#bbf7d0',
                  '#c7d2fe',
                  '#fca5a5',
                  '#fdba74',
                  '#f9a8d4',
                  '#d9f99d',
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewTagColor(color)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border:
                        newTagColor === color
                          ? '2px solid #111827'
                          : '1px solid #d1d5db',
                      background: color,
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>

              <button
                className="btn btn-primary"
                type="button"
                disabled={!newTagName.trim()}
                onClick={() => {
                  const name = newTagName.trim()
                  if (!name) return
                  const newTag = { name, color: newTagColor }
                  setSelectedTags((prev) => {
                    const exists = prev.some(
                      (t) => t.name.toLowerCase() === name.toLowerCase(),
                    )
                    return exists ? prev : [...prev, newTag]
                  })

                  setNewTagName('')
                  setNewTagColor('#c7d2fe')
                }}
                style={{ marginTop: 8 }}
              >
                Add Tag
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 8,
              }}
            >
              <button
                className="btn secondary"
                onClick={() => setShowTagsModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowTagsModal(false)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
