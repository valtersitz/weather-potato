// BLE UUIDs for Weather Potato
export const BLE_SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';
export const BLE_DEVICE_INFO_CHAR_UUID = '12345678-1234-5678-1234-56789abcdef1';
export const BLE_WIFI_CONFIG_CHAR_UUID = '12345678-1234-5678-1234-56789abcdef2';
export const BLE_GPS_CONFIG_CHAR_UUID = '12345678-1234-5678-1234-56789abcdef3';
export const BLE_STATUS_CHAR_UUID = '12345678-1234-5678-1234-56789abcdef4';

// BLE Device naming
export const BLE_DEVICE_NAME_PREFIX = 'Potato-';

// Local connection
export const MDNS_HOSTNAME = 'weatherpotato.local';
export const DEFAULT_PORT = 8080;

// Timeouts
export const BLE_CONNECTION_TIMEOUT = 30000; // 30 seconds
export const WIFI_CONNECTION_TIMEOUT = 30000; // 30 seconds
export const LOCAL_VALIDATION_TIMEOUT = 5000; // 5 seconds
export const QR_SCAN_TIMEOUT = 60000; // 60 seconds

// Storage keys
export const STORAGE_DEVICE_ID = 'current_device_id';
export const STORAGE_POTATO_CONFIG = 'potato_config';
export const STORAGE_LANGUAGE = 'preferred_language';

// Weather emoji mapping
export const WEATHER_EMOJIS: Record<string, string> = {
  clear_sky: '☀️',
  light_clouds: '🌤️',
  partly_cloudy: '⛅',
  cloudy: '☁️',
  overcast: '☁️',
  rain: '🌧️',
  rain_shower: '🌦️',
  drizzle: '🌦️',
  snow: '❄️',
  snow_shower: '🌨️',
  sleet_shower: '🌨️',
  rain_and_snow: '🌨️',
  light_fog: '🌫️',
  dense_fog: '🌫️',
  freezing_rain: '🌧️',
  thunderstorm: '⛈️',
  sandstorm: '🌪️',
  default: '🌤️'
};
