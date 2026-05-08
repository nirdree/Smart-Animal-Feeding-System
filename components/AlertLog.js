export default function AlertLog({ alerts = [] }) {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 py-4">
        <div className="w-2 h-2 rounded-full" style={{ background: '#39ff14', boxShadow: '0 0 6px #39ff14' }} />
        <span className="font-rajdhani text-sm tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
          All systems nominal
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
      {alerts.map((alert, i) => {
        const isLow = alert.message?.toLowerCase().includes('low')
        const isComplete = alert.message?.toLowerCase().includes('complete')
        const color = isComplete ? '#39ff14' : isLow ? '#ff6b00' : '#00f5ff'

        return (
          <div key={i}
            className="flex items-start gap-3 p-2 rounded-lg"
            style={{
              background: `rgba(${isComplete ? '57,255,20' : isLow ? '255,107,0' : '0,245,255'},0.05)`,
              border: `1px solid rgba(${isComplete ? '57,255,20' : isLow ? '255,107,0' : '0,245,255'},0.15)`,
              animation: i === 0 ? 'fadeIn 0.3s ease' : 'none',
            }}>
            <div className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
            <div className="flex-1 min-w-0">
              <p className="font-rajdhani text-sm font-semibold" style={{ color }}>
                {alert.message}
              </p>
              <p className="font-rajdhani text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {alert.time ? new Date(alert.time).toLocaleTimeString() : '--'}
              </p>
            </div>
          </div>
        )
      })}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
