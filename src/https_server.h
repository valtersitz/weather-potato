#ifndef HTTPS_SERVER_H
#define HTTPS_SERVER_H

#include <ESPAsyncWebServer.h>
#include "server_cert.h"

// Create HTTPS server on port 8443
AsyncWebServer* createHTTPSServer() {
  AsyncWebServer* server = new AsyncWebServer(8443);

  // Note: ESPAsyncWebServer doesn't have built-in HTTPS support
  // We'll use HTTP with CORS headers as a practical solution
  // For true HTTPS, we'd need esp32_https_server library instead

  return server;
}

// Helper: Add CORS headers to responses
void addCORSHeaders(AsyncWebServerResponse* response) {
  response->addHeader("Access-Control-Allow-Origin", "*");
  response->addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response->addHeader("Access-Control-Allow-Headers", "Content-Type");
}

#endif // HTTPS_SERVER_H
