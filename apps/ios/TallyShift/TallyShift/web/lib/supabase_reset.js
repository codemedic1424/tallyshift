import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const storage = typeof window !== 'undefined' ? window.sessionStorage : undefined

export const supabaseReset = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    multiTab: false,
    detectSessionInUrl: true,   // ONLY here we parse recovery tokens
    storage,
    storageKey: 'ts-auth-reset' // 👈 different key to prevent any collision
  },
})
