// lib/useUser.js
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const Ctx = createContext({ user: null, loading: true })

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      // 1️⃣ Get current session
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession()
      if (sessionError) {
        console.error('Auth session error:', sessionError.message)
        if (mounted) setLoading(false)
        return
      }

      const sessionUser = sessionData.session?.user
      if (!sessionUser) {
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      // 2️⃣ Fetch extended profile (plan_tier, etc.)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_path, plan_tier, pro_override')
        .eq('id', sessionUser.id)
        .single()
      if (profileError) {
        console.error('Profile fetch error:', profileError.message)
      }

      if (mounted) {
        // Merge auth user + profile fields
        const merged = {
          ...sessionUser,
          ...profileData,
        }
        setUser(merged)
        setLoading(false)
      }
    }

    loadUser()

    // 3️⃣ Auth state listener (login/logout/profile refresh)
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        const newUser = session?.user
        if (newUser) {
          // Always fetch profile fields when auth changes
          const { data: profileData } = await supabase
            .from('profiles')
            .select(
              'first_name, last_name, avatar_path, plan_tier, pro_override, founder',
            )
            .eq('id', newUser.id)
            .single()
          setUser({ ...newUser, ...profileData })
        } else {
          setUser(null)
        }
      },
    )

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  return <Ctx.Provider value={{ user, loading }}>{children}</Ctx.Provider>
}

export function useUser() {
  return useContext(Ctx)
}
