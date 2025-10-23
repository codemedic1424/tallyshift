import { useState, useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'

export default function FAB({ onAddShift }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  // Close when tapping outside
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return (
    <div className="fab-wrapper" ref={wrapRef}>
      {/* Action chip */}
      <div className={`fab-chip ${open ? 'show' : ''}`}>
        <button
          className="fab-chip-btn"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(false)
            onAddShift?.()
          }}
        >
          <span className="fab-chip-icon">
            <Plus size={18} strokeWidth={2.5} />
          </span>
          <span className="fab-chip-label">Add new shift</span>
        </button>
      </div>

      {/* Main FAB */}
      <button
        className={`fab-main ${open ? 'open' : ''}`}
        aria-label="Add shift"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <Plus
          size={28}
          strokeWidth={2.5}
          style={{
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease',
          }}
        />
      </button>

      <style jsx global>{`
        .fab-wrapper {
          position: fixed;
          bottom: calc(115px + env(safe-area-inset-bottom));
          right: 24px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
        }

        /* --- Main floating button --- */
        .fab-main {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #2563eb;
          color: #fff;
          border: none;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .fab-main:hover {
          transform: scale(1.08);
          background: #1d4ed8;
        }

        .fab-main.open {
          background: #1d4ed8;
        }

        /* --- Floating chip --- */
        .fab-chip {
          opacity: 0;
          transform: translateY(8px);
          pointer-events: none;
          transition: all 0.25s ease;
        }

        .fab-chip.show {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .fab-chip-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 9999px;
          padding: 10px 16px;
          font-weight: 600;
          font-size: 15px;
          color: #111827;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
          transition: all 0.2s ease;
        }

        .fab-chip-btn:hover {
          color: #2563eb;
          transform: translateY(-1px);
        }

        .fab-chip-icon {
          background: #2563eb;
          color: white;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .fab-chip-label {
          user-select: none;
        }
      `}</style>
    </div>
  )
}
