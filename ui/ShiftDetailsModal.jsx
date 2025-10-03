// ui/ShiftDetailsModal.jsx
import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'

// Parse 'YYYY-MM-DD' as a local date (no UTC shift)
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
  tipsOnPaycheck,
  showCashInput,
  showCardInput,
  defaultTipoutPct,
}) {
  // formatting helpers
  const formatCurrencyValue = (input) => {
    if (input === '' || input == null) return ''
    const n = Number(input)
    return Number.isNaN(n) ? '' : n.toFixed(2)
  }
  const sanitizeCurrencyValue = (input) => {
    if (!input) return ''
    const digits = String(input).replace(/\D/g, '')
    if (!digits) return ''
    return (parseInt(digits, 10) / 100).toFixed(2)
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

  // local edit state
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editDate, setEditDate] = useState('')
  const [editHours, setEditHours] = useState('')
  const [editSales, setEditSales] = useState('')
  const [editCash, setEditCash] = useState('')
  const [editCard, setEditCard] = useState('')
  const [editTipOut, setEditTipOut] = useState('')
  const [editTipOutDirty, setEditTipOutDirty] = useState(false)
  const [editNotes, setEditNotes] = useState('')

  // inline delete confirm
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // init fields
  useEffect(() => {
    if (!shift) return
    setEditDate(String(shift.date))
    setEditHours(Number(shift.hours || 0).toFixed(2))
    setEditSales(formatCurrencyValue(shift.sales))
    setEditCash(formatCurrencyValue(shift.cash_tips))
    setEditCard(formatCurrencyValue(shift.card_tips))
    setEditTipOut(formatCurrencyValue(shift.tip_out_total))
    setEditNotes(shift.notes || '')
    setEditTipOutDirty(false)
    setConfirmingDelete(false)
    setDeleting(false)
    setEditMode(false)
  }, [shift])

  // auto-calc tip-out
  useEffect(() => {
    if (!editMode) return
    if (editTipOutDirty) return
    if (defaultTipoutPct == null) return
    if (tipsOnPaycheck) return
    const cashV = showCashInput ? Number(formatCurrencyValue(editCash) || 0) : 0
    const cardV = showCardInput ? Number(formatCurrencyValue(editCard) || 0) : 0
    const totalTips = cashV + cardV
    if (totalTips <= 0) {
      if (editTipOut !== '') setEditTipOut('')
      return
    }
    const computed = ((totalTips * defaultTipoutPct) / 100).toFixed(2)
    if (editTipOut !== computed) setEditTipOut(computed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editMode,
    editCash,
    editCard,
    editTipOut,
    editTipOutDirty,
    defaultTipoutPct,
    tipsOnPaycheck,
    showCashInput,
    showCardInput,
  ])

  const net = useMemo(() => {
    const c = Number(shift?.cash_tips || 0)
    const k = Number(shift?.card_tips || 0)
    const t = Number(shift?.tip_out_total || 0)
    return c + k - t
  }, [shift])

  const eff = useMemo(() => {
    const h = Number(shift?.hours || 0)
    return h > 0 ? net / h : 0
  }, [shift, net])

  // Save/Delete handlers
  async function handleSave() {
    setSaving(true)
    await onSave({
      date: editDate,
      hours: Number(editHours || 0),
      sales: Number(formatCurrencyValue(editSales) || 0),
      cash_tips:
        !tipsOnPaycheck && showCashInput
          ? Number(formatCurrencyValue(editCash) || 0)
          : 0,
      card_tips:
        !tipsOnPaycheck && showCardInput
          ? Number(formatCurrencyValue(editCard) || 0)
          : 0,
      tip_out_total: Number(formatCurrencyValue(editTipOut) || 0),
      notes: editNotes,
    }).finally(() => setSaving(false))
    setEditMode(false)
  }

  async function confirmDelete() {
    try {
      setDeleting(true)
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  // Close helpers + accessibility
  useEffect(() => {
    if (!shift) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (confirmingDelete) setConfirmingDelete(false)
        else {
          onClose?.()
          setEditMode(false)
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [shift, onClose, confirmingDelete])

  // Lock background scroll while open
  useEffect(() => {
    if (!shift) return
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [shift])

  if (!shift) return null

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={() => {
        onClose?.()
        setEditMode(false)
        setConfirmingDelete(false)
      }}
      style={{
        position: 'fixed',
        inset: 0,
        height: '100dvh',
        zIndex: 10000,
        background: 'rgba(0,0,0,.45)',
        display: 'grid',
        placeItems: 'center',
        isolation: 'isolate',
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-details-title"
        style={{
          position: 'fixed',
          zIndex: 10001,
          maxWidth: 640,
          width: 'calc(100vw - 32px)',
          maxHeight: 'calc(100dvh - 24px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 18px 50px rgba(0,0,0,.18)',
        }}
      >
        <div
          className="modal-head"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            borderBottom: '1px solid #eee',
          }}
        >
          <div className="modal-title" id="shift-details-title">
            {editMode
              ? 'Edit shift'
              : parseDateOnlyLocal(shift.date).toLocaleDateString()}
          </div>
          <button
            className="cal-btn"
            onClick={() => {
              onClose?.()
              setEditMode(false)
              setConfirmingDelete(false)
            }}
            aria-label="Close shift details"
          >
            ×
          </button>
        </div>

        {!editMode ? (
          <>
            {/* VIEW MODE */}
            <div
              className="modal-body"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                padding: 16,
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
            >
              <div className="modal-row">
                <span>Hours</span>
                <b>{Number(shift.hours || 0).toFixed(2)}</b>
              </div>
              <div className="modal-row">
                <span>Net tips</span>
                <b>{currencyFormatter.format(net)}</b>
              </div>
              <div className="modal-row">
                <span>Effective hourly</span>
                <b>{currencyFormatter.format(eff)} /h</b>
              </div>
              <hr />
              <div className="modal-row">
                <span>Sales</span>
                <b>{currencyFormatter.format(Number(shift.sales || 0))}</b>
              </div>
              <div className="modal-row">
                <span>Cash tips</span>
                <b>{currencyFormatter.format(Number(shift.cash_tips || 0))}</b>
              </div>
              <div className="modal-row">
                <span>Card tips</span>
                <b>{currencyFormatter.format(Number(shift.card_tips || 0))}</b>
              </div>
              <div className="modal-row">
                <span>Tip-out</span>
                <b>
                  {currencyFormatter.format(Number(shift.tip_out_total || 0))}
                </b>
              </div>
              {shift.notes && (
                <>
                  <hr />
                  <div className="modal-note">{shift.notes}</div>
                </>
              )}
            </div>

            <div
              className="modal-actions"
              style={{
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <button
                className="btn btn-danger"
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
            </div>
          </>
        ) : (
          <>
            {/* EDIT MODE */}
            <div
              className="modal-body"
              style={{
                flex: 1,
                minHeight: 0,
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                display: 'grid',
                gap: 16,
                overflowY: 'auto',
                padding: 16,
                paddingRight: 4,
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
            >
              <label className="field">
                <span className="field-label">Date</span>
                <input
                  className="input"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Hours worked</span>
                <input
                  className="input"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={editHours}
                  onChange={(e) =>
                    setEditHours(sanitizeHoursValue(e.target.value))
                  }
                  onBlur={() => setEditHours((v) => formatHoursOnBlur(v))}
                />
              </label>
              <label className="field">
                <span className="field-label">Sales</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input"
                  placeholder="0.00"
                  value={editSales}
                  onChange={(e) =>
                    setEditSales(sanitizeCurrencyValue(e.target.value))
                  }
                  onBlur={() => setEditSales((v) => formatCurrencyValue(v))}
                />
              </label>
              {!tipsOnPaycheck ? (
                <>
                  {showCashInput && (
                    <label className="field">
                      <span className="field-label">Cash tips</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="input"
                        placeholder="0.00"
                        value={editCash}
                        onChange={(e) =>
                          setEditCash(sanitizeCurrencyValue(e.target.value))
                        }
                        onBlur={() =>
                          setEditCash((v) => formatCurrencyValue(v))
                        }
                      />
                    </label>
                  )}
                  {showCardInput && (
                    <label className="field">
                      <span className="field-label">Card tips</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="input"
                        placeholder="0.00"
                        value={editCard}
                        onChange={(e) =>
                          setEditCard(sanitizeCurrencyValue(e.target.value))
                        }
                        onBlur={() =>
                          setEditCard((v) => formatCurrencyValue(v))
                        }
                      />
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
                <input
                  type="text"
                  inputMode="decimal"
                  className="input"
                  placeholder="0.00"
                  value={editTipOut}
                  onChange={(e) => {
                    setEditTipOutDirty(true)
                    setEditTipOut(sanitizeCurrencyValue(e.target.value))
                  }}
                  onBlur={() =>
                    setEditTipOut((v) => (v ? formatCurrencyValue(v) : ''))
                  }
                />
                {defaultTipoutPct != null && !tipsOnPaycheck && (
                  <div className="note" style={{ marginTop: 4 }}>
                    Auto-filled at {defaultTipoutPct}% of tips. Adjust if
                    needed.
                  </div>
                )}
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
            </div>

            <div
              className="modal-actions"
              style={{ justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}
            >
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                className="btn secondary"
                onClick={() => setEditMode(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>

      {/* Centered confirmation overlay above the card */}
      {confirmingDelete && (
        <div
          onClick={() => setConfirmingDelete(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10002, // above card (10001)
            padding: 16,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(420px, 100%)',
              display: 'grid',
              gap: 12,
              background: 'var(--card,#fff)',
              border: '1px solid var(--border,#e5e7eb)',
              padding: 16,
              borderRadius: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="h2" style={{ fontSize: 18, marginBottom: 2 }}>
              Delete this shift?
            </div>
            <div className="note">This can’t be undone.</div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 8,
                flexWrap: 'wrap',
              }}
            >
              <button
                className="btn secondary"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
