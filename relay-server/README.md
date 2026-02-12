# Weather Potato WebSocket Relay Server

This relay server enables the Weather Potato PWA (served over HTTPS) to communicate with ESP32 devices (HTTP only) on local networks, solving iOS Mixed Content Blocking issues.

## Architecture

```
PWA (HTTPS) ←→ Relay Server (WSS) ←→ ESP32 Device (WS)
```

## Local Development

```bash
npm install
npm start
```

Server will run on `ws://localhost:3000`

## Deployment

### Option 1: Railway.app (Recommended)
1. Push code to GitHub
2. Create new project on Railway
3. Deploy from GitHub
4. Railway auto-detects Node.js and provides WSS URL

### Option 2: Render.com
1. Create new Web Service
2. Connect repository
3. Build command: `npm install`
4. Start command: `npm start`

### Option 3: Docker

```bash
docker build -t weather-potato-relay .
docker run -p 3000:3000 weather-potato-relay
```

## Environment Variables

- `PORT` - Server port (default: 3000)

## Protocol

### ESP32 → Relay (Registration)
```json
{
  "type": "register",
  "device_id": "AABBCCDD",
  "firmware_version": "1.0.0"
}
```

### PWA → Relay → ESP32 (Request)
```json
{
  "id": "uuid",
  "type": "request",
  "device_id": "AABBCCDD",
  "method": "GET",
  "path": "/weather",
  "body": null
}
```

### ESP32 → Relay → PWA (Response)
```json
{
  "id": "uuid",
  "type": "response",
  "status": 200,
  "data": { ... }
}
```
