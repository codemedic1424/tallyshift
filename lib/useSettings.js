// lib/useSettings.js
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useUser } from './useUser'

export function useSettings() {
  const { user } = useUser()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchSettings(uid) {
    const { data, error } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', uid)
      .single()
    if (error) throw error
    return data?.settings || {}
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (!user) {
          setSettings(null)
          setLoading(false)
          return
        }
        setLoading(true)
        const s = await fetchSettings(user.id)
        if (alive) setSettings(s)
      } catch (e) {
        if (alive) setError(e.message || 'Failed to load settings')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [user])

  async function saveSettings(patch) {
    if (!user) return
    const next = { ...(settings || {}), ...patch }
    const { error } = await supabase
      .from('profiles')
      .update({ settings: next })
      .eq('id', user.id)
    if (error) throw error
    setSettings(next)
  }

  return { settings, saveSettings, loading, error }
}
