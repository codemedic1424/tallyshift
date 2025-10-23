// ui/Avatar.js
import Link from 'next/link'
export default function Avatar({ first = '', last = '', href = '/profile' }) {
  const initials =
    (first?.[0] || '').toUpperCase() + (last?.[0] || '').toUpperCase()
  const core = (
    <div className="avatar-circle" aria-label="Profile">
      {initials || '🙂'}
    </div>
  )
  return href ? (
    <Link href={href} aria-label="Edit profile">
      {core}
    </Link>
  ) : (
    core
  )
}
