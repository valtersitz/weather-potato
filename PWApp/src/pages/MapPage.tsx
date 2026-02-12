import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { loadPotatoConfig } from '../services/localConnectionService';
import type { PotatoConfig, Coordinates } from '../types';

// Fix for default marker icon in Leaflet with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface GeocodingResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// Component to handle map clicks
function LocationMarker({
  position,
  onPositionChange
}: {
  position: Coordinates;
  onPositionChange: (coords: Coordinates) => void;
}) {
  useMapEvents({
    click(e) {
      onPositionChange({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng
      });
    },
  });

  return <Marker position={[position.latitude, position.longitude]} />;
}

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

  // City search state
  const [citySearch, setCitySearch] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<number>();

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

  // City search with debounce
  useEffect(() => {
    if (citySearch.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(citySearch)}&limit=5`,
          {
            headers: {
              'Accept': 'application/json',
            }
          }
        );

        if (response.ok) {
          const results = await response.json();
          setSearchResults(results);
          setShowResults(true);
        }
      } catch (err) {
        console.error('[Map] Geocoding error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [citySearch]);

  const handleSelectCity = (result: GeocodingResult) => {
    const coords = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon)
    };
    setTempCoordinates(coords);
    setCitySearch(result.display_name.split(',')[0]); // Set to city name only
    setShowResults(false);
    setSearchResults([]);
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

          {/* City Search */}
          <div className="mb-4 relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔍 Search for a city
            </label>
            <input
              type="text"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-primary focus:outline-none text-lg"
              placeholder="Type a city name..."
            />

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    onClick={() => handleSelectCity(result)}
                    className="w-full px-4 py-3 text-left hover:bg-primary/10 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-gray-800">
                      {result.display_name.split(',')[0]}
                    </div>
                    <div className="text-sm text-gray-500">
                      {result.display_name}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {isSearching && (
              <div className="absolute right-3 top-11 text-primary">
                <div className="animate-spin">⌛</div>
              </div>
            )}
          </div>

          {/* Interactive Leaflet Map */}
          <div className="relative w-full h-96 mb-4 rounded-xl overflow-hidden shadow-lg z-10">
            <MapContainer
              center={[tempCoordinates.latitude, tempCoordinates.longitude]}
              zoom={13}
              className="h-full w-full"
              key={`${tempCoordinates.latitude}-${tempCoordinates.longitude}`}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker
                position={tempCoordinates}
                onPositionChange={setTempCoordinates}
              />
            </MapContainer>
          </div>

          {/* Coordinates Display */}
          <div className="mb-4 p-3 bg-gray-50 rounded-xl text-center">
            <p className="text-sm text-gray-600">
              📍 Selected: <span className="font-mono font-semibold">
                {tempCoordinates.latitude.toFixed(6)}, {tempCoordinates.longitude.toFixed(6)}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Click on the map to set a new location
            </p>
          </div>

          {/* Get Weather Button (directly below map) */}
          <Button
            onClick={handleUpdateLocation}
            disabled={!hasChanges || loading}
            loading={loading}
            className="w-full mb-4"
          >
            {loading ? 'Updating Location...' : '🌤️ Get Weather from There'}
          </Button>

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

          {!hasChanges && (
            <p className="text-center text-sm text-gray-500">
              Click on the map or search for a city to change location
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
            <li>• Search for a city by name or click anywhere on the map</li>
            <li>• Use your current GPS location if nearby</li>
            <li>• Click "Get Weather from There" to update the location</li>
            <li>• Weather Potato will fetch weather data for the new coordinates</li>
            <li>• Return to dashboard to see updated weather</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
