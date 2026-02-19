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
#include <WebServer.h>
#include <Update.h>
#include <ESPmDNS.h>
#include <WebSocketsClient.h>
#include <Preferences.h>

// ISRG Root X1 Certificate (Let's Encrypt, used by Railway)
// Chain: *.up.railway.app → R13 → ISRG Root X1
// Valid until: June 4, 2035
const char* isrg_root_x1_ca = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)EOF";

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
#define BOOT_BTN_PIN 0   // GPIO0 — BOOT button, active LOW (all ESP32 dev boards)
#define BUZZER_CHANNEL LEDC_CHANNEL_0
#define BUZZER_TIMER LEDC_TIMER_0
#define BUZZER_MODE LEDC_LOW_SPEED_MODE
#define BUZZER_FREQUENCY 2000
#define BUZZER_RESOLUTION LEDC_TIMER_8_BIT

// Non-volatile storage (Preferences wraps ESP32 NVS)
Preferences prefs;

// Factory-reset button state
unsigned long btnPressStart = 0;  // millis() when BOOT btn was first held
bool btnIndicatorActive = false;  // true while we're drawing the LED progress ring

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
// OTA security token — generated once at first boot, stored in NVS.
// Must be supplied in every ota_request; wrong token = update rejected.
String otaToken = "";
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

// Open-Meteo API (free, no key required)
const char* weatherApiBase = "https://api.open-meteo.com/v1/forecast";

// NTP
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 3600;
const int daylightOffset_sec = 3600;

// LED animation state
bool animationActive = false;
unsigned long ledAnimStart = 0;
unsigned long ledLastUpdate = 0;
int ledPulsePos = 0;
String ledWeatherEffect = "";
unsigned long ledThunderLast = 0;
bool ledThunderOn = false;
unsigned long ledThunderFlashStart = 0;
int ledFogBrightness = 40;
bool ledFogInc = true;

// Buzzer note sequencer state
const int SEQ_MAX = 32;           // max 32 notes per melody
int seqFreq[SEQ_MAX];
int seqDur[SEQ_MAX];
int seqDuty[SEQ_MAX];             // LEDC duty 0-255; 0 = rest
int seqVibDepth[SEQ_MAX];         // vibrato depth in Hz (0 = no vibrato)
int seqVibRate[SEQ_MAX];          // ms between vibrato steps (0 = no vibrato)
int seqLen = 0;
int seqIdx = 0;
bool seqActive = false;
unsigned long seqNoteStart = 0;
// Vibrato runtime state (for the currently playing note)
unsigned long seqVibTimer = 0;
int seqVibOffset = 0;             // current Hz offset from base freq
int seqVibDir = 1;                // triangle LFO direction (+1 / -1)

