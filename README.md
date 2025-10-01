
# TallyShift (Supabase cloud starter)

This version lets users **sign in** with email and saves shifts to the **cloud (Supabase)** so data follows them across devices.

## Setup (10–15 minutes)
1) **Create Supabase project** (free): https://supabase.com
2) In your project → **Project Settings → API**: copy
   - `Project URL` → set as `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
   - `anon public key` → set as `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
3) In Supabase **Authentication → Providers → Email**, enable Email auth (magic link / OTP).
4) Open **SQL editor** in Supabase and paste `supabase_schema.sql` from this folder → Run.
5) On your computer:
   ```bash
   cp .env.example .env.local   # fill in the two values
   npm install
   npm run dev
   ```
6) Open http://localhost:3000 → click **Login**, enter your email, click the link you receive.

## What’s included
- Email magic-link login
- Shifts table with RLS (users can only see their own rows)
- Log / History / Insights pages using Supabase

## Next steps
- Add Venues & Roles screens (tables already included)
- Add tip-out rules and auto-calculation
- Deploy to **Vercel** (free) and set the same env vars there
- Add Stripe for subscriptions later
