import { useEffect, useState, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import WeightGauge from '../components/WeightGauge'
import FoodLevel from '../components/FoodLevel'
import ServoStatus from '../components/ServoStatus'
import ScheduleCard from '../components/ScheduleCard'
import AlertLog from '../components/AlertLog'
import Sparkline from '../components/Sparkline'

let socket

export default function Dashboard() {
  const [status, setStatus] = useState({
    weight: 0,
    distance: 15,
    schedule1: '08:00',
    schedule2: '14:00',
    schedule3: '20:00',
    servoOpen: false,
    alerts: [],
    connected: false,
    lastSeen: null,
  })
  const [mqttConnected, setMqttConnected] = useState(false)
  const [feeding, setFeeding] = useState(false)
  const [feedSuccess, setFeedSuccess] = useState(false)
  const [weightHistory, setWeightHistory] = useState([0])
  const [particles, setParticles] = useState([])
  const [currentTime, setCurrentTime] = useState('')
  const feedBtnRef = useRef(null)

  // Socket init
  useEffect(() => {
    fetch('/api/socket').finally(() => {
      socket = io({ path: '/api/socket' })

      socket.on('status-update', (data) => {
        setStatus(data)
        setWeightHistory(prev => [...prev.slice(-40), data.weight ?? 0])
      })

      socket.on('mqtt-status', ({ connected }) => {
        setMqttConnected(connected)
      })

      socket.on('alert', () => {
        // shake animation on alert
        document.body.style.animation = 'none'
      })
    })

    return () => { if (socket) socket.disconnect() }
  }, [])

  // Clock
  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false }))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  // Particles
  useEffect(() => {
    const p = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      duration: 8 + Math.random() * 12,
      delay: Math.random() * 10,
      size: Math.random() > 0.7 ? 3 : 2,
    }))
    setParticles(p)
  }, [])

  const handleFeedNow = useCallback(() => {
    if (feeding) return
    setFeeding(true)
    setFeedSuccess(false)
    socket?.emit('feed-now')
    setTimeout(() => {
      setFeeding(false)
      setFeedSuccess(true)
      setTimeout(() => setFeedSuccess(false), 3000)
    }, 2000)
  }, [feeding])

  const handleScheduleUpdate = useCallback((slot, time) => {
    socket?.emit('update-schedule', { slot, time })
  }, [])

  const fillPct = Math.min((status.weight / 50) * 100, 100)
  const isLowFood = ((30 - status.distance) / 30) * 100 < 30

  return (
    <div className="min-h-screen grid-bg hex-bg relative overflow-x-hidden"
      style={{ background: 'radial-gradient(ellipse at 20% 20%, #0a1628 0%, #020408 60%)' }}>

      {/* Scan line */}
      <div className="scan-line" />

      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} className="particle" style={{
          left: `${p.left}%`,
          width: p.size, height: p.size,
          animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`,
        }} />
      ))}

      {/* Top corner decorations */}
      <div className="fixed top-0 left-0 w-32 h-32 pointer-events-none" style={{ zIndex: 10 }}>
        <svg viewBox="0 0 128 128"><path d="M0 0 L60 0 L60 2 L2 2 L2 60 L0 60 Z" fill="rgba(0,245,255,0.4)" /></svg>
      </div>
      <div className="fixed top-0 right-0 w-32 h-32 pointer-events-none" style={{ zIndex: 10 }}>
        <svg viewBox="0 0 128 128"><path d="M128 0 L68 0 L68 2 L126 2 L126 60 L128 60 Z" fill="rgba(0,245,255,0.4)" /></svg>
      </div>
      <div className="fixed bottom-0 left-0 w-32 h-32 pointer-events-none" style={{ zIndex: 10 }}>
        <svg viewBox="0 0 128 128"><path d="M0 128 L60 128 L60 126 L2 126 L2 68 L0 68 Z" fill="rgba(0,245,255,0.4)" /></svg>
      </div>
      <div className="fixed bottom-0 right-0 w-32 h-32 pointer-events-none" style={{ zIndex: 10 }}>
        <svg viewBox="0 0 128 128"><path d="M128 128 L68 128 L68 126 L126 126 L126 68 L128 68 Z" fill="rgba(0,245,255,0.4)" /></svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ═══ HEADER ═══ */}
        <header className="mb-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)' }}>
                  <span className="text-lg">🐾</span>
                </div>
                <h1 className="font-orbitron text-3xl font-black tracking-widest neon-text-cyan">
                  PETNEX
                </h1>
                <span className="font-orbitron text-xs tracking-widest px-2 py-1 rounded"
                  style={{ background: 'rgba(0,245,255,0.1)', color: 'rgba(0,245,255,0.6)', border: '1px solid rgba(0,245,255,0.2)' }}>
                  v2.1
                </span>
              </div>
              <p className="font-rajdhani text-sm tracking-widest uppercase"
                style={{ color: 'rgba(255,255,255,0.35)' }}>
                Smart Animal Feeding System
              </p>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Clock */}
              <div className="font-orbitron text-2xl font-bold"
                style={{ color: 'rgba(0,245,255,0.7)', letterSpacing: '0.1em' }}>
                {currentTime}
              </div>

              {/* MQTT Status */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg"
                style={{ background: 'rgba(10,22,40,0.8)', border: `1px solid ${mqttConnected ? 'rgba(57,255,20,0.3)' : 'rgba(255,0,128,0.3)'}` }}>
                <div className="status-dot"
                  style={{ background: mqttConnected ? '#39ff14' : '#ff0080', color: mqttConnected ? '#39ff14' : '#ff0080' }} />
                <span className="font-rajdhani text-sm font-semibold tracking-widest uppercase"
                  style={{ color: mqttConnected ? '#39ff14' : '#ff0080' }}>
                  {mqttConnected ? 'MQTT LIVE' : 'DISCONNECTED'}
                </span>
              </div>

              {/* Last seen */}
              {status.lastSeen && (
                <div className="font-rajdhani text-xs tracking-wider"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Last: {new Date(status.lastSeen).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="mt-6 h-px" style={{
            background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.5) 20%, rgba(0,245,255,0.5) 80%, transparent)'
          }} />
        </header>

        {/* ═══ TOP ROW: Main sensors ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

          {/* Weight Gauge */}
          <div className="card-3d p-6 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4 self-start">
              <div className="w-1 h-5 rounded-full" style={{ background: '#00f5ff', boxShadow: '0 0 8px #00f5ff' }} />
              <span className="font-orbitron text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Bowl Monitor
              </span>
            </div>
            <WeightGauge weight={status.weight} target={50} />
            {/* Weight bar */}
            <div className="w-full mt-4">
              <div className="flex justify-between font-rajdhani text-xs mb-1"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                <span>0g</span><span>25g</span><span>50g</span>
              </div>
              <div className="h-2 rounded-full w-full" style={{ background: 'rgba(0,245,255,0.1)' }}>
                <div className="weight-fill h-2" style={{ width: `${fillPct}%` }} />
              </div>
            </div>
          </div>

          {/* Food Level */}
          <div className="card-3d p-6 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4 self-start">
              <div className="w-1 h-5 rounded-full" style={{ background: '#39ff14', boxShadow: '0 0 8px #39ff14' }} />
              <span className="font-orbitron text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Food Container
              </span>
            </div>
            <FoodLevel distance={status.distance} maxDistance={30} />
            {isLowFood && (
              <div className="mt-4 px-4 py-2 rounded-lg alert-pulse w-full text-center"
                style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.4)' }}>
                <span className="font-orbitron text-xs tracking-widest" style={{ color: '#ff6b00' }}>
                  ⚠ REFILL REQUIRED
                </span>
              </div>
            )}
          </div>

          {/* Servo Status */}
          <div className="card-3d p-6 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4 self-start">
              <div className="w-1 h-5 rounded-full" style={{ background: '#ff6b00', boxShadow: '0 0 8px #ff6b00' }} />
              <span className="font-orbitron text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Dispenser Valve
              </span>
            </div>
            <ServoStatus isOpen={status.servoOpen} />

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3 w-full mt-4">
              <div className="p-3 rounded-lg text-center"
                style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.1)' }}>
                <div className="font-orbitron text-lg neon-text-cyan">{status.weight.toFixed(0)}g</div>
                <div className="font-rajdhani text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Weight</div>
              </div>
              <div className="p-3 rounded-lg text-center"
                style={{ background: 'rgba(57,255,20,0.05)', border: '1px solid rgba(57,255,20,0.1)' }}>
                <div className="font-orbitron text-lg neon-text-green">{status.distance?.toFixed(0)}cm</div>
                <div className="font-rajdhani text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Dist</div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ MIDDLE ROW: FEED NOW + History ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* Feed Now Panel */}
          <div className="card-3d p-8 flex flex-col items-center justify-center gap-6">
            <div className="text-center">
              <div className="font-orbitron text-xs tracking-widest uppercase mb-2"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                Manual Override
              </div>
              <h2 className="font-orbitron text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                INSTANT FEED
              </h2>
            </div>

            {/* Animated ring around button */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-ping"
                style={{
                  background: 'transparent',
                  border: `2px solid ${feeding ? '#ff6b00' : 'rgba(255,107,0,0.3)'}`,
                  animation: feeding ? 'ping 1s ease-out infinite' : 'none',
                  borderRadius: '50%',
                  transform: 'scale(1.3)',
                }} />
              <button
                ref={feedBtnRef}
                onClick={handleFeedNow}
                disabled={feeding}
                className="btn-feed relative"
                style={{
                  minWidth: 180,
                  opacity: feeding ? 0.8 : 1,
                  transition: 'all 0.3s ease',
                }}>
                {feeding ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    DISPENSING...
                  </span>
                ) : feedSuccess ? (
                  <span style={{ color: '#39ff14' }}>✓ COMPLETE</span>
                ) : (
                  '🍽 FEED NOW'
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="font-rajdhani text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Dispenses until bowl reaches <span className="neon-text-cyan font-bold">50g</span>
              </p>
              <p className="font-rajdhani text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Servo auto-closes at target weight
              </p>
            </div>

            {/* MQTT topic info */}
            <div className="w-full px-4 py-3 rounded-lg"
              style={{ background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.1)' }}>
              <div className="flex items-center gap-2">
                <span className="font-rajdhani text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>TOPIC</span>
                <span className="font-orbitron text-xs neon-text-cyan">feeder/feednow</span>
              </div>
            </div>
          </div>

          {/* Weight History */}
          <div className="card-3d p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded-full" style={{ background: '#00f5ff', boxShadow: '0 0 8px #00f5ff' }} />
              <span className="font-orbitron text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Live Telemetry
              </span>
            </div>

            <Sparkline data={weightHistory} color="#00f5ff" height={80} label="Bowl Weight (g)" />

            <div className="mt-6">
              <Sparkline
                data={weightHistory.map(() => Math.max(0, 30 - (status.distance || 15)))}
                color="#39ff14"
                height={60}
                label="Food Level (cm from sensor)"
              />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              {[
                { label: 'Min', value: Math.min(...weightHistory).toFixed(1) + 'g', color: '#ff6b00' },
                { label: 'Max', value: Math.max(...weightHistory).toFixed(1) + 'g', color: '#39ff14' },
                { label: 'Avg', value: (weightHistory.reduce((a, b) => a + b, 0) / weightHistory.length).toFixed(1) + 'g', color: '#00f5ff' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-lg text-center"
                  style={{ background: `rgba(${color === '#00f5ff' ? '0,245,255' : color === '#39ff14' ? '57,255,20' : '255,107,0'},0.05)`, border: `1px solid ${color}22` }}>
                  <div className="font-orbitron text-sm font-bold" style={{ color }}>{value}</div>
                  <div className="font-rajdhani text-xs uppercase tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ BOTTOM ROW: Schedules + Alerts ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          {/* Schedule 1 */}
          <ScheduleCard
            slot={1}
            time={status.schedule1}
            label="Morning Feed"
            onUpdate={handleScheduleUpdate}
          />

          {/* Schedule 2 */}
          <ScheduleCard
            slot={2}
            time={status.schedule2}
            label="Afternoon Feed"
            onUpdate={handleScheduleUpdate}
          />

          {/* Schedule 3 */}
          <ScheduleCard
            slot={3}
            time={status.schedule3}
            label="Evening Feed"
            onUpdate={handleScheduleUpdate}
          />
        </div>

        {/* ═══ ALERTS + STATUS ROW ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* Alert Log */}
          <div className="card-3d p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: '#ff0080', boxShadow: '0 0 8px #ff0080' }} />
                <span className="font-orbitron text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  System Alerts
                </span>
              </div>
              {status.alerts?.length > 0 && (
                <span className="font-orbitron text-xs px-2 py-1 rounded"
                  style={{ background: 'rgba(255,0,128,0.15)', color: '#ff0080', border: '1px solid rgba(255,0,128,0.3)' }}>
                  {status.alerts.length}
                </span>
              )}
            </div>
            <AlertLog alerts={status.alerts || []} />
          </div>

          {/* System Info */}
          <div className="card-3d p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded-full" style={{ background: '#bf00ff', boxShadow: '0 0 8px #bf00ff' }} />
              <span className="font-orbitron text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
                System Info
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: 'MQTT Broker', value: 'dev.coppercloud.in:1883', color: '#00f5ff' },
                { label: 'Device', value: 'ESP8266 NodeMCU', color: '#39ff14' },
                { label: 'Protocol', value: 'MQTT / TCP', color: '#00f5ff' },
                { label: 'Status', value: mqttConnected ? 'ONLINE' : 'OFFLINE', color: mqttConnected ? '#39ff14' : '#ff0080' },
                { label: 'Update Rate', value: '3 seconds', color: '#00f5ff' },
                { label: 'Target Weight', value: '50 grams', color: '#ff6b00' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2"
                  style={{ borderBottom: '1px solid rgba(0,245,255,0.06)' }}>
                  <span className="font-rajdhani text-sm tracking-wider uppercase"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                  <span className="font-orbitron text-xs" style={{ color }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ MQTT TOPICS REFERENCE ═══ */}
        <div className="card-3d p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: '#00f5ff', boxShadow: '0 0 8px #00f5ff' }} />
            <span className="font-orbitron text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
              MQTT Topic Reference
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { topic: 'feeder/feednow', desc: 'Manual Trigger', dir: '→' },
              { topic: 'feeder/schedule1', desc: 'Schedule 1', dir: '↔' },
              { topic: 'feeder/schedule2', desc: 'Schedule 2', dir: '↔' },
              { topic: 'feeder/schedule3', desc: 'Schedule 3', dir: '↔' },
              { topic: 'feeder/status', desc: 'Live Data', dir: '←' },
              { topic: 'feeder/alerts', desc: 'Alerts', dir: '←' },
            ].map(({ topic, desc, dir }) => (
              <div key={topic} className="p-3 rounded-lg"
                style={{ background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.1)' }}>
                <div className="font-orbitron text-xs neon-text-cyan mb-1 truncate">{topic}</div>
                <div className="font-rajdhani text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{dir} {desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-4">
          <p className="font-rajdhani text-xs tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.15)' }}>
            PETNEX © 2025 — Smart IoT Animal Feeding System — ESP8266 + MQTT + Next.js
          </p>
        </footer>

      </div>
    </div>
  )
}
