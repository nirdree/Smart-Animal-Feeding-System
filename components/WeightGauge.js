import { useEffect, useRef } from 'react'

export default function WeightGauge({ weight = 0, target = 50 }) {
  const pct = Math.min((weight / target) * 100, 100)
  const radius = 80
  const stroke = 10
  const normalizedRadius = radius - stroke / 2
  const circumference = 2 * Math.PI * normalizedRadius
  // Only go 270 degrees (from 135deg to 405deg / -225deg)
  const arcLength = circumference * 0.75
  const dashOffset = arcLength - (pct / 100) * arcLength

  const colorByPct = pct >= 80 ? '#39ff14' : pct >= 40 ? '#00f5ff' : '#ff6b00'

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 200, height: 200 }}>
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 135deg, ${colorByPct}22 0deg, transparent ${pct * 2.7}deg, transparent 360deg)`,
            filter: 'blur(12px)',
          }}
        />

        <svg width="200" height="200" viewBox="0 0 200 200">
          {/* Background arc */}
          <circle
            cx="100" cy="100" r={normalizedRadius}
            fill="none"
            stroke="rgba(0,245,255,0.08)"
            strokeWidth={stroke}
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform="rotate(135 100 100)"
          />

          {/* Tick marks */}
          {Array.from({ length: 11 }).map((_, i) => {
            const angle = 135 + (i / 10) * 270
            const rad = (angle * Math.PI) / 180
            const x1 = 100 + (radius - 2) * Math.cos(rad)
            const y1 = 100 + (radius - 2) * Math.sin(rad)
            const x2 = 100 + (radius - (i % 5 === 0 ? 14 : 8)) * Math.cos(rad)
            const y2 = 100 + (radius - (i % 5 === 0 ? 14 : 8)) * Math.sin(rad)
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={i % 5 === 0 ? 'rgba(0,245,255,0.6)' : 'rgba(0,245,255,0.2)'}
                strokeWidth={i % 5 === 0 ? 2 : 1} strokeLinecap="round" />
            )
          })}

          {/* Active arc */}
          <circle
            cx="100" cy="100" r={normalizedRadius}
            fill="none"
            stroke={colorByPct}
            strokeWidth={stroke}
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(135 100 100)"
            style={{
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease',
              filter: `drop-shadow(0 0 6px ${colorByPct})`,
            }}
          />

          {/* Center value */}
          <text x="100" y="90" textAnchor="middle"
            fill={colorByPct} fontSize="32" fontFamily="Orbitron, monospace" fontWeight="700"
            style={{ filter: `drop-shadow(0 0 8px ${colorByPct})` }}>
            {weight.toFixed(1)}
          </text>
          <text x="100" y="110" textAnchor="middle"
            fill="rgba(255,255,255,0.4)" fontSize="11" fontFamily="Rajdhani, sans-serif" letterSpacing="3">
            GRAMS
          </text>
          <text x="100" y="130" textAnchor="middle"
            fill="rgba(0,245,255,0.5)" fontSize="9" fontFamily="Rajdhani, sans-serif" letterSpacing="2">
            TARGET: {target}g
          </text>
        </svg>

        {/* Inner glow */}
        <div
          className="absolute"
          style={{
            top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 60, height: 60,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${colorByPct}15 0%, transparent 70%)`,
            filter: 'blur(8px)',
          }}
        />
      </div>

      <div className="flex items-center gap-2 mt-2">
        <div className="w-2 h-2 rounded-full" style={{ background: colorByPct, boxShadow: `0 0 8px ${colorByPct}` }} />
        <span className="font-rajdhani text-sm tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Bowl Weight
        </span>
      </div>
    </div>
  )
}
