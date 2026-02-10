import { WEATHER_EMOJIS } from './constants';

/**
 * Sleep utility function
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Get weather emoji from condition
 */
export const getWeatherEmoji = (condition: string): string => {
  return WEATHER_EMOJIS[condition] || WEATHER_EMOJIS.default;
};

/**
 * Parse WiFi QR code (format: WIFI:S:SSID;T:WPA;P:password;;)
 */
export const parseWiFiQR = (qrText: string) => {
  const match = qrText.match(/WIFI:S:([^;]+);(?:T:([^;]+);)?P:([^;]+);/);

  if (match) {
    return {
      ssid: match[1],
      type: match[2] || 'WPA2',
      password: match[3]
    };
  }

  return null;
};

/**
 * Validate SSID
 */
export const isValidSSID = (ssid: string): boolean => {
  return ssid.length > 0 && ssid.length <= 32;
};

/**
 * Validate WiFi password
 */
export const isValidPassword = (password: string): boolean => {
  return password.length >= 8 && password.length <= 63;
};

/**
 * Validate coordinates
 */
export const isValidCoordinates = (lat: number, lon: number): boolean => {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
};

/**
 * Format temperature for display
 */
export const formatTemperature = (temp: number): string => {
  return `${Math.round(temp)}°C`;
};

/**
 * Check if browser supports required features
 */
export const checkBrowserSupport = () => {
  return {
    bluetooth: 'bluetooth' in navigator,
    geolocation: 'geolocation' in navigator,
    camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
  };
};

/**
 * Generate a random device ID (for testing)
 */
export const generateDeviceId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Convert MAC address to device ID format
 * MAC: AA:BB:CC:DD:EE:FF -> Device ID: AABBCCDD (first 8 chars)
 */
export const macToDeviceId = (mac: string): string => {
  return mac.replace(/:/g, '').toUpperCase().substring(0, 8);
};

/**
 * Check if the app is running in a mobile browser
 */
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Check if iOS
 */
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

/**
 * Track analytics event (placeholder for now)
 */
export const trackEvent = (eventName: string, data?: Record<string, unknown>): void => {
  console.log(`[Analytics] ${eventName}`, data);
  // TODO: Implement actual analytics tracking
};
