// ui/SettingsPanel.jsx
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '../lib/useUser'
import { useSettings } from '../lib/useSettings'

/* ---------------- utils ---------------- */

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

/* --------------- main component --------------- */

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

  // UI state
  const [showArchivedJobs, setShowArchivedJobs] = useState(false)

  useEffect(() => {
    if (!settings) return
    setDraft(initFromSettings(settings))
    setHighlightChanges(false)
  }, [settings])

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

  // ----- Jobs helpers -----
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

  // ----- Location helpers -----
  function addAdditionalLocation() {
    setField('multiple_locations', true)
    replaceLocations([
      ...(draft?.locations || []),
      { id: uid(), name: '', active: true, track_jobs: false, jobs: [] },
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

    // If multi is OFF, force default to primary
    const default_location_id = draft.multiple_locations
      ? (draft.default_location_id ?? (primary ? primary.id : null)) ||
        primary.id
      : primary.id

    // Trim on save; drop truly empty jobs (but keep archived with names)
    const clean = {
      ...draft,
      default_location_id,
      locations: (draft.locations || []).map((l) => ({
        ...l,
        name: String(l.name || '').trim(),
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

  /* ---------- render ---------- */

  return (
    <div className="settings-panel" style={{ display: 'grid', gap: 12 }}>
      {loading && <div className="card">Loading...</div>}
      {error && (
        <div
          className="card"
          style={{ background: '#fee2e2', borderColor: '#fecaca' }}
        >
          Error: {error}
        </div>
      )}

      {!loading && draft && (
        <>
          {/* --- Global basics --- */}
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
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    padding: '6px 0',
                    ...(highlightChanges && changed('payout_mode')
                      ? { outline: '2px solid #fca5a5', outlineOffset: 2 }
                      : null),
                  }}
                >
                  <input
                    type="radio"
                    checked={draft.payout_mode === val}
                    onChange={() => setField('payout_mode', val)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="note" style={{ marginTop: 6 }}>
              Controls which inputs you see when logging a shift.
            </div>
          </div>

          <div className="two grid">
            <div className="card">
              <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
                Currency
              </div>
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
            </div>

            <div className="card">
              <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
                Calendar
              </div>
              <label className="field" style={{ marginBottom: 6 }}>
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

          <div className="two grid">
            <div className="card">
              <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
                Default tip-out % (optional)
              </div>
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
            </div>
            <div className="card">
              <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
                Shift form basics
              </div>
              <label
                className="checkbox"
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  padding: '6px 0',
                }}
              >
                <input
                  type="checkbox"
                  checked={!!draft.track_sales}
                  onChange={(e) => setField('track_sales', e.target.checked)}
                />
                <span>Track Sales</span>
              </label>
              <label
                className="checkbox"
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  padding: '6px 0',
                }}
              >
                <input
                  type="checkbox"
                  checked={!!draft.track_hours}
                  onChange={(e) => setField('track_hours', e.target.checked)}
                />
                <span>Track Hours</span>
              </label>
            </div>
          </div>

          {/* ---------- Section 1: Primary Location ---------- */}
          <div className="card">
            <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
              Primary location (required)
            </div>

            <label className="field" style={{ marginBottom: 8 }}>
              <span className="field-label">Location name</span>
              <input
                className="input"
                value={primary?.name || ''}
                onChange={(e) =>
                  updateLocation(primary.id, (l) => ({
                    ...l,
                    name: e.target.value,
                  }))
                }
                placeholder="e.g., Boardwalk Billy’s"
              />
            </label>

            <label
              className="checkbox"
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <input
                type="checkbox"
                checked={!!primary?.track_jobs}
                onChange={(e) =>
                  updateLocation(primary.id, (l) => ({
                    ...l,
                    track_jobs: e.target.checked,
                  }))
                }
              />
              <span>Track jobs at this location?</span>
            </label>

            {primary?.track_jobs && (
              <>
                <div
                  className="note"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>Jobs</span>
                  <div
                    style={{ display: 'flex', gap: 10, alignItems: 'center' }}
                  >
                    <label
                      className="checkbox"
                      style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                    >
                      <input
                        type="checkbox"
                        checked={showArchivedJobs}
                        onChange={(e) => setShowArchivedJobs(e.target.checked)}
                      />
                      <span>Show archived</span>
                    </label>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => addJob(primary.id)}
                    >
                      + Add job
                    </button>
                  </div>
                </div>

                <JobsList
                  jobs={primary.jobs || []}
                  readOnly={false}
                  showArchived={showArchivedJobs}
                  onChangeName={(jobId, name) =>
                    updateJob(primary.id, jobId, (j) => ({ ...j, name }))
                  }
                  onArchive={(jobId) => toggleArchiveJob(primary.id, jobId)}
                  onUnarchive={(jobId) => toggleArchiveJob(primary.id, jobId)}
                  onRemoveNew={(jobId) => removeJob(primary.id, jobId)}
                  onFinalizeNew={(jobId, name) =>
                    finalizeNewJob(primary.id, jobId, name)
                  }
                />
              </>
            )}
          </div>

          {/* ---------- Section 2: Multiple Locations ---------- */}
          <div className="card">
            <div className="h2" style={{ fontSize: 16, marginBottom: 8 }}>
              Multiple locations
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--muted-bg, #f8fafc)',
                border: '1px solid var(--card-border, #e5e7eb)',
                borderRadius: 10,
                padding: 12,
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontWeight: 600 }}>Track multiple locations?</div>
                <div className="note">
                  Turn on to add additional locations. You can choose a default
                  only when this is enabled.
                </div>
              </div>
              <label
                className="checkbox"
                style={{ display: 'flex', gap: 8, alignItems: 'center' }}
              >
                <input
                  type="checkbox"
                  checked={!!draft.multiple_locations}
                  onChange={(e) =>
                    setField('multiple_locations', e.target.checked)
                  }
                />
                <span>{draft.multiple_locations ? 'On' : 'Off'}</span>
              </label>
            </div>

            {draft.multiple_locations && (
              <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                {/* Default location (only when multi is ON) */}
                <label className="field">
                  <span className="field-label">Default location</span>
                  <select
                    className={`input ${highlightChanges && changed('default_location_id') ? 'field-changed' : ''}`}
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

                {/* Add / list */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn"
                    type="button"
                    onClick={addAdditionalLocation}
                  >
                    + Add location
                  </button>
                </div>

                {activeAdditional.length === 0 &&
                  archivedAdditional.length === 0 && (
                    <div className="note">No additional locations yet.</div>
                  )}

                {/* Active additional locations (editable) */}
                {activeAdditional.map((loc) => (
                  <AdditionalLocationCard
                    key={loc.id}
                    loc={loc}
                    readOnly={false}
                    showArchivedJobs={showArchivedJobs}
                    onChangeName={(v) =>
                      updateLocation(loc.id, (l) => ({ ...l, name: v }))
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

                {/* Archived additional locations (read-only; unarchive only) */}
                {archivedAdditional.length > 0 && (
                  <>
                    <div className="note" style={{ marginTop: 4 }}>
                      Archived locations
                    </div>
                    {archivedAdditional.map((loc) => (
                      <AdditionalLocationCard
                        key={loc.id}
                        loc={loc}
                        readOnly={true}
                        showArchivedJobs={true}
                        onChangeName={() => {}}
                        onToggleTrackJobs={() => {}}
                        onToggleArchive={() => toggleArchiveLocation(loc.id)} // Unarchive allowed
                        onAddJob={() => {}}
                        onChangeJob={() => {}}
                        onArchiveJob={() => {}}
                        onRemoveNewJob={() => {}}
                        onFinalizeNewJob={() => {}}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="settings-actions">
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
        </>
      )}
    </div>
  )
}

/* --------------- subcomponents --------------- */

function AdditionalLocationCard({
  loc,
  readOnly,
  showArchivedJobs,
  onChangeName,
  onToggleTrackJobs,
  onToggleArchive,
  onAddJob,
  onChangeJob,
  onArchiveJob,
  onRemoveNewJob,
  onFinalizeNewJob,
}) {
  const isArchived = !loc.active
  const disabled = readOnly || isArchived

  return (
    <div className="card" style={{ padding: 10, opacity: disabled ? 0.65 : 1 }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            value={loc.name}
            onChange={(e) => !disabled && onChangeName(e.target.value)}
            placeholder="Location name"
            disabled={disabled}
            style={{ flex: 1, fontSize: 14 }}
          />
          <button
            className={isArchived ? 'btn' : 'btn btn-danger'}
            type="button"
            onClick={onToggleArchive}
          >
            {isArchived ? 'Unarchive' : 'Archive'}
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <label
            className="checkbox"
            style={{ display: 'flex', gap: 8, alignItems: 'center' }}
          >
            <input
              type="checkbox"
              checked={!!loc.track_jobs}
              onChange={(e) => !disabled && onToggleTrackJobs(e.target.checked)}
              disabled={disabled}
            />
            <span>Track jobs at this location?</span>
          </label>
        </div>

        {loc.track_jobs && (
          <>
            <div
              className="note"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Jobs</span>
              {!disabled && (
                <button className="btn" type="button" onClick={onAddJob}>
                  + Add job
                </button>
              )}
            </div>

            <JobsList
              jobs={loc.jobs || []}
              readOnly={disabled}
              showArchived={showArchivedJobs}
              onChangeName={(jobId, name) => onChangeJob(jobId, name)}
              onArchive={(jobId) => onArchiveJob(jobId)}
              onUnarchive={(jobId) => onArchiveJob(jobId)}
              onRemoveNew={(jobId) => onRemoveNewJob(jobId)}
              onFinalizeNew={(jobId, name) => onFinalizeNewJob(jobId, name)}
            />
          </>
        )}
      </div>
    </div>
  )
}

/* ---- Jobs UI (with pending-create + duplicate guard) ---- */

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

function JobsList({
  jobs,
  readOnly,
  showArchived,
  onChangeName, // (jobId, name)
  onArchive, // (jobId)
  onUnarchive, // (jobId)
  onRemoveNew, // (jobId)
  onFinalizeNew, // (jobId, name)
}) {
  const active = jobs.filter((j) => j.active && !j._isNew)
  const pending = jobs.filter((j) => j._isNew)
  const archived = jobs.filter((j) => !j.active)

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {/* Pending new jobs (input + Save/Cancel) */}
      {pending.map((j) => (
        <JobRowNew
          key={j.id}
          job={j}
          allJobs={jobs}
          disabled={!!readOnly}
          onCancel={() => onRemoveNew?.(j.id)}
          onUnarchiveExisting={(archivedId) => onUnarchive?.(archivedId)}
          onSave={(name) => onFinalizeNew?.(j.id, name)}
        />
      ))}

      {/* Existing active jobs */}
      {active.map((j) => (
        <JobRowActive
          key={j.id}
          job={j}
          disabled={!!readOnly}
          onChangeName={(name) => onChangeName(j.id, name)}
          onArchive={() => onArchive(j.id)}
        />
      ))}

      {/* Archived chips */}
      {showArchived && archived.length > 0 && (
        <>
          <div className="note" style={{ marginTop: 2 }}>
            Archived jobs
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {archived.map((j) => (
              <JobChipArchived
                key={j.id}
                job={j}
                onUnarchive={() => onUnarchive(j.id)}
                disabled={!!readOnly}
              />
            ))}
          </div>
        </>
      )}

      {active.length === 0 &&
        pending.length === 0 &&
        (!showArchived || archived.length === 0) && (
          <div className="note">No jobs yet.</div>
        )}
    </div>
  )
}

/** New job row: requires Save; blocks duplicates; offers Unarchive */
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
    <div style={{ display: 'grid', gap: 6 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <input
          className="input"
          value={name}
          onChange={(e) => !disabled && setName(e.target.value)}
          placeholder="e.g., Server"
          disabled={disabled}
          style={{ fontSize: 14 }}
        />
        {matchesArchived ? (
          <button
            className="btn"
            type="button"
            onClick={() => onUnarchiveExisting?.(archivedMatch.id)}
            disabled={disabled}
            title="Unarchive existing job with this name"
          >
            Unarchive existing
          </button>
        ) : (
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => onSave?.(trimmed)}
            disabled={!canSave}
          >
            Save
          </button>
        )}
        <button
          className="btn secondary"
          type="button"
          onClick={onCancel}
          disabled={disabled}
        >
          Cancel
        </button>
      </div>

      {!trimmed && <div className="note">Enter a job name to save.</div>}
      {hasActiveDup && (
        <div className="note" style={{ color: '#b91c1c' }}>
          A job with this name already exists. Choose a different name.
        </div>
      )}
      {matchesArchived && (
        <div className="note" style={{ color: '#b45309' }}>
          This name exists in Archived. Click “Unarchive existing” to restore
          it.
        </div>
      )}
    </div>
  )
}

/** Existing active job row: input + red Archive */
function JobRowActive({ job, disabled, onChangeName, onArchive }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <input
        className="input"
        value={job.name}
        onChange={(e) => !disabled && onChangeName(e.target.value)}
        placeholder="e.g., Server"
        disabled={disabled}
        style={{ fontSize: 14 }}
      />
      <button
        className="btn btn-danger"
        type="button"
        onClick={onArchive}
        disabled={disabled}
        title="Archive job"
      >
        Archive
      </button>
    </div>
  )
}

/** Archived job chip: read-only label + Unarchive button */
function JobChipArchived({ job, onUnarchive, disabled }) {
  return (
    <div
      className="chip"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 999,
        border: '1px solid var(--card-border, #e5e7eb)',
        background: 'var(--muted-bg, #f8fafc)',
        fontSize: 13,
      }}
    >
      <span
        style={{
          color: '#6b7280',
          textDecoration: 'line-through',
          maxWidth: 220,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={job.name}
      >
        {job.name || '(untitled)'}
      </span>
      <button
        className="btn"
        type="button"
        onClick={onUnarchive}
        disabled={disabled}
        title="Unarchive job"
        style={{ padding: '2px 8px' }}
      >
        Unarchive
      </button>
    </div>
  )
}
