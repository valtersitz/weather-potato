import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WelcomeScreen } from './WelcomeScreen';
import { BLEConnectionComponent } from './BLEConnection';
import { WiFiQRScanner } from './WiFiQRScanner';
import { ManualWiFiEntry } from './ManualWiFiEntry';
import { LocationSetup } from './LocationSetup';
import { ValidationScreen } from './ValidationScreen';
import { SuccessScreen } from './SuccessScreen';
import { APConnectionScreen } from './APConnectionScreen';
import { loadPotatoConfig } from '../../services/localConnectionService';
import { supportsWebBluetooth, isIOS } from '../../utils/platform';
import { STORAGE_DEVICE_ID } from '../../utils/constants';
import type {
  OnboardingStep,
  BLEConnection,
  WiFiCredentials,
  LocationInfo,
  PotatoConfig
} from '../../types';

export const OnboardingFlow = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [deviceId, setDeviceId] = useState<string>('');

  console.log('[OnboardingFlow] Current step:', step);
  const [bleConnection, setBleConnection] = useState<BLEConnection | null>(null);
  const [wifiCredentials, setWifiCredentials] = useState<WiFiCredentials | null>(null);
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [potatoConfig, setPotatoConfig] = useState<PotatoConfig | null>(null);
  const [wifiMode, setWifiMode] = useState<'scan' | 'manual'>('scan');
  const [isAPMode, setIsAPMode] = useState(false); // Track if we're using AP mode instead of BLE

  useEffect(() => {
    // Check if device is already configured
    const existingConfig = loadPotatoConfig();
    if (existingConfig && existingConfig.setup_complete) {
      // Already setup, redirect to dashboard
      console.log('[OnboardingFlow] Device already configured, redirecting to dashboard');
      navigate('/dashboard');
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
  }, [navigate]);

  const handleStart = () => {
    // iOS doesn't support Web Bluetooth in Safari/Chrome - use AP mode
    if (isIOS()) {
      console.log('iOS detected, using AP mode onboarding');
      setIsAPMode(true);
      setStep('wifi-setup'); // Collect WiFi credentials FIRST (while on home WiFi)
      return;
    }

    // Check if Web Bluetooth is supported
    if (!supportsWebBluetooth()) {
      console.log('Web Bluetooth not supported, using AP mode');
      setIsAPMode(true);
      setStep('wifi-setup'); // Collect WiFi credentials FIRST (while on home WiFi)
    } else {
      setIsAPMode(false);
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
    console.log('[OnboardingFlow] WiFi credentials scanned, navigating to location setup');
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
    console.log('[OnboardingFlow] Location set');
    setLocation(locationInfo);

    // If AP mode, go to AP connection screen
    // If BLE mode, go to validation
    if (isAPMode) {
      console.log('[OnboardingFlow] AP mode: navigating to AP connection screen');
      setStep('ap-mode'); // Reusing ap-mode step for connection instructions
    } else {
      console.log('[OnboardingFlow] BLE mode: navigating to validation');
      setStep('validation');
    }
  };

  const handleValidationSuccess = (config: PotatoConfig) => {
    console.log('[OnboardingFlow] Validation successful, navigating to dashboard');
    setPotatoConfig(config);
    // Navigate to dashboard instead of showing success screen
    navigate('/dashboard');
  };

  const handleValidationError = (error: string) => {
    console.error('Validation error:', error);
    // For now, go back to WiFi setup
    // In production, show error modal with retry options
    alert(`Setup failed: ${error}. Please try again.`);
    setStep('wifi-setup');
  };


  return (
    <div className="onboarding-flow">
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

      {step === 'ap-mode' && wifiCredentials && location && (
        <APConnectionScreen
          wifiCredentials={wifiCredentials}
          location={location}
          onBack={() => setStep('location-setup')}
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
};