// Function declarations
void loadCredentials();
void saveCredentials();
void factoryReset();
void setupBLE();
void setupWiFiAP();
void connectToWiFiViaBLE();
void getWeatherForecast(int &code, int &temperature);
void parseWeatherSymbol(JsonDocument &doc, int &code, int &temperature);
void startWeatherMelody(String condition);
void updateBuzzer();
uint32_t getTemperatureColor(int temperature);
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
void performOTA(const String& firmwareUrl);

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
        saveCredentials();  // persist to NVS
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
        saveCredentials();  // persist to NVS
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

    // Deinit BLE now — frees ~50 KB RAM needed for SSL.
    // Set bleEnabled = false BEFORE deinit so onDisconnect won't try to
    // restart advertising on the already-torn-down BLE stack.
    delay(300); // give the notification time to reach the client
    bleEnabled = false;
    BLEDevice::deinit(true);
    Serial.printf("[BLE] Deinited after WiFi connect — free heap: %u bytes\n", ESP.getFreeHeap());

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
      <button type="submit" id="submitBtn">Send Configuration</button>

      <div class="form-group" style="margin-top: 20px;">
        <label>WiFi Network (SSID)</label>
        <input type="text" id="ssid" required>
      </div>

      <div class="form-group">
        <label>WiFi Password</label>
        <input type="password" id="password" required>
        <small>Your home WiFi password</small>
      </div>

      <div class="form-group">
        <label>Location</label>
        <input type="text" id="city" readonly style="background: #f5f5f5; cursor: default;">
        <input type="hidden" id="latitude">
        <input type="hidden" id="longitude">
      </div>
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
      document.getElementById('city').value = params.get('city') || (params.get('lat') + ', ' + params.get('lon'));
    } else if (stored) {
      try {
        const data = JSON.parse(stored);
        document.getElementById('ssid').value = data.ssid || '';
        document.getElementById('password').value = data.password || '';
        document.getElementById('latitude').value = data.latitude || '';
        document.getElementById('longitude').value = data.longitude || '';
        document.getElementById('city').value = data.city || (data.latitude + ', ' + data.longitude);
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
              <strong>Success!</strong> Reconnect to "${data.ssid}" WiFi and open the Weather Potato App!<br><br>
              <small>Redirecting in 1 second...</small>
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
                }, 1000);
              })
              .catch(() => {
                // Fallback: redirect to dashboard without device ID
                setTimeout(() => {
                  window.location.href = 'https://weather-potato-vercel-127v.vercel.app/dashboard';
                }, 1000);
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

    // Optional: Extract GPS coordinates and city if provided
    if (doc.containsKey("latitude") && doc.containsKey("longitude")) {
      latitude = doc["latitude"].as<float>();
      longitude = doc["longitude"].as<float>();
      Serial.printf("GPS coordinates also received: %.6f, %.6f\n", latitude, longitude);
    }
    if (doc.containsKey("city")) geoLocation = doc["city"].as<String>();

    saveCredentials();  // persist WiFi + location to NVS

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
    if (doc.containsKey("city")) geoLocation = doc["city"].as<String>();

    Serial.printf("Location updated via HTTP: %.6f, %.6f\n", latitude, longitude);
    saveCredentials();  // persist to NVS

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
// REMOTE OTA (firmware pull from URL, triggered via relay)
// ============================================================================

// Send an OTA progress/status update back to relay subscribers.
// Called from performOTA(); wsConnected must be true.
static void sendOTAStatus(const char* status, int progress, const char* message = "") {
  if (!wsConnected) return;
  DynamicJsonDocument doc(256);
  doc["type"]      = "ota_progress";
  doc["device_id"] = deviceId;
  doc["status"]    = status;
  doc["progress"]  = progress;
  if (message && strlen(message) > 0) doc["message"] = message;
  String msg;
  serializeJson(doc, msg);
  wsClient.sendTXT(msg);
}

// Download firmware from `firmwareUrl` and flash it.
// Supports HTTP and HTTPS (ISRG Root X1 = Let's Encrypt / ngrok).
// Progress is broadcast to relay subscribers as ota_progress messages.
// On success the device restarts; on failure it resumes normal operation.
void performOTA(const String& firmwareUrl) {
  Serial.println("[OTA] Starting: " + firmwareUrl);

  // Pause current animations / sounds
  animationActive = false;
  seqActive       = false;

  // Visual indicator: dim blue on all LEDs
  for (int i = 0; i < NUM_LEDS; i++) strip.setPixelColor(i, strip.Color(0, 0, 50));
  strip.show();

  sendOTAStatus("starting", 0);

  // Set up HTTPS client (ISRG Root X1 covers ngrok; for plain HTTP just ignore cert)
  WiFiClientSecure secureClient;
  if (firmwareUrl.startsWith("https://")) {
    secureClient.setCACert(isrg_root_x1_ca);
  } else {
    secureClient.setInsecure();  // plain HTTP — no cert needed
  }

  HTTPClient http;
  http.begin(secureClient, firmwareUrl);
  http.setTimeout(60000);  // 60 s for large downloads

  int httpCode = http.GET();
  if (httpCode != HTTP_CODE_OK) {
    Serial.printf("[OTA] HTTP error: %d\n", httpCode);
    sendOTAStatus("error", 0, ("HTTP " + String(httpCode)).c_str());
    http.end();
    // Restore LEDs to off
    for (int i = 0; i < NUM_LEDS; i++) strip.setPixelColor(i, 0);
    strip.show();
    return;
  }

  int contentLength = http.getSize();  // -1 if chunked
  Serial.printf("[OTA] Content-Length: %d bytes\n", contentLength);

  if (!Update.begin(contentLength > 0 ? contentLength : UPDATE_SIZE_UNKNOWN)) {
    String err = Update.errorString();
    Serial.println("[OTA] Update.begin failed: " + err);
    sendOTAStatus("error", 0, err.c_str());
    http.end();
    return;
  }

  sendOTAStatus("downloading", 5);

  WiFiClient* stream = http.getStreamPtr();
  uint8_t buf[1024];
  size_t written    = 0;
  int lastProgress  = 5;

  while (http.connected() &&
         (contentLength == -1 || written < (size_t)contentLength)) {
    size_t avail = stream->available();
    if (avail) {
      size_t toRead = min(avail, sizeof(buf));
      size_t n      = stream->readBytes(buf, toRead);
      if (Update.write(buf, n) != n) {
        sendOTAStatus("error", lastProgress, Update.errorString());
        http.end();
        return;
      }
      written += n;

      // Report every 5 % and update LED ring
      if (contentLength > 0) {
        int prog = 5 + (int)((float)written / contentLength * 90.0f);
        if (prog >= lastProgress + 5) {
          lastProgress = prog - (prog % 5);
          sendOTAStatus("downloading", lastProgress);
          int litLeds = (int)(NUM_LEDS * (float)written / contentLength);
          for (int i = 0; i < NUM_LEDS; i++)
            strip.setPixelColor(i, i < litLeds
              ? strip.Color(0, 80, 0)   // green = written
              : strip.Color(0, 0, 40)); // blue  = pending
          strip.show();
        }
      }
    } else {
      delay(5);  // yield while waiting for data
    }
  }

  if (Update.end(true)) {
    Serial.printf("[OTA] ✅ Success! Wrote %u bytes — restarting.\n", written);
    // All green
    for (int i = 0; i < NUM_LEDS; i++) strip.setPixelColor(i, strip.Color(0, 120, 0));
    strip.show();
    sendOTAStatus("success", 100);
    delay(1000);
    ESP.restart();
  } else {
    String err = Update.errorString();
    Serial.println("[OTA] ❌ Update.end failed: " + err);
    sendOTAStatus("error", lastProgress, err.c_str());
    http.end();
    for (int i = 0; i < NUM_LEDS; i++) strip.setPixelColor(i, 0);
    strip.show();
  }

  http.end();
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
      if (!body["city"].isNull()) geoLocation = body["city"].as<String>();

      Serial.printf("[WS] Location updated: %.4f, %.4f\n", latitude, longitude);
      saveCredentials();  // persist to NVS

      StaticJsonDocument<256> doc;
      doc["success"] = true;
      doc["latitude"] = latitude;
      doc["longitude"] = longitude;
      serializeJson(doc, response);
    }

  } else if (strcmp(path, "/test") == 0 && strcmp(method, "POST") == 0) {
    // Trigger a test animation + melody for a given condition/temperature
    if (!body.isNull()) {
      String condition = body["condition"].as<String>();
      int temperature  = body["temperature"].as<int>();

      Serial.printf("[TEST] condition=%s temperature=%d\n", condition.c_str(), temperature);

      // Update currentTemperature so loop() continues animation at the right colour
      currentTemperature = temperature;
      // Reset animation so setLEDRGB initialises fresh
      animationActive  = false;
      ledWeatherEffect = condition;
      startWeatherMelody(condition);
      setLEDRGB(temperature);

      StaticJsonDocument<64> doc;
      doc["ok"] = true;
      serializeJson(doc, response);
    }
  }

  return response;
}

