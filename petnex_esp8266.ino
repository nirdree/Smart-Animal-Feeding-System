/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║          PETNEX - Smart Animal Feeder Firmware              ║
 * ║          ESP8266 NodeMCU + MQTT + HX711 + Servo             ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Board      : ESP8266 NodeMCU 1.0                          ║
 * ║  Broker     : dev.coppercloud.in : 1883                    ║
 * ║  Libraries  : PubSubClient, HX711, Servo, NTPClient        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIRING SUMMARY:
 *  HX711  DT  → D2 | SCK → D3
 *  Servo  SIG → D5  (use external 5V supply!)
 *  HC-SR04 TRIG → D6 | ECHO → D7
 *  Buzzer  +   → D8
 */

#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <Servo.h>
#include "HX711.h"
#include <WiFiUdp.h>
#include <NTPClient.h>

// ═══════════════════════════════════════════════
//  CONFIG — EDIT THESE
// ═══════════════════════════════════════════════
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* MQTT_BROKER   = "dev.coppercloud.in";
const int   MQTT_PORT     = 1883;
const char* MQTT_CLIENT   = "petnex-esp8266";

// IST offset = 5:30 = 19800 seconds
const long  NTP_OFFSET    = 19800;

// Target bowl weight in grams
float TARGET_WEIGHT = 50.0;

// Ultrasonic threshold (cm) beyond which food is "low"
float LOW_FOOD_CM   = 25.0;

// ═══════════════════════════════════════════════
//  PIN DEFINITIONS
// ═══════════════════════════════════════════════
#define HX711_DT    D2
#define HX711_SCK   D3
#define SERVO_PIN   D5
#define TRIG_PIN    D6
#define ECHO_PIN    D7
#define BUZZER_PIN  D8

// ═══════════════════════════════════════════════
//  MQTT TOPICS
// ═══════════════════════════════════════════════
#define TOPIC_FEEDNOW    "feeder/feednow"
#define TOPIC_SCHEDULE1  "feeder/schedule1"
#define TOPIC_SCHEDULE2  "feeder/schedule2"
#define TOPIC_SCHEDULE3  "feeder/schedule3"
#define TOPIC_STATUS     "feeder/status"
#define TOPIC_ALERTS     "feeder/alerts"

// ═══════════════════════════════════════════════
//  OBJECTS
// ═══════════════════════════════════════════════
WiFiClient   espClient;
PubSubClient mqttClient(espClient);
WiFiUDP      ntpUDP;
NTPClient    timeClient(ntpUDP, "pool.ntp.org", NTP_OFFSET, 60000);
HX711        scale;
Servo        feederServo;

// ═══════════════════════════════════════════════
//  STATE VARIABLES
// ═══════════════════════════════════════════════
String feedTime1 = "08:00";
String feedTime2 = "14:00";
String feedTime3 = "20:00";

bool alreadyFed1 = false;
bool alreadyFed2 = false;
bool alreadyFed3 = false;

bool  isFeedingNow   = false;
bool  buzzerActive   = false;
unsigned long lastStatusTime   = 0;
unsigned long lastScheduleTime = 0;
unsigned long buzzerToggleTime = 0;
bool  buzzerState = false;

const unsigned long STATUS_INTERVAL   = 3000;   // ms
const unsigned long SCHEDULE_INTERVAL = 10000;  // ms

// ═══════════════════════════════════════════════
//  WIFI SETUP
// ═══════════════════════════════════════════════
void setupWiFi() {
  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    attempts++;
    if (attempts > 40) {
      Serial.println("\n[WiFi] Failed — rebooting");
      ESP.restart();
    }
  }

  Serial.println();
  Serial.print("[WiFi] Connected — IP: ");
  Serial.println(WiFi.localIP());
}

// ═══════════════════════════════════════════════
//  MQTT RECONNECT
// ═══════════════════════════════════════════════
void mqttReconnect() {
  int retries = 0;
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Connecting...");

    if (mqttClient.connect(MQTT_CLIENT)) {
      Serial.println(" connected!");
      mqttClient.subscribe(TOPIC_FEEDNOW);
      mqttClient.subscribe(TOPIC_SCHEDULE1);
      mqttClient.subscribe(TOPIC_SCHEDULE2);
      mqttClient.subscribe(TOPIC_SCHEDULE3);
      mqttClient.publish(TOPIC_ALERTS, "Device Online");
    } else {
      Serial.print(" failed, rc=");
      Serial.println(mqttClient.state());
      delay(3000);
      retries++;
      if (retries > 10) {
        Serial.println("[MQTT] Too many failures — reboot");
        ESP.restart();
      }
    }
  }
}

