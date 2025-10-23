// ui/TabBar.js
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Home, Calendar, Clock, BarChart2, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function TabBar() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const tabs = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/history', label: 'History', icon: Clock },
    { href: '/insights', label: 'Insights', icon: BarChart2 },
    { href: '/profile', label: 'Profile', icon: User },
  ]

  const bar = (
    <nav className="tabbar" role="navigation" aria-label="Bottom navigation">
      {tabs.map((t) => {
        const Icon = t.icon
        const active = router.pathname === t.href
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`tab-item ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={22} />
            <span>{t.label}</span>
          </Link>
        )
      })}
    </nav>
  )

  return mounted ? (
    <>
      {createPortal(bar, document.body)}
      <style jsx global>{`
        .tabbar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #ffffff;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          display: flex;
          justify-content: space-around;
          align-items: flex-start;
          height: calc(100px + env(safe-area-inset-bottom));
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
          z-index: 9999;
          padding-top: 10px;
          padding-bottom: env(safe-area-inset-bottom);
          position: fixed;
          inset-inline: 0;
          /* 👇 absolutely lock to viewport layer */
          pointer-events: auto;
          will-change: transform;
        }

        body,
        html {
          height: 100%;
          overflow-x: hidden;
        }

        body {
          /* Ensure fixed elements aren’t clipped inside containers */
          overscroll-behavior-y: none;
          -webkit-overflow-scrolling: touch;
        }

        .tab-item {
          flex: 1;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
          font-weight: 500;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 4px;
          padding-top: 4px;
          transition:
            color 0.2s,
            transform 0.2s;
        }

        .tab-item.active {
          color: #0ea5e9;
          background: linear-gradient(
            135deg,
            rgba(37, 99, 235, 0.1),
            rgba(34, 197, 94, 0.1)
          );
          border-radius: 14px;
          transform: translateY(-2px);
        }

        .tab-item svg {
          margin-bottom: 2px;
        }
      `}</style>
    </>
  ) : null
}
