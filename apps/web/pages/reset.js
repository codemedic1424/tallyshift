// pages/reset.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabaseReset as supabase } from '../lib/supabase_reset' // IMPORTANT: reset-only client
import HeaderBar from '../ui/HeaderBar'
// (Tip: remove TabBar on auth pages for fewer moving parts)

export default function Reset() {
  const router = useRouter()

  // UI state
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [msg, setMsg] = useState(null)

  // form state
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showPw2, setShowPw2] = useState(false)

  // Password rules
  const pwLenOK = password.length >= 8
  const pwUpperOK = /[A-Z]/.test(password)
  const pwNumSymOK = /[0-9]|[^A-Za-z0-9]/.test(password)
  const pwValid = pwLenOK && pwUpperOK && pwNumSymOK
  const matchOK = password === confirm

  // 1) ONLY this page processes the reset tokens (detectSessionInUrl: true on supabase_reset)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      // This parses the recovery token in the URL and creates a TEMP session for THIS TAB ONLY.
      await supabase.auth.getSession()
      if (mounted) setReady(true)
    })()
    return () => {
      mounted = false
    }
  }, [])

  // 2) NO redirects here. User decides what to click after success.
  async function onSubmit(e) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    if (!pwValid) return setErr('Password doesn’t meet the requirements.')
    if (!matchOK) return setErr('Passwords do not match.')

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      setErr(error.message)
      return
    }

    // Immediately sign out this tab so it won’t redirect anywhere implicitly
    await supabase.auth.signOut()
    setDone(true)
    setMsg('Password updated successfully.')
  }

  return (
    <div className="page">
      <HeaderBar />
      <div className="container">
        <div className="auth-card">
          <div className="auth-head">
            <div className="h1">Set a new password</div>
            <div className="note">
              Choose a strong password you’ll remember.
            </div>
          </div>

          {!ready && (
            <div className="auth-form">
              <div className="note">Preparing…</div>
            </div>
          )}

          {ready && !done && (
            <form className="auth-form" onSubmit={onSubmit} noValidate>
              <label className="field">
                <span className="field-label">New password</span>
                <div className="field-with-icon">
                  <input
                    className={`field-input ${password && !pwValid ? 'field-error' : ''}`}
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Create a password"
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
              </label>

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

              <button
                className="btn auth-submit"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Update password'}
              </button>
            </form>
          )}

          {ready && done && (
            <div className="auth-form">
              {msg && <div className="auth-alert ok">{msg}</div>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn"
                  onClick={() => router.push('/login?reset=1')}
                >
                  Return to login
                </button>
                <button
                  className="btn secondary"
                  onClick={() => router.push('/calendar')}
                >
                  Open app
                </button>
              </div>
            </div>
          )}

          {err && <div className="auth-alert error">Error: {err}</div>}
        </div>
      </div>
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
