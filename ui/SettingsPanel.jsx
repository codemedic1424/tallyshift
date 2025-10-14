// ui/SettingsPanel.jsx
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '../lib/useUser'
import { useSettings } from '../lib/useSettings'
import UpgradeModal from './UpgradeModal'

/* ---------------- utils (unchanged behavior) ---------------- */

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

/** Keep inputs as-typed; trim on save only */
function normalizeLocation(raw) {
  const jobs = Array.isArray(raw?.jobs) ? raw.jobs : []
  return {
    id: raw?.id || uid(),
    name: String(raw?.name ?? ''),
    active: typeof raw?.active === 'boolean' ? raw.active : true,
    // weather fields
    address: typeof raw?.address === 'string' ? raw.address : '',
    lat: typeof raw?.lat === 'number' ? raw.lat : null,
    lon: typeof raw?.lon === 'number' ? raw.lon : null,
    track_jobs: typeof raw?.track_jobs === 'boolean' ? raw.track_jobs : false,
    jobs: jobs.map((j) => ({
      id: j?.id || uid(),
      name: String(j?.name ?? ''),
      active: typeof j?.active === 'boolean' ? j.active : true,
      _isNew: undefined,
    })),
  }
}

function initFromSettings(s) {
  const base = {
    payout_mode: s?.payout_mode ?? 'both',
    currency: s?.currency ?? 'USD',
    week_start: s?.week_start ?? 'sunday',
    default_calendar_view: s?.default_calendar_view ?? 'month',
    default_tipout_pct:
      typeof s?.default_tipout_pct === 'number' ? s.default_tipout_pct : null,
    track_hours: typeof s?.track_hours === 'boolean' ? s.track_hours : true,
    track_sales: typeof s?.track_sales === 'boolean' ? s.track_sales : true,
    multiple_locations:
      typeof s?.multiple_locations === 'boolean' ? s.multiple_locations : false,
    default_location_id:
      typeof s?.default_location_id === 'string' ? s.default_location_id : null,
    // global weather toggle
    track_weather: s?.track_weather ?? false,
  }

  let locations = Array.isArray(s?.locations)
    ? s.locations.map(normalizeLocation)
    : null

  if (!locations || locations.length === 0) {
    const legacyJobs = Array.isArray(s?.job_types)
      ? s.job_types.map((j) => ({
          id: j?.id || uid(),
          name: String(j?.name ?? ''),
          active: j?.active ?? true,
        }))
      : []
    locations = [
      normalizeLocation({
        id: uid(),
        name: s?.primary_location_name || 'My Location',
        active: true,
        track_jobs: legacyJobs.length > 0,
        jobs: legacyJobs,
      }),
    ]
  } else {
    locations = locations.map(normalizeLocation)
    if (!locations[0]?.name) locations[0].name = 'My Location'
  }

  const fallbackId = locations[0]?.id || null
  const default_location_id =
    (base.default_location_id &&
    locations.some((l) => l.id === base.default_location_id)
      ? base.default_location_id
      : fallbackId) || fallbackId

  return { ...base, locations, default_location_id }
}

/* ---------------- small UI atoms (design) ---------------- */

function Switch({ checked, onChange, disabled, title }) {
  return (
    <button
      type="button"
      className={`sw ${checked ? 'on' : ''} ${disabled ? 'dis' : ''}`}
      onClick={() => !disabled && onChange?.(!checked)}
      aria-pressed={checked}
      title={title}
    >
      <span className="knob" />
      <style jsx>{`
        .sw {
          width: 42px;
          height: 24px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: #f3f4f6;
          padding: 0;
          position: relative;
          cursor: pointer;
          transition:
            background 0.15s ease,
            border-color 0.15s ease;
        }
        .sw.on {
          background: #22c55e;
          border-color: #16a34a;
        }
        .sw.dis {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .knob {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          left: 2px;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
          transition: left 0.18s ease;
        }
        .sw.on .knob {
          left: 20px;
        }
      `}</style>
    </button>
  )
}

