# Weather Potato PWA

A Progressive Web App for setting up and controlling your Weather Potato IoT device.

## Features

- 🔵 **BLE Connection**: Connect to your Weather Potato via Web Bluetooth
- 📸 **WiFi QR Scanning**: Quick setup by scanning your router's WiFi QR code
- 📍 **GPS Location**: Automatic weather location detection
- 🌐 **Multi-language**: Support for EN, FR, ES, DE
- 🎨 **Fun Design**: Colorful, startup-style interface
- 📱 **PWA**: Install on mobile devices for native app experience

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Modern browser with Web Bluetooth support (Chrome, Edge, Opera)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

The app will be available at `http://localhost:3000`

### Project Structure

```
PWApp/
├── public/              # Static assets
│   ├── manifest.json   # PWA manifest
│   └── sw.js           # Service worker
├── src/
│   ├── components/     # React components
│   │   ├── onboarding/ # Onboarding flow screens
│   │   ├── ui/         # Reusable UI components
│   │   └── animations/ # Animation components
│   ├── services/       # API and BLE services
│   ├── hooks/          # Custom React hooks
│   ├── i18n/           # Translations
│   ├── types/          # TypeScript types
│   ├── utils/          # Helper functions
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
└── package.json
```

## Usage

### Device Onboarding Flow

1. **Scan QR Code**: User scans the QR code on their Weather Potato device
2. **BLE Connection**: App connects via Bluetooth to the device
3. **WiFi Setup**: User scans WiFi QR code or enters credentials manually
4. **Location**: App requests GPS location for weather data
5. **Validation**: Credentials are sent via BLE, device connects to WiFi
6. **Success**: Local HTTP connection is validated and BLE is disabled

### URL Parameters

- `?device=DEVICEID`: Pre-populate device ID (from QR code scan)

Example: `https://app.weatherpotato.com/?device=A3F9B2C1`

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Deploy!

### Environment Variables

Currently no environment variables needed. All configuration is done via BLE or local connection.

## Browser Support

- ✅ Chrome/Edge 56+ (Web Bluetooth)
- ✅ Opera 43+ (Web Bluetooth)
- ⚠️ Safari (No Web Bluetooth - will fall back to manual setup)
- ⚠️ Firefox (No Web Bluetooth - will fall back to manual setup)

## Technical Notes

### WiFi Credentials via BLE

**Important**: Web browsers cannot access the device's current WiFi credentials for security reasons. The recommended flow is:

1. **Primary method**: User scans the WiFi QR code on their router
2. **Fallback**: User manually enters WiFi credentials

The README.md mentions "automatic WiFi credential retrieval" but this is not possible with current web APIs. iOS and Android have native APIs for WiFi sharing, but these are not accessible to web apps.

### BLE Communication

The app uses Web Bluetooth API to communicate with the ESP32. The device must implement these BLE characteristics:

- Service UUID: `12345678-1234-5678-1234-56789abcdef0`
- Device Info: `12345678-1234-5678-1234-56789abcdef1` (read)
- WiFi Config: `12345678-1234-5678-1234-56789abcdef2` (write)
- GPS Config: `12345678-1234-5678-1234-56789abcdef3` (write)
- Status: `12345678-1234-5678-1234-56789abcdef4` (read/notify)

### Device Naming

BLE devices should be named: `Potato-{DEVICEID}` where DEVICEID is derived from the MAC address (first 8 hex chars).

## Contributing

Feel free to open issues or submit pull requests!

## License

MIT
