#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Adafruit_NeoPixel.h>
#include "driver/ledc.h"
#include "esp_err.h"
#include <Wire.h>
#include <ArduinoJson.h>
#include <time.h>
#include "root_ca.h"
#include <WebServer.h>
#include <Update.h>
#include <ESPmDNS.h>
#include <WebSocketsClient.h>

// BLE Libraries
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// BLE UUIDs for Weather Potato PWA
#define BLE_SERVICE_UUID           "12345678-1234-5678-1234-56789abcdef0"
#define BLE_DEVICE_INFO_CHAR_UUID  "12345678-1234-5678-1234-56789abcdef1"
#define BLE_WIFI_CONFIG_CHAR_UUID  "12345678-1234-5678-1234-56789abcdef2"
#define BLE_GPS_CONFIG_CHAR_UUID   "12345678-1234-5678-1234-56789abcdef3"
#define BLE_STATUS_CHAR_UUID       "12345678-1234-5678-1234-56789abcdef4"

// Hardware pins
#define LED_PIN 12
#define NUM_LEDS 12
#define CAP_SENSOR_PIN 15
#define BUZZER_PIN 21
#define BUZZER_CHANNEL LEDC_CHANNEL_0
#define BUZZER_TIMER LEDC_TIMER_0
#define BUZZER_MODE LEDC_LOW_SPEED_MODE
#define BUZZER_FREQUENCY 2000
#define BUZZER_RESOLUTION LEDC_TIMER_8_BIT

// Mode AP (kept as backup alongside BLE)
const char* apSSID = "myWeatherPotato";
const char* apPassword = "P0tat000";

// Default location (Aubervilliers)
float latitude = 48.9075;
float longitude = 2.3833;

// WiFi and device info
String deviceId = "";        // Generated from MAC address
String wifiSSID = "";
String wifiPassword = "";
String geoLocation = "";
String lastWeatherCondition = "Unknown";
int lastTemperature = 0;
struct tm timeinfo;

// BLE globals
BLECharacteristic *statusCharacteristic = nullptr;
BLEServer *bleServer = nullptr;
bool bleEnabled = false;
bool wifiConfigReceived = false;
bool gpsConfigReceived = false;

// WiFi connection status tracking
bool wifiConnecting = false;
int wifiAttempts = 0;
unsigned long wifiConnectStartTime = 0;
unsigned long apShutdownTime = 0;  // When to shut down AP after WiFi connects
bool wifiJustConnected = false;  // Flag to send success response then shutdown
bool successResponseSent = false;  // Track if we sent the final success response

// HTTP Server (port 8080 for PWA compatibility)
// Note: Using HTTP with CORS headers to allow HTTPS PWA access
WebServer server(8080);

// WebSocket client for relay connection
WebSocketsClient wsClient;
bool wsConnected = false;

// NeoPixel
Adafruit_NeoPixel strip = Adafruit_NeoPixel(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);
int weatherSymbol;
int currentTemperature;

// Meteomatics API
String apiUser = "myself_pro_card";
String apiPass = "j4G22VmrUE";
String apiUrlBase = "https://api.meteomatics.com/";

// NTP
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 3600;
const int daylightOffset_sec = 3600;

// Animation state
bool animationActive = false;

// Buzzer state
static unsigned long lastToneTime = 0;
bool isToneActive = false;
unsigned long toneStartTime = 0;
uint32_t toneDuration = 0;
uint32_t toneFrequency = 0;

// Function declarations
void setupBLE();
void setupWiFiAP();
void connectToWiFiViaBLE();
void getWeatherForecast(int &code, int &temperature);
void parseWeatherSymbol(JsonDocument &doc, int &code, int &temperature);
void playToneIfNecessary(String weatherCondition);
void setLEDRGB(int temperature);
void interpretWeatherSymbol(int code, int temperature);
void addCORSHeaders();
void handleCORSPreflight();
void handleRootPage();
void handleSetupPage();
void handleDeviceInfo();
void handleConnectionStatus();
void handleHealthEndpoint();
void handleWeatherEndpoint();
void handleConfigSubmission();
void handleLocationSubmission();
void handleOTAPage();
void handleOTAUpdate();
String encodeBase64(String input);
String getCurrentISOTime();
void playCloudyMelody();

// ============================================================================
// BLE CALLBACKS
// ============================================================================

// Callback for WiFi Config characteristic
class WiFiConfigCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();

    if (value.length() > 0) {
      // Parse JSON
      StaticJsonDocument<512> doc;
      DeserializationError error = deserializeJson(doc, value);

      if (!error) {
        wifiSSID = doc["ssid"].as<String>();
        wifiPassword = doc["password"].as<String>();

        Serial.println("WiFi credentials received via BLE:");
        Serial.println("SSID: " + wifiSSID);
        wifiConfigReceived = true;

        // If both WiFi and GPS received, connect
        if (wifiConfigReceived && gpsConfigReceived) {
          connectToWiFiViaBLE();
        }
      } else {
        Serial.println("Failed to parse WiFi JSON");
      }
    }
  }
};

// Callback for GPS Config characteristic
class GPSConfigCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();

    if (value.length() > 0) {
      // Parse JSON
      StaticJsonDocument<512> doc;
      DeserializationError error = deserializeJson(doc, value);

      if (!error) {
        latitude = doc["lat"].as<float>();
        longitude = doc["lon"].as<float>();

        Serial.printf("GPS coordinates received via BLE: %.6f, %.6f\n", latitude, longitude);
        gpsConfigReceived = true;

        // If both WiFi and GPS received, connect
        if (wifiConfigReceived && gpsConfigReceived) {
          connectToWiFiViaBLE();
        }
      } else {
        Serial.println("Failed to parse GPS JSON");
      }
    }
  }
};

// Callback for Status characteristic (handles BLE disable command)
class StatusCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();

    if (value.length() > 0) {
      StaticJsonDocument<256> doc;
      DeserializationError error = deserializeJson(doc, value);

      if (!error) {
        String action = doc["action"].as<String>();

        if (action == "disable_ble" && bleEnabled) {
          Serial.println("BLE disable command received");

          // Notify that we're disabling
          String response = "{\"status\":\"ble_disabled\",\"message\":\"Switching to HTTP only\"}";
          pCharacteristic->setValue(response.c_str());
          pCharacteristic->notify();

          delay(500); // Give time for notification to send

          // Disable BLE
          BLEDevice::deinit();
          bleEnabled = false;

          Serial.println("BLE disabled successfully");
        }
      }
    }
  }
};

// BLE Server Callbacks - Handle connections
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    Serial.println("BLE client connected");
    // Don't stop advertising - allow reconnections
  }

  void onDisconnect(BLEServer* pServer) {
    Serial.println("BLE client disconnected");
    // Restart advertising so other devices can connect
    if (bleEnabled) {
      delay(500); // Give some time before restarting
      BLEDevice::startAdvertising();
      Serial.println("BLE advertising restarted");
    }
  }
};

// ============================================================================
// BLE SETUP
// ============================================================================

