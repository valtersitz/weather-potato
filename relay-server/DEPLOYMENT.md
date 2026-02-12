# Relay Server Deployment Guide

## Quick Comparison

| Platform | Free Tier | HTTPS/WSS | Setup Time | Best For |
|----------|-----------|-----------|------------|----------|
| **Railway** | 500 hrs/month | ✅ Auto | 5 min | Easiest setup |
| **Render** | 750 hrs/month | ✅ Auto | 7 min | More free hours |
| **Fly.io** | 3 apps free | ✅ Auto | 10 min | Always-on apps |

**Recommendation:** Start with Railway (simplest), switch to Render if you need more hours.

---

## Option 1: Railway.app (Recommended)

### Features
- ✅ Automatic HTTPS/WSS
- ✅ Git-based deployment
- ✅ 500 free hours/month
- ✅ Built-in monitoring
- ✅ Zero config needed

### Steps

#### 1. Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Click "Login" → Sign in with GitHub
3. Authorize Railway to access your repos

#### 2. Deploy from GitHub

**Option A: Via Railway Dashboard**
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your Weather_Potato repository
4. Railway detects `relay-server/package.json`
5. Set **Root Directory**: `relay-server`
6. Click "Deploy"

**Option B: Via Railway CLI** (faster for updates)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
cd relay-server
railway link

