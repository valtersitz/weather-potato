#!/bin/bash
# Convert PEM certificates to C++ header file

echo "🔄 Converting certificates to C++ header..."

# Create header file
cat > src/server_cert.h << 'EOF'
#ifndef SERVER_CERT_H
#define SERVER_CERT_H

// Self-signed certificate for HTTPS server
// Valid for 10 years from generation date
// Users must accept security warning once in browser

const char* server_cert = R"EOF(
EOF

# Add certificate content
cat server_cert.pem >> src/server_cert.h

# Continue header file
cat >> src/server_cert.h << 'EOF'
)EOF";

const char* server_key = R"EOF(
EOF

# Add key content
cat server_key.pem >> src/server_cert.h

# Finish header file
cat >> src/server_cert.h << 'EOF'
)EOF";

#endif // SERVER_CERT_H
EOF

echo "✅ Header file created: src/server_cert.h"
echo ""
echo "🔧 Next: Update platformio.ini to add HTTPS library"
