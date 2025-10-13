// pages/api/create-checkout-session.js
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { priceId, userId, isLifetime } = req.body
    const siteUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : 'https://tallyshift.com'

    const baseConfig = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/success`,
      cancel_url: `${siteUrl}/profile`,
      metadata: { userId },
    }

    // 👇 Conditional logic
    const session = await stripe.checkout.sessions.create(
      isLifetime
        ? {
            ...baseConfig,
            mode: 'payment', // one-time purchase
          }
        : {
            ...baseConfig,
            mode: 'subscription',
            subscription_data: {
              metadata: { userId },
            },
          },
    )

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe Checkout Error:', err)
    return res
      .status(err.statusCode || 500)
      .json({ error: err.message || 'Internal server error' })
  }
}
