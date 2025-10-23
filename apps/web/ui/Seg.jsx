// ui/Seg.jsx
import React, { useState, useEffect, useRef } from 'react'

export default function Seg({
  value,
  onChange,
  options,
  compact = false,
  color = '#2563eb', // default accent (blue)
}) {
  const [indicatorStyle, setIndicatorStyle] = useState({})
  const containerRef = useRef(null)

  // Animate indicator whenever value changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const activeBtn = container.querySelector(`button[data-value="${value}"]`)
    if (activeBtn) {
      const { offsetLeft, offsetWidth } = activeBtn
      setIndicatorStyle({
        left: offsetLeft,
        width: offsetWidth,
        transition: 'all 0.35s cubic-bezier(.25,1.25,.5,1)',
      })
    }
  }, [value, options])

  return (
    <div
      ref={containerRef}
      className={`seg ${compact ? 'compact' : ''}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        background: '#f3f4f6',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 999,
        padding: compact ? 3 : 4,
        overflow: 'hidden',
      }}
    >
      {/* Sliding background indicator */}
      <div
        className="seg-indicator"
        style={{
          position: 'absolute',
          top: compact ? 2 : 3,
          bottom: compact ? 2 : 3,
          borderRadius: 999,
          background: color,
          boxShadow: `0 2px 6px ${color}40`,
          ...indicatorStyle,
        }}
      />

      {/* Buttons */}
      {options.map((opt) => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            data-value={opt.value}
            onClick={() => onChange(opt.value)}
            className={isActive ? 'active' : ''}
            style={{
              position: 'relative',
              border: 'none',
              background: 'transparent',
              color: isActive ? '#fff' : '#374151',
              fontWeight: 600,
              fontSize: compact ? 13 : 14,
              borderRadius: 999,
              padding: compact ? '6px 10px' : '8px 14px',
              cursor: 'pointer',
              zIndex: 2,
              transform: isActive ? 'scale(1.05)' : 'scale(1)',
              opacity: isActive ? 1 : 0.8,
              transition:
                'color 0.25s ease, transform 0.35s cubic-bezier(.25,1.25,.5,1), opacity 0.25s ease',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
