# iOS AP Mode Debugging Guide

## Quick Chrome Remote Debugging Setup

### What You Need
- iOS device (iPhone/iPad)
- PC with Chrome installed
- USB cable

### Step 1: Enable USB Debugging on iOS
1. Connect iPhone to PC via USB
2. On iPhone: Open Safari
3. On iPhone: Go to `weather-potato-vercel-127v.vercel.app`
4. Keep Safari open in background

### Step 2: Access Remote Debugging on PC
1. On PC: Open Chrome
2. In address bar, type: `chrome://inspect/#devices`
3. You should see your iPhone listed
4. Under your iPhone, you'll see the PWA page
5. Click **"Inspect"** next to it

### Step 3: You Now Have Full DevTools!
- **Console Tab**: See all console.log() messages
- **Network Tab**: See all fetch requests and responses
- **Application Tab**: Check service worker status
- **Elements Tab**: Inspect the DOM

## Debugging Steps

### Test 1: Check if PWA Service Worker is Active

**In Chrome DevTools Console (while on home WiFi):**
```javascript
// Check service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
  if (registrations.length > 0) {
    console.log('✅ Service worker registered');
  } else {
    console.log('❌ No service worker found');
  }
});
```

### Test 2: Check Current Connection

**In Chrome DevTools Console:**
```javascript
// Check if HTTPS
console.log('Protocol:', window.location.protocol); // Should be https:

// Check current URL
console.log('Current URL:', window.location.href);
```

### Test 3: Test ESP32 Connectivity

**After connecting to Weather Potato AP:**

```javascript
// Try to reach ESP32
fetch('http://192.168.4.1:8080/device-info')
  .then(r => {
    console.log('✅ Response received:', r.status);
    return r.json();
  })
  .then(d => console.log('✅ Data:', d))
  .catch(e => {
    console.error('❌ Failed:', e);
    console.error('Error name:', e.name);
    console.error('Error message:', e.message);
  });
```

### Test 4: Check ESP32 Serial Output

1. Connect ESP32 to PC via USB
2. Open PlatformIO terminal
3. Run: `pio device monitor`
4. You should see:
   ```
   ========================================
   📡 INCOMING REQUEST: /device-info
      Method: GET
      Client IP: 192.168.4.2
   ```

If you see NOTHING when trying to connect from iOS, the requests are being blocked.

### Test 5: Use Fallback Method

If requests are blocked:
1. Look for **"🚀 Open ESP32 Setup Page"** button in the error message
2. Click it
3. You'll be redirected to `http://192.168.4.1:8080/setup`
4. This is pure HTTP → HTTP (no blocking!)

## Common Issues

### Issue: "Load failed" Error

**Symptoms:**
- Error appears when clicking "Test Connection"
- No fallback button visible

**Cause:**
- Mixed content blocking (HTTPS → HTTP)
- Service worker not caching properly

**Solution:**
1. **Reload PWA while on home WiFi**
2. Navigate through all pages to cache them
3. **Then** connect to AP
4. If still fails, use fallback button

### Issue: No Serial Output from ESP32

**Check:**
```bash
# List serial ports
pio device list

# Connect to serial monitor
pio device monitor -b 115200
```

### Issue: Fallback Button Not Showing

**Check in DevTools Console:**
- Look for: `[AP] Fallback button should now be visible`
- If you see it but button doesn't appear, React state update failed

## Expected Serial Output

### When PWA Connects Successfully:
```
========================================
📡 INCOMING REQUEST: /device-info
   Method: GET
   Client IP: 192.168.4.2
   Headers: 2
   Response: {"device_id":"ESP32-ABC123",...}
✅ /device-info responded with 200 OK
========================================
```

### When Configuration is Sent:
```
========================================
📡 INCOMING REQUEST: /config
   Method: POST | Client IP: 192.168.4.2
   Request body: {"ssid":"MyWiFi","password":"...",...}
WiFi credentials updated via HTTP/AP
SSID: MyWiFi
GPS coordinates also received: 48.907500, 2.383300
   ✅ Sending response: {"success":true,...}
✅ /config responded with 200 OK
🔌 Attempting to connect to WiFi...
========================================
📶 WiFi connection initiated
```

### When Fallback Page is Opened:
```
========================================
📡 INCOMING REQUEST: /setup
   Client IP: 192.168.4.2
   Query string: /setup?ssid=MyWiFi&password=...
✅ /setup responded with HTML page
========================================
```

## Testing Checklist

- [ ] PWA loads on home WiFi
- [ ] Service worker registers (check DevTools)
- [ ] Navigate through all PWA pages
- [ ] Connect to Weather Potato AP
- [ ] Check ESP32 serial monitor (should show AP started)
- [ ] Click "Test Connection" in PWA
- [ ] Check serial monitor for `/device-info` request
- [ ] If request doesn't appear → Mixed content blocking confirmed
- [ ] Fallback button should appear
- [ ] Click fallback button
- [ ] ESP32 setup page loads (check serial for `/setup` request)
- [ ] Submit configuration
- [ ] Check serial for `/config` request
- [ ] Verify WiFi connection attempt in serial

## Quick Reference

### ESP32 Serial Monitor Commands
```bash
# Start monitoring
pio device monitor

# Stop monitoring
Ctrl+C

# Clear screen
Ctrl+L
```

### Chrome DevTools Shortcuts
- **F12**: Open DevTools
- **Ctrl+Shift+C**: Inspect element
- **Ctrl+L**: Clear console
- **Ctrl+R**: Reload page
- **Ctrl+Shift+R**: Hard reload (clear cache)

## Still Not Working?

If ESP32 shows NO requests in serial:
1. ✅ Confirmed: Mixed content blocking
2. ✅ Use fallback method ONLY
3. ✅ The direct fetch will NEVER work from HTTPS PWA on iOS

If ESP32 DOES show requests but they fail:
1. Check CORS headers are being added
2. Check response format matches what PWA expects
3. Check for typos in endpoint URLs
