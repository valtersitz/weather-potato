import { useState, useEffect } from 'react';
import { WelcomeScreen } from './components/onboarding/WelcomeScreen';
import { BLEConnectionComponent } from './components/onboarding/BLEConnection';
import { WiFiQRScanner } from './components/onboarding/WiFiQRScanner';
import { ManualWiFiEntry } from './components/onboarding/ManualWiFiEntry';
import { LocationSetup } from './components/onboarding/LocationSetup';
import { ValidationScreen } from './components/onboarding/ValidationScreen';
import { SuccessScreen } from './components/onboarding/SuccessScreen';
import { loadPotatoConfig } from './services/localConnectionService';
import { supportsWebBluetooth } from './utils/platform';
import { STORAGE_DEVICE_ID } from './utils/constants';
import type {
  OnboardingStep,
  BLEConnection,
  WiFiCredentials,
  LocationInfo,
  PotatoConfig
} from './types';

function App() {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [deviceId, setDeviceId] = useState<string>('');

  console.log('[App] Current step:', step);
  const [bleConnection, setBleConnection] = useState<BLEConnection | null>(null);
  const [wifiCredentials, setWifiCredentials] = useState<WiFiCredentials | null>(null);
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [potatoConfig, setPotatoConfig] = useState<PotatoConfig | null>(null);
  const [wifiMode, setWifiMode] = useState<'scan' | 'manual'>('scan');

  useEffect(() => {
    // Check if device is already configured
    const existingConfig = loadPotatoConfig();
    if (existingConfig && existingConfig.setup_complete) {
      setPotatoConfig(existingConfig);
      setDeviceId(existingConfig.device_id);
      setStep('success');
      return;
    }

    // Get device ID from URL parameter (from QR code scan)
    const urlParams = new URLSearchParams(window.location.search);
    const urlDeviceId = urlParams.get('device');

    if (urlDeviceId) {
      console.log('Device ID from URL:', urlDeviceId);
      setDeviceId(urlDeviceId);
      localStorage.setItem(STORAGE_DEVICE_ID, urlDeviceId);
    } else {
      // Check localStorage for previous device ID
      const savedDeviceId = localStorage.getItem(STORAGE_DEVICE_ID);
      if (savedDeviceId) {
        console.log('Device ID from localStorage:', savedDeviceId);
        setDeviceId(savedDeviceId);
      } else {
        // No device ID yet - will be obtained from BLE or AP connection
        console.log('No device ID yet - will be detected during onboarding');
      }
    }
  }, []);

  const handleStart = () => {
    // Skip BLE if not supported (iOS, old Android)
    if (!supportsWebBluetooth()) {
      console.log('Web Bluetooth not supported, skipping to WiFi setup');
      setStep('wifi-setup');
    } else {
      setStep('ble-connect');
    }
  };

  const handleBLEConnected = (connection: BLEConnection) => {
    setBleConnection(connection);

    // Extract device ID from BLE device name (format: "Potato-XXXXXXXX")
    if (connection.device?.name) {
      const match = connection.device.name.match(/Potato-([A-F0-9]{8})/i);
      if (match) {
        const detectedDeviceId = match[1].toUpperCase();
        console.log('Device ID detected from BLE:', detectedDeviceId);
        setDeviceId(detectedDeviceId);
        localStorage.setItem(STORAGE_DEVICE_ID, detectedDeviceId);
      }
    }

    setStep('wifi-setup');
  };

  const handleSkipBLE = () => {
    setBleConnection(null);
    setStep('wifi-setup');
  };

  const handleWiFiScanned = (credentials: WiFiCredentials) => {
    console.log('[App] WiFi credentials scanned, navigating to location setup');
    setWifiCredentials(credentials);
    setStep('location-setup');
  };

  const handleManualWiFiEntry = () => {
    setWifiMode('manual');
  };

  const handleBackToScan = () => {
    setWifiMode('scan');
  };

  const handleBackToBLE = () => {
    if (supportsWebBluetooth()) {
      setStep('ble-connect');
    } else {
      setStep('welcome');
    }
  };

  const handleBackToWiFi = () => {
    setStep('wifi-setup');
    setWifiMode('scan');
  };

  const handleLocationSet = (locationInfo: LocationInfo) => {
    console.log('[App] Location set, navigating to validation');
    setLocation(locationInfo);
    setStep('validation');
  };

  const handleValidationSuccess = (config: PotatoConfig) => {
    console.log('[App] Validation successful, navigating to success screen');
    setPotatoConfig(config);
    setStep('success');
  };

  const handleValidationError = (error: string) => {
    console.error('Validation error:', error);
    // For now, go back to WiFi setup
    // In production, show error modal with retry options
    alert(`Setup failed: ${error}. Please try again.`);
    setStep('wifi-setup');
  };

  return (
    <div className="app">
      {step === 'welcome' && (
        <WelcomeScreen
          onStart={handleStart}
          deviceId={deviceId}
        />
      )}

      {step === 'ble-connect' && (
        <BLEConnectionComponent
          deviceId={deviceId}
          onConnected={handleBLEConnected}
          onSkip={handleSkipBLE}
          onBack={() => setStep('welcome')}
        />
      )}

      {step === 'wifi-setup' && wifiMode === 'scan' && (
        <WiFiQRScanner
          onScanned={handleWiFiScanned}
          onManualEntry={handleManualWiFiEntry}
          onBack={handleBackToBLE}
        />
      )}

      {step === 'wifi-setup' && wifiMode === 'manual' && (
        <ManualWiFiEntry
          onSubmit={handleWiFiScanned}
          onBack={handleBackToScan}
        />
      )}

      {step === 'location-setup' && (
        <LocationSetup
          onLocationSet={handleLocationSet}
          onBack={handleBackToWiFi}
        />
      )}

      {step === 'validation' && wifiCredentials && location && (
        <ValidationScreen
          bleConnection={bleConnection}
          wifiCredentials={wifiCredentials}
          location={location}
          deviceId={deviceId}
          onSuccess={handleValidationSuccess}
          onError={handleValidationError}
          onBack={handleBackToWiFi}
        />
      )}

      {step === 'success' && potatoConfig && (
        <SuccessScreen
          config={potatoConfig}
        />
      )}
    </div>
  );
}

export default App;
