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

/**
 * Save configuration to localStorage
 */
export const savePotatoConfig = (config: PotatoConfig): void => {
  localStorage.setItem('potato_config', JSON.stringify(config));
};

/**
 * Load configuration from localStorage
 */
export const loadPotatoConfig = (): PotatoConfig | null => {
  const configStr = localStorage.getItem('potato_config');
  if (!configStr) return null;

  try {
    return JSON.parse(configStr);
  } catch {
    return null;
  }
};

/**
 * Clear saved configuration
 */
export const clearPotatoConfig = (): void => {
  localStorage.removeItem('potato_config');
};
