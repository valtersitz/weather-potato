# 🔐 HTTPS Setup Guide for Weather Potato

## Why HTTPS?

The PWA is served from Vercel (HTTPS), but the ESP32 serves HTTP. Modern browsers block HTTPS pages from making HTTP requests (mixed content). Adding HTTPS to the ESP32 solves this.

## Quick Setup (3 Steps)

### Step 1: Generate Certificate

```bash
cd /home/valentin/Documents/PlatformIO/Projects/Weather_Potato
./generate_cert.sh
```

This creates:
- `server_cert.pem` - SSL certificate
- `server_key.pem` - Private key

### Step 2: Convert to C++ Header

```bash
./convert_cert_to_header.sh
```

This creates `src/server_cert.h` with embedded certificates.

### Step 3: Update ESP32 Code

I'll provide you with the updated `main.cpp` that uses HTTPS instead of HTTP.

## What Changes?

### Before (HTTP):
```
http://192.168.1.100:8080/weather
```

### After (HTTPS):
```
https://192.168.1.100:8443/weather
```

## User Experience

1. User opens PWA (HTTPS)
2. PWA tries to fetch from device (HTTPS)
3. **Browser shows security warning** (self-signed cert)
4. User clicks **"Advanced"** → **"Proceed anyway"** (ONE TIME ONLY)
5. Browser remembers exception
6. ✅ Everything works!

## Alternative: Serve PWA from ESP32

If you want to avoid HTTPS complexity, you can serve the PWA directly from the ESP32 during use (not just onboarding). This way both are HTTP and no mixed content blocking occurs.

**Pros:** No certificate warnings, simpler
**Cons:** Slower than Vercel, no offline PWA when device is off

Let me know which approach you prefer!

## Next Steps

Once you run the certificate scripts, I'll update `main.cpp` with the HTTPS server code.
