import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';
import { WeatherPotato } from '../components/weather/WeatherPotato';
import { loadPotatoConfig } from '../services/localConnectionService';
import type { PotatoConfig } from '../types';

interface WeatherResponse {
  device_id: string;
  condition: string;
  temperature: number;
  symbol: number;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: number;
}

export const WeatherDashboard = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<PotatoConfig | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showDebug, setShowDebug] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    // Load potato config
    const savedConfig = loadPotatoConfig();
    if (!savedConfig || !savedConfig.setup_complete) {
      // Not configured yet, redirect to onboarding
      navigate('/');
      return;
    }
    setConfig(savedConfig);
  }, [navigate]);

  useEffect(() => {
    if (!config) return;

    // Initial fetch
    fetchWeather();

    // Auto-refresh every 30 seconds if enabled
    if (autoRefresh) {
      const interval = setInterval(fetchWeather, 30000);
      return () => clearInterval(interval);
    }
  }, [config, autoRefresh]);

  const fetchWeather = async () => {
    if (!config) return;

    try {
      setLoading(true);
      setError('');

      console.log('[Dashboard] Fetching weather from:', `${config.endpoint}/weather`);

      const response = await fetch(`${config.endpoint}/weather`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: WeatherResponse = await response.json();
      console.log('[Dashboard] Weather data:', data);

      setWeather(data);
    } catch (err) {
      console.error('[Dashboard] Error fetching weather:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToMap = () => {
    navigate('/map');
  };

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-accent/30 to-secondary-light p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold gradient-text">
            🥔 Weather Potato
          </h1>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="small"
              onClick={handleNavigateToMap}
            >
              🗺️ Map
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={fetchWeather}
              disabled={loading}
            >
              🔄 Refresh
            </Button>
          </div>
        </div>

        {/* Main Weather Card */}
        <Card className="mb-6">
          {loading && !weather ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader />
              <p className="mt-4 text-gray-600">Fetching weather data...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-error mb-2">
                Connection Error
              </h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={fetchWeather}>
                Try Again
              </Button>
            </div>
          ) : weather ? (
            <div>
              {/* Cute Potato Character */}
              <WeatherPotato
                condition={weather.condition}
                temperature={weather.temperature}
              />

              {/* Temperature Display */}
              <div className="text-center mt-6">
                <div className="text-7xl font-bold gradient-text mb-2">
                  {Math.round(weather.temperature)}°C
                </div>
                <div className="text-2xl text-gray-600 capitalize mb-4">
                  {weather.condition.replace(/_/g, ' ')}
                </div>
                <div className="text-sm text-gray-500">
                  📍 {weather.location.latitude.toFixed(4)}, {weather.location.longitude.toFixed(4)}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Last updated: {new Date(weather.timestamp).toLocaleTimeString()}
                </div>
              </div>

              {/* Auto-refresh toggle */}
              <div className="flex items-center justify-center gap-3 mt-6 p-4 bg-gray-50 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-600">
                    Auto-refresh every 30s
                  </span>
                </label>
              </div>
            </div>
          ) : null}
        </Card>

        {/* Debug Panel */}
        {weather && (
          <Card className="bg-gray-900 text-green-400 font-mono text-sm">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="w-full flex items-center justify-between p-2 hover:bg-gray-800 rounded"
            >
              <span className="font-bold">📊 RAW DATA</span>
              <span>{showDebug ? '▼' : '▶'}</span>
            </button>

            {showDebug && (
              <pre className="mt-4 overflow-x-auto p-4 bg-black rounded">
                {JSON.stringify(weather, null, 2)}
              </pre>
            )}
          </Card>
        )}

        {/* Device Info */}
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>Device: {config.device_id}</p>
          <p>Endpoint: {config.endpoint}</p>
        </div>
      </div>
    </div>
  );
};
