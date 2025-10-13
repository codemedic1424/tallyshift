// pages/api/create-checkout-session.js
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  try {
    const { userId, priceId, isLifetime } = req.body
    if (!userId || !priceId)
      return res.status(400).json({ error: 'Missing required fields' })

    // Fetch current Stripe customer if one exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      // Search Stripe for existing customer by metadata (userId)
      const existing = await stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
      })

      if (existing.data.length > 0) {
        customerId = existing.data[0].id
      } else {
        // Create a new customer (no email assumption)
        const customer = await stripe.customers.create({
          metadata: { userId },
        })
        customerId = customer.id
      }

      // Store Stripe customer ID in Supabase
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
      if (updateErr) throw updateErr
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      mode: isLifetime ? 'payment' : 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId, planType: isLifetime ? 'founder' : 'pro' },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/profile`,
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('❌ Stripe Checkout Error:', err)
    res.status(500).json({ error: err.message })
  }
}
