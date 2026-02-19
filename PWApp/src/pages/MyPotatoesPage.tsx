import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
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

// ─── Inline QR scanner ────────────────────────────────────────────────────────

interface QRScannerProps {
  onResult: (text: string) => void;
  onClose: () => void;
}

function QRScanner({ onResult, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const doneRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const scanner = new Html5Qrcode('potato-qr-reader');
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => {
          if (doneRef.current) return;
          doneRef.current = true;
          scanner.stop().catch(() => {});
          onResult(text);
        },
        () => {}
      )
      .catch((err: unknown) => {
        setError('Could not start camera: ' + (err instanceof Error ? err.message : String(err)));
      });

    return () => {
      if (scannerRef.current && !doneRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-bold text-gray-800">Scan Potato QR Code</span>
          <button onClick={onClose} className="text-2xl text-gray-400 leading-none">✕</button>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500 mb-3 text-center">
            Point your camera at the QR code printed on the Potato
          </p>
          <div id="potato-qr-reader" className="rounded-xl overflow-hidden" />
          {error && (
            <p className="mt-3 text-xs text-red-500 text-center">{error}</p>
          )}
          <button
            onClick={onClose}
            className="mt-3 w-full text-sm text-gray-400 hover:text-gray-600 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Device ID parsing ────────────────────────────────────────────────────────

/** Accept either a raw device ID ("30AEA406") or a URL containing ?device=XXXX */
function parseDeviceIdFromQR(text: string): string | null {
  const trimmed = text.trim().toUpperCase();
  // Plain device ID: 6-8 hex chars
  if (/^[0-9A-F]{6,8}$/.test(trimmed)) return trimmed;
  // URL with ?device= param
  try {
    const url = new URL(text);
    const id = url.searchParams.get('device');
    if (id && /^[0-9A-F]{6,8}$/i.test(id)) return id.toUpperCase();
  } catch {
    // not a URL
  }
  return null;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export const MyPotatoesPage = () => {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<PotatoConfig[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean | null>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Inline name editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Add by device ID
  const [showAddById, setShowAddById] = useState(false);
  const [addIdInput, setAddIdInput] = useState('');

  // QR scanner
  const [showQR, setShowQR] = useState(false);
  const [qrError, setQrError] = useState('');

  useEffect(() => {
    const all = loadAllPotatoConfigs();
    const active = loadPotatoConfig();
    setConfigs(all);
    setActiveId(active?.device_id ?? null);

    all.forEach(c => {
      setOnlineStatus(prev => ({ ...prev, [c.device_id]: null }));
      checkDeviceOnline(c.device_id).then(online => {
        setOnlineStatus(prev => ({ ...prev, [c.device_id]: online }));
      });
    });
  }, []);

  const handleSelect = (config: PotatoConfig) => {
    if (editingId) return; // don't navigate while editing
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

  const startEdit = (config: PotatoConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(config.device_id);
    setEditingName(config.name ?? config.device_id);
    setConfirmDelete(null);
  };

  const saveEdit = (config: PotatoConfig) => {
    const trimmed = editingName.trim();
    const updated = { ...config, name: trimmed || config.device_id };
    savePotatoConfig(updated);
    setConfigs(loadAllPotatoConfigs());
    setEditingId(null);
  };

  const addById = (id: string) => {
    const clean = id.trim().toUpperCase();
    if (clean.length < 6) return;
    const config: PotatoConfig = {
      device_id: clean,
      endpoint: RELAY_URL,
      hostname: 'weatherpotato.local',
      last_seen: Date.now(),
      setup_complete: true,
      relay_url: RELAY_URL,
    };
    savePotatoConfig(config);
    connectionService.init(config);
    navigate('/dashboard');
  };

  const handleQRResult = (text: string) => {
    setShowQR(false);
    const id = parseDeviceIdFromQR(text);
    if (id) {
      addById(id);
    } else {
      setQrError(`Could not read a Device ID from the QR code. Got: "${text}"`);
      setShowAddById(true);
    }
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
          const isEditing = editingId === config.device_id;

          return (
            <div
              key={config.device_id}
              className={`relative bg-white/80 rounded-2xl shadow-sm border-2 transition-colors ${
                isActive ? 'border-primary' : 'border-transparent'
              }`}
            >
              {isEditing ? (
                /* ── Name edit mode ── */
                <div className="p-4 flex items-center gap-2">
                  <input
                    autoFocus
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit(config);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 px-3 py-1.5 border-2 border-primary rounded-xl text-sm focus:outline-none"
                    placeholder={config.device_id}
                  />
                  <button
                    onClick={() => saveEdit(config)}
                    className="px-3 py-1.5 bg-primary text-white rounded-xl text-sm font-semibold"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl text-sm"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                /* ── Normal mode ── */
                <button
                  className="w-full text-left p-4 pr-24"
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
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 truncate">
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
                      <span className="ml-auto flex-shrink-0 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                </button>
              )}

              {/* Action buttons (edit + delete) — hidden while editing */}
              {!isEditing && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                  <button
                    onClick={e => startEdit(config, e)}
                    className="px-2.5 py-1.5 rounded-xl text-xs bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                    title="Rename"
                  >
                    ✏️
                  </button>
                  <button
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      pendingDelete
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    onClick={e => { e.stopPropagation(); handleDelete(config.device_id); }}
                  >
                    {pendingDelete ? 'Sure?' : '🗑️'}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Add a Potato ── */}
        <div className="pt-4 border-t border-white/50">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">
            Add a Potato
          </p>

          <Button className="w-full mb-2" onClick={() => navigate('/?new=1')}>
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
            <div className="bg-white/80 rounded-2xl p-4 space-y-3">
              <p className="text-xs text-gray-500">
                Scan the QR code on your Potato, or enter the 8-character Device ID manually
                (shown in the serial monitor at boot, e.g.{' '}
                <span className="font-mono">30AEA406</span>).
              </p>

              {/* QR scan button */}
              <button
                onClick={() => { setQrError(''); setShowQR(true); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-semibold hover:bg-primary/20 transition-colors"
              >
                📷 Scan QR Code
              </button>

              {qrError && (
                <p className="text-xs text-red-500">{qrError}</p>
              )}

              {/* Manual input */}
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
                  onClick={() => addById(addIdInput)}
                  disabled={addIdInput.trim().length < 6}
                >
                  Add →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner overlay */}
      {showQR && (
        <QRScanner
          onResult={handleQRResult}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
};
