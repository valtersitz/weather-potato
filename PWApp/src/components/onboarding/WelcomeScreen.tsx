import { useI18n } from '../../hooks/useI18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PotatoAnimation } from '../animations/PotatoAnimation';
import { checkBrowserSupport } from '../../utils/helpers';

interface WelcomeScreenProps {
  onStart: () => void;
  deviceId: string;
}

export const WelcomeScreen = ({ onStart, deviceId }: WelcomeScreenProps) => {
  const { t } = useI18n();
  const capabilities = checkBrowserSupport();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-light via-secondary-light to-accent">
      <Card className="max-w-lg w-full text-center">
        <PotatoAnimation />

        <h1 className="text-4xl font-bold mb-4 gradient-text">
          {t('welcome.title')}
        </h1>

        <p className="text-xl text-gray-600 mb-8 font-fun">
          {t('welcome.subtitle')} 🌤️
        </p>

        {deviceId && (
          <div className="mb-6 p-4 bg-secondary/10 rounded-xl">
            <p className="text-sm text-gray-600 mb-1">Device ID</p>
            <p className="text-lg font-bold text-secondary">{deviceId}</p>
          </div>
        )}

        <Button
          size="big"
          onClick={onStart}
          className="w-full"
        >
          {t('welcome.cta')} 🚀
        </Button>

        {!capabilities.bluetooth && (
          <div className="mt-6 p-4 bg-warning/20 rounded-xl">
            <p className="text-sm text-gray-700">
              ⚠️ {t('ble.notSupportedDesc')}
            </p>
          </div>
        )}

        <div className="mt-8 text-xs text-gray-500">
          <p>Weather Potato v1.0.0</p>
        </div>
      </Card>
    </div>
  );
};
