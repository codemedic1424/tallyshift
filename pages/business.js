// pages/business.js
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import HeaderBar from '../ui/HeaderBar'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useUser } from '../lib/useUser'
import { createPortal } from 'react-dom'

export default function Business() {
  const [open, setOpen] = useState(false)

  return (
    <div className="biz">
      <Head>
        <title>TallyShift Business — Team Insights & Manager Tools</title>
        <meta
          name="description"
          content="TallyShift Business brings team insights, scheduling awareness, and performance tools to restaurants and bars."
        />
      </Head>

      <HeaderBar title="Business" />

      {/* Top gradient strip */}
      <div className="biz-flourish" aria-hidden />

      <main className="biz-wrap">
        {/* HERO */}
        <section className="biz-hero card">
          <div className="hero-copy">
            <div className="hero-title">
              <h1 className="h1">TallyShift for Business</h1>
              <div className="beta-chip">Coming Soon</div>
            </div>

            <p className="lead">
              Team-wide visibility, shift performance, and smarter
              scheduling—built for restaurants and bars.
            </p>

            <div className="cta-row">
              <button
                type="button"
                className="btn btn-primary btn-block-sm"
                onClick={() => setOpen(true)}
              >
                Join Waitlist
              </button>
            </div>
          </div>

          {/* Simple inline illustration */}
          <div className="hero-art">
            <div className="glass">
              <div className="stat">
                <div className="stat-label">Yesterday</div>
                <div className="stat-value">$4,812</div>
                <div className="stat-sub">Dining Room · 7 servers</div>
              </div>
              <div className="row">
                <div className="chip">Best Section: Patio A</div>
                <div className="chip">Top Earner: Jordan</div>
              </div>
              <div className="bar">
                <div className="bar-fill" style={{ width: '72%' }} />
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="grid">
          <article className="card feat">
            <h3>Manager Dashboard</h3>
            <p className="note">
              A live snapshot of sales-adjacent metrics: effective hourly by
              section, shift pacing, and team performance across locations.
            </p>
            <ul className="list">
              <li>Daily/weekly rollups</li>
              <li>Section & tag breakdowns</li>
              <li>Staff leaderboard (opt-in)</li>
            </ul>
          </article>

          <article className="card feat">
            <h3>Live Contests</h3>
            <p className="note">
              Run in-house competitions—desserts sold, covers, upsells—and show
              a live leaderboard for on-shift staff.
            </p>
            <ul className="list">
              <li>Shift-bound join flow</li>
              <li>Location verification</li>
              <li>Optional Stripe rewards</li>
            </ul>
          </article>

          <article className="card feat">
            <h3>Calendar-Aware Scheduling</h3>
            <p className="note">
              Pull schedule feeds to prefill shift details and compare outcomes
              by schedule patterns and sections.
            </p>
            <ul className="list">
              <li>Schedule performance projections</li>
              <li>“Next Shift” prefill</li>
              <li>Attendance & overlap checks</li>
            </ul>
          </article>

          <article className="card feat">
            <h3>Multi-Location Support</h3>
            <p className="note">
              Roll up performance with filters by venue, section, job role, or
              tag—then save views for quick review.
            </p>
            <ul className="list">
              <li>Location + section filters</li>
              <li>Saved views & sharing</li>
              <li>Export to CSV</li>
            </ul>
          </article>

          <article className="card feat">
            <h3>Team Insights</h3>
            <p className="note">
              Identify who thrives in which sections and on which days. Use data
              to schedule smarter and boost tips.
            </p>
            <ul className="list">
              <li>Identify top performers</li>
              <li>Best day/time windows</li>
              <li>Tag/section efficacy</li>
            </ul>
          </article>

          <article className="card feat">
            <h3>POS & Payroll (Roadmap)</h3>
            <p className="note">
              Optional POS-adjacent integrations and clean exports for payroll
              reconciliation and compliance.
            </p>
            <ul className="list">
              <li>POS mapping (when available)</li>
              <li>Tip-out modeling</li>
              <li>Payroll exports</li>
            </ul>
          </article>
        </section>

        {/* CALLOUT */}
        <section className="card callout">
          <h3 className="h2">Want early access?</h3>
          <p className="note">
            Be the first to hear about TallyShift for Business. Join the
            waitlist and we’ll reach out.
          </p>
          <div className="cta-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setOpen(true)}
            >
              Join Waitlist
            </button>
          </div>
        </section>
      </main>

      {/* Modal */}
      <WaitlistModal open={open} onClose={() => setOpen(false)} />

      <style jsx>{`
        /* Buttons */
        :global(.biz .btn),
        :global(.biz .linkbtn) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
          font-weight: 700;
          font-size: 13px;
          line-height: 1;
          border-radius: 12px;
          padding: 10px 14px; /* slightly larger for better touch targets */
          border: 1px solid var(--border);
          background: #fff;
          transition:
            background 0.15s ease,
            border-color 0.15s ease,
            transform 0.05s ease;
          text-decoration: none;
          color: inherit;
        }
        :global(.biz .btn.btn-primary) {
          background: #2563eb;
          border-color: #1d4ed8;
          color: #fff;
        }
        :global(.biz .btn.btn-primary:hover) {
          background: #1d4ed8;
          border-color: #1e40af;
        }
        :global(.biz .btn.secondary),
        :global(.biz .linkbtn) {
          background: #fff;
          color: #1f2937;
          border-color: var(--border);
        }
        :global(.biz .btn.secondary:hover),
        :global(.biz .linkbtn:hover) {
          background: #f9fafb;
        }
        :global(.biz .btn:focus-visible),
        :global(.biz .linkbtn:focus-visible) {
          outline: 2px solid #93c5fd;
          outline-offset: 2px;
          border-radius: 12px;
        }
        :global(.biz .btn-block-sm) {
          width: 100%;
        }
        @media (min-width: 520px) {
          :global(.biz .btn-block-sm) {
            width: auto;
          }
        }

        /* Page chrome */
        .biz-flourish {
          height: 10px;
          background: linear-gradient(90deg, #2563eb, #22c55e);
          opacity: 0.14;
        }
        .biz-wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 20px; /* a bit more breathing room */
        }
        .card {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 18px;
          box-shadow: var(--shadow-soft);
        }

        /* Hero */
        .biz-hero {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          padding: 22px; /* more padding for roomy feel */
          margin-bottom: 16px;
        }
        @media (min-width: 900px) {
          .biz-hero {
            grid-template-columns: 1.1fr 1fr;
            padding: 26px;
          }
        }
        .hero-copy .h1 {
          font-size: 28px;
          margin: 0;
        }
        .hero-title {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 10px;
        }
        .beta-chip {
          background: linear-gradient(90deg, #2563eb, #22c55e);
          color: #fff;
          font-weight: 600;
          font-size: 12px;
          padding: 5px 10px;
          border-radius: 999px;
          display: inline-block;
          letter-spacing: 0.2px;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
        }
        .lead {
          color: #4b5563;
          margin: 0;
          font-size: 15px;
          line-height: 1.55;
        }
        .cta-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          width: 100%;
          margin-top: 14px;
        }
        @media (min-width: 520px) {
          .cta-row {
            display: inline-flex;
            gap: 10px;
            flex-wrap: wrap;
            width: auto;
          }
        }

        /* Hero art */
        .hero-art {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }
        .glass {
          width: 100%;
          max-width: 480px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 16px;
          padding: 16px;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.9),
            rgba(255, 255, 255, 0.6)
          );
          backdrop-filter: blur(8px);
        }
        .stat {
          display: grid;
          gap: 4px;
          margin-bottom: 12px;
        }
        .stat-label {
          color: #6b7280;
          font-size: 12px;
        }
        .stat-value {
          font-size: 26px;
          font-weight: 800;
        }
        .stat-sub {
          color: #6b7280;
          font-size: 12px;
        }
        .row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .chip {
          font-size: 12px;
          border-radius: 999px;
          padding: 4px 8px;
          background: #fff;
          border: 1px solid var(--border);
        }
        .bar {
          height: 10px;
          background: #f3f4f6;
          border: 1px solid var(--border);
          border-radius: 999px;
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #2563eb, #22c55e);
        }

        /* Feature grid */
        .grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 860px) {
          .grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .feat {
          padding: 16px;
        }
        .feat h3 {
          margin: 0 0 6px;
        }
        .list {
          margin: 8px 0 0;
          padding-left: 18px;
          color: #4b5563;
          font-size: 14px;
        }

        /* Callout */
        .callout {
          padding: 18px;
          margin-top: 16px;
          display: grid;
          gap: 8px;
        }
        .h2 {
          font-size: 18px;
          margin: 0 0 2px;
        }
      `}</style>
    </div>
  )
}

