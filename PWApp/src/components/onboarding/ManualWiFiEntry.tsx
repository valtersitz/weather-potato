import { useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { isValidSSID, isValidPassword } from '../../utils/helpers';
import type { WiFiCredentials } from '../../types';

interface ManualWiFiEntryProps {
  onSubmit: (credentials: WiFiCredentials) => void;
  onBack: () => void;
}

export const ManualWiFiEntry = ({ onSubmit, onBack }: ManualWiFiEntryProps) => {
  const { t } = useI18n();
  const [ssid, setSSID] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ ssid?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { ssid?: string; password?: string } = {};

    if (!isValidSSID(ssid)) {
      newErrors.ssid = 'SSID must be 1-32 characters';
    }

    if (!isValidPassword(password)) {
      newErrors.password = 'Password must be 8-63 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit({ ssid, password, type: 'WPA2' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-accent to-primary-light">
      <Card className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">✍️</div>
          <h2 className="text-3xl font-bold mb-3 gradient-text">
            {t('wifi.manualTitle')}
          </h2>
          <p className="text-gray-600 font-fun">
            {t('wifi.manualSubtitle')}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <Input
              label={t('wifi.ssidLabel')}
              type="text"
              value={ssid}
              onChange={(e) => setSSID(e.target.value)}
              placeholder={t('wifi.ssidPlaceholder')}
            />
            {errors.ssid && (
              <p className="text-sm text-error mt-1">{errors.ssid}</p>
            )}
          </div>

          <div>
            <Input
              label={t('wifi.passwordLabel')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('wifi.passwordPlaceholder')}
            />
            {errors.password && (
              <p className="text-sm text-error mt-1">{errors.password}</p>
            )}

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="mt-2 text-sm text-secondary hover:text-secondary-dark transition-colors"
            >
              {showPassword ? '🙈 Hide' : '👁️ Show'} password
            </button>
          </div>

          <Button
            size="big"
            onClick={handleSubmit}
            disabled={!ssid || !password}
            className="w-full"
          >
            {t('wifi.continue')} 🚀
          </Button>

          <Button
            variant="ghost"
            onClick={onBack}
            className="w-full"
          >
            ← {t('wifi.backToScan')}
          </Button>
        </div>
      </Card>
    </div>
  );
};
