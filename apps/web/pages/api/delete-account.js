// pages/api/delete-account.js
import { createClient } from '@supabase/supabase-js'
import { getAdminClient } from '../../lib/supabase_admin'

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon)
    return res.status(500).json({ error: 'Server not configured' })

  // 1) Verify the caller (use their Supabase access token)
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing token' })

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userInfo, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userInfo?.user?.id)
    return res.status(401).json({ error: 'Invalid session' })

  const userId = userInfo.user.id
  const admin = getAdminClient()

  try {
    // (Optional) remove avatar(s) if you’re using public bucket `avatars`
    const candidates = [
      `${userId}.jpg`,
      `${userId}.jpeg`,
      `${userId}.png`,
      `${userId}.webp`,
    ]
    await Promise.allSettled(
      candidates.map((n) => admin.storage.from('avatars').remove([n])),
    )

    // If you DO NOT have FK cascades, uncomment manual deletes:
    // await admin.from('shifts').delete().eq('user_id', userId)
    // await admin.from('profiles').delete().eq('id', userId)

    // Delete the auth user (this will cascade if FKs are set)
    const { error: delErr } = await admin.auth.admin.deleteUser(userId)
    if (delErr) throw delErr

    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Delete failed' })
  }
}
