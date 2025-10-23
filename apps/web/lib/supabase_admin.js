// lib/supabase_admin.js
import { createClient } from '@supabase/supabase-js'

export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) throw new Error('Supabase admin not configured')
  return createClient(url, service, { auth: { persistSession: false } })
}
