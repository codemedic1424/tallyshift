// pages/api/stripe-webhook.js
import Stripe from 'stripe'
import { supabase } from '../../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // ✅ handle completed checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata?.userId
    const priceId =
      session.line_items?.[0]?.price?.id || session.metadata?.priceId

    const FOUNDER_PRICE_ID = 'price_1SHoZqQaqUr5y4XCDPBf5kIR'
    const MONTHLY_PRICE_ID = 'price_1SHoYhQaqUr5y4XCeCPStF1G'

    let newTier = 'free'
    if (priceId === FOUNDER_PRICE_ID) newTier = 'founder'
    else if (priceId === MONTHLY_PRICE_ID) newTier = 'pro'

    if (userId && newTier !== 'free') {
      await supabase
        .from('profiles')
        .update({ plan_tier: newTier })
        .eq('id', userId)
    }
  }

  res.status(200).json({ received: true })
}

// Disable body parsing so Stripe can verify the signature
export const config = {
  api: {
    bodyParser: false,
  },
}
