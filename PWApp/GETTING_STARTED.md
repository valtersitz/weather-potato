# Weather Potato PWA - Getting Started Guide

## 🎉 What's Been Implemented

Your Weather Potato PWA is now complete with these features:

### ✅ Core Features
- **BLE Connection**: Connect to ESP32 via Web Bluetooth API
- **Android WiFi Sharing**: Receive WiFi credentials directly from Android Settings (via Web Share Target API)
- **WiFi QR Scanner**: Scan router QR codes for quick setup
- **Manual WiFi Entry**: Fallback for users without QR codes
- **GPS Location**: Automatic location detection for weather data
- **Multi-language**: English, French, Spanish, German
- **Fun UI**: Colorful, animated interface with confetti celebrations
- **PWA Features**: Installable, works offline, native-like experience

### 🔄 Onboarding Flow

```
1. Scan Device QR Code (gets device ID)
   ↓
2. Connect via BLE
   ↓
3. WiFi Setup (3 options):
   a) Android WiFi Share (easiest on Android)
   b) Scan WiFi QR Code
   c) Manual entry
   ↓
4. GPS Location (automatic or manual)
   ↓
5. Send credentials to ESP32 via BLE
   ↓
6. ESP32 connects to WiFi
   ↓
7. Validate local HTTP connection
   ↓
8. Success! 🎉
```

## 🚀 Installation & Running

### Prerequisites
- Node.js 18+ and npm
- Modern browser (Chrome, Edge, or Opera for BLE support)

### Quick Start

```bash
# Navigate to PWApp directory
cd PWApp

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at: `http://localhost:3000`

### Testing on Mobile

1. **Get your local IP**:
   ```bash
   # On Linux/Mac
   ifconfig | grep inet

   # On Windows
   ipconfig
   ```

2. **Access from mobile**:
   - Make sure mobile is on same WiFi as your computer
   - Open `http://YOUR_IP:3000` in mobile browser

3. **Install as PWA**:
   - On Android Chrome: Menu → "Add to Home screen"
   - On iOS Safari: Share → "Add to Home Screen"

## 📱 Android WiFi Sharing Setup

This is the **easiest method** for Android users!

### Requirements
- Android 10+ device
- PWA must be installed (not just opened in browser)
- Chrome or Edge browser

### How to use:

1. **Install the PWA**:
   - Open the app in Chrome
   - Tap the menu (⋮) → "Install app" or "Add to Home screen"

2. **Share your WiFi**:
   - Open Android Settings → WiFi
   - Tap your connected network
   - Tap "Share" or the QR code icon
   - Select "Weather Potato" from the share menu

3. **Complete setup**:
   - The app will automatically receive WiFi credentials
   - Continue with GPS location
   - Done! 🎉

### What Android sends:
Android shares WiFi in this format:
```
WIFI:S:YourNetworkName;T:WPA;P:YourPassword;;
```

The PWA automatically parses this and extracts SSID and password.

## 🔧 ESP32 Implementation

The ESP32 firmware needs to implement BLE GATT Server. See the detailed guide:

📄 **[ESP32_BLE_REQUIREMENTS.md](./ESP32_BLE_REQUIREMENTS.md)** - Complete implementation guide with code examples

### Quick Summary:

**BLE Service UUID**: `12345678-1234-5678-1234-56789abcdef0`

**Characteristics**:
1. Device Info (READ): Returns device ID and MAC
2. WiFi Config (WRITE): Receives SSID and password
3. GPS Config (WRITE): Receives latitude and longitude
4. Status (READ + NOTIFY): Sends connection status updates

**Device Naming**: `Potato-{DEVICE_ID}`
- Device ID = First 8 chars of MAC address (uppercase, no colons)
- Example: MAC `AA:BB:CC:DD:EE:FF` → Name `Potato-AABBCCDD`

## 🏗️ Project Structure

```
PWApp/
├── public/
│   ├── manifest.json          # PWA manifest with share_target
│   ├── sw.js                  # Service worker
│   └── potato.svg             # App icon
├── src/
│   ├── components/
│   │   ├── onboarding/        # Onboarding flow screens
│   │   │   ├── WelcomeScreen.tsx
│   │   │   ├── BLEConnection.tsx
│   │   │   ├── AndroidWiFiShareGuide.tsx  # NEW!
│   │   │   ├── WiFiQRScanner.tsx
│   │   │   ├── ManualWiFiEntry.tsx
│   │   │   ├── LocationSetup.tsx
│   │   │   ├── ValidationScreen.tsx
│   │   │   └── SuccessScreen.tsx
│   │   ├── ui/                # Reusable UI components
│   │   └── animations/        # Fun animations
│   ├── services/
│   │   ├── bluetoothService.ts      # BLE communication
│   │   ├── wifiShareService.ts      # Android WiFi share handling (NEW!)
│   │   ├── geolocationService.ts    # GPS handling
│   │   └── localConnectionService.ts # HTTP validation
│   ├── hooks/
│   │   └── useI18n.ts         # Multi-language hook
│   ├── i18n/
│   │   └── translations.ts    # EN/FR/ES/DE translations
│   ├── App.tsx                # Main app with routing
│   └── main.tsx               # Entry point
└── package.json
```

