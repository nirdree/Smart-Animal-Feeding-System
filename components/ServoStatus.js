import { useEffect, useState } from 'react'

export default function ServoStatus({ isOpen = false }) {
  const [angle, setAngle] = useState(isOpen ? 90 : 0)

  useEffect(() => {
    setAngle(isOpen ? 90 : 0)
  }, [isOpen])

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: 120, height: 120 }}>
        {/* Servo body */}
        <svg width="120" height="120" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle cx="60" cy="60" r="54"
            fill="rgba(10,22,40,0.8)"
            stroke="rgba(0,245,255,0.2)"
            strokeWidth="1"
          />

          {/* Degree marks */}
          {Array.from({ length: 19 }).map((_, i) => {
            const deg = i * 10
            const rad = ((deg - 90) * Math.PI) / 180
            const r1 = 46, r2 = deg % 30 === 0 ? 36 : 40
            return (
              <line key={i}
                x1={60 + r1 * Math.cos(rad)} y1={60 + r1 * Math.sin(rad)}
                x2={60 + r2 * Math.cos(rad)} y2={60 + r2 * Math.sin(rad)}
                stroke={deg % 30 === 0 ? 'rgba(0,245,255,0.5)' : 'rgba(0,245,255,0.2)'}
                strokeWidth={deg % 30 === 0 ? 2 : 1}
              />
            )
          })}

          {/* 0deg label */}
          <text x="60" y="22" textAnchor="middle"
            fill="rgba(0,245,255,0.5)" fontSize="8" fontFamily="Orbitron">0°</text>
          {/* 90deg label */}
          <text x="100" y="64" textAnchor="start"
            fill="rgba(0,245,255,0.5)" fontSize="8" fontFamily="Orbitron">90°</text>

          {/* Servo arm */}
          <g transform={`rotate(${angle} 60 60)`}
            style={{ transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)' }}>
            <line x1="60" y1="60" x2="60" y2="20"
              stroke={isOpen ? '#ff6b00' : '#00f5ff'}
              strokeWidth="4"
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 4px ${isOpen ? '#ff6b00' : '#00f5ff'})`,
                transition: 'stroke 0.3s ease',
              }}
            />
            <circle cx="60" cy="20" r="5"
              fill={isOpen ? '#ff6b00' : '#00f5ff'}
              style={{ filter: `drop-shadow(0 0 6px ${isOpen ? '#ff6b00' : '#00f5ff'})` }}
            />
          </g>

          {/* Center hub */}
          <circle cx="60" cy="60" r="8"
            fill="rgba(0,245,255,0.2)"
            stroke="rgba(0,245,255,0.6)"
            strokeWidth="2"
          />
          <circle cx="60" cy="60" r="3"
            fill={isOpen ? '#ff6b00' : '#00f5ff'}
            style={{ filter: `drop-shadow(0 0 4px ${isOpen ? '#ff6b00' : '#00f5ff'})` }}
          />
        </svg>
      </div>

      <div className="text-center">
        <div className="font-orbitron text-sm tracking-widest mb-1"
          style={{
            color: isOpen ? '#ff6b00' : '#00f5ff',
            textShadow: `0 0 8px ${isOpen ? '#ff6b00' : '#00f5ff'}`,
          }}>
          {isOpen ? 'OPEN' : 'CLOSED'}
        </div>
        <div className="font-rajdhani text-xs tracking-widest uppercase"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          Servo • {angle}°
        </div>
      </div>
    </div>
  )
}
