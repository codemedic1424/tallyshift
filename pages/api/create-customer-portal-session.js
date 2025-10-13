// pages/api/create-customer-portal-session.js
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    // Fetch customer by metadata or create one
    const customers = await stripe.customers.list({ limit: 100, email: userId })
    let customer = customers.data.find((c) => c.metadata?.userId === userId)

    // If no customer found, create one
    if (!customer) {
      customer = await stripe.customers.create({
        metadata: { userId },
      })
    }

    // Create a customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://tallyshift.com',
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe customer portal error:', err)
    res.status(500).json({ error: err.message })
  }
}
