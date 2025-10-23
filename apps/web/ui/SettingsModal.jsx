// ui/SettingsModal.jsx
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import SettingsPanel from './SettingsPanel'

function showToast(message = 'Saved', duration = 2200) {
  const el = document.createElement('div')
  el.className = 'toast toast-success'
  el.textContent = message
  document.body.appendChild(el)
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

  const attemptClose = useCallback(() => {
    if (dirty) {
      setConfirmOpen(true)
      return
    }
    onClose?.()
  }, [dirty, onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (confirmOpen) setConfirmOpen(false)
        else attemptClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, attemptClose, confirmOpen])

  useEffect(() => {
    if (!open) return
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={attemptClose}
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          zIndex: 10001,
          maxWidth: 640,
          width: 'calc(100vw - 32px)',
          maxHeight: 'calc(100dvh - 24px)',
          display: 'flex',
          flexDirection: 'column', // footer sits at the bottom of the card
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

        {/* Body: the ONLY scroller; no extra bottom padding */}
        <div
          className="modal-body"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: 16,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <SettingsPanel
            onDirtyChange={setDirty}
            onRequestClose={attemptClose}
            onSaved={() => {
              showToast('Settings saved successfully')
              setDirty(false)
              onClose?.()
            }}
          />
        </div>

        {/* Inline confirm above card content */}
        {confirmOpen && (
          <div
            className="modal-inline-confirm"
            role="dialog"
            aria-modal="true"
            aria-label="Unsaved changes"
            style={{ zIndex: 10002 }}
            onClick={(e) => e.stopPropagation()}
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
    </div>,
    document.body,
  )
}
