// pages/_app.js
import '../styles/globals.css'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { UserProvider, useUser } from '../lib/useUser'
import { SpeedInsights } from '@vercel/speed-insights/next'

const PUBLIC_ROUTES = ['/login', '/reset', '/reset-sent']

function AuthGuard({ children }) {
  const router = useRouter()
  const { user, loading } = useUser()

  // If we're on a private route and not logged in, send to /login
  useEffect(() => {
    if (loading) return
    const isPublic = PUBLIC_ROUTES.includes(router.pathname)
    if (!isPublic && !user) {
      router.replace('/login')
    }
  }, [loading, user, router.pathname])

  // Simple splash while we decide
  if (loading) return <div style={{ padding: 24 }}>Loading…</div>

  const isPublic = PUBLIC_ROUTES.includes(router.pathname)
  if (!isPublic && !user) return null // prevent flicker (we're redirecting)

  return children
}

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <SpeedInsights />
    </>
  )
}

export default function App({ Component, pageProps }) {
  // one-time cleanup of any old localStorage sessions (from earlier experiments)
  useEffect(() => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-'))
        .forEach((k) => localStorage.removeItem(k))
    } catch {}
  }, [])

  return (
    <UserProvider>
      <AuthGuard>
        <Component {...pageProps} />
      </AuthGuard>
    </UserProvider>
  )
}
