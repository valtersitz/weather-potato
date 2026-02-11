import {
  BLE_SERVICE_UUID,
  BLE_DEVICE_INFO_CHAR_UUID,
  BLE_WIFI_CONFIG_CHAR_UUID,
  BLE_GPS_CONFIG_CHAR_UUID,
  BLE_STATUS_CHAR_UUID,
  BLE_DEVICE_NAME_PREFIX,
  BLE_CONNECTION_TIMEOUT
} from '../utils/constants';
import type { BLEConnection, DeviceInfo, WiFiCredentials, Coordinates, ESP32Status } from '../types';

/**
 * Check if Web Bluetooth is supported
 */
export const isBluetoothSupported = (): boolean => {
  return 'bluetooth' in navigator;
};

/**
 * Request and connect to a Weather Potato device via BLE
 */
export const connectBLE = async (expectedDeviceId: string): Promise<BLEConnection> => {
  console.log('[BLE] Starting connection process...');
  console.log('[BLE] Expected device ID:', expectedDeviceId || '(any)');

  if (!isBluetoothSupported()) {
    console.error('[BLE] Bluetooth not supported');
    throw new Error('Bluetooth not supported');
  }

  try {
    // Request device with Weather Potato name prefix
    console.log('[BLE] Requesting device with prefix:', BLE_DEVICE_NAME_PREFIX);
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: BLE_DEVICE_NAME_PREFIX }],
      optionalServices: [BLE_SERVICE_UUID]
    });

    console.log('[BLE] Device selected:', device.name);

    // Verify device name matches expected device ID (if provided)
    if (expectedDeviceId && device.name !== `${BLE_DEVICE_NAME_PREFIX}${expectedDeviceId}`) {
      console.error('[BLE] Wrong device selected:', device.name, 'expected:', `${BLE_DEVICE_NAME_PREFIX}${expectedDeviceId}`);
      throw new Error('wrong_device');
    }

    // Connect to GATT server
    if (!device.gatt) {
      console.error('[BLE] GATT not available on device');
      throw new Error('GATT not available');
    }

    console.log('[BLE] Connecting to GATT server...');
    const server = await device.gatt.connect();
    console.log('[BLE] GATT server connected');

    // Get primary service
    console.log('[BLE] Getting primary service:', BLE_SERVICE_UUID);
    const service = await server.getPrimaryService(BLE_SERVICE_UUID);
    console.log('[BLE] Primary service obtained');

    // Get all characteristics
    console.log('[BLE] Getting device info characteristic...');
    const deviceInfoChar = await service.getCharacteristic(BLE_DEVICE_INFO_CHAR_UUID);
    console.log('[BLE] Device info characteristic obtained');

    console.log('[BLE] Getting WiFi config characteristic...');
    const wifiConfigChar = await service.getCharacteristic(BLE_WIFI_CONFIG_CHAR_UUID);
    console.log('[BLE] WiFi config characteristic obtained');

    console.log('[BLE] Getting GPS config characteristic...');
    const gpsConfigChar = await service.getCharacteristic(BLE_GPS_CONFIG_CHAR_UUID);
    console.log('[BLE] GPS config characteristic obtained');

    console.log('[BLE] Getting status characteristic...');
    const statusChar = await service.getCharacteristic(BLE_STATUS_CHAR_UUID);
    console.log('[BLE] Status characteristic obtained');

    // Read and validate device info
    console.log('[BLE] Reading device info...');
    const deviceInfoData = await deviceInfoChar.readValue();
    console.log('[BLE] Device info data received, length:', deviceInfoData.byteLength);

    const deviceInfo = decodeDeviceInfo(deviceInfoData);
    console.log('[BLE] Device info decoded:', deviceInfo);

    if (expectedDeviceId && deviceInfo.deviceId !== expectedDeviceId) {
      console.error('[BLE] Device ID mismatch:', deviceInfo.deviceId, 'vs', expectedDeviceId);
      throw new Error('device_mismatch');
    }

    console.log('[BLE] Connection successful!');
    return {
      device,
      characteristics: {
        deviceInfoChar,
        wifiConfigChar,
        gpsConfigChar,
        statusChar
      }
    };
  } catch (error) {
    console.error('[BLE] Connection error:', error);
    if (error instanceof Error) {
      console.error('[BLE] Error name:', error.name);
      console.error('[BLE] Error message:', error.message);
      console.error('[BLE] Error stack:', error.stack);

      if (error.message === 'wrong_device' || error.message === 'device_mismatch') {
        throw error;
      }
    }
    throw new Error('ble_connection_failed');
  }
};

/**
 * Decode device info from BLE characteristic
 */
export const decodeDeviceInfo = (dataView: DataView): DeviceInfo => {
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(dataView);
  const data = JSON.parse(jsonString);

  return {
    deviceId: data.device_id,
    macAddress: data.mac_address,
    firmwareVersion: data.firmware_version
  };
};

/**
 * Send WiFi credentials to ESP32 via BLE
 */
export const sendWiFiCredentials = async (
  char: BluetoothRemoteGATTCharacteristic,
  credentials: WiFiCredentials
): Promise<void> => {
  const data = JSON.stringify({
    ssid: credentials.ssid,
    password: credentials.password
  });

  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);

  await char.writeValue(encoded);
};

