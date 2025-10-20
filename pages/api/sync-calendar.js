// pages/api/sync-calendar.js
import { createClient } from '@supabase/supabase-js'
import ICAL from 'ical.js'

// ✅ Secure server-side Supabase client (service key)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export const config = { api: { bodyParser: true } }

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  try {
    console.log('🧠 Received body:', req.body)
    const { user_id, userId } = req.body || {}
    const uid = user_id || userId
    if (!uid) return res.status(400).json({ error: 'Missing user_id' })

    // --- Load profile settings ---
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('settings, plan_tier')
      .eq('id', uid)
      .single()

    if (error) throw error
    const settings = profile?.settings || {}
    const planTier = profile?.plan_tier || 'free'
    const locations = Array.isArray(settings.locations)
      ? settings.locations
      : []

    const anySyncOn = locations.some(
      (loc) => loc.calendar_sync_enabled && loc.calendar_feed_url,
    )

    // --- Stop if not Pro or no sync enabled ---
    if (!anySyncOn || planTier !== 'pro') {
      await supabase.from('calendar_shifts').delete().eq('user_id', uid)
      console.log(`🛑 Skipped sync for ${uid} — not Pro or sync off.`)
      return res.status(200).json({
        ok: false,
        skipped: true,
        reason: 'Sync disabled or not Pro',
      })
    }

    // --- Rolling window: 14d back / 90d forward ---
    const now = new Date()
    const startCutoff = new Date(now)
    startCutoff.setDate(startCutoff.getDate() - 14)
    const endCutoff = new Date(now)
    endCutoff.setDate(endCutoff.getDate() + 90)

    let total = 0

    // --- Loop through synced locations ---
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
        console.log(`📆 Parsed ${events.length} events for ${loc.name}`)

        // 1️⃣ Parse & map events to your schema
        const parsed = events.map((ev) => {
          const e = new ICAL.Event(ev)
          const start = e.startDate.toJSDate()
          const end = e.endDate.toJSDate()
          const dateStr = start.toISOString().split('T')[0]
          return {
            external_id: (e.uid || `${loc.id}-${start.toISOString()}`)
              .trim()
              .toLowerCase(),
            user_id: uid,
            location_id: loc.id,
            summary: e.summary || 'Shift',
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            date: dateStr,
            is_all_day: e.startDate.isDate,
            source_url: loc.calendar_feed_url,
          }
        })

        // 🧹 Step 1: Get all current event IDs in this new .ics feed
        const currentExternalIds = new Set(
          parsed.map((e) => e.external_id || e.id),
        )

        // 🧹 Step 2: Fetch existing calendar_shifts for this location
        const { data: existingRows, error: existingErr } = await supabase
          .from('calendar_shifts')
          .select('id, external_id')
          .eq('user_id', uid)
          .eq('location_id', loc.id)

        if (existingErr)
          console.error('Error fetching existing shifts:', existingErr)

        // 🧹 Step 3: Find any that no longer exist in the feed
        const toDelete = (existingRows || [])
          .filter((r) => !currentExternalIds.has(r.external_id))
          .map((r) => r.id)

        if (toDelete.length > 0) {
          console.log(
            `🧹 Removing ${toDelete.length} stale events for ${loc.name}`,
          )
          await supabase
            .from('calendar_shifts')
            .delete()
            .in('id', toDelete)
            .eq('user_id', uid)
        }

        // 2️⃣ Keep only events in the rolling window
        const filteredByDate = parsed.filter((p) => {
          const s = new Date(p.start_time)
          return s >= startCutoff && s <= endCutoff
        })

        // 3️⃣ Fetch converted shifts (already imported into "shifts")
        const { data: converted, error: errConv } = await supabase
          .from('shifts')
          .select('imported_from_calendar_id')
          .eq('user_id', uid)
          .not('imported_from_calendar_id', 'is', null)

        if (errConv) console.error('Fetch converted err:', errConv)
        const convertedSet = new Set(
          (converted || []).map((r) => r.imported_from_calendar_id),
        )

        // 6️⃣ Optional cleanup: delete old calendar_shifts outside window
        await supabase
          .from('calendar_shifts')
          .delete()
          .lt('start_time', startCutoff.toISOString())
          .eq('user_id', uid)

        // 7️⃣ Upsert all events (adds new + updates moved/edited ones)
        const toUpsert = filteredByDate.filter(
          (p) => !convertedSet.has(p.external_id),
        )

        if (toUpsert.length > 0) {
          const { error: insertErr } = await supabase
            .from('calendar_shifts')
            .upsert(toUpsert, { onConflict: 'user_id,external_id' })

          if (insertErr) console.error('❌ Insert error:', insertErr)
          total += toUpsert.length
          console.log(`✅ Synced ${toUpsert.length} events for ${loc.name}`)
        } else {
          console.log(`⚙️ No shifts to sync for ${loc.name}`)
        }

        loc.last_calendar_sync = new Date().toISOString()
        loc.calendar_status = 'ok'
      } catch (err) {
        console.error('Calendar sync failed:', err)
        loc.calendar_status = 'error'
        loc.calendar_last_error = err.message
      }
    }

    // --- Save updated settings ---
    await supabase.from('profiles').update({ settings }).eq('id', uid)

    return res.status(200).json({ ok: true, total })
  } catch (err) {
    console.error('💥 Sync error:', err)
    return res.status(500).json({ error: err.message })
  }
}
