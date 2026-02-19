#!/usr/bin/env node
/**
 * Weather Potato — Remote OTA trigger script
 *
 * First-time setup (once):
 *   cd scripts && npm install
 *
 * Usage (run from project root):
 *   node scripts/trigger-ota.js <DEVICE_ID> <FIRMWARE_URL> <OTA_TOKEN>
 *
 * The OTA_TOKEN is printed in the serial monitor at every boot:
 *   [OTA] Token: A1B2C3D4E5F67890...
 *
 * Full remote-OTA workflow:
 *   1. pio run                                    # build firmware
 *   2. cd .pio/build/upesy_wroom
 *      python3 -m http.server 8000                # serve it locally
 *   3. ngrok http 8000                            # expose → https://xxxx.ngrok-free.app
 *   4. node scripts/trigger-ota.js 30AEA406 https://xxxx.ngrok-free.app/firmware.bin A1B2C3D4...
 */

import WebSocket from 'ws';

const RELAY_URL = 'wss://weather-potato-production.up.railway.app';
const [,, DEVICE_ID, FIRMWARE_URL, OTA_TOKEN] = process.argv;

if (!DEVICE_ID || !FIRMWARE_URL) {
  console.error('Usage: node scripts/trigger-ota.js <DEVICE_ID> <FIRMWARE_URL> [OTA_TOKEN]');
  console.error('  OTA_TOKEN is optional during prototyping; required in production.');
  console.error('  Token is printed in the serial monitor at boot: [OTA] Token: XXXXXXXX...');
  process.exit(1);
}

console.log(`[OTA] Relay   : ${RELAY_URL}`);
console.log(`[OTA] Device  : ${DEVICE_ID}`);
console.log(`[OTA] Firmware: ${FIRMWARE_URL}`);
if (OTA_TOKEN) {
  console.log(`[OTA] Token   : ${OTA_TOKEN.slice(0, 4)}${'*'.repeat(OTA_TOKEN.length - 4)}`);
} else {
  console.log('[OTA] Token   : (none — token check disabled on device)');
}
console.log('[OTA] Connecting...');

const ws = new WebSocket(RELAY_URL);

// Track whether the device acknowledged the request
let started = false;

// Timeout if device never picks up
const timeout = setTimeout(() => {
  if (!started) {
    console.error('[OTA] ❌ No response from device after 30 s — is it online?');
    ws.close();
    process.exit(1);
  }
}, 30000);

ws.on('open', () => {
  console.log('[OTA] ✅ Connected to relay');

  // Subscribe to receive ota_progress messages back from the device
  ws.send(JSON.stringify({ type: 'subscribe', device_id: DEVICE_ID }));

  // Small delay to let the subscription register, then send the OTA request
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'ota_request',
      device_id: DEVICE_ID,
      url: FIRMWARE_URL,
      ...(OTA_TOKEN && { token: OTA_TOKEN }),
    }));
    console.log('[OTA] 🚀 OTA request sent — waiting for device to respond...\n');
  }, 400);
});

ws.on('message', (data) => {
  let msg;
  try { msg = JSON.parse(data.toString()); } catch { return; }

  if (msg.type === 'error') {
    console.error('[OTA] ❌ Relay error:', msg.error);
    clearTimeout(timeout);
    ws.close();
    process.exit(1);
  }

  if (msg.type !== 'ota_progress') return;

  started = true;
  clearTimeout(timeout);

  // Progress bar
  const filled = Math.floor(msg.progress / 5);
  const bar    = '█'.repeat(filled) + '░'.repeat(20 - filled);
  const detail = msg.message ? ` (${msg.message})` : '';
  process.stdout.write(`\r[OTA] [${bar}] ${String(msg.progress).padStart(3)}%  ${msg.status}${detail}   `);

  if (msg.status === 'success') {
    console.log('\n[OTA] ✅ Firmware updated — device is restarting.');
    ws.close();
    process.exit(0);
  }

  if (msg.status === 'error') {
    console.error('\n[OTA] ❌ OTA failed:', msg.message || '(unknown error)');
    ws.close();
    process.exit(1);
  }
});

ws.on('error', (err) => {
  console.error('[OTA] WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', () => {
  // Only log if we didn't exit cleanly above
  console.log('\n[OTA] Connection closed.');
});
