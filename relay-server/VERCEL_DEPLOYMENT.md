# Deploying Relay to Vercel

## ⚠️ Important: Vercel WebSocket Limitations

Vercel has **significant limitations** for WebSocket relay servers:

### Issues with Vercel:
1. **❌ Serverless Functions**: 10-second timeout (too short for persistent WebSockets)
2. **⚠️ Edge Functions**: Support WebSockets BUT:
   - Cold starts reset device registry (devices must re-register)
   - Limited to Deno runtime (not standard Node.js)
   - Connection limits and timeouts
   - Less predictable for long-lived connections

### ✅ Recommended Approach:

**Deploy relay to Railway/Render (free), keep PWA on Vercel**

This is the **best** architecture:
- ✅ PWA on Vercel (fast, free, great for static sites)
- ✅ Relay on Railway/Render (designed for WebSockets, always-on)
- ✅ Both communicate via HTTPS/WSS
- ✅ No CORS issues (relay allows all origins)

---

## Option 1: Railway for Relay (Recommended)

**5-minute setup, works perfectly with Vercel PWA**

### Step 1: Deploy Relay to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy relay
cd relay-server
railway link  # Create new project
railway up    # Deploy
```

### Step 2: Get Railway WebSocket URL

Railway dashboard will show:
```
https://weather-potato-relay.up.railway.app
```

This is your relay URL! Railway auto-provides HTTPS/WSS.

### Step 3: Update Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your Weather Potato PWA project
3. Settings → Environment Variables
4. Add new variable:
   - **Name:** `VITE_RELAY_URL`
   - **Value:** `wss://weather-potato-relay.up.railway.app`
   - **Environment:** Production

### Step 4: Redeploy PWA

Vercel will auto-redeploy when you push to Git, or:
- Vercel dashboard → Deployments → Redeploy

### Step 5: Update ESP32

In `src/main.cpp` line ~1420:
```cpp
wsClient.begin("weather-potato-relay.up.railway.app", 443, "/", "wss");
```

Flash to ESP32:
```bash
pio run --target upload
```

### Step 6: Test!

Open your Vercel PWA on iOS:
```
https://your-pwa.vercel.app
```

✅ Should connect to relay and display weather!

---

## Option 2: Try Vercel Edge (Experimental)

If you really want everything on Vercel, here's how:

### Limitations:
- ⚠️ Device registry resets on cold starts
- ⚠️ ESP32 must re-register after relay restart
- ⚠️ May have connection timeouts
- ⚠️ Not recommended for production

### Setup

#### 1. Create Vercel Config

Create `relay-server/vercel.json`:
```json
{
  "functions": {
    "api/relay.js": {
      "runtime": "edge"
    }
  },
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/api/relay"
    }
  ]
}
```

#### 2. Update Package.json

Add Vercel CLI:
```bash
cd relay-server
npm install -D vercel
```

#### 3. Deploy to Vercel

```bash
vercel --prod
```

#### 4. Get WebSocket URL

Vercel will output:
```
https://relay-server-xxxx.vercel.app
```

#### 5. Update PWA Environment Variable

Same as Option 1, but use your Vercel relay URL:
```
VITE_RELAY_URL=wss://relay-server-xxxx.vercel.app
```

#### 6. Update ESP32

```cpp
wsClient.begin("relay-server-xxxx.vercel.app", 443, "/", "wss");
```

### Testing Vercel Edge Relay

1. Deploy relay to Vercel
2. Test connection:
```javascript
// Browser console
const ws = new WebSocket('wss://relay-server-xxxx.vercel.app');
ws.onopen = () => console.log('Connected!');
ws.onerror = (e) => console.error('Error:', e);
```

3. Flash ESP32 with Vercel relay URL
4. Check serial monitor for connection
5. Open PWA and test dashboard

---

## Comparison: Railway vs Vercel Edge

| Feature | Railway | Vercel Edge |
|---------|---------|-------------|
| **WebSocket Support** | ✅ Native | ⚠️ Limited |
| **Cold Starts** | Minimal | Frequent |
| **Device Registry** | Persistent | Resets |
| **Timeout** | None | Variable |
| **Free Tier** | 500 hrs/mo | Unlimited* |
| **Setup** | 5 minutes | 10 minutes |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Production Ready** | ✅ Yes | ⚠️ Experimental |

