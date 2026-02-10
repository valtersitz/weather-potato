import { useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ConfettiAnimation } from '../animations/ConfettiAnimation';
import { getWeather } from '../../services/localConnectionService';
import { getWeatherEmoji } from '../../utils/helpers';
import type { PotatoConfig, WeatherData } from '../../types';

interface SuccessScreenProps {
  config: PotatoConfig;
}

export const SuccessScreen = ({ config }: SuccessScreenProps) => {
  const { t } = useI18n();
  const [showConfetti, setShowConfetti] = useState(true);
  const [testing, setTesting] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string>('');

  // Auto-hide confetti after 3 seconds
  useState(() => {
    setTimeout(() => setShowConfetti(false), 3000);
  });

  const handleTestWeather = async () => {
    setTesting(true);
    setError('');

    try {
      const data = await getWeather(config.endpoint);

      setWeather({
        temperature: data.temperature,
        condition: data.condition,
        emoji: getWeatherEmoji(data.condition)
      });
    } catch (err) {
      console.error('Weather test error:', err);
      setError('Unable to fetch weather. Make sure the Potato is powered on!');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-success/30 via-accent/30 to-secondary/30">
      {showConfetti && <ConfettiAnimation />}

      <Card className="max-w-lg w-full text-center">
        <div className="mb-8">
          <div className="text-8xl mb-4 animate-bounce-slow">
            🥔
          </div>
          <div className="flex justify-center gap-2 mb-6">
            <span className="text-4xl animate-bounce" style={{ animationDelay: '0s' }}>✨</span>
            <span className="text-4xl animate-bounce" style={{ animationDelay: '0.1s' }}>✨</span>
            <span className="text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
          </div>

          <h1 className="text-5xl font-bold mb-4 gradient-text">
            {t('success.title')} 🎉
          </h1>

          <p className="text-xl text-gray-600 font-fun">
            {t('success.subtitle')}
          </p>
        </div>

        {weather && (
          <div className="mb-6 p-6 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-2xl">
            <div className="text-6xl mb-2">{weather.emoji}</div>
            <p className="text-3xl font-bold text-primary">
              {Math.round(weather.temperature)}°C
            </p>
            <p className="text-gray-600 capitalize">{weather.condition}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-error/20 rounded-xl">
            <p className="text-sm text-error">⚠️ {error}</p>
          </div>
        )}

        <div className="space-y-4">
          <Button
            size="big"
            onClick={handleTestWeather}
            loading={testing}
            className="w-full"
          >
            {t('success.test')} 🌤️
          </Button>

          <Button
            variant="secondary"
            onClick={() => window.location.href = '/dashboard'}
            className="w-full"
          >
            {t('success.dashboard')} 📊
          </Button>
        </div>

        <div className="mt-8 p-4 bg-accent/20 rounded-xl">
          <h3 className="font-semibold text-gray-700 mb-2">
            💡 {t('success.tip')}
          </h3>
          <p className="text-sm text-gray-600">
            {t('success.tipText')}
          </p>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>Device ID: {config.device_id}</p>
          <p className="mt-1">{config.endpoint}</p>
        </div>
      </Card>
    </div>
  );
};
