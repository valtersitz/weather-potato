# ESP32 BLE Implementation Requirements for Weather Potato

This document details the BLE implementation requirements on the ESP32 side to work with the Weather Potato PWA.

## Overview

The ESP32 must implement a BLE GATT Server that allows the PWA to:
1. Connect and identify the device
2. Send WiFi credentials
3. Send GPS coordinates
4. Receive status updates about WiFi connection
5. Disable BLE after successful setup

## BLE Service and Characteristics

### Service UUID
```cpp
#define SERVICE_UUID "12345678-1234-5678-1234-56789abcdef0"
```

### Characteristics

#### 1. Device Info Characteristic (READ)
```cpp
#define DEVICE_INFO_CHAR_UUID "12345678-1234-5678-1234-56789abcdef1"
```

**Properties**: `READ`

**Description**: Returns device identification information

**Format** (JSON):
```json
{
  "device_id": "AABBCCDD",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "firmware_version": "1.0.0"
}
```

**Implementation**:
- `device_id` should be the first 8 characters of the MAC address (uppercase, no colons)
- Example: MAC `AA:BB:CC:DD:EE:FF` → Device ID `AABBCCDD`

#### 2. WiFi Config Characteristic (WRITE)
```cpp
#define WIFI_CONFIG_CHAR_UUID "12345678-1234-5678-1234-56789abcdef2"
```

**Properties**: `WRITE`

**Description**: Receives WiFi credentials from the PWA

**Format** (JSON):
```json
{
  "ssid": "MyNetwork",
  "password": "MyPassword123"
}
```

**Implementation**:
- Parse the JSON received
- Store SSID and password
- Do NOT connect to WiFi yet (wait for GPS data first)
- Max length: 512 bytes

#### 3. GPS Config Characteristic (WRITE)
```cpp
#define GPS_CONFIG_CHAR_UUID "12345678-1234-5678-1234-56789abcdef3"
```

**Properties**: `WRITE`

**Description**: Receives GPS coordinates from the PWA

**Format** (JSON):
```json
{
  "lat": 48.8566,
  "lon": 2.3522
}
```

**Implementation**:
- Parse the JSON received
- Store latitude and longitude
- After receiving GPS data, initiate WiFi connection
- Precision: 6 decimal places

#### 4. Status Characteristic (READ + NOTIFY)
```cpp
#define STATUS_CHAR_UUID "12345678-1234-5678-1234-56789abcdef4"
```

**Properties**: `READ`, `NOTIFY`

**Description**: Reports device status and WiFi connection progress

**Format** (JSON):

**During WiFi connection attempt**:
```json
{
  "status": "connecting_wifi",
  "message": "Connecting to network..."
}
```

**On successful WiFi connection**:
```json
{
  "status": "wifi_connected",
  "local_ip": "192.168.1.100",
  "port": 8080,
  "hostname": "weatherpotato.local",
  "device_id": "AABBCCDD"
}
```

**On WiFi connection failure**:
```json
{
  "status": "wifi_failed",
  "message": "Invalid password or network not found"
}
```

**On BLE disable command received**:
```json
{
  "status": "ble_disabled",
  "message": "BLE disabled, using local HTTP only"
}
```

**Implementation**:
- Use `notify()` to push updates to the PWA
- Update status when WiFi connection state changes

## Device Naming

The BLE device name MUST follow this format:
```cpp
String deviceName = "Potato-" + deviceId;
// Example: "Potato-AABBCCDD"
```

This allows the PWA to verify it's connecting to the correct device.

## Implementation Flow

