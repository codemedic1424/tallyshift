import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const storage = typeof window !== 'undefined' ? window.localStorage : undefined

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    multiTab: false,
    detectSessionInUrl: false, // do NOT parse magic-link tokens globally
    storage,
    storageKey: 'ts-auth', // 👈 unique per app
  },
})
