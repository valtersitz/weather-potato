import { parseWiFiQR } from '../utils/helpers';
import type { WiFiCredentials } from '../types';

/**
 * Parse WiFi credentials from Android share data
 * Android shares WiFi in format: WIFI:S:SSID;T:WPA;P:password;;
 */
export const parseAndroidWiFiShare = (shareText: string): WiFiCredentials | null => {
  // Android shares WiFi as QR code text format
  return parseWiFiQR(shareText);
};

/**
 * Handle shared data from Web Share Target API
 */
export const handleSharedData = (formData: FormData): WiFiCredentials | null => {
  const title = formData.get('title') as string;
  const text = formData.get('text') as string;
  const url = formData.get('url') as string;

  console.log('Received share:', { title, text, url });

  // Try to parse WiFi from text field
  if (text) {
    const credentials = parseAndroidWiFiShare(text);
    if (credentials) {
      return credentials;
    }
  }

  // Try to parse from title field (some Android versions use this)
  if (title) {
    const credentials = parseAndroidWiFiShare(title);
    if (credentials) {
      return credentials;
    }
  }

  return null;
};

/**
 * Check if Web Share Target is supported
 */
export const isShareTargetSupported = (): boolean => {
  // Share Target is supported if the app is installed as PWA
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.matchMedia('(display-mode: fullscreen)').matches ||
         (window.navigator as any).standalone === true;
};

/**
 * Store shared WiFi credentials temporarily
 */
export const storeSharedWiFi = (credentials: WiFiCredentials): void => {
  localStorage.setItem('shared_wifi_credentials', JSON.stringify(credentials));
  localStorage.setItem('shared_wifi_timestamp', Date.now().toString());
};

/**
 * Retrieve and clear shared WiFi credentials
 */
export const retrieveSharedWiFi = (): WiFiCredentials | null => {
  const credentialsStr = localStorage.getItem('shared_wifi_credentials');
  const timestamp = localStorage.getItem('shared_wifi_timestamp');

  if (!credentialsStr || !timestamp) {
    return null;
  }

  // Clear after retrieval
  localStorage.removeItem('shared_wifi_credentials');
  localStorage.removeItem('shared_wifi_timestamp');

  // Check if credentials are recent (within 5 minutes)
  const age = Date.now() - parseInt(timestamp);
  if (age > 5 * 60 * 1000) {
    return null;
  }

  try {
    return JSON.parse(credentialsStr);
  } catch {
    return null;
  }
};
