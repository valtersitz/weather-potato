import { LOCAL_VALIDATION_TIMEOUT } from '../utils/constants';
import type { PotatoConfig } from '../types';

interface ValidationResult {
  success: boolean;
  method?: 'mdns' | 'ip';
  endpoint?: string;
  error?: string;
}

/**
 * Poll device HTTP endpoint until it's ready
 * More reliable than BLE notifications for detecting WiFi connection
 */
export const pollDeviceHTTP = async (
  hostname: string,
  port: number,
  deviceId: string,
  timeout: number = 60000,
  interval: number = 2000
): Promise<{ ip: string; hostname: string; port: number }> => {
  console.log('[HTTP] Starting HTTP polling...');
  console.log('[HTTP] Target:', `http://${hostname}:${port}/health`);
  console.log('[HTTP] Timeout:', timeout, 'ms, Interval:', interval, 'ms');

  const startTime = Date.now();
  const endpoint = `http://${hostname}:${port}`;

  while (Date.now() - startTime < timeout) {
    try {
      console.log('[HTTP] Polling attempt...');
      const response = await fetch(`${endpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3s per request
      });

      console.log('[HTTP] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[HTTP] Health data:', data);

        if (data.device_id === deviceId && data.status === 'ready') {
          console.log('[HTTP] ✅ Device is ready!');
          return {
            ip: data.local_ip || '',
            hostname: hostname,
            port: port
          };
        } else {
          console.warn('[HTTP] Device ID mismatch or not ready:', data);
        }
      }
    } catch (error) {
      // Device not ready yet, continue polling
      console.log('[HTTP] Not ready yet, retrying in', interval, 'ms...');
    }

    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  console.error('[HTTP] ⏰ Polling timeout! Device did not respond in', timeout, 'ms');
  throw new Error('Device did not respond via HTTP');
};

/**
 * Validate local connection to Weather Potato
 */
export const validateLocalConnection = async (
  hostname: string,
  ip: string,
  port: number,
  deviceId: string
): Promise<ValidationResult> => {
  // Try mDNS first
  try {
    const mdnsEndpoint = `http://${hostname}:${port}`;
    const response = await fetch(`${mdnsEndpoint}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(LOCAL_VALIDATION_TIMEOUT)
    });

    if (!response.ok) {
      throw new Error('Health check failed');
    }

    const data = await response.json();

    if (data.device_id === deviceId && data.status === 'ready') {
      return {
        success: true,
        method: 'mdns',
        endpoint: mdnsEndpoint
      };
    }
  } catch (error) {
    console.warn('mDNS connection failed, trying IP fallback...', error);
  }

  // Try IP fallback
  try {
    const ipEndpoint = `http://${ip}:${port}`;
    const response = await fetch(`${ipEndpoint}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(LOCAL_VALIDATION_TIMEOUT)
    });

    if (!response.ok) {
      throw new Error('Health check failed');
    }

    const data = await response.json();

    if (data.device_id === deviceId && data.status === 'ready') {
      return {
        success: true,
        method: 'ip',
        endpoint: ipEndpoint
      };
    }
  } catch (error) {
    console.error('IP connection also failed:', error);
  }

  return {
    success: false,
    error: 'local_connection_failed'
  };
};

/**
 * Get current weather from Weather Potato
 */
export const getWeather = async (endpoint: string) => {
  const response = await fetch(`${endpoint}/weather`);

  if (!response.ok) {
    throw new Error('Failed to get weather');
  }

  return await response.json();
};

// ---------------------------------------------------------------------------
// Multi-potato storage
// Keys: 'potato_configs' (PotatoConfig[]) + 'active_potato_id' (string)
// Migration: if old 'potato_config' key exists and new key is absent, migrate.
// ---------------------------------------------------------------------------

const KEY_CONFIGS = 'potato_configs';
const KEY_ACTIVE  = 'active_potato_id';
const KEY_LEGACY  = 'potato_config';

function migrateIfNeeded(): void {
  if (localStorage.getItem(KEY_CONFIGS) !== null) return;
  const legacy = localStorage.getItem(KEY_LEGACY);
  if (!legacy) return;
  try {
    const config: PotatoConfig = JSON.parse(legacy);
    localStorage.setItem(KEY_CONFIGS, JSON.stringify([config]));
    localStorage.setItem(KEY_ACTIVE, config.device_id);
    localStorage.removeItem(KEY_LEGACY);
  } catch {
    // malformed legacy data — leave it alone
  }
}

/**
 * Return all saved potato configs. Migrates the old single-config key if needed.
 */
export const loadAllPotatoConfigs = (): PotatoConfig[] => {
  migrateIfNeeded();
  const raw = localStorage.getItem(KEY_CONFIGS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PotatoConfig[];
  } catch {
    return [];
  }
};

/**
 * Save (upsert) a config into the list and make it the active device.
 * Existing entry with the same device_id is replaced.
 */
export const savePotatoConfig = (config: PotatoConfig): void => {
  const all = loadAllPotatoConfigs();
  const idx = all.findIndex(c => c.device_id === config.device_id);
  if (idx >= 0) {
    all[idx] = config;
  } else {
    all.push(config);
  }
  localStorage.setItem(KEY_CONFIGS, JSON.stringify(all));
  localStorage.setItem(KEY_ACTIVE, config.device_id);
};

/**
 * Load the active potato config. Returns null if no config is saved.
 * Drop-in replacement for the old single-config loader — no callers need to change.
 */
export const loadPotatoConfig = (): PotatoConfig | null => {
  const all = loadAllPotatoConfigs();
  if (all.length === 0) return null;
  const activeId = localStorage.getItem(KEY_ACTIVE);
  return all.find(c => c.device_id === activeId) ?? all[0];
};

/**
 * Set which potato is the active one (by device_id).
 */
export const setActivePotatoId = (deviceId: string): void => {
  localStorage.setItem(KEY_ACTIVE, deviceId);
};

/**
 * Remove a single potato config from the list.
 * If it was the active one, activate the first remaining entry (or clear if none).
 */
export const removePotatoConfig = (deviceId: string): void => {
  const all = loadAllPotatoConfigs().filter(c => c.device_id !== deviceId);
  localStorage.setItem(KEY_CONFIGS, JSON.stringify(all));
  const activeId = localStorage.getItem(KEY_ACTIVE);
  if (activeId === deviceId) {
    if (all.length > 0) {
      localStorage.setItem(KEY_ACTIVE, all[0].device_id);
    } else {
      localStorage.removeItem(KEY_ACTIVE);
    }
  }
};

/**
 * Clear ALL saved configs and the active id (full reconfigure).
 */
export const clearPotatoConfig = (): void => {
  localStorage.removeItem(KEY_CONFIGS);
  localStorage.removeItem(KEY_ACTIVE);
  localStorage.removeItem(KEY_LEGACY);
};

/**
 * Check if a device is currently connected to the relay.
 * Returns true if the relay confirms the device is online, false otherwise.
 * Times out after 4 seconds.
 */
export const checkDeviceOnline = async (deviceId: string): Promise<boolean> => {
  try {
    const relayBase = (import.meta.env.VITE_RELAY_URL || 'ws://localhost:3000')
      .replace(/^wss:\/\//, 'https://')
      .replace(/^ws:\/\//, 'http://');
    const res = await fetch(`${relayBase}/status/${deviceId}`, {
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.online === true;
  } catch {
    return false;
  }
};
