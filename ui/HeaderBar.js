// ui/HeaderBar.js
import { useRouter } from 'next/router'

export default function HeaderBar() {
  const { pathname } = useRouter()
  const title =
    pathname === '/calendar'
      ? 'Calendar'
      : pathname === '/history'
        ? 'History'
        : pathname === '/insights'
          ? 'Insights'
          : 'TallyShift'
  return (
    <div className="appbar">
      <div className="appbar-title">{title}</div>
      <div className="appbar-actions" />
    </div>
  )
}
