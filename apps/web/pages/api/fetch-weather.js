// pages/api/fetch-weather.js
export default async function handler(req, res) {
  try {
    const method = req.method.toUpperCase()
    if (method !== 'GET' && method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
    }

    // Accept both GET (query) and POST (body)
    const src = method === 'GET' ? req.query : req.body || {}
    const lat = parseFloat(src.lat)
    const lon = parseFloat(src.lon)
    const dateStr = String(src.date || '').slice(0, 10) // YYYY-MM-DD

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ) {
      return res
        .status(400)
        .json({ ok: false, error: 'Missing or invalid lat/lon/date' })
    }

    // Only capture past dates (ignore today/future)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const reqDate = new Date(dateStr + 'T00:00:00')
    if (!(reqDate instanceof Date) || isNaN(reqDate)) {
      return res.status(400).json({ ok: false, error: 'Invalid date' })
    }
    if (reqDate > today) {
      return res.status(200).json({
        ok: true,
        snapshot: null,
        reason: 'Date is in the future; skipping weather snapshot.',
      })
    }

    // Open-Meteo archive API: daily temps, precipitation, and weathercode
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      start_date: dateStr,
      end_date: dateStr,
      daily:
        'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode',
      timezone: 'auto',
    })

    const url = `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`
    const r = await fetch(url)
    if (!r.ok) {
      return res.status(502).json({
        ok: false,
        error: 'Upstream weather API error',
        status: r.status,
      })
    }
    const data = await r.json()

    // Validate shape
    const d = data?.daily
    if (!d || !Array.isArray(d.time) || d.time.length === 0) {
      return res
        .status(200)
        .json({ ok: true, snapshot: null, reason: 'No data for that date' })
    }

    const idx = 0 // single day
    const tMinC = num(d.temperature_2m_min?.[idx])
    const tMaxC = num(d.temperature_2m_max?.[idx])
    const precipMm = num(d.precipitation_sum?.[idx])
    const code = d.weathercode?.[idx]

    const tAvgC = avgNum(tMinC, tMaxC)
    const snapshot = {
      date: dateStr,
      lat,
      lon,
      t_min_c: tMinC,
      t_max_c: tMaxC,
      t_avg_c: tAvgC,
      t_min_f: cToF(tMinC),
      t_max_f: cToF(tMaxC),
      t_avg_f: cToF(tAvgC),
      precip_mm: precipMm,
      precip_in: mmToIn(precipMm),
      weathercode: typeof code === 'number' ? code : null,
      summary: weatherCodeSummary(code),
    }

    return res.status(200).json({ ok: true, snapshot })
  } catch (err) {
    console.error('fetch-weather error', err)
    return res.status(500).json({ ok: false, error: 'Internal error' })
  }
}

function num(x) {
  return typeof x === 'number' && isFinite(x) ? x : null
}
function avgNum(a, b) {
  if (a == null && b == null) return null
  if (a == null) return b
  if (b == null) return a
  return (a + b) / 2
}
function cToF(c) {
  return c == null ? null : +((c * 9) / 5 + 32).toFixed(1)
}
function mmToIn(mm) {
  return mm == null ? null : +(mm / 25.4).toFixed(2)
}

// Minimal mapping based on WMO weather codes used by Open-Meteo
function weatherCodeSummary(code) {
  switch (code) {
    case 0:
      return 'Clear'
    case 1:
    case 2:
    case 3:
      return 'Partly cloudy'
    case 45:
    case 48:
      return 'Fog'
    case 51:
    case 53:
    case 55:
      return 'Drizzle'
    case 56:
    case 57:
      return 'Freezing drizzle'
    case 61:
    case 63:
    case 65:
      return 'Rain'
    case 66:
    case 67:
      return 'Freezing rain'
    case 71:
    case 73:
    case 75:
      return 'Snow'
    case 77:
      return 'Snow grains'
    case 80:
    case 81:
    case 82:
      return 'Rain showers'
    case 85:
    case 86:
      return 'Snow showers'
    case 95:
      return 'Thunderstorm'
    case 96:
    case 99:
      return 'Thunderstorm w/ hail'
    default:
      return code == null ? 'Unknown' : `Code ${code}`
  }
}