## 🌐 Deployment to Vercel

### One-time Setup

1. **Create Vercel account**: https://vercel.com

2. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

3. **Login to Vercel**:
   ```bash
   vercel login
   ```

### Deploy

```bash
# From PWApp directory
npm run build
vercel --prod
```

### Configuration

Vercel will auto-detect Vite and configure:
- Build Command: `npm run build`
- Output Directory: `dist`

### Custom Domain

In Vercel dashboard:
1. Go to your project settings
2. Domains → Add Domain
3. Add `app.weatherpotato.com`
4. Update DNS records as shown

## 🧪 Testing Flow

### 1. Test BLE (without ESP32)
The app will show BLE connection screen, but you'll need an actual ESP32 to proceed.

### 2. Test Android WiFi Share
1. Install PWA on Android
2. Try sharing WiFi from Settings
3. Check browser console for logs

### 3. Test WiFi QR Scanner
You can test with any WiFi QR code in this format:
```
WIFI:S:TestNetwork;T:WPA;P:TestPassword123;;
```

Generate a test QR code: https://qifi.org/

### 4. Test Full Flow (with ESP32)
1. Flash ESP32 with BLE code
2. Generate device QR code: `https://app.weatherpotato.com/?device=AABBCCDD`
3. Scan QR code with mobile
4. Complete onboarding flow

## 🐛 Troubleshooting

### BLE Not Working
- **Chrome/Edge only**: Safari and Firefox don't support Web Bluetooth
- **HTTPS required**: BLE only works on HTTPS (except localhost)
- **Permissions**: Check browser permissions for Bluetooth

### Android WiFi Share Not Appearing
- **PWA not installed**: Must be installed, not just opened in browser
- **Wrong browser**: Use Chrome or Edge
- **Android version**: Requires Android 10+

### QR Scanner Not Working
- **Camera permission**: Check browser permissions
- **HTTPS required**: Camera access requires HTTPS (except localhost)
- **Bad lighting**: Ensure good lighting for QR scan

### Console Errors
Open browser DevTools (F12) to see detailed error logs.

## 📝 URL Parameters

### Device ID
```
https://app.weatherpotato.com/?device=AABBCCDD
```

This pre-populates the device ID from QR code scan.

## 🔐 Security Notes

⚠️ **Important**: Current implementation transmits WiFi passwords in plain text over BLE.

**Mitigations**:
- BLE has limited range (~10 meters)
- BLE is disabled after setup
- Setup should happen in trusted environment

**For Production**:
- Implement BLE pairing/bonding
- Use encrypted characteristics
- Add PIN verification

## 📚 Additional Documentation

- **[PWA_README.md](./PWA_README.md)** - General PWA documentation
- **[ESP32_BLE_REQUIREMENTS.md](./ESP32_BLE_REQUIREMENTS.md)** - Detailed ESP32 BLE guide
- **[README.md](./README.md)** - Original specification document

## 🎨 Customization

### Colors
Edit `tailwind.config.js` to customize colors:
```js
colors: {
  primary: '#FF6B6B',  // Change this!
  secondary: '#4ECDC4', // And this!
  // ...
}
```

### Translations
Add or modify translations in `src/i18n/translations.ts`

### Animations
Customize animations in `src/index.css`

## 🚧 Known Limitations

1. **Web Bluetooth**:
   - Only works in Chrome, Edge, Opera
   - Requires HTTPS (except localhost)
   - Not available on iOS

2. **WiFi Auto-Share**:
   - Android 10+ only
   - Requires PWA installation
   - iOS doesn't support this via web

3. **QR Scanner**:
   - Requires camera permissions
   - May not work in all lighting conditions

## 🎯 Next Steps

1. ✅ **Test the PWA** locally
2. ⏳ **Implement BLE on ESP32** (see ESP32_BLE_REQUIREMENTS.md)
3. ⏳ **Generate device QR codes** for each Weather Potato
4. ⏳ **Deploy to Vercel**
5. ⏳ **Test complete flow** with real hardware

## 💡 Tips

- **Mobile testing**: Use Chrome DevTools remote debugging
- **BLE debugging**: Use "nRF Connect" app to test ESP32 first
- **Console logs**: Check browser console for detailed debug info
- **Network debugging**: Use browser Network tab to see HTTP requests

## 🤝 Support

If you encounter issues:
1. Check browser console for errors
2. Verify ESP32 BLE implementation
3. Test with nRF Connect app
4. Check WiFi/BLE permissions

---

**Have fun building your Weather Potato! 🥔🌤️**
