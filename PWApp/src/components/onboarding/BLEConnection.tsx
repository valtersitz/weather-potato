import { useState, useEffect } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { connectBLE, isBluetoothSupported } from '../../services/bluetoothService';
import type { BLEConnection } from '../../types';

interface BLEConnectionProps {
  deviceId: string;
  onConnected: (connection: BLEConnection) => void;
  onSkip: () => void;
}

export const BLEConnectionComponent = ({ deviceId, onConnected, onSkip }: BLEConnectionProps) => {
  const { t } = useI18n();
  const [status, setStatus] = useState<'idle' | 'connecting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!isBluetoothSupported()) {
      setStatus('error');
      setErrorMessage(t('ble.notSupported'));
    }
  }, [t]);

  const handleConnect = async () => {
    setStatus('connecting');
    setErrorMessage('');

    try {
      const connection = await connectBLE(deviceId);
      setStatus('idle');
      onConnected(connection);
    } catch (error) {
      setStatus('error');

      if (error instanceof Error) {
        if (error.message === 'wrong_device' || error.message === 'device_mismatch') {
          setErrorMessage(t('ble.wrongDeviceDesc'));
        } else {
          setErrorMessage(t('ble.failed'));
        }
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-secondary-light to-accent">
      <Card className="max-w-lg w-full">
        {status === 'connecting' ? (
          <Loader
            message={t('ble.connecting')}
            subMessage={t('ble.verifying')}
          />
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📡</div>
              <h2 className="text-3xl font-bold mb-3 gradient-text">
                Bluetooth Connection
              </h2>
              <p className="text-gray-600">
                Connect to your Weather Potato via Bluetooth
              </p>
            </div>

            {status === 'error' && (
              <div className="mb-6 p-4 bg-error/20 rounded-xl">
                <p className="text-sm text-error font-semibold">
                  ⚠️ {errorMessage}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <Button
                size="big"
                onClick={handleConnect}
                disabled={!isBluetoothSupported()}
                className="w-full"
              >
                Connect via Bluetooth 🔗
              </Button>

              <Button
                variant="ghost"
                onClick={onSkip}
                className="w-full"
              >
                {t('wifi.manual')} →
              </Button>
            </div>

            {!isBluetoothSupported() && (
              <div className="mt-6 p-4 bg-warning/20 rounded-xl text-center">
                <p className="text-sm text-gray-700">
                  {t('ble.notSupportedDesc')}
                </p>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};
