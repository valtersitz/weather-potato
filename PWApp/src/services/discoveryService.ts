/**
 * Auto-discovery service for Weather Potato devices on the local network
 */

import { MDNS_HOSTNAME, DEFAULT_PORT } from '../utils/constants';
import type { PotatoConfig } from '../types';

interface DiscoveryResult {
  found: boolean;
  config?: PotatoConfig;
  error?: string;
}

/**
 * Try to discover a Weather Potato device on the local network
 * Attempts mDNS hostname first, then common IP ranges if needed
 */
export const discoverWeatherPotato = async (): Promise<DiscoveryResult> => {
  console.log('[Discovery] Starting auto-discovery...');

  // Method 1: Try mDNS hostname (works if mDNS is functioning)
  try {
    console.log('[Discovery] Trying mDNS hostname:', `http://${MDNS_HOSTNAME}:${DEFAULT_PORT}/device-info`);

    const response = await fetch(`http://${MDNS_HOSTNAME}:${DEFAULT_PORT}/device-info`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[Discovery] ✅ Found device via mDNS:', data);

      const config: PotatoConfig = {
        device_id: data.device_id,
        endpoint: `http://${MDNS_HOSTNAME}:${DEFAULT_PORT}`,
        hostname: MDNS_HOSTNAME,
        last_seen: Date.now(),
        setup_complete: true,
        port: DEFAULT_PORT
      };

      return {
        found: true,
        config
      };
    }
  } catch (err) {
    console.log('[Discovery] mDNS failed:', err);
  }

  // If mDNS failed, return not found
  // In the future, we could add IP scanning here
  console.log('[Discovery] ❌ No device found');

  return {
    found: false,
    error: 'No device found on network'
  };
};