### 1. Initialization (on boot)
```cpp
void setupBLE() {
  // 1. Get MAC address
  String mac = WiFi.macAddress();

  // 2. Generate device ID (first 8 chars of MAC, uppercase, no colons)
  String deviceId = mac.substring(0, 8);
  deviceId.replace(":", "");
  deviceId.toUpperCase();

  // 3. Set BLE device name
  String bleName = "Potato-" + deviceId;

  // 4. Initialize BLE
  BLEDevice::init(bleName.c_str());

  // 5. Create GATT server
  BLEServer *pServer = BLEDevice::createServer();

  // 6. Create service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // 7. Create characteristics
  // ... (see code example below)

  // 8. Start service
  pService->start();

  // 9. Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->start();
}
```

### 2. Receiving WiFi Credentials
```cpp
class WiFiConfigCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();

    // Parse JSON
    DynamicJsonDocument doc(512);
    deserializeJson(doc, value);

    // Store credentials
    wifiSSID = doc["ssid"].as<String>();
    wifiPassword = doc["password"].as<String>();

    Serial.println("WiFi credentials received");
    Serial.println("SSID: " + wifiSSID);
  }
};
```

### 3. Receiving GPS Coordinates
```cpp
class GPSConfigCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();

    // Parse JSON
    DynamicJsonDocument doc(512);
    deserializeJson(doc, value);

    // Store coordinates
    latitude = doc["lat"].as<float>();
    longitude = doc["lon"].as<float>();

    Serial.printf("GPS received: %.6f, %.6f\n", latitude, longitude);

    // Now that we have both WiFi and GPS, connect to WiFi
    connectToWiFi();
  }
};
```

### 4. Connecting to WiFi and Notifying Status
```cpp
void connectToWiFi() {
  // Notify: Starting connection
  String statusJson = "{\"status\":\"connecting_wifi\",\"message\":\"Connecting to network...\"}";
  statusCharacteristic->setValue(statusJson.c_str());
  statusCharacteristic->notify();

  WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 60) {
    delay(500);
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    // Success!
    IPAddress ip = WiFi.localIP();

    // Setup mDNS
    if (MDNS.begin("weatherpotato")) {
      MDNS.addService("http", "tcp", 8080);
    }

    // Start HTTP server
    server.begin();

    // Notify success
    String successJson = "{";
    successJson += "\"status\":\"wifi_connected\",";
    successJson += "\"local_ip\":\"" + ip.toString() + "\",";
    successJson += "\"port\":8080,";
    successJson += "\"hostname\":\"weatherpotato.local\",";
    successJson += "\"device_id\":\"" + deviceId + "\"";
    successJson += "}";

    statusCharacteristic->setValue(successJson.c_str());
    statusCharacteristic->notify();

  } else {
    // Failure
    String failJson = "{\"status\":\"wifi_failed\",\"message\":\"Connection timeout or invalid credentials\"}";
    statusCharacteristic->setValue(failJson.c_str());
    statusCharacteristic->notify();
  }
}
```

### 5. Handling BLE Disable Command
```cpp
class StatusCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();

    // Parse JSON
    DynamicJsonDocument doc(256);
    deserializeJson(doc, value);

    String action = doc["action"].as<String>();

    if (action == "disable_ble") {
      // Notify that we're disabling
      String response = "{\"status\":\"ble_disabled\",\"message\":\"Switching to local HTTP only\"}";
      pCharacteristic->setValue(response.c_str());
      pCharacteristic->notify();

      delay(500); // Give time for notification to be sent

      // Disable BLE
      BLEDevice::deinit();

      Serial.println("BLE disabled, using HTTP only");
    }
  }
};
```

## Complete Code Example

