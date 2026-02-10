import { useState, useEffect } from 'react';
import { WelcomeScreen } from './components/onboarding/WelcomeScreen';
import { BLEConnectionComponent } from './components/onboarding/BLEConnection';
import { WiFiQRScanner } from './components/onboarding/WiFiQRScanner';
import { ManualWiFiEntry } from './components/onboarding/ManualWiFiEntry';
import { AndroidWiFiShareGuide } from './components/onboarding/AndroidWiFiShareGuide';
import { LocationSetup } from './components/onboarding/LocationSetup';
import { ValidationScreen } from './components/onboarding/ValidationScreen';
import { SuccessScreen } from './components/onboarding/SuccessScreen';
import { loadPotatoConfig } from './services/localConnectionService';
import { retrieveSharedWiFi } from './services/wifiShareService';
import { macToDeviceId, isMobile } from './utils/helpers';
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
  const [bleConnection, setBleConnection] = useState<BLEConnection | null>(null);
  const [wifiCredentials, setWifiCredentials] = useState<WiFiCredentials | null>(null);
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [potatoConfig, setPotatoConfig] = useState<PotatoConfig | null>(null);
  const [wifiMode, setWifiMode] = useState<'share' | 'scan' | 'manual'>('share');

  useEffect(() => {
    // Check for shared WiFi credentials (from Android share)
    const sharedWiFi = retrieveSharedWiFi();
    if (sharedWiFi) {
      console.log('Found shared WiFi credentials:', sharedWiFi.ssid);
      setWifiCredentials(sharedWiFi);
      // If we have WiFi credentials, skip to location setup
      setStep('location-setup');
      return;
    }

    // Check if device is already configured
    const existingConfig = loadPotatoConfig();
    if (existingConfig && existingConfig.setup_complete) {
      setPotatoConfig(existingConfig);
      setDeviceId(existingConfig.device_id);
      setStep('success');
      return;
    }

    // Get device ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlDeviceId = urlParams.get('device');

    if (urlDeviceId) {
      setDeviceId(urlDeviceId);
      localStorage.setItem(STORAGE_DEVICE_ID, urlDeviceId);
    } else {
      // Check localStorage for previous device ID
      const savedDeviceId = localStorage.getItem(STORAGE_DEVICE_ID);
      if (savedDeviceId) {
        setDeviceId(savedDeviceId);
      } else {
        // For testing: generate a random device ID
        // In production, this should come from scanning the QR code
        const testDeviceId = macToDeviceId('AA:BB:CC:DD:EE:FF');
        setDeviceId(testDeviceId);
      }
    }
  }, []);

  const handleStart = () => {
    setStep('ble-connect');
  };

  const handleBLEConnected = (connection: BLEConnection) => {
    setBleConnection(connection);
    setStep('wifi-setup');
  };

  const handleSkipBLE = () => {
    setBleConnection(null);
    setStep('wifi-setup');
  };

  const handleWiFiScanned = (credentials: WiFiCredentials) => {
    setWifiCredentials(credentials);
    setStep('location-setup');
  };

  const handleShareGuideComplete = () => {
    // Check if WiFi was shared
    const sharedWiFi = retrieveSharedWiFi();
    if (sharedWiFi) {
      setWifiCredentials(sharedWiFi);
      setStep('location-setup');
    } else {
      // No share received, move to QR scan
      setWifiMode('scan');
    }
  };

  const handleSkipShare = () => {
    setWifiMode('scan');
  };

  const handleManualWiFiEntry = () => {
    setWifiMode('manual');
  };

  const handleBackToScan = () => {
    setWifiMode('scan');
  };

  const handleLocationSet = (locationInfo: LocationInfo) => {
    setLocation(locationInfo);
    setStep('validation');
  };

  const handleValidationSuccess = (config: PotatoConfig) => {
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
        />
      )}

      {step === 'wifi-setup' && wifiMode === 'share' && isMobile() && (
        <AndroidWiFiShareGuide
          onContinue={handleShareGuideComplete}
          onSkip={handleSkipShare}
        />
      )}

      {step === 'wifi-setup' && wifiMode === 'scan' && (
        <WiFiQRScanner
          onScanned={handleWiFiScanned}
          onManualEntry={handleManualWiFiEntry}
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
