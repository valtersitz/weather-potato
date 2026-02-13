// Device and BLE types
export interface DeviceInfo {
  deviceId: string;
  macAddress: string;
  firmwareVersion?: string;
}

export interface BLECharacteristics {
  deviceInfoChar: BluetoothRemoteGATTCharacteristic;
  wifiConfigChar: BluetoothRemoteGATTCharacteristic;
  gpsConfigChar: BluetoothRemoteGATTCharacteristic;
  statusChar: BluetoothRemoteGATTCharacteristic;
}

export interface BLEConnection {
  device: BluetoothDevice;
  characteristics: BLECharacteristics;
}

// WiFi types
export interface WiFiCredentials {
  ssid: string;
  password: string;
  type?: string;
}

// GPS types
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationInfo extends Coordinates {
  city?: string;
}

// ESP32 Communication types
export interface ESP32Status {
  status: 'connecting_wifi' | 'wifi_connected' | 'wifi_failed' | 'ble_disabled';
  message?: string;
  local_ip?: string;
  port?: number;
  hostname?: string;
  device_id?: string;
}

export interface PotatoConfig {
  device_id: string;
  endpoint: string;
  hostname: string;
  last_seen: number;
  setup_complete: boolean;
  ip?: string;
  port?: number;
  relay_url?: string;  // WebSocket relay URL for HTTPS PWA access
}

// Weather types
export interface WeatherData {
  temperature: number;
  condition: string;
  emoji: string;
}

// Language types
export type Language = 'en' | 'fr' | 'es' | 'de';

// UI State types
export type OnboardingStep =
  | 'welcome'
  | 'ble-connect'
  | 'ap-mode'
  | 'wifi-setup'
  | 'location-setup'
  | 'validation'
  | 'success';

export interface Capabilities {
  bluetooth: boolean;
  geolocation: boolean;
  camera: boolean;
}
