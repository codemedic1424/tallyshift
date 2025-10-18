import { useEffect, useRef, useState } from 'react'

export default function AddressAutocomplete({
  value,
  onChangeAddress,
  onSetCoords,
  disabled,
  placeholder = 'Start typing your address…',
}) {
  const inputRef = useRef(null)
  const [localValue, setLocalValue] = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [service, setService] = useState(null)
  const [placesService, setPlacesService] = useState(null)
  const [coords, setCoords] = useState(null)
  const [isLocked, setIsLocked] = useState(false)
  const [focused, setFocused] = useState(false) // NEW

  // Keep local value in sync with parent (❗️do NOT unlock here)
  useEffect(() => {
    setLocalValue(value || '')
  }, [value])

  // Initialize Google Places
  useEffect(() => {
    if (!window.google || !window.google.maps?.places) return
    setService(new window.google.maps.places.AutocompleteService())
    setPlacesService(
      new window.google.maps.places.PlacesService(
        document.createElement('div'),
      ),
    )
  }, [])

  // Fetch predictions while typing (only if focused & not locked)
  useEffect(() => {
    if (!service || !localValue || isLocked || !focused) {
      setSuggestions([])
      return
    }
    service.getPlacePredictions(
      { input: localValue, types: ['geocode'] },
      (preds) => setSuggestions(preds || []),
    )
  }, [localValue, service, isLocked, focused])

  const handleSelect = (prediction) => {
    if (!placesService) return
    setIsLocked(true)
    setFocused(false)
    setSuggestions([])

    placesService.getDetails(
      { placeId: prediction.place_id },
      (place, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK) return

        const lat = Number(place.geometry.location.lat())
        const lon = Number(place.geometry.location.lng())
        const formatted = place.formatted_address

        console.log('📍 Selected verified address:', formatted)

        // ✅ Fill input with verified full address
        setLocalValue(formatted)

        // ✅ Send full address to parent
        onChangeAddress?.(formatted)

        // ✅ Send coords and formatted together
        onSetCoords?.({ lat, lon, formatted })

        // ✅ Store local coords for feedback UI
        setCoords({ lat, lon })

        // Prevent reopening dropdown
        requestAnimationFrame(() => inputRef.current?.blur())
      },
    )
  }

  // Hide dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.parentNode.contains(e.target)) {
        setSuggestions([])
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div style={{ position: 'relative', display: 'grid', gap: 6 }}>
      <input
        ref={inputRef}
        className="input"
        type="text"
        value={localValue}
        onFocus={() => setFocused(true)} // NEW
        onBlur={() => setTimeout(() => setFocused(false), 0)} // NEW (let onMouseDown fire first)
        onChange={(e) => {
          const val = e.target.value
          setLocalValue(val)
          setIsLocked(false)
          if (!val) setSuggestions([])
          // ❌ Do NOT call onChangeAddress here — wait until user picks from dropdown
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />

      {/* Dropdown only when focused & not locked */}
      {suggestions.length > 0 && focused && !isLocked && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 8,
            marginTop: 2,
            zIndex: 20,
            listStyle: 'none',
            padding: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            maxHeight: 180,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              onMouseDown={(e) => {
                e.preventDefault() // keep input from blurring before select
                handleSelect(s)
              }}
              style={{ padding: '10px 12px', cursor: 'pointer' }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = '#f3f4f6')
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
            >
              {s.description}
            </li>
          ))}
        </ul>
      )}

      {coords && (
        <div
          style={{
            fontSize: 12,
            color: '#16a34a',
            background: '#ecfdf5',
            padding: '4px 8px',
            borderRadius: 6,
          }}
        >
          ✅ Coordinates captured: {coords.lat.toFixed(5)},{' '}
          {coords.lon.toFixed(5)}
        </div>
      )}
    </div>
  )
}
