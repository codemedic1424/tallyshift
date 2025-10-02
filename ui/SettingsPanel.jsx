// ui/SettingsPanel.jsx
import { useState } from 'react'
import { useUser } from '../lib/useUser'
import { useSettings } from '../lib/useSettings'

export default function SettingsPanel() {
  const { user } = useUser()
  const { settings, saveSettings, loading, error } = useSettings()
  const [saving, setSaving] = useState(false)

  if (!user) return null

  async function setSetting(patch) {
    try {
      setSaving(true)
      await saveSettings(patch)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-panel" style={{ display: 'grid', gap: 12 }}>
      {loading && <div className="card">Loading…</div>}
      {error && (
        <div
          className="card"
          style={{ background: '#fee2e2', borderColor: '#fecaca' }}
        >
          Error: {error}
        </div>
      )}

      {!loading && (
        <>
          <div className="card">
            <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
              Tip payout
            </div>
            <div className="grid">
              {[
                ['both', 'Cash + Card'],
                ['cash_only', 'Cash only'],
                ['card_only', 'Card only'],
                ['on_paycheck', 'All on paycheck'],
              ].map(([val, label]) => (
                <label
                  key={val}
                  className="radio"
                  style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                >
                  <input
                    type="radio"
                    checked={(settings?.payout_mode || 'both') === val}
                    onChange={() => setSetting({ payout_mode: val })}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="note" style={{ marginTop: 6 }}>
              Controls which inputs you see when logging a shift.
            </div>
          </div>

          <div className="card">
            <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
              Currency
            </div>
            <select
              className="input"
              value={settings?.currency || 'USD'}
              onChange={(e) => setSetting({ currency: e.target.value })}
            >
              <option value="USD">USD - $</option>
              <option value="CAD">CAD - $</option>
              <option value="EUR">EUR - €</option>
              <option value="GBP">GBP - £</option>
              <option value="AUD">AUD - $</option>
            </select>
          </div>

          <div className="card">
            <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
              Week starts on
            </div>
            <select
              className="input"
              value={settings?.week_start || 'sunday'}
              onChange={(e) => setSetting({ week_start: e.target.value })}
            >
              <option value="sunday">Sunday</option>
              <option value="monday">Monday</option>
            </select>
            <div className="note" style={{ marginTop: 6 }}>
              Affects weekly summaries and calendar grouping.
            </div>
          </div>

          <div className="card">
            <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
              Default calendar view
            </div>
            <select
              className="input"
              value={settings?.default_calendar_view || 'month'}
              onChange={(e) =>
                setSetting({ default_calendar_view: e.target.value })
              }
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>

          <div className="card">
            <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
              Default tip-out % (optional)
            </div>
            <input
              className="input"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={settings?.default_tipout_pct ?? ''}
              placeholder="e.g., 3"
              onChange={(e) => {
                const v =
                  e.target.value === ''
                    ? null
                    : Math.max(0, Math.min(100, Number(e.target.value)))
                setSetting({ default_tipout_pct: v })
              }}
            />
            <div className="note" style={{ marginTop: 6 }}>
              Prefills the tip-out field when adding a shift (editable per
              shift).
            </div>
          </div>

          <div className="card">
            <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
              Raw settings (debug)
            </div>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                overflow: 'auto',
                fontSize: 12,
                margin: 0,
              }}
            >
              {JSON.stringify(settings || {}, null, 2)}
            </pre>
            <div className="note" style={{ marginTop: 6 }}>
              {saving ? 'Saving…' : 'Saved'}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
