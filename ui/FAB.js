// ui/FAB.js
import { useEffect, useRef, useState } from 'react'

export default function FAB({ onAddShift }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  // Close on Escape or outside click
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onClickAway(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClickAway)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClickAway)
    }
  }, [])

  return (
    <div className="fab-wrap" ref={wrapRef}>
      {/* Menu */}
      {open && (
        <div className="fab-menu" role="menu">
          <button
            className="fab-menu-item"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
              onAddShift?.()
            }}
          >
            <span className="fab-menu-label">Add new shift</span>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Main FAB */}
      <button
        className="fab"
        aria-label="Open quick actions"
        aria-expanded={open}
        aria-controls="fab-menu"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <svg
          className={`fab-icon ${open ? 'rot' : ''}`}
          width="22"
          height="22"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
