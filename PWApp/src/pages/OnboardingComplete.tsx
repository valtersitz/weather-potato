import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { savePotatoConfig } from '../services/localConnectionService';
import { Card } from '../components/ui/Card';

export const OnboardingComplete = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const deviceId = searchParams.get('deviceId');
    const ssid = searchParams.get('ssid');
    const ip = searchParams.get('ip');

    console.log('[OnboardingComplete] Device ID:', deviceId);
    console.log('[OnboardingComplete] SSID:', ssid);
    console.log('[OnboardingComplete] IP:', ip);

    if (deviceId) {
      // Save device configuration
      const endpoint = ip ? `http://${ip}:8080` : `http://weatherpotato.local:8080`;
      const hostname = ip || 'weatherpotato.local';

      const config = {
        device_id: deviceId,
        endpoint,
        hostname,
        last_seen: Date.now(),
        setup_complete: true,
        ip: ip || undefined,
        port: 8080
      };

      console.log('[OnboardingComplete] Saving config:', config);

      savePotatoConfig(config);

      // Small delay to ensure localStorage is saved
      setTimeout(() => {
        console.log('[OnboardingComplete] Redirecting to dashboard...');
        navigate('/dashboard', { replace: true });
      }, 500);
    } else {
      console.error('[OnboardingComplete] No device ID provided!');
      // Redirect to home if no device ID
      setTimeout(() => navigate('/', { replace: true }), 2000);
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-light via-accent/30 to-secondary-light">
      <Card className="max-w-md w-full text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold mb-4 gradient-text">
          Setup Complete!
        </h1>
        <p className="text-gray-600 mb-6">
          Your Weather Potato is now connected!
        </p>
        <div className="animate-pulse text-primary">
          Redirecting to dashboard...
        </div>
      </Card>
    </div>
  );
};