**Verdict:** Use Railway for relay, Vercel for PWA

---

## Recommended Architecture

```
┌─────────────────────────────────────────┐
│   PWA on Vercel (HTTPS)                 │
│   https://weather-potato.vercel.app     │
│                                          │
│   • Fast global CDN                     │
│   • Automatic HTTPS                     │
│   • Git-based deployment                │
└──────────────┬──────────────────────────┘
               │
               │ WSS Connection
               │
               ▼
┌─────────────────────────────────────────┐
│   Relay on Railway (WSS)                │
│   wss://relay.railway.app               │
│                                          │
│   • Persistent WebSocket server         │
│   • Device registry in memory           │
│   • Always-on (no cold starts)          │
└──────────────┬──────────────────────────┘
               │
               │ WS Connection
               │
               ▼
┌─────────────────────────────────────────┐
│   ESP32 (Local Network)                 │
│   192.168.1.x                           │
│                                          │
│   • Connects to relay on boot           │
│   • Registers device_id                 │
│   • Processes proxied requests          │
└─────────────────────────────────────────┘
```

**Why this works best:**
- ✅ PWA uses Vercel's strengths (static hosting, CDN)
- ✅ Relay uses Railway's strengths (WebSockets, always-on)
- ✅ ESP32 stays simple (just WebSocket client)
- ✅ All components free tier
- ✅ Production-ready reliability

---

## Quick Start (Railway + Vercel)

**Total time: ~10 minutes**

```bash
# 1. Deploy relay to Railway
cd relay-server
npm i -g @railway/cli
railway login
railway link
railway up

# 2. Get Railway URL from dashboard
# Example: https://weather-potato-relay.up.railway.app

# 3. Update Vercel PWA env var
# Go to vercel.com dashboard → Settings → Env Variables
# Add: VITE_RELAY_URL = wss://weather-potato-relay.up.railway.app

# 4. Update ESP32
# In src/main.cpp line ~1420:
# wsClient.begin("weather-potato-relay.up.railway.app", 443, "/", "wss");

# 5. Flash ESP32
cd ..
pio run --target upload

# 6. Test on iOS
# Open https://your-pwa.vercel.app
# Should see weather data!
```

---

## Troubleshooting

### Issue: "Can't I just deploy everything to Vercel?"

**Answer:** Technically yes, but not recommended because:
- Vercel Edge WebSockets are experimental
- Cold starts cause device disconnections
- Device registry resets frequently
- Connection timeouts unpredictable

Railway/Render are **designed** for WebSocket servers, while Vercel is designed for static sites and serverless functions.

### Issue: "I don't want to use two platforms"

**Options:**
1. **Use Railway for BOTH** (relay + PWA)
   - Railway can host static sites too
   - Less convenient than Vercel for PWA
   - But everything in one place

2. **Use Render for BOTH** (relay + PWA)
   - Same as Railway option
   - Render has good static site support

3. **Use Fly.io for BOTH** (relay + PWA)
   - More complex setup
   - Requires Docker
   - But very reliable

**Recommendation:** Stick with Vercel (PWA) + Railway (relay). It's the sweet spot of simplicity and reliability.

---

## Cost Analysis

### Vercel PWA + Railway Relay (Recommended)

| Component | Platform | Cost |
|-----------|----------|------|
| PWA | Vercel | Free |
| Relay | Railway | Free (500 hrs) |
| **Total** | | **$0/month** |

If you exceed limits:
- Railway Hobby: $5/month (unlimited hours)
- Vercel Pro: $20/month (team features, not needed for this)

**Most users stay free indefinitely.**

---

## Final Recommendation

✅ **Deploy relay to Railway, keep PWA on Vercel**

This gives you:
- Best performance
- Best reliability
- Easiest setup
- Production-ready
- Free tier sufficient for most uses

Only use Vercel Edge if:
- You're experimenting
- You don't mind cold start issues
- Your ESP32 can handle re-registration
- You want everything on one platform (for learning)

**For production iOS support:** Railway relay is the way to go! 🚀
