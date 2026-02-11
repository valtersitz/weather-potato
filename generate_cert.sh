#!/bin/bash
# Generate self-signed certificate for Weather Potato HTTPS server

echo "🔐 Generating self-signed certificate for Weather Potato..."

# Generate private key and certificate
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout server_key.pem \
  -out server_cert.pem \
  -subj "/C=FR/ST=IDF/L=Paris/O=WeatherPotato/CN=weatherpotato.local"

echo "✅ Certificate generated!"
echo ""
echo "📄 Files created:"
echo "  - server_key.pem (private key)"
echo "  - server_cert.pem (certificate)"
echo ""
echo "⚠️  Users will see a security warning and must click 'Advanced' → 'Proceed' once"
echo ""
echo "🔧 Next step: Convert to C++ header with:"
echo "   ./convert_cert_to_header.sh"
