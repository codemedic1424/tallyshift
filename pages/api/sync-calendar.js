// pages/api/sync-calendar.js
import { createClient } from '@supabase/supabase-js'
import ICAL from 'ical.js'

// Use service key so the function can update JSON safely
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { user_id } = req.body
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' })

    // Fetch the user's settings JSON
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', user_id)
      .single()
    if (error) throw error

    const settings = profile.settings || {}
    const locations = Array.isArray(settings.locations)
      ? settings.locations
      : []

    let total = 0

    for (const loc of locations) {
      if (!loc.calendar_sync_enabled || !loc.calendar_feed_url) continue

      console.log(`🔄 Syncing calendar for ${loc.name}`)

      try {
        const response = await fetch(loc.calendar_feed_url)
        if (!response.ok)
          throw new Error(`Failed to fetch .ics (${response.status})`)
        const text = await response.text()

        const comp = new ICAL.Component(ICAL.parse(text))
        const events = comp.getAllSubcomponents('vevent')

        const parsed = events.map((ev) => {
          const e = new ICAL.Event(ev)
          const start = e.startDate.toJSDate()
          const end = e.endDate.toJSDate()
          const dateStr = start.toISOString().split('T')[0]
          return {
            user_id,
            location_id: loc.id,
            summary: e.summary || 'Shift',
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            date: dateStr,
            is_all_day: e.startDate.isDate,
            source_url: loc.calendar_feed_url,
          }
        })

        if (parsed.length > 0) {
          const { error: insertErr } = await supabase
            .from('calendar_shifts')
            .upsert(parsed, { onConflict: 'user_id,location_id,start_time' })
          if (insertErr) console.error(insertErr)
          total += parsed.length
        }

        loc.last_calendar_sync = new Date().toISOString()
        loc.calendar_status = 'ok'
        loc.calendar_last_error = null
      } catch (err) {
        console.error('Calendar sync failed:', err)
        loc.calendar_status = 'error'
        loc.calendar_last_error = err.message
      }
    }

    await supabase.from('profiles').update({ settings }).eq('id', user_id)

    return res.status(200).json({ ok: true, total })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
