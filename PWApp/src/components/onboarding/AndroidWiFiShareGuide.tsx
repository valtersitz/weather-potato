import { useI18n } from '../../hooks/useI18n';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { isShareTargetSupported } from '../../services/wifiShareService';

interface AndroidWiFiShareGuideProps {
  onContinue: () => void;
  onSkip: () => void;
}

export const AndroidWiFiShareGuide = ({ onContinue, onSkip }: AndroidWiFiShareGuideProps) => {
  const { t } = useI18n();
  const isInstalled = isShareTargetSupported();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-secondary-light to-accent">
      <Card className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📱</div>
          <h2 className="text-3xl font-bold mb-3 gradient-text">
            Easy WiFi Sharing (Android)
          </h2>
          <p className="text-gray-600">
            Share your WiFi directly from Android settings!
          </p>
        </div>

        {!isInstalled && (
          <div className="mb-6 p-4 bg-warning/20 rounded-xl">
            <p className="text-sm text-gray-700 font-semibold mb-2">
              ⚠️ PWA Not Installed
            </p>
            <p className="text-sm text-gray-600">
              To use WiFi sharing, please install the Weather Potato app first.
              Look for the "Add to Home Screen" or "Install" option in your browser menu.
            </p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-xl">
            <span className="text-2xl">1️⃣</span>
            <div>
              <p className="font-semibold text-gray-800">Open Android Settings</p>
              <p className="text-sm text-gray-600">Go to WiFi settings</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-xl">
            <span className="text-2xl">2️⃣</span>
            <div>
              <p className="font-semibold text-gray-800">Tap your connected WiFi</p>
              <p className="text-sm text-gray-600">Select the network you're currently using</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-xl">
            <span className="text-2xl">3️⃣</span>
            <div>
              <p className="font-semibold text-gray-800">Tap "Share" or QR icon</p>
              <p className="text-sm text-gray-600">Usually found in the network details</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-xl">
            <span className="text-2xl">4️⃣</span>
            <div>
              <p className="font-semibold text-gray-800">Select "Weather Potato"</p>
              <p className="text-sm text-gray-600">Choose the app from the share menu</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            size="big"
            onClick={onContinue}
            disabled={!isInstalled}
            className="w-full"
          >
            I've Shared My WiFi ✅
          </Button>

          <Button
            variant="secondary"
            onClick={onSkip}
            className="w-full"
          >
            Use QR Scan or Manual Entry Instead →
          </Button>
        </div>

        {isInstalled && (
          <div className="mt-6 p-4 bg-success/20 rounded-xl text-center">
            <p className="text-sm text-gray-700">
              ✅ PWA is installed! You can now receive WiFi shares.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
