// pages/auth/callback.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [err, setErr] = useState(null)

  useEffect(() => {
    async function run() {
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href,
      )
      if (error) {
        setErr(error.message)
        return
      }
      router.replace('/?onboard=1')
    }
    run()
  }, [router])

  return (
    <div className="container">
      <div className="card">Signing you in…{err ? ` Error: ${err}` : ''}</div>
    </div>
  )
}
