// pages/_app.js
import '../styles/globals.css'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { UserProvider, useUser } from '../lib/useUser'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Head from 'next/head'

const PUBLIC_ROUTES = ['/login', '/reset', '/reset-sent']

function AuthGuard({ children }) {
  const router = useRouter()
  const { user, loading } = useUser()

  useEffect(() => {
    if (loading) return
    const isPublic = PUBLIC_ROUTES.includes(router.pathname)
    if (!isPublic && !user) {
      router.replace('/login')
    }
  }, [loading, user, router.pathname])

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>

  const isPublic = PUBLIC_ROUTES.includes(router.pathname)
  if (!isPublic && !user) return null

  return children
}

// 👇 The badge component
function EnvironmentBadge() {
  const env = process.env.NEXT_PUBLIC_ENV
  if (env === 'production') return null

  const bg =
    env === 'development'
      ? '#e63946' // red
      : env === 'staging'
        ? '#ff9800' // orange
        : '#6c757d' // gray fallback

  return (
    <div
      style={{
        position: 'fixed',
        top: '0.75rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: bg,
        color: '#fff',
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        zIndex: 2147483647,
        pointerEvents: 'none',
        opacity: 0.15,
      }}
    >
      {env ? env.toUpperCase() : 'DEV'} MODE
    </div>
  )
}

export default function MyApp({ Component, pageProps }) {
  const router = useRouter() // ✅ add this

  // 🧩 Dynamically load Tailwind only for /manager pages
  useEffect(() => {
    if (router.pathname.startsWith('/manager')) {
      import('../styles/manager.css')
    }
  }, [router.pathname])

  // 🧹 Cleanup for old Supabase session keys
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
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>

        <div id="app-viewport" className="app-viewport">
          <Component {...pageProps} />
          <EnvironmentBadge />
        </div>

        <SpeedInsights />
      </AuthGuard>
    </UserProvider>
  )
}
