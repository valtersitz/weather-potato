import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useI18n } from '../../hooks/useI18n';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { parseWiFiQR } from '../../utils/helpers';
import { requestCameraPermission } from '../../utils/platform';
import type { WiFiCredentials } from '../../types';

interface WiFiQRScannerProps {
  onScanned: (credentials: WiFiCredentials) => void;
  onManualEntry: () => void;
  onBack?: () => void;
}

export const WiFiQRScanner = ({ onScanned, onManualEntry, onBack }: WiFiQRScannerProps) => {
  const { t } = useI18n();
  const [scanning, setScanning] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    setScanning(true);
    setError('');

    try {
      // Request camera permission BEFORE initializing scanner
      console.log('Requesting camera permission...');
      const hasPermission = await requestCameraPermission();

      if (!hasPermission) {
        setError('Camera permission denied. Please enable camera in Settings > Privacy > Camera.');
        setScanning(false);
        return;
      }

      console.log('Camera permission granted, starting scanner...');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          const wifiData = parseWiFiQR(decodedText);

          if (wifiData) {
            scanner.stop().then(() => {
              setScanning(false);
              onScanned(wifiData);
            });
          }
        },
        () => {
          // Ignore scan errors (normal during scanning)
        }
      );

      // Auto-timeout after 60 seconds
      setTimeout(() => {
        if (scannerRef.current) {
          scannerRef.current.stop().then(() => {
            setScanning(false);
            setError(t('errors.timeout'));
          });
        }
      }, 60000);
    } catch (err: any) {
      console.error('Scanner error:', err);
      setScanning(false);

      // Provide more specific error messages
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is already in use by another app.');
      } else {
        setError('Failed to start camera: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        setScanning(false);
        scannerRef.current = null;
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-accent to-primary-light">
      <Card className="max-w-lg w-full">
        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            ← Back
          </Button>
        )}

        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📸</div>
          <h2 className="text-3xl font-bold mb-3 gradient-text">
            {t('wifi.scanTitle')}
          </h2>
          <p className="text-gray-600">
            {t('wifi.scanSubtitle')}
          </p>
        </div>

        {!scanning ? (
          <>
            {error && (
              <div className="mb-6 p-4 bg-error/20 rounded-xl">
                <p className="text-sm text-error font-semibold">⚠️ {error}</p>
              </div>
            )}

            <div className="space-y-4">
              <Button
                size="big"
                onClick={startScanning}
                className="w-full"
              >
                Start QR Scan 📷
              </Button>

              <Button
                variant="ghost"
                onClick={() => setShowHelp(true)}
                className="w-full"
              >
                {t('wifi.help')}
              </Button>

              <Button
                variant="secondary"
                onClick={onManualEntry}
                className="w-full"
              >
                {t('wifi.manual')} ✍️
              </Button>
            </div>

            <div className="mt-6 p-4 bg-gray-100 rounded-xl text-center">
              <p className="text-sm text-gray-600">
                {t('wifi.noQR')}
              </p>
            </div>
          </>
        ) : (
          <div>
            <div id="qr-reader" className="mb-6"></div>
            <Button
              variant="ghost"
              onClick={stopScanning}
              className="w-full"
            >
              Cancel Scan
            </Button>
          </div>
        )}
      </Card>

      <Modal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title={t('wifi.help')}
      >
        <div className="space-y-4">
          {t('wifi.helpItems').map((item: string, index: number) => (
            <div key={index} className="flex items-start gap-3">
              <span className="text-2xl">📦</span>
              <p className="text-gray-700">{item}</p>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};
