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
      // 1️⃣ Get session from Supabase Auth
      const { data: sessionData } = await supabase.auth.getSession()
      const sessionUser = sessionData.session?.user ?? null

      // If no auth session, stop right here
      if (!sessionUser) {
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      // ✅ Immediately show the base user (fast render)
      if (mounted) {
        setUser(sessionUser)
        setLoading(false)
      }

      // 2️⃣ Then fetch extended profile info (non-blocking)
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_path, plan_tier, pro_override')
          .eq('id', sessionUser.id)
          .single()

        if (mounted && profileData) {
          setUser((u) => ({ ...u, ...profileData }))
        }

        if (error) {
          console.warn('Profile fetch error:', error.message)
        }
      } catch (err) {
        console.warn('Profile fetch failed:', err.message)
      }
    }

    loadUser()

    // 3️⃣ Auth listener to update on login/logout
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      if (session?.user) {
        // Re-fetch profile on login
        supabase
          .from('profiles')
          .select('first_name, last_name, avatar_path, plan_tier, pro_override')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profileData }) => {
            setUser({ ...session.user, ...profileData })
          })
      } else {
        setUser(null)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return <Ctx.Provider value={{ user, loading }}>{children}</Ctx.Provider>
}

export function useUser() {
  return useContext(Ctx)
}