```cpp
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// BLE UUIDs
#define SERVICE_UUID           "12345678-1234-5678-1234-56789abcdef0"
#define DEVICE_INFO_CHAR_UUID  "12345678-1234-5678-1234-56789abcdef1"
#define WIFI_CONFIG_CHAR_UUID  "12345678-1234-5678-1234-56789abcdef2"
#define GPS_CONFIG_CHAR_UUID   "12345678-1234-5678-1234-56789abcdef3"
#define STATUS_CHAR_UUID       "12345678-1234-5678-1234-56789abcdef4"

// Global variables
String deviceId;
String wifiSSID;
String wifiPassword;
float latitude = 0;
float longitude = 0;
BLECharacteristic *statusCharacteristic;
WebServer server(8080);

// Callbacks for WiFi config
class WiFiConfigCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    DynamicJsonDocument doc(512);
    deserializeJson(doc, value);

    wifiSSID = doc["ssid"].as<String>();
    wifiPassword = doc["password"].as<String>();

    Serial.println("WiFi credentials received: " + wifiSSID);
  }
};

// Callbacks for GPS config
class GPSConfigCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    DynamicJsonDocument doc(512);
    deserializeJson(doc, value);

    latitude = doc["lat"].as<float>();
    longitude = doc["lon"].as<float>();

    Serial.printf("GPS received: %.6f, %.6f\n", latitude, longitude);

    // Now connect to WiFi
    connectToWiFi();
  }
};

// Callbacks for status (to handle disable BLE command)
class StatusCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    DynamicJsonDocument doc(256);
    deserializeJson(doc, value);

    String action = doc["action"].as<String>();

    if (action == "disable_ble") {
      String response = "{\"status\":\"ble_disabled\"}";
      pCharacteristic->setValue(response.c_str());
      pCharacteristic->notify();
      delay(500);
      BLEDevice::deinit();
      Serial.println("BLE disabled");
    }
  }
};

void connectToWiFi() {
  // Notify start
  String statusJson = "{\"status\":\"connecting_wifi\"}";
  statusCharacteristic->setValue(statusJson.c_str());
  statusCharacteristic->notify();

  WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 60) {
    delay(500);
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    IPAddress ip = WiFi.localIP();

    MDNS.begin("weatherpotato");
    MDNS.addService("http", "tcp", 8080);

    // Setup HTTP server with /health endpoint
    server.on("/health", HTTP_GET, []() {
      String response = "{";
      response += "\"device_id\":\"" + deviceId + "\",";
      response += "\"status\":\"ready\"";
      response += "}";
      server.send(200, "application/json", response);
    });

    server.begin();

    // Notify success
    String successJson = "{";
    successJson += "\"status\":\"wifi_connected\",";
    successJson += "\"local_ip\":\"" + ip.toString() + "\",";
    successJson += "\"port\":8080,";
    successJson += "\"hostname\":\"weatherpotato.local\",";
    successJson += "\"device_id\":\"" + deviceId + "\"";
    successJson += "}";

    statusCharacteristic->setValue(successJson.c_str());
    statusCharacteristic->notify();
  } else {
    String failJson = "{\"status\":\"wifi_failed\"}";
    statusCharacteristic->setValue(failJson.c_str());
    statusCharacteristic->notify();
  }
}

void setup() {
  Serial.begin(115200);

  // Get MAC and create device ID
  String mac = WiFi.macAddress();
  deviceId = mac.substring(0, 8);
  deviceId.replace(":", "");
  deviceId.toUpperCase();

  String bleName = "Potato-" + deviceId;
  Serial.println("Device ID: " + deviceId);
  Serial.println("BLE Name: " + bleName);

  // Initialize BLE
  BLEDevice::init(bleName.c_str());
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Device Info characteristic (READ)
  BLECharacteristic *deviceInfoChar = pService->createCharacteristic(
    DEVICE_INFO_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ
  );
  String deviceInfo = "{";
  deviceInfo += "\"device_id\":\"" + deviceId + "\",";
  deviceInfo += "\"mac_address\":\"" + mac + "\",";
  deviceInfo += "\"firmware_version\":\"1.0.0\"";
  deviceInfo += "}";
  deviceInfoChar->setValue(deviceInfo.c_str());

  // WiFi Config characteristic (WRITE)
  BLECharacteristic *wifiConfigChar = pService->createCharacteristic(
    WIFI_CONFIG_CHAR_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  wifiConfigChar->setCallbacks(new WiFiConfigCallback());

  // GPS Config characteristic (WRITE)
  BLECharacteristic *gpsConfigChar = pService->createCharacteristic(
    GPS_CONFIG_CHAR_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  gpsConfigChar->setCallbacks(new GPSConfigCallback());

  // Status characteristic (READ + NOTIFY)
  statusCharacteristic = pService->createCharacteristic(
    STATUS_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  statusCharacteristic->addDescriptor(new BLE2902());
  statusCharacteristic->setCallbacks(new StatusCallback());
  statusCharacteristic->setValue("{\"status\":\"ready\"}");

  // Start service and advertising
  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->start();

  Serial.println("BLE advertising started");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    server.handleClient();
    MDNS.update();
  }
  delay(10);
}
```

