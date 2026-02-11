import { useState, useEffect } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { Modal } from '../ui/Modal';
import {
  sendWiFiCredentials,
  sendGPSCoordinates,
  disconnectBLE
} from '../../services/bluetoothService';
import { pollDeviceHTTP, validateLocalConnection, savePotatoConfig } from '../../services/localConnectionService';
import type { BLEConnection, WiFiCredentials, LocationInfo, PotatoConfig } from '../../types';
import { MDNS_HOSTNAME, DEFAULT_PORT } from '../../utils/constants';

interface ValidationScreenProps {
  bleConnection: BLEConnection | null;
  wifiCredentials: WiFiCredentials;
  location: LocationInfo;
  deviceId: string;
  onSuccess: (config: PotatoConfig) => void;
  onError: (error: string) => void;
  onBack?: () => void;
}

export const ValidationScreen = ({
  bleConnection,
  wifiCredentials,
  location,
  deviceId,
  onSuccess,
  onError,
  onBack
}: ValidationScreenProps) => {
  const { t } = useI18n();
  const [step, setStep] = useState<'sending' | 'connecting' | 'validating' | 'finalizing'>('sending');
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    performValidation();
  }, []);

  const performValidation = async () => {
    console.log('[Validation] Starting validation...');
    console.log('[Validation] BLE connection:', bleConnection ? 'CONNECTED' : 'NULL - NO CONNECTION!');
    console.log('[Validation] Device ID:', deviceId);

    try {
      if (bleConnection) {
        console.log('[Validation] Using BLE to send credentials...');
        // Step 1: Send WiFi credentials
        setStep('sending');
        setProgress(20);
        console.log('[Validation] Sending WiFi credentials:', { ssid: wifiCredentials.ssid });
        await sendWiFiCredentials(
          bleConnection.characteristics.wifiConfigChar,
          wifiCredentials
        );

        // Step 2: Send GPS coordinates
        setProgress(40);
        console.log('[Validation] Sending GPS coordinates:', location);
        await sendGPSCoordinates(
          bleConnection.characteristics.gpsConfigChar,
          location
        );

        // Step 3: Poll device via HTTP (more reliable than BLE notification)
        // Keep BLE active as backup during polling
        setStep('connecting');
        setProgress(60);
        console.log('[Validation] Starting HTTP polling (BLE still active)...');

        const deviceInfo = await pollDeviceHTTP(
          MDNS_HOSTNAME,
          DEFAULT_PORT,
          deviceId,
          60000, // 60 second timeout
          2000   // Poll every 2 seconds
        );

        console.log('[Validation] Device connected via HTTP:', deviceInfo);

        // Step 4: Validate local connection
        setStep('validating');
        setProgress(80);
        console.log('[Validation] Validating local connection...');
        const validation = await validateLocalConnection(
          deviceInfo.hostname,
          deviceInfo.ip,
          deviceInfo.port,
          deviceId
        );

        if (!validation.success) {
          throw new Error('Local connection validation failed');
        }

        console.log('[Validation] Validation successful:', validation);

        // Step 5: Disconnect BLE (no longer needed)
        setStep('finalizing');
        setProgress(90);
        console.log('[Validation] Disconnecting BLE...');
        await disconnectBLE(bleConnection.device);

        // Step 6: Save configuration
        setProgress(100);
        const config: PotatoConfig = {
          device_id: deviceId,
          endpoint: validation.endpoint!,
          hostname: deviceInfo.hostname,
          ip: deviceInfo.ip,
          port: deviceInfo.port,
          last_seen: Date.now(),
          setup_complete: true
        };

        savePotatoConfig(config);
        onSuccess(config);
      } else {
        // No BLE connection - THIS IS A PROBLEM!
        console.error('[Validation] ⚠️ NO BLE CONNECTION! Cannot send credentials to device.');
        console.error('[Validation] This means credentials were never sent to Weather Potato.');
        console.error('[Validation] Device will not connect to WiFi.');

        // Show error instead of fake success
        throw new Error('BLE connection required to send credentials to device. Please go back and connect via Bluetooth first.');
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
        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            ← Back (Cancel)
          </Button>
        )}

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
