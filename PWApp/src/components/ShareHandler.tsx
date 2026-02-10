import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleSharedData, storeSharedWiFi } from '../services/wifiShareService';
import { Loader } from './ui/Loader';

/**
 * Component to handle incoming share data from Web Share Target API
 */
export const ShareHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const processSharedData = async () => {
      // Check if this is a share target request
      const title = searchParams.get('title');
      const text = searchParams.get('text');

      if (title || text) {
        // Create FormData from URL params
        const formData = new FormData();
        if (title) formData.append('title', title);
        if (text) formData.append('text', text);

        const credentials = handleSharedData(formData);

        if (credentials) {
          // Store credentials and redirect to main app
          storeSharedWiFi(credentials);
          console.log('WiFi credentials received via share:', credentials.ssid);

          // Redirect to main app
          navigate('/', { replace: true });
        } else {
          console.error('Failed to parse shared WiFi data');
          navigate('/', { replace: true });
        }
      } else {
        // No share data, redirect to home
        navigate('/', { replace: true });
      }
    };

    processSharedData();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light to-secondary-light">
      <Loader message="Processing shared WiFi..." />
    </div>
  );
};
