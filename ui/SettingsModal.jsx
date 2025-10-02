// ui/SettingsModal.jsx
import { useCallback, useEffect, useState } from 'react'
import SettingsPanel from './SettingsPanel'

// tiny helper to show a toast without any global provider
function showToast(message = 'Saved', duration = 2200) {
  const el = document.createElement('div')
  el.className = 'toast toast-success'
  el.textContent = message
  document.body.appendChild(el)
  // force reflow for transition
  window.getComputedStyle(el).opacity
  el.classList.add('show')
  setTimeout(() => {
    el.classList.remove('show')
    setTimeout(() => el.remove(), 300)
  }, duration)
}

export default function SettingsModal({ open, onClose }) {
  const [dirty, setDirty] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Attempt close: if dirty, show confirm
  const attemptClose = useCallback(() => {
    if (dirty) {
      setConfirmOpen(true)
      return
    }
    onClose?.()
  }, [dirty, onClose])

  // close on ESC (but respect confirm)
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') {
        if (confirmOpen) setConfirmOpen(false)
        else attemptClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, attemptClose, confirmOpen])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={attemptClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {/* Header */}
        <div
          className="modal-head"
          style={{
            position: 'sticky',
            top: 0,
            background: 'var(--card,#fff)',
            zIndex: 1,
          }}
        >
          <div className="modal-title" id="settings-modal-title">
            Settings
          </div>
          <button
            type="button"
            className="cal-btn"
            onClick={attemptClose}
            aria-label="Close settings"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ paddingBottom: 0 }}>
          <SettingsPanel
            onDirtyChange={setDirty}
            onRequestClose={attemptClose}
            onSaved={() => {
              // show toast and close
              showToast('Settings saved successfully')
              setDirty(false)
              onClose?.()
            }}
          />
        </div>

        {/* Unsaved changes confirm */}
        {confirmOpen && (
          <div
            className="modal-inline-confirm"
            role="dialog"
            aria-modal="true"
            aria-label="Unsaved changes"
          >
            <div className="confirm-card">
              <div className="h2" style={{ marginBottom: 6 }}>
                Discard unsaved changes?
              </div>
              <div className="note" style={{ marginBottom: 12 }}>
                You have changes that haven’t been saved.
              </div>
              <div
                style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}
              >
                <button
                  className="btn secondary"
                  onClick={() => setConfirmOpen(false)}
                >
                  Go back
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    setConfirmOpen(false)
                    setDirty(false)
                    onClose?.()
                  }}
                >
                  Leave without saving
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