// ═══════════════════════════════════════════════
//  SENSORS
// ═══════════════════════════════════════════════
float getWeight() {
  if (!scale.is_ready()) return 0;
  float w = scale.get_units(5);
  return (w < 0) ? 0 : w;
}

float getDistance() {
  // Clear any old signal
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  // Send pulse
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Measure echo (timeout 30ms = ~5m max)
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);

  if (duration == 0) return 999; // timeout = no echo
  float dist = duration * 0.0343 / 2.0;
  return dist;
}

// ═══════════════════════════════════════════════
//  BUZZER ALERT (non-blocking)
// ═══════════════════════════════════════════════
void handleBuzzer() {
  if (!buzzerActive) {
    digitalWrite(BUZZER_PIN, LOW);
    return;
  }
  unsigned long now = millis();
  if (now - buzzerToggleTime >= 400) {
    buzzerState = !buzzerState;
    digitalWrite(BUZZER_PIN, buzzerState ? HIGH : LOW);
    buzzerToggleTime = now;
  }
}

// ═══════════════════════════════════════════════
//  CHECK FOOD LEVEL
// ═══════════════════════════════════════════════
void checkFoodLevel() {
  float dist = getDistance();

  if (dist > LOW_FOOD_CM) {
    if (!buzzerActive) {
      buzzerActive = true;
      mqttClient.publish(TOPIC_ALERTS, "LOW FOOD LEVEL");
      Serial.println("[ALERT] Low food level!");
    }
  } else {
    if (buzzerActive) {
      buzzerActive = false;
      digitalWrite(BUZZER_PIN, LOW);
    }
  }
}

// ═══════════════════════════════════════════════
//  FEEDING SEQUENCE
// ═══════════════════════════════════════════════
void startFeeding() {
  if (isFeedingNow) return;

  float weight = getWeight();
  if (weight >= TARGET_WEIGHT) {
    Serial.println("[FEED] Bowl already full — skipping");
    mqttClient.publish(TOPIC_ALERTS, "Bowl already full");
    return;
  }

  isFeedingNow = true;
  Serial.println("[FEED] Starting dispense...");
  mqttClient.publish(TOPIC_ALERTS, "Feeding Started");

  feederServo.write(90); // Open

  unsigned long feedStart = millis();
  unsigned long maxFeedTime = 30000; // 30s safety timeout

  while (weight < TARGET_WEIGHT) {
    weight = getWeight();

    Serial.print("[FEED] Weight: ");
    Serial.print(weight);
    Serial.println("g");

    // Publish live status during feeding
    if (millis() % 1000 < 200) {
      sendStatus(weight, getDistance(), true);
    }

    // Safety timeout
    if (millis() - feedStart > maxFeedTime) {
      Serial.println("[FEED] Timeout! Force closing servo.");
      mqttClient.publish(TOPIC_ALERTS, "Feed Timeout - Check Blockage");
      break;
    }

    delay(200);
    mqttClient.loop(); // Keep MQTT alive during blocking loop
  }

  feederServo.write(0); // Close
  isFeedingNow = false;

  Serial.print("[FEED] Complete. Final weight: ");
  Serial.print(weight);
  Serial.println("g");
  mqttClient.publish(TOPIC_ALERTS, "Feeding Completed");
}

// ═══════════════════════════════════════════════
//  PUBLISH STATUS
// ═══════════════════════════════════════════════
void sendStatus(float weight, float distance, bool servoOpen) {
  char buf[256];
  snprintf(buf, sizeof(buf),
    "{\"weight\":%.2f,\"distance\":%.2f,\"servoOpen\":%s,"
    "\"schedule1\":\"%s\",\"schedule2\":\"%s\",\"schedule3\":\"%s\"}",
    weight, distance,
    servoOpen ? "true" : "false",
    feedTime1.c_str(), feedTime2.c_str(), feedTime3.c_str()
  );
  mqttClient.publish(TOPIC_STATUS, buf);
}

