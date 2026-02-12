import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { WiFiCredentials, LocationInfo } from '../../types';

interface APConnectionScreenProps {
  wifiCredentials: WiFiCredentials;
  location: LocationInfo;
  onComplete: (deviceId: string) => void;
  onBack: () => void;
}

const AP_SSID = 'myWeatherPotato';
const AP_PASSWORD = 'P0tat000';
const AP_IP = '192.168.4.1';
const AP_PORT = 8080;

export const APConnectionScreen = ({
  wifiCredentials,
  location,
  onComplete,
  onBack
}: APConnectionScreenProps) => {
  const [passwordCopied, setPasswordCopied] = useState(false);

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(AP_PASSWORD);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 3000);
    } catch (err) {
      console.log('[AP] Clipboard not supported, user must type password');
    }
  };

  const handleOpenWiFiSettings = () => {
    try {
      window.location.href = 'App-Prefs:root=WIFI';
    } catch (err) {
      console.log('[AP] Deep link not supported, user must open settings manually');
    }
  };

  const handleOpenSetupPage = () => {
    // Store config data in localStorage for ESP32 page to read
    const configData = {
      ssid: wifiCredentials.ssid,
      password: wifiCredentials.password,
      latitude: location.latitude,
      longitude: location.longitude,
      city: location.city || ''
    };

    localStorage.setItem('weatherPotato_pendingConfig', JSON.stringify(configData));

    // Build URL with parameters
    const params = new URLSearchParams({
      ssid: wifiCredentials.ssid,
      password: wifiCredentials.password,
      lat: location.latitude.toString(),
      lon: location.longitude.toString()
    });

    // Redirect to ESP32's setup page
    window.location.href = `http://${AP_IP}:${AP_PORT}/setup?${params.toString()}`;
  };

  // Auto-redirect after component mounts (give user a moment to read)
  useEffect(() => {
    const timer = setTimeout(() => {
      handleOpenSetupPage();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-light via-secondary-light to-accent">
      <Card className="max-w-lg w-full">
        <div className="text-6xl mb-4 text-center">🥔📡</div>
        <h1 className="text-3xl font-bold mb-4 gradient-text text-center">
          Almost There!
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          Now connect to your Weather Potato to complete setup
        </p>

        {/* Summary of collected data */}
        <div className="mb-6 p-4 bg-success/10 rounded-xl">
          <h3 className="font-semibold text-success mb-2">✅ Ready to send:</h3>
          <div className="space-y-1 text-sm text-gray-700">
            <p>📶 WiFi: <span className="font-mono">{wifiCredentials.ssid}</span></p>
            <p>📍 Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>
            {location.city && <p>🌆 City: {location.city}</p>}
          </div>
        </div>

        {/* AP Connection Instructions */}
        <div className="p-4 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-xl border-2 border-primary/30 mb-6">
          <p className="text-sm text-gray-600 mb-2">Connect to this WiFi network:</p>
          <div className="bg-white p-3 rounded-lg border border-gray-300 mb-3">
            <p className="font-mono text-xl font-bold text-center text-primary">
              {AP_SSID}
            </p>
          </div>

          <Button
            onClick={handleCopyPassword}
            className="w-full mb-2"
            variant={passwordCopied ? 'secondary' : 'primary'}
          >
            {passwordCopied ? '✅ Password Copied!' : '📋 Copy Password'}
          </Button>

          <Button
            onClick={handleOpenWiFiSettings}
            className="w-full"
            variant="secondary"
          >
            📶 Open WiFi Settings
          </Button>

          <p className="text-xs text-gray-500 mt-2 text-center">
            Password: <span className="font-mono">{AP_PASSWORD}</span>
          </p>
        </div>

        {/* Auto-redirect message */}
        <div className="mb-4 p-3 bg-primary/10 rounded-xl text-center">
          <p className="text-sm text-gray-700">
            🚀 After connecting to <strong>{AP_SSID}</strong>,<br/>
            you'll be automatically redirected to the setup page in 2 seconds!
          </p>
        </div>

        {/* Manual redirect button */}
        <Button
          onClick={handleOpenSetupPage}
          className="w-full mb-3"
        >
          🌐 Open Setup Page Now
        </Button>

        <Button
          variant="secondary"
          onClick={onBack}
          className="w-full"
        >
          ← Back to Location
        </Button>
      </Card>
    </div>
  );
};
