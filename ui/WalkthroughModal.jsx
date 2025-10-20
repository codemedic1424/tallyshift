import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import Router, { useRouter } from 'next/router'

const steps = [
  {
    title: 'Welcome!',
    text: 'TallyShift helps you track your earnings, shifts, and performance — all in one place.',
  },
  {
    title: 'Step 1: Settings',
    text: 'This is the most important part of TallyShift! Visit the Profile tab, and make TallyShift work for you!',
  },
  {
    title: 'Step 2: Add Shifts',
    text: 'Tap the blue “+” button on the home screen to log your first shift and start tracking!',
  },
  {
    title: 'Step 3: View Your Insights',
    text: 'Visit the Insights tab to see how your money works for you!',
  },
  {
    title: 'Step 4: Provide Feedback',
    text: 'We are so excited to bring you TallyShift and we hope you love using it. This is the first official rollout of the app and we are always happy to take suggestions or be made aware of issues!',
  },
]

export default function WalkthroughModal({ userId, onFinish }) {
  const [step, setStep] = useState(0)
  const router = useRouter()

  async function markComplete() {
    await supabase
      .from('profiles')
      .update({ walkthrough_seen: true })
      .eq('id', userId)
    onFinish?.()
    router.push('/profile')
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
          key={step}
          className="modal-card"
          style={{
            width: 'min(420px, 90vw)',
            padding: 24,
            textAlign: 'center',
          }}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Step counter */}
          <div
            className="note"
            style={{
              fontSize: 13,
              letterSpacing: 0.3,
              color: '#6b7280',
              marginBottom: 6,
            }}
          >
            Step {step + 1} of {steps.length}
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 10,
              color: '#111827',
              lineHeight: 1.3,
            }}
          >
            {steps[step].title.includes('TallyShift') ? (
              steps[step].title
            ) : (
              <>
                <span
                  style={{
                    background: 'linear-gradient(90deg, #2563eb, #22c55e)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {steps[step].title}
                </span>
              </>
            )}
          </h2>

          {/* Text */}
          <motion.p
            key={steps[step].text}
            className="note"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            style={{
              fontSize: 15,
              color: '#4b5563',
              lineHeight: 1.5,
              marginBottom: 20,
            }}
          >
            {steps[step].text}
          </motion.p>

          {/* Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              marginTop: 8,
            }}
          >
            {step > 0 && (
              <button
                className="btn secondary"
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            )}
            {step < steps.length - 1 ? (
              <motion.button
                className="btn btn-primary"
                onClick={() => setStep(step + 1)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                Next
              </motion.button>
            ) : (
              <motion.button
                className="btn btn-primary"
                onClick={markComplete}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                Finish
              </motion.button>
            )}
          </div>

          {/* Skip link */}
          <button
            className="linkbtn"
            style={{ marginTop: 16 }}
            onClick={markComplete}
          >
            Skip walkthrough
          </button>

          {/* Progress dots */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 6,
              marginTop: 14,
            }}
          >
            {steps.map((_, i) => (
              <motion.div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background:
                    i === step
                      ? 'linear-gradient(90deg, #2563eb, #22c55e)'
                      : '#d1d5db',
                }}
                animate={{
                  scale: i === step ? 1.2 : 1,
                  opacity: i === step ? 1 : 0.6,
                }}
                transition={{ duration: 0.25 }}
              />
            ))}
          </div>
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
        `}</style>
      </motion.div>
    </AnimatePresence>
  )
}
