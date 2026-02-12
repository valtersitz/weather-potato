# WebSocket Relay Testing Checklist

## Pre-Testing Setup

### 1. Relay Server Setup
- [ ] Install dependencies: `cd relay-server && npm install`
- [ ] Start relay server: `npm start`
- [ ] Verify relay is running on port 3000
- [ ] Check console shows: `[Relay] WebSocket server listening on port 3000`

### 2. ESP32 Configuration
- [ ] Update relay URL in `src/main.cpp` line ~1420:
  - Local testing: `wsClient.begin("192.168.1.X", 3000, "/");` (your computer's local IP)
  - Production: `wsClient.begin("your-relay.railway.app", 443, "/", "wss");`
- [ ] Build firmware: `pio run`
- [ ] Upload to ESP32: `pio run --target upload`
- [ ] Open serial monitor: `pio device monitor`

### 3. PWA Setup
- [ ] Verify `.env.development` has `VITE_RELAY_URL=ws://localhost:3000`
- [ ] Install dependencies: `cd PWApp && npm install`
- [ ] Start dev server: `npm run dev`
- [ ] Note the dev server URL (usually http://localhost:5173)

---

## Test Cases

### ✅ ESP32 Boot & Relay Connection

**Expected Serial Output:**
```
=== Weather Potato Starting ===
Device ID: AABBCCDD
...
✅ WiFi Connected!
   IP: 192.168.1.X
[WS] Connecting to relay server...
[WS] ✅ Connected to relay
[WS] Sent registration
```

- [ ] ESP32 boots successfully
- [ ] WiFi connects to home network
- [ ] WebSocket connects to relay
- [ ] Registration message sent

**Relay Server Output:**
```
[Relay] New connection established
[Relay] Received message type: register
[Relay] ✅ Device registered: AABBCCDD
[Relay] Total devices online: 1
```

- [ ] Relay receives connection
- [ ] Device registers with correct device_id
- [ ] Device count increments

---

### ✅ PWA Connection to Relay

**Browser Console (Dev Tools):**
```
[ConnectionService] Initializing with config: AABBCCDD
[ConnectionService] Connecting to relay: ws://localhost:3000
[ConnectionService] ✅ Connected to relay
```

- [ ] Open PWA in browser (http://localhost:5173)
- [ ] Complete onboarding (if needed)
- [ ] Navigate to dashboard
- [ ] Check browser console for connection logs

---

### ✅ Dashboard Weather Fetch (GET /weather)

**Browser Console:**
```
[Dashboard] Fetching weather via relay for device: AABBCCDD
[ConnectionService] Sending GET /weather (id: uuid-xxx)
[ConnectionService] Received message: response uuid-xxx
[Dashboard] Weather data: { temperature: 22, condition: "clear_sky", ... }
```

**Relay Server:**
```
[Relay] 📨 Forwarding request uuid-xxx (GET /weather) to device AABBCCDD
[Relay] 📨 Forwarding response uuid-xxx (status 200) to PWA
```

**ESP32 Serial:**
```
[WS] Received: {"id":"uuid-xxx","type":"request",...}
[WS] Request: GET /weather (id=uuid-xxx)
```

- [ ] Dashboard loads without errors
- [ ] Weather data displays correctly
- [ ] Temperature shows current value
- [ ] Weather icon matches condition
- [ ] No "Connection Error" message

---

### ✅ Map Page Location Fetch (GET /weather)

- [ ] Navigate to Map page
- [ ] Map loads with marker at device location
- [ ] Coordinates match ESP32 configuration
- [ ] No console errors

---

### ✅ Map Page Location Update (POST /location)

**Test Steps:**
1. Click on map to select new location
2. Click "Update Location" button

**Browser Console:**
```
[Map] Sending coordinates via relay: {latitude: 48.8566, longitude: 2.3522}
[ConnectionService] Sending POST /location (id: uuid-yyy)
[Map] Location updated: {success: true, latitude: 48.8566, longitude: 2.3522}
```

**ESP32 Serial:**
```
[WS] Request: POST /location (id=uuid-yyy)
[WS] Location updated: 48.8566, 2.3522
```

- [ ] Click on map updates temporary marker
- [ ] "Update Location" button works
- [ ] Success message appears
- [ ] Coordinates update on ESP32
- [ ] Next weather fetch will use new location

---

### ✅ iOS Testing (Critical!)

**Setup:**
- [ ] Deploy relay to production (Railway/Render with HTTPS)
- [ ] Update ESP32 with production relay URL
- [ ] Deploy PWA to Vercel with production relay URL
- [ ] Flash ESP32 with updated firmware

**Test on iOS Safari:**
- [ ] Open PWA on iOS device (HTTPS URL from Vercel)
- [ ] Complete onboarding if needed
- [ ] Navigate to dashboard
- [ ] Verify weather data loads (no "Connection Error")
- [ ] Open Map page
- [ ] Update location
- [ ] Verify location updates successfully

**iOS Browser Console (via Safari Dev Tools or Eruda):**
```
[ConnectionService] Connecting to relay: wss://your-relay.railway.app
[ConnectionService] ✅ Connected to relay
[Dashboard] Weather data: { temperature: 22, ... }
```

- [ ] No Mixed Content Blocking errors
- [ ] WebSocket connection succeeds
- [ ] Weather data fetches successfully
- [ ] POST requests work (location update)

---

### ✅ Android Testing (Verification)

**Test on Android Chrome:**
- [ ] Open PWA on Android device
- [ ] Complete onboarding if needed
- [ ] Navigate to dashboard
- [ ] Verify weather data loads
- [ ] Open Map page
- [ ] Update location
- [ ] Verify location updates successfully

**Expected:** Should work identically to iOS (same code path)

---

### ✅ Error Handling

#### Device Offline
1. Turn off ESP32 or disconnect WiFi
2. Try to fetch weather on PWA

**Expected:**
```
[ConnectionService] Received message: error
Error: Device offline or not found
```

- [ ] Error message displays in PWA
- [ ] No app crash
- [ ] Retry button available

#### Relay Server Offline
1. Stop relay server
2. Reload PWA dashboard

**Expected:**
```
[ConnectionService] WebSocket error: ...
[ConnectionService] Reconnecting in 1000ms (attempt 1/5)
```

- [ ] Connection timeout message
- [ ] Auto-reconnect attempts
- [ ] Max reconnect limit respected (5 attempts)

#### Request Timeout
1. Simulate slow network or unresponsive device
2. Wait for timeout (10 seconds)

**Expected:**
```
Error: Request timeout after 10000ms
```

- [ ] Timeout error displays
- [ ] Request cleaned up from pending map

---

### ✅ Reconnection Testing

#### WiFi Interruption (ESP32)
1. Disconnect ESP32 from WiFi
2. Wait 10 seconds
3. Reconnect WiFi

**Expected Serial:**
```
[WS] Disconnected from relay
...
✅ WiFi Connected!
[WS] Connecting to relay server...
[WS] ✅ Connected to relay
[WS] Sent registration
```

- [ ] ESP32 reconnects to WiFi
- [ ] WebSocket auto-reconnects (5s interval)
- [ ] Device re-registers with relay
- [ ] PWA can fetch data after reconnection

#### Browser Refresh (PWA)
1. Refresh PWA page
2. Check connection re-establishes

**Expected:**
- [ ] WebSocket reconnects automatically
- [ ] Data fetches successfully after reload

---

### ✅ Concurrent Connections

**Setup:**
1. Keep ESP32 connected
2. Open PWA in 2 different browsers

**Expected:**
- [ ] Both browsers connect to relay
- [ ] Both can fetch weather data
- [ ] Responses route to correct client
- [ ] No cross-talk between clients

---

### ✅ AP Mode Onboarding (Unchanged)

**Critical:** Onboarding should NOT use relay

1. Reset ESP32 or use unconfigured device
2. Connect phone to "myWeatherPotato" AP
3. Complete onboarding

**Expected:**
- [ ] AP mode works as before
- [ ] Direct HTTP to 192.168.4.1:8080 succeeds
- [ ] NO relay connection during onboarding
- [ ] After WiFi connects, relay connection establishes

---

## Performance Metrics

### Latency Comparison

**Direct HTTP (baseline - Android only):**
- [ ] Measure time: Request → Response
- [ ] Typical: 50-200ms on same network

**Via Relay:**
- [ ] Measure time: PWA → Relay → ESP32 → Relay → PWA
- [ ] Expected: 100-500ms (local relay)
- [ ] Expected: 200-1000ms (cloud relay)

**Acceptable:** Relay adds ~100-300ms overhead (still feels instant)

### Memory Usage

**ESP32:**
- [ ] Check free heap: `Serial.println(ESP.getFreeHeap());`
- [ ] WebSocket should use ~5-10KB
- [ ] No memory leaks over 1 hour

**Relay Server:**
- [ ] Monitor with `node --trace-warnings server.js`
- [ ] Check memory doesn't grow unbounded
- [ ] Test with 5+ concurrent devices

---

## Deployment Verification (Production)

### Railway/Render Deployment
- [ ] Relay server deployed successfully
- [ ] HTTPS/WSS endpoint accessible
- [ ] Logs visible in dashboard
- [ ] No crashes under load

### ESP32 Production Config
- [ ] Relay URL uses `wss://` (secure WebSocket)
- [ ] Port is 443 (HTTPS standard)
- [ ] Device connects on boot
- [ ] Registration succeeds

### PWA Production Config
- [ ] `.env.production` has production relay URL
- [ ] Vercel environment variable set: `VITE_RELAY_URL`
- [ ] Build succeeds: `npm run build`
- [ ] Deployed PWA connects to relay

### End-to-End Production Test
- [ ] iOS device → Vercel PWA → Cloud Relay → ESP32
- [ ] Android device → Vercel PWA → Cloud Relay → ESP32
- [ ] Both platforms work identically
- [ ] Weather data displays correctly
- [ ] Location updates work

---

## Troubleshooting Guide

### "Connection timeout: WebSocket not ready"
**Cause:** Relay server not running or unreachable
**Fix:**
- Check relay server is running: `npm start`
- Verify firewall allows port 3000
- Check relay URL in PWA constants

### "Device offline or not found"
**Cause:** ESP32 not connected to relay
**Fix:**
- Check ESP32 serial logs for WebSocket connection
- Verify relay URL in ESP32 main.cpp
- Ensure WiFi is connected on ESP32

### ESP32 won't connect to relay
**Cause:** Network/DNS issues
**Fix:**
- Use IP address instead of hostname for testing
- Check firewall on relay server machine
- Verify ESP32 can reach relay (ping from same network)

### iOS still shows "Connection Error"
**Cause:** Mixed Content or CORS issue
**Fix:**
- Ensure relay uses `wss://` (not `ws://`)
- Verify PWA is served over HTTPS
- Check browser console for specific error

### Relay server crashes
**Cause:** Uncaught exception or memory leak
**Fix:**
- Check relay logs for error messages
- Restart with `npm start`
- Monitor memory usage
- Update WebSocket library if needed

---

## Success Criteria

**All tests must pass:**
- ✅ ESP32 connects to relay on boot
- ✅ PWA connects to relay on load
- ✅ Weather fetch works on iOS
- ✅ Weather fetch works on Android
- ✅ Location update works on both platforms
- ✅ Reconnection handles network interruptions
- ✅ Error messages display correctly
- ✅ Performance is acceptable (<1s latency)
- ✅ AP mode onboarding still works
- ✅ Production deployment successful

**When all ✅ are checked:**
🎉 **Ready to merge to main branch!**

---

## Post-Merge Tasks

- [ ] Update main branch README with relay setup instructions
- [ ] Document relay server deployment process
- [ ] Add monitoring/logging to relay server
- [ ] Consider authentication for relay (device API keys)
- [ ] Consider rate limiting on relay
- [ ] Set up automated tests for relay endpoints
- [ ] Create Docker compose for local testing
- [ ] Add health check endpoint to relay server
