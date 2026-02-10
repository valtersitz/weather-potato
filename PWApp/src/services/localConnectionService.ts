import { MDNS_HOSTNAME, DEFAULT_PORT, LOCAL_VALIDATION_TIMEOUT } from '../utils/constants';
import type { PotatoConfig } from '../types';

interface ValidationResult {
  success: boolean;
  method?: 'mdns' | 'ip';
  endpoint?: string;
  error?: string;
}

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
