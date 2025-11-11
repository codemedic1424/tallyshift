// pages/login.js
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { useUser } from '../lib/useUser'
import HeaderBar from '../ui/HeaderBar'

export default function Login() {
  const { user } = useUser()
  const router = useRouter()

  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showPw2, setShowPw2] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [msg, setMsg] = useState(null)

  const emailRef = useRef(null)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [emailOptIn, setEmailOptIn] = useState(false)

  const emailOk = /^\S+@\S+\.\S+$/.test(email)
  const pwLenOK = password.length >= 8
  const pwUpperOK = /[A-Z]/.test(password)
  const pwNumSymOK = /[0-9]|[^A-Za-z0-9]/.test(password)
  const pwValid = pwLenOK && pwUpperOK && pwNumSymOK
  const matchOK = mode === 'signup' ? password === confirm : true

  useEffect(() => {
    if (user) router.replace('/dashboard')
  }, [user, router])

  // Initialize tab from /login?mode=signup|signin|reset
  useEffect(() => {
    const m = String(router.query?.mode || '').toLowerCase()
    if (m === 'signup' || m === 'signin' || m === 'reset') {
      setMode(m)
    }
  }, [router.query?.mode, router])

  // reset states on tab switch + autofocus email
  useEffect(() => {
    setErr(null)
    setMsg(null)
    setPassword('')
    setConfirm('')
    setShowPw(false)
    setShowPw2(false)
    setTimeout(() => emailRef.current?.focus(), 0)
  }, [mode])

  // ✅ KEEP URL IN SYNC WITH THE SELECTED TAB
  function setModeAndUrl(next) {
    setMode(next)
    router.replace(
      { pathname: '/login', query: next === 'signin' ? {} : { mode: next } },
      undefined,
      { shallow: true },
    )
  }

  async function onSignIn(e) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    if (!emailOk || !password) {
      setErr('Please enter a valid email and password.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)
    if (error) setErr(error.message)
    else router.replace('/dashboard?onboard=1')
  }

  async function onSignUp(e) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    if (!emailOk) return setErr('Enter a valid email.')
    if (!pwValid) return setErr('Password doesn’t meet the requirements.')
    if (!matchOK) return setErr('Passwords do not match.')
    if (!agreeTerms)
      return setErr('You must agree to the Terms and Conditions to continue.')

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { email_opt_in: emailOptIn } },
    })
    setLoading(false)

    if (error) setErr(error.message)
    else {
      const userId = data?.user?.id
      if (userId) {
        await supabase
          .from('profiles')
          .update({ email_opt_in: emailOptIn })
          .eq('id', userId)
      }
      setMsg(
        'Account created! Check your email for the confirmation link to login.',
      )
    }
  }

  async function onReset(e) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    if (!emailOk) return setErr('Enter a valid email.')
    setLoading(true)
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/reset`
        : undefined
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })
    setLoading(false)
    if (error) setErr(error.message)
    else setMsg('Reset link sent. Check your email.')
  }

  const submitHandler =
    mode === 'signin' ? onSignIn : mode === 'signup' ? onSignUp : onReset

  const canSubmit = loading
    ? false
    : mode === 'signin'
      ? emailOk && !!password
      : mode === 'signup'
        ? emailOk && pwValid && matchOK && agreeTerms
        : /* reset */ emailOk

  return (
    <div className="page">
      <HeaderBar />

      <div className="auth-wrap">
        {/* top flourish */}
        <div className="auth-flourish" aria-hidden />

        <div className="auth-card">
          {/* segmented tabs */}
          <div className="seg" role="tablist" aria-label="Authentication">
            <button
              className={`seg-btn ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => setModeAndUrl('signin')}
              role="tab"
              aria-selected={mode === 'signin'}
            >
              Sign in
            </button>
            <button
              className={`seg-btn ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => setModeAndUrl('signup')}
              role="tab"
              aria-selected={mode === 'signup'}
            >
              Create account
            </button>
            <button
              className={`seg-btn ${mode === 'reset' ? 'active' : ''}`}
              onClick={() => setModeAndUrl('reset')}
              role="tab"
              aria-selected={mode === 'reset'}
            >
              Reset
            </button>
          </div>

          {/* header */}
          <div className="auth-head">
            <h1 className="title">
              {mode === 'signin' && 'Welcome back'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'reset' && 'Reset your password'}
            </h1>
            <p className="sub">
              {mode === 'signin' && 'Sign in with your email and password.'}
              {mode === 'signup' && 'Use a strong password you’ll remember.'}
              {mode === 'reset' && 'We’ll email you a reset link.'}
            </p>
          </div>

          {/* form */}
          <form className="auth-form" onSubmit={submitHandler} noValidate>
            <label className="field">
              <span className="field-label">Email</span>
              <input
                ref={emailRef}
                className={`input ${email && !emailOk ? 'field-error' : ''}`}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            {mode !== 'reset' && (
              <label className="field">
                <span className="field-label">Password</span>
                <div className="with-icon">
                  <input
                    className={`input ${password && mode === 'signup' && !pwValid ? 'field-error' : ''}`}
                    type={showPw ? 'text' : 'password'}
                    autoComplete={
                      mode === 'signin' ? 'current-password' : 'new-password'
                    }
                    placeholder={
                      mode === 'signin' ? 'Your password' : 'Create a password'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>

                {mode === 'signup' && (
                  <ul className="pw-help" aria-live="polite">
                    <li className={pwLenOK ? 'ok' : 'bad'}>
                      At least 8 characters
                    </li>
                    <li className={pwUpperOK ? 'ok' : 'bad'}>
                      Contains an uppercase letter
                    </li>
                    <li className={pwNumSymOK ? 'ok' : 'bad'}>
                      Contains a number or symbol
                    </li>
                  </ul>
                )}
              </label>
            )}

            {mode === 'signup' && (
              <label className="field">
                <span className="field-label">Confirm password</span>
                <div className="with-icon">
                  <input
                    className={`input ${confirm && !matchOK ? 'field-error' : ''}`}
                    type={showPw2 ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setShowPw2((v) => !v)}
                    aria-label={showPw2 ? 'Hide password' : 'Show password'}
                  >
                    {showPw2 ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {confirm && !matchOK && (
                  <div className="hint">Passwords must match.</div>
                )}
              </label>
            )}

            {mode === 'signup' && (
              <div className="checks">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    required
                  />
                  <span>
                    I agree to the{' '}
                    <a href="/terms" target="_blank" rel="noreferrer">
                      Terms and Conditions
                    </a>
                    .
                  </span>
                </label>

                <label className="check">
                  <input
                    type="checkbox"
                    checked={emailOptIn}
                    onChange={(e) => setEmailOptIn(e.target.checked)}
                  />
                  <span>Keep me updated on new features and tips.</span>
                </label>
              </div>
            )}

            <button
              className="btn btn-primary submit"
              type="submit"
              disabled={!canSubmit}
            >
              {loading
                ? 'Please wait…'
                : mode === 'signin'
                  ? 'Sign in'
                  : mode === 'signup'
                    ? 'Create account'
                    : 'Send reset link'}
            </button>
          </form>

          {err && <div className="alert error">Error: {err}</div>}
          {msg && <div className="alert ok"> {msg}</div>}

          {/* footer links under form */}
          {mode === 'signin' ? (
            <div className="foot note">
              <button
                className="linkbtn"
                onClick={() => setModeAndUrl('signup')}
              >
                Need an account? Sign up
              </button>
              <span className="sep">·</span>
              <button
                className="linkbtn"
                onClick={() => setModeAndUrl('reset')}
              >
                Forgot password?
              </button>
            </div>
          ) : (
            <div className="foot note">
              <button
                className="linkbtn"
                onClick={() => setModeAndUrl('signin')}
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Styles scoped to this page */}
      <style jsx>{`
        .auth-wrap {
          max-width: 520px;
          margin: 0 auto;
          padding: 18px 16px 40px;
        }
        .auth-flourish {
          height: 10px;
          width: 100%;
          border-radius: 12px;
          background: linear-gradient(90deg, #2563eb, #22c55e);
          margin: 6px auto 14px;
          opacity: 0.12;
        }
        .auth-card {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 18px;
          box-shadow: var(--shadow-soft);
          padding: 16px;
        }
        .seg {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          background: #f3f4f6;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 4px;
          gap: 4px;
        }
        .seg-btn {
          border: none;
          background: transparent;
          padding: 8px 10px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          color: #374151;
        }
        .seg-btn.active {
          background: #fff;
          border: 1px solid var(--border);
        }
        .auth-head {
          margin: 14px 0 10px;
          text-align: left;
        }
        .title {
          margin: 0 0 4px;
          font-size: 20px;
          font-weight: 800;
          color: #111827;
        }
        .sub {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }
        .auth-form {
          display: grid;
          gap: 10px;
          margin-top: 10px;
        }
        .field {
          display: grid;
          gap: 6px;
        }
        .field-label {
          font-weight: 700;
          font-size: 13px;
          color: #111827;
        }
        .input {
          width: 100%;
          height: 38px;
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: #fff;
          color: var(--ink);
          font-size: 14px;
        }
        .field-error {
          border-color: #fca5a5 !important;
          background: #fff7f7;
        }
        .with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }
        .icon-btn {
          position: absolute;
          right: 8px;
          border: none;
          background: transparent;
          padding: 4px;
          cursor: pointer;
          line-height: 0;
          color: #6b7280;
        }
        .pw-help {
          display: grid;
          gap: 2px;
          margin: 6px 0 0;
          padding-left: 16px;
          font-size: 12px;
        }
        .pw-help .ok {
          color: #059669;
        }
        .pw-help .bad {
          color: #b91c1c;
        }
        .hint {
          font-size: 12px;
          color: #b91c1c;
          margin-top: 4px;
        }
        .checks {
          display: grid;
          gap: 8px;
          margin-top: 2px;
        }
        .check {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .check a {
          color: #2563eb;
          text-decoration: none;
        }
        .submit {
          width: 100%;
          margin-top: 6px;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 15px;
        }
        .alert {
          margin-top: 10px;
          border-radius: 12px;
          padding: 10px 12px;
          border: 1px solid var(--border);
        }
        .alert.error {
          background: #fee2e2;
          border-color: #fecaca;
          color: #7f1d1d;
        }
        .alert.ok {
          background: #ecfdf5;
          border-color: #a7f3d0;
          color: #065f46;
        }
        .foot {
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .foot .sep {
          color: var(--muted);
        }
      `}</style>
    </div>
  )
}

/* inline icons */
function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M2 12s3.5-7 10-7a9.5 9.5 0 0 1 6 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M22 12s-3.5 7-10 7a9.5 9.5 0 0 1-6-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  )
}