function Seg({ value, onChange, options, compact = false }) {
  return (
    <div className={`seg ${compact ? 'compact' : ''}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={value === opt.value ? 'active' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
      <style jsx>{`
        .seg {
          display: grid;
          grid-auto-flow: column;
          gap: 6px;
          padding: 4px;
          background: #f3f4f6;
          border: 1px solid var(--border);
          border-radius: 999px;
        }
        .seg.compact {
          gap: 4px;
          padding: 3px;
        }
        .seg button {
          border: 0;
          background: transparent;
          padding: 8px 12px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 13px;
          color: #374151;
          cursor: pointer;
        }
        .seg.compact button {
          padding: 6px 10px;
          font-size: 12px;
        }
        .seg button.active {
          background: #111827;
          color: #fff;
        }
      `}</style>
    </div>
  )
}

function TinyIconBtn({ label, variant = 'neutral', onClick, disabled, title }) {
  return (
    <button
      type="button"
      className={`tib ${variant}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title || label}
    >
      {label}
      <style jsx>{`
        .tib {
          border: 1px solid var(--border);
          background: #fff;
          padding: 6px 10px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }
        .tib:hover {
          background: #f9fafb;
        }
        .tib:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .tib.danger {
          border-color: #fecaca;
          color: #b91c1c;
          background: #fff;
        }
        .tib.primary {
          border-color: #bfdbfe;
          color: #1d4ed8;
          background: #fff;
        }
      `}</style>
    </button>
  )
}

/* ---------------- main component ---------------- */