# Deploy
railway up
```

#### 3. Get Your WebSocket URL

1. Go to Railway dashboard → Your project
2. Click "Settings" → "Networking"
3. Your URL will be: `https://your-app-name.up.railway.app`
4. **WebSocket URL (for ESP32):** `your-app-name.up.railway.app` (no https://)
5. **Port:** 443 (HTTPS standard)

#### 4. View Logs

Railway Dashboard → "Deployments" → Click latest deployment → "View Logs"

Expected output:
```
[Relay] WebSocket server listening on port 3000
[Relay] Waiting for ESP32 devices and PWA clients to connect...
```

#### 5. Configure ESP32

Update `src/main.cpp` line ~1420:
```cpp
// Railway deployment
wsClient.begin("your-app-name.up.railway.app", 443, "/", "wss");
wsClient.onEvent(webSocketEvent);
wsClient.setReconnectInterval(5000);
```

#### 6. Configure PWA

Update `PWApp/.env.production`:
```env
VITE_RELAY_URL=wss://your-app-name.up.railway.app
```

Then deploy to Vercel:
1. Go to Vercel dashboard → Your PWA project
2. Settings → Environment Variables
3. Add: `VITE_RELAY_URL` = `wss://your-app-name.up.railway.app`
4. Redeploy

---

## Option 2: Render.com

### Features
- ✅ Automatic HTTPS/WSS
- ✅ Git-based deployment
- ✅ 750 free hours/month (more than Railway!)
- ✅ Built-in monitoring
- ⚠️ Slightly slower cold starts

### Steps

#### 1. Create Render Account
1. Go to [render.com](https://render.com)
2. Click "Get Started for Free"
3. Sign up with GitHub

#### 2. Create New Web Service

1. Dashboard → "New" → "Web Service"
2. Connect your GitHub repository
3. Select "Weather_Potato" repo

#### 3. Configure Service

**Settings:**
- **Name:** `weather-potato-relay`
- **Root Directory:** `relay-server`
- **Environment:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Plan:** Free

Click "Create Web Service"

#### 4. Get Your WebSocket URL

After deployment (2-3 minutes):
- Your URL: `https://weather-potato-relay.onrender.com`
- **WebSocket URL:** `weather-potato-relay.onrender.com`
- **Port:** 443

#### 5. Configure ESP32

Update `src/main.cpp` line ~1420:
```cpp
// Render deployment
wsClient.begin("weather-potato-relay.onrender.com", 443, "/", "wss");
wsClient.onEvent(webSocketEvent);
wsClient.setReconnectInterval(5000);
```

#### 6. Configure PWA

Update `PWApp/.env.production`:
```env
VITE_RELAY_URL=wss://weather-potato-relay.onrender.com
```

Update Vercel environment variable and redeploy.

---

## Option 3: Fly.io (For Production)

### Features
- ✅ 3 free apps with 256MB RAM each
- ✅ Always-on (no cold starts)
- ✅ Global edge deployment
- ⚠️ Requires Docker
- ⚠️ More complex setup

### Steps

#### 1. Install Fly CLI
```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
iwr https://fly.io/install.ps1 -useb | iex
```

#### 2. Login & Launch
```bash
cd relay-server
fly auth login
fly launch
```

**Interactive prompts:**
- App name: `weather-potato-relay` (or auto-generated)
- Region: Choose closest to your location
- Database: No
- Redis: No

#### 3. Deploy
```bash
fly deploy
```

#### 4. Get URL
```bash
fly apps list
```

Your URL: `weather-potato-relay.fly.dev`

#### 5. Configure ESP32
```cpp
wsClient.begin("weather-potato-relay.fly.dev", 443, "/", "wss");
```

#### 6. View Logs
```bash
fly logs
```

---

## Verification Steps (All Platforms)

### 1. Test Relay Health

**Option A: Browser DevTools**
```javascript
// Open browser console on any page
const ws = new WebSocket('wss://your-relay-url.com');
ws.onopen = () => console.log('✅ Connected to relay!');
ws.onerror = (err) => console.error('❌ Connection failed:', err);
```

**Option B: Node.js Script**
```javascript
// test-relay.js
import WebSocket from 'ws';

const ws = new WebSocket('wss://your-relay-url.com');

ws.on('open', () => {
  console.log('✅ Connected to relay!');

  // Test registration
  ws.send(JSON.stringify({
    type: 'register',
    device_id: 'TEST1234',
    firmware_version: '1.0.0'
  }));
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});

ws.on('error', (err) => {
  console.error('❌ Error:', err.message);
});
```

Run: `node test-relay.js`

### 2. Check Logs

**Railway:**
Dashboard → Deployments → View Logs

**Render:**
Dashboard → Service → Logs tab

**Fly.io:**
```bash
fly logs
```

**Expected:**
```
[Relay] WebSocket server listening on port 3000
[Relay] Waiting for ESP32 devices and PWA clients to connect...
```

### 3. Test ESP32 Connection

Flash ESP32 with production relay URL:
```bash
pio run --target upload
pio device monitor
```

**Expected Serial Output:**
```
✅ WiFi Connected!
[WS] Connecting to relay server...
[WS] ✅ Connected to relay
[WS] Sent registration
```

**Expected Relay Logs:**
```
[Relay] New connection established
[Relay] Received message type: register
[Relay] ✅ Device registered: AABBCCDD
```

### 4. Test PWA Connection

Open PWA in browser (HTTPS required):
```
https://your-pwa.vercel.app
```

**Browser Console Expected:**
```
[ConnectionService] Connecting to relay: wss://your-relay-url.com
[ConnectionService] ✅ Connected to relay
[Dashboard] Fetching weather via relay for device: AABBCCDD
```

---

## Monitoring & Maintenance

### Railway
- **Metrics:** Dashboard → "Metrics" tab
- **Usage:** Dashboard → "Usage"
- **Restart:** Dashboard → "Settings" → "Redeploy"

### Render
- **Metrics:** Dashboard → Service → "Metrics"
- **Logs:** Dashboard → Service → "Logs"
- **Restart:** Dashboard → "Manual Deploy" → "Deploy latest commit"

### Fly.io
```bash
fly status              # Check app status
fly logs               # View live logs
fly scale show         # Check scaling
fly restart            # Restart app
```

---

## Troubleshooting

### Issue: "WebSocket connection failed"

**Symptoms:**
- ESP32 logs: `[WS] Error occurred`
- PWA console: `WebSocket connection to 'wss://...' failed`

**Fixes:**
1. Check relay server is deployed and running
2. View relay logs for errors
3. Test relay URL directly in browser console
4. Ensure URL uses `wss://` (not `ws://`)
5. Check firewall/network settings

### Issue: "Device offline or not found"

**Symptoms:**
- PWA shows: "Device offline or not found"
- Relay logs: Device not registered

**Fixes:**
1. Check ESP32 serial logs
2. Verify ESP32 connected to relay
3. Confirm device_id matches in PWA config
4. Restart ESP32 to re-register

### Issue: "Railway/Render app sleeping"

**Symptoms:**
- First request is slow (cold start)
- Logs show app restarting

**Fixes:**
1. **Railway:** Upgrade to Hobby plan ($5/month) for always-on
2. **Render:** Free tier sleeps after 15 min inactivity
3. **Workaround:** Use a ping service (like UptimeRobot) to keep alive
4. **Best:** Use Fly.io (doesn't sleep on free tier)

### Issue: "Memory limit exceeded"

**Symptoms:**
- Relay crashes after running for hours
- Logs show "Out of memory"

**Fixes:**
1. Check for memory leaks in server.js
2. Restart relay periodically
3. Upgrade to paid plan (more RAM)
4. Add memory monitoring:
```javascript
setInterval(() => {
  const used = process.memoryUsage();
  console.log(`Memory: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
}, 60000); // Log every minute
```

---

## Cost Estimates

### Free Tier Limits

| Platform | Hours/Month | Always-On? | Max Devices |
|----------|-------------|------------|-------------|
| Railway | 500 | No | 5-10 |
| Render | 750 | No | 5-10 |
| Fly.io | Unlimited* | Yes | 10-20 |

*Fly.io: 3 free apps, 256MB RAM each

### Paid Plans (if needed)

| Platform | Plan | Cost/Month | Features |
|----------|------|------------|----------|
| Railway | Hobby | $5 | Always-on, 8GB RAM |
| Render | Starter | $7 | Always-on, better support |
| Fly.io | Scale | ~$2-5 | Pay-as-you-go |

**Recommendation:** Start free, upgrade only if you hit limits or need always-on.

---

## Production Checklist

- [ ] Relay deployed to cloud platform
- [ ] HTTPS/WSS URL obtained
- [ ] ESP32 updated with production relay URL
- [ ] ESP32 tested and connects successfully
- [ ] PWA `.env.production` updated
- [ ] PWA deployed to Vercel with new env var
- [ ] PWA tested on iOS (HTTPS + relay)
- [ ] PWA tested on Android (HTTPS + relay)
- [ ] Monitoring set up (logs, alerts)
- [ ] Backup relay URL documented
- [ ] Team members have access to dashboard

---

## Next Steps

1. **Deploy relay** using Railway (fastest)
2. **Test locally** first with ESP32 + PWA
3. **Update production** configs (ESP32 + PWA)
4. **Flash and deploy** to production
5. **Verify on iOS** (critical test!)
6. **Monitor logs** for first 24 hours
7. **Scale up** if needed (more devices)

🎉 **You're ready to deploy!**
