import { useEffect, useRef } from 'react'

export default function Sparkline({ data = [], color = '#00f5ff', height = 60, label = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    const min = Math.min(...data)
    const max = Math.max(...data) || 1
    const range = max - min || 1

    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * w,
      y: h - ((v - min) / range) * (h - 10) - 5,
    }))

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, color + '40')
    grad.addColorStop(1, color + '00')

    ctx.beginPath()
    ctx.moveTo(points[0].x, h)
    points.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.lineTo(points[points.length - 1].x, h)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    // Line
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    points.forEach((p, i) => {
      if (i === 0) return
      const prev = points[i - 1]
      const cx = (prev.x + p.x) / 2
      ctx.bezierCurveTo(cx, prev.y, cx, p.y, p.x, p.y)
    })
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.shadowColor = color
    ctx.shadowBlur = 6
    ctx.stroke()

    // Latest dot
    const last = points[points.length - 1]
    ctx.beginPath()
    ctx.arc(last.x, last.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.shadowBlur = 10
    ctx.fill()
  }, [data, color])

  return (
    <div>
      {label && (
        <p className="font-rajdhani text-xs tracking-widest uppercase mb-1"
          style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
      )}
      <canvas ref={canvasRef} width={300} height={height}
        style={{ width: '100%', height: height }} />
    </div>
  )
}
