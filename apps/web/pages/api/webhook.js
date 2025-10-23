// pages/api/webhook.js
import { buffer } from 'micro'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: false, // Stripe needs the raw body
  },
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// ⚡️ Replace these with your actual live price IDs
const FOUNDER_PRICE_ID = 'price_1SHoZqQaqUr5y4XCDPBf5kIR'
const PRO_MONTHLY_PRICE_ID = 'price_1SHoYhQaqUr5y4XCeCPStF1G'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  const sig = req.headers['stripe-signature']
  const buf = await buffer(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.userId
        if (!userId) throw new Error('Missing userId in metadata.')

        // Get the price ID from the session (line_items may not be expanded by default)
        let priceId
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription)
          priceId = sub.items.data[0].price.id
        } else if (session.mode === 'payment' && session.line_items == null) {
          // Need to retrieve the line items manually for one-time payments
          const lineItems = await stripe.checkout.sessions.listLineItems(
            session.id,
          )
          priceId = lineItems.data[0].price.id
        }

        let planTier = 'free'
        if (priceId === FOUNDER_PRICE_ID) planTier = 'founder'
        else if (priceId === PRO_MONTHLY_PRICE_ID) planTier = 'pro'

        const { error } = await supabase
          .from('profiles')
          .update({
            plan_tier: planTier,
            subscription_status: 'active',
          })
          .eq('id', userId)

        if (error) throw error
        console.log(`✅ Upgraded user ${userId} to ${planTier}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const userId = invoice.metadata?.userId
        if (userId) {
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'payment_failed',
            })
            .eq('id', userId)
          console.log(`⚠️ Payment failed for user ${userId}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const userId = sub.metadata?.userId
        if (userId) {
          await supabase
            .from('profiles')
            .update({
              plan_tier: 'free',
              subscription_status: 'canceled',
            })
            .eq('id', userId)
          console.log(`❌ Subscription canceled for user ${userId}`)
        }
        break
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    res.status(500).send('Webhook handler failed')
  }
}
