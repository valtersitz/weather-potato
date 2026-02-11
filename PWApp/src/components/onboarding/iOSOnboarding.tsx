import { useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { WiFiCredentials, LocationInfo } from '../../types';

interface iOSOnboardingProps {
  deviceId: string;
  wifiCredentials: WiFiCredentials;
  location: LocationInfo;
  onSuccess: () => void;
  onBack?: () => void;
}

export const iOSOnboarding = ({
  deviceId,
  wifiCredentials,
  location,
  onSuccess,
  onBack
}: iOSOnboardingProps) => {
  const { t } = useI18n();
  const [step, setStep] = useState<'instructions' | 'connecting' | 'configuring'>('instructions');
  const apName = `Potato-${deviceId}`;

  const handleConnectToAP = () => {
    setStep('connecting');
    // Open WiFi settings
    // Note: Can't programmatically connect on iOS, must show instructions
  };

  const handleConfigured = () => {
    setStep('configuring');
    setTimeout(() => {
      onSuccess();
    }, 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-light to-secondary-light">
      <Card className="max-w-lg w-full">
        {onBack && step === 'instructions' && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            ← Back
          </Button>
        )}

        {step === 'instructions' && (
          <>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📡</div>
              <h2 className="text-3xl font-bold mb-3 gradient-text">
                iOS Setup
              </h2>
              <p className="text-gray-600">
                Connect to your Weather Potato's WiFi network
              </p>
            </div>

            <div className="bg-gray-100 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-lg mb-4">📱 Step-by-Step:</h3>

              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    1
                  </span>
                  <div>
                    <p className="font-semibold">Open WiFi Settings</p>
                    <p className="text-sm text-gray-600">Go to Settings → WiFi on your iPhone</p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    2
                  </span>
                  <div>
                    <p className="font-semibold">Connect to Weather Potato</p>
                    <div className="mt-2 bg-white rounded-lg p-3 border-2 border-primary">
                      <p className="text-sm text-gray-500">Network name:</p>
                      <p className="font-mono font-bold text-primary">{apName}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Password: P0tat000</p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    3
                  </span>
                  <div>
                    <p className="font-semibold">Setup page will open automatically</p>
                    <p className="text-sm text-gray-600">Follow the on-screen instructions</p>
                  </div>
                </li>
              </ol>
            </div>

            <Button
              size="big"
              onClick={handleConnectToAP}
              className="w-full"
            >
              I've Connected ✅
            </Button>

            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> The setup page should open automatically when you connect. If not, open your browser and go to{' '}
                <span className="font-mono bg-white px-2 py-1 rounded">192.168.4.1</span>
              </p>
            </div>
          </>
        )}

        {step === 'connecting' && (
          <>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4 animate-bounce-slow">⏳</div>
              <h2 className="text-3xl font-bold mb-3 gradient-text">
                Waiting for configuration...
              </h2>
              <p className="text-gray-600">
                Complete the setup on the captive portal page
              </p>
            </div>

            <div className="bg-gray-100 rounded-xl p-6 mb-6">
              <p className="text-center text-gray-700">
                Once you've entered your WiFi credentials on the setup page, click below:
              </p>
            </div>

            <Button
              size="big"
              onClick={handleConfigured}
              className="w-full"
            >
              Setup Complete! 🎉
            </Button>
          </>
        )}

        {step === 'configuring' && (
          <>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4 animate-spin-slow">⚙️</div>
              <h2 className="text-3xl font-bold mb-3 gradient-text">
                Finalizing setup...
              </h2>
              <p className="text-gray-600">
                Weather Potato is connecting to your WiFi
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