## Android WiFi Sharing via Web Share Target API

The PWA now supports receiving WiFi credentials via Android's native share functionality!

### How it works:
1. User installs the PWA on their Android device
2. User goes to Android Settings → WiFi → Taps their connected network
3. User taps "Share" or the QR code icon
4. Android shows share menu with "Weather Potato" as an option
5. User selects "Weather Potato"
6. WiFi credentials are automatically sent to the PWA
7. PWA sends credentials to ESP32 via BLE

### Format received:
Android shares WiFi in the standard QR code format:
```
WIFI:S:NetworkName;T:WPA;P:MyPassword123;;
```

The PWA automatically parses this and extracts SSID and password.

### Requirements:
- PWA must be installed (not just opened in browser)
- Android 10+ for native WiFi sharing support
- The PWA manifest includes `share_target` configuration

## Testing BLE Implementation

### Using nRF Connect App (Recommended)

1. Download "nRF Connect" app (Android/iOS)
2. Scan for "Potato-XXXXXXXX" device
3. Connect to device
4. Navigate to the service UUID `12345678-1234-5678-1234-56789abcdef0`
5. Test each characteristic:
   - **Read Device Info**: Should return JSON with device_id
   - **Write WiFi Config**: Send `{"ssid":"test","password":"test123"}`
   - **Write GPS Config**: Send `{"lat":48.8566,"lon":2.3522}`
   - **Subscribe to Status**: Should receive notifications about connection status

### Debug Output
Add Serial.println() statements to track:
- BLE initialization
- Incoming characteristic writes
- WiFi connection attempts
- Status notifications sent

## Security Considerations

⚠️ **Important**: BLE communication in this implementation is **not encrypted**. WiFi passwords are transmitted in plain text over BLE.

### Recommendations:
1. BLE has limited range (~10 meters) - physical security
2. Onboarding should happen in a trusted environment
3. BLE is disabled after setup, reducing attack surface
4. Consider adding BLE pairing/bonding for production

### For Production:
- Implement BLE Security Mode 1 Level 3 (authenticated pairing)
- Use encrypted characteristics
- Add a PIN/passkey verification step

## Troubleshooting

### BLE device not appearing
- Check BLE is initialized: `BLEDevice::init()`
- Check advertising is started: `pAdvertising->start()`
- Verify device name format: `"Potato-XXXXXXXX"`

### PWA can't read characteristics
- Verify UUID strings match exactly (case-sensitive)
- Check characteristic properties (READ, WRITE, NOTIFY)
- Enable notifications with BLE2902 descriptor

### WiFi connection fails
- Verify SSID and password are correctly parsed
- Check WiFi.begin() is called after receiving GPS
- Add timeout handling (60 attempts = 30 seconds)

### Status notifications not received
- Ensure BLE2902 descriptor is added to status characteristic
- Call `notify()` after `setValue()`
- Check PWA has subscribed to notifications

## Next Steps

1. Implement the BLE code in your ESP32 firmware
2. Test with nRF Connect app first
3. Test with the PWA on mobile device
4. Add error handling and edge cases
5. Consider security improvements for production

---

**Questions or issues?** Check the PWA console for detailed logs of BLE operations.