/**
 * Send GPS coordinates to ESP32 via BLE
 */
export const sendGPSCoordinates = async (
  char: BluetoothRemoteGATTCharacteristic,
  coordinates: Coordinates
): Promise<void> => {
  const data = JSON.stringify({
    lat: coordinates.latitude,
    lon: coordinates.longitude
  });

  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);

  await char.writeValue(encoded);
};

/**
 * Wait for WiFi connection status from ESP32
 */
export const waitForWiFiConnection = async (
  statusChar: BluetoothRemoteGATTCharacteristic,
  timeout: number = BLE_CONNECTION_TIMEOUT
): Promise<ESP32Status> => {
  console.log('[BLE] Waiting for WiFi connection status...');
  console.log('[BLE] Timeout set to:', timeout, 'ms');

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.error('[BLE] ⏰ Timeout waiting for WiFi connection status!');
      statusChar.stopNotifications().catch(() => {});
      reject(new Error('timeout'));
    }, timeout);

    const handleStatusChange = (event: Event) => {
      const target = event.target as unknown as BluetoothRemoteGATTCharacteristic;
      const decoder = new TextDecoder();
      const rawData = decoder.decode(target.value!);

      console.log('[BLE] 📢 Status notification received!');
      console.log('[BLE] Raw data:', rawData);

      try {
        const data: ESP32Status = JSON.parse(rawData);
        console.log('[BLE] Parsed status:', data);

        if (data.status === 'wifi_connected') {
          console.log('[BLE] ✅ WiFi connected successfully!');
          console.log('[BLE] IP:', data.local_ip);
          console.log('[BLE] Hostname:', data.hostname);
          clearTimeout(timeoutId);
          statusChar.stopNotifications().catch(() => {});
          statusChar.removeEventListener('characteristicvaluechanged', handleStatusChange);
          resolve(data);
        } else if (data.status === 'wifi_failed') {
          console.error('[BLE] ❌ WiFi connection failed:', data.message);
          clearTimeout(timeoutId);
          statusChar.stopNotifications().catch(() => {});
          statusChar.removeEventListener('characteristicvaluechanged', handleStatusChange);
          reject(new Error(data.message || 'WiFi connection failed'));
        } else {
          console.log('[BLE] Status update:', data.status, data.message || '');
        }
      } catch (error) {
        console.error('[BLE] Failed to parse status JSON:', error);
        console.error('[BLE] Raw data was:', rawData);
      }
    };

    console.log('[BLE] Adding event listener for status changes...');
    statusChar.addEventListener('characteristicvaluechanged', handleStatusChange);

    console.log('[BLE] Starting notifications...');
    statusChar.startNotifications().then(() => {
      console.log('[BLE] Notifications started successfully');
    }).catch((error) => {
      console.error('[BLE] Failed to start notifications:', error);
      clearTimeout(timeoutId);
      reject(error);
    });
  });
};

/**
 * Poll WiFi connection status by reading BLE characteristic
 * More reliable than notifications, works even from HTTPS pages
 */
export const pollWiFiStatusViaBLE = async (
  statusChar: BluetoothRemoteGATTCharacteristic,
  timeout: number = 60000,
  interval: number = 2000
): Promise<ESP32Status> => {
  console.log('[BLE] Polling WiFi status via BLE reads...');
  console.log('[BLE] Timeout:', timeout, 'ms, Interval:', interval, 'ms');

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      console.log('[BLE] Reading status characteristic...');
      const value = await statusChar.readValue();
      const decoder = new TextDecoder();
      const rawData = decoder.decode(value);

      console.log('[BLE] Status data:', rawData);

      try {
        const data: ESP32Status = JSON.parse(rawData);
        console.log('[BLE] Parsed status:', data);

        if (data.status === 'wifi_connected') {
          console.log('[BLE] ✅ WiFi connected! IP:', data.local_ip);
          return data;
        } else if (data.status === 'wifi_failed') {
          console.error('[BLE] ❌ WiFi connection failed:', data.message);
          throw new Error(data.message || 'WiFi connection failed');
        } else {
          console.log('[BLE] Status:', data.status, '-', data.message || 'waiting...');
        }
      } catch (parseError) {
        console.warn('[BLE] Failed to parse status JSON:', parseError);
      }
    } catch (error) {
      console.warn('[BLE] Error reading status:', error);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  console.error('[BLE] ⏰ Polling timeout! WiFi did not connect in', timeout, 'ms');
  throw new Error('WiFi connection timeout');
};

/**
 * Send command to disable BLE on ESP32
 */
export const disableBLE = async (
  statusChar: BluetoothRemoteGATTCharacteristic
): Promise<void> => {
  const command = JSON.stringify({ action: 'disable_ble' });
  const encoder = new TextEncoder();
  const encoded = encoder.encode(command);

  await statusChar.writeValue(encoded);
};

/**
 * Disconnect from BLE device
 */
export const disconnectBLE = async (device: BluetoothDevice): Promise<void> => {
  if (device.gatt?.connected) {
    device.gatt.disconnect();
  }
};
