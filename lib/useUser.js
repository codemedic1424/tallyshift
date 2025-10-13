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

      if (!sessionUser) {
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      // 2️⃣ Load extended profile info (plan_tier, founder, etc.)
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(
          'first_name, last_name, avatar_path, plan_tier, pro_override, founder',
        )
        .eq('id', sessionUser.id)
        .single()

      if (mounted) {
        if (error) console.error('Profile fetch error:', error.message)
        // merge the two objects: auth user + profile fields
        setUser({
          ...sessionUser,
          ...profileData,
        })
        setLoading(false)
      }
    }

    loadUser()

    // 3️⃣ Auth listener to update on login/logout
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      if (session?.user) {
        // re-fetch profile on login
        supabase
          .from('profiles')
          .select(
            'first_name, last_name, avatar_path, plan_tier, pro_override, founder',
          )
          .eq('id', session.user.id)
          .single()
          .then(({ data: profileData }) => {
            setUser({
              ...session.user,
              ...profileData,
            })
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
