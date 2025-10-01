// ui/AddShiftModal.jsx
import { useEffect, useMemo, useState } from 'react'

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
  onSave, // (payload) => Promise<void>  (parent inserts into DB)
  currencyFormatter, // Intl.NumberFormat
  currencySymbol, // string (e.g., "$")
  tipsOnPaycheck, // boolean
  showCashInput, // boolean
  showCardInput, // boolean
  defaultTipoutPct, // number | null
}) {
  const [saving, setSaving] = useState(false)

  // form state (local to the modal)
  const [date, setDate] = useState(initialDate || isoDate(new Date()))
  const [hours, setHours] = useState('')
  const [sales, setSales] = useState('')
  const [cash, setCash] = useState('')
  const [card, setCard] = useState('')
  const [tipOut, setTipOut] = useState('')
  const [notes, setNotes] = useState('')
  const [tipOutDirty, setTipOutDirty] = useState(false)

  // reset form whenever we open or initialDate changes
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
  }, [open, initialDate])

  // helpers (component-local)
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
    const snapped = Math.round(n * 4) / 4
    return snapped.toFixed(2)
  }

  // auto-calc tip-out (like you do elsewhere)
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
      hours: Number(hours || 0),
      sales: Number(formatCurrencyValue(sales) || 0),
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
              <label className="field">
                <span className="field-label">Hours worked</span>
                <input
                  className="input"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={hours}
                  onChange={(e) => setHours(sanitizeHoursValue(e.target.value))}
                  onBlur={() => setHours((v) => formatHoursOnBlur(v))}
                />
              </label>
            </div>
          </div>

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
              <label className="field">
                <span className="field-label">Sales</span>
                {renderCurrencyInput(
                  sales,
                  (e) => setSales(sanitizeCurrencyValue(e.target.value)),
                  () => setSales((prev) => formatCurrencyValue(prev)),
                )}
              </label>

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
