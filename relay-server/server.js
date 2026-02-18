import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3000;

// HTTP server for health checks (Railway needs this)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const httpServer = createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({
      status: 'ok',
      devices: devices.size,
      timestamp: Date.now()
    }));
  } else if (req.url.startsWith('/status/')) {
    // Check if a specific device is currently connected
    const deviceId = req.url.slice('/status/'.length);
    const deviceWs = devices.get(deviceId);
    const online = !!(deviceWs && deviceWs.readyState === 1);
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({ device_id: deviceId, online }));
  } else {
    res.writeHead(404, CORS_HEADERS);
    res.end('Not found');
  }
});

// WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server: httpServer });

// Registry: device_id → WebSocket connection
const devices = new Map();

wss.on('connection', (ws) => {
  console.log('[Relay] New connection established');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log(`[Relay] Received message type: ${msg.type}`);

      if (msg.type === 'register') {
        // ESP32 device registration
        const deviceId = msg.device_id;
        devices.set(deviceId, ws);
        ws.deviceId = deviceId;
        console.log(`[Relay] ✅ Device registered: ${deviceId}`);
        console.log(`[Relay] Total devices online: ${devices.size}`);

      } else if (msg.type === 'request') {
        // PWA request to device
        const deviceId = msg.device_id;
        const deviceWs = devices.get(deviceId);

        if (!deviceWs || deviceWs.readyState !== 1) {
          console.log(`[Relay] ❌ Device ${deviceId} offline or not found`);
          ws.send(JSON.stringify({
            id: msg.id,
            type: 'error',
            error: 'Device offline or not found'
          }));
          return;
        }

        console.log(`[Relay] 📨 Forwarding request ${msg.id} (${msg.method} ${msg.path}) to device ${deviceId}`);
        deviceWs.send(data.toString());

        // Store PWA socket for response routing
        deviceWs.pendingRequests = deviceWs.pendingRequests || new Map();
        deviceWs.pendingRequests.set(msg.id, ws);

      } else if (msg.type === 'response') {
        // ESP32 response to PWA
        const requestId = msg.id;
        const pwaWs = ws.pendingRequests?.get(requestId);

        if (pwaWs && pwaWs.readyState === 1) {
          console.log(`[Relay] 📨 Forwarding response ${requestId} (status ${msg.status}) to PWA`);
          pwaWs.send(data.toString());
          ws.pendingRequests.delete(requestId);
        } else {
          console.log(`[Relay] ⚠️  No PWA client found for response ${requestId}`);
        }
      }

    } catch (err) {
      console.error('[Relay] ❌ Error processing message:', err.message);
    }
  });

  ws.on('close', () => {
    if (ws.deviceId) {
      console.log(`[Relay] Device disconnected: ${ws.deviceId}`);
      devices.delete(ws.deviceId);
      console.log(`[Relay] Total devices online: ${devices.size}`);
    } else {
      console.log('[Relay] PWA client disconnected');
    }
  });

  ws.on('error', (error) => {
    console.error('[Relay] WebSocket error:', error.message);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Relay] Server listening on port ${PORT}`);
  console.log(`[Relay] Health check: http://localhost:${PORT}/health`);
  console.log(`[Relay] Waiting for ESP32 devices and PWA clients...`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Relay] Shutting down gracefully...');
  wss.clients.forEach(client => client.close());
  httpServer.close(() => {
    console.log('[Relay] Server closed');
    process.exit(0);
  });
});
