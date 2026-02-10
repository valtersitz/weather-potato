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
  if (!isBluetoothSupported()) {
    throw new Error('Bluetooth not supported');
  }

  try {
    // Request device with Weather Potato name prefix
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: BLE_DEVICE_NAME_PREFIX }],
      optionalServices: [BLE_SERVICE_UUID]
    });

    // Verify device name matches expected device ID
    if (device.name !== `${BLE_DEVICE_NAME_PREFIX}${expectedDeviceId}`) {
      throw new Error('wrong_device');
    }

    // Connect to GATT server
    if (!device.gatt) {
      throw new Error('GATT not available');
    }

    const server = await device.gatt.connect();

    // Get primary service
    const service = await server.getPrimaryService(BLE_SERVICE_UUID);

    // Get all characteristics
    const deviceInfoChar = await service.getCharacteristic(BLE_DEVICE_INFO_CHAR_UUID);
    const wifiConfigChar = await service.getCharacteristic(BLE_WIFI_CONFIG_CHAR_UUID);
    const gpsConfigChar = await service.getCharacteristic(BLE_GPS_CONFIG_CHAR_UUID);
    const statusChar = await service.getCharacteristic(BLE_STATUS_CHAR_UUID);

    // Read and validate device info
    const deviceInfoData = await deviceInfoChar.readValue();
    const deviceInfo = decodeDeviceInfo(deviceInfoData);

    if (deviceInfo.deviceId !== expectedDeviceId) {
      throw new Error('device_mismatch');
    }

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
    if (error instanceof Error) {
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
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      statusChar.stopNotifications();
      reject(new Error('timeout'));
    }, timeout);

    const handleStatusChange = (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      const decoder = new TextDecoder();
      const data: ESP32Status = JSON.parse(decoder.decode(target.value!));

      if (data.status === 'wifi_connected') {
        clearTimeout(timeoutId);
        statusChar.stopNotifications();
        statusChar.removeEventListener('characteristicvaluechanged', handleStatusChange);
        resolve(data);
      } else if (data.status === 'wifi_failed') {
        clearTimeout(timeoutId);
        statusChar.stopNotifications();
        statusChar.removeEventListener('characteristicvaluechanged', handleStatusChange);
        reject(new Error(data.message || 'WiFi connection failed'));
      }
    };

    statusChar.addEventListener('characteristicvaluechanged', handleStatusChange);
    statusChar.startNotifications();
  });
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
