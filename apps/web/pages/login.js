// pages/login.js
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { useUser } from '../lib/useUser'
import HeaderBar from '../ui/HeaderBar'
import TabBar from '../ui/TabBar'

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
  // Add new state hooks near the top
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [emailOptIn, setEmailOptIn] = useState(false)

  // inside onSignUp()
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
      options: {
        data: { email_opt_in: emailOptIn }, // ✅ this saves the opt-in flag in user_metadata
      },
    })
    setLoading(false)

    if (error) setErr(error.message)
    else {
      // ✅ store email_opt_in in your profiles table
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

  useEffect(() => {
    if (user) router.replace('/')
  }, [user, router])

  // reset state when switching tabs + autofocus email
  useEffect(() => {
    setErr(null)
    setMsg(null)
    setPassword('')
    setConfirm('')
    setShowPw(false)
    setShowPw2(false)
    setTimeout(() => emailRef.current?.focus(), 0)
  }, [mode])

  // validators
  const emailOk = /^\S+@\S+\.\S+$/.test(email)

  const pwLenOK = password.length >= 8
  const pwUpperOK = /[A-Z]/.test(password)
  const pwNumSymOK = /[0-9]|[^A-Za-z0-9]/.test(password)
  const pwValid = pwLenOK && pwUpperOK && pwNumSymOK

  const matchOK = mode === 'signup' ? password === confirm : true

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
    else router.replace('/?onboard=1')
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

  return (
    <div className="page">
      <HeaderBar />
      <div className="container">
        <div className="auth-card">
          {/* Tabs */}
          <div className="auth-tabs" role="tablist" aria-label="Authentication">
            <button
              className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => setMode('signin')}
              role="tab"
              aria-selected={mode === 'signin'}
            >
              Sign in
            </button>
            <button
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => setMode('signup')}
              role="tab"
              aria-selected={mode === 'signup'}
            >
              Create account
            </button>
            <button
              className={`auth-tab ${mode === 'reset' ? 'active' : ''}`}
              onClick={() => setMode('reset')}
              role="tab"
              aria-selected={mode === 'reset'}
            >
              Reset
            </button>
          </div>

          {/* Heading */}
          <div className="auth-head">
            <div className="h1">
              {mode === 'signin' && 'Welcome back'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'reset' && 'Reset your password'}
            </div>
            <div className="note">
              {mode === 'signin' && 'Sign in with your email and password.'}
              {mode === 'signup' && 'Use a strong password you’ll remember.'}
              {mode === 'reset' && 'We’ll email you a reset link.'}
            </div>
          </div>

          {/* Form */}
          <form
            className="auth-form"
            onSubmit={
              mode === 'signin'
                ? onSignIn
                : mode === 'signup'
                  ? onSignUp
                  : onReset
            }
            noValidate
          >
            <label className="field">
              <span className="field-label">Email</span>
              <input
                ref={emailRef}
                className={`field-input ${email && !emailOk ? 'field-error' : ''}`}
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
                <div className="field-with-icon">
                  <input
                    className={`field-input ${password && mode === 'signup' && !pwValid ? 'field-error' : ''}`}
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
                    className="field-icon"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>

                {/* Live helper list for signup */}
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
                <div className="field-with-icon">
                  <input
                    className={`field-input ${confirm && !matchOK ? 'field-error' : ''}`}
                    type={showPw2 ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="field-icon"
                    onClick={() => setShowPw2((v) => !v)}
                    aria-label={showPw2 ? 'Hide password' : 'Show password'}
                  >
                    {showPw2 ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {confirm && !matchOK && (
                  <div className="field-hint">Passwords must match.</div>
                )}
              </label>
            )}

            {mode === 'signup' && (
              <>
                <label className="checkbox-line">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    required
                  />
                  <span>
                    I agree to the{' '}
                    <a href="/terms" target="_blank">
                      Terms and Conditions
                    </a>
                    .
                  </span>
                </label>

                <label className="checkbox-line">
                  <input
                    type="checkbox"
                    checked={emailOptIn}
                    onChange={(e) => setEmailOptIn(e.target.checked)}
                  />
                  <span>Keep me updated on new features and tips.</span>
                </label>
              </>
            )}

            <button
              className="btn auth-submit"
              type="submit"
              disabled={loading}
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

          {err && <div className="auth-alert error">Error: {err}</div>}
          {msg && <div className="auth-alert ok">{msg}</div>}

          {mode === 'signin' && (
            <div className="auth-foot note">
              <button className="linkbtn" onClick={() => setMode('signup')}>
                Need an account? Sign up
              </button>
              &nbsp;·&nbsp;
              <button className="linkbtn" onClick={() => setMode('reset')}>
                Forgot password?
              </button>
            </div>
          )}
          {mode !== 'signin' && (
            <div className="auth-foot note">
              <button className="linkbtn" onClick={() => setMode('signin')}>
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .checkbox-line {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          margin-top: 8px;
        }
        .checkbox-line a {
          color: #2563eb;
          text-decoration: none;
        }
      `}</style>
    </div>
  )
}

/* ---- tiny inline SVGs (no external deps) ---- */
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
