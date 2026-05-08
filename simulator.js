#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║        PETNEX - Hardware Simulator / MQTT Publisher         ║
 * ║   Simulates ESP8266 sensor data to test the dashboard UI    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   npm install mqtt
 *   node simulator.js
 *
 * Options (env vars):
 *   BROKER=mqtt://dev.coppercloud.in:1883
 *   SCENARIO=normal|feeding|lowfood|alert
 */

const mqtt = require('mqtt')

const BROKER = process.env.BROKER || 'mqtt://dev.coppercloud.in:1883'
const SCENARIO = process.env.SCENARIO || 'normal'

const TOPICS = {
  STATUS: 'feeder/status',
  ALERTS: 'feeder/alerts',
  FEEDNOW: 'feeder/feednow',
  SCHEDULE1: 'feeder/schedule1',
  SCHEDULE2: 'feeder/schedule2',
  SCHEDULE3: 'feeder/schedule3',
}

const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
}

function log(color, prefix, msg) {
  const ts = new Date().toLocaleTimeString('en-US', { hour12: false })
  console.log(`${colors.dim}[${ts}]${colors.reset} ${color}${colors.bold}${prefix}${colors.reset} ${msg}`)
}

// ─── State ───────────────────────────────────────────────────
let state = {
  weight: 0,
  distance: 12,
  schedule1: '08:00',
  schedule2: '14:00',
  schedule3: '20:00',
  servoOpen: false,
  feeding: false,
  tick: 0,
}

// ─── Scenario engines ────────────────────────────────────────

function simulateNormal(s) {
  // Gentle weight drift
  if (!s.feeding) {
    s.weight = Math.max(0, s.weight + (Math.random() - 0.52) * 0.5)
    s.weight = parseFloat(s.weight.toFixed(2))
  }
  // Distance fluctuates slightly
  s.distance = parseFloat((s.distance + (Math.random() - 0.5) * 0.3).toFixed(2))
  s.distance = Math.max(5, Math.min(28, s.distance))
  return s
}

function simulateFeeding(s) {
  if (!s.feeding) {
    s.feeding = true
    s.servoOpen = true
    log(colors.magenta, '[SERVO]', 'Opening dispenser - target 50g')
  }
  if (s.weight < 50) {
    s.weight = parseFloat(Math.min(50, s.weight + 2 + Math.random() * 1.5).toFixed(2))
  } else {
    s.servoOpen = false
    s.feeding = false
    s.weight = 50
    return { ...s, completeFeed: true }
  }
  return s
}

function simulateLowFood(s) {
  s = simulateNormal(s)
  s.distance = Math.min(28, s.distance + 0.1) // level dropping = distance increasing
  return s
}

// ─── Main ────────────────────────────────────────────────────

console.log(`
${colors.cyan}${colors.bold}
██████╗ ███████╗████████╗███╗   ██╗███████╗██╗  ██╗
██╔══██╗██╔════╝╚══██╔══╝████╗  ██║██╔════╝╚██╗██╔╝
██████╔╝█████╗     ██║   ██╔██╗ ██║█████╗   ╚███╔╝ 
██╔═══╝ ██╔══╝     ██║   ██║╚██╗██║██╔══╝   ██╔██╗ 
██║     ███████╗   ██║   ██║ ╚████║███████╗██╔╝ ██╗
╚═╝     ╚══════╝   ╚═╝   ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝
${colors.reset}
${colors.green}  ESP8266 Hardware Simulator${colors.reset}
${colors.dim}  Broker : ${BROKER}${colors.reset}
${colors.dim}  Mode   : ${SCENARIO.toUpperCase()}${colors.reset}
`)

const client = mqtt.connect(BROKER, {
  clientId: 'esp8266-simulator-' + Math.random().toString(16).slice(2, 8),
  clean: true,
  reconnectPeriod: 3000,
})

