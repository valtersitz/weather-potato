import { useState, useEffect } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PotatoAnimation } from '../animations/PotatoAnimation';
import { checkBrowserSupport } from '../../utils/helpers';

interface WelcomeScreenProps {
  onStart: () => void;
  deviceId: string;
  isDiscovering?: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const WelcomeScreen = ({ onStart, deviceId, isDiscovering = false }: WelcomeScreenProps) => {
  const { t } = useI18n();
  const capabilities = checkBrowserSupport();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

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

        {isDiscovering && (
          <div className="mb-6 p-4 bg-primary/10 rounded-xl">
            <p className="text-sm text-gray-700">
              🔍 Scanning network for Weather Potato devices...
            </p>
          </div>
        )}

        {deviceId && (
          <div className="mb-6 p-4 bg-secondary/10 rounded-xl">
            <p className="text-sm text-gray-600 mb-1">Device ID</p>
            <p className="text-lg font-bold text-secondary">{deviceId}</p>
          </div>
        )}

        <div className="space-y-4">
          <Button
            size="big"
            onClick={onStart}
            className="w-full"
          >
            {t('welcome.cta')} 🚀
          </Button>

          {!isInstalled && deferredPrompt && (
            <Button
              variant="secondary"
              onClick={handleInstall}
              className="w-full"
            >
              📲 Install App on Home Screen
            </Button>
          )}
        </div>

        {!capabilities.bluetooth && (
          <div className="mt-6 p-4 bg-warning/20 rounded-xl">
            <p className="text-sm text-gray-700">
              ⚠️ {t('ble.notSupportedDesc')}
            </p>
          </div>
        )}

        {isInstalled && (
          <div className="mt-6 p-4 bg-success/20 rounded-xl">
            <p className="text-sm text-gray-700">
              ✅ App is installed on your home screen!
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