// ═══════════════════════════════════════════════
//  MQTT CALLBACK
// ═══════════════════════════════════════════════
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  String t = String(topic);
  Serial.print("[MQTT] Message on ");
  Serial.print(t);
  Serial.print(": ");
  Serial.println(message);

  if (t == TOPIC_FEEDNOW) {
    startFeeding();
  }
  else if (t == TOPIC_SCHEDULE1) {
    feedTime1 = message;
    alreadyFed1 = false;
    Serial.print("[SCHED] Schedule 1 set: ");
    Serial.println(feedTime1);
  }
  else if (t == TOPIC_SCHEDULE2) {
    feedTime2 = message;
    alreadyFed2 = false;
    Serial.print("[SCHED] Schedule 2 set: ");
    Serial.println(feedTime2);
  }
  else if (t == TOPIC_SCHEDULE3) {
    feedTime3 = message;
    alreadyFed3 = false;
    Serial.print("[SCHED] Schedule 3 set: ");
    Serial.println(feedTime3);
  }
}

// ═══════════════════════════════════════════════
//  CHECK SCHEDULES (every 10s to save resources)
// ═══════════════════════════════════════════════
void checkSchedules() {
  timeClient.update();
  String currentTime = timeClient.getFormattedTime().substring(0, 5); // HH:MM

  // Reset "alreadyFed" flags once time has passed
  if (currentTime != feedTime1) alreadyFed1 = false;
  if (currentTime != feedTime2) alreadyFed2 = false;
  if (currentTime != feedTime3) alreadyFed3 = false;

  if (currentTime == feedTime1 && !alreadyFed1) {
    Serial.println("[SCHED] Schedule 1 triggered");
    alreadyFed1 = true;
    startFeeding();
  }
  if (currentTime == feedTime2 && !alreadyFed2) {
    Serial.println("[SCHED] Schedule 2 triggered");
    alreadyFed2 = true;
    startFeeding();
  }
  if (currentTime == feedTime3 && !alreadyFed3) {
    Serial.println("[SCHED] Schedule 3 triggered");
    alreadyFed3 = true;
    startFeeding();
  }
}

// ═══════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  Serial.println("\n[PETNEX] Booting...");

  // Pin modes
  pinMode(TRIG_PIN,  OUTPUT);
  pinMode(ECHO_PIN,  INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // Servo
  feederServo.attach(SERVO_PIN);
  feederServo.write(0); // Start closed

  // HX711
  scale.begin(HX711_DT, HX711_SCK);
  delay(500);

  // ⚠ CALIBRATE THIS VALUE for your specific load cell!
  // Steps: 1) Call scale.tare() with nothing on bowl
  //        2) Place known weight (e.g. 100g)
  //        3) Read raw: scale.get_units(10) and adjust divisor
  scale.set_scale(2280.f);
  scale.tare();
  Serial.println("[HX711] Tared and ready");

  // WiFi + MQTT
  setupWiFi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);

  // NTP
  timeClient.begin();
  timeClient.update();
  Serial.print("[NTP] Time: ");
  Serial.println(timeClient.getFormattedTime());

  // Startup beep
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(80);
    digitalWrite(BUZZER_PIN, LOW);
    delay(80);
  }

  Serial.println("[PETNEX] Ready!");
}

// ═══════════════════════════════════════════════
//  LOOP
// ═══════════════════════════════════════════════
void loop() {
  // Reconnect if needed
  if (!mqttClient.connected()) {
    mqttReconnect();
  }
  mqttClient.loop();

  unsigned long now = millis();

  // Publish status every 3 seconds
  if (now - lastStatusTime >= STATUS_INTERVAL) {
    lastStatusTime = now;
    float weight   = getWeight();
    float distance = getDistance();
    sendStatus(weight, distance, isFeedingNow);
    checkFoodLevel();

    Serial.print("[LOOP] W=");
    Serial.print(weight);
    Serial.print("g D=");
    Serial.print(distance);
    Serial.println("cm");
  }

  // Check schedules every 10 seconds
  if (now - lastScheduleTime >= SCHEDULE_INTERVAL) {
    lastScheduleTime = now;
    checkSchedules();
  }

  // Non-blocking buzzer handling
  handleBuzzer();
}
