// lib/useSettings.js
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useUser } from './useUser'

// minimal defaults (do NOT erase unknown keys)
const withDefaults = (raw) => {
  const s = raw && typeof raw === 'object' ? raw : {}
  return {
    payout_mode: s.payout_mode ?? 'both',
    currency: s.currency ?? 'USD',
    week_start: s.week_start ?? 'sunday',
    default_calendar_view: s.default_calendar_view ?? 'month',
    default_tipout_pct:
      typeof s.default_tipout_pct === 'number' ? s.default_tipout_pct : null,

    // form toggles
    track_hours: typeof s.track_hours === 'boolean' ? s.track_hours : true,
    track_sales: typeof s.track_sales === 'boolean' ? s.track_sales : true,

    // locations model (new)
    multiple_locations:
      typeof s.multiple_locations === 'boolean' ? s.multiple_locations : false,
    default_location_id:
      typeof s.default_location_id === 'string' ? s.default_location_id : null,
    locations: Array.isArray(s.locations) ? s.locations : s.locations ? [] : [],

    // preserve anything else without losing it
    ...s,
  }
}

export function useSettings() {
  const { user } = useUser()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .single()
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setSettings(withDefaults(data?.settings || {}))
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  const saveSettings = useCallback(
    async (newSettings) => {
      if (!user) throw new Error('No user')
      // Save EXACTLY what caller sends; do not re-normalize/strip unknown fields
      const payload =
        newSettings && typeof newSettings === 'object' ? newSettings : {}

      const { error } = await supabase
        .from('profiles')
        .update({ settings: payload })
        .eq('id', user.id)

      if (error) throw error
      // reload from DB (and apply defaults non-destructively)
      await load()
    },
    [user, load],
  )

  return { settings, saveSettings, loading, error, reloadSettings: load }
}