void handleWebSocketMessage(const char* payload) {
  // Use DynamicJsonDocument (heap) instead of StaticJsonDocument (stack)
  // to avoid stack overflow — 4KB of static buffers on the stack caused a
  // Double Exception crash when handling POST /location requests.
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, payload);

  if (error) {
    Serial.println("[WS] Failed to parse message");
    return;
  }

  const char* type = doc["type"];

  // ── Remote OTA triggered from relay ──────────────────────────────────────
  if (strcmp(type, "ota_request") == 0) {
    // TODO: uncomment token check before production deployment
    // String token = doc["token"].as<String>();
    // if (token != otaToken) {
    //   Serial.println("[OTA] ❌ Rejected — wrong token");
    //   sendOTAStatus("error", 0, "Invalid OTA token");
    //   return;
    // }
    // Serial.println("[OTA] ✅ Token OK — starting: " + url);
    String url = doc["url"].as<String>();
    Serial.println("[OTA] Starting (token check disabled): " + url);
    performOTA(url);
    return;
  }

  if (strcmp(type, "request") != 0) {
    return;  // Ignore other non-request messages
  }

  // Copy strings before doc goes out of scope in nested calls
  String requestId = doc["id"].as<String>();
  const char* method = doc["method"];
  const char* path = doc["path"];

  Serial.printf("[WS] Request: %s %s (id=%s)\n", method, path, requestId.c_str());

  // Process request internally
  String responseData = processLocalRequest(method, path, doc["body"]);

  // Send response back to relay
  DynamicJsonDocument responseDoc(1024);
  responseDoc["id"] = requestId;
  responseDoc["type"] = "response";
  responseDoc["status"] = 200;

  // Parse response data into JSON object
  DynamicJsonDocument dataDoc(512);
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
// ============================================================================
// NVS PERSISTENCE & FACTORY RESET
// ============================================================================

// Load WiFi credentials and location from NVS into globals.
// Called once at boot before the WiFi connection attempt.
void loadCredentials() {
  // Load WiFi / location
  prefs.begin("potato", true);  // read-only namespace
  wifiSSID     = prefs.getString("ssid",      "");
  wifiPassword = prefs.getString("pass",      "");
  latitude     = prefs.getFloat ("lat",       48.9075f);
  longitude    = prefs.getFloat ("lon",       2.3833f);
  geoLocation  = prefs.getString("city",      "");
  otaToken     = prefs.getString("ota_token", "");
  prefs.end();

  // Generate OTA token on very first boot (hardware RNG, stored permanently)
  if (otaToken.length() == 0) {
    char buf[17];
    snprintf(buf, sizeof(buf), "%08X%08X", esp_random(), esp_random());
    otaToken = String(buf);
    prefs.begin("potato", false);
    prefs.putString("ota_token", otaToken);
    prefs.end();
    Serial.println("[OTA] Generated new token: " + otaToken);
  }

  Serial.println("[OTA] Token: " + otaToken);  // show at every boot for convenience

  if (wifiSSID.length() > 0) {
    Serial.println("[NVS] Loaded — SSID: " + wifiSSID +
                   " | loc: " + String(latitude, 4) + "," + String(longitude, 4));
  } else {
    Serial.println("[NVS] No saved credentials — starting onboarding");
  }
}

// Persist current credentials and location to NVS.
// Call whenever wifiSSID / wifiPassword / lat / lon / geoLocation changes.
void saveCredentials() {
  prefs.begin("potato", false);  // read-write
  prefs.putString("ssid", wifiSSID);
  prefs.putString("pass", wifiPassword);
  prefs.putFloat ("lat",  latitude);
  prefs.putFloat ("lon",  longitude);
  prefs.putString("city", geoLocation);
  prefs.end();
  Serial.println("[NVS] Saved — SSID: " + wifiSSID +
                 " | loc: " + String(latitude, 4) + "," + String(longitude, 4));
}

