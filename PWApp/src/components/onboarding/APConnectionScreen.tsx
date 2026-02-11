import { useState } from 'react';
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
  const [isConnected, setIsConnected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(AP_PASSWORD);
      setPasswordCopied(true);
      console.log('[AP] Password copied to clipboard');

      setTimeout(() => setPasswordCopied(false), 2000);
    } catch (err) {
      console.error('[AP] Failed to copy password:', err);
      alert(`Password: ${AP_PASSWORD}\n\nPlease copy it manually.`);
    }
  };

  const handleOpenWiFiSettings = () => {
    try {
      window.location.href = 'App-Prefs:root=WIFI';
    } catch (err) {
      console.log('[AP] Deep link not supported, user must open settings manually');
    }
  };

  const handleSubmitConfig = async () => {
    setSubmitting(true);
    setError('');

    try {
      console.log('[AP] Fetching device info...');

      // First, get device ID
      const infoResponse = await fetch(`http://${AP_IP}:${AP_PORT}/device-info`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      let deviceId = 'UNKNOWN';
      if (infoResponse.ok) {
        const info = await infoResponse.json();
        deviceId = info.device_id;
        console.log('[AP] Device ID:', deviceId);
      }

      // Now send WiFi + location config
      console.log('[AP] Sending configuration to Weather Potato...');

      const configData = {
        ssid: wifiCredentials.ssid,
        password: wifiCredentials.password,
        latitude: location.latitude,
        longitude: location.longitude
      };

      const response = await fetch(`http://${AP_IP}:${AP_PORT}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[AP] Configuration sent successfully:', result);

      // Success!
      onComplete(deviceId);
    } catch (err) {
      console.error('[AP] Error submitting configuration:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to configure device. Make sure you are connected to the Weather Potato AP.'
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-light via-secondary-light to-accent">
      <Card className="max-w-lg w-full">
        {!isConnected ? (
          // Step 1: Connection Instructions
          <div>
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

            {/* AP Connection Card */}
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

            <Button
              size="big"
              onClick={() => setIsConnected(true)}
              className="w-full mb-3"
            >
              I'm Connected to Weather Potato →
            </Button>

            <Button
              variant="secondary"
              onClick={onBack}
              className="w-full"
            >
              ← Back to Location
            </Button>
          </div>
        ) : (
          // Step 2: Submit Configuration
          <div>
            <div className="text-6xl mb-4 text-center">📤</div>
            <h1 className="text-3xl font-bold mb-4 gradient-text text-center">
              Send Configuration
            </h1>
            <p className="text-gray-600 mb-6 text-center">
              Click the button below to send your WiFi and location settings to the Weather Potato
            </p>

            {error && (
              <div className="mb-4 p-3 bg-error/20 rounded-xl">
                <p className="text-sm text-error">⚠️ {error}</p>
              </div>
            )}

            <div className="mb-6 p-4 bg-accent/10 rounded-xl">
              <h3 className="font-semibold text-gray-700 mb-2">Sending:</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>📶 WiFi SSID: {wifiCredentials.ssid}</p>
                <p>📍 Latitude: {location.latitude}</p>
                <p>📍 Longitude: {location.longitude}</p>
              </div>
            </div>

            <Button
              size="big"
              onClick={handleSubmitConfig}
              className="w-full mb-3"
              loading={submitting}
              disabled={submitting}
            >
              {submitting ? 'Sending Configuration...' : 'Send to Weather Potato ✨'}
            </Button>

            <Button
              variant="secondary"
              onClick={() => setIsConnected(false)}
              className="w-full"
              disabled={submitting}
            >
              ← Back
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
