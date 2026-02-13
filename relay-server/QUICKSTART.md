# Quick Deploy to Vercel

## Prerequisites
- Vercel account (free): https://vercel.com/signup
- Vercel CLI installed

## Deploy in 3 Commands

```bash
# 1. Install Vercel CLI (if not installed)
npm i -g vercel

# 2. Deploy from relay-server directory
cd relay-server
vercel --prod

# 3. Follow prompts:
#    - Login to Vercel
#    - Link to existing project or create new
#    - Accept defaults
```

## After Deployment

You'll get a URL like:
```
https://weather-potato-relay.vercel.app
```

### Update Your Code:

**1. ESP32 (src/main.cpp line ~1420):**
```cpp
wsClient.begin("weather-potato-relay.vercel.app", 443, "/", "wss");
```

**2. PWA Environment:**

Go to Vercel dashboard → Your PWA project → Settings → Environment Variables:
- Name: `VITE_RELAY_URL`
- Value: `wss://weather-potato-relay.vercel.app`

Or update locally:
```bash
# PWApp/.env.production
VITE_RELAY_URL=wss://weather-potato-relay.vercel.app
```

**3. Test:**
```bash
# Flash ESP32
pio run --target upload && pio device monitor

# Deploy PWA (if needed)
cd PWApp
vercel --prod
```

## Health Check

Test your deployed relay:
```bash
curl https://weather-potato-relay.vercel.app/health
```

Expected response:
```json
{"status":"ok","devices":0,"timestamp":1234567890}
```

## Test WebSocket Connection

Browser console:
```javascript
const ws = new WebSocket('wss://weather-potato-relay.vercel.app');
ws.onopen = () => console.log('✅ Connected!');
ws.onerror = (e) => console.error('❌ Error:', e);
```

## Troubleshooting

**Issue: "Command not found: vercel"**
```bash
npm i -g vercel
```

**Issue: "Login required"**
```bash
vercel login
```

**Issue: ESP32 won't connect**
- Check ESP32 has correct relay URL
- Check relay is deployed (visit /health endpoint)
- Check ESP32 WiFi is connected
- View Vercel logs: `vercel logs` or dashboard

**Issue: PWA shows "Connection Error"**
- Check browser console for WebSocket errors
- Verify VITE_RELAY_URL is set in Vercel env vars
- Redeploy PWA after setting env var

## Next Steps

Once deployed and working:
1. Test on iOS device
2. Test on Android device
3. Monitor Vercel logs for cold starts
4. If too many cold starts → Switch to Railway (see DEPLOYMENT.md)

🎉 **You're ready to test!**