// Erase NVS and restart — device will come back in onboarding mode.
// Visual: red progress ring fills over 10 s, then 3 white flashes → restart.
void factoryReset() {
  Serial.println("🔴 FACTORY RESET — erasing NVS and restarting...");

  // Three quick white flashes to confirm
  for (int i = 0; i < 3; i++) {
    for (int j = 0; j < NUM_LEDS; j++) strip.setPixelColor(j, strip.Color(255, 255, 255));
    strip.show(); delay(200);
    for (int j = 0; j < NUM_LEDS; j++) strip.setPixelColor(j, 0);
    strip.show(); delay(200);
  }

  prefs.begin("potato", false);
  prefs.clear();
  prefs.end();

  Serial.println("[NVS] Erased. Restarting in 500 ms...");
  delay(500);
  ESP.restart();
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
  pinMode(BOOT_BTN_PIN, INPUT_PULLUP);  // GPIO0 BOOT button — active LOW

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

  // Load saved credentials from NVS (replaces empty globals set above)
  loadCredentials();

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

      // Free BLE memory now that WiFi is connected (BLE uses ~50KB RAM, needed for SSL)
      if (bleEnabled) {
        Serial.println("[DEBUG] Shutting down BLE to free memory for SSL...");
        BLEDevice::deinit(true);
        bleEnabled = false;
        Serial.printf("[DEBUG] Free heap after BLE shutdown: %d bytes\n", ESP.getFreeHeap());
      }

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

      // Configure NTP for time sync (must happen before SSL connections)
      Serial.println("[DEBUG] Configuring NTP...");
      configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
      // Wait for NTP sync (SSL cert validation needs correct time)
      Serial.print("[DEBUG] Waiting for NTP sync");
      time_t now = 0;
      int ntpRetries = 0;
      while (now < 1700000000 && ntpRetries < 20) {  // Wait until time is reasonable (after 2023)
        delay(500);
        time(&now);
        Serial.print(".");
        ntpRetries++;
      }
      Serial.println(now > 1700000000 ? " OK" : " TIMEOUT (continuing anyway)");

      // Initialize WebSocket relay connection (WSS with Let's Encrypt CA cert)
      Serial.printf("[WS] Free heap before SSL: %d bytes\n", ESP.getFreeHeap());
      Serial.println("[WS] Connecting to relay server...");
      wsClient.beginSslWithCA("weather-potato-production.up.railway.app", 443, "/", isrg_root_x1_ca);
      wsClient.setReconnectInterval(5000);
      wsClient.onEvent(webSocketEvent);
      Serial.println("[WS] WebSocket client initialized");

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

  // ── Factory reset: hold BOOT button (GPIO0) for 10 s ─────────────────────
  // Active LOW — pressed = LOW. Progress ring fills red over 10 s.
  // Release before 10 s cancels. At 10 s: 3 white flashes → NVS clear → restart.
  {
    unsigned long currentTime = millis();
    if (digitalRead(BOOT_BTN_PIN) == LOW) {
      if (btnPressStart == 0) {
        btnPressStart = currentTime;
        animationActive = false;  // take over LED ring
        btnIndicatorActive = true;
        Serial.println("[BTN] BOOT held — factory reset in 10 s (release to cancel)");
      }
      unsigned long held = currentTime - btnPressStart;

      // Draw red progress ring: one LED per ~833 ms (12 LEDs × 833 ms = ~10 s)
      int litLeds = min(NUM_LEDS, (int)(held * NUM_LEDS / 10000) + 1);
      for (int i = 0; i < NUM_LEDS; i++) {
        strip.setPixelColor(i, i < litLeds ? strip.Color(200, 0, 0) : 0);
      }
      strip.show();

      if (held >= 10000) {
        factoryReset();  // does not return
      }
    } else {
      // Button released
      if (btnPressStart > 0) {
        Serial.println("[BTN] BOOT released — factory reset cancelled");
        btnPressStart = 0;
        btnIndicatorActive = false;
        for (int i = 0; i < NUM_LEDS; i++) strip.setPixelColor(i, 0);
        strip.show();
      }
    }
  }

  // Handle capacitive touch for weather display
  // Debounce: signal must stay HIGH for 50 ms before triggering.
  // After trigger, 10 s cooldown to prevent repeated firing.
  static unsigned long lastTouchTime  = 0;
  static unsigned long touchHighStart = 0;
  unsigned long currentTime = millis();

  if (digitalRead(CAP_SENSOR_PIN) == HIGH) {
    if (touchHighStart == 0) touchHighStart = currentTime;
    if (!animationActive &&
        (currentTime - lastTouchTime  > 10000) &&
        (currentTime - touchHighStart >= 50)) {
      Serial.println("Capacitive touch detected!");
      touchHighStart = 0;

      if (WiFi.status() == WL_CONNECTED) {
        getWeatherForecast(weatherSymbol, currentTemperature);
        interpretWeatherSymbol(weatherSymbol, currentTemperature);
        setLEDRGB(currentTemperature);

        // Push weather update to PWA via relay
        if (wsConnected) {
          DynamicJsonDocument pushDoc(512);
          pushDoc["type"] = "push";
          pushDoc["device_id"] = deviceId;
          JsonObject pushData = pushDoc.createNestedObject("data");
          pushData["condition"] = lastWeatherCondition;
          pushData["temperature"] = lastTemperature;
          pushData["symbol"] = weatherSymbol;
          JsonObject pushLoc = pushData.createNestedObject("location");
          pushLoc["latitude"] = latitude;
          pushLoc["longitude"] = longitude;
          pushData["timestamp"] = millis();
          String pushMsg;
          serializeJson(pushDoc, pushMsg);
          wsClient.sendTXT(pushMsg);
          Serial.println("[WS] Pushed weather update to PWA");
        }
      } else {
        Serial.println("WiFi not connected, skipping weather fetch");
      }

      lastTouchTime = currentTime;
    }
  } else {
    touchHighStart = 0; // reset if signal drops below threshold
  }

  // Continue animation if active (skip while factory-reset indicator is running)
  if (animationActive && !btnIndicatorActive) {
    setLEDRGB(currentTemperature);
  }

  // Handle buzzer note sequencer
  updateBuzzer();

  delay(10);
}

// ============================================================================
// WEATHER & API FUNCTIONS
// ============================================================================

