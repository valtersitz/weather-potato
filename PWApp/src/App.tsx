import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { WeatherDashboard } from './pages/WeatherDashboard';
import { MapPage } from './pages/MapPage';
import { loadPotatoConfig } from './services/localConnectionService';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Onboarding flow */}
        <Route path="/" element={<OnboardingFlow />} />

        {/* Main app pages */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <WeatherDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <MapPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * Protected route that requires device setup to be complete
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const config = loadPotatoConfig();

  if (!config || !config.setup_complete) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default App;
