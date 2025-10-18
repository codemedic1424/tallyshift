// ui/SettingsPanel.jsx
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '../lib/useUser'
import { useSettings } from '../lib/useSettings'
import UpgradeModal from './UpgradeModal'
import AddressAutocomplete from './AddressAutocomplete'

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
  // ---- base defaults ----
  const base = {
    payout_mode: s?.payout_mode ?? 'both',
    currency: s?.currency ?? 'USD',
    week_start: s?.week_start ?? 'sunday',
    default_calendar_view: s?.default_calendar_view ?? 'month',
    default_tipout_pct:
      typeof s?.default_tipout_pct === 'number' ? s.default_tipout_pct : null,
    default_tipout_enabled:
      typeof s?.default_tipout_enabled === 'boolean'
        ? s.default_tipout_enabled
        : false,
    track_discounts:
      typeof s?.track_discounts === 'boolean' ? s.track_discounts : false,
    track_hours: typeof s?.track_hours === 'boolean' ? s.track_hours : true,
    track_sales: typeof s?.track_sales === 'boolean' ? s.track_sales : true,
    multiple_locations:
      typeof s?.multiple_locations === 'boolean' ? s.multiple_locations : false,
    default_location_id:
      typeof s?.default_location_id === 'string' ? s.default_location_id : null,
    track_weather: s?.track_weather ?? false,
    track_sections:
      typeof s?.track_sections === 'boolean' ? s.track_sections : false,
    sections: Array.isArray(s?.sections)
      ? s.sections.map((name) => String(name).trim())
      : [],
  }

  // ---- normalize each location and include saved sections ----
  let locations = Array.isArray(s?.locations)
    ? s.locations.map((loc) => ({
        ...normalizeLocation(loc),
        sections: Array.isArray(loc.sections)
          ? loc.sections.map((sec) => String(sec).trim()).filter(Boolean)
          : [],
      }))
    : []

  // ---- create a default if none exist ----
  if (locations.length === 0) {
    const legacyJobs = Array.isArray(s?.job_types)
      ? s.job_types.map((j) => ({
          id: j?.id || uid(),
          name: String(j?.name ?? ''),
          active: j?.active ?? true,
        }))
      : []

    locations = [
      {
        ...normalizeLocation({
          id: uid(),
          name: s?.primary_location_name || 'My Location',
          active: true,
          track_jobs: legacyJobs.length > 0,
          jobs: legacyJobs,
        }),
        sections: [],
      },
    ]
  }

  // ---- set default location ID ----
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
function CollapsibleCard({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="collapsible-card">
      <button
        type="button"
        className="collapsible-header"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="collapsible-title">{title}</span>
        <span className={`arrow ${open ? 'open' : ''}`}>▾</span>
      </button>
      {open && <div className="collapsible-content">{children}</div>}
      <style jsx>{`
        .collapsible-card {
          border: 1px solid var(--border);
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          transition: all 0.25s ease;
        }
        .collapsible-header {
          width: 100%;
          background: #f9fafb;
          border: none;
          outline: none;
          font-weight: 700;
          font-size: 16px;
          color: #111827;
          padding: 14px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .collapsible-header:hover {
          background: #f3f4f6;
        }
        .arrow {
          transition: transform 0.2s ease;
          color: #6b7280;
        }
        .arrow.open {
          transform: rotate(180deg);
        }
        .collapsible-content {
          padding: 16px 18px;
          border-top: 1px solid var(--border);
          background: #fff;
          animation: fadeIn 0.25s ease;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

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
  const [showProCard, setShowProCard] = useState(false)
  const [showWeatherWarning, setShowWeatherWarning] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState(() => {
    if (!draft) return null
    return draft.default_location_id || draft.locations?.[0]?.id || null
  })
  const [newSectionName, setNewSectionName] = useState('')

  // Ensure a valid location is selected once settings (draft) load from Supabase
  useEffect(() => {
    if (
      !draft ||
      !Array.isArray(draft.locations) ||
      draft.locations.length === 0
    )
      return

    if (!selectedLocationId) {
      const fallbackId =
        draft.default_location_id || draft.locations[0]?.id || null
      setSelectedLocationId(fallbackId)
    }
    // ✅ only depend on draft as a whole, not draft.locations directly
  }, [draft, selectedLocationId])

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
    console.log(
      '✅ Updated location:',
      id,
      transform({ ...draft?.locations?.find((l) => l.id === id) }),
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
        setShowWeatherWarning(true)
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
      track_sections: !!draft.track_sections,
      sections: Array.isArray(draft.sections)
        ? draft.sections.map((s) => String(s).trim()).filter(Boolean)
        : [],
      locations: (draft.locations || []).map((l) => ({
        ...l,
        name: String(l.name || '').trim(),
        address: String(l.address || '').trim(),
        lat: l.lat != null ? Number(l.lat) : null,
        lon: l.lon != null ? Number(l.lon) : null,

        jobs: (l.jobs || [])
          .map((j) => ({
            ...j,
            name: String(j.name || '').trim(),
            _isNew: undefined,
          }))
          .filter((j) => j.name.length > 0 || j.active === false),
        sections: Array.isArray(l.sections)
          ? l.sections.map((s) => String(s).trim()).filter(Boolean)
          : [], // ✅ keep existing sections on save
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
      <CollapsibleCard title="Locations & Jobs">
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div className="note">Show archived</div>
          <Switch checked={showArchivedJobs} onChange={setShowArchivedJobs} />
        </div>

        {/* Primary location row */}
        <LocationRow
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
            updateLocation(primary.id, (l) => ({
              ...l,
              address: v,
              lat: l.lat ?? null,
              lon: l.lon ?? null,
            }))
          }
          onSetCoords={(coords) => {
            console.log('📍 Got coords from autocomplete:', coords)
            updateLocation(primary.id, (l) => ({
              ...l,
              lat: Number(coords.lat),
              lon: Number(coords.lon),
            }))
          }}
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

        {/* Additional (active) */}
        {draft.multiple_locations && activeAdditional.length > 0 && (
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {activeAdditional.map((loc) => (
              <LocationRow
                key={loc.id}
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
                  updateLocation(loc.id, (l) => ({
                    ...l,
                    address: v,
                    lat: l.lat ?? null,
                    lon: l.lon ?? null,
                  }))
                }
                onSetCoords={(coords) => {
                  console.log('📍 Got coords from autocomplete:', coords)
                  updateLocation(primary.id, (l) => ({
                    ...l,
                    lat: Number(coords.lat),
                    lon: Number(coords.lon),
                  }))
                }}
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
      </CollapsibleCard>

      {/* --- Calendar & Form in a clean two-up --- */}
      <CollapsibleCard title="Calendar">
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
      </CollapsibleCard>

      {/* --- Shift Details --- */}
      <CollapsibleCard title="Shift Details">
        {/* --- Payout (compact segmented) --- */}

        <div style={{ marginBottom: 10 }}>Tip Payout</div>
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

        {/* --- Divider line --- */}
        <div
          style={{
            borderTop: '1px solid #ddd',
            margin: '12px 0',
          }}
        />

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
        </div>
        {/* --- Divider line --- */}
        <div
          style={{
            borderTop: '1px solid #ddd',
            margin: '12px 0',
          }}
        />
        <div style={{ marginBottom: 10, display: 'grid', gap: 8 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div>Track Tip Out</div>
            <Switch
              checked={!!draft.default_tipout_enabled}
              onChange={(v) => setField('default_tipout_enabled', v)}
              title="Use Default Tip-Out"
            />
          </div>

          {draft.default_tipout_enabled && (
            <label className="field" style={{ marginTop: 6 }}>
              <span className="field-label">Default tip-out %</span>
              <input
                className={`input ${
                  highlightChanges && changed('default_tipout_pct')
                    ? 'field-changed'
                    : ''
                }`}
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
          )}
        </div>
        {/* --- Divider line --- */}
        <div
          style={{
            borderTop: '1px solid #ddd',
            margin: '12px 0',
          }}
        />
        {/* Track Discounts */}
        <div
          style={{
            marginBottom: 10,
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div>Track Discounts?</div>
          <Switch
            checked={!!draft.track_discounts}
            onChange={(v) => setField('track_discounts', v)}
          />
        </div>
      </CollapsibleCard>

      {/* --- Advanced --- */}
      <CollapsibleCard title="Advanced">
        <div className="grid" style={{ gap: 10, gridTemplateColumns: '1fr' }}>
          <label className="field" style={{ width: '100%' }}>
            <span className="field-label">Currency</span>
            <select
              style={{ width: '100%' }}
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
        </div>
      </CollapsibleCard>

      {/* --- Pro Features (collapsible) --- */}
      <div className="ts-pro-card" id="pro-features-card">
        <button
          type="button"
          className="ts-pro-header"
          onClick={() => setShowProCard?.((prev) => !prev)}
          aria-expanded={showProCard}
        >
          <div className="ts-pro-left">
            <span className="ts-pro-pill">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                className="ts-pro-crown"
              >
                <path d="M5 16l-1-9 4 3 4-6 4 6 4-3-1 9H5zm0 2h14v2H5v-2z" />
              </svg>
              <span>Pro</span>
            </span>
            <span className="ts-pro-title">Features</span>
          </div>
          <span className={`ts-pro-arrow${showProCard ? 'open' : ''}`}>▾</span>
        </button>

        {showProCard && (
          <div className="ts-pro-content" style={{ padding: 12 }}>
            {/* Weather (global) */}

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

            {/* --- Divider line --- */}
            <div
              style={{
                borderTop: '1px solid #ddd',
                margin: '12px 0',
              }}
            />
            {/* Multi-locations toggle + default selector */}

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
                  <div style={{ fontWeight: 700 }}>
                    Track multiple locations?
                  </div>
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
                    id="default-location-dropdown"
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
            {/* --- Divider line --- */}
            <div
              style={{
                borderTop: '1px solid #ddd',
                margin: '12px 0',
              }}
            />

            {/* Track Sections (PRO Feature) */}
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
                  <div style={{ fontWeight: 700 }}>Track Sections?</div>
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
                  Enable to define sections (like “Bar” or “Patio”) per
                  location.
                </div>
              </div>

              <Switch
                checked={!!draft.track_sections}
                disabled={false}
                onChange={(v) => {
                  const entitled =
                    planTier === 'pro' ||
                    planTier === 'founder' ||
                    user?.pro_override
                  if (!entitled) {
                    setShowUpgradeModal(true)
                    return
                  }
                  setField('track_sections', v)
                }}
                title="Track sections"
              />
            </div>

            {/* Section management (only if enabled) */}
            {draft.track_sections && (
              <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                {/* Location selector */}
                {draft.multiple_locations && draft.locations?.length > 1 && (
                  <label className="field" style={{ maxWidth: 360 }}>
                    <span className="field-label">Select Location</span>
                    <select
                      className="input"
                      value={selectedLocationId || ''}
                      onChange={(e) =>
                        setSelectedLocationId(e.target.value || null)
                      }
                    >
                      {draft.locations
                        .filter((loc) => loc.active !== false)
                        .map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name || '(Untitled)'}
                          </option>
                        ))}
                    </select>
                  </label>
                )}

                {/* Add Section */}
                <label className="field" style={{ maxWidth: 360 }}>
                  <span className="field-label">Add Section</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Patio, Bar, Private Dining"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                    />
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => {
                        const name = newSectionName.trim()
                        if (!name || !selectedLocationId) return
                        setDraft((d) => ({
                          ...d,
                          locations: d.locations.map((loc) =>
                            loc.id === selectedLocationId
                              ? {
                                  ...loc,
                                  sections: [
                                    ...(loc.sections || []),
                                    name,
                                  ].filter((v, i, arr) => arr.indexOf(v) === i),
                                }
                              : loc,
                          ),
                        }))
                        setNewSectionName('')
                      }}
                    >
                      Add
                    </button>
                  </div>
                </label>

                {/* Section list for active location */}
                {(() => {
                  const activeLoc =
                    draft?.locations?.find(
                      (l) => l.id === selectedLocationId,
                    ) ||
                    draft?.locations?.[0] ||
                    null

                  if (!activeLoc) {
                    return (
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        No locations available.
                      </div>
                    )
                  }

                  const sectionList = Array.isArray(activeLoc.sections)
                    ? activeLoc.sections
                    : []

                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {sectionList.map((name) => (
                        <div
                          key={name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 10px',
                            borderRadius: 999,
                            border: '1px solid var(--border)',
                            background: '#fff',
                            fontSize: 13,
                          }}
                        >
                          <span>{name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                locations: d.locations.map((loc) =>
                                  loc.id === activeLoc.id
                                    ? {
                                        ...loc,
                                        sections: (loc.sections || []).filter(
                                          (s) => s !== name,
                                        ),
                                      }
                                    : loc,
                                ),
                              }))
                            }
                            style={{
                              border: 'none',
                              background: 'transparent',
                              fontWeight: 700,
                              cursor: 'pointer',
                              color: '#6b7280',
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {sectionList.length === 0 && (
                        <div style={{ fontSize: 13, color: '#9ca3af' }}>
                          No sections added yet.
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}
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
      {showWeatherWarning && (
        <div
          className="modal-backdrop"
          onClick={() => setShowWeatherWarning(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(420px, 90vw)',
              borderRadius: 16,
              background: '#fff',
              padding: 20,
              boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
            }}
          >
            <div className="modal-head" style={{ marginBottom: 12 }}>
              <div
                className="modal-title"
                style={{ fontWeight: 800, fontSize: 18 }}
              >
                Missing Addresses
              </div>
            </div>
            <div className="modal-body" style={{ marginBottom: 20 }}>
              Weather tracking is turned on! Please open the "Locations" drop
              down and add the address for your location(s)!
            </div>
            <div
              className="modal-actions"
              style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}
            >
              <button
                className="btn secondary"
                onClick={() => setShowWeatherWarning(false)}
              >
                OK
              </button>
            </div>
          </div>
          <style jsx>{`
            .modal-backdrop {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 2000;
            }
          `}</style>
        </div>
      )}
      <>
        {/* Global animation styles */}
        <style jsx global>{`
          #default-location-dropdown.flash-highlight {
            animation: dropdownFlash 1.4s ease-in-out;
            position: relative;
            z-index: 999;
          }

          @keyframes dropdownFlash {
            0% {
              outline: 2px solid rgba(34, 197, 94, 0.6);
              box-shadow: 0 0 6px 3px rgba(34, 197, 94, 0.3);
              background-color: rgba(220, 252, 231, 0.6);
              transform: scale(1.015);
            }
            40% {
              outline: 2px solid rgba(34, 197, 94, 0.4);
              box-shadow: 0 0 8px 4px rgba(34, 197, 94, 0.25);
              background-color: rgba(240, 253, 244, 0.8);
              transform: scale(1.01);
            }
            80% {
              outline: 1px solid rgba(34, 197, 94, 0.25);
              box-shadow: 0 0 5px 2px rgba(34, 197, 94, 0.15);
              background-color: #fff;
              transform: scale(1);
            }
            100% {
              outline: none;
              box-shadow: none;
              transform: none;
              background-color: #fff;
            }
          }
        `}</style>
      </>
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
          {isDefault && (
            <span
              className="badge clickable"
              onClick={async () => {
                const card = document.getElementById('pro-features-card')
                if (!card) return

                // Expand the section if it’s closed
                const header = card.querySelector('.ts-pro-header')
                const content = card.querySelector('.ts-pro-content')
                if (header && !content) header.click()

                // Wait for the animation to finish rendering
                await new Promise((res) => setTimeout(res, 400))

                // Scroll smoothly and adjust for header offset
                const dropdown = document.getElementById(
                  'default-location-dropdown',
                )
                if (dropdown) {
                  dropdown.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  })
                  window.scrollBy(0, -80) // adjust this if it's slightly off

                  // Glow effect
                  dropdown.classList.add('flash-highlight')
                  setTimeout(
                    () => dropdown.classList.remove('flash-highlight'),
                    1500,
                  )
                }
              }}
            >
              Default Location
            </span>
          )}
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
            <TinyIconBtn
              label="Make default"
              onClick={() => {
                // Do your normal “make default” logic
                onMakeDefault?.()

                // Scroll to the Pro Features section
                const card = document.getElementById('pro-features-card')
                if (card) {
                  // If it's collapsed, click the header to expand it
                  const header = card.querySelector('.ts-pro-header')
                  const content = card.querySelector('.ts-pro-content')
                  if (header && !content) header.click()

                  // Smooth scroll to it
                  card.scrollIntoView({ behavior: 'smooth', block: 'center' })

                  // After the scroll, briefly highlight the dropdown
                  setTimeout(() => {
                    const dropdown = document.getElementById(
                      'default-location-dropdown',
                    )
                    if (dropdown) {
                      dropdown.classList.add('highlight')
                      setTimeout(
                        () => dropdown.classList.remove('highlight'),
                        1500,
                      )
                    }
                  }, 600)
                }
              }}
            />
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
                <AddressAutocomplete
                  value={loc.address ?? ''}
                  onChangeAddress={(v) => !disabled && onChangeAddress?.(v)}
                  onSetCoords={(coords) => !disabled && onSetCoords?.(coords)}
                  disabled={disabled}
                  // country="us" // remove or change if needed
                />
                <div className="note" style={{ marginTop: 6 }}>
                  Coordinates are captured automatically once you select an
                  address.
                </div>
              </label>
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
        .badge.clickable {
          cursor: pointer;
          background: #f3f4f6;
          transition:
            background 0.2s ease,
            box-shadow 0.2s ease;
        }

        .badge.clickable:hover {
          background: #e5e7eb;
        }

        .badge.clickable {
          cursor: pointer;
          background: #f3f4f6;
          transition:
            background 0.2s ease,
            box-shadow 0.2s ease;
        }

        .badge.clickable:hover {
          background: #e5e7eb;
        }

        .locrow {
          display: grid;
          grid-template-columns: 120px 1fr;
          align-items: start;
          gap: 12px;
          padding: 12px 0; /* remove background box, keep spacing */
          border-bottom: 1px solid var(--border);
          background: transparent;
          box-shadow: none;
          border-radius: 0;
          margin-top: 0;
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
          flex-direction: column;
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
    <div className="job-row">
      <input
        className="job-input"
        value={job.name}
        onChange={(e) => !disabled && onChangeName?.(e.target.value)}
        placeholder="e.g., Server"
        disabled={disabled}
      />
      <TinyIconBtn
        label="Archive"
        variant="danger"
        onClick={onArchive}
        disabled={disabled}
      />

      <style jsx>{`
        .job-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
        }

        .job-input {
          flex: 1;
          font-size: 13px;
          padding: 6px 10px;
          height: 34px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: #fff; /* white background, not gray */
          color: var(--ink);
        }

        .job-input:disabled {
          background: #f5f5f5;
          color: #888;
          cursor: not-allowed;
        }
      `}</style>
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
    <div className="job-row">
      <input
        className="job-input"
        value={name}
        onChange={(e) => !disabled && setName(e.target.value)}
        placeholder="e.g., Server, Bartender"
        disabled={disabled}
      />

      <div className="actions">
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
      </div>

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
        .job-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
          flex-wrap: wrap;
        }

        .job-input {
          flex: 1;
          font-size: 13px;
          padding: 6px 10px;
          height: 34px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: #fff;
          color: var(--ink);
        }

        .actions {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .help {
          width: 100%;
          margin-top: 4px;
        }

        .job-input:disabled {
          background: #f5f5f5;
          color: #888;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
