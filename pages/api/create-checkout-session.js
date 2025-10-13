// pages/api/create-checkout-session.js
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { priceId, userId, isLifetime } = req.body

    const session = await stripe.checkout.sessions.create({
      mode: isLifetime ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      automatic_tax: { enabled: false },
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel`,
      metadata: { userId, planType: isLifetime ? 'founder' : 'pro' },
      subscription_data: {
        metadata: { userId, planType: isLifetime ? 'founder' : 'pro' },
      },
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe Checkout Error:', err)
    res.status(500).json({ error: err.message })
  }
}