/* ---------------- Waitlist Modal ---------------- */

function WaitlistModal({ open, onClose }) {
  const { user } = useUser()
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    restaurant_name: '',
    role: '',
    employees: '',
    phone: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const onlyDigits = (s = '') => s.replace(/\D/g, '')
  const formatPhone = (s = '') => {
    const d = onlyDigits(s).slice(0, 10)
    const a = d.slice(0, 3)
    const b = d.slice(3, 6)
    const c = d.slice(6, 10)
    if (d.length <= 3) return a
    if (d.length <= 6) return `(${a}) ${b}`
    return `(${a}) ${b}-${c}`
  }
  // Prefill + body scroll lock (match your other modals)
  useEffect(() => {
    if (open) {
      if (user?.email) {
        setForm((f) => ({ ...f, email: f.email || user.email }))
      }
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }
    return () => document.body.classList.remove('modal-open')
  }, [open, user])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const basicEmailOk = (e) =>
    typeof e === 'string' && e.includes('@') && e.indexOf('@') > 0

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!basicEmailOk(form.email)) {
      setError('Please enter a valid email.')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        email: String(form.email || '').trim(),
        full_name: form.full_name?.trim() || null,
        restaurant_name: form.restaurant_name?.trim() || null,
        role: form.role?.trim() || null,
        employees: form.employees ? parseInt(form.employees, 10) : null,
        phone: form.phone || null,
        notes: form.notes?.trim() || null,
        source: 'site',
        status: 'pending',
        user_id: user?.id || null,
      }

      const { error: dbErr } = await supabase
        .from('business_waitlist')
        .insert([payload])

      if (dbErr) throw dbErr
      setSubmitted(true)
    } catch (err) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  function closeAndReset() {
    setSubmitted(false)
    setError('')
    setForm({
      email: user?.email || '',
      full_name: '',
      restaurant_name: '',
      role: '',
      employees: '',
      phone: '',
      notes: '',
    })
    onClose?.()
  }

  if (!open) return null

  // Render outside .biz so we bring our own minimal styles (like your other modals)
  return createPortal(
    <div className="modal-backdrop" onClick={closeAndReset}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="waitlist-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="modal-head">
          <h2 id="waitlist-title" className="modal-title">
            Join the Business Waitlist
          </h2>
          <button
            className="close-btn"
            onClick={closeAndReset}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {/* Body */}
        <div className="modal-body">
          {!submitted ? (
            <>
              <p className="modal-sub">
                We’ll reach out when the private beta opens.
              </p>

              <form onSubmit={handleSubmit} className="form">
                <div className="grid-2">
                  <label className="field">
                    <span className="field-label">Email *</span>
                    <input
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@restaurant.com"
                      className="input"
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Full name *</span>
                    <input
                      name="full_name"
                      required
                      value={form.full_name}
                      onChange={handleChange}
                      placeholder="Jordan Smith"
                      className="input"
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Restaurant name *</span>
                    <input
                      name="restaurant_name"
                      required
                      value={form.restaurant_name}
                      onChange={handleChange}
                      placeholder="Patio House"
                      className="input"
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Role *</span>
                    <input
                      name="role"
                      required
                      value={form.role}
                      onChange={handleChange}
                      placeholder="GM, Owner, FOH Manager…"
                      className="input"
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Employees (approx.)</span>
                    <input
                      name="employees"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={form.employees}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          employees: onlyDigits(e.target.value),
                        }))
                      }
                      placeholder="e.g., 25"
                      className="input"
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Phone</span>
                    <input
                      name="phone"
                      inputMode="tel"
                      // show formatted value in the UI
                      value={formatPhone(form.phone)}
                      // store only digits in state
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          phone: onlyDigits(e.target.value).slice(0, 10),
                        }))
                      }
                      placeholder="(###) ###-####"
                      className="input"
                      maxLength={14} // (###) ###-#### length
                    />
                  </label>

                  <label className="field field-full">
                    <span className="field-label">Notes</span>
                    <textarea
                      name="notes"
                      rows={3}
                      value={form.notes}
                      onChange={handleChange}
                      placeholder="What are you hoping to get from TallyShift?"
                      className="input"
                    />
                  </label>
                </div>

                {error && (
                  <div className="error" role="alert">
                    {error}
                  </div>
                )}
              </form>
            </>
          ) : (
            <>
              <p className="modal-success">You’re on the list 🎉</p>
              <p className="modal-sub">
                Thanks! We’ll be in touch as we open the beta.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="modal-actions">
          {!submitted ? (
            <>
              <button
                type="button"
                className="btn secondary"
                onClick={closeAndReset}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Join Waitlist'}
              </button>
            </>
          ) : (
            <button className="btn primary" onClick={closeAndReset}>
              Done
            </button>
          )}
        </footer>

        <style jsx>{`
          /* Backdrop + container (matches your other modal feel) */
          .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 16px;
          }
          .modal-card {
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
            width: min(560px, 92vw);
            max-height: 85vh; /* your preferred modal max height */
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid var(--border, #e5e7eb);
            color: #1f2937;
          }

          /* Header */
          .modal-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid #eee;
            flex-shrink: 0;
          }
          .modal-title {
            font-size: 18px;
            font-weight: 800;
            margin: 0;
            line-height: 1.3;
          }
          .close-btn {
            background: transparent;
            font-size: 26px;
            line-height: 1;
            border: none;
            cursor: pointer;
            color: #6b7280;
          }

          /* Body */
          .modal-body {
            flex: 1;
            padding: 16px 20px;
            overflow-y: auto;
            display: grid;
            gap: 12px;
          }
          .modal-sub {
            margin: 0 0 8px;
            color: #4b5563;
            line-height: 1.55;
            font-size: 14px;
          }
          .modal-success {
            font-size: 20px;
            font-weight: 800;
            margin: 4px 0 0;
            background: linear-gradient(90deg, #2563eb, #22c55e);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          /* Form */
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
          }
          @media (min-width: 640px) {
            .grid-2 {
              grid-template-columns: 1fr 1fr;
            }
            .field-full {
              grid-column: 1 / -1;
            }
          }
          .field {
            display: grid;
            gap: 6px;
          }
          .field-label {
            font-size: 12px;
            color: #6b7280;
          }
          .input {
            width: 100%;
            border: 1px solid var(--border, #e5e7eb);
            border-radius: 12px;
            padding: 11px 12px;
            background: #fff;
            font-size: 14px;
            line-height: 1.3;
          }
          textarea.input {
            resize: vertical;
          }

          .error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
            border-radius: 12px;
            padding: 8px 10px;
            font-size: 13px;
          }

          /* Footer */
          .modal-actions {
            position: sticky;
            bottom: 0;
            background: #fff;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            padding: 14px 20px;
            border-top: 1px solid #eee;
            flex-shrink: 0;
          }

          /* Local button styles (since we portal outside .biz) */
          .btn {
            border-radius: 12px;
            padding: 10px 14px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            border: 1px solid var(--border, #e5e7eb);
            background: #fff;
          }
          .btn.primary {
            background: #2563eb;
            border-color: #1d4ed8;
            color: #fff;
          }
          .btn.primary:hover {
            background: #1d4ed8;
          }
          .btn.secondary {
            background: #f3f4f6;
          }

          /* Body lock (match your other modals) */
          :global(body.modal-open) {
            overflow: hidden !important;
            touch-action: none;
          }
        `}</style>
      </div>
    </div>,
    document.body,
  )
}
