import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { connectionService } from '../services/connectionService';

const CONDITIONS = [
  { id: 'clear_sky',      label: 'Clear Sky',      emoji: '☀️'  },
  { id: 'light_clouds',   label: 'Light Clouds',   emoji: '🌤️'  },
  { id: 'partly_cloudy',  label: 'Partly Cloudy',  emoji: '⛅'  },
  { id: 'cloudy',         label: 'Cloudy',          emoji: '☁️'  },
  { id: 'light_fog',      label: 'Light Fog',       emoji: '🌫️'  },
  { id: 'dense_fog',      label: 'Dense Fog',       emoji: '🌁'  },
  { id: 'drizzle',        label: 'Drizzle',         emoji: '🌦️'  },
  { id: 'freezing_rain',  label: 'Freezing Rain',   emoji: '🧊'  },
  { id: 'rain',           label: 'Rain',            emoji: '🌧️'  },
  { id: 'rain_shower',    label: 'Rain Shower',     emoji: '🚿'  },
  { id: 'snow',           label: 'Snow',            emoji: '❄️'  },
  { id: 'snow_shower',    label: 'Snow Shower',     emoji: '🌨️'  },
  { id: 'thunderstorm',   label: 'Thunderstorm',    emoji: '⛈️'  },
] as const;

type ConditionId = typeof CONDITIONS[number]['id'];

// Colour swatch matching the ESP32 getTemperatureColor gradient
function tempToColor(t: number): string {
  const clamp = Math.max(-10, Math.min(40, t));
  const lerp = (a: number, b: number, f: number) => Math.round(a + (b - a) * f);
  let r: number, g: number, b: number;
  if (clamp <= 0) {
    const f = (clamp + 10) / 10;
    r = 0; g = lerp(0, 200, f); b = 255;
  } else if (clamp <= 10) {
    const f = clamp / 10;
    r = 0; g = lerp(200, 255, f); b = lerp(255, 80, f);
  } else if (clamp <= 20) {
    const f = (clamp - 10) / 10;
    r = lerp(0, 200, f); g = 255; b = lerp(80, 0, f);
  } else if (clamp <= 30) {
    const f = (clamp - 20) / 10;
    r = lerp(200, 255, f); g = lerp(255, 120, f); b = 0;
  } else {
    const f = (clamp - 30) / 10;
    r = 255; g = lerp(120, 0, f); b = 0;
  }
  return `rgb(${r},${g},${b})`;
}

export const TestPage = () => {
  const navigate = useNavigate();
  const [condition, setCondition] = useState<ConditionId>('clear_sky');
  const [temperature, setTemperature] = useState(20);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [error, setError] = useState('');

  const play = async () => {
    setLoading(true);
    setStatus('idle');
    setError('');
    try {
      await connectionService.request('POST', '/test', { condition, temperature });
      setStatus('ok');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach device');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const swatchColor = tempToColor(temperature);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-accent/30 to-secondary-light p-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold gradient-text">🔬 Test Mode</h1>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>← Back</Button>
        </div>

        {/* Condition picker */}
        <Card className="mb-4">
          <h2 className="font-semibold text-gray-700 mb-3">Weather Condition</h2>
          <div className="grid grid-cols-3 gap-2">
            {CONDITIONS.map(c => (
              <button
                key={c.id}
                onClick={() => setCondition(c.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-xs font-medium
                  ${condition === c.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
              >
                <span className="text-2xl">{c.emoji}</span>
                <span className="leading-tight text-center">{c.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Temperature slider */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">Temperature</h2>
            <span
              className="text-2xl font-bold px-3 py-1 rounded-full text-white transition-colors"
              style={{ backgroundColor: swatchColor }}
            >
              {temperature}°C
            </span>
          </div>
          <input
            type="range"
            min={-10}
            max={40}
            value={temperature}
            onChange={e => setTemperature(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>-10°C 🧊</span>
            <span>40°C 🔥</span>
          </div>
        </Card>

        {/* Play button */}
        <Button
          size="big"
          onClick={play}
          loading={loading}
          disabled={loading}
          className="w-full"
        >
          ▶ Play on Potato
        </Button>

        {/* Feedback */}
        {status === 'ok' && (
          <div className="mt-4 p-3 bg-green-50 rounded-xl text-green-700 text-sm text-center">
            ✅ Playing on your Potato!
          </div>
        )}
        {status === 'error' && (
          <div className="mt-4 p-3 bg-error/10 rounded-xl text-error text-sm text-center">
            {error}
          </div>
        )}

      </div>
    </div>
  );
};
