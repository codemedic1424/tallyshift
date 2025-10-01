// ui/TabBar.js
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Home, Calendar, Clock, BarChart2, User } from 'lucide-react'

export default function TabBar() {
  const router = useRouter()

  const tabs = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/history', label: 'History', icon: Clock },
    { href: '/insights', label: 'Insights', icon: BarChart2 },
    { href: '/profile', label: 'Profile', icon: User }, // ✅ new tab
  ]

  return (
    <nav className="tabbar">
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
}

