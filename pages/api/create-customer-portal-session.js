import Stripe from 'stripe'
import { supabase } from '../../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    // Look up the Stripe customer ID linked to this Supabase user
    const { data, error } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (error || !data?.stripe_customer_id) {
      return res
        .status(404)
        .json({ error: 'No Stripe customer found for user' })
    }

    // Create a billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/profile`,
    })

    res.status(200).json({ url: portalSession.url })
  } catch (err) {
    console.error('Portal session error:', err)
    res.status(500).json({ error: err.message })
  }
}
