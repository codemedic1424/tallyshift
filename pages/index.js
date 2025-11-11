// pages/index.js
import Head from 'next/head'
import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useUser } from '../lib/useUser'

function BrandMark({ height = 40 }) {
  return (
    <img
      src="/TallyShiftLogo.svg"
      alt="TallyShift"
      style={{ height, width: 'auto', display: 'block' }}
      decoding="async"
      loading="eager"
    />
  )
}

export default function Landing() {
  const { user } = useUser()
  const router = useRouter()

  // Skip marketing if logged in
  useEffect(() => {
    if (user) router.replace('/dashboard')
  }, [user])

  return (
    <>
      <Head>
        <title>TallyShift — Track Shifts. Know Your Worth.</title>
        <meta
          name="description"
          content="TallyShift helps servers and bartenders track shifts, tips, and performance—fast."
        />
        <link rel="preload" href="/landing/hero-ui.png" as="image" />
      </Head>

      <div className="landing">
        {/* Top Nav */}
        <header className="land-nav">
          <div className="land-nav-inner">
            <Link href="/" className="brand-link" aria-label="TallyShift Home">
              <BrandMark height={36} />
            </Link>

            {/* Desktop actions */}
            <nav className="nav-actions">
              <Link href="/business" className="linkbtn hide-sm">
                For Business
              </Link>
              <Link href="/login" className="linkbtn">
                Sign in
              </Link>
            </nav>
          </div>
        </header>

        {/* HERO */}
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-copy">
              <h1 className="hero-title">
                Track shifts. Understand your earnings.
                <br className="hidden-sm" />
                <span className="grad">Win more nights.</span>
              </h1>

              <p className="hero-sub">
                Built for the service industry. Log tips in seconds, connect
                your schedule, and see the numbers that actually matter—
                effective hourly, best days, and more.
              </p>

              <div className="hero-cta">
                <Link
                  href="/login?mode=signup"
                  className="btn btn-primary btn-lg btn-block-sm"
                >
                  Get started free
                </Link>
                <Link
                  href="/login"
                  className="btn secondary btn-lg btn-block-sm"
                >
                  I already have an account
                </Link>
              </div>

              <ul className="hero-points">
                <li>⚡ Fast add-a-shift</li>
                <li>📅 Calendar sync & “Next Shift” prefill</li>
                <li>📈 Real insights—hourly rate, tags, sections</li>
              </ul>
            </div>

            <div className="hero-art">
              <div className="device">
                <img
                  src="/landing/hero-ui.png"
                  alt="TallyShift home and insights"
                  className="device-main"
                  loading="lazy"
                  decoding="async"
                />
                <img
                  src="/landing/insights-card.png"
                  alt=""
                  className="float-card fc1"
                  loading="lazy"
                  decoding="async"
                />
                <img
                  src="/landing/addshift-card.png"
                  alt=""
                  className="float-card fc2"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section className="strip">
          <div className="strip-inner">
            <div className="quote">
              “I finally know what my real hourly is and which nights are worth
              picking up.” <span>— Cory W</span>
            </div>
            <div className="badges">
              <span className="badge">iPhone PWA ready</span>
              <span className="badge">Built for speed</span>
              <span className="badge">Privacy first</span>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="features">
          <div className="container">
            <div className="features-grid">
              <article className="card feat">
                <img
                  src="/landing/feature-fast.png"
                  alt=""
                  className="feat-img"
                  loading="lazy"
                  decoding="async"
                />
                <h3>Log shifts in seconds</h3>
                <p>
                  One screen, everything you need—cash & card tips, tip-out,
                  hours, notes, tags.
                </p>
              </article>

              <article className="card feat">
                <img
                  src="/landing/feature-calendar.png"
                  alt=""
                  className="feat-img"
                  loading="lazy"
                  decoding="async"
                />
                <h3>Calendar aware</h3>
                <p>
                  Connect a calendar URL and prefill your next shift’s date and
                  hours automatically.
                </p>
              </article>

              <article className="card feat">
                <img
                  src="/landing/feature-insights.png"
                  alt=""
                  className="feat-img"
                  loading="lazy"
                  decoding="async"
                />
                <h3>Real insights</h3>
                <p>
                  See your effective hourly, best days, and tags/sections that
                  perform for you.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* SHOWCASE SPLIT */}
        <section className="showcase">
          <div className="container">
            <div className="split">
              <div className="split-copy">
                <h2 className="h2">Make smarter shift choices</h2>
                <p className="lead">
                  With trend cards and quick comparisons, you’ll see patterns at
                  a glance—where to sit, when to work, and what actually moves
                  your number.
                </p>
                <div className="buttons">
                  <Link
                    href="/login?mode=signup"
                    className="btn btn-primary btn-block-sm"
                  >
                    Create account
                  </Link>
                  <Link href="/login" className="btn secondary btn-block-sm">
                    Sign in
                  </Link>
                </div>
              </div>
              <div className="split-art">
                <img
                  src="/landing/compare.png"
                  alt="Insights compare view"
                  className="split-img"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </section>

        {/* PRICING TEASER */}
        <section className="pricing">
          <div className="container">
            <div className="pricing-card">
              <div className="pricing-left">
                <div className="price">$0</div>
                <div className="note">Start free • Upgrade anytime</div>
              </div>
              <ul className="pricing-list">
                <li>Unlimited shift logging with notes</li>
                <li>Clean calendar layout</li>
                <li>Insights & performance trends</li>
              </ul>
              <div className="pricing-cta">
                <Link
                  href="/login?mode=signup"
                  className="btn btn-primary btn-block-sm"
                >
                  Start free
                </Link>
                <Link href="/login" className="btn secondary btn-block-sm">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="land-foot">
          <div className="container">
            <div className="foot-grid">
              <div className="foot-brand">
                <Link
                  href="/"
                  className="foot-brand-link"
                  aria-label="TallyShift Home"
                >
                  <BrandMark height={50} />
                </Link>
                <div className="note">
                  © {new Date().getFullYear()} Logan L Thompson
                </div>
              </div>
              <nav className="foot-links">
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
                <Link href="/business">For Business</Link>
              </nav>
            </div>
          </div>
        </footer>
      </div>

      {/* Scoped styles */}
      <style jsx>{`
        /* Mobile first */
        .landing {
          background: var(--bg);
          color: var(--text);
        }
        /* --- LINKS / BUTTONS (match SettingsPanel) --- */
        /* Limit to this page by scoping under .landing, but use :global so class names match */
        :global(.landing a) {
          text-decoration: none;
          color: inherit;
        }

        /* Base buttons + link buttons */
        :global(.landing .nav-actions a),
        :global(.landing .nav-actions .btn),
        :global(.landing .linkbtn),
        :global(.landing .btn) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
          font-weight: 700;
          font-size: 13px;
          line-height: 1;
          border-radius: 12px;
          padding: 8px 12px;
          border: 1px solid var(--border);
          background: #fff;
          transition:
            background 0.15s ease,
            border-color 0.15s ease,
            transform 0.05s ease;
        }

        /* Link-style button in the nav */
        :global(.landing .linkbtn) {
          color: #1f2937;
          background: #fff;
        }
        :global(.landing .linkbtn:hover) {
          background: #f9fafb;
        }

        /* Primary CTA */
        :global(.landing .btn.btn-primary) {
          background: #2563eb;
          border-color: #1d4ed8;
          color: #fff;
        }
        :global(.landing .btn.btn-primary:hover) {
          background: #1d4ed8;
          border-color: #1e40af;
        }

        /* Secondary (outlined) */
        :global(.landing .btn.secondary) {
          background: #fff;
          color: #1f2937;
          border-color: var(--border);
        }
        :global(.landing .btn.secondary:hover) {
          background: #f9fafb;
        }

        /* Full-width on small screens for hero/pricing CTAs */
        :global(.landing .btn-block-sm) {
          width: 100%;
        }
        @media (min-width: 520px) {
          :global(.landing .btn-block-sm) {
            width: auto;
          }
        }

        /* Kill stray underlines in header/footer (override any globals) */
        :global(.landing .land-nav a),
        :global(.landing .foot-links a) {
          text-decoration: none !important;
        }

        /* Focus ring */
        :global(.landing .linkbtn:focus-visible),
        :global(.landing .btn:focus-visible) {
          outline: 2px solid #93c5fd;
          outline-offset: 2px;
          border-radius: 12px;
        }

        /* Optional: focus ring to match your app vibe */
        .linkbtn:focus-visible,
        .btn:focus-visible {
          outline: 2px solid #93c5fd;
          outline-offset: 2px;
          border-radius: 12px;
        }

        /* Top Nav (mobile-first: stack + full-width buttons) */
        .land-nav {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: saturate(140%) blur(8px);
          border-bottom: 1px solid var(--border);
        }

        /* Mobile layout: logo on its own row, actions wrap as grid */
        .land-nav-inner {
          max-width: 1120px;
          margin: 0 auto;
          padding: 8px 12px;
          display: grid;
          grid-template-columns: 1fr;
          justify-items: center;
          gap: 8px;
          min-height: 56px;
        }

        .brand-link {
          line-height: 0;
        }
        .brand-link img {
          display: block;
          height: 32px;
          width: auto;
        }

        /* Full-width, no overflow on small screens */
        .nav-actions {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr; /* Sign in | Create account */
          gap: 8px;
        }
        .nav-actions .btn,
        .nav-actions .linkbtn {
          min-width: 0; /* allow shrinking */
          padding: 10px 12px;
        }
        .hide-sm {
          display: none;
        } /* hide “Business” on small */

        /* ≥640px: go back to compact row layout */
        @media (min-width: 640px) {
          .land-nav-inner {
            padding: 10px 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0;
          }
          .brand-link img {
            height: 36px;
          }
          .nav-actions {
            width: auto;
            display: inline-flex;
            gap: 8px;
          }
          .hide-sm {
            display: inline-flex;
          }
        }

        /* ≥900px: give a bit more breathing room */
        @media (min-width: 900px) {
          .brand-link img {
            height: 40px;
          }
        }

        /* Hero */
        .hero {
          background: linear-gradient(135deg, #2563eb 0%, #22c55e 100%);
          color: #fff;
        }
        .hero-inner {
          max-width: 1120px;
          margin: 0 auto;
          padding: 28px 16px;
          display: grid;
          grid-template-columns: 1fr; /* mobile: stack */
          gap: 18px;
          align-items: center;
        }
        @media (min-width: 900px) {
          .hero-inner {
            padding: 48px 16px;
            grid-template-columns: 1.1fr 1fr; /* desktop: split */
            gap: 28px;
          }
        }
        .hero-title {
          font-size: 30px;
          line-height: 1.15;
          margin: 0 0 8px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
        }
        @media (min-width: 640px) {
          .hero-title {
            font-size: 40px;
          }
        }
        .hidden-sm {
          display: none;
        }
        @media (min-width: 640px) {
          .hidden-sm {
            display: inline;
          }
        }
        .grad {
          background: linear-gradient(90deg, #fff 0%, #d1fae5 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .hero-sub {
          margin: 8px 0 14px;
          font-size: 15px;
          opacity: 0.95;
        }
        .hero-cta {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }
        @media (min-width: 520px) {
          .hero-cta {
            display: inline-flex;
            gap: 10px;
            flex-wrap: wrap;
          }
        }
        .btn-lg {
          padding: 12px 18px;
          border-radius: 14px;
          font-size: 15px;
        }
        .btn-block-sm {
          width: 100%;
        }
        @media (min-width: 520px) {
          .btn-block-sm {
            width: auto;
          }
        }
        .hero-points {
          margin: 12px 0 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 6px;
          opacity: 0.95;
        }

        /* Hero art */
        .hero-art {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .device {
          position: relative;
          width: 100%;
          max-width: 520px;
          aspect-ratio: 10/7;
          background: var(--card);
          border: 1px solid rgba(255, 255, 255, 0.45);
          border-radius: 18px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }
        .device-main {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .float-card {
          position: absolute;
          width: 44%;
          max-width: 260px;
          border-radius: 14px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.4);
        }
        .fc1 {
          right: -6%;
          top: 10%;
          transform: rotate(6deg);
        }
        .fc2 {
          left: -8%;
          bottom: 6%;
          transform: rotate(-5deg);
        }
        @media (max-width: 420px) {
          .float-card {
            display: none;
          } /* keep mobile clean */
        }

        /* Social proof strip */
        .strip {
          background: var(--card);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .strip-inner {
          max-width: 1120px;
          margin: 0 auto;
          padding: 12px 16px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          align-items: center;
        }
        @media (min-width: 760px) {
          .strip-inner {
            grid-template-columns: 1fr auto;
          }
        }
        .quote {
          font-weight: 700;
        }
        .quote span {
          display: inline-block;
          margin-left: 6px;
          font-weight: 600;
          color: var(--muted);
        }
        .badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* Features */
        .features {
          padding: 24px 0;
        }
        .container {
          max-width: 1040px;
          margin: 0 auto;
          padding: 20px 16px;
        }
        .features-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 760px) {
          .features-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .feat {
          text-align: left;
          padding: 16px;
        }
        .feat h3 {
          margin: 10px 0 6px;
        }
        .feat-img {
          width: 100%;
          border-radius: 12px;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-soft);
        }
        /* Showcase (split on desktop, single card on mobile) */
        .showcase {
          padding: 20px 0 32px;
        }

        .split {
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow-soft);
          padding: 18px;
        }

        /* Headline and text */
        .split-copy h2 {
          margin: 0 0 6px;
          font-size: 22px;
        }
        .split-copy .lead {
          font-size: 15px;
          color: var(--muted);
          margin: 8px 0 14px;
        }

        /* Image styling */
        .split-art {
          order: -1; /* image first on mobile */
          display: flex;
          justify-content: center;
        }
        .split-img {
          width: 100%;
          max-width: 480px;
          border-radius: 14px;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-soft);
          background: #fff;
        }

        /* Desktop split view */
        @media (min-width: 900px) {
          .split {
            display: grid;
            grid-template-columns: 1.05fr 1fr;
            gap: 32px;
            align-items: center;
            background: transparent;
            border: none;
            box-shadow: none;
            padding: 0;
          }
          .split-art {
            order: unset;
          }
          .split-img {
            max-width: 100%;
          }
        }

        .lead {
          font-size: 15px;
          color: var(--muted);
          margin: 8px 0 12px;
        }
        .buttons {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }
        @media (min-width: 520px) {
          .buttons {
            display: inline-flex;
            gap: 10px;
            flex-wrap: wrap;
          }
        }

        /* Pricing teaser */
        .pricing {
          padding: 6px 0 28px;
        }
        .pricing-card {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          align-items: center;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow-soft);
          padding: 16px;
        }
        @media (min-width: 760px) {
          .pricing-card {
            grid-template-columns: auto 1fr auto;
            gap: 18px;
          }
        }
        .price {
          font-size: 28px;
          font-weight: 900;
        }
        .pricing-list {
          margin: 0;
          padding-left: 18px;
          color: var(--muted);
        }
        .pricing-cta {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }
        @media (min-width: 520px) {
          .pricing-cta {
            display: inline-flex;
            gap: 10px;
          }
        }
        /* Footer */
        .land-foot {
          border-top: 1px solid var(--border);
          padding: 24px 0;
          background: #fff;
        }

        /* Grid becomes stacked and centered by default (mobile-first) */
        .foot-grid {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 12px;
        }

        /* Brand area */
        .foot-brand-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          line-height: 0;
        }
        .foot-brand-link img {
          height: 40px; /* smaller, tighter */
          width: auto;
          display: block;
          opacity: 0.95;
          transition: opacity 0.2s;
        }
        .foot-brand-link:hover img {
          opacity: 1;
        }

        /* Text note below logo */
        .note {
          font-size: 13px;
          color: var(--muted);
          margin-top: 4px;
        }

        /* Footer links */
        .foot-links {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .foot-links a {
          color: var(--muted);
          text-decoration: none;
          font-size: 13px;
        }
        .foot-links a:hover {
          text-decoration: underline;
        }

        /* On wider screens, gently spread things but keep the centered feel */
        @media (min-width: 760px) {
          .foot-grid {
            flex-direction: column;
            text-align: center;
            gap: 14px;
          }
          .foot-brand-link img {
            height: 44px;
          }
        }
      `}</style>
    </>
  )
}
