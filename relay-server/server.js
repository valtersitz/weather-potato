import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3000;
const wss = new WebSocketServer({ port: PORT });

// Registry: device_id → WebSocket connection
const devices = new Map();

console.log(`[Relay] WebSocket server listening on port ${PORT}`);
console.log(`[Relay] Waiting for ESP32 devices and PWA clients to connect...`);

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
        ws.isPWA = false;
        console.log(`[Relay] ✅ Device registered: ${deviceId}`);
        console.log(`[Relay] Total devices online: ${devices.size}`);

      } else if (msg.type === 'request') {
        // PWA request to device
        const deviceId = msg.device_id;
        const deviceWs = devices.get(deviceId);

        if (!deviceWs || deviceWs.readyState !== 1) {
          // Device offline or not registered
          console.log(`[Relay] ❌ Device ${deviceId} offline or not found`);
          ws.send(JSON.stringify({
            id: msg.id,
            type: 'error',
            error: 'Device offline or not found'
          }));
          return;
        }

        // Forward request to device
        console.log(`[Relay] 📨 Forwarding request ${msg.id} (${msg.method} ${msg.path}) to device ${deviceId}`);
        deviceWs.send(data);

        // Store PWA socket for response routing
        deviceWs.pendingRequests = deviceWs.pendingRequests || new Map();
        deviceWs.pendingRequests.set(msg.id, ws);

      } else if (msg.type === 'response') {
        // ESP32 response to PWA
        const requestId = msg.id;
        const pwaWs = ws.pendingRequests?.get(requestId);

        if (pwaWs && pwaWs.readyState === 1) {
          console.log(`[Relay] 📨 Forwarding response ${requestId} (status ${msg.status}) to PWA`);
          pwaWs.send(data);
          ws.pendingRequests.delete(requestId);
        } else {
          console.log(`[Relay] ⚠️  No PWA client found for response ${requestId}`);
        }
      } else {
        console.log(`[Relay] ⚠️  Unknown message type: ${msg.type}`);
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

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Relay] Shutting down gracefully...');
  wss.clients.forEach(client => client.close());
  wss.close(() => {
    console.log('[Relay] Server closed');
    process.exit(0);
  });
});