void setupBLE() {
  Serial.println("Initializing BLE...");

  // Create BLE device name: "Potato-{DEVICEID}"
  String bleName = "Potato-" + deviceId;
  Serial.println("BLE Device Name: " + bleName);

  // Initialize BLE
  BLEDevice::init(bleName.c_str());

  // Create BLE Server
  bleServer = BLEDevice::createServer();

  // Set server callbacks to handle connections/disconnections
  bleServer->setCallbacks(new ServerCallbacks());

  // Create BLE Service
  BLEService *pService = bleServer->createService(BLE_SERVICE_UUID);

  // 1. Device Info Characteristic (READ)
  BLECharacteristic *deviceInfoChar = pService->createCharacteristic(
    BLE_DEVICE_INFO_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ
  );

  String deviceInfo = "{";
  deviceInfo += "\"device_id\":\"" + deviceId + "\",";
  deviceInfo += "\"mac_address\":\"" + WiFi.macAddress() + "\",";
  deviceInfo += "\"firmware_version\":\"1.0.0\"";
  deviceInfo += "}";
  deviceInfoChar->setValue(deviceInfo.c_str());

  // 2. WiFi Config Characteristic (WRITE)
  BLECharacteristic *wifiConfigChar = pService->createCharacteristic(
    BLE_WIFI_CONFIG_CHAR_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  wifiConfigChar->setCallbacks(new WiFiConfigCallback());

  // 3. GPS Config Characteristic (WRITE)
  BLECharacteristic *gpsConfigChar = pService->createCharacteristic(
    BLE_GPS_CONFIG_CHAR_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  gpsConfigChar->setCallbacks(new GPSConfigCallback());

  // 4. Status Characteristic (READ + NOTIFY)
  statusCharacteristic = pService->createCharacteristic(
    BLE_STATUS_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  statusCharacteristic->addDescriptor(new BLE2902());
  statusCharacteristic->setCallbacks(new StatusCallback());
  statusCharacteristic->setValue("{\"status\":\"ready\"}");

  // Start service
  pService->start();

  // Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BLE_SERVICE_UUID);
  pAdvertising->start();

  bleEnabled = true;
  Serial.println("BLE advertising started");
}

// ============================================================================
// WIFI SETUP
// ============================================================================

void setupWiFiAP() {
  Serial.println("========================================");
  Serial.println("🌐 Setting up Access Point...");

  // Configure AP network parameters explicitly
  IPAddress local_ip(192, 168, 4, 1);
  IPAddress gateway(192, 168, 4, 1);
  IPAddress subnet(255, 255, 255, 0);

  // Configure the soft AP network
  WiFi.softAPConfig(local_ip, gateway, subnet);

  // Start Access Point
  bool apStarted = WiFi.softAP(apSSID, apPassword);

  if (apStarted) {
    IPAddress ip = WiFi.softAPIP();
    Serial.println("✅ Access Point started successfully!");
    Serial.print("   SSID: ");
    Serial.println(apSSID);
    Serial.print("   Password: ");
    Serial.println(apPassword);
    Serial.print("   IP Address: ");
    Serial.println(ip);
    Serial.print("   Gateway: ");
    Serial.println(gateway);
    Serial.print("   Subnet: ");
    Serial.println(subnet);
    Serial.print("   Clients can connect and access: http://");
    Serial.print(ip);
    Serial.println(":8080");
    Serial.println("========================================");
  } else {
    Serial.println("❌ Access Point failed to start!");
    Serial.println("========================================");
  }
}

void connectToWiFiViaBLE() {
  Serial.println("Connecting to WiFi via BLE credentials...");

  // Notify: Starting connection
  if (bleEnabled && statusCharacteristic) {
    String statusJson = "{\"status\":\"connecting_wifi\",\"message\":\"Connecting to network...\"}";
    statusCharacteristic->setValue(statusJson.c_str());
    statusCharacteristic->notify();
  }

  WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 60) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    IPAddress ip = WiFi.localIP();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(ip);

    // Setup mDNS
    if (MDNS.begin("weatherpotato")) {
      Serial.println("mDNS responder started: weatherpotato.local");
      MDNS.addService("http", "tcp", 8080);
    } else {
      Serial.println("Error setting up mDNS");
    }

    // Setup HTTP server endpoints
    server.on("/", HTTP_GET, handleRootPage);
    server.on("/setup", HTTP_GET, handleSetupPage);  // For iOS fallback (avoids mixed content blocking)
    server.on("/device-info", HTTP_GET, handleDeviceInfo);  // For AP mode onboarding
    server.on("/connection-status", HTTP_GET, handleConnectionStatus);
    server.on("/health", HTTP_GET, handleHealthEndpoint);  // For PWA validation
    server.on("/weather", HTTP_GET, handleWeatherEndpoint);  // For PWA weather display
    server.on("/config", HTTP_POST, handleConfigSubmission);
    server.on("/location", HTTP_POST, handleLocationSubmission);
    server.on("/ota", HTTP_GET, handleOTAPage);
    server.on("/otaUpdate", HTTP_POST, handleOTAUpdate);

    // Handle CORS preflight requests
    server.on("/device-info", HTTP_OPTIONS, handleCORSPreflight);
    server.on("/connection-status", HTTP_OPTIONS, handleCORSPreflight);
    server.on("/health", HTTP_OPTIONS, handleCORSPreflight);
    server.on("/weather", HTTP_OPTIONS, handleCORSPreflight);
    server.on("/config", HTTP_OPTIONS, handleCORSPreflight);
    server.on("/location", HTTP_OPTIONS, handleCORSPreflight);

    server.begin();
    Serial.println("HTTP server started on port 8080 with CORS enabled");

    // Notify success via BLE
    if (bleEnabled && statusCharacteristic) {
      String successJson = "{";
      successJson += "\"status\":\"wifi_connected\",";
      successJson += "\"local_ip\":\"" + ip.toString() + "\",";
      successJson += "\"port\":8080,";
      successJson += "\"hostname\":\"weatherpotato.local\",";
      successJson += "\"device_id\":\"" + deviceId + "\"";
      successJson += "}";

      statusCharacteristic->setValue(successJson.c_str());
      statusCharacteristic->notify();

      Serial.println("Sent WiFi success notification via BLE");
    }

    // Initialize time
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  } else {
    Serial.println("WiFi connection failed");

    // Notify failure via BLE
    if (bleEnabled && statusCharacteristic) {
      String failJson = "{\"status\":\"wifi_failed\",\"message\":\"Connection timeout or invalid credentials\"}";
      statusCharacteristic->setValue(failJson.c_str());
      statusCharacteristic->notify();
    }
  }
}

// ============================================================================
// HTTP ENDPOINTS
// ============================================================================

// Helper: Add CORS headers to allow HTTPS PWA access
void addCORSHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Access-Control-Request-Private-Network");
  server.sendHeader("Access-Control-Allow-Private-Network", "true");  // Enable Private Network Access for HTTPS→HTTP
}

// Handle CORS preflight requests
void handleCORSPreflight() {
  addCORSHeaders();
  server.send(204);  // No content
}

