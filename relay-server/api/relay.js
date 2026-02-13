// Vercel Edge Function for WebSocket relay
// Weather Potato - WebSocket relay for HTTPS PWA ↔ HTTP ESP32 communication

export const config = {
  runtime: 'edge',
};

// In-memory device registry (resets on cold start, devices auto-reconnect)
const devices = new Map();

export default async function handler(req) {
  // Log incoming requests
  console.log(`[Relay] Incoming request from ${req.headers.get('x-forwarded-for') || 'unknown'}`);

  const upgradeHeader = req.headers.get('Upgrade');

  if (upgradeHeader !== 'websocket') {
    // Health check endpoint
    if (req.url.endsWith('/health')) {
      return new Response(JSON.stringify({
        status: 'ok',
        devices: devices.size,
        timestamp: Date.now()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Expected WebSocket connection. Upgrade header required.', {
      status: 426,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // Upgrade to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = () => {
    console.log('[Relay] New WebSocket connection');
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      console.log(`[Relay] Message type: ${msg.type}`);

      if (msg.type === 'register') {
        // ESP32 device registration
        const deviceId = msg.device_id;
        devices.set(deviceId, socket);
        socket.deviceId = deviceId;
        console.log(`[Relay] ✅ Device registered: ${deviceId}`);
        console.log(`[Relay] Total devices: ${devices.size}`);

      } else if (msg.type === 'request') {
        // PWA request to device
        const deviceId = msg.device_id;
        const deviceSocket = devices.get(deviceId);

        if (!deviceSocket || deviceSocket.readyState !== 1) {
          socket.send(JSON.stringify({
            id: msg.id,
            type: 'error',
            error: 'Device offline or not found'
          }));
          return;
        }

        console.log(`[Relay] 📨 Forwarding request ${msg.id} to ${deviceId}`);
        deviceSocket.send(event.data);

        // Store PWA socket for response routing
        deviceSocket.pendingRequests = deviceSocket.pendingRequests || new Map();
        deviceSocket.pendingRequests.set(msg.id, socket);

      } else if (msg.type === 'response') {
        // ESP32 response to PWA
        const requestId = msg.id;
        const pwaSocket = socket.pendingRequests?.get(requestId);

        if (pwaSocket && pwaSocket.readyState === 1) {
          console.log(`[Relay] 📨 Forwarding response ${requestId} to PWA`);
          pwaSocket.send(event.data);
          socket.pendingRequests.delete(requestId);
        }
      }

    } catch (err) {
      console.error('[Relay] Error processing message:', err);
    }
  };

  socket.onclose = () => {
    if (socket.deviceId) {
      console.log(`[Relay] Device disconnected: ${socket.deviceId}`);
      devices.delete(socket.deviceId);
    } else {
      console.log('[Relay] PWA client disconnected');
    }
  };

  socket.onerror = (error) => {
    console.error('[Relay] WebSocket error:', error);
  };

  return response;
}
