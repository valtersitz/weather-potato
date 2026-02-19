import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '../components/ui/Button';
import { loadPotatoConfig } from '../services/localConnectionService';
import { connectionService } from '../services/connectionService';
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

    // Initialize connection service
    connectionService.init(savedConfig);

    // Try to get current coordinates from device
    fetchCurrentLocation();
  }, [navigate]);

  const fetchCurrentLocation = async () => {
    if (!config) return;

    try {
      const data = await connectionService.request('GET', '/weather');
      if (data.location) {
        const coords = {
          latitude: data.location.latitude,
          longitude: data.location.longitude
        };
        setCoordinates(coords);
        setTempCoordinates(coords);
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
      console.log('[Map] Sending coordinates via relay:', tempCoordinates);

      const result = await connectionService.request('POST', '/location', {
        latitude: tempCoordinates.latitude,
        longitude: tempCoordinates.longitude
      });

      console.log('[Map] Location updated:', result);

      setCoordinates(tempCoordinates);
      setSuccess(true);

      // Navigate back to dashboard after 1 second so user touches the potato
      setTimeout(() => navigate('/dashboard'), 1000);
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-light via-accent/30 to-secondary-light">
      {/* Compact header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white/70 backdrop-blur-sm shadow-sm flex-none">
        <Button
          variant="secondary"
          onClick={() => navigate('/dashboard')}
        >
          ← Back
        </Button>
        <h1 className="text-lg font-bold gradient-text">📍 Location</h1>
        <div className="ml-auto">
          <Button
            onClick={handleUpdateLocation}
            disabled={!hasChanges || loading}
            loading={loading}
          >
            {loading ? 'Updating...' : '🌤️ Update'}
          </Button>
        </div>
      </div>

      {/* Compact city search */}
      <div className="px-3 pt-2 pb-1 flex-none relative z-50">
        <input
          type="text"
          value={citySearch}
          onChange={(e) => setCitySearch(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          className="w-full px-3 py-1.5 border-2 border-gray-300 rounded-xl focus:border-primary focus:outline-none text-sm bg-white/90"
          placeholder="🔍 Search city..."
        />

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 left-3 right-3 mt-0.5 bg-white border-2 border-gray-300 rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                onClick={() => handleSelectCity(result)}
                className="w-full px-3 py-2 text-left hover:bg-primary/10 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="font-medium text-gray-800 text-sm">
                  {result.display_name.split(',')[0]}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {result.display_name}
                </div>
              </button>
            ))}
          </div>
        )}

        {isSearching && (
          <div className="absolute right-6 top-3 text-primary text-sm animate-spin">⌛</div>
        )}
      </div>

      {/* Map — fills remaining vertical space */}
      <div className="flex-1 mx-3 mb-2 rounded-xl overflow-hidden shadow-lg z-10 min-h-52">
        <MapContainer
          center={[tempCoordinates.latitude, tempCoordinates.longitude]}
          zoom={13}
          className="h-full w-full"
          style={{ minHeight: '208px' }}
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

      {/* Bottom bar: coordinates + actions */}
      <div className="flex-none px-3 pb-3 space-y-2">
        <div className="p-2 bg-white/80 rounded-xl text-center">
          <p className="text-xs text-gray-600">
            📍 <span className="font-mono font-semibold">
              {tempCoordinates.latitude.toFixed(4)}, {tempCoordinates.longitude.toFixed(4)}
            </span>
            <span className="text-gray-400"> — tap map to change</span>
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={handleUseMyLocation}
          className="w-full"
        >
          📱 Use My Current Location
        </Button>

        {success && (
          <div className="p-3 bg-success/20 rounded-xl">
            <p className="text-success text-sm font-semibold">
              ✅ Location updated! Touch your Potato to refresh.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-error/20 rounded-xl">
            <p className="text-error text-sm">⚠️ {error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
