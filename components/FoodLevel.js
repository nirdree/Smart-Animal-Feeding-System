export default function FoodLevel({ distance = 15, maxDistance = 30 }) {
  // distance > maxDistance = empty, distance small = full
  const fillPct = Math.max(0, Math.min(100, ((maxDistance - distance) / maxDistance) * 100))
  const isLow = fillPct < 30
  const isCritical = fillPct < 15

  const fillColor = isCritical ? '#ff0080' : isLow ? '#ff6b00' : '#39ff14'

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 80, height: 160 }}>
        {/* Bottle shape SVG */}
        <svg width="80" height="160" viewBox="0 0 80 160">
          {/* Bottle cap */}
          <rect x="28" y="0" width="24" height="16" rx="4"
            fill="rgba(0,245,255,0.2)" stroke="rgba(0,245,255,0.4)" strokeWidth="1" />

          {/* Bottle neck */}
          <path d="M28 14 L22 40 L58 40 L52 14 Z"
            fill="rgba(10,22,40,0.9)" stroke="rgba(0,245,255,0.3)" strokeWidth="1" />

          {/* Bottle body outline */}
          <rect x="10" y="38" width="60" height="110" rx="10"
            fill="rgba(10,22,40,0.7)" stroke="rgba(0,245,255,0.3)" strokeWidth="1" />

          {/* Fill level (animated) */}
          <clipPath id="bottle-clip">
            <rect x="11" y="39" width="58" height="108" rx="9" />
          </clipPath>
          <rect
            x="11"
            y={39 + 108 * (1 - fillPct / 100)}
            width="58"
            height={108 * (fillPct / 100)}
            fill={fillColor}
            opacity="0.7"
            clipPath="url(#bottle-clip)"
            style={{ transition: 'all 0.8s cubic-bezier(0.4,0,0.2,1)' }}
          />

          {/* Wave effect inside */}
          {fillPct > 5 && (
            <g clipPath="url(#bottle-clip)">
              <path
                d={`M11 ${39 + 108 * (1 - fillPct / 100)} 
                    Q 25 ${39 + 108 * (1 - fillPct / 100) - 8} 
                    40 ${39 + 108 * (1 - fillPct / 100)} 
                    Q 55 ${39 + 108 * (1 - fillPct / 100) + 8} 
                    69 ${39 + 108 * (1 - fillPct / 100)} 
                    L 69 ${39 + 108} L 11 ${39 + 108} Z`}
                fill={fillColor}
                opacity="0.3"
                style={{ animation: 'wave 3s ease-in-out infinite' }}
              />
            </g>
          )}

          {/* Glow overlay */}
          <rect x="10" y="38" width="60" height="110" rx="10"
            fill="url(#bottle-shine)" />
          <defs>
            <linearGradient id="bottle-shine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="30%" stopColor="rgba(255,255,255,0.02)" />
              <stop offset="70%" stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
            </linearGradient>
          </defs>

          {/* Percentage text */}
          <text x="40" y="100" textAnchor="middle"
            fill="white" fontSize="14" fontFamily="Orbitron, monospace" fontWeight="700"
            opacity="0.9">
            {fillPct.toFixed(0)}%
          </text>
        </svg>

        {/* Glow effect */}
        {isLow && (
          <div
            className="absolute inset-0 rounded-xl alert-pulse"
            style={{
              background: `radial-gradient(circle, ${fillColor}30 0%, transparent 70%)`,
              filter: 'blur(8px)',
            }}
          />
        )}
      </div>

      <div className="text-center">
        <div className="font-orbitron text-xs tracking-widest mb-1"
          style={{ color: fillColor, textShadow: `0 0 8px ${fillColor}` }}>
          {isCritical ? '⚠ CRITICAL' : isLow ? '⚠ LOW' : 'NORMAL'}
        </div>
        <div className="font-rajdhani text-xs tracking-widest uppercase"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          Food Level
        </div>
        <div className="font-rajdhani text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {distance.toFixed(1)} cm
        </div>
      </div>

      <style jsx>{`
        @keyframes wave {
          0%, 100% { d: path('M11 95 Q 25 87 40 95 Q 55 103 69 95 L 69 147 L 11 147 Z'); }
          50% { d: path('M11 99 Q 25 91 40 99 Q 55 107 69 99 L 69 147 L 11 147 Z'); }
        }
      `}</style>
    </div>
  )
}
