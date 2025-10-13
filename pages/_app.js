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

  // Redirect to /login for private routes
  useEffect(() => {
    if (loading) return
    const isPublic = PUBLIC_ROUTES.includes(router.pathname)
    if (!isPublic && !user) {
      router.replace('/login')
    }
  }, [loading, user, router.pathname])

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>

  const isPublic = PUBLIC_ROUTES.includes(router.pathname)
  if (!isPublic && !user) return null // prevent flicker during redirect

  return children
}

export default function MyApp({ Component, pageProps }) {
  // (Optional) one-time cleanup from earlier experiments
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
        </div>

        <SpeedInsights />
      </AuthGuard>
    </UserProvider>
  )
}
