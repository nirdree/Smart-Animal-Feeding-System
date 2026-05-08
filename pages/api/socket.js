import { Server } from 'socket.io'
import mqtt from 'mqtt'

let io
let mqttClient
let latestStatus = {
  weight: 0,
  distance: 15,
  schedule1: '08:00',
  schedule2: '14:00',
  schedule3: '20:00',
  servoOpen: false,
  alerts: [],
  connected: false,
  lastSeen: null,
}

const MQTT_BROKER = 'mqtt://dev.coppercloud.in:1883'
const TOPICS = {
  FEEDNOW: 'feeder/feednow',
  SCHEDULE1: 'feeder/schedule1',
  SCHEDULE2: 'feeder/schedule2',
  SCHEDULE3: 'feeder/schedule3',
  STATUS: 'feeder/status',
  ALERTS: 'feeder/alerts',
}

function initMQTT(ioInstance) {
  if (mqttClient) return

  console.log('[MQTT] Connecting to', MQTT_BROKER)

  mqttClient = mqtt.connect(MQTT_BROKER, {
    clientId: 'feeder-dashboard-' + Math.random().toString(16).slice(2, 8),
    clean: true,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
  })

  mqttClient.on('connect', () => {
    console.log('[MQTT] Connected')
    latestStatus.connected = true
    mqttClient.subscribe(Object.values(TOPICS))
    ioInstance.emit('mqtt-status', { connected: true })
  })

  mqttClient.on('error', (err) => {
    console.error('[MQTT] Error:', err.message)
    latestStatus.connected = false
    ioInstance.emit('mqtt-status', { connected: false, error: err.message })
  })

  mqttClient.on('offline', () => {
    latestStatus.connected = false
    ioInstance.emit('mqtt-status', { connected: false })
  })

  mqttClient.on('message', (topic, message) => {
    const msg = message.toString()
    console.log(`[MQTT] ${topic}: ${msg}`)

    if (topic === TOPICS.STATUS) {
      try {
        const data = JSON.parse(msg)
        latestStatus = {
          ...latestStatus,
          ...data,
          lastSeen: new Date().toISOString(),
        }
        ioInstance.emit('status-update', latestStatus)
      } catch (e) {
        console.error('[MQTT] JSON parse error:', e)
      }
    }

    if (topic === TOPICS.ALERTS) {
      const alert = { message: msg, time: new Date().toISOString() }
      latestStatus.alerts = [alert, ...(latestStatus.alerts || [])].slice(0, 10)
      ioInstance.emit('alert', alert)
      ioInstance.emit('status-update', latestStatus)
    }
  })
}

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('[Socket.IO] Initializing...')
    io = new Server(res.socket.server, {
      path: '/api/socket',
      cors: { origin: '*' },
    })
    res.socket.server.io = io

    initMQTT(io)

    io.on('connection', (socket) => {
      console.log('[Socket.IO] Client connected:', socket.id)

      // Send current state immediately
      socket.emit('status-update', latestStatus)
      socket.emit('mqtt-status', { connected: latestStatus.connected })

      // Feed now command
      socket.on('feed-now', () => {
        console.log('[CMD] Feed Now')
        if (mqttClient && mqttClient.connected) {
          mqttClient.publish(TOPICS.FEEDNOW, 'ON')
          latestStatus.servoOpen = true
          io.emit('status-update', latestStatus)
        }
      })

      // Update schedule
      socket.on('update-schedule', ({ slot, time }) => {
        console.log(`[CMD] Schedule ${slot} -> ${time}`)
        const topicMap = {
          1: TOPICS.SCHEDULE1,
          2: TOPICS.SCHEDULE2,
          3: TOPICS.SCHEDULE3,
        }
        if (mqttClient && mqttClient.connected && topicMap[slot]) {
          mqttClient.publish(topicMap[slot], time)
          latestStatus[`schedule${slot}`] = time
          io.emit('status-update', latestStatus)
        }
      })

      // Inject test data (for simulator)
      socket.on('inject-data', (data) => {
        latestStatus = { ...latestStatus, ...data, lastSeen: new Date().toISOString() }
        io.emit('status-update', latestStatus)
      })

      socket.on('disconnect', () => {
        console.log('[Socket.IO] Client disconnected:', socket.id)
      })
    })
  }

  res.end()
}

export const config = {
  api: { bodyParser: false },
}
