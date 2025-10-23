import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

export default function ProfileCompletionModal({ userId, onComplete }) {
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [stage, setStage] = useState('form') // 'form' | 'welcome'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!first.trim() || !last.trim()) return
    setSaving(true)
    setError('')

    try {
      const { error: upErr } = await supabase.from('profiles').upsert({
        id: userId,
        first_name: first.trim(),
        last_name: last.trim(),
        first_time_complete: true,
      })
      if (upErr) throw upErr
      setStage('welcome')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="modal-card"
          style={{ width: 'min(420px, 90vw)', padding: 24 }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => e.stopPropagation()}
        >
          {stage === 'form' && (
            <motion.div
              key="form"
              className="modal-body"
              style={{
                display: 'grid',
                gap: 20,
                textAlign: 'center',
                padding: '8px 0 4px',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              {/* Heading */}
              <div style={{ display: 'grid', gap: 6 }}>
                <h2
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: '#111827',
                    lineHeight: 1.3,
                  }}
                >
                  Let’s get started
                </h2>
                <p
                  style={{
                    fontSize: 15,
                    color: '#4b5563',
                    lineHeight: 1.5,
                    maxWidth: 300,
                    margin: '0 auto',
                  }}
                >
                  Before we dive in, what’s your name?
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                style={{ display: 'grid', gap: 14, justifyItems: 'center' }}
              >
                <div className="two grid" style={{ gap: 10, width: '100%' }}>
                  <input
                    className="input"
                    placeholder="First name"
                    value={first}
                    onChange={(e) => setFirst(e.target.value)}
                    required
                  />
                  <input
                    className="input"
                    placeholder="Last name"
                    value={last}
                    onChange={(e) => setLast(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div
                    style={{
                      color: '#ef4444',
                      fontSize: 13,
                      marginTop: -4,
                      lineHeight: 1.4,
                    }}
                  >
                    {error}
                  </div>
                )}

                <motion.button
                  className="btn btn-primary"
                  type="submit"
                  disabled={saving}
                  style={{
                    marginTop: 4,
                    padding: '10px 20px',
                    borderRadius: 10,
                  }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </motion.button>
              </form>
            </motion.div>
          )}

          {stage === 'welcome' && (
            <motion.div
              key="welcome"
              className="modal-body"
              style={{
                display: 'grid',
                gap: 14,
                textAlign: 'center',
                padding: '8px 0',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="h1" style={{ fontSize: 22, fontWeight: 700 }}>
                Welcome to{' '}
                <span
                  style={{
                    background: 'linear-gradient(90deg, #2563eb, #22c55e)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  TallyShift
                </span>
                , {first.trim()}!
              </div>
              <div className="note" style={{ fontSize: 15 }}>
                Get ready to keep tabs on your tips.
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 4 }}
                onClick={onComplete}
              >
                Get Started →
              </button>
            </motion.div>
          )}
        </motion.div>

        <style jsx>{`
          .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
          }
          .modal-card {
            background: #fff;
            border-radius: 20px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
            color: #1f2937;
          }
          .input {
            border: 1px solid #d1d5db;
            border-radius: 10px;
            padding: 10px 12px;
            font-size: 15px;
            background: #f9fafb;
            width: 100%;
          }
          .input:focus {
            outline: none;
            background: #fff;
            border-color: #2563eb;
          }
          .btn {
            font-weight: 600;
            border-radius: 10px;
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  )
}
