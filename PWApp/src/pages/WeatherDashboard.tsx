import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';
import { WeatherPotato } from '../components/weather/WeatherPotato';
import { loadPotatoConfig, clearPotatoConfig } from '../services/localConnectionService';
import { connectionService } from '../services/connectionService';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showDebug, setShowDebug] = useState(false);
  // Start in "waiting for touch" mode — user must touch the physical potato
  const [waitingForTouch, setWaitingForTouch] = useState(true);

  useEffect(() => {
    const savedConfig = loadPotatoConfig();
    if (!savedConfig || !savedConfig.setup_complete) {
      navigate('/');
      return;
    }
    setConfig(savedConfig);
    connectionService.init(savedConfig);
  }, [navigate]);

  // Listen for push events from the physical potato touch
  useEffect(() => {
    if (!config) return;

    const unsubscribe = connectionService.onPush((weatherData: WeatherResponse) => {
      console.log('[Dashboard] 🥔 Push received — updating weather:', weatherData);
      setWeather(weatherData);
      setWaitingForTouch(false);
      setLoading(false);
      setError('');
    });

    return unsubscribe;
  }, [config]);

  const fetchWeather = async () => {
    if (!config) return;

    try {
      setLoading(true);
      setError('');

      console.log('[Dashboard] Fetching weather via relay for device:', config.device_id);
      const data: WeatherResponse = await connectionService.request('GET', '/weather');
      console.log('[Dashboard] Weather data:', data);

      setWeather(data);
      setWaitingForTouch(false);
    } catch (err) {
      console.error('[Dashboard] Error fetching weather:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch weather');
    } finally {
      setLoading(false);
    }
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
              onClick={() => navigate('/map')}
            >
              🗺️ Map
            </Button>
            {!waitingForTouch && (
              <Button
                variant="secondary"
                onClick={fetchWeather}
                disabled={loading}
              >
                🔄 Refresh
              </Button>
            )}
          </div>
        </div>

        {/* Main Weather Card */}
        <Card className="mb-6">
          {waitingForTouch ? (
            /* Touch prompt */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div
                className="text-8xl mb-6 cursor-pointer select-none transition-transform active:scale-90 hover:scale-105"
                onClick={fetchWeather}
                title="Tap to fetch weather now"
              >
                🥔
              </div>
              <h2 className="text-2xl font-bold gradient-text mb-3">
                Touch your Potato!
              </h2>
              <p className="text-gray-500 text-sm mb-6 max-w-xs">
                Give your physical Weather Potato a tap to fetch the latest weather — or tap the potato above to pull it manually.
              </p>
              {loading && (
                <div className="flex flex-col items-center gap-3">
                  <Loader />
                  <p className="text-gray-500 text-sm">Fetching weather...</p>
                </div>
              )}
              {error && (
                <div className="mt-4 p-3 bg-error/10 rounded-xl text-error text-sm">
                  {error}
                </div>
              )}
            </div>
          ) : loading && !weather ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader />
              <p className="mt-4 text-gray-600">Fetching weather data...</p>
            </div>
          ) : error && !weather ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📡</div>
              <h2 className="text-2xl font-bold text-error mb-2">
                Device Unreachable
              </h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <Button onClick={fetchWeather}>
                  Try Again
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => { clearPotatoConfig(); navigate('/'); }}
                >
                  Reconfigure Device
                </Button>
              </div>
            </div>
          ) : weather ? (
            <div>
              <WeatherPotato
                condition={weather.condition}
                temperature={weather.temperature}
              />

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

              <p className="text-center text-xs text-gray-400 mt-6">
                Touch your Potato to refresh — or tap 🔄 above
              </p>
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

        {/* Test light & sound */}
        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={() => navigate('/test')}>
            🔬 Test light &amp; sound
          </Button>
        </div>

        {/* Device Info */}
        <div className="mt-2 text-center text-xs text-gray-500">
          <p>Device: {config.device_id}</p>
          <p>Endpoint: {config.endpoint}</p>
        </div>
      </div>
    </div>
  );
};
