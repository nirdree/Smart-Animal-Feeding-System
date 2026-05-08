import { useState } from 'react'

export default function ScheduleCard({ slot, time, onUpdate, label }) {
  const [editing, setEditing] = useState(false)
  const [newTime, setNewTime] = useState(time)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    onUpdate(slot, newTime)
    setTimeout(() => {
      setSaving(false)
      setEditing(false)
    }, 800)
  }

  // Parse hour for visual indicator
  const [h] = time.split(':').map(Number)
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h

  const icons = { 1: '🌅', 2: '☀️', 3: '🌙' }

  return (
    <div className="card-3d p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icons[slot]}</span>
          <span className="font-orbitron text-xs tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            {label}
          </span>
        </div>
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: '#39ff14', boxShadow: '0 0 6px #39ff14' }}
        />
      </div>

      {/* Time display */}
      {!editing ? (
        <div className="flex items-end gap-2">
          <span className="font-orbitron text-3xl neon-text-cyan font-bold">
            {String(displayH).padStart(2, '0')}:{time.split(':')[1]}
          </span>
          <span className="font-orbitron text-sm pb-1" style={{ color: 'rgba(0,245,255,0.5)' }}>
            {period}
          </span>
        </div>
      ) : (
        <input
          type="time"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
          className="input-neon"
        />
      )}

      {/* Action button */}
      {!editing ? (
        <button
          onClick={() => { setEditing(true); setNewTime(time) }}
          className="btn-neon py-2 px-4 text-xs w-full"
        >
          <span>EDIT SCHEDULE</span>
        </button>
      ) : (
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 btn-neon py-2 text-xs"
            style={{ borderColor: '#39ff14', color: saving ? '#020408' : '#39ff14' }}>
            <span>{saving ? 'SAVING...' : 'SAVE'}</span>
          </button>
          <button onClick={() => setEditing(false)}
            className="flex-1 btn-neon py-2 text-xs"
            style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.4)' }}>
            <span>CANCEL</span>
          </button>
        </div>
      )}
    </div>
  )
}
