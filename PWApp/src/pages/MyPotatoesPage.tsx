import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import {
  loadAllPotatoConfigs,
  loadPotatoConfig,
  savePotatoConfig,
  removePotatoConfig,
  setActivePotatoId,
  checkDeviceOnline,
} from '../services/localConnectionService';
import { connectionService } from '../services/connectionService';
import { RELAY_URL } from '../utils/constants';
import type { PotatoConfig } from '../types';

export const MyPotatoesPage = () => {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<PotatoConfig[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean | null>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Add by device-id form
  const [showAddById, setShowAddById] = useState(false);
  const [addIdInput, setAddIdInput] = useState('');

  useEffect(() => {
    const all = loadAllPotatoConfigs();
    const active = loadPotatoConfig();
    setConfigs(all);
    setActiveId(active?.device_id ?? null);

    // Check online status for all potatoes in the background
    all.forEach(c => {
      setOnlineStatus(prev => ({ ...prev, [c.device_id]: null })); // null = checking
      checkDeviceOnline(c.device_id).then(online => {
        setOnlineStatus(prev => ({ ...prev, [c.device_id]: online }));
      });
    });
  }, []);

  const handleSelect = (config: PotatoConfig) => {
    setActivePotatoId(config.device_id);
    connectionService.init(config);
    navigate('/dashboard');
  };

  const handleDelete = (deviceId: string) => {
    if (confirmDelete !== deviceId) {
      setConfirmDelete(deviceId);
      return;
    }
    removePotatoConfig(deviceId);
    const remaining = loadAllPotatoConfigs();
    setConfigs(remaining);
    const active = loadPotatoConfig();
    setActiveId(active?.device_id ?? null);
    setConfirmDelete(null);
    if (remaining.length === 0) navigate('/');
  };

  const handleAddById = () => {
    const id = addIdInput.trim().toUpperCase();
    if (id.length < 6) return;
    const relayUrl = RELAY_URL;
    const config: PotatoConfig = {
      device_id: id,
      endpoint: relayUrl,
      hostname: 'weatherpotato.local',
      last_seen: Date.now(),
      setup_complete: true,
      relay_url: relayUrl,
    };
    savePotatoConfig(config);
    connectionService.init(config);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-accent/30 to-secondary-light">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white/70 backdrop-blur-sm shadow-sm">
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>
          ← Back
        </Button>
        <h1 className="text-xl font-bold gradient-text">🥔 My Potatoes</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
        {configs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-5xl mb-3">🥔</div>
            <p>No potatoes configured yet.</p>
          </div>
        )}

        {configs.map(config => {
          const isActive = config.device_id === activeId;
          const online = onlineStatus[config.device_id];
          const pendingDelete = confirmDelete === config.device_id;

          return (
            <div
              key={config.device_id}
              className={`relative bg-white/80 rounded-2xl shadow-sm border-2 transition-colors ${
                isActive ? 'border-primary' : 'border-transparent'
              }`}
            >
              {/* Clickable main area */}
              <button
                className="w-full text-left p-4 pr-20"
                onClick={() => handleSelect(config)}
              >
                <div className="flex items-center gap-3">
                  {/* Online dot */}
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      online === null
                        ? 'bg-gray-300 animate-pulse'
                        : online
                        ? 'bg-green-400'
                        : 'bg-gray-300'
                    }`}
                  />
                  <div>
                    <p className="font-bold text-gray-800">
                      {config.name ?? config.device_id}
                    </p>
                    {config.name && (
                      <p className="text-xs text-gray-400 font-mono">{config.device_id}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">
                      {online === null ? 'Checking...' : online ? 'Online' : 'Offline'}
                    </p>
                  </div>
                  {isActive && (
                    <span className="ml-auto text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
              </button>

              {/* Delete button */}
              <button
                className={`absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  pendingDelete
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                onClick={e => { e.stopPropagation(); handleDelete(config.device_id); }}
              >
                {pendingDelete ? 'Sure?' : '🗑️'}
              </button>
            </div>
          );
        })}

        {/* Divider */}
        <div className="pt-4 border-t border-white/50">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">
            Add a Potato
          </p>

          <Button
            className="w-full mb-2"
            onClick={() => navigate('/')}
          >
            🚀 Set up a new Potato
          </Button>

          {!showAddById ? (
            <button
              onClick={() => setShowAddById(true)}
              className="w-full text-xs text-gray-400 hover:text-gray-600 underline py-2"
            >
              Already have one? Add by Device ID
            </button>
          ) : (
            <div className="bg-white/80 rounded-2xl p-4">
              <p className="text-xs text-gray-500 mb-2">
                Enter the 8-character Device ID (shown in serial monitor at boot, e.g.{' '}
                <span className="font-mono">30AEA406</span>)
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={addIdInput}
                  onChange={e => setAddIdInput(e.target.value.toUpperCase())}
                  maxLength={8}
                  placeholder="30AEA406"
                  className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-xl font-mono text-sm focus:border-primary focus:outline-none"
                />
                <Button
                  onClick={handleAddById}
                  disabled={addIdInput.trim().length < 6}
                >
                  Add →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
