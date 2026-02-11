import { useState, useEffect } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { Input } from '../ui/Input';
import { getLocationInfo } from '../../services/geolocationService';
import type { LocationInfo } from '../../types';

interface LocationSetupProps {
  onLocationSet: (location: LocationInfo) => void;
  onBack?: () => void;
}

export const LocationSetup = ({ onLocationSet, onBack }: LocationSetupProps) => {
  const { t } = useI18n();
  const [status, setStatus] = useState<'idle' | 'detecting' | 'manual' | 'error'>('idle');
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [manualCity, setManualCity] = useState('');

  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = async () => {
    setStatus('detecting');

    try {
      const info = await getLocationInfo();
      setLocationInfo(info);
      setStatus('idle');
    } catch (error) {
      console.error('Geolocation error:', error);
      setStatus('error');
    }
  };

  const handleContinue = () => {
    if (locationInfo) {
      onLocationSet(locationInfo);
    }
  };

  const handleManualSubmit = () => {
    // For manual entry, we'll use a default location (user's city name for display only)
    // The actual weather will be based on the device's location or manual coordinates
    const defaultLocation: LocationInfo = {
      latitude: 48.8566, // Paris default
      longitude: 2.3522,
      city: manualCity || 'Your location'
    };
    onLocationSet(defaultLocation);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-secondary-light to-primary-light">
      <Card className="max-w-lg w-full">
        {onBack && status !== 'detecting' && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            ← Back
          </Button>
        )}

        {status === 'detecting' ? (
          <Loader
            message={t('location.detecting')}
          />
        ) : status === 'manual' ? (
          <>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🌍</div>
              <h2 className="text-3xl font-bold mb-3 gradient-text">
                {t('location.manual')}
              </h2>
            </div>

            <div className="space-y-6">
              <Input
                label="City"
                type="text"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                placeholder={t('location.cityPlaceholder')}
              />

              <Button
                size="big"
                onClick={handleManualSubmit}
                disabled={!manualCity}
                className="w-full"
              >
                {t('common.continue')} 🚀
              </Button>

              <Button
                variant="ghost"
                onClick={detectLocation}
                className="w-full"
              >
                Try auto-detect again
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📍</div>
              <h2 className="text-3xl font-bold mb-3 gradient-text">
                Location
              </h2>
              <p className="text-gray-600">
                We need your location to get accurate weather forecasts
              </p>
            </div>

            {status === 'error' ? (
              <div className="mb-6 p-4 bg-warning/20 rounded-xl">
                <p className="text-sm text-gray-700 font-semibold">
                  ⚠️ {t('location.deniedDesc')}
                </p>
              </div>
            ) : locationInfo && (
              <div className="mb-6 p-4 bg-success/20 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">{t('location.detected')}</p>
                <p className="text-lg font-bold text-success">
                  {locationInfo.city} 📍
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {locationInfo.latitude.toFixed(4)}, {locationInfo.longitude.toFixed(4)}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {locationInfo ? (
                <Button
                  size="big"
                  onClick={handleContinue}
                  className="w-full"
                >
                  {t('common.continue')} 🚀
                </Button>
              ) : (
                <>
                  <Button
                    size="big"
                    onClick={detectLocation}
                    className="w-full"
                  >
                    Retry Location Detection 🔄
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => setStatus('manual')}
                    className="w-full"
                  >
                    {t('location.manual')} ✍️
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
