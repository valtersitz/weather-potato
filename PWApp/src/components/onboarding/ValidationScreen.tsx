import { useState, useEffect } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { Modal } from '../ui/Modal';
import {
  sendWiFiCredentials,
  sendGPSCoordinates,
  waitForWiFiConnection,
  disableBLE,
  disconnectBLE
} from '../../services/bluetoothService';
import { validateLocalConnection, savePotatoConfig } from '../../services/localConnectionService';
import type { BLEConnection, WiFiCredentials, LocationInfo, PotatoConfig } from '../../types';
import { MDNS_HOSTNAME, DEFAULT_PORT } from '../../utils/constants';

interface ValidationScreenProps {
  bleConnection: BLEConnection | null;
  wifiCredentials: WiFiCredentials;
  location: LocationInfo;
  deviceId: string;
  onSuccess: (config: PotatoConfig) => void;
  onError: (error: string) => void;
}

export const ValidationScreen = ({
  bleConnection,
  wifiCredentials,
  location,
  deviceId,
  onSuccess,
  onError
}: ValidationScreenProps) => {
  const { t } = useI18n();
  const [step, setStep] = useState<'sending' | 'connecting' | 'validating' | 'finalizing'>('sending');
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    performValidation();
  }, []);

  const performValidation = async () => {
    try {
      if (bleConnection) {
        // Step 1: Send WiFi credentials
        setStep('sending');
        setProgress(20);
        await sendWiFiCredentials(
          bleConnection.characteristics.wifiConfigChar,
          wifiCredentials
        );

        // Step 2: Send GPS coordinates
        setProgress(40);
        await sendGPSCoordinates(
          bleConnection.characteristics.gpsConfigChar,
          location
        );

        // Step 3: Wait for WiFi connection
        setStep('connecting');
        setProgress(60);
        const esp32Status = await waitForWiFiConnection(
          bleConnection.characteristics.statusChar
        );

        if (esp32Status.status !== 'wifi_connected') {
          throw new Error('WiFi connection failed');
        }

        // Step 4: Validate local connection
        setStep('validating');
        setProgress(80);
        const validation = await validateLocalConnection(
          esp32Status.hostname || MDNS_HOSTNAME,
          esp32Status.local_ip || '',
          esp32Status.port || DEFAULT_PORT,
          deviceId
        );

        if (!validation.success) {
          throw new Error('Local connection validation failed');
        }

        // Step 5: Disable BLE
        setStep('finalizing');
        setProgress(90);
        await disableBLE(bleConnection.characteristics.statusChar);
        await disconnectBLE(bleConnection.device);

        // Step 6: Save configuration
        setProgress(100);
        const config: PotatoConfig = {
          device_id: deviceId,
          endpoint: validation.endpoint!,
          hostname: esp32Status.hostname || MDNS_HOSTNAME,
          ip: esp32Status.local_ip,
          port: esp32Status.port || DEFAULT_PORT,
          last_seen: Date.now(),
          setup_complete: true
        };

        savePotatoConfig(config);
        onSuccess(config);
      } else {
        // No BLE connection - skip to success with placeholder config
        // This would be used if user skipped BLE and only did manual configuration
        const config: PotatoConfig = {
          device_id: deviceId,
          endpoint: `http://${MDNS_HOSTNAME}:${DEFAULT_PORT}`,
          hostname: MDNS_HOSTNAME,
          port: DEFAULT_PORT,
          last_seen: Date.now(),
          setup_complete: true
        };

        savePotatoConfig(config);
        onSuccess(config);
      }
    } catch (error) {
      console.error('Validation error:', error);
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const getStepMessage = () => {
    switch (step) {
      case 'sending':
        return t('validation.sending');
      case 'connecting':
        return t('validation.connecting');
      case 'validating':
        return t('validation.validating');
      case 'finalizing':
        return t('validation.finalizing');
      default:
        return t('common.loading');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-light to-secondary-light">
      <Card className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce-slow">⚙️</div>
          <h2 className="text-3xl font-bold mb-3 gradient-text">
            Setting up...
          </h2>
        </div>

        <Loader message={getStepMessage()} />

        {/* Progress bar */}
        <div className="mt-8">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">{progress}%</p>
        </div>

        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => setShowTroubleshooting(true)}
          >
            Having issues? 🆘
          </Button>
        </div>

        <Modal
          isOpen={showTroubleshooting}
          onClose={() => setShowTroubleshooting(false)}
          title="Troubleshooting"
        >
          <div className="space-y-3">
            {t('validation.troubleshooting').map((item: string, index: number) => (
              <div key={index} className="flex items-start gap-3">
                <span className="text-xl">✅</span>
                <p className="text-gray-700 text-sm">{item}</p>
              </div>
            ))}
          </div>
        </Modal>
      </Card>
    </div>
  );
};
