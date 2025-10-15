// pages/profile.js
import { useEffect, useRef, useState } from 'react'
import { Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useUser } from '../lib/useUser'
import HeaderBar from '../ui/HeaderBar'
import TabBar from '../ui/TabBar'
import SettingsModal from '../ui/SettingsModal'
import UpgradeModal from '../ui/UpgradeModal'

export function UpgradeButton() {
  const { user } = useUser()

  const handleUpgrade = async () => {
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: 'price_1SHoYhQaqUr5y4XCeCPStF1G', // your real Pro price ID
        userId: user.id,
        isLifetime: false,
      }),
    })
    const data = await res.json()
    window.location.href = data.url
  }

  return (
    <button
      onClick={handleUpgrade}
      className="rounded-md bg-green-600 px-4 py-2 text-white"
    >
      Upgrade to Pro
    </button>
  )
}

export default function Profile() {
  const { user } = useUser()

  // pro features
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const [editingEmail, setEditingEmail] = useState(false)

  // persisted profile fields
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('') // signed URL for rendering
  const [avatarPath, setAvatarPath] = useState('') // STORAGE PATH (private)
  const [email, setEmail] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  // name edit buffer
  const [editingName, setEditingName] = useState(false)
  const [tmpFirst, setTmpFirst] = useState('')
  const [tmpLast, setTmpLast] = useState('')

  // avatar upload
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState('')
  const [pendingAvatar, setPendingAvatar] = useState(false)

  // messages
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  // password change (secure, re-auth)
  const [showPwForm, setShowPwForm] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState(null)
  const [pwErr, setPwErr] = useState(null)
  const [showCur, setShowCur] = useState(false)
  const [showP1, setShowP1] = useState(false)
  const [showP2, setShowP2] = useState(false)

  // live validation (same as reset page)
  const pwLenOK = p1.length >= 8
  const pwUpperOK = /[A-Z]/.test(p1)
  const pwNumSymOK = /[0-9]|[^A-Za-z0-9]/.test(p1)
  const matchOK = p2.length > 0 && p1 === p2
  const canSubmitPw =
    !!currentPw && pwLenOK && pwUpperOK && pwNumSymOK && matchOK && !pwSaving

  // delete account flow
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteStep, setDeleteStep] = useState(1) // 1: verify pw, 2: final confirm
  const [currentPwDel, setCurrentPwDel] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteErr, setDeleteErr] = useState(null)

  // plan tier
  const [planTier, setplanTier] = useState('free')
  // ---------- Load profile (includes avatar_path) ----------
  useEffect(() => {
    if (!user) return
    setEmail(user.email || '')
    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name,last_name,avatar_path,plan_tier,pro_override')
        .eq('id', user.id)
        .single()
      if (!error && data) {
        setFirst(data.first_name || '')
        setLast(data.last_name || '')
        setAvatarPath(data.avatar_path || '') // <- key: we store path, not URL
        setTmpFirst(data.first_name || '')
        setTmpLast(data.last_name || '')
        const tier =
          data.pro_override === true
            ? 'pro'
            : data.plan_tier === 'founder'
              ? 'founder'
              : data.plan_tier
        setplanTier(tier)
      }
    })()
  }, [user])

  // ---------- Helper: signed URL from private path ----------
  async function getSignedUrl(path) {
    if (!path) return ''
    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUrl(path, 60 * 60) // 1 hour
    return error ? '' : data?.signedUrl || ''
  }

  // ---------- Resolve signed URL whenever avatarPath changes ----------
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!avatarPath) {
        setAvatarUrl('')
        return
      }
      const url = await getSignedUrl(avatarPath)
      if (alive) setAvatarUrl(url)
    })()
    return () => {
      alive = false
    }
  }, [avatarPath])

  async function saveProfile(e) {
    e?.preventDefault()
    setErr(null)
    setMsg(null)
    setSaving(true)
    const nextFirst = editingName ? tmpFirst.trim() : first
    const nextLast = editingName ? tmpLast.trim() : last
    const payload = {
      id: user.id,
      first_name: nextFirst,
      last_name: nextLast,
      avatar_path: avatarPath || null, // <- store the private path
    }
    const { error } = await supabase.from('profiles').upsert(payload)
    setSaving(false)
    if (error) {
      setErr(error.message)
    } else {
      setFirst(nextFirst)
      setLast(nextLast)
      setEditingName(false)
      setPendingAvatar(false)
      setMsg('Profile updated.')
      // refresh signed URL after save (optional)
      if (avatarPath) {
        getSignedUrl(avatarPath).then(setAvatarUrl)
      }
    }
  }

  async function changeEmail(e) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    if (!/^\S+@\S+\.\S+$/.test(email))
      return setErr('Enter a valid email address.')
    const { error } = await supabase.auth.updateUser({ email })
    if (error) setErr(error.message)
    else
      setMsg('Email update requested. Please check the new inbox to confirm.')
  }

  async function changePassword(e) {
    e.preventDefault()
    setPwErr(null)
    setPwMsg(null)
    if (!canSubmitPw) return
    setPwSaving(true)
    try {
      // Re-auth with current password
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      })
      if (authErr) throw new Error('Current password incorrect.')
      // Update password
      const { error } = await supabase.auth.updateUser({ password: p1 })
      if (error) throw error
      setPwMsg('Password updated successfully.')
      setCurrentPw('')
      setP1('')
      setP2('')
      setShowPwForm(false)
    } catch (e2) {
      setPwErr(e2.message || 'Failed to update password.')
    } finally {
      setPwSaving(false)
    }
  }

  // ---------- Upload to private Storage; keep only PATH ----------
  async function onUploadAvatar(file) {
    if (!file || !user) return
    setErr(null)
    setMsg(null)
    setUploading(true)

    try {
      const objectUrl = URL.createObjectURL(file)
      setPreview(objectUrl)

      const maxBytes = 2 * 1024 * 1024 // 2 MB
      if (file.size > maxBytes) throw new Error('Image must be ≤ 2 MB.')
      if (!file.type.startsWith('image/'))
        throw new Error('File must be an image.')

      const safeName = file.name.replace(/\s+/g, '_')
      const path = `${user.id}/${Date.now()}-${safeName}`

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, {
          upsert: true,
          cacheControl: '3600',
          contentType: file.type || 'image/jpeg',
        })

      if (upErr) throw upErr

      // Save the path immediately so it's persistent
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_path: path })
        .eq('id', user.id)

      if (dbErr) throw dbErr

      setAvatarPath(path)
      setPendingAvatar(false)
      setMsg('Photo uploaded and saved successfully!')
    } catch (e) {
      console.error('Upload error:', e)
      setErr(e.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function logout() {
    setSettingsOpen(false)
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error.message)
    } else {
      window.location.href = '/login'
    }
  }

  // Delete account flow
  function startDeleteFlow() {
    setDeleteErr(null)
    setCurrentPwDel('')
    setDeleteStep(1)
    setDeleteOpen(true)
  }
  async function handleDeleteSubmit(e) {
    e?.preventDefault()
    setDeleteErr(null)
    if (deleteStep === 1) {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPwDel,
      })
      if (authErr) {
        setDeleteErr('Current password incorrect.')
        return
      }
      setDeleteStep(2)
      return
    }
    setDeleting(true)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      if (!token) throw new Error('No active session.')

      const r = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Delete failed.')

      await supabase.auth.signOut()
    } catch (e4) {
      setDeleteErr(e4.message)
      setDeleting(false)
    }
  }

  const initials = `${(first?.[0] || '').toUpperCase()}${(last?.[0] || '').toUpperCase()}`
  const showSave = editingName || pendingAvatar

  return (
    <div className="page">
      <HeaderBar title="Profile" />
      <div className="container" style={{ paddingBottom: 96 }}>
        <div
          className="card"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div className="h1">Profile</div>
            <div className="note">
              Manage your account, security, and photo.
            </div>
          </div>
          <button
            type="button"
            className="btn secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 12,
              fontSize: 13,
              alignSelf: 'flex-start',
            }}
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            <Settings size={18} strokeWidth={1.6} />
            <span>Settings</span>
          </button>
        </div>

        {/* Avatar + Name */}
        <div className="card profile-card">
          <div className="profile-card-head">
            <div className="h2">Your info</div>
            {Boolean(pendingAvatar) && (
              <span className="chip chip-warn">Unsaved photo</span>
            )}
          </div>

          <div className="profile-card-body">
            {/* Avatar block */}
            <div className="avatar-stack">
              <div
                className="avatar-wrap-lg avatar-clickable"
                onClick={() => fileRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ')
                    fileRef.current?.click()
                }}
              >
                {preview || avatarUrl ? (
                  <img
                    src={preview || avatarUrl}
                    alt="Avatar"
                    className="avatar-img"
                  />
                ) : (
                  <div className="avatar-fallback-lg">{initials || '👤'}</div>
                )}

                {/* ✅ Badge overlay for Pro or Founder */}
                {(planTier === 'pro' || planTier === 'founder') && (
                  <div
                    className={`badge-tier ${planTier}`}
                    title={
                      planTier === 'pro'
                        ? 'TallyShift Pro'
                        : 'TallyShift Founder'
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="crown-icon"
                    >
                      <path d="M5 16l-1-9 4 3 4-6 4 6 4-3-1 9H5zm0 2h14v2H5v-2z" />
                    </svg>
                    <span>{planTier === 'pro' ? 'Pro' : 'Founder'}</span>
                  </div>
                )}

                {/* Overlay for upload status */}
                <div className="avatar-overlay">
                  <span>{uploading ? 'Uploading…' : 'Change'}</span>
                </div>

                {/* File input */}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => onUploadAvatar(e.target.files?.[0])}
                />
              </div>

              {/* Remove photo button */}
              {(preview || avatarUrl) && (
                <button
                  type="button"
                  className="linkbtn"
                  onClick={async () => {
                    try {
                      setErr(null)
                      if (avatarPath) {
                        const { error: delErr } = await supabase.storage
                          .from('avatars')
                          .remove([avatarPath])
                        if (delErr) throw delErr
                      }
                      setPreview('')
                      setAvatarUrl('')
                      setAvatarPath('')
                      setPendingAvatar(true)
                    } catch (e) {
                      setErr(e.message || 'Failed to remove photo.')
                    }
                  }}
                >
                  Remove photo
                </button>
              )}
            </div>

            {/* Name block */}
            {!editingName ? (
              <div className="profile-name">
                <div className="h1" style={{ marginBottom: 4 }}>
                  {first || last ? `${first} ${last}` : '—'}
                </div>
                <div className="note">This is how your greeting appears.</div>
                <div className="profile-actions">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
                      setTmpFirst(first)
                      setTmpLast(last)
                      setEditingName(true)
                    }}
                  >
                    Edit name
                  </button>
                  {Boolean(pendingAvatar) && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={saveProfile}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : 'Save profile'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form className="profile-name-edit" onSubmit={saveProfile}>
                <div className="two grid">
                  <input
                    className="input"
                    placeholder="First name"
                    value={tmpFirst}
                    onChange={(e) => setTmpFirst(e.target.value)}
                    required
                  />
                  <input
                    className="input"
                    placeholder="Last name"
                    value={tmpLast}
                    onChange={(e) => setTmpLast(e.target.value)}
                    required
                  />
                </div>
                <div className="profile-actions">
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save profile'}
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
                      setEditingName(false)
                      setTmpFirst(first)
                      setTmpLast(last)
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="card">
          <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
            Email
          </div>

          {!editingEmail ? (
            <>
              <p className="note" style={{ marginBottom: 8 }}>
                {email}
              </p>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setEditingEmail(true)}
              >
                Update email
              </button>
            </>
          ) : (
            <form className="grid" onSubmit={changeEmail}>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" type="submit">
                  Send Confirmation
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setEditingEmail(false)}
                >
                  Cancel
                </button>
              </div>
              <div className="note">
                We’ll send a confirmation to the new address.
              </div>
            </form>
          )}
        </div>

        {/* Password */}
        <div className="card">
          <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
            Password
          </div>

          {!showPwForm ? (
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setShowPwForm(true)
                setPwErr(null)
                setPwMsg(null)
                setCurrentPw('')
                setP1('')
                setP2('')
              }}
            >
              Change password
            </button>
          ) : (
            <form className="grid" onSubmit={changePassword} noValidate>
              {/* Current */}
              <label className="field">
                <span className="field-label">Current password</span>
                <div className="field-with-icon">
                  <input
                    className="field-input"
                    type={showCur ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="field-icon"
                    onClick={() => setShowCur((v) => !v)}
                    aria-label={showCur ? 'Hide password' : 'Show password'}
                  >
                    {showCur ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </label>

              {/* New */}
              <label className="field">
                <span className="field-label">New password</span>
                <div className="field-with-icon">
                  <input
                    className={`field-input ${p1 && !(pwLenOK && pwUpperOK && pwNumSymOK) ? 'field-error' : ''}`}
                    type={showP1 ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={p1}
                    onChange={(e) => setP1(e.target.value)}
                    required
                    aria-describedby="pw-help"
                  />
                  <button
                    type="button"
                    className="field-icon"
                    onClick={() => setShowP1((v) => !v)}
                    aria-label={showP1 ? 'Hide password' : 'Show password'}
                  >
                    {showP1 ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <ul id="pw-help" className="pw-help" aria-live="polite">
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

              {/* Confirm */}
              <label className="field">
                <span className="field-label">Confirm password</span>
                <div className="field-with-icon">
                  <input
                    className={`field-input ${p2 && !matchOK ? 'field-error' : ''}`}
                    type={showP2 ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={p2}
                    onChange={(e) => setP2(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="field-icon"
                    onClick={() => setShowP2((v) => !v)}
                    aria-label={showP2 ? 'Hide password' : 'Show password'}
                  >
                    {showP2 ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {p2 && !matchOK && (
                  <div className="field-hint">Passwords must match.</div>
                )}
              </label>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={!canSubmitPw}
                >
                  {pwSaving ? 'Saving…' : 'Update password'}
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    setShowPwForm(false)
                    setCurrentPw('')
                    setP1('')
                    setP2('')
                    setPwErr(null)
                    setPwMsg(null)
                  }}
                >
                  Cancel
                </button>
              </div>

              {pwErr && (
                <div
                  className="card"
                  style={{
                    marginTop: 8,
                    background: '#fee2e2',
                    borderColor: '#fecaca',
                  }}
                >
                  Error: {pwErr}
                </div>
              )}
              {pwMsg && (
                <div className="card" style={{ marginTop: 8 }}>
                  {pwMsg}
                </div>
              )}
            </form>
          )}
        </div>

        {(err || msg) && (
          <div
            className="card"
            style={{
              background: err ? '#fee2e2' : undefined,
              borderColor: err ? '#fecaca' : undefined,
            }}
          >
            {err ? `Error: ${err}` : msg}
          </div>
        )}
        {/* TallyShift Pro section */}
        <div className="card">
          <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
            TallyShift Pro
          </div>

          {planTier === 'pro' ||
          planTier === 'founder' ||
          user?.pro_override ? (
            <>
              <p className="note" style={{ marginBottom: 8 }}>
                You’re a{' '}
                <b>{planTier === 'founder' ? 'TallyShift Founder' : 'Pro'}</b>!
                Enjoy all premium features.
              </p>

              {/* Show Manage only for real Stripe subs (not founder, not override) */}
              {planTier === 'pro' && !user?.pro_override && (
                <button
                  onClick={async () => {
                    const res = await fetch(
                      '/api/create-customer-portal-session',
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id }),
                      },
                    )
                    const data = await res.json()
                    window.location.href = data.url
                  }}
                  className="btn secondary"
                >
                  Manage Subscription
                </button>
              )}
            </>
          ) : (
            <>
              <p className="note" style={{ marginBottom: 8 }}>
                Unlock advanced insights and premium features with TallyShift
                Pro.
              </p>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="btn btn-primary"
              >
                Upgrade Now
              </button>
            </>
          )}
        </div>

        {showUpgradeModal && (
          <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
        )}

        {/* Logout + Delete row — only the buttons are clickable */}
        <div
          className="card"
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'auto',
          }}
        >
          <button
            type="button"
            className="btn danger"
            style={{ background: '#ef4444' }}
            onClick={startDeleteFlow}
          >
            Delete account
          </button>
          <button type="button" className="btn danger" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      {/* Delete account modal */}
      {deleteOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {deleteStep === 1 ? (
              <>
                <div className="h1">Delete your account?</div>
                <div className="note" style={{ margin: '8px 0 12px' }}>
                  This is <b>permanent</b>. All profile and shift data will be
                  removed.
                </div>
                <form className="grid" onSubmit={handleDeleteSubmit}>
                  <input
                    className="input"
                    type="password"
                    placeholder="Enter current password to continue"
                    value={currentPwDel}
                    onChange={(e) => setCurrentPwDel(e.target.value)}
                    required
                  />
                  {deleteErr && (
                    <div
                      className="card"
                      style={{ background: '#fee2e2', borderColor: '#fecaca' }}
                    >
                      Error: {deleteErr}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      justifyContent: 'flex-end',
                    }}
                  >
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => setDeleteOpen(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn danger">
                      Continue
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="h1">Are you absolutely sure?</div>
                <div className="note" style={{ margin: '8px 0 12px' }}>
                  Click <b>Delete permanently</b> to remove your account and all
                  data.
                </div>
                {deleteErr && (
                  <div
                    className="card"
                    style={{ background: '#fee2e2', borderColor: '#fecaca' }}
                  >
                    Error: {deleteErr}
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'flex-end',
                  }}
                >
                  <button
                    className="btn secondary"
                    onClick={() => setDeleteOpen(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn danger"
                    onClick={handleDeleteSubmit}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Delete permanently'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {settingsOpen && (
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <TabBar />
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
