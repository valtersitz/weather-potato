#!/bin/bash
# Quick start script for local relay server testing

echo "🥔 Weather Potato - Local Relay Server Setup"
echo "============================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"
echo ""

# Check if we're in the relay-server directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "   Please run this script from the relay-server directory:"
    echo "   cd relay-server && ./start-local.sh"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Get local IP address
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}')
else
    # Windows/other
    LOCAL_IP="localhost"
fi

echo "🚀 Starting relay server..."
echo ""
echo "📍 Local Network Access:"
echo "   WebSocket URL: ws://${LOCAL_IP}:3000"
echo "   (Use this IP in ESP32 main.cpp)"
echo ""
echo "📍 Localhost Access:"
echo "   WebSocket URL: ws://localhost:3000"
echo "   (For PWA on same machine)"
echo ""
echo "🔧 Next Steps:"
echo "   1. Update ESP32 main.cpp line ~1420:"
echo "      wsClient.begin(\"${LOCAL_IP}\", 3000, \"/\");"
echo ""
echo "   2. Update PWApp/.env.development:"
echo "      VITE_RELAY_URL=ws://localhost:3000"
echo ""
echo "   3. Flash ESP32 and start PWA dev server"
echo ""
echo "📊 Server logs will appear below..."
echo "============================================="
echo ""

# Start the server
npm start
