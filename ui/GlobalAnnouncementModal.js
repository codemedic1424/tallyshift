import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'

export default function AddToHomeScreenModal({ delayMinutes = 2 }) {
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const deferredPromptRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)

    // Don't show if user already saw it, or already running as standalone PWA
    const seen = localStorage.getItem('hasSeenA2HSModal')
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    if (seen || isStandalone) return

    // Platform detect
    const ua = navigator.userAgent || ''
    setIsIOS(/iPhone|iPad|iPod/i.test(ua))
    setIsAndroid(/Android/i.test(ua))

    // Capture Android install prompt if available
    const onBIP = (e) => {
      e.preventDefault()
      deferredPromptRef.current = e
    }
    window.addEventListener('beforeinstallprompt', onBIP)

    const t = setTimeout(
      () => {
        setShow(true)
        localStorage.setItem('hasSeenA2HSModal', 'true')
      },
      delayMinutes * 60 * 1000,
    )

    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      clearTimeout(t)
    }
  }, [delayMinutes])

  const handleInstallClick = async () => {
    const dp = deferredPromptRef.current
    if (!dp) return setShow(false) // fallback close
    dp.prompt()
    await dp.userChoice
    setShow(false)
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="modal-card"
            style={{
              width: 'min(420px, 90vw)',
              padding: 24,
              textAlign: 'center',
            }}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* Title */}
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 10,
                color: '#111827',
                lineHeight: 1.3,
              }}
            >
              Add{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #2563eb, #22c55e)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                TallyShift
              </span>{' '}
              to Your Home Screen
            </h2>

            {/* Subtext */}
            <p
              style={{
                fontSize: 15,
                color: '#4b5563',
                lineHeight: 1.6,
                marginBottom: 16,
                padding: '0 6px',
              }}
            >
              Faster access, full-screen experience. After installing, enable
              <strong> WebApp Mode</strong> in your Profile for the most
              “native” feel.
            </p>

            {/* Instructions / Android one-tap */}
            <div
              style={{
                textAlign: 'left',
                background: '#f9fafb',
                borderRadius: 12,
                padding: '16px 18px',
                fontSize: 14,
                color: '#374151',
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              {isAndroid && deferredPromptRef.current ? (
                <p style={{ margin: 0 }}>
                  Tap <strong>Install</strong> below to add TallyShift to your
                  home screen.
                </p>
              ) : isIOS ? (
                <ol
                  style={{
                    listStyle: 'decimal',
                    margin: '0',
                    paddingLeft: '1.2em',
                  }}
                >
                  <li>
                    Tap the <strong>Share</strong> icon in your browser.
                  </li>
                  <li>
                    Select <strong>Add to Home Screen</strong>.
                  </li>
                  <li>Keep "Open as Web App" and click "Add".</li>
                </ol>
              ) : isAndroid ? (
                <ol
                  style={{
                    listStyle: 'decimal',
                    margin: '0',
                    paddingLeft: '1.2em',
                  }}
                >
                  <li>
                    Tap the <strong>⋮</strong> menu in Chrome.
                  </li>
                  <li>
                    Select <strong>Install App</strong>.
                  </li>
                  <li>Open it from your home screen.</li>
                </ol>
              ) : (
                <p style={{ margin: 0 }}>
                  Open this site on your phone to add TallyShift to your home
                  screen.
                </p>
              )}
            </div>

            {/* Actions — reuse your existing button styles */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {isAndroid && deferredPromptRef.current ? (
                <motion.button
                  className="btn btn-primary"
                  onClick={handleInstallClick}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Install
                </motion.button>
              ) : null}

              <button className="btn secondary" onClick={() => setShow(false)}>
                Close
              </button>
            </div>

            {/* Backdrop + card match your WalkthroughModal */}
            <style jsx>{`
              .modal-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
              }
              .modal-card {
                background: #fff;
                border-radius: 20px;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
                color: #1f2937;
              }
            `}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
