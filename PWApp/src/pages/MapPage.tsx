import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { loadPotatoConfig } from '../services/localConnectionService';
import type { PotatoConfig, Coordinates } from '../types';

export const MapPage = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<PotatoConfig | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates>({
    latitude: 48.9075,
    longitude: 2.3833
  });
  const [tempCoordinates, setTempCoordinates] = useState<Coordinates>(coordinates);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedConfig = loadPotatoConfig();
    if (!savedConfig || !savedConfig.setup_complete) {
      navigate('/');
      return;
    }
    setConfig(savedConfig);

    // Try to get current coordinates from device
    fetchCurrentLocation();
  }, [navigate]);

  const fetchCurrentLocation = async () => {
    if (!config) return;

    try {
      const response = await fetch(`${config.endpoint}/weather`);
      if (response.ok) {
        const data = await response.json();
        if (data.location) {
          const coords = {
            latitude: data.location.latitude,
            longitude: data.location.longitude
          };
          setCoordinates(coords);
          setTempCoordinates(coords);
        }
      }
    } catch (err) {
      console.warn('[Map] Could not fetch current location:', err);
    }
  };

  const handleUpdateLocation = async () => {
    if (!config) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      console.log('[Map] Sending coordinates to device:', tempCoordinates);

      const response = await fetch(`${config.endpoint}/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: tempCoordinates.latitude,
          longitude: tempCoordinates.longitude
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[Map] Location updated:', result);

      setCoordinates(tempCoordinates);
      setSuccess(true);

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('[Map] Error updating location:', err);
      setError(err instanceof Error ? err.message : 'Failed to update location');
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setTempCoordinates(coords);
        },
        (error) => {
          console.error('[Map] Geolocation error:', error);
          setError('Could not get your location. Please check permissions.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
    }
  };

  const hasChanges = tempCoordinates.latitude !== coordinates.latitude ||
                     tempCoordinates.longitude !== coordinates.longitude;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-accent/30 to-secondary-light p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate('/dashboard')}
            >
              ← Back
            </Button>
            <h1 className="text-3xl font-bold gradient-text">
              🗺️ Location Setup
            </h1>
          </div>
        </div>

        {/* Map Card */}
        <Card className="mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-700">
            Set Weather Location
          </h2>

          {/* Interactive Map (Google Maps Embed) */}
          <div className="relative w-full h-96 mb-6 rounded-xl overflow-hidden shadow-lg">
            <iframe
              src={`https://www.google.com/maps/embed/v1/view?key=&center=${tempCoordinates.latitude},${tempCoordinates.longitude}&zoom=12`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Location Map"
              className="w-full h-full"
            />

            {/* Fallback: OpenStreetMap */}
            <div className="absolute inset-0 bg-gray-100 -z-10 flex items-center justify-center">
              <a
                href={`https://www.openstreetmap.org/#map=12/${tempCoordinates.latitude}/${tempCoordinates.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View on OpenStreetMap →
              </a>
            </div>
          </div>

          {/* Coordinate Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📍 Latitude
              </label>
              <input
                type="number"
                step="0.000001"
                value={tempCoordinates.latitude}
                onChange={(e) => setTempCoordinates({
                  ...tempCoordinates,
                  latitude: parseFloat(e.target.value) || 0
                })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-primary focus:outline-none text-lg"
                placeholder="48.9075"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📍 Longitude
              </label>
              <input
                type="number"
                step="0.000001"
                value={tempCoordinates.longitude}
                onChange={(e) => setTempCoordinates({
                  ...tempCoordinates,
                  longitude: parseFloat(e.target.value) || 0
                })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-primary focus:outline-none text-lg"
                placeholder="2.3833"
              />
            </div>
          </div>

          {/* Use My Location Button */}
          <Button
            variant="secondary"
            onClick={handleUseMyLocation}
            className="w-full mb-4"
          >
            📱 Use My Current Location
          </Button>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-success/20 rounded-xl">
              <p className="text-success font-semibold">
                ✅ Location updated! Weather Potato will fetch weather for this location.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-error/20 rounded-xl">
              <p className="text-error">⚠️ {error}</p>
            </div>
          )}

          {/* Update Button */}
          <Button
            size="big"
            onClick={handleUpdateLocation}
            disabled={!hasChanges || loading}
            loading={loading}
            className="w-full"
          >
            {loading ? 'Updating Location...' : 'Get Weather from this Location'}
          </Button>

          {!hasChanges && (
            <p className="text-center text-sm text-gray-500 mt-2">
              Adjust coordinates above to enable update
            </p>
          )}
        </Card>

        {/* Current Location Display */}
        <Card className="bg-accent/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-700 mb-1">
                Current Weather Location
              </h3>
              <p className="text-sm text-gray-600">
                📍 {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
              </p>
            </div>
            <div className="text-4xl">🥔</div>
          </div>
        </Card>

        {/* Info Card */}
        <div className="mt-4 p-4 bg-white/50 rounded-xl">
          <h3 className="font-semibold text-gray-700 mb-2">💡 How it works</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Adjust the coordinates above or use your current location</li>
            <li>• Click "Get Weather from this Location" to update</li>
            <li>• Weather Potato will fetch weather data for the new coordinates</li>
            <li>• Return to dashboard to see updated weather</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
