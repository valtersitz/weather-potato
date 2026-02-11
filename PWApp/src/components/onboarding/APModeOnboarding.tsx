import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { WiFiCredentials, LocationInfo } from '../../types';

interface APModeOnboardingProps {
  onComplete: (deviceId: string, wifiCredentials: WiFiCredentials, location: LocationInfo) => void;
  onBack: () => void;
}

type APStep = 'instructions' | 'wifi-entry' | 'location-entry' | 'submitting';

const AP_SSID = 'myWeatherPotato';
const AP_PASSWORD = 'P0tat000';
const AP_IP = '192.168.4.1';
const AP_PORT = 8080;

export const APModeOnboarding = ({ onComplete, onBack }: APModeOnboardingProps) => {
  const [step, setStep] = useState<APStep>('instructions');
  const [deviceId, setDeviceId] = useState<string>('');
  const [wifiSSID, setWifiSSID] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [latitude, setLatitude] = useState('48.9075');
  const [longitude, setLongitude] = useState('2.3833');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  // Try to fetch device info when on WiFi entry step
  useEffect(() => {
    if (step === 'wifi-entry') {
      fetchDeviceInfo();
    }
  }, [step]);

  const fetchDeviceInfo = async () => {
    try {
      console.log('[AP] Fetching device info from:', `http://${AP_IP}:${AP_PORT}/device-info`);

      const response = await fetch(`http://${AP_IP}:${AP_PORT}/device-info`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[AP] Device info:', data);
        setDeviceId(data.device_id);
      }
    } catch (err) {
      console.warn('[AP] Could not fetch device info (user might not be connected to AP yet):', err);
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(AP_PASSWORD);
      setPasswordCopied(true);
      console.log('[AP] Password copied to clipboard');

      // Reset the "copied" indicator after 2 seconds
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch (err) {
      console.error('[AP] Failed to copy password:', err);
      alert(`Password: ${AP_PASSWORD}\n\nPlease copy it manually.`);
    }
  };

  const handleOpenWiFiSettings = () => {
    // Try iOS deep link to WiFi settings
    // Note: This may not work on newer iOS versions due to Apple restrictions
    try {
      window.location.href = 'App-Prefs:root=WIFI';
    } catch (err) {
      console.log('[AP] Deep link not supported, user must open settings manually');
    }
  };

  const handleConnectInstructions = () => {
    setStep('wifi-entry');
  };

  const handleWifiSubmit = () => {
    if (!wifiSSID || !wifiPassword) {
      setError('Please enter both WiFi SSID and password');
      return;
    }
    setError('');
    setStep('location-entry');
  };

  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
        },
        (error) => {
          console.error('[AP] Geolocation error:', error);
          setError('Could not get your location. Please enter manually.');
        }
      );
    }
  };

  const handleSubmit = async () => {
    if (!latitude || !longitude) {
      setError('Please enter GPS coordinates');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Send WiFi and location config to ESP32
      console.log('[AP] Sending configuration to Weather Potato...');

      const configData = {
        ssid: wifiSSID,
        password: wifiPassword,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
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

      // Configuration sent successfully
      onComplete(
        deviceId || 'UNKNOWN',
        { ssid: wifiSSID, password: wifiPassword },
        {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          city: city || undefined
        }
      );
    } catch (err) {
      console.error('[AP] Error sending configuration:', err);
      setError(err instanceof Error ? err.message : 'Failed to configure device');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-light via-secondary-light to-accent">
      <Card className="max-w-lg w-full">
        {/* Instructions Step */}
        {step === 'instructions' && (
          <div>
            <div className="text-6xl mb-4 text-center">🥔📡</div>
            <h1 className="text-3xl font-bold mb-4 gradient-text text-center">
              Connect to Weather Potato
            </h1>
            <p className="text-gray-600 mb-6 text-center">
              Follow these steps to set up your Weather Potato via WiFi Access Point
            </p>

            <div className="space-y-4 mb-6">
              {/* SSID Display */}
              <div className="p-4 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-xl border-2 border-primary/30">
                <p className="text-sm text-gray-600 mb-2">Connect to this WiFi network:</p>
                <div className="bg-white p-3 rounded-lg border border-gray-300 mb-3">
                  <p className="font-mono text-xl font-bold text-center text-primary">
                    {AP_SSID}
                  </p>
                </div>

                {/* Copy Password Button */}
                <Button
                  onClick={handleCopyPassword}
                  className="w-full mb-2"
                  variant={passwordCopied ? 'secondary' : 'primary'}
                >
                  {passwordCopied ? '✅ Password Copied!' : '📋 Copy Password'}
                </Button>

                {/* Open WiFi Settings Button */}
                <Button
                  onClick={handleOpenWiFiSettings}
                  className="w-full"
                  variant="secondary"
                >
                  📶 Open WiFi Settings & Paste Password
                </Button>

                <p className="text-xs text-gray-500 mt-2 text-center">
                  Password: <span className="font-mono">{AP_PASSWORD}</span>
                </p>
              </div>

              {/* Step-by-step instructions */}
              <div className="flex gap-3 p-4 bg-accent/10 rounded-xl">
                <div className="text-2xl">1️⃣</div>
                <div>
                  <h3 className="font-semibold text-gray-700">Copy Password</h3>
                  <p className="text-sm text-gray-600">
                    Tap "Copy Password" above to copy it to your clipboard
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-4 bg-accent/10 rounded-xl">
                <div className="text-2xl">2️⃣</div>
                <div>
                  <h3 className="font-semibold text-gray-700">Open WiFi Settings</h3>
                  <p className="text-sm text-gray-600">
                    Tap "Open WiFi Settings" above (or open settings manually)
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-4 bg-accent/10 rounded-xl">
                <div className="text-2xl">3️⃣</div>
                <div>
                  <h3 className="font-semibold text-gray-700">Connect & Return</h3>
                  <p className="text-sm text-gray-600">
                    Select "{AP_SSID}", paste the password, connect, then return here
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                size="big"
                onClick={handleConnectInstructions}
                className="w-full"
              >
                I'm Connected ✅
              </Button>

              <Button
                variant="secondary"
                onClick={onBack}
                className="w-full"
              >
                ← Back
              </Button>
            </div>

            <div className="mt-6 p-4 bg-warning/20 rounded-xl">
              <p className="text-sm text-gray-700">
                <strong>Note:</strong> You'll temporarily lose internet connection while connected to the Weather Potato AP. This is normal!
              </p>
            </div>
          </div>
        )}

        {/* WiFi Entry Step */}
        {step === 'wifi-entry' && (
          <div>
            <div className="text-6xl mb-4 text-center">📶</div>
            <h1 className="text-3xl font-bold mb-4 gradient-text text-center">
              Enter Your WiFi
            </h1>
            <p className="text-gray-600 mb-6 text-center">
              Enter your home WiFi credentials so Weather Potato can connect
            </p>

            {deviceId && (
              <div className="mb-4 p-3 bg-success/10 rounded-xl">
                <p className="text-sm text-success">
                  ✅ Connected to Weather Potato {deviceId}
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-error/20 rounded-xl">
                <p className="text-sm text-error">⚠️ {error}</p>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <Input
                label="WiFi Network Name (SSID)"
                type="text"
                value={wifiSSID}
                onChange={(e) => setWifiSSID(e.target.value)}
                placeholder="MyHomeWiFi"
                required
              />

              <Input
                label="WiFi Password"
                type="password"
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="space-y-3">
              <Button
                size="big"
                onClick={handleWifiSubmit}
                className="w-full"
                disabled={!wifiSSID || !wifiPassword}
              >
                Next: Set Location →
              </Button>

              <Button
                variant="secondary"
                onClick={() => setStep('instructions')}
                className="w-full"
              >
                ← Back to Instructions
              </Button>
            </div>
          </div>
        )}

        {/* Location Entry Step */}
        {step === 'location-entry' && (
          <div>
            <div className="text-6xl mb-4 text-center">📍</div>
            <h1 className="text-3xl font-bold mb-4 gradient-text text-center">
              Set Location
            </h1>
            <p className="text-gray-600 mb-6 text-center">
              Enter GPS coordinates for weather forecasts
            </p>

            {error && (
              <div className="mb-4 p-3 bg-error/20 rounded-xl">
                <p className="text-sm text-error">⚠️ {error}</p>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <Input
                label="Latitude"
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="48.9075"
                required
              />

              <Input
                label="Longitude"
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="2.3833"
                required
              />

              <Input
                label="City Name (Optional)"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Paris"
              />

              <Button
                variant="secondary"
                onClick={handleUseCurrentLocation}
                className="w-full"
              >
                📱 Use My Current Location
              </Button>
            </div>

            <div className="space-y-3">
              <Button
                size="big"
                onClick={handleSubmit}
                className="w-full"
                loading={loading}
                disabled={loading || !latitude || !longitude}
              >
                {loading ? 'Configuring...' : 'Complete Setup ✨'}
              </Button>

              <Button
                variant="secondary"
                onClick={() => setStep('wifi-entry')}
                className="w-full"
                disabled={loading}
              >
                ← Back to WiFi
              </Button>
            </div>

            <div className="mt-6 p-4 bg-accent/20 rounded-xl">
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> You can update this location anytime from the Map page!
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
