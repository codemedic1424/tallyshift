// pages/api/create-customer-portal-session.js
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // ✅ use service role key, not anon key
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' })
    }

    // ✅ Fetch the Stripe customer ID securely
    const { data, error } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (error || !data?.stripe_customer_id) {
      console.error('No Stripe customer found:', error)
      return res
        .status(404)
        .json({ error: 'No Stripe customer found for this user.' })
    }

    // ✅ Create Stripe billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${
        process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      }/profile`,
    })

    console.log(`🧾 Portal session created for user ${userId}`)
    res.status(200).json({ url: portalSession.url })
  } catch (err) {
    console.error('❌ Portal session error:', err)
    res.status(500).json({ error: err.message })
  }
}
