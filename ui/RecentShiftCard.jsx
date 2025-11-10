// ui/RecentShiftCard.jsx
import { useMemo } from 'react'
import { useSettings } from '../lib/useSettings'

function parseDateOnlyLocal(s) {
  if (!s) return new Date(NaN)
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export default function RecentShiftCard({ shift, currencyFormatter }) {
  const { settings } = useSettings()

  if (!shift) return null

  const trackDiscounts = !!settings?.track_discounts
  const tipoutEnabled = !!settings?.default_tipout_enabled
  const payoutMode = settings?.payout_mode || 'both'
  const tipsOnPaycheck = payoutMode === 'on_paycheck'
  const showCashInput =
    !tipsOnPaycheck && (payoutMode === 'both' || payoutMode === 'cash_only')
  const showCardInput =
    !tipsOnPaycheck && (payoutMode === 'both' || payoutMode === 'card_only')
  const multipleLocations = !!settings?.multiple_locations

  const activeLocations = useMemo(
    () => (settings?.locations || []).filter((l) => l?.active),
    [settings?.locations],
  )
  const currentLocation =
    activeLocations.find((l) => l.id === (shift.location_id || null)) || null

  const locationTracksJobs = !!currentLocation?.track_jobs
  const activeJobsForLocation = useMemo(
    () => (currentLocation?.jobs || []).filter((j) => j.active),
    [currentLocation],
  )
  const jobName = locationTracksJobs
    ? activeJobsForLocation.find((j) => j.id === shift.job_type_id)?.name || '—'
    : null

  const net =
    Number(shift.cash_tips || 0) +
    Number(shift.card_tips || 0) -
    Number(shift.tip_out_total || 0)

  const eff = Number(shift.hours || 0) > 0 ? net / Number(shift.hours) : 0

  const tipPct =
    Number(shift.sales || 0) > 0
      ? (
          ((Number(shift.cash_tips || 0) +
            Number(shift.card_tips || 0) -
            Number(shift.tip_out_total || 0)) /
            Number(shift.sales)) *
          100
        ).toFixed(1)
      : null

  return (
    <div className="recent-shift-card">
      <div className="rsc-head">
        <div className="rsc-title">
          Most recent shift ·{' '}
          {parseDateOnlyLocal(shift.date).toLocaleDateString()}
        </div>
      </div>

      {/* KPI row */}
      <div className="rsc-kpis">
        <div>
          <div className="note">Net</div>
          <div className="h2">{currencyFormatter.format(net)}</div>
        </div>
        <div>
          <div className="note">Hours</div>
          <div className="h2">{Number(shift.hours || 0).toFixed(2)}</div>
        </div>
        <div>
          <div className="note">Hourly</div>
          <div className="h2">{currencyFormatter.format(eff)} /h</div>
        </div>
      </div>

      {/* Weather snapshot */}
      {shift?.weather_snapshot && (
        <div className="rsc-weather">
          <div className="weather-left">
            <div className="emoji">
              {(() => {
                const code = shift.weather_snapshot.weathercode
                if (code === 0) return '☀️'
                if ([1, 2, 3].includes(code)) return '⛅'
                if ([45, 48].includes(code)) return '🌫️'
                if ([61, 63, 65, 80, 81, 82].includes(code)) return '🌧️'
                if ([71, 73, 75, 77, 85, 86].includes(code)) return '🌨️'
                if ([95, 96, 99].includes(code)) return '⛈️'
                return '🌤️'
              })()}
            </div>
            <div className="weather-main">
              <div className="temp">
                {shift.weather_snapshot.t_avg_f != null
                  ? `${Math.round(shift.weather_snapshot.t_avg_f)}°`
                  : shift.weather_snapshot.t_max_f != null &&
                      shift.weather_snapshot.t_min_f != null
                    ? `${Math.round(shift.weather_snapshot.t_min_f)}° / ${Math.round(
                        shift.weather_snapshot.t_max_f,
                      )}°`
                    : null}
              </div>
              <div className="label">
                {shift.weather_snapshot.summary || 'Weather'}
              </div>
            </div>
          </div>
          <div className="weather-right">
            {shift.weather_snapshot.precip_in > 0 && (
              <div className="precip">
                💧 {shift.weather_snapshot.precip_in.toFixed(2)} in
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fields */}
      <div className="rsc-fields">
        <div className="field-row">
          <span>Location</span>
          <b>
            {currentLocation?.name || (multipleLocations ? '—' : '(default)')}
          </b>
        </div>

        {locationTracksJobs && (
          <div className="field-row">
            <span>Job</span>
            <b>{jobName}</b>
          </div>
        )}

        {settings?.track_sections &&
          Array.isArray(shift.sections) &&
          shift.sections.length > 0 && (
            <div className="field-row">
              <span>Sections</span>
              <b>{shift.sections.join(', ')}</b>
            </div>
          )}

        {settings?.track_tags &&
          Array.isArray(shift.tags) &&
          shift.tags.length > 0 && (
            <div className="field-row" style={{ alignItems: 'flex-start' }}>
              <span style={{ paddingTop: 2 }}>Tags</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {shift.tags.map((tag) => (
                  <div
                    key={tag.name}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: tag.color || '#c7d2fe',
                      border: '1px solid rgba(0,0,0,0.08)',
                      color: '#1f2937',
                      fontSize: 13,
                    }}
                  >
                    <span>{tag.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        {settings?.track_sales && (
          <div className="field-row">
            <span>Sales</span>
            <b>{currencyFormatter.format(Number(shift.sales || 0))}</b>
          </div>
        )}

        {showCashInput && (
          <div className="field-row">
            <span>Cash Tips</span>
            <b>{currencyFormatter.format(Number(shift.cash_tips || 0))}</b>
          </div>
        )}

        {showCardInput && (
          <div className="field-row">
            <span>Card Tips</span>
            <b>{currencyFormatter.format(Number(shift.card_tips || 0))}</b>
          </div>
        )}

        {tipoutEnabled && (
          <div className="field-row">
            <span>Tip-out</span>
            <b>{currencyFormatter.format(Number(shift.tip_out_total || 0))}</b>
          </div>
        )}

        {tipPct && (
          <div className="tip-pct">
            <span>Est. Tip %</span>
            <span className="pct">{tipPct}%</span>
          </div>
        )}
      </div>

      {trackDiscounts && (
        <div className="field-row">
          <span>Discounts</span>
          <b>{currencyFormatter.format(Number(shift.discount_total || 0))}</b>
        </div>
      )}

      {shift.notes && (
        <div className="rsc-notes">
          <div className="note-label">Notes</div>
          <div className="note-text">{shift.notes}</div>
        </div>
      )}

      <style jsx>{`
        .recent-shift-card {
          background: #fff;
          border: 1px solid #eee;
          border-radius: 16px;
          padding: 14px;
          display: grid;
          gap: 12px;
        }
        .rsc-title {
          font-weight: 700;
          font-size: 16px;
        }
        .rsc-kpis {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          background: #f9fafb;
          border-radius: 12px;
          padding: 10px 6px;
          text-align: center;
          gap: 8px;
        }
        .note {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .h2 {
          font-size: 18px;
          font-weight: 800;
        }
        .field-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid #f0f0f0;
          font-size: 14px;
        }
        .rsc-notes {
          background: #f9fafb;
          border-radius: 10px;
          padding: 10px;
        }
        .note-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 6px;
        }
        .tip-pct {
          margin-top: 8px;
          padding: 8px 12px;
          border-radius: 8px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 500;
        }
        .tip-pct .pct {
          font-weight: 800;
          color: #16a34a;
        }
        .rsc-weather {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
          border-radius: 12px;
          padding: 10px 14px;
          gap: 10px;
        }
        .weather-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .weather-main {
          display: grid;
          gap: 2px;
        }
        .weather-main .temp {
          font-weight: 700;
          font-size: 16px;
          color: #111827;
        }
        .weather-main .label {
          font-size: 13px;
          color: #374151;
        }
        .weather-right {
          font-size: 13px;
          color: #374151;
          white-space: nowrap;
        }
        .emoji {
          font-size: 22px;
          line-height: 1;
        }
      `}</style>
    </div>
  )
}
