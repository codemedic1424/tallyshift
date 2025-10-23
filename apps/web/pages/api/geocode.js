// pages/api/geocode.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { address } = req.body || {}
  if (!address) return res.status(400).json({ error: 'Missing address' })

  // Nominatim / OpenStreetMap — low volume only; server-side; include UA
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', address)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'TallyShift/1.0 (support@yourdomain.example)' },
  })
  if (!resp.ok) return res.status(502).json({ error: 'Geocoding failed' })

  const [hit] = await resp.json()
  if (!hit) return res.status(200).json({ ok: true, found: false })
  return res.status(200).json({
    ok: true,
    found: true,
    lat: Number(hit.lat),
    lon: Number(hit.lon),
    display_name: hit.display_name,
  })
}