client.on('connect', () => {
  log(colors.green, '[MQTT]', `Connected to ${BROKER}`)
  log(colors.cyan, '[SIM]', `Scenario: ${SCENARIO.toUpperCase()} — publishing every 3s`)

  // Subscribe to receive commands from dashboard
  client.subscribe([TOPICS.FEEDNOW, TOPICS.SCHEDULE1, TOPICS.SCHEDULE2, TOPICS.SCHEDULE3])
  log(colors.dim, '[SUB]', 'Subscribed to command topics')
  console.log('')

  // Initial state by scenario
  if (SCENARIO === 'lowfood') {
    state.distance = 24
    log(colors.yellow, '[STATE]', 'Starting with LOW food level (distance=24cm)')
  } else if (SCENARIO === 'alert') {
    state.distance = 27
    state.weight = 5
    log(colors.red, '[STATE]', 'Starting in ALERT state')
  } else if (SCENARIO === 'feeding') {
    state.weight = 10
    log(colors.magenta, '[STATE]', 'Starting in FEEDING mode')
  }

  // ─── Publish loop ───
  const loop = setInterval(() => {
    state.tick++

    // Choose simulation
    if (SCENARIO === 'feeding' || state.feeding) {
      const result = simulateFeeding(state)
      if (result.completeFeed) {
        client.publish(TOPICS.ALERTS, 'Feeding Completed')
        log(colors.green, '[ALERT]', '→ Published: Feeding Completed')
      }
      state = result
    } else if (SCENARIO === 'lowfood') {
      state = simulateLowFood(state)
      if (state.distance > 25) {
        client.publish(TOPICS.ALERTS, 'LOW FOOD LEVEL')
        log(colors.red, '[ALERT]', '→ Published: LOW FOOD LEVEL')
      }
    } else if (SCENARIO === 'alert') {
      state = simulateLowFood(state)
      if (state.tick % 5 === 0) {
        const alerts = ['LOW FOOD LEVEL', 'Bowl sensor anomaly', 'Feeding Completed']
        const msg = alerts[Math.floor(Math.random() * alerts.length)]
        client.publish(TOPICS.ALERTS, msg)
        log(colors.red, '[ALERT]', `→ Published: ${msg}`)
      }
    } else {
      state = simulateNormal(state)
      // Occasional auto-feed sim
      if (state.tick % 15 === 0) {
        log(colors.yellow, '[SIM]', 'Triggering simulated scheduled feed...')
        state.feeding = true
      }
    }

    // Build and publish status payload
    const payload = {
      weight: state.weight,
      distance: state.distance,
      schedule1: state.schedule1,
      schedule2: state.schedule2,
      schedule3: state.schedule3,
      servoOpen: state.servoOpen,
    }

    const json = JSON.stringify(payload)
    client.publish(TOPICS.STATUS, json)

    log(
      colors.cyan,
      '[PUB]',
      `weight=${colors.bold}${state.weight.toFixed(1)}g${colors.reset}${colors.cyan}  dist=${state.distance.toFixed(1)}cm  servo=${state.servoOpen ? colors.yellow + 'OPEN' : colors.green + 'CLOSED'}${colors.reset}${colors.cyan}  tick=${state.tick}`
    )

  }, 3000)

  // Handle command messages from dashboard
  client.on('message', (topic, message) => {
    const msg = message.toString()
    console.log('')
    log(colors.magenta, '[CMD]', `Received on ${topic}: "${msg}"`)

    if (topic === TOPICS.FEEDNOW) {
      log(colors.magenta, '[CMD]', '→ FEED NOW triggered! Starting dispense...')
      state.feeding = true
      state.servoOpen = true
      state.weight = Math.max(0, state.weight - 5) // simulate empty bowl first
    }
    if (topic === TOPICS.SCHEDULE1) {
      state.schedule1 = msg
      log(colors.cyan, '[CMD]', `→ Schedule 1 updated to ${msg}`)
    }
    if (topic === TOPICS.SCHEDULE2) {
      state.schedule2 = msg
      log(colors.cyan, '[CMD]', `→ Schedule 2 updated to ${msg}`)
    }
    if (topic === TOPICS.SCHEDULE3) {
      state.schedule3 = msg
      log(colors.cyan, '[CMD]', `→ Schedule 3 updated to ${msg}`)
    }
    console.log('')
  })

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n')
    log(colors.yellow, '[SIM]', 'Shutting down simulator...')
    clearInterval(loop)
    client.end()
    process.exit(0)
  })
})

client.on('error', (err) => {
  log(colors.red, '[ERR]', err.message)
})

client.on('offline', () => {
  log(colors.red, '[MQTT]', 'Disconnected — retrying...')
})
