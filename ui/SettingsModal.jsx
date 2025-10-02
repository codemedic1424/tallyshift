// ui/SettingsModal.jsx
import SettingsPanel from './SettingsPanel'

export default function SettingsModal({ open, onClose }) {
  if (!open) return null
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          className="modal-head"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div className="modal-title">Settings</div>
          <button
            type="button"
            className="cal-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            Close
          </button>
        </div>
        <div className="modal-body" style={{ paddingTop: 0 }}>
          <SettingsPanel />
        </div>
      </div>
    </div>
  )
}
