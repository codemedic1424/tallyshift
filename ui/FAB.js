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

  // Optional: close on route change if you use Next Router
  // (uncomment if needed)
  // const router = useRouter()
  // useEffect(() => {
  //   const close = () => setOpen(false)
  //   router.events.on('routeChangeStart', close)
  //   return () => router.events.off('routeChangeStart', close)
  // }, [router])

  return (
    <div className="fab-wrap" ref={wrapRef}>
      {/* Backdrop for menu (click to close) */}
      {open && (
        <button
          className="fab-scrim"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      {/* Menu */}
      <div
        id="fab-menu"
        className={`fab-menu ${open ? 'open' : ''}`}
        role="menu"
        aria-hidden={!open}
      >
        <button
          className="fab-menu-item"
          role="menuitem"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(false)
            onAddShift?.()
          }}
        >
          <span className="fab-menu-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="fab-menu-label">Add new shift</span>
        </button>

        {/* Add more actions later if you want:
        <button className="fab-menu-item" role="menuitem">…</button>
        */}
      </div>

      {/* Main FAB */}
      <button
        className={`fab ${open ? 'open' : ''}`}
        aria-label="Open quick actions"
        aria-expanded={open}
        aria-controls="fab-menu"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <svg
          className="fab-icon"
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