// Health endpoint for PWA validation
void handleHealthEndpoint() {
  Serial.println("========================================");
  Serial.println("📡 INCOMING REQUEST: /health");
  Serial.print("   Client IP: ");
  Serial.println(server.client().remoteIP());
  Serial.print("   WiFi Status: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "NOT CONNECTED");
  Serial.print("   Local IP: ");
  Serial.println(WiFi.localIP());

  addCORSHeaders();  // Add CORS for HTTPS PWA access

  String response = "{";
  response += "\"device_id\":\"" + deviceId + "\",";
  response += "\"status\":\"ready\",";
  response += "\"firmware_version\":\"1.0.0\",";
  response += "\"local_ip\":\"" + WiFi.localIP().toString() + "\"";
  response += "}";

  Serial.print("   Response: ");
  Serial.println(response);

  server.send(200, "application/json", response);
  Serial.println("✅ /health responded with 200 OK");
  Serial.println("========================================");
}

// Weather endpoint for PWA display
void handleWeatherEndpoint() {
  Serial.println("========================================");
  Serial.println("📡 INCOMING REQUEST: /weather");
  Serial.print("   Method: ");
  Serial.println(server.method() == HTTP_GET ? "GET" : "OTHER");
  Serial.print("   Client IP: ");
  Serial.println(server.client().remoteIP());
  Serial.print("   WiFi Status: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "NOT CONNECTED");
  Serial.print("   Local IP: ");
  Serial.println(WiFi.localIP());

  addCORSHeaders();  // Add CORS for HTTPS PWA access

  String response = "{";
  response += "\"device_id\":\"" + deviceId + "\",";
  response += "\"condition\":\"" + lastWeatherCondition + "\",";
  response += "\"temperature\":" + String(lastTemperature) + ",";
  response += "\"symbol\":" + String(weatherSymbol) + ",";
  response += "\"location\":{";
  response += "\"latitude\":" + String(latitude, 4) + ",";
  response += "\"longitude\":" + String(longitude, 4);
  response += "},";
  response += "\"timestamp\":" + String(millis());
  response += "}";

  Serial.print("   Response: ");
  Serial.println(response);

  server.send(200, "application/json", response);
  Serial.println("✅ /weather responded with 200 OK");
  Serial.println("========================================");
}

void handleRootPage() {
  String html = R"rawliteral(
    <!DOCTYPE html>
    <html>
    <head>
      <title>Weather Potato Config</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #FF6B6B; }
        input[type=text] { width: 100%; padding: 8px; margin: 8px 0; }
        input[type=submit] { background: #4ECDC4; color: white; padding: 10px 20px; border: none; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>🥔 Weather Potato Configuration</h1>
      <form action="/location" method="POST">
        <label for="latitude">Latitude:</label><br>
        <input type="text" id="latitude" name="latitude" value="" placeholder="48.9075"><br><br>
        <label for="longitude">Longitude:</label><br>
        <input type="text" id="longitude" name="longitude" value="" placeholder="2.3833"><br><br>
        <input type="submit" value="Update Location">
      </form>
      <hr>
      <h2>Current Status</h2>
      <p><b>Device ID:</b> %DEVICEID%</p>
      <p><b>Weather:</b> %WEATHER%</p>
      <p><b>Temperature:</b> %TEMP%°C</p>
      <p><b>Local IP:</b> %IP%</p>
      <p><b>mDNS:</b> weatherpotato.local:8080</p>
      <hr>
      <h2>OTA Update</h2>
      <p><a href="/ota">Click here to update firmware</a></p>
    </body>
    </html>
  )rawliteral";

  html.replace("%DEVICEID%", deviceId);
  html.replace("%WEATHER%", lastWeatherCondition);
  html.replace("%TEMP%", String(lastTemperature));
  html.replace("%IP%", WiFi.localIP().toString());

  server.send(200, "text/html", html);
}

// Setup page for iOS fallback (HTTP page to avoid mixed content blocking)
void handleSetupPage() {
  Serial.println("========================================");
  Serial.println("📡 INCOMING REQUEST: /setup");
  Serial.print("   Client IP: ");
  Serial.println(server.client().remoteIP());
  Serial.print("   Query string: ");
  Serial.println(server.uri());
  String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weather Potato Setup</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 30px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 { text-align: center; margin-bottom: 10px; color: #333; }
    .potato { text-align: center; font-size: 60px; margin-bottom: 20px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; font-weight: 600; margin-bottom: 5px; color: #555; }
    input { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 10px; font-size: 16px; }
    input:focus { outline: none; border-color: #667eea; }
    button {
      width: 100%;
      padding: 15px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    button:hover { transform: scale(1.02); }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .message {
      padding: 15px;
      border-radius: 10px;
      margin-bottom: 20px;
      display: none;
    }
    .success { background: #d4edda; color: #155724; display: block; }
    .error { background: #f8d7da; color: #721c24; display: block; }
    .info { background: #d1ecf1; color: #0c5460; }
    small { color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="potato">🥔</div>
    <h1>Weather Potato Setup</h1>
    <p style="text-align: center; color: #666; margin-bottom: 30px;">Configure your device</p>

    <div id="message" class="message"></div>

    <form id="configForm">
      <div class="form-group">
        <label>WiFi Network (SSID)</label>
        <input type="text" id="ssid" required>
      </div>

      <div class="form-group">
        <label>WiFi Password</label>
        <input type="password" id="password" required>
        <small>Your home WiFi password</small>
      </div>

      <div class="form-group">
        <label>Latitude</label>
        <input type="text" id="latitude" pattern="-?[0-9]+\.?[0-9]*" required placeholder="48.888590">
        <small>Full precision (e.g., 48.888590317034)</small>
      </div>

      <div class="form-group">
        <label>Longitude</label>
        <input type="text" id="longitude" pattern="-?[0-9]+\.?[0-9]*" required placeholder="2.381029">
        <small>Full precision (e.g., 2.381029489226)</small>
      </div>

      <button type="submit" id="submitBtn">Send Configuration</button>
    </form>
  </div>

  <script>
    // Auto-fill from URL parameters or localStorage
    const params = new URLSearchParams(window.location.search);
    const stored = localStorage.getItem('weatherPotato_pendingConfig');

    if (params.has('ssid')) {
      document.getElementById('ssid').value = params.get('ssid') || '';
      document.getElementById('password').value = params.get('password') || '';
      document.getElementById('latitude').value = params.get('lat') || '';
      document.getElementById('longitude').value = params.get('lon') || '';
    } else if (stored) {
      try {
        const data = JSON.parse(stored);
        document.getElementById('ssid').value = data.ssid || '';
        document.getElementById('password').value = data.password || '';
        document.getElementById('latitude').value = data.latitude || '';
        document.getElementById('longitude').value = data.longitude || '';
      } catch (e) {}
    }

    // Poll connection status
    let pollInterval = null;
    function checkConnectionStatus() {
      fetch('/connection-status')
        .then(r => r.json())
        .then(data => {
          const message = document.getElementById('message');

          if (data.connected) {
            clearInterval(pollInterval);
            message.className = 'message success';
            message.innerHTML = `
              ✅ <strong>Connected to WiFi!</strong><br>
              Network: ${data.ssid}<br>
              IP: ${data.ip}<br><br>
              <strong>Success!</strong> Reconnect to "${data.ssid}" WiFi and open the PWA!<br><br>
              <small>Redirecting in 3 seconds...</small>
            `;

            // Get device ID and redirect to PWA
            fetch('/device-info')
              .then(r => r.json())
              .then(info => {
                const deviceId = info.device_id || 'unknown';

                // Redirect to PWA onboarding complete page with device info
                setTimeout(() => {
                  const redirectUrl = new URL('https://weather-potato-vercel-127v.vercel.app/onboarding-complete');
                  redirectUrl.searchParams.set('deviceId', deviceId);
                  redirectUrl.searchParams.set('ssid', data.ssid);
                  redirectUrl.searchParams.set('ip', data.ip);
                  window.location.href = redirectUrl.toString();
                }, 3000);
              })
              .catch(() => {
                // Fallback: redirect to dashboard without device ID
                setTimeout(() => {
                  window.location.href = 'https://weather-potato-vercel-127v.vercel.app/dashboard';
                }, 3000);
              });
          } else if (data.status === 'connecting') {
            message.className = 'message info';
            message.innerHTML = `🔄 Connecting to ${data.ssid}... (${data.attempt}/30)`;
            message.style.display = 'block';
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            message.className = 'message error';
            message.innerHTML = `❌ Failed to connect to WiFi.<br>Please check your password and try again.`;
            document.getElementById('submitBtn').disabled = false;
            document.getElementById('submitBtn').textContent = 'Send Configuration';
          }
        })
        .catch(err => {
          // If we can't reach the ESP32, it might have shut down AP (success!)
          console.log('Connection status check failed (AP might be off):', err);
        });
    }

    document.getElementById('configForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById('submitBtn');
      const message = document.getElementById('message');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      message.className = 'message';
      message.style.display = 'none';

      const config = {
        ssid: document.getElementById('ssid').value,
        password: document.getElementById('password').value,
        latitude: parseFloat(document.getElementById('latitude').value),
        longitude: parseFloat(document.getElementById('longitude').value)
      };

      try {
        const response = await fetch('/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });

        if (response.ok) {
          message.className = 'message info';
          message.textContent = '✅ Configuration sent! Connecting to WiFi...';
          message.style.display = 'block';
          localStorage.removeItem('weatherPotato_pendingConfig');

          // Start polling connection status
          pollInterval = setInterval(checkConnectionStatus, 2000);
          setTimeout(checkConnectionStatus, 500); // Check immediately
        } else {
          throw new Error('HTTP ' + response.status);
        }
      } catch (error) {
        message.className = 'message error';
        message.textContent = '❌ Failed to send configuration: ' + error.message;
        message.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Configuration';
      }
    });
  </script>
</body>
</html>
)rawliteral";

  server.send(200, "text/html", html);
  Serial.println("✅ /setup responded with HTML page");
  Serial.println("========================================");
}

// Device info endpoint for AP mode onboarding
void handleDeviceInfo() {
  Serial.println("========================================");
  Serial.println("📡 INCOMING REQUEST: /device-info");
  Serial.print("   Method: ");
  Serial.println(server.method() == HTTP_GET ? "GET" : "OTHER");
  Serial.print("   Client IP: ");
  Serial.println(server.client().remoteIP());
  Serial.print("   Headers: ");
  Serial.println(server.headers());

  addCORSHeaders();  // Add CORS for PWA access

  String response = "{";
  response += "\"device_id\":\"" + deviceId + "\",";
  response += "\"mac_address\":\"" + WiFi.macAddress() + "\",";
  response += "\"firmware_version\":\"1.0.0\",";
  response += "\"ap_ssid\":\"" + String(apSSID) + "\",";
  response += "\"ap_ip\":\"" + WiFi.softAPIP().toString() + "\",";
  response += "\"mode\":\"AP\"";
  response += "}";

  Serial.print("   Response: ");
  Serial.println(response);

  server.send(200, "application/json", response);
  Serial.println("✅ /device-info responded with 200 OK");
  Serial.println("========================================");
}

// Connection status endpoint for setup page polling
void handleConnectionStatus() {
  Serial.println("[Status] Connection status requested");

  addCORSHeaders();

  String response = "{";

  if (WiFi.status() == WL_CONNECTED) {
    response += "\"connected\":true,";
    response += "\"status\":\"connected\",";
    response += "\"ssid\":\"" + WiFi.SSID() + "\",";
    response += "\"ip\":\"" + WiFi.localIP().toString() + "\"";

    // Mark that we sent the success response
    if (wifiJustConnected && !successResponseSent) {
      successResponseSent = true;
      Serial.println("[Status] Success response sent - AP will shutdown in 5 seconds");
      apShutdownTime = millis() + 5000;  // Shutdown AP in 5 seconds
    }
  } else if (wifiConnecting) {
    response += "\"connected\":false,";
    response += "\"status\":\"connecting\",";
    response += "\"ssid\":\"" + wifiSSID + "\",";
    response += "\"attempt\":" + String(wifiAttempts);
  } else {
    response += "\"connected\":false,";
    response += "\"status\":\"idle\"";
  }

  response += "}";

  server.send(200, "application/json", response);
  Serial.println("[Status] Sent: " + response);
}

void handleConfigSubmission() {
  Serial.println("========================================");
  Serial.println("📡 INCOMING REQUEST: /config");
  Serial.print("   Method: POST | Client IP: ");
  Serial.println(server.client().remoteIP());

  addCORSHeaders();  // Add CORS for PWA access

  // Parse JSON body
  String body = server.arg("plain");
  Serial.print("   Request body: ");
  Serial.println(body);

  StaticJsonDocument<300> doc;
  DeserializationError error = deserializeJson(doc, body);

  if (error) {
    Serial.printf("JSON parse error: %s\n", error.c_str());
    String response = "{\"success\":false,\"error\":\"Invalid JSON\"}";
    server.send(400, "application/json", response);
    return;
  }

  // Extract WiFi credentials
  if (doc.containsKey("ssid") && doc.containsKey("password")) {
    wifiSSID = doc["ssid"].as<String>();
    wifiPassword = doc["password"].as<String>();

    Serial.println("WiFi credentials updated via HTTP/AP");
    Serial.println("SSID: " + wifiSSID);

    // Optional: Extract GPS coordinates if provided
    if (doc.containsKey("latitude") && doc.containsKey("longitude")) {
      latitude = doc["latitude"].as<float>();
      longitude = doc["longitude"].as<float>();
      Serial.printf("GPS coordinates also received: %.6f, %.6f\n", latitude, longitude);
    }

    // Send success response
    String response = "{";
    response += "\"success\":true,";
    response += "\"message\":\"Connecting to WiFi...\",";
    response += "\"ssid\":\"" + wifiSSID + "\"";
    response += "}";

    Serial.print("   ✅ Sending response: ");
    Serial.println(response);

    server.send(200, "application/json", response);

    Serial.println("✅ /config responded with 200 OK");
    Serial.println("🔌 Attempting to connect to WiFi...");
    Serial.println("========================================");

    // Start WiFi connection (non-blocking - handled in loop())
    WiFi.disconnect();
    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());

    wifiConnecting = true;
    wifiAttempts = 0;
    wifiConnectStartTime = millis();

    Serial.println("📶 WiFi connection initiated (non-blocking)");
  } else {
    Serial.println("   ❌ ERROR: Missing ssid or password in request");
    String response = "{\"success\":false,\"error\":\"Missing ssid or password\"}";
    server.send(400, "application/json", response);
    Serial.println("========================================");
  }
}

void handleLocationSubmission() {
  addCORSHeaders();  // Add CORS for HTTPS PWA access

  // Parse JSON body
  String body = server.arg("plain");
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, body);

  if (error) {
    Serial.printf("JSON parse error: %s\n", error.c_str());
    String response = "{\"success\":false,\"error\":\"Invalid JSON\"}";
    server.send(400, "application/json", response);
    return;
  }

  // Extract coordinates
  if (doc.containsKey("latitude") && doc.containsKey("longitude")) {
    latitude = doc["latitude"].as<float>();
    longitude = doc["longitude"].as<float>();

    Serial.printf("Location updated via HTTP: %.6f, %.6f\n", latitude, longitude);

    // Send success response
    String response = "{";
    response += "\"success\":true,";
    response += "\"latitude\":" + String(latitude, 6) + ",";
    response += "\"longitude\":" + String(longitude, 6) + ",";
    response += "\"message\":\"Location updated, fetching weather...\"";
    response += "}";
    server.send(200, "application/json", response);

    // Trigger weather update in background
    Serial.println("Triggering weather update for new location...");
    // Weather will be fetched in next loop cycle
  } else {
    String response = "{\"success\":false,\"error\":\"Missing latitude or longitude\"}";
    server.send(400, "application/json", response);
  }
}

void handleOTAPage() {
  String html = R"rawliteral(
    <!DOCTYPE html>
    <html>
    <head>
      <title>ESP32 OTA Update</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #FF6B6B; }
      </style>
    </head>
    <body>
      <h1>🔧 OTA Firmware Update</h1>
      <form method="POST" action="/otaUpdate" enctype="multipart/form-data">
        <input type="file" name="firmware">
        <input type="submit" value="Upload Firmware">
      </form>
    </body>
    </html>
  )rawliteral";

  server.send(200, "text/html", html);
}

void handleOTAUpdate() {
  HTTPUpload& upload = server.upload();

  if (upload.status == UPLOAD_FILE_START) {
    Serial.printf("OTA Update: %s\n", upload.filename.c_str());
    if (!Update.begin(UPDATE_SIZE_UNKNOWN)) {
      Update.printError(Serial);
    }
  } else if (upload.status == UPLOAD_FILE_WRITE) {
    if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) {
      Update.printError(Serial);
    }
  } else if (upload.status == UPLOAD_FILE_END) {
    if (Update.end(true)) {
      Serial.printf("OTA Update Success: %u bytes\n", upload.totalSize);
      server.send(200, "text/plain", "Update successful. Rebooting...");
      delay(1000);
      ESP.restart();
    } else {
      Update.printError(Serial);
      server.send(500, "text/plain", "Update failed");
    }
  } else {
    server.send(500, "text/plain", "Upload error");
  }
}

// ============================================================================
// WEBSOCKET RELAY HANDLERS
// ============================================================================

String processLocalRequest(const char* method, const char* path, JsonVariant body) {
  String response;

  if (strcmp(path, "/health") == 0) {
    StaticJsonDocument<256> doc;
    doc["device_id"] = deviceId;
    doc["status"] = "ready";
    doc["firmware_version"] = "1.0.0";
    doc["local_ip"] = WiFi.localIP().toString();
    serializeJson(doc, response);

  } else if (strcmp(path, "/weather") == 0) {
    StaticJsonDocument<512> doc;
    doc["device_id"] = deviceId;
    doc["condition"] = lastWeatherCondition;
    doc["temperature"] = lastTemperature;
    doc["symbol"] = weatherSymbol;

    JsonObject location = doc.createNestedObject("location");
    location["latitude"] = latitude;
    location["longitude"] = longitude;

    doc["timestamp"] = millis();
    serializeJson(doc, response);

  } else if (strcmp(path, "/device-info") == 0) {
    StaticJsonDocument<256> doc;
    doc["device_id"] = deviceId;
    doc["mac_address"] = WiFi.macAddress();
    doc["firmware_version"] = "1.0.0";
    serializeJson(doc, response);

  } else if (strcmp(path, "/location") == 0 && strcmp(method, "POST") == 0) {
    // Update location from body
    if (!body.isNull()) {
      float newLat = body["latitude"];
      float newLon = body["longitude"];

      latitude = newLat;
      longitude = newLon;

      Serial.printf("[WS] Location updated: %.4f, %.4f\n", latitude, longitude);

      StaticJsonDocument<256> doc;
      doc["success"] = true;
      doc["latitude"] = latitude;
      doc["longitude"] = longitude;
      serializeJson(doc, response);

      // Trigger weather fetch (async)
      // fetchWeather(); // Uncomment if you want immediate weather update
    }
  }

  return response;
}

void handleWebSocketMessage(const char* payload) {
  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, payload);

  if (error) {
    Serial.println("[WS] Failed to parse message");
    return;
  }

  const char* type = doc["type"];
  if (strcmp(type, "request") != 0) {
    return;  // Ignore non-request messages
  }

  const char* requestId = doc["id"];
  const char* method = doc["method"];
  const char* path = doc["path"];

  Serial.printf("[WS] Request: %s %s (id=%s)\n", method, path, requestId);

  // Process request internally
  String responseData = processLocalRequest(method, path, doc["body"]);

  // Send response back to relay
  StaticJsonDocument<2048> responseDoc;
  responseDoc["id"] = requestId;
  responseDoc["type"] = "response";
  responseDoc["status"] = 200;

  // Parse response data into JSON object
  StaticJsonDocument<1024> dataDoc;
  deserializeJson(dataDoc, responseData);
  responseDoc["data"] = dataDoc.as<JsonObject>();

  String responseMsg;
  serializeJson(responseDoc, responseMsg);
  wsClient.sendTXT(responseMsg);
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected from relay");
      wsConnected = false;
      break;

    case WStype_CONNECTED:
      Serial.println("[WS] ✅ Connected to relay");
      wsConnected = true;

      // Send registration message
      {
        StaticJsonDocument<256> regDoc;
        regDoc["type"] = "register";
        regDoc["device_id"] = deviceId;
        regDoc["firmware_version"] = "1.0.0";

        String regMsg;
        serializeJson(regDoc, regMsg);
        wsClient.sendTXT(regMsg);
        Serial.println("[WS] Sent registration");
      }
      break;

    case WStype_TEXT:
      Serial.printf("[WS] Received: %s\n", payload);
      handleWebSocketMessage((char*)payload);
      break;

    case WStype_ERROR:
      Serial.println("[WS] Error occurred");
      break;

    default:
      break;
  }
}

// ============================================================================
// SETUP & LOOP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n=== Weather Potato Starting ===");

  // Generate Device ID from MAC address (first 8 hex chars, uppercase)
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  deviceId = mac.substring(0, 8);
  deviceId.toUpperCase();
  Serial.println("Device ID: " + deviceId);
  Serial.println("MAC Address: " + WiFi.macAddress());

  // Setup hardware
  pinMode(CAP_SENSOR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // Initialize NeoPixel
  strip.begin();
  strip.show();
  strip.setBrightness(50);

  // LED test (red flash)
  strip.setPixelColor(0, strip.Color(255, 0, 0));
  strip.show();
  delay(1000);
  strip.setPixelColor(0, strip.Color(0, 0, 0));
  strip.show();

  // Setup buzzer LEDC
  ledc_timer_config_t ledc_timer = {
    .speed_mode = BUZZER_MODE,
    .duty_resolution = BUZZER_RESOLUTION,
    .timer_num = BUZZER_TIMER,
    .freq_hz = BUZZER_FREQUENCY,
    .clk_cfg = LEDC_AUTO_CLK
  };
  ESP_ERROR_CHECK(ledc_timer_config(&ledc_timer));

  ledc_channel_config_t ledc_channel = {
    .gpio_num = BUZZER_PIN,
    .speed_mode = BUZZER_MODE,
    .channel = BUZZER_CHANNEL,
    .intr_type = LEDC_INTR_DISABLE,
    .timer_sel = BUZZER_TIMER,
    .duty = 0,
    .hpoint = 0
  };
  ESP_ERROR_CHECK(ledc_channel_config(&ledc_channel));

  Serial.println("Hardware setup complete");

  // TODO: Check EEPROM for saved WiFi credentials
  // For now, check if we have credentials in variables

  // Try to connect with existing credentials (if any)
  WiFi.mode(WIFI_STA);

  if (wifiSSID.length() > 0) {
    Serial.println("Found existing WiFi credentials, attempting connection...");
    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("Connected to existing WiFi!");
      Serial.print("IP: ");
      Serial.println(WiFi.localIP());

      // Setup mDNS and HTTP server
      if (MDNS.begin("weatherpotato")) {
        Serial.println("mDNS started: weatherpotato.local");
        MDNS.addService("http", "tcp", 8080);
      }

      server.on("/", HTTP_GET, handleRootPage);
      server.on("/setup", HTTP_GET, handleSetupPage);
      server.on("/device-info", HTTP_GET, handleDeviceInfo);
      server.on("/health", HTTP_GET, handleHealthEndpoint);
      server.on("/weather", HTTP_GET, handleWeatherEndpoint);
      server.on("/config", HTTP_POST, handleConfigSubmission);
      server.on("/location", HTTP_POST, handleLocationSubmission);
      server.on("/ota", HTTP_GET, handleOTAPage);
      server.on("/otaUpdate", HTTP_POST, handleOTAUpdate);

      // Handle CORS preflight requests
      server.on("/device-info", HTTP_OPTIONS, handleCORSPreflight);
      server.on("/health", HTTP_OPTIONS, handleCORSPreflight);
      server.on("/weather", HTTP_OPTIONS, handleCORSPreflight);
      server.on("/config", HTTP_OPTIONS, handleCORSPreflight);
      server.on("/location", HTTP_OPTIONS, handleCORSPreflight);

      server.begin();
      Serial.println("HTTP server started on port 8080");

      configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

      Serial.println("=== Setup Complete ===\n");
      return; // Skip BLE setup
    }
  }

  // No WiFi connection - Start BLE for onboarding
  Serial.println("No WiFi connection. Starting BLE for onboarding...");
  setupBLE();

  // Also start AP mode as backup
  setupWiFiAP();

  // CRITICAL: Register HTTP server endpoints for AP mode!
  Serial.println("🌐 Starting HTTP server for AP mode...");

  server.on("/", HTTP_GET, handleRootPage);
  server.on("/setup", HTTP_GET, handleSetupPage);
  server.on("/device-info", HTTP_GET, handleDeviceInfo);
  server.on("/connection-status", HTTP_GET, handleConnectionStatus);
  server.on("/health", HTTP_GET, handleHealthEndpoint);
  server.on("/weather", HTTP_GET, handleWeatherEndpoint);
  server.on("/config", HTTP_POST, handleConfigSubmission);
  server.on("/location", HTTP_POST, handleLocationSubmission);
  server.on("/ota", HTTP_GET, handleOTAPage);
  server.on("/otaUpdate", HTTP_POST, handleOTAUpdate);

  // Handle CORS preflight requests
  server.on("/device-info", HTTP_OPTIONS, handleCORSPreflight);
  server.on("/connection-status", HTTP_OPTIONS, handleCORSPreflight);
  server.on("/health", HTTP_OPTIONS, handleCORSPreflight);
  server.on("/weather", HTTP_OPTIONS, handleCORSPreflight);
  server.on("/config", HTTP_OPTIONS, handleCORSPreflight);
  server.on("/location", HTTP_OPTIONS, handleCORSPreflight);

  server.begin();
  Serial.println("✅ HTTP server started on port 8080 (AP mode)");
  Serial.println("========================================");
  Serial.println("📡 Server is ready to accept requests!");
  Serial.println("   Access from: http://192.168.4.1:8080");
  Serial.println("   Try: http://192.168.4.1:8080/setup");
  Serial.println("========================================");

  Serial.println("=== Setup Complete ===\n");
}

void loop() {
  // mDNS runs automatically on ESP32, no update() needed

  // Handle HTTP requests (CRITICAL: Must work in both AP mode and STA mode!)
  // Previously only handled requests when WiFi.status() == WL_CONNECTED
  // This caused AP mode to NEVER process requests!
  server.handleClient();

  // Handle WebSocket relay connection (only when WiFi connected)
  if (WiFi.status() == WL_CONNECTED) {
    wsClient.loop();
  }

  // Monitor WiFi connection progress (non-blocking)
  if (wifiConnecting) {
    wl_status_t status = WiFi.status();

    // Debug: Print status every 5 seconds
    static unsigned long lastStatusPrint = 0;
    if (millis() - lastStatusPrint > 5000) {
      Serial.printf("[DEBUG] wifiConnecting=true, status=%d, elapsed=%lus\n",
                    status, (millis() - wifiConnectStartTime) / 1000);
      lastStatusPrint = millis();
    }

    if (status == WL_CONNECTED) {
      // SUCCESS! WiFi connected
      Serial.println("========================================");
      Serial.println("✅ WiFi Connected!");
      Serial.print("   SSID: ");
      Serial.println(WiFi.SSID());
      Serial.print("   IP: ");
      Serial.println(WiFi.localIP());
      Serial.print("   Gateway: ");
      Serial.println(WiFi.gatewayIP());
      Serial.print("   DNS: ");
      Serial.println(WiFi.dnsIP());
      Serial.println("   Waiting for setup page to poll status...");
      Serial.println("   AP will shutdown after sending success response");
      Serial.println("========================================");

      wifiConnecting = false;
      wifiJustConnected = true;  // Flag for next status poll

      // Setup mDNS
      Serial.println("[DEBUG] Setting up mDNS...");
      if (MDNS.begin("weatherpotato")) {
        Serial.println("✅ mDNS started: weatherpotato.local");
        MDNS.addService("http", "tcp", 8080);
        Serial.println("✅ mDNS HTTP service registered");
      } else {
        Serial.println("⚠️  mDNS failed to start");
      }

      // CRITICAL: Restart HTTP server for WiFi interface
      // The server was bound to AP interface (192.168.4.1)
      // Now we need to rebind to the new WiFi IP
      Serial.println("[DEBUG] About to restart HTTP server...");
      Serial.println("🔄 Restarting HTTP server for WiFi interface...");

      Serial.println("[DEBUG] Closing existing server...");
      server.close();  // Stop the server

      Serial.println("[DEBUG] Registering endpoints...");
      // Re-register all endpoints
      server.on("/", HTTP_GET, handleRootPage);
      server.on("/setup", HTTP_GET, handleSetupPage);
      server.on("/device-info", HTTP_GET, handleDeviceInfo);
      server.on("/connection-status", HTTP_GET, handleConnectionStatus);
      server.on("/health", HTTP_GET, handleHealthEndpoint);
      server.on("/weather", HTTP_GET, handleWeatherEndpoint);
      server.on("/config", HTTP_POST, handleConfigSubmission);
      server.on("/location", HTTP_POST, handleLocationSubmission);
      server.on("/ota", HTTP_GET, handleOTAPage);
      server.on("/otaUpdate", HTTP_POST, handleOTAUpdate);
      Serial.println("[DEBUG] Endpoints registered");

      Serial.println("[DEBUG] Registering CORS preflight handlers...");
      // Re-register CORS preflight
      server.on("/device-info", HTTP_OPTIONS, handleCORSPreflight);
      server.on("/connection-status", HTTP_OPTIONS, handleCORSPreflight);
      server.on("/health", HTTP_OPTIONS, handleCORSPreflight);
      server.on("/weather", HTTP_OPTIONS, handleCORSPreflight);
      server.on("/config", HTTP_OPTIONS, handleCORSPreflight);
      server.on("/location", HTTP_OPTIONS, handleCORSPreflight);
      Serial.println("[DEBUG] CORS handlers registered");

      Serial.println("[DEBUG] Starting server...");
      server.begin();  // Restart server on WiFi interface
      Serial.println("✅ HTTP server restarted on WiFi interface");
      Serial.print("   Access from: http://");
      Serial.print(WiFi.localIP());
      Serial.println(":8080");
      Serial.print("   Or via mDNS: http://weatherpotato.local:8080");
      Serial.println();
      Serial.println("[DEBUG] Server is now listening for requests");

      // Initialize WebSocket relay connection
      Serial.println("[WS] Connecting to relay server...");
      // For local testing, use: wsClient.begin("192.168.1.100", 3000, "/");
      // For production, use WSS with proper host
      wsClient.begin("localhost", 3000, "/");  // Change to your relay server
      wsClient.onEvent(webSocketEvent);
      wsClient.setReconnectInterval(5000);
      Serial.println("[WS] WebSocket client initialized");

      // Configure NTP for time sync
      Serial.println("[DEBUG] Configuring NTP...");
      configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
      Serial.println("[DEBUG] NTP configured");

      Serial.println("========================================");
      Serial.println("🎉 SETUP COMPLETE - Ready for requests!");
      Serial.println("========================================");

    } else {
      // Still connecting - update attempt counter
      unsigned long elapsed = millis() - wifiConnectStartTime;
      wifiAttempts = elapsed / 1000;  // Convert to seconds

      if (wifiAttempts > 30) {
        // Connection failed after 30 seconds
        Serial.println("========================================");
        Serial.println("❌ WiFi Connection Failed");
        Serial.println("   Timeout after 30 seconds");
        Serial.println("========================================");
        wifiConnecting = false;
        wifiAttempts = 0;
      }
    }
  }

  // Shutdown AP after successful WiFi connection
  if (apShutdownTime > 0 && millis() > apShutdownTime) {
    Serial.println("========================================");
    Serial.println("🔌 Shutting down Access Point...");
    WiFi.softAPdisconnect(true);
    Serial.println("✅ AP shutdown complete");
    Serial.println("   Device now in STA mode only");
    Serial.println("========================================");
    apShutdownTime = 0;  // Clear flag
  }

  // Sync time if needed (only when connected to WiFi as client)
  if (WiFi.status() == WL_CONNECTED && !getLocalTime(&timeinfo)) {
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
    delay(1000);
  }

  // Handle capacitive touch for weather display
  static unsigned long lastTouchTime = 0;
  unsigned long currentTime = millis();

  if (digitalRead(CAP_SENSOR_PIN) == HIGH) {
    if (!animationActive && (currentTime - lastTouchTime > 10000)) {
      Serial.println("Capacitive touch detected!");

      if (WiFi.status() == WL_CONNECTED) {
        getWeatherForecast(weatherSymbol, currentTemperature);
        interpretWeatherSymbol(weatherSymbol, currentTemperature);
        setLEDRGB(currentTemperature);
      } else {
        Serial.println("WiFi not connected, skipping weather fetch");
      }

      lastTouchTime = currentTime;
    }
  }

  // Continue animation if active
  if (animationActive) {
    setLEDRGB(currentTemperature);
  }

  // Handle buzzer
  playToneIfNecessary("");

  delay(10);
}

// ============================================================================
// WEATHER & API FUNCTIONS
// ============================================================================

String getCurrentISOTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Failed to obtain time");
    return "2024-10-18T12:00:00Z";
  }

  char isoTime[30];
  strftime(isoTime, sizeof(isoTime), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(isoTime);
}

String encodeBase64(String input) {
  const char base64_chars[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  String encoded = "";
  int i = 0, j = 0;
  unsigned char char_array_3[3], char_array_4[4];

  for (size_t n = 0; n < input.length(); n++) {
    char_array_3[i++] = input[n];
    if (i == 3) {
      char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
      char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
      char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
      char_array_4[3] = char_array_3[2] & 0x3f;

      for (i = 0; (i < 4); i++)
        encoded += base64_chars[char_array_4[i]];
      i = 0;
    }
  }

  if (i) {
    for (j = i; j < 3; j++)
      char_array_3[j] = '\0';

    char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
    char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
    char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
    char_array_4[3] = char_array_3[2] & 0x3f;

    for (j = 0; (j < i + 1); j++)
      encoded += base64_chars[char_array_4[j]];

    while ((i++ < 3))
      encoded += '=';
  }

  return encoded;
}

void getWeatherForecast(int &code, int &temperature) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return;
  }

  HTTPClient http;
  String currentISOTime = getCurrentISOTime();
  String apiUrl = apiUrlBase + currentISOTime + "/t_2m:C,weather_symbol_1h:idx/" +
                  String(latitude, 6) + "," + String(longitude, 6) + "/json?model=mix";

  String auth = apiUser + ":" + apiPass;
  String encodedAuth = encodeBase64(auth);

  Serial.println("API URL: " + apiUrl);

  http.begin(apiUrl);
  http.addHeader("Authorization", "Basic " + encodedAuth);

  int httpResponseCode = http.GET();
  if (httpResponseCode > 0) {
    String payload = http.getString();
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (!error) {
      parseWeatherSymbol(doc, code, temperature);
      Serial.printf("Weather Code: %d, Temperature: %d°C\n", code, temperature);
    } else {
      Serial.println("JSON deserialization error");
    }
  } else {
    Serial.printf("HTTP Error: %d\n", httpResponseCode);
    Serial.println(http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

void parseWeatherSymbol(JsonDocument &doc, int &code, int &temperature) {
  code = -1;
  temperature = -999;

  JsonArray dataArray = doc["data"];

  for (JsonObject dataObject : dataArray) {
    const char* parameter = dataObject["parameter"];

    if (strcmp(parameter, "t_2m:C") == 0) {
      temperature = dataObject["coordinates"][0]["dates"][0]["value"];
    }

    if (strcmp(parameter, "weather_symbol_1h:idx") == 0) {
      code = dataObject["coordinates"][0]["dates"][0]["value"];
    }
  }

  lastTemperature = temperature;
}

// ============================================================================
// LED & BUZZER FUNCTIONS
// ============================================================================

void setLEDRGB(int temperature) {
  static unsigned long animationStartTime = 0;
  static unsigned long lastUpdateTime = 0;
  static int animationStep = 0;

  const unsigned long animationDuration = 10000;
  const unsigned long updateInterval = 100;

  unsigned long currentTime = millis();

  if (!animationActive) {
    Serial.println("Starting LED animation...");
    animationStartTime = currentTime;
    lastUpdateTime = currentTime;
    animationStep = 0;
    animationActive = true;
  }

  if (animationActive && (currentTime - animationStartTime >= animationDuration)) {
    Serial.println("Ending LED animation...");
    for (int i = 0; i < NUM_LEDS; i++) {
      strip.setPixelColor(i, strip.Color(0, 0, 0));
    }
    strip.show();
    animationActive = false;
    return;
  }

  if (animationActive && (currentTime - lastUpdateTime >= updateInterval)) {
    lastUpdateTime = currentTime;

    if (temperature <= 0) {
      // Cold: Blue gradient rotation
      for (int i = 0; i < NUM_LEDS; i++) {
        float factor = 1.0 - (((i + animationStep) % NUM_LEDS) / (float)NUM_LEDS);
        int adjustedBlue = map(temperature, -10, 0, 128, 255) * factor;
        strip.setPixelColor((i + animationStep) % NUM_LEDS, strip.Color(0, 0, adjustedBlue));
      }
      animationStep = (animationStep + 1) % NUM_LEDS;
    } else if (temperature > 0 && temperature <= 25) {
      // Moderate: Pulsing cyan/green
      static int brightness = 0;
      static bool increasing = true;

      if (increasing) {
        brightness += 15;
        if (brightness >= 255) increasing = false;
      } else {
        brightness -= 15;
        if (brightness <= 0) increasing = true;
      }

      int red = map(temperature, 0, 25, 0, 128);
      int green = map(temperature, 0, 25, 255, 128);
      int blue = map(temperature, 0, 25, 255, 64);

      for (int i = 0; i < NUM_LEDS; i++) {
        int adjustedRed = red * brightness / 255;
        int adjustedGreen = green * brightness / 255;
        int adjustedBlue = blue * brightness / 255;
        strip.setPixelColor(i, strip.Color(adjustedRed, adjustedGreen, adjustedBlue));
      }
    } else if (temperature > 25) {
      // Hot: Flame effect
      for (int i = 0; i < NUM_LEDS; i++) {
        if (random(10) > 7) {
          strip.setPixelColor(i, strip.Color(255, random(64, 128), 0));
        } else {
          strip.setPixelColor(i, strip.Color(128, random(32, 64), 0));
        }
      }
    }

    strip.show();
  }
}

void playCloudyMelody() {
  int melody[] = {261, 294, 330, 294, 261};
  int noteDurations[] = {400, 400, 600, 400, 600};

  for (int i = 0; i < 5; i++) {
    tone(BUZZER_PIN, melody[i], noteDurations[i]);
    delay(noteDurations[i] * 1.3);
  }
  noTone(BUZZER_PIN);
}

void playToneIfNecessary(String weatherCondition) {
  unsigned long currentTime = millis();

  if (!isToneActive) {
    if (weatherCondition == "clear_sky") {
      toneFrequency = 1000;
      toneDuration = 500;
    } else if (weatherCondition == "light_clouds" || weatherCondition == "partly_cloudy") {
      toneFrequency = 800;
      toneDuration = 400;
    } else if (weatherCondition == "cloudy" || weatherCondition == "overcast") {
      playCloudyMelody();
      return;
    } else if (weatherCondition == "rain" || weatherCondition == "rain_shower" || weatherCondition == "drizzle") {
      toneFrequency = 500 + random(-100, 100);
      toneDuration = 200;
    } else if (weatherCondition == "thunderstorm") {
      toneFrequency = 200;
      toneDuration = 700;
    } else if (weatherCondition == "snow" || weatherCondition == "snow_shower") {
      toneFrequency = 1200;
      toneDuration = 300;
    } else if (weatherCondition == "light_fog") {
      toneFrequency = 400;
      toneDuration = 800;
    } else if (weatherCondition == "dense_fog") {
      toneFrequency = 300;
      toneDuration = 1000;
    } else if (weatherCondition == "freezing_rain") {
      toneFrequency = 700;
      toneDuration = 300;
    } else if (weatherCondition == "sandstorm") {
      toneFrequency = 300 + random(-50, 50);
      toneDuration = 200;
    } else {
      toneFrequency = 0;
      toneDuration = 0;
    }

    if (toneFrequency > 0 && toneDuration > 0) {
      ledc_set_freq(BUZZER_MODE, BUZZER_TIMER, toneFrequency);
      ledc_set_duty(BUZZER_MODE, BUZZER_CHANNEL, 128);
      ledc_update_duty(BUZZER_MODE, BUZZER_CHANNEL);
      toneStartTime = currentTime;
      isToneActive = true;
    }
  }

  if (isToneActive && currentTime - toneStartTime >= toneDuration) {
    ledc_set_duty(BUZZER_MODE, BUZZER_CHANNEL, 0);
    ledc_update_duty(BUZZER_MODE, BUZZER_CHANNEL);
    isToneActive = false;
  }
}

void interpretWeatherSymbol(int code, int temperature) {
  if (code >= 100) {
    code -= 100;
  }

  String weatherCondition = "";

  switch (code) {
    case 0: weatherCondition = ""; break;
    case 1: weatherCondition = "clear_sky"; break;
    case 2: weatherCondition = "light_clouds"; break;
    case 3: weatherCondition = "partly_cloudy"; break;
    case 4: weatherCondition = "cloudy"; break;
    case 5: weatherCondition = "rain"; break;
    case 6: weatherCondition = "rain_and_snow"; break;
    case 7: weatherCondition = "snow"; break;
    case 8: weatherCondition = "rain_shower"; break;
    case 9: weatherCondition = "snow_shower"; break;
    case 10: weatherCondition = "sleet_shower"; break;
    case 11: weatherCondition = "light_fog"; break;
    case 12: weatherCondition = "dense_fog"; break;
    case 13: weatherCondition = "freezing_rain"; break;
    case 14: weatherCondition = "thunderstorm"; break;
    case 15: weatherCondition = "drizzle"; break;
    case 16: weatherCondition = "sandstorm"; break;
    default: weatherCondition = ""; break;
  }

  playToneIfNecessary(weatherCondition);
  lastWeatherCondition = weatherCondition;
}