export default function SettingsPanel({
  onDirtyChange,
  onRequestClose,
  onSaved,
}) {
  const { user } = useUser()
  const { settings, saveSettings, loading, error } = useSettings()
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [highlightChanges, setHighlightChanges] = useState(false)
  const [showArchivedJobs, setShowArchivedJobs] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const planTier = user?.plan_tier || user?.tier || 'free'

  // Auto-disable paid features + auto-save if user downgrades
  useEffect(() => {
    if (!draft) return

    const entitled = ['pro', 'founder'].includes(planTier) || user?.pro_override

    // If user no longer entitled, reset and auto-save
    if (!entitled && (draft.track_weather || draft.multiple_locations)) {
      const updated = {
        ...draft,
        track_weather: false,
        multiple_locations: false,
      }

      setDraft(updated)

      // Persist the change silently (no "Saving…" UI)
      ;(async () => {
        try {
          await saveSettings(updated)
          console.log('🔄 Auto-saved: downgraded plan reset features off.')
        } catch (err) {
          console.warn('Auto-save after downgrade failed:', err.message)
        }
      })()
    }
  }, [planTier, user?.pro_override, draft])

  useEffect(() => {
    if (!settings) return
    setDraft(initFromSettings(settings))
    setHighlightChanges(false)
  }, [settings])

  // Fallback when no settings row exists
  useEffect(() => {
    if (!loading && !settings && !draft) {
      setDraft(initFromSettings({}))
      setHighlightChanges(false)
    }
  }, [loading, settings, draft])

  const original = useMemo(
    () => (settings ? initFromSettings(settings) : null),
    [settings],
  )

  const isDirty = useMemo(() => {
    if (!draft || !original) return false
    return JSON.stringify(draft) !== JSON.stringify(original)
  }, [draft, original])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  if (!user) return null

  /* ---------- state helpers ---------- */

  function setField(key, val) {
    setDraft((d) => ({ ...(d || {}), [key]: val }))
  }
  function replaceLocations(newLocs) {
    setDraft((d) => ({ ...(d || {}), locations: newLocs }))
  }
  function updateLocation(id, transform) {
    replaceLocations(
      (draft?.locations || []).map((l) =>
        l.id === id ? transform({ ...l }) : l,
      ),
    )
  }

  // Jobs helpers
  function addJob(locationId) {
    setDraft((d) => ({
      ...d,
      locations: (d.locations || []).map((loc) =>
        loc.id === locationId
          ? {
              ...loc,
              jobs: [
                ...(loc.jobs || []),
                { id: uid(), name: '', active: true, _isNew: true },
              ],
            }
          : loc,
      ),
    }))
  }
  function removeJob(locationId, jobId) {
    setDraft((d) => ({
      ...d,
      locations: (d.locations || []).map((loc) =>
        loc.id === locationId
          ? { ...loc, jobs: (loc.jobs || []).filter((j) => j.id !== jobId) }
          : loc,
      ),
    }))
  }
  function finalizeNewJob(locationId, jobId, name) {
    setDraft((d) => ({
      ...d,
      locations: (d.locations || []).map((loc) =>
        loc.id === locationId
          ? {
              ...loc,
              jobs: (loc.jobs || []).map((j) =>
                j.id === jobId ? { ...j, name, _isNew: undefined } : j,
              ),
            }
          : loc,
      ),
    }))
  }
  function updateJob(locationId, jobId, transform) {
    setDraft((d) => ({
      ...d,
      locations: (d.locations || []).map((loc) =>
        loc.id === locationId
          ? {
              ...loc,
              jobs: (loc.jobs || []).map((j) =>
                j.id === jobId ? transform({ ...j }) : j,
              ),
            }
          : loc,
      ),
    }))
  }
  function toggleArchiveJob(locationId, jobId) {
    updateJob(locationId, jobId, (j) => ({ ...j, active: !j.active }))
  }

  // Location helpers
  function addAdditionalLocation() {
    setField('multiple_locations', true)
    replaceLocations([
      ...(draft?.locations || []),
      {
        id: uid(),
        name: '',
        active: true,
        track_jobs: false,
        address: '',
        lat: null,
        lon: null,
        jobs: [],
      },
    ])
  }
  function toggleArchiveLocation(id) {
    updateLocation(id, (l) => ({ ...l, active: !l.active }))
  }

  /* ---------- save / cancel ---------- */

  async function handleSave() {
    if (!draft) return
    const [primary, ...rest] = draft.locations || []
    if (!primary || !String(primary.name || '').trim()) {
      setHighlightChanges(true)
      alert('Please enter a name for your primary location.')
      return
    }

    // If weather is ON, require address for all active locations
    if (draft.track_weather) {
      const missing = (draft.locations || [])
        .filter((l) => l.active)
        .filter((l) => !String(l.address || '').trim())
      if (missing.length > 0) {
        setHighlightChanges(true)
        alert(
          'Weather tracking is on. Please add an address for all active locations.',
        )
        return
      }
    }

    const default_location_id = draft.multiple_locations
      ? (draft.default_location_id ?? (primary ? primary.id : null)) ||
        primary.id
      : primary.id

    const clean = {
      ...draft,
      default_location_id,
      locations: (draft.locations || []).map((l) => ({
        ...l,
        name: String(l.name || '').trim(),
        address: String(l.address || '').trim(),
        lat: typeof l.lat === 'number' ? l.lat : null,
        lon: typeof l.lon === 'number' ? l.lon : null,
        jobs: (l.jobs || [])
          .map((j) => ({
            ...j,
            name: String(j.name || '').trim(),
            _isNew: undefined,
          }))
          .filter((j) => j.name.length > 0 || j.active === false),
      })),
    }

    setSaving(true)
    try {
      await saveSettings(clean)
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    onRequestClose?.()
    setHighlightChanges(true)
  }
  function changed(key) {
    if (!draft || !original) return false
    return JSON.stringify(draft[key]) !== JSON.stringify(original[key])
  }

  /* ---------- derived ---------- */

  const primary = (draft?.locations || [])[0]
  const additional = (draft?.locations || []).slice(1)
  const activeAdditional = additional.filter((l) => l.active)
  const archivedAdditional = additional.filter((l) => !l.active)

  /* ---------- loading / error UI ---------- */

  if (loading || !draft) {
    return (
      <div className="settings-panel" style={{ display: 'grid', gap: 12 }}>
        <div className="card">Loading…</div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="settings-panel" style={{ display: 'grid', gap: 12 }}>
        <div
          className="card"
          style={{ background: '#fee2e2', borderColor: '#fecaca' }}
        >
          Error: {error}
        </div>
      </div>
    )
  }

  /* ---------------- render ---------------- */

  return (
    <div className="settings-panel" style={{ display: 'grid', gap: 14 }}>
      {/* Header Bar (slim) */}
      <div className="card" style={{ padding: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: 2 }}>
            <div className="h1" style={{ margin: 0 }}>
              Settings
            </div>
            <div className="note">
              Make it yours. These preferences apply across the app.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn secondary"
              type="button"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleSave}
              disabled={!isDirty || saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* --- First Impression: Locations --- */}
      <div className="card" style={{ padding: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div className="h2" style={{ margin: 0, fontSize: 16 }}>
            Locations
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="note">Show archived</div>
            <Switch checked={showArchivedJobs} onChange={setShowArchivedJobs} />
          </div>
        </div>

        {/* Weather (global) */}
        <div className="card" style={{ marginTop: 10, padding: 10 }}>
          <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
            Weather
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Track weather for each shift</span>
              <span
                style={{
                  padding: '2px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: '999px',
                  background:
                    planTier === 'pro' || planTier === 'founder'
                      ? '#facc15'
                      : '#e5e7eb',
                  color:
                    planTier === 'pro' || planTier === 'founder'
                      ? '#1f2937'
                      : '#6b7280',
                  border: '1px solid #d1d5db',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                }}
              >
                Pro
              </span>
            </div>

            <Switch
              checked={!!draft.track_weather}
              disabled={false} // never truly disable it
              onChange={(v) => {
                const entitled =
                  ['pro', 'founder'].includes(user?.plan_tier) ||
                  user?.pro_override

                if (!entitled) {
                  setShowUpgradeModal(true)
                  return
                }

                setField('track_weather', v)
              }}
              title="Track weather"
            />
          </div>

          <div className="note" style={{ marginTop: 6 }}>
            Requires an address per active location (we’ll look up coordinates
            automatically).
          </div>
        </div>

        {/* Primary location row */}
        <LocationRow
          label="Primary"
          loc={primary}
          isDefault={draft.default_location_id === primary.id}
          disabled={false}
          showArchivedJobs={showArchivedJobs}
          showWeatherFields={!!draft.track_weather}
          highlightMissingName={
            highlightChanges && !String(primary?.name || '').trim()
          }
          onChangeName={(v) =>
            updateLocation(primary.id, (l) => ({ ...l, name: v }))
          }
          onChangeAddress={(v) =>
            updateLocation(primary.id, (l) => ({ ...l, address: v }))
          }
          onSetCoords={(coords) =>
            updateLocation(primary.id, (l) => ({ ...l, ...coords }))
          }
          onToggleTrackJobs={(v) =>
            updateLocation(primary.id, (l) => ({ ...l, track_jobs: v }))
          }
          onAddJob={() => addJob(primary.id)}
          onChangeJob={(jobId, name) =>
            updateJob(primary.id, jobId, (j) => ({ ...j, name }))
          }
          onArchiveJob={(jobId) => toggleArchiveJob(primary.id, jobId)}
          onRemoveNewJob={(jobId) => removeJob(primary.id, jobId)}
          onFinalizeNewJob={(jobId, name) =>
            finalizeNewJob(primary.id, jobId, name)
          }
        />

        {/* Multi-locations toggle + default selector */}
        <div className="card" style={{ marginTop: 10, padding: 10 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ display: 'grid', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontWeight: 700 }}>Track multiple locations?</div>
                {/* PRO pill */}
                <span
                  style={{
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: '999px',
                    background:
                      planTier === 'pro' || planTier === 'founder'
                        ? '#facc15'
                        : '#e5e7eb',
                    color:
                      planTier === 'pro' || planTier === 'founder'
                        ? '#1f2937'
                        : '#6b7280',
                    border: '1px solid #d1d5db',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}
                >
                  Pro
                </span>
              </div>
              <div className="note">
                Enable to add more locations and pick a default.
              </div>
            </div>

            <Switch
              checked={!!draft.multiple_locations}
              disabled={false} // keep interactive so they can click it
              onChange={(v) => {
                const entitled =
                  planTier === 'pro' ||
                  planTier === 'founder' ||
                  user?.pro_override
                if (!entitled) {
                  setShowUpgradeModal(true)
                  return
                }
                setField('multiple_locations', v)
              }}
              title="Multiple locations"
            />
          </div>

          {draft.multiple_locations && (
            <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
              <label className="field" style={{ maxWidth: 360 }}>
                <span className="field-label">Default location</span>
                <select
                  className={`input ${
                    highlightChanges && changed('default_location_id')
                      ? 'field-changed'
                      : ''
                  }`}
                  value={
                    (draft.default_location_id ??
                      (primary ? primary.id : '')) ||
                    ''
                  }
                  onChange={(e) =>
                    setField(
                      'default_location_id',
                      e.target.value || (primary ? primary.id : ''),
                    )
                  }
                >
                  {(draft.locations || [])
                    .filter((l) => l.active)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name || '(untitled)'}
                      </option>
                    ))}
                </select>
              </label>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <TinyIconBtn
                  label="+ Add location"
                  variant="primary"
                  onClick={addAdditionalLocation}
                />
              </div>
            </div>
          )}
        </div>

        {/* Additional (active) */}
        {draft.multiple_locations && activeAdditional.length > 0 && (
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {activeAdditional.map((loc) => (
              <LocationRow
                key={loc.id}
                label="Location"
                loc={loc}
                disabled={false}
                archived={false}
                showArchivedJobs={showArchivedJobs}
                showWeatherFields={!!draft.track_weather}
                isDefault={draft.default_location_id === loc.id}
                onMakeDefault={() => setField('default_location_id', loc.id)}
                onChangeName={(v) =>
                  updateLocation(loc.id, (l) => ({ ...l, name: v }))
                }
                onChangeAddress={(v) =>
                  updateLocation(loc.id, (l) => ({ ...l, address: v }))
                }
                onSetCoords={(coords) =>
                  updateLocation(loc.id, (l) => ({ ...l, ...coords }))
                }
                onToggleTrackJobs={(v) =>
                  updateLocation(loc.id, (l) => ({ ...l, track_jobs: v }))
                }
                onToggleArchive={() => toggleArchiveLocation(loc.id)}
                onAddJob={() => addJob(loc.id)}
                onChangeJob={(jobId, name) =>
                  updateJob(loc.id, jobId, (j) => ({ ...j, name }))
                }
                onArchiveJob={(jobId) => toggleArchiveJob(loc.id, jobId)}
                onRemoveNewJob={(jobId) => removeJob(loc.id, jobId)}
                onFinalizeNewJob={(jobId, name) =>
                  finalizeNewJob(loc.id, jobId, name)
                }
              />
            ))}
          </div>
        )}

        {/* Archived locations */}
        {draft.multiple_locations &&
          showArchivedJobs &&
          archivedAdditional.length > 0 && (
            <div className="card" style={{ marginTop: 12, padding: 10 }}>
              <div className="note" style={{ marginBottom: 6 }}>
                Archived locations
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {archivedAdditional.map((loc) => (
                  <LocationRow
                    key={loc.id}
                    label="Location (archived)"
                    loc={loc}
                    disabled
                    archived
                    showArchivedJobs
                    showWeatherFields={!!draft.track_weather}
                    onToggleArchive={() => toggleArchiveLocation(loc.id)} // Unarchive
                  />
                ))}
              </div>
            </div>
          )}
      </div>

      {/* --- Payout (compact segmented) --- */}
      <div className="card" style={{ padding: 12 }}>
        <div
          className="h2"
          style={{ margin: 0, fontSize: 16, marginBottom: 8 }}
        >
          Tip payout
        </div>
        <Seg
          value={draft.payout_mode}
          onChange={(v) => setField('payout_mode', v)}
          options={[
            { value: 'both', label: 'Cash + Card' },
            { value: 'cash_only', label: 'Cash only' },
            { value: 'card_only', label: 'Card only' },
          ]}
          compact
        />
        <div className="note" style={{ marginTop: 6 }}>
          Controls which inputs you see when logging a shift.
        </div>
      </div>

      {/* --- Calendar & Form in a clean two-up --- */}
      <div className="two grid" style={{ gap: 12 }}>
        <div className="card" style={{ padding: 12 }}>
          <div
            className="h2"
            style={{ margin: 0, fontSize: 16, marginBottom: 8 }}
          >
            Calendar
          </div>
          <div className="two grid" style={{ gap: 10 }}>
            <label className="field">
              <span className="field-label">Default view</span>
              <select
                className={`input ${highlightChanges && changed('default_calendar_view') ? 'field-changed' : ''}`}
                value={draft.default_calendar_view}
                onChange={(e) =>
                  setField('default_calendar_view', e.target.value)
                }
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Week starts on</span>
              <select
                className={`input ${highlightChanges && changed('week_start') ? 'field-changed' : ''}`}
                value={draft.week_start}
                onChange={(e) => setField('week_start', e.target.value)}
              >
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
              </select>
            </label>
          </div>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div
            className="h2"
            style={{ margin: 0, fontSize: 16, marginBottom: 8 }}
          >
            Shift form
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div>Track Sales</div>
              <Switch
                checked={!!draft.track_sales}
                onChange={(v) => setField('track_sales', v)}
              />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div>Track Hours</div>
              <Switch
                checked={!!draft.track_hours}
                onChange={(v) => setField('track_hours', v)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- Advanced --- */}
      <div className="card" style={{ padding: 12 }}>
        <div
          className="h2"
          style={{ margin: 0, fontSize: 16, marginBottom: 8 }}
        >
          Advanced
        </div>
        <div className="two grid" style={{ gap: 10 }}>
          <label className="field">
            <span className="field-label">Currency</span>
            <select
              className={`input ${highlightChanges && changed('currency') ? 'field-changed' : ''}`}
              value={draft.currency}
              onChange={(e) => setField('currency', e.target.value)}
            >
              <option value="USD">USD - $</option>
              <option value="CAD">CAD - $</option>
              <option value="EUR">EUR - €</option>
              <option value="GBP">GBP - £</option>
              <option value="AUD">AUD - $</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Default tip-out % (optional)</span>
            <input
              className={`input ${highlightChanges && changed('default_tipout_pct') ? 'field-changed' : ''}`}
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={draft.default_tipout_pct ?? ''}
              placeholder="e.g., 3"
              onChange={(e) => {
                const v =
                  e.target.value === ''
                    ? null
                    : Math.max(0, Math.min(100, Number(e.target.value)))
                setField('default_tipout_pct', v)
              }}
            />
          </label>
        </div>
      </div>

      {/* Sticky actions (bottom) */}
      <div className="settings-actions">
        <button className="btn secondary" type="button" onClick={handleCancel}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          type="button"
          onClick={handleSave}
          disabled={!isDirty || saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  )
}

/* ---------------- location row + jobs ---------------- */

function LocationRow({
  label,
  loc,
  isDefault,
  archived,
  disabled,
  showArchivedJobs,
  showWeatherFields,
  highlightMissingName,
  onChangeName,
  onChangeAddress,
  onSetCoords, // {lat, lon}
  onToggleTrackJobs,
  onToggleArchive,
  onMakeDefault,
  onAddJob,
  onChangeJob,
  onArchiveJob,
  onRemoveNewJob,
  onFinalizeNewJob,
}) {
  const pending = (loc.jobs || []).filter((j) => j._isNew)
  const active = (loc.jobs || []).filter((j) => j.active && !j._isNew)
  const archivedJobs = (loc.jobs || []).filter((j) => !j.active)

  return (
    <div className="locrow">
      {/* left col (name + badges) */}
      <div className="left">
        <div className="label">{label}</div>
        <div className="badges">
          {isDefault && <span className="badge">Default</span>}
          {archived && <span className="badge">Archived</span>}
        </div>
      </div>

      {/* main content */}
      <div className="main">
        <div className="line">
          <input
            className={`input ${highlightMissingName ? 'field-changed' : ''}`}
            value={loc.name}
            onChange={(e) => !disabled && onChangeName?.(e.target.value)}
            placeholder="Location name"
            disabled={disabled}
            style={{ maxWidth: 360 }}
          />
          <div className="spacer" />
          {onMakeDefault && !isDefault && !archived && (
            <TinyIconBtn label="Make default" onClick={onMakeDefault} />
          )}
          {onToggleArchive && (
            <TinyIconBtn
              label={archived ? 'Unarchive' : 'Archive'}
              variant={archived ? 'neutral' : 'danger'}
              onClick={onToggleArchive}
            />
          )}
        </div>

        {showWeatherFields && (
          <div className="wbox">
            <div className="line tight">
              <label className="field" style={{ margin: 0 }}>
                <span className="field-label">
                  Address (required when weather tracking is on)
                </span>
                <input
                  className="input"
                  value={loc.address ?? ''}
                  onChange={(e) =>
                    !disabled && onChangeAddress?.(e.target.value)
                  }
                  placeholder="123 Main St, City, ST"
                  disabled={disabled}
                />
              </label>
            </div>
            <div
              className="line tight"
              style={{ gridTemplateColumns: '1fr 1fr auto' }}
            >
              <label className="field" style={{ margin: 0 }}>
                <span className="field-label">Latitude</span>
                <input
                  className="input"
                  type="number"
                  step="0.000001"
                  value={loc.lat ?? ''}
                  onChange={(e) =>
                    !disabled &&
                    onSetCoords?.({
                      lat:
                        e.target.value === '' ? null : Number(e.target.value),
                      lon: typeof loc.lon === 'number' ? loc.lon : null,
                    })
                  }
                  disabled={disabled}
                />
              </label>
              <label className="field" style={{ margin: 0 }}>
                <span className="field-label">Longitude</span>
                <input
                  className="input"
                  type="number"
                  step="0.000001"
                  value={loc.lon ?? ''}
                  onChange={(e) =>
                    !disabled &&
                    onSetCoords?.({
                      lat: typeof loc.lat === 'number' ? loc.lat : null,
                      lon:
                        e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  disabled={disabled}
                />
              </label>
              <TinyIconBtn
                label="Lookup coords"
                variant="primary"
                disabled={disabled}
                onClick={async () => {
                  const address = String(loc.address || '').trim()
                  if (!address) return alert('Enter an address first.')
                  try {
                    const resp = await fetch('/api/geocode', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ address }),
                    })
                    const data = await resp.json()
                    if (!data?.ok || !data.found) {
                      alert('Could not find that address.')
                      return
                    }
                    onSetCoords?.({ lat: data.lat, lon: data.lon })
                  } catch (e) {
                    alert('Geocoding failed. Try again.')
                  }
                }}
              />
            </div>
          </div>
        )}

        <div className="line">
          <div className="note">Track jobs at this location</div>
          <Switch
            checked={!!loc.track_jobs}
            onChange={(v) => !disabled && onToggleTrackJobs?.(v)}
            disabled={disabled}
          />
        </div>

        {loc.track_jobs && (
          <>
            {/* active jobs as compact chips */}
            {active.length > 0 && (
              <div className="chips">
                {active.map((j) => (
                  <JobChipActive
                    key={j.id}
                    job={j}
                    disabled={disabled}
                    onChangeName={(name) => onChangeJob?.(j.id, name)}
                    onArchive={() => onArchiveJob?.(j.id)}
                  />
                ))}
              </div>
            )}

            {/* pending inputs */}
            {pending.map((j) => (
              <JobRowNew
                key={j.id}
                job={j}
                allJobs={loc.jobs}
                disabled={disabled}
                onCancel={() => onRemoveNewJob?.(j.id)}
                onUnarchiveExisting={(archivedId) => onArchiveJob?.(archivedId)}
                onSave={(name) => onFinalizeNewJob?.(j.id, name)}
              />
            ))}

            <div className="line">
              <TinyIconBtn
                label="+ Add job"
                variant="primary"
                onClick={onAddJob}
                disabled={disabled}
              />
              <div className="spacer" />
              {showArchivedJobs && archivedJobs.length > 0 && (
                <div className="chips wrap">
                  {archivedJobs.map((j) => (
                    <div key={j.id} className="chip strike">
                      <span title={j.name}>{j.name || '(untitled)'}</span>
                      {!disabled && (
                        <TinyIconBtn
                          label="Unarchive"
                          onClick={() => onArchiveJob?.(j.id)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .locrow {
          display: grid;
          grid-template-columns: 120px 1fr;
          align-items: start;
          gap: 12px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: #fff;
          box-shadow: var(--shadow-soft);
          margin-top: 10px;
        }
        @media (max-width: 560px) {
          .locrow {
            grid-template-columns: 1fr;
          }
        }
        .left {
          display: grid;
          gap: 6px;
        }
        .label {
          font-weight: 800;
        }
        .badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .badge {
          font-size: 11px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--muted);
        }
        .main {
          display: grid;
          gap: 10px;
        }
        .line {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 10px;
        }
        .line.tight {
          grid-template-columns: 1fr;
        }
        .spacer {
          flex: 1;
        }
        .wbox {
          border: 1px dashed var(--border);
          border-radius: 10px;
          padding: 10px;
          background: #fcfcfd;
        }
        .chips {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .chips.wrap {
          flex-wrap: wrap;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: #fff;
          font-size: 13px;
        }
        .chip.strike span {
          text-decoration: line-through;
          color: #6b7280;
        }
      `}</style>
    </div>
  )
}

/* ---- jobs UI ---- */

function normName(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
}
function hasNameConflict(allJobs, candidateName, { excludeJobId } = {}) {
  const n = normName(candidateName)
  if (!n) return { conflict: false, activeMatch: null, archivedMatch: null }
  let activeMatch = null
  let archivedMatch = null
  for (const j of allJobs) {
    if (excludeJobId && j.id === excludeJobId) continue
    if (normName(j.name) === n) {
      if (j.active) activeMatch = j
      else archivedMatch = j
    }
  }
  return {
    conflict: !!(activeMatch || archivedMatch),
    activeMatch,
    archivedMatch,
  }
}

function JobChipActive({ job, disabled, onChangeName, onArchive }) {
  return (
    <div className="chip">
      <input
        className="input"
        value={job.name}
        onChange={(e) => !disabled && onChangeName?.(e.target.value)}
        placeholder="e.g., Server"
        disabled={disabled}
        style={{ padding: '6px 10px', height: 34, fontSize: 13, width: 160 }}
      />
      <TinyIconBtn
        label="Archive"
        variant="danger"
        onClick={onArchive}
        disabled={disabled}
      />
    </div>
  )
}

function JobRowNew({
  job,
  allJobs,
  disabled,
  onCancel,
  onSave,
  onUnarchiveExisting,
}) {
  const [name, setName] = useState(job.name || '')
  const trimmed = name.trim()
  const { activeMatch, archivedMatch } = hasNameConflict(allJobs, name)

  const hasActiveDup = !!activeMatch
  const matchesArchived = !!archivedMatch
  const canSave = !disabled && !!trimmed && !hasActiveDup && !matchesArchived

  return (
    <div className="newrow">
      <input
        className="input"
        value={name}
        onChange={(e) => !disabled && setName(e.target.value)}
        placeholder="e.g., Server"
        disabled={disabled}
        style={{ fontSize: 14 }}
      />
      {matchesArchived ? (
        <TinyIconBtn
          label="Unarchive existing"
          onClick={() => onUnarchiveExisting?.(archivedMatch.id)}
          disabled={disabled}
        />
      ) : (
        <TinyIconBtn
          label="Save"
          variant="primary"
          onClick={() => onSave?.(trimmed)}
          disabled={!canSave}
        />
      )}
      <TinyIconBtn label="Cancel" onClick={onCancel} disabled={disabled} />
      <div className="help">
        {!trimmed && <div className="note">Enter a job name to save.</div>}
        {hasActiveDup && (
          <div className="note" style={{ color: '#b91c1c' }}>
            A job with this name already exists.
          </div>
        )}
        {matchesArchived && (
          <div className="note" style={{ color: '#b45309' }}>
            This name exists in Archived. Use “Unarchive existing”.
          </div>
        )}
      </div>
      <style jsx>{`
        .newrow {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 8px;
          align-items: center;
        }
        .help {
          grid-column: 1 / -1;
        }
      `}</style>
    </div>
  )
}
