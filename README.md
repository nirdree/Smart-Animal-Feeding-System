# 🐾 PETNEX — Smart Animal Feeder Dashboard

A real-time IoT dashboard for the ESP8266-based animal feeder.  
Built with **Next.js + Socket.IO + MQTT** on the frontend and **ESP8266 Arduino** firmware.

---

## 📁 Project Structure

```
animal-feeder/
├── pages/
│   ├── index.js           ← Main 3D dashboard UI
│   ├── _app.js
│   ├── _document.js
│   └── api/
│       └── socket.js      ← Backend: Socket.IO + MQTT bridge
├── components/
│   ├── WeightGauge.js     ← SVG circular gauge
│   ├── FoodLevel.js       ← Animated bottle fill
│   ├── ServoStatus.js     ← Servo dial visualizer
│   ├── ScheduleCard.js    ← Editable schedule card
│   ├── AlertLog.js        ← Alert history feed
│   └── Sparkline.js       ← Canvas-based live chart
├── styles/
│   └── globals.css        ← Neon 3D theme + animations
├── simulator.js           ← Hardware simulator (test tool)
├── petnex_esp8266.ino     ← ESP8266 Arduino firmware
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## 🚀 Quick Start

### 1. Install & Run Dashboard

```bash
cd animal-feeder
npm install
npm run dev
# Open http://localhost:3000
```

### 2. Run Hardware Simulator (to test UI without hardware)

```bash
# Install mqtt for simulator
npm install mqtt

# Normal simulation
node simulator.js

# Low food alert simulation
SCENARIO=lowfood node simulator.js

# Feeding sequence simulation
SCENARIO=feeding node simulator.js

# Random alerts simulation
SCENARIO=alert node simulator.js
```

---

## 🔌 ESP8266 Setup

### Libraries (install via Arduino IDE Library Manager)
- `ESP8266WiFi` (built-in with ESP8266 board)
- `PubSubClient` by Nick O'Leary
- `HX711` by Bogdan Necula
- `Servo` (built-in)
- `NTPClient` by Fabrice Weinberg
- `WiFiUdp` (built-in)

### Board Settings
- Board: `NodeMCU 1.0 (ESP-12E Module)`
- Upload Speed: `115200`
- Flash Size: `4MB (FS:2MB OTA:~1019KB)`

### Steps
1. Open `petnex_esp8266.ino` in Arduino IDE
2. Edit `WIFI_SSID` and `WIFI_PASSWORD`
3. Upload to your NodeMCU
4. Open Serial Monitor at `115200` baud
5. Calibrate the load cell (see below)

### Load Cell Calibration
```cpp
// 1. Power on with empty bowl → scale.tare() runs automatically
// 2. Place a known weight (e.g. 100g) on the bowl
// 3. Open Serial Monitor — read the raw value
// 4. calibration_factor = raw_value / known_weight_in_grams
// 5. Update this line in the .ino file:
scale.set_scale(2280.f); // ← change 2280 to your value
```

---

## 🔧 Wiring

| Component    | Pin      | ESP8266 |
|-------------|----------|---------|
| HX711 DT    | Data     | D2      |
| HX711 SCK   | Clock    | D3      |
| Servo Signal | PWM     | D5      |
| HC-SR04 TRIG | Trigger | D6      |
| HC-SR04 ECHO | Echo    | D7      |
| Buzzer +    | Signal   | D8      |

> ⚠️ **Servo Power**: Use a separate 5V power supply for the servo.  
> Do NOT power it from the ESP8266 3.3V or 5V pin directly.

---

## 📡 MQTT Topics

| Topic             | Direction | Purpose              |
|-------------------|-----------|----------------------|
| `feeder/feednow`  | → ESP     | Trigger manual feed  |
| `feeder/schedule1`| ↔ Both   | Set schedule 1 time  |
| `feeder/schedule2`| ↔ Both   | Set schedule 2 time  |
| `feeder/schedule3`| ↔ Both   | Set schedule 3 time  |
| `feeder/status`   | ← ESP     | Live sensor data     |
| `feeder/alerts`   | ← ESP     | System alerts        |

### Status Payload Example
```json
{
  "weight": 42.5,
  "distance": 12.3,
  "servoOpen": false,
  "schedule1": "08:00",
  "schedule2": "14:00",
  "schedule3": "20:00"
}
```

---

## 🌐 Architecture

```
ESP8266 (Hardware)
    ↕ MQTT
dev.coppercloud.in:1883 (Broker)
    ↕ MQTT
Next.js API (pages/api/socket.js)
    ↕ Socket.IO (WebSocket)
Browser Dashboard (pages/index.js)
```

---

## ✅ Features

- 🎯 Real-time weight gauge with animated SVG
- 🍶 Animated food level bottle visualization  
- ⚙️ Live servo position indicator
- 📊 Live sparkline telemetry charts
- 📅 3 editable feeding schedules
- 🔴 FEED NOW button with servo animation
- 🚨 Alert history log
- 📡 MQTT connection status indicator
- 🌊 Scan-line + particle ambient effects
- 📱 Fully responsive layout

---

## 🔮 Future Ideas

- OLED display on device
- Pet camera integration
- Mobile push notifications
- AI feeding pattern analysis
- OTA firmware updates
