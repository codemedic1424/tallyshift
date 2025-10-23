import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { useUser } from '../lib/useUser'
import HeaderBar from '../ui/HeaderBar'
import TabBar from '../ui/TabBar'

export default function Log() {
  const { user, loading } = useUser()
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState('')
  const [sales, setSales] = useState('')
  const [cash, setCash] = useState('')
  const [card, setCard] = useState('')
  const [tipOut, setTipOut] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const net = Number(cash || 0) + Number(card || 0) - Number(tipOut || 0) || 0
  const eff = Number(hours || 0) > 0 ? net / Number(hours) : 0

  async function save() {
    if (!user) {
      alert('Please sign in first.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('shifts').insert({
      user_id: user.id,
      date,
      hours: Number(hours || 0),
      sales: Number(sales || 0),
      cash_tips: Number(cash || 0),
      card_tips: Number(card || 0),
      tip_out_total: Number(tipOut || 0),
      notes,
    })
    setSaving(false)
    if (error) alert(error.message)
    else {
      alert('Shift saved')
      setHours('')
      setSales('')
      setCash('')
      setCard('')
      setTipOut('')
      setNotes('')
    }
  }

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
            You need to <Link href="/login">sign in</Link> to log shifts.
          </div>
        </div>
        <TabBar />
      </div>
    )

  return (
    <div className="page">
      <HeaderBar />
      <div className="container">
        <div className="card">
          <div className="h1">Quick Log</div>
          <div className="grid">
            <label>
              Date
              <br />
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              Hours
              <br />
              <input
                className="input"
                inputMode="decimal"
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </label>
            <div className="two grid">
              <label>
                Cash
                <br />
                <input
                  className="input"
                  inputMode="decimal"
                  type="number"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                />
              </label>
              <label>
                Card
                <br />
                <input
                  className="input"
                  inputMode="decimal"
                  type="number"
                  value={card}
                  onChange={(e) => setCard(e.target.value)}
                />
              </label>
            </div>
            <label>
              Sales
              <br />
              <input
                className="input"
                inputMode="decimal"
                type="number"
                value={sales}
                onChange={(e) => setSales(e.target.value)}
              />
            </label>
            <label>
              Tip-out total
              <br />
              <input
                className="input"
                inputMode="decimal"
                type="number"
                value={tipOut}
                onChange={(e) => setTipOut(e.target.value)}
              />
            </label>
            <label>
              Notes
              <br />
              <textarea
                className="input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <button className="btn" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <div className="note">
              Net: ${net.toFixed(2)} · Effective hourly: ${eff.toFixed(2)}/h
            </div>
          </div>
        </div>
      </div>
      <TabBar />
    </div>
  )
}
