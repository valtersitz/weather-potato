# Simple iOS Debugging (No Mac Required!)

## Method 1: Use Console Logs in PWA (Easiest!)

Since you can't use Chrome DevTools on iOS without a Mac, add a visible console to the PWA:

### Step 1: Add Debug Console to PWA

I'll add a floating debug console that shows all logs directly in the PWA UI.

### Step 2: Use ESP32 Serial Monitor

This is your main debugging tool:

```bash
# Connect ESP32 via USB
pio device monitor

# or
pio device monitor -b 115200
```

**What you'll see when it works:**
```
========================================
📡 INCOMING REQUEST: /device-info
   Method: GET
   Client IP: 192.168.4.2
✅ /device-info responded with 200 OK
========================================
```

**What you'll see now (broken):**
```
=== Setup Complete ===
(nothing - no requests handled)
```

## Method 2: Use Safari on Mac (If You Have One)

1. Connect iPhone to Mac via USB
2. On iPhone: Settings → Safari → Advanced → Enable "Web Inspector"
3. On Mac: Safari → Preferences → Advanced → Check "Show Develop menu"
4. On Mac: Develop menu → [Your iPhone] → [PWA page]

## Method 3: Manual Testing (No Tools Needed!)

### Test ESP32 from Phone Browser

1. Connect to `myWeatherPotato` AP
2. Open Safari (not Chrome - better for local IPs)
3. Go to: `http://192.168.4.1:8080/device-info`
4. Should see JSON response like:
   ```json
   {"device_id":"30AEA406","mac_address":"..."}
   ```
5. If you see this → ESP32 is working! ✅
6. If "Cannot connect" → ESP32 server issue ❌

### Test Setup Page

1. Go to: `http://192.168.4.1:8080/setup`
2. Should see a nice purple/gradient page with form
3. Fill in WiFi credentials and location
4. Click "Send Configuration"
5. Watch ESP32 serial for logs

## Method 4: Add Visible Alerts in PWA

I can add alert() or visible error messages in the PWA so you see exactly what's failing without needing DevTools.

## Current Bug Fix

The main bug was just fixed:
- ESP32 HTTP server was ONLY handling requests when connected to WiFi as client
- In AP mode, `server.handleClient()` was never called
- Fix: Always call `server.handleClient()` regardless of WiFi status

## Next Steps

1. Upload fixed firmware:
   ```bash
   pio run --target upload
   ```

2. Open serial monitor:
   ```bash
   pio device monitor
   ```

3. Connect to AP from iPhone

4. Try opening in Safari: `http://192.168.4.1:8080/setup`

5. You should see serial output:
   ```
   ========================================
   📡 INCOMING REQUEST: /setup
   ✅ /setup responded with HTML page
   ========================================
   ```

## Troubleshooting

### Still Can't Connect to 192.168.4.1?

1. Check ESP32 serial shows: "Access Point IP: 192.168.4.1"
2. Check iPhone WiFi settings show: Connected to "myWeatherPotato"
3. Check iPhone has IP like 192.168.4.2 (Settings → WiFi → myWeatherPotato → i icon)
4. Try pinging from command line (if you have iSH or similar): `ping 192.168.4.1`

### ESP32 Shows No Logs?

- Baud rate might be wrong: Try `pio device monitor -b 9600` or `-b 115200`
- USB cable might be data-only: Try different cable
- Driver issue: Check `pio device list` shows the port

### WiFi Settings Show No IP Address?

- AP might not have DHCP enabled
- Try manually setting IP: 192.168.4.2, Subnet: 255.255.255.0, Router: 192.168.4.1
