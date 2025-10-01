// pages/history.js
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '../lib/useUser'
import { useSettings } from '../lib/useSettings'
import { supabase } from '../lib/supabase'
import HeaderBar from '../ui/HeaderBar'
import TabBar from '../ui/TabBar'
import ShiftDetailsModal from '../ui/ShiftDetailsModal'

// Parse 'YYYY-MM-DD' as a local date (avoid UTC shift)
function parseDateOnlyLocal(s) {
  if (!s) return new Date(NaN)
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

const PAGE_SIZE = 5

export default function History() {
  const { user, loading } = useUser()
  const { settings } = useSettings()

  const [rows, setRows] = useState([])
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [fetching, setFetching] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  // ShiftDetails modal state
  const [selectedShift, setSelectedShift] = useState(null)

  // Currency/tip settings for the modal
  const currencyCode = settings?.currency || 'USD'
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [currencyCode],
  )
  const payoutMode = settings?.payout_mode || 'both'
  const showCashInput = payoutMode === 'both' || payoutMode === 'cash_only'
  const showCardInput = payoutMode === 'both' || payoutMode === 'card_only'
  const tipsOnPaycheck = payoutMode === 'on_paycheck'
  const defaultTipoutPct =
    typeof settings?.default_tipout_pct === 'number'
      ? settings.default_tipout_pct
      : null

  async function fetchRows(nextLimit = limit) {
    if (!user) return
    setFetching(true)
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .range(0, nextLimit - 1)

    if (!error) {
      setRows(data || [])
      // If we asked for N and got fewer, there's no more
      setHasMore((data || []).length === nextLimit)
    }
    setFetching(false)
  }

  useEffect(() => {
    if (!user) return
    fetchRows(limit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, limit])

  if (loading)
    return (
      <div className="container">
        <div className="card">Loading…</div>
      </div>
    )

  if (!user)
    return (
      <div className="page">
        <HeaderBar />
        <div className="container">
          <div className="card">
            Please <Link href="/login">sign in</Link> to view your history.
          </div>
        </div>
        <TabBar />
      </div>
    )

  // Handlers for the modal (edit/delete)
  async function saveEditedShiftById(shiftId, payload) {
    const { data, error } = await supabase
      .from('shifts')
      .update(payload)
      .eq('id', shiftId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      alert(error.message)
      return
    }
    // Update in place
    setRows((prev) => prev.map((r) => (r.id === data.id ? data : r)))
    setSelectedShift(data)
  }

  async function deleteShiftById(shiftId) {
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', shiftId)
      .eq('user_id', user.id)

    if (error) {
      alert(error.message)
      return
    }
    setRows((prev) => prev.filter((r) => r.id !== shiftId))
    setSelectedShift(null)
    // If we deleted and now have fewer than the limit, try to backfill one more
    // so the page still shows up to `limit` rows if available.
    fetchRows(limit)
  }

  return (
    <div className="page">
      <HeaderBar />
      <div className="container">
        <div className="card">
          <div className="h1">History</div>

          {rows.length === 0 && <div className="note">No shifts yet.</div>}

          {rows.map((r) => {
            const net =
              Number(r.cash_tips || 0) +
              Number(r.card_tips || 0) -
              Number(r.tip_out_total || 0)
            const eff = Number(r.hours || 0) > 0 ? net / Number(r.hours) : 0
            return (
              <div
                key={r.id}
                className="card"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedShift(r)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSelectedShift(r)
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="h2">
                  {parseDateOnlyLocal(r.date).toLocaleDateString()}
                </div>
                <div>
                  Net {currencyFormatter.format(net)} ·{' '}
                  {Number(r.hours || 0).toFixed(2)}h ·{' '}
                  {currencyFormatter.format(eff)}/h
                </div>
                {r.notes && (
                  <div className="note" style={{ marginTop: 6 }}>
                    {r.notes}
                  </div>
                )}
              </div>
            )
          })}

          {/* Load more */}
          {rows.length > 0 && hasMore && (
            <div style={{ marginTop: 12 }}>
              <button
                className="btn"
                onClick={() => setLimit((n) => n + PAGE_SIZE)}
                disabled={fetching}
              >
                {fetching ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </div>
      <TabBar />

      {/* Shift Details Modal */}
      {selectedShift && (
        <ShiftDetailsModal
          shift={selectedShift}
          onClose={() => setSelectedShift(null)}
          onSave={(payload) => saveEditedShiftById(selectedShift.id, payload)}
          onDelete={() => deleteShiftById(selectedShift.id)}
          currencyFormatter={currencyFormatter}
          tipsOnPaycheck={tipsOnPaycheck}
          showCashInput={showCashInput}
          showCardInput={showCardInput}
          defaultTipoutPct={defaultTipoutPct}
        />
      )}
    </div>
  )
}