void getWeatherForecast(int &code, int &temperature) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return;
  }

  WiFiClientSecure client;
  client.setCACert(isrg_root_x1_ca);  // Open-Meteo uses Let's Encrypt (ISRG Root X1)

  HTTPClient http;
  String apiUrl = String(weatherApiBase) + "?latitude=" +
                  String(latitude, 4) + "&longitude=" + String(longitude, 4) +
                  "&current=temperature_2m,weather_code";

  Serial.println("API URL: " + apiUrl);

  http.begin(client, apiUrl);

  int httpResponseCode = http.GET();
  if (httpResponseCode > 0) {
    String payload = http.getString();
    Serial.println("Response: " + payload);

    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (!error) {
      parseWeatherSymbol(doc, code, temperature);
      Serial.printf("Weather Code: %d, Temperature: %d°C\n", code, temperature);
    } else {
      Serial.printf("JSON deserialization error: %s\n", error.c_str());
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

  JsonObject current = doc["current"];
  if (current.isNull()) {
    Serial.println("[Weather] No 'current' object in response");
    return;
  }

  temperature = (int)current["temperature_2m"].as<float>();
  code = current["weather_code"].as<int>();

  lastTemperature = temperature;
}

// ============================================================================
// LED & BUZZER FUNCTIONS
// ============================================================================

// Smoothly interpolate between two RGB colors (t in 0.0..1.0)
static uint32_t lerpColor(int r1, int g1, int b1, int r2, int g2, int b2, float t) {
  return strip.Color(
    constrain(r1 + (int)((r2 - r1) * t), 0, 255),
    constrain(g1 + (int)((g2 - g1) * t), 0, 255),
    constrain(b1 + (int)((b2 - b1) * t), 0, 255)
  );
}

// Map temperature to a NeoPixel color
// ≤-10: blue | -10→0: blue→cyan | 0→10: cyan→green | 10→15: green→green-yellow
// 15→20: green-yellow→yellow-orange | 20→25: yellow-orange→orange-red | 25→30: orange-red→red
// Blinking blue overlay applied at ≤-20 in setLEDRGB(). Fire overlay applied at >35.
uint32_t getTemperatureColor(int temperature) {
  int t = constrain(temperature, -20, 30);
  if (t <= -10) return strip.Color(0, 0, 255);
  if (t <= 0)   return lerpColor(  0,   0, 255,   0, 200, 255, (t + 10) / 10.0f);
  if (t <= 10)  return lerpColor(  0, 200, 255,   0, 255,   0,  t        / 10.0f);
  if (t <= 15)  return lerpColor(  0, 255,   0, 150, 255,   0, (t - 10) /  5.0f);
  if (t <= 20)  return lerpColor(150, 255,   0, 255, 160,   0, (t - 15) /  5.0f);
  if (t <= 25)  return lerpColor(255, 160,   0, 255,  60,   0, (t - 20) /  5.0f);
                return lerpColor(255,  60,   0, 255,   0,   0, (t - 25) /  5.0f);
}

void setLEDRGB(int temperature) {
  const unsigned long TOTAL_DUR   = 12000; // 12 s total
  const unsigned long FLASH_DUR   =   200; // 200 ms white flash
  const unsigned long UPDATE_INT  =    80; // ~12.5 fps

  unsigned long now = millis();

  // ── Initialise on first call ──────────────────────────────────────────────
  if (!animationActive) {
    Serial.println("Starting LED animation...");
    animationActive        = true;
    ledAnimStart           = now;
    ledLastUpdate          = 0;
    ledPulsePos            = 0;
    ledThunderLast         = 0;
    ledThunderOn           = false;
    ledFogBrightness       = 40;
    ledFogInc              = true;
    // White flash
    for (int i = 0; i < NUM_LEDS; i++) strip.setPixelColor(i, strip.Color(255, 255, 255));
    strip.show();
    return;
  }

  unsigned long elapsed = now - ledAnimStart;

  // ── End of animation ──────────────────────────────────────────────────────
  if (elapsed >= TOTAL_DUR) {
    Serial.println("Ending LED animation...");
    for (int i = 0; i < NUM_LEDS; i++) strip.setPixelColor(i, 0);
    strip.show();
    animationActive = false;
    return;
  }

  // Flash phase: white already set, just wait
  if (elapsed < FLASH_DUR) return;

  // Rate-limit frames
  if (now - ledLastUpdate < UPDATE_INT) return;
  ledLastUpdate = now;

  // Advance travelling pulse head one step per frame
  ledPulsePos = (ledPulsePos + 1) % NUM_LEDS;

  // Condition flags
  bool isFog      = (ledWeatherEffect == "light_fog"  || ledWeatherEffect == "dense_fog");
  bool isRain     = (ledWeatherEffect == "rain"        || ledWeatherEffect == "rain_shower" ||
                     ledWeatherEffect == "drizzle"     || ledWeatherEffect == "freezing_rain");
  bool isSnow     = (ledWeatherEffect == "snow"        || ledWeatherEffect == "snow_shower");
  bool isThunder  = (ledWeatherEffect == "thunderstorm");
  bool isHeatwave = (temperature > 35);
  bool isFreeze   = (temperature <= -20);

  // ── Thunder flash override ────────────────────────────────────────────────
  if (isThunder) {
    bool due = (ledThunderLast == 0 || now - ledThunderLast > 2500);
    if (!ledThunderOn && due) {
      ledThunderOn        = true;
      ledThunderFlashStart = now;
      ledThunderLast      = now;
    }
    if (ledThunderOn) {
      if (now - ledThunderFlashStart < 120) {
        for (int i = 0; i < NUM_LEDS; i++) strip.setPixelColor(i, strip.Color(255, 255, 255));
        strip.show();
        return;
      } else {
        ledThunderOn = false;
      }
    }
  }

  // ── Fog breathing ─────────────────────────────────────────────────────────
  if (isFog) {
    int rate = (ledWeatherEffect == "dense_fog") ? 2 : 4;
    ledFogBrightness += (ledFogInc ? rate : -rate);
    if (ledFogBrightness >= 75) ledFogInc = false;
    if (ledFogBrightness <= 15) ledFogInc = true;
    ledFogBrightness = constrain(ledFogBrightness, 15, 75);
  }

  // ── Base temperature colour ───────────────────────────────────────────────
  uint32_t tempColor = getTemperatureColor(temperature);
  uint8_t tR = (tempColor >> 16) & 0xFF;
  uint8_t tG = (tempColor >>  8) & 0xFF;
  uint8_t tB =  tempColor        & 0xFF;

  // ── Draw travelling pulse with quadratic falloff ──────────────────────────
  for (int i = 0; i < NUM_LEDS; i++) {
    int dist = abs(i - ledPulsePos);
    if (dist > NUM_LEDS / 2) dist = NUM_LEDS - dist;

    float bf;
    switch (dist) {
      case 0: bf = 1.00f; break;
      case 1: bf = 0.65f; break;
      case 2: bf = 0.35f; break;
      case 3: bf = 0.15f; break;
      case 4: bf = 0.05f; break;
      default: bf = 0.0f; break;
    }
    if (isFog) bf *= ledFogBrightness / 100.0f;

    strip.setPixelColor(i, strip.Color(
      (int)(tR * bf),
      (int)(tG * bf),
      (int)(tB * bf)
    ));
  }

  // ── Weather condition overlays (subtle, one LED per frame) ────────────────
  if (isRain && random(100) < 35) {
    int led = random(NUM_LEDS);
    strip.setPixelColor(led, strip.Color(
      constrain((int)(tR * 0.4) + 20, 0, 255),
      constrain((int)(tG * 0.4) + 40, 0, 255),
      constrain((int)(tB * 0.4) + 160, 0, 255)
    ));
  }
  if (isSnow && random(100) < 25) {
    int led = random(NUM_LEDS);
    strip.setPixelColor(led, strip.Color(200, 220, 255));
  }
  if (isHeatwave && random(100) < 40) {
    int led = random(NUM_LEDS);
    strip.setPixelColor(led, strip.Color(255, random(40, 110), 0));
  }

  // ── Freeze blink (<= -20°C): pulse blue on/dim every 400 ms ──────────────
  if (isFreeze) {
    bool blinkOn = ((now / 400) % 2 == 0);
    if (!blinkOn) {
      for (int i = 0; i < NUM_LEDS; i++) {
        uint32_t c = strip.getPixelColor(i);
        strip.setPixelColor(i, strip.Color(
          ((c >> 16) & 0xFF) / 5,
          ((c >>  8) & 0xFF) / 5,
          ( c        & 0xFF) / 5
        ));
      }
    }
  }

  strip.show();
}

// Load a weather melody into the sequencer and start it immediately.
// Each note slot: freq (Hz, 0=rest), duration (ms), duty (0-255),
//                 vibDepth (±Hz range, 0=off), vibRate (ms per LFO step).
// Vibrato uses a triangle LFO: freq oscillates ±vibDepth at 1 Hz/step
// every vibRate ms — perceptually identical to the micro-vibrato described.
void startWeatherMelody(String condition) {
  int f[SEQ_MAX], d[SEQ_MAX], du[SEQ_MAX], vd[SEQ_MAX], vr[SEQ_MAX];
  int n = 0;

  // Helper: zero-fill vibrato arrays
  auto noVib = [&]() { for (int i=0;i<n;i++) { vd[i]=0; vr[i]=0; } };

  if (condition == "clear_sky") {
    // ☀️ Joyful sunrise — C5 E5 G5 C6 pause G5
    int tf[] = {523, 659, 784, 1047,   0, 784};
    int td[] = {120, 120, 120,  180, 150, 600};
    int tdu[]= {128, 128, 128,  128,   0, 128};
    n=6; memcpy(f,tf,n*4); memcpy(d,td,n*4); memcpy(du,tdu,n*4); noVib();

  } else if (condition == "light_clouds") {
    // 🌤 Gentle sway — C5 D5 C5 G4
    int tf[] = {523, 587, 523, 392};
    int td[] = {150, 150, 150, 300};
    int tdu[]= {100, 100, 100, 100};
    n=4; memcpy(f,tf,n*4); memcpy(d,td,n*4); memcpy(du,tdu,n*4); noVib();

  } else if (condition == "partly_cloudy") {
    // 🌥 Question mark — E5 G5 E5 pause F5 (unresolved tension)
    int tf[] = {659, 784, 659,   0, 698};
    int td[] = {150, 150, 150, 200, 500};
    int tdu[]= {100, 100, 100,   0, 100};
    n=5; memcpy(f,tf,n*4); memcpy(d,td,n*4); memcpy(du,tdu,n*4); noVib();

  } else if (condition == "cloudy") {
    // ☁️ Melodramatic sigh — G4 F4 D4 C4 (slow vibrato on final note)
    int tf[] = {392, 349, 294, 262};
    int td[] = {300, 300, 300, 500};
    int tdu[]= {128, 128, 128, 128};
    int tvd[]= {  0,   0,   0,   5}; // ±5 Hz vibrato on C4 only
    int tvr[]= {  0,   0,   0,  25}; // step every 25ms
    n=4; memcpy(f,tf,n*4); memcpy(d,td,n*4); memcpy(du,tdu,n*4);
    memcpy(vd,tvd,n*4); memcpy(vr,tvr,n*4);

  } else if (condition == "light_fog") {
    // 🌫 Ghost whisper — A3 pause A3 pause A3 (subtle ±3Hz vibrato)
    int tf[] = {220,   0, 220,   0, 220};
    int td[] = {200, 150, 200, 150, 800};
    int tdu[]= {128,   0, 128,   0, 128};
    int tvd[]= {  3,   0,   3,   0,   3};
    int tvr[]= { 25,   0,  25,   0,  25};
    n=5; memcpy(f,tf,n*4); memcpy(d,td,n*4); memcpy(du,tdu,n*4);
    memcpy(vd,tvd,n*4); memcpy(vr,tvr,n*4);

  } else if (condition == "dense_fog") {
    // 🌁 Foghorn — F3 pause D3 pause F3 (slow ±5Hz vibrato on tone notes)
    int tf[] = {175,   0, 147,   0, 175};
    int td[] = {400, 200, 400, 200, 800};
    int tdu[]= {128,   0, 128,   0, 128};
    int tvd[]= {  5,   0,   5,   0,   5};
    int tvr[]= { 30,   0,  30,   0,  30};
    n=5; memcpy(f,tf,n*4); memcpy(d,td,n*4); memcpy(du,tdu,n*4);
    memcpy(vd,tvd,n*4); memcpy(vr,tvr,n*4);

  } else if (condition == "drizzle") {
    // 🌦 Nervous tick — 10 × (C6 50ms + pause 30ms), thin duty
    int tf[] = {1047,0,1047,0,1047,0,1047,0,1047,0,
                1047,0,1047,0,1047,0,1047,0,1047,0};
    int td[] = {  50,30,  50,30,  50,30,  50,30,  50,30,
                  50,30,  50,30,  50,30,  50,30,  50,30};
    int tdu[]= {  25, 0,  25, 0,  25, 0,  25, 0,  25, 0,
                  25, 0,  25, 0,  25, 0,  25, 0,  25, 0};
    n=20; memcpy(f,tf,n*4); memcpy(d,td,n*4); memcpy(du,tdu,n*4); noVib();

  } else if (condition == "freezing_rain") {
    // 🧊 Icy laser — E6 pause E6 pause B5 (sharp, dry, low duty)
    int tf[] = {1319,   0, 1319,   0,  988};
    int td[] = { 120, 100,  120, 100,  250};
    int tdu[]= {  25,   0,   25,   0,   25};
    n=5; memcpy(f,tf,n*4); memcpy(d,td,n*4); memcpy(du,tdu,n*4); noVib();

  } else if (condition == "rain") {
    // 🌧 Steady groove — 3 × triplet G4 (slight freq jitter for realism)
    int tf[] = {392,388,396, 0, 392,390,395, 0, 392,386,398, 0};
    int td[] = {120,120,120,150, 120,120,120,150, 120,120,120,150};
    int tdu[]= { 64, 64, 64,  0,  64, 64, 64,  0,  64, 64, 64,  0};
    n=12; memcpy(f,tf,n*4); memcpy(d,td,n*4); memcpy(du,tdu,n*4); noVib();

  } else if (condition == "rain_shower") {
    // 🌧🌦 Fast cascade — C6 B5 A5 G5 F5 E5 D5
    int tf[] = {1047, 988, 880, 784, 698, 659, 587};
    int td[] = {  80,  80,  80,  80,  80,  80, 120};
    int tdu[]= {  64,  64,  64,  64,  64,  64,  64};
    n=7; memcpy(f,tf,n*4); memcpy(d,td,n*4); memcpy(du,tdu,n*4); noVib();

  } else if (condition == "snow") {
    // ❄️ Crystal sparkle — C6 pause G5 pause E6 (high, airy, sparse)
    int tf[] = {1047,   0,  784,   0, 1319};
    int td[] = { 120, 250,  120, 250,  150};
    int tdu[]= { 128,   0,  128,   0,  128};
    n=5; memcpy(f,tf,n*4); memcpy(d,td,n*4); memcpy(du,tdu,n*4); noVib();

  } else if (condition == "snow_shower") {
    // 🌨 Playful snowfall — C6 G5 E6 G5 C6
    int tf[] = {1047, 784, 1319, 784, 1047};
    int td[] = { 120, 120,  120, 120,  200};
    int tdu[]= { 128, 128,  128, 128,  128};
    n=5; memcpy(f,tf,n*4); memcpy(d,td,n*4); memcpy(du,tdu,n*4); noVib();

  } else if (condition == "thunderstorm") {
    // ⛈ Drama queen — 8× C3↔D3 rumble (30ms each) + pause + C6 crack
    // The rapid alternation IS the heavy vibrato on the low register
    int tf[] = {131,147,131,147,131,147,131,147,
                131,147,131,147,131,147,131,147,   0, 1047};
    int td[] = { 30, 30, 30, 30, 30, 30, 30, 30,
                 30, 30, 30, 30, 30, 30, 30, 30, 200,   80};
    int tdu[]= { 50, 50, 50, 50, 50, 50, 50, 50,
                 50, 50, 50, 50, 50, 50, 50, 50,   0,  128};
    n=18; memcpy(f,tf,n*4); memcpy(d,td,n*4); memcpy(du,tdu,n*4); noVib();

  } else {
    // Fallback: single neutral beep
    f[0]=440; d[0]=400; du[0]=128; vd[0]=0; vr[0]=0; n=1;
  }

  // Load into sequencer globals
  seqLen = n;
  for (int i = 0; i < n; i++) {
    seqFreq[i] = f[i]; seqDur[i] = d[i]; seqDuty[i] = du[i];
    seqVibDepth[i] = vd[i]; seqVibRate[i] = vr[i];
  }
  seqIdx       = 0;
  seqNoteStart = millis();
  seqActive    = true;
  // Reset vibrato runtime state
  seqVibOffset = 0;
  seqVibDir    = 1;
  seqVibTimer  = millis();

  // Start first note immediately
  if (seqFreq[0] > 0 && seqDuty[0] > 0) {
    ledc_set_freq(BUZZER_MODE, BUZZER_TIMER, seqFreq[0]);
    ledc_set_duty(BUZZER_MODE, BUZZER_CHANNEL, seqDuty[0]);
    ledc_update_duty(BUZZER_MODE, BUZZER_CHANNEL);
  }
}

// Must be called every loop iteration to advance the note sequencer.
void updateBuzzer() {
  if (!seqActive) return;
  unsigned long now = millis();

  // ── Vibrato LFO (triangle wave, 1 Hz/step every vibRate ms) ────────────
  // Applied continuously while the current note is sounding.
  if (seqFreq[seqIdx] > 0 &&
      seqVibDepth[seqIdx] > 0 &&
      seqVibRate[seqIdx]  > 0 &&
      now - seqVibTimer >= (unsigned long)seqVibRate[seqIdx]) {
    seqVibTimer = now;
    seqVibOffset += seqVibDir;
    if (seqVibOffset >=  seqVibDepth[seqIdx]) seqVibDir = -1;
    if (seqVibOffset <= -seqVibDepth[seqIdx]) seqVibDir =  1;
    int vf = max(100, seqFreq[seqIdx] + seqVibOffset);
    ledc_set_freq(BUZZER_MODE, BUZZER_TIMER, vf);
    ledc_update_duty(BUZZER_MODE, BUZZER_CHANNEL);
  }

  // ── Advance when note duration has elapsed ───────────────────────────────
  if (now - seqNoteStart < (unsigned long)seqDur[seqIdx]) return;

  // Silence buzzer between notes
  ledc_set_duty(BUZZER_MODE, BUZZER_CHANNEL, 0);
  ledc_update_duty(BUZZER_MODE, BUZZER_CHANNEL);

  seqIdx++;
  if (seqIdx >= seqLen) {
    seqActive = false;
    return;
  }

  // Reset vibrato for the new note
  seqNoteStart = now;
  seqVibOffset = 0;
  seqVibDir    = 1;
  seqVibTimer  = now;

  if (seqFreq[seqIdx] > 0 && seqDuty[seqIdx] > 0) {
    ledc_set_freq(BUZZER_MODE, BUZZER_TIMER, seqFreq[seqIdx]);
    ledc_set_duty(BUZZER_MODE, BUZZER_CHANNEL, seqDuty[seqIdx]);
    ledc_update_duty(BUZZER_MODE, BUZZER_CHANNEL);
  }
  // freq==0 or duty==0: rest — stay silent for seqDur[seqIdx] ms
}

void interpretWeatherSymbol(int code, int temperature) {
  // WMO Weather Interpretation Codes (Open-Meteo)
  // https://open-meteo.com/en/docs
  String weatherCondition = "";

  switch (code) {
    case 0:  weatherCondition = "clear_sky"; break;       // Clear sky
    case 1:  weatherCondition = "light_clouds"; break;    // Mainly clear
    case 2:  weatherCondition = "partly_cloudy"; break;   // Partly cloudy
    case 3:  weatherCondition = "cloudy"; break;          // Overcast
    case 45: weatherCondition = "light_fog"; break;       // Fog
    case 48: weatherCondition = "dense_fog"; break;       // Depositing rime fog
    case 51:                                              // Light drizzle
    case 53:                                              // Moderate drizzle
    case 55: weatherCondition = "drizzle"; break;         // Dense drizzle
    case 56:                                              // Light freezing drizzle
    case 57: weatherCondition = "freezing_rain"; break;   // Dense freezing drizzle
    case 61:                                              // Slight rain
    case 63:                                              // Moderate rain
    case 65: weatherCondition = "rain"; break;            // Heavy rain
    case 66:                                              // Light freezing rain
    case 67: weatherCondition = "freezing_rain"; break;   // Heavy freezing rain
    case 71:                                              // Slight snowfall
    case 73:                                              // Moderate snowfall
    case 75:                                              // Heavy snowfall
    case 77: weatherCondition = "snow"; break;            // Snow grains
    case 80:                                              // Slight rain showers
    case 81:                                              // Moderate rain showers
    case 82: weatherCondition = "rain_shower"; break;     // Violent rain showers
    case 85:                                              // Slight snow showers
    case 86: weatherCondition = "snow_shower"; break;     // Heavy snow showers
    case 95: weatherCondition = "thunderstorm"; break;    // Thunderstorm
    case 96:                                              // Thunderstorm with slight hail
    case 99: weatherCondition = "thunderstorm"; break;    // Thunderstorm with heavy hail
    default: weatherCondition = "clear_sky"; break;       // Fallback
  }

  ledWeatherEffect = weatherCondition;
  startWeatherMelody(weatherCondition);
  lastWeatherCondition = weatherCondition;
}
