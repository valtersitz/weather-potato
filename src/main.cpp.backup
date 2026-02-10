#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Adafruit_NeoPixel.h>
#include "driver/ledc.h"
#include "esp_err.h"
#include <Wire.h>
#include <ArduinoJson.h>
#include <time.h>
#include "root_ca.h"
#include <WebServer.h>
#include <Update.h>


#define WIFI_SSID ""
#define WIFI_PASSWORD ""
// Mode AP et Station
const char* apSSID = "myWeatherPotato"; // Nom de l'AP
const char* apPassword = "P0tat000"; // Mot de passe de l'AP
// #define API_URL "https://api.meteomatics.com/2024-10-18T12:00:00Z/weather_code_15min:idx/48.9075,2.3833/json"// "https://api.meteomatics.com/"
// #define USER "your_username"
// #define PASSWORD "your_password"
// #define LOCATION "your_location"
#define LED_PIN 12
#define NUM_LEDS 12
#define CAP_SENSOR_PIN 15

#define BUZZER_PIN 21
#define BUZZER_CHANNEL LEDC_CHANNEL_0 // Canal LEDC pour le buzzer
#define BUZZER_TIMER LEDC_TIMER_0     // Timer LEDC pour le buzzer
#define BUZZER_MODE LEDC_LOW_SPEED_MODE
#define BUZZER_FREQUENCY 2000         // Fréquence initiale du buzzer
#define BUZZER_RESOLUTION LEDC_TIMER_8_BIT // Résolution en bits (0-255)

float latitude = 48.9075;  // Par défaut : Aubervilliers 48.9075
float longitude = 2.3833; // Par défaut : Aubervilliers 2.3833


// Stockage des informations utilisateur
String wifiSSID = "";
String wifiPassword = "";
String geoLocation = ""; // Adresse ou coordonnées GPS
String lastWeatherCondition = "Unknown"; // Dernière condition météo
int lastTemperature = 0;
struct tm timeinfo;



// Créer un serveur HTTP pour OTA
WebServer server(80);
// // HTML simple pour l'interface OTA
// const char* updatePage = R"rawliteral(
// <!DOCTYPE html>
// <html>
// <head>
//     <title>ESP32 OTA</title>
// </head>
// <body>
//     <h1>ESP32 OTA Update</h1>
//     <form method="POST" action="/update" enctype="multipart/form-data">
//         <input type="file" name="firmware">
//         <input type="submit" value="Update">
//     </form>
// </body>
// </html>
// )rawliteral";

Adafruit_NeoPixel strip = Adafruit_NeoPixel(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);
int weatherSymbol;
int currentTemperature;

void setupWiFi();
void connectToWiFi();
void getWeatherForecast(int &code, int &temperature);
// int parseWeatherCode(String payload);
void parseWeatherSymbol(JsonDocument &doc, int &code, int &temperature);
// void playTone(String weatherCondition);
void playToneIfNecessary(String weatherCondition);
void setLEDRGB(int temperature);
void interpretWeatherSymbol(int code, int temperature);
void handleRootPage();
void handleConfigSubmission();
void handleLocationSubmission();
void handleOTAPage();
void handleOTAUpdate();


// Informations Meteomatics API
String apiUser = "myself_pro_card";
String apiPass = "j4G22VmrUE";
String apiUrlBase = "https://api.meteomatics.com/";

const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 3600; // France GMT+1
const int   daylightOffset_sec = 3600; // Heure d'été

bool animationActive = false; // Indique si une animation est en cours


// Variables globales pour gérer le buzzer
static unsigned long lastToneTime = 0;
bool isToneActive = false;        // Indique si un son est actif
unsigned long toneStartTime = 0;  // Timestamp du début de la tonalité
uint32_t toneDuration = 0;        // Durée actuelle du son
uint32_t toneFrequency = 0;       // Fréquence actuelle du son




void setup() {
  Serial.begin(115200);
  pinMode(CAP_SENSOR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // Initialisation NeoPixel
  strip.begin();
  strip.show(); // Éteindre toutes les LEDs au démarrage
  strip.setBrightness(50); // Ajuste la luminosité (0-255)

  // Test d'allumage simple
  strip.setPixelColor(0, strip.Color(255, 0, 0)); // Première LED en rouge
  strip.show();
  delay(1000);
  strip.setPixelColor(0, strip.Color(0, 0, 0)); // Éteindre
  strip.show();

  // Configuration du timer LEDC pour le buzzer
  ledc_timer_config_t ledc_timer = {
      .speed_mode = BUZZER_MODE,
      .duty_resolution = BUZZER_RESOLUTION,
      .timer_num = BUZZER_TIMER,
      .freq_hz = BUZZER_FREQUENCY,
      .clk_cfg = LEDC_AUTO_CLK
  };
  ESP_ERROR_CHECK(ledc_timer_config(&ledc_timer));
   // Configuration du canal LEDC pour le buzzer
  ledc_channel_config_t ledc_channel = {
      .gpio_num = BUZZER_PIN,
      .speed_mode = BUZZER_MODE,
      .channel = BUZZER_CHANNEL,
      .intr_type = LEDC_INTR_DISABLE,
      .timer_sel = BUZZER_TIMER,
      .duty = 0, // Duty cycle initial (0 = éteint)
      .hpoint = 0
  };
  ESP_ERROR_CHECK(ledc_channel_config(&ledc_channel));

  Serial.println("Setup complete.");

  setupWiFi();
  connectToWiFi();

}

// void loop() {
//   if (digitalRead(CAP_SENSOR_PIN) == HIGH) {
//     Serial.println("Capacitive touch detected!");
//     getWeatherForecast(weatherSymbol, currentTemperature);
//     // Interpréter le code météo et ajuster la LED et le buzzer
//     interpretWeatherSymbol(weatherSymbol, currentTemperature);
//     delay(10000); // Wait 10 seconds before allowing another check
//   }
// }

// void loop() {
//     static unsigned long lastTouchTime = 0; // Timestamp of the last touch detection
//     static bool animationRunning = false;  // Indique si l'animation est en cours
//     unsigned long currentTime = millis();

//     // Vérifier si le capteur capacitif est touché
//     if (digitalRead(CAP_SENSOR_PIN) == HIGH) {
//         if (!animationRunning && (currentTime - lastTouchTime > 10000)) { // Détecter une nouvelle pression après un délai
//             Serial.println("Capacitive touch detected!");

//             // Obtenir les prévisions météo
//             getWeatherForecast(weatherSymbol, currentTemperature);

//             // Interpréter le symbole météo et ajuster LED et buzzer
//             interpretWeatherSymbol(weatherSymbol, currentTemperature);

//             // Démarrer l'animation
//             animationRunning = true;
//             lastTouchTime = currentTime;
//         }
//     }

//     // Continuer l'animation si elle est active
//     if (animationRunning) {
//         setLEDRGB(currentTemperature);

//         // Vérifier si l'animation est terminée
//         if (!animationActive) { // La variable `animationActive` est définie dans `setLEDRGB`
//             animationRunning = false; // Arrêter l'animation
//             Serial.println("Animation ended.");
//         }
//     }
// }

// void loop() {
//     static unsigned long lastTouchTime = 0; // Timestamp of the last touch detection
//     static bool animationRunning = false;  // Indique si l'animation est en cours
//     unsigned long currentTime = millis();

//     Serial.print("At end of setLED - Updating LEDs with temperature: ");
//     Serial.println(temperature);

//     // Vérifier si le capteur capacitif est touché
//     if (digitalRead(CAP_SENSOR_PIN) == HIGH) {
//         if (!animationRunning && (currentTime - lastTouchTime > 10000)) { // Détecter une nouvelle pression après un délai
//             Serial.println("Capacitive touch detected!");

//             // Obtenir les prévisions météo
//             getWeatherForecast(weatherSymbol, currentTemperature);

//             // Interpréter le symbole météo et ajuster LED et buzzer
//             interpretWeatherSymbol(weatherSymbol, currentTemperature);

//             // Arrêter les tonalités pour éviter les conflits
//             noTone(BUZZER_PIN);

//             // Démarrer l'animation
//             setLEDRGB(currentTemperature);

//             animationRunning = true;
//             lastTouchTime = currentTime;
//         }
//     }

//     // Continuer l'animation si elle est active
//     if (animationRunning) {
//         setLEDRGB(currentTemperature);

//         // Vérifier si l'animation est terminée
//         if (!animationActive) { // La variable `animationActive` est définie dans `setLEDRGB`
//             animationRunning = false; // Arrêter l'animation
//             Serial.println("Animation ended.");
//         }
//     }
// }

void loop() {
    if(!getLocalTime(&timeinfo)){
        // Initialiser l'heure avec NTP
        configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
        delay(1000); // Laisser le temps de la synchronisation
    }
     
    server.handleClient(); // Gérer les requêtes entrantes


    static unsigned long lastTouchTime = 0; // Dernier moment où le capteur a été touché
    unsigned long currentTime = millis();

    // Vérifier si le capteur capacitif est touché
    if (digitalRead(CAP_SENSOR_PIN) == HIGH) {
        if (!animationActive && (currentTime - lastTouchTime > 10000)) {
            Serial.println("Capacitive touch detected!");

            // Obtenir les prévisions météo
            getWeatherForecast(weatherSymbol, currentTemperature);

            // Interpréter le symbole météo
            interpretWeatherSymbol(weatherSymbol, currentTemperature);

            // Lancer l'animation LED
            setLEDRGB(currentTemperature);
            

            // Mettre à jour le dernier temps de touche
            lastTouchTime = currentTime;
        }
    }

    // Continuer l'animation si elle est active
    if (animationActive) {
        setLEDRGB(currentTemperature);
    }

    // Appeler `playToneIfNecessary` pour vérifier l'arrêt du son
    playToneIfNecessary(""); // Appelle avec la condition actuelle
}




void setupWiFi() {
 // Activer le mode Access Point
  WiFi.softAP(apSSID, apPassword);
  IPAddress ip = WiFi.softAPIP();
  Serial.print("Access Point IP: ");
  Serial.println(ip);
  
  // setting up OTA
  Serial.println(WiFi.localIP());
//   // Configurer les routes OTA
//     server.on("/", HTTP_GET, []() {
//         server.send(200, "text/html", updatePage);
//     });

//     server.on("/update", HTTP_POST, []() {
//         server.sendHeader("Connection", "close");
//         server.send(200, "text/plain", (Update.hasError()) ? "Update Failed!" : "Update Successful. Rebooting...");
//         delay(100);
//         ESP.restart();
//     }, []() {
//         HTTPUpload& upload = server.upload();
//         if (upload.status == UPLOAD_FILE_START) {
//             Serial.printf("Update: %s\n", upload.filename.c_str());
//             if (!Update.begin(UPDATE_SIZE_UNKNOWN)) {
//                 Update.printError(Serial);
//             }
//         } else if (upload.status == UPLOAD_FILE_WRITE) {
//             if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) {
//                 Update.printError(Serial);
//             }
//         } else if (upload.status == UPLOAD_FILE_END) {
//             if (Update.end(true)) {
//                 Serial.printf("Update Success: %u\nRebooting...\n", upload.totalSize);
//             } else {
//                 Update.printError(Serial);
//             }
//         }
//     });

    // Configurer les routes pour la page web
    server.on("/", HTTP_GET, handleRootPage);
    server.on("/config", HTTP_POST, handleConfigSubmission);
    server.on("/location", HTTP_POST, handleLocationSubmission);
    server.on("/ota", HTTP_GET, handleOTAPage);  // Page OTA
    server.on("/otaUpdate", HTTP_POST, handleOTAUpdate); // Endpoint OTA

    // Démarrer le serveur
    server.begin();
    Serial.println("HTTP Server Started");


}


void connectToWiFi() {


  if (WiFi.status() != WL_CONNECTED) {
    // WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    WiFi.begin(wifiSSID, wifiPassword);
    Serial.println("Connecting to WiFi...");
    delay(1000);
  }
  else 
  {
    Serial.println("Connected to WiFi");
  }
}

String getCurrentISOTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Failed to obtain time");
    return "2024-10-18T12:00:00Z"; // Valeur par défaut
  }
  
  // Formater l'heure dans le format ISO8601
  char isoTime[30];
  strftime(isoTime, sizeof(isoTime), "%Y-%m-%dT%H:%M:%SZ", &timeinfo); 
  return String(isoTime);
}


// Page principale
void handleRootPage() {
    String html = R"rawliteral(
        <!DOCTYPE html>
        <html>
        <head>
            <title>myWeatherPotato Config</title>
        </head>
        <body>
            <h1>Configuration de la Weather Potato</h1>
            <form action="/config" method="POST">
                // <label for="ssid">Nom du WiFi (SSID):</label><br>
                // <input type="text" id="ssid" name="ssid" value=""><br><br>
                // <label for="password">Mot de passe WiFi:</label><br>
                // <input type="password" id="password" name="password" value=""><br><br>
                <label for="latitude">Latitude :</label><br>
                <input type="text" id="latitude" name="latitude" value=""><br><br>
                <label for="longitude">Longitude :</label><br>
                <input type="text" id="longitude" name="longitude" value=""><br><br>
                <input type="submit" value="Mettre à jour">
            </form>
            <hr>
            <h2>Donnees actuelles</h2>
            <p><b>Dernier code meteo:</b> %WEATHER%</p>x
            <p><b>Temperature:</b> %TEMP%°C</p>
            <p><b>Adresse IP locale:</b> %IP%</p>
            <hr>
            <h2>OTA Update</h2>
            <p><a href="/ota">Cliquez ici pour mettre a jour le firmware</a></p>
        </body>
        </html>
    )rawliteral";

    // Remplacer les valeurs dynamiques
    html.replace("%WEATHER%", lastWeatherCondition);
    html.replace("%TEMP%", String(lastTemperature));
    html.replace("%IP%", WiFi.localIP().toString());

    server.send(200, "text/html", html);
}

// Gestion du formulaire
void handleConfigSubmission() {
    if (server.hasArg("ssid") && server.hasArg("password")) {
        wifiSSID = server.arg("ssid");
        wifiPassword = server.arg("password");

        Serial.println("WiFi SSID: " + wifiSSID);
        Serial.println("WiFi Password: " + wifiPassword);
        connectToWiFi();


        server.send(200, "text/plain", "Données mises à jour! Revenir à la page principale.");
    }else {
        server.send(400, "text/plain", "Erreur: donnees manquantes.");
    }
    
}
    
void handleLocationSubmission() {
    if (server.hasArg("latitude") && server.hasArg("longitude")) {
        latitude = server.arg("latitude").toFloat();
        longitude = server.arg("longitude").toFloat();

        Serial.printf("Geolocation: %d , %d\n", latitude, longitude);

        server.send(200, "text/plain", "Données mises à jour! Revenir à la page principale.");


    }else {
        server.send(400, "text/plain", "Erreur: donnees manquantes.");
    }
}

// Page OTA
void handleOTAPage() {
    String html = R"rawliteral(
        <!DOCTYPE html>
        <html>
        <head>
            <title>ESP32 OTA</title>
        </head>
        <body>
            <h1>Mise à jour OTA</h1>
            <form method="POST" action="/otaUpdate" enctype="multipart/form-data">
                <input type="file" name="firmware">
                <input type="submit" value="Mettre à jour">
            </form>
        </body>
        </html>
    )rawliteral";

    server.send(200, "text/html", html);
}

// Gestion de l'upload OTA
void handleOTAUpdate() {
    HTTPUpload& upload = server.upload();

    if (upload.status == UPLOAD_FILE_START) {
        Serial.printf("Update: %s\n", upload.filename.c_str());
        if (!Update.begin(UPDATE_SIZE_UNKNOWN)) {
            Update.printError(Serial);
        }
    } else if (upload.status == UPLOAD_FILE_WRITE) {
        if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) {
            Update.printError(Serial);
        }
    } else if (upload.status == UPLOAD_FILE_END) {
        if (Update.end(true)) {
            Serial.printf("Update Success: %u bytes\n", upload.totalSize);
            server.send(200, "text/plain", "Mise à jour réussie! Redémarrage...");
            delay(100);
            ESP.restart();
        } else {
            Update.printError(Serial);
            server.send(500, "text/plain", "Échec de la mise à jour.");
        }
    } else {
        server.send(500, "text/plain", "Erreur lors du téléversement.");
    }
}


// Fonction de codage Base64
String encodeBase64(String input) {
  const char base64_chars[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  String encoded = "";
  int i = 0, j = 0;
  unsigned char char_array_3[3], char_array_4[4];

  for (size_t n = 0; n < input.length(); n++) {
    char_array_3[i++] = input[n];
    if (i == 3) {
      char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
      char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
      char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
      char_array_4[3] = char_array_3[2] & 0x3f;

      for (i = 0; (i < 4); i++)
        encoded += base64_chars[char_array_4[i]];
      i = 0;
    }
  }

  if (i) {
    for (j = i; j < 3; j++)
      char_array_3[j] = '\0';

    char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
    char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
    char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
    char_array_4[3] = char_array_3[2] & 0x3f;

    for (j = 0; (j < i + 1); j++)
      encoded += base64_chars[char_array_4[j]];

    while ((i++ < 3))
      encoded += '=';
  }

  return encoded;
}


void getWeatherForecast(int &code, int &temperature) {
    // Configuration de la requête HTTP
  if (WiFi.status() == WL_CONNECTED) {
    
    // WiFiClientSecure client;
    // client.setCACert(root_ca);  // Ajoutez le certificat ici
    
    HTTPClient http;

    // Obtenir l'heure actuelle au format ISO8601
    String currentISOTime = getCurrentISOTime();
    
    // String url = API_URL + String(USER) + ":" + String(PASSWORD) + "/weather_code_0h:idx/" + String(LOCATION) + "/json";
    
    // Construire l'URL complète
    // String apiUrl = apiUrlBase + currentISOTime + "/t_2m:C,weather_symbol_1h:idx/48.9075,2.3833/json?model=mix"; //Aubervilliers
    String apiUrl = apiUrlBase + currentISOTime + "/t_2m:C,weather_symbol_1h:idx/" + String(latitude, 6) + "," + String(longitude, 6) + "/json?model=mix";
    // Authentification
    String auth = apiUser + ":" + apiPass;
    // String encodedAuth = base64::encode(auth); // requires base64.h which is not compatible with Linux
    String encodedAuth = encodeBase64(auth);
    Serial.println("Encodage Base64: " + encodedAuth);
    Serial.println("apiURL: " + apiUrl);

    // http.setInsecure(); 
    http.begin(apiUrl);
    http.addHeader("Authorization", "Basic " + encodedAuth);

    // Envoi de la requête et réception de la réponse
    int httpResponseCode = http.GET();
    if (httpResponseCode > 0) {
        String payload = http.getString();
        
        // Créer le document JSON
        StaticJsonDocument<1024> doc;
        DeserializationError error = deserializeJson(doc, payload);
        
        if (!error) {
            parseWeatherSymbol(doc, code, temperature); // Appel mis à jour
            Serial.printf("Code météo: %d, Température: %d°C\n", code, temperature);
        } else {
            Serial.println("Erreur de désérialisation JSON");
            Serial.printf("Code météo: %d, Température: %d°C\n", code, temperature);
        }
    } else {
        Serial.printf("Erreur HTTP: %d\n", httpResponseCode);
        Serial.println(httpResponseCode);  // Afficher le code d'erreur HTTP
        Serial.println(http.errorToString(httpResponseCode).c_str());
        Serial.println("Current ISO time: " +currentISOTime);
        Serial.println("API URL: " + apiUrl);
        Serial.println("Auth: " + auth);


    }
    
    http.end(); // Terminer la connexion

  } else {
    Serial.println("WiFi not connected");
  }
}    


void parseWeatherSymbol(JsonDocument &doc, int &code, int &temperature) {
    // Initialiser les variables à des valeurs par défaut
    code = -1;  // Code météo par défaut
    temperature = -999;  // Température par défaut (valeur inhabituelle pour identifier une erreur)
    
    // Parcourir les données dans le JSON
    JsonArray dataArray = doc["data"];
    
    for (JsonObject dataObject : dataArray) {
        const char* parameter = dataObject["parameter"];
        
        // Vérifier si on traite la température (t_2m:C)
        if (strcmp(parameter, "t_2m:C") == 0) {
            // Extraire la température
            temperature = dataObject["coordinates"][0]["dates"][0]["value"];
        }
        
        // Vérifier si on traite le code météo (weather_code_1h:idx)
        if (strcmp(parameter, "weather_symbol_1h:idx") == 0) {
            // Extraire le code météo
            code = dataObject["coordinates"][0]["dates"][0]["value"];
            Serial.println(code);  // Afficher le symbol meteo

        }
    }
    lastTemperature = temperature;
}

// void interpretWeatherCode(int weatherCode) {
//   switch (weatherCode) {
//     case 0: // Clear sky
//       Serial.println("Clear sky expected.");
//       strip.setPixelColor(0, strip.Color(0, 0, 255)); // Blue for clear sky
//       tone(BUZZER_PIN, 1000, 1000);
//       break;
//     case 1: // Light rain
//       Serial.println("Light rain expected.");
//       strip.setPixelColor(0, strip.Color(0, 255, 0)); // Green for light rain
//       tone(BUZZER_PIN, 1500, 1000);
//       break;
//     case 2: // Moderate rain
//       Serial.println("Moderate rain expected.");
//       strip.setPixelColor(0, strip.Color(255, 255, 0)); // Yellow for moderate rain
//       tone(BUZZER_PIN, 2000, 1000);
//       break;
//     case 3: // Heavy rain
//       Serial.println("Heavy rain expected.");
//       strip.setPixelColor(0, strip.Color(255, 0, 0)); // Red for heavy rain
//       tone(BUZZER_PIN, 2500, 1000);
//       break;
//     default:
//       Serial.println("Unknown weather code.");
//       break;
//   }
//   strip.show();
// }

// THIS ONE
// void setLEDRGB(int temperature) {
//     static unsigned long animationStartTime = 0; // Temps de début de l'animation
//     static unsigned long lastUpdateTime = 0;    // Dernière mise à jour
//     static int animationStep = 0;               // Étape actuelle dans l'animation
//     static bool animationActive = false;        // Animation en cours ou non
//     const unsigned long animationDuration = 10000; // Durée totale (10 secondes)
//     const unsigned long updateInterval = 100;     // Intervalle entre les mises à jour (100 ms)

//     unsigned long currentTime = millis();

//     // Débuter l'animation si elle n'est pas active
//     if (!animationActive) {
//         Serial.println("Starting animation...");
//         animationStartTime = currentTime;
//         lastUpdateTime = currentTime;
//         animationStep = 0;
//         animationActive = true;
//     }

//     // Terminer l'animation après 10 secondes
//     if (currentTime - animationStartTime >= animationDuration) {
//         Serial.println("Ending animation...");
//         for (int i = 0; i < NUM_LEDS; i++) {
//             strip.setPixelColor(i, strip.Color(0, 0, 0)); // Éteindre toutes les LEDs
//         }
//         strip.show();
//         animationActive = false; // Fin de l'animation
//         return;
//     }

//     // Ne mettre à jour que toutes les 100ms
//     if (currentTime - lastUpdateTime >= updateInterval) {
//         lastUpdateTime = currentTime;

//         // Couleur interpolée selon la température
//         int red, green, blue;
//         if (temperature <= 0) {
//             red = 0;
//             green = 0;
//             blue = map(temperature, -10, 0, 128, 255);
//         } else if (temperature > 0 && temperature <= 15) {
//             red = 0;
//             green = map(temperature, 0, 15, 128, 255);
//             blue = map(temperature, 0, 15, 255, 128);
//         } else if (temperature > 15 && temperature <= 25) {
//             red = 0;
//             green = map(temperature, 15, 25, 200, 255);
//             blue = 0;
//         } else if (temperature > 25 && temperature <= 35) {
//             red = map(temperature, 25, 35, 255, 255);
//             green = map(temperature, 25, 35, 255, 128);
//             blue = 0;
//         } else {
//             red = map(temperature, 35, 45, 255, 128);
//             green = 0;
//             blue = 0;
//         }

//         // Animation tournante avec un gradient
//         for (int i = 0; i < NUM_LEDS; i++) {
//             float factor = 1.0 - (((i + animationStep) % NUM_LEDS) / (float)NUM_LEDS);
//             int adjustedRed = red * factor;
//             int adjustedGreen = green * factor;
//             int adjustedBlue = blue * factor;

//             strip.setPixelColor((i + animationStep) % NUM_LEDS, strip.Color(adjustedRed, adjustedGreen, adjustedBlue));
//         }
//         strip.show();

//         animationStep = (animationStep + 1) % NUM_LEDS; // Avancer l'animation
//     }
// }

// WORK-IN-PROGRESS VERSION

void setLEDRGB(int temperature) {
    static unsigned long animationStartTime = 0; // Temps de début de l'animation
    static unsigned long lastUpdateTime = 0;    // Dernière mise à jour
    static int animationStep = 0;               // Étape actuelle dans l'animation

    const unsigned long animationDuration = 10000; // Durée totale (10 secondes)
    const unsigned long updateInterval = 100;      // Intervalle entre mises à jour (100 ms)

    unsigned long currentTime = millis();

    // Initialiser l'animation si elle n'est pas déjà active
    if (!animationActive) {
        Serial.println("Starting animation...");
        animationStartTime = currentTime;
        lastUpdateTime = currentTime;
        animationStep = 0;
        animationActive = true;
    }

    // Terminer l'animation après 10 secondes
    if (animationActive && (currentTime - animationStartTime >= animationDuration)) {
        Serial.println("Ending animation...");
        for (int i = 0; i < NUM_LEDS; i++) {
            strip.setPixelColor(i, strip.Color(0, 0, 0)); // Éteindre toutes les LEDs
        }
        strip.show();
        animationActive = false;
        return;
    }

    // Mettre à jour l'animation si l'intervalle est atteint
    if (animationActive && (currentTime - lastUpdateTime >= updateInterval)) {
        lastUpdateTime = currentTime;

        if (temperature <= 0) {
            // FROID : Animation de rotation avec un gradient bleu
            for (int i = 0; i < NUM_LEDS; i++) {
                float factor = 1.0 - (((i + animationStep) % NUM_LEDS) / (float)NUM_LEDS);
                int adjustedBlue = map(temperature, -10, 0, 128, 255) * factor;
                strip.setPixelColor((i + animationStep) % NUM_LEDS, strip.Color(0, 0, adjustedBlue));
            }
            animationStep = (animationStep + 1) % NUM_LEDS; // Rotation
        } else if (temperature > 0 && temperature <= 25) {
            // TEMPÉRATURES MODÉRÉES : Animation pulsée sur un gradient cyan/vert
            static int brightness = 0;
            static bool increasing = true;

            if (increasing) {
                brightness += 15;
                if (brightness >= 255) increasing = false;
            } else {
                brightness -= 15;
                if (brightness <= 0) increasing = true;
            }

            int red = map(temperature, 0, 25, 0, 128);
            int green = map(temperature, 0, 25, 255, 128);
            int blue = map(temperature, 0, 25, 255, 64);

            for (int i = 0; i < NUM_LEDS; i++) {
                int adjustedRed = red * brightness / 255;
                int adjustedGreen = green * brightness / 255;
                int adjustedBlue = blue * brightness / 255;
                strip.setPixelColor(i, strip.Color(adjustedRed, adjustedGreen, adjustedBlue));
            }
        } else if (temperature > 25) {
            // CHAUD : Effet de flamme avec sautes aléatoires
            for (int i = 0; i < NUM_LEDS; i++) {
                if (random(10) > 7) { // Random pour des sautes aléatoires
                    strip.setPixelColor(i, strip.Color(255, random(64, 128), 0)); // Orange/rouge
                } else {
                    strip.setPixelColor(i, strip.Color(128, random(32, 64), 0)); // Plus sombre
                }
            }
        }

        strip.show();
    }
}

void playCloudyMelody() {
    int melody[] = {261, 294, 330, 294, 261}; // Fréquences des notes (Do, Ré, Mi, Ré, Do)
    int noteDurations[] = {400, 400, 600, 400, 600}; // Durée des notes en ms

    for (int i = 0; i < 5; i++) {
        tone(BUZZER_PIN, melody[i], noteDurations[i]);
        delay(noteDurations[i] * 1.3); // Pause entre les notes
    }
    noTone(BUZZER_PIN);
}

void playToneIfNecessary(String weatherCondition) {
    unsigned long currentTime = millis();

    // Si aucun son n'est actif, configurer le son selon la condition météo
    if (!isToneActive) {
        if (weatherCondition == "clear_sky") {
            toneFrequency = 1000; // Ton aigu
            toneDuration = 500;   // 500 ms
        } else if (weatherCondition == "light_clouds" || weatherCondition == "partly_cloudy") {
            toneFrequency = 800;  // Ton doux
            toneDuration = 400;   // 400 ms
        } else if (weatherCondition == "cloudy" || weatherCondition == "overcast") {
            // toneFrequency = 500;  // Ton monotone
            // toneDuration = 600;   // 600 ms
            playCloudyMelody();
        } else if (weatherCondition == "rain" || weatherCondition == "rain_shower" || weatherCondition == "drizzle") {
            toneFrequency = 500 + random(-100, 100); // Gouttes aléatoires
            toneDuration = 200;   // 200 ms
        } else if (weatherCondition == "thunderstorm") {
            toneFrequency = 200;  // Ton grave
            toneDuration = 700;   // 700 ms
        } else if (weatherCondition == "snow" || weatherCondition == "snow_shower") {
            toneFrequency = 1200; // Ton cristallin
            toneDuration = 300;   // 300 ms
        } else if (weatherCondition == "light_fog") {
            toneFrequency = 400;  // Ton sourd
            toneDuration = 800;   // 800 ms
        } else if (weatherCondition == "dense_fog") {
            toneFrequency = 300;  // Ton grave
            toneDuration = 1000;  // 1000 ms
        } else if (weatherCondition == "freezing_rain") {
            toneFrequency = 700;  // Ton dissonant
            toneDuration = 300;   // 300 ms
        } else if (weatherCondition == "sandstorm") {
            toneFrequency = 300 + random(-50, 50); // Ton variable
            toneDuration = 200;   // 200 ms
        } else {
            toneFrequency = 0;    // Pas de son
            toneDuration = 0;
        }

        // Si une tonalité est définie, jouer le son
        if (toneFrequency > 0 && toneDuration > 0) {
            Serial.printf("Playing tone: %d Hz for %d ms\n", toneFrequency, toneDuration);
            ledc_set_freq(BUZZER_MODE, BUZZER_TIMER, toneFrequency);
            ledc_set_duty(BUZZER_MODE, BUZZER_CHANNEL, 128); // 50% duty cycle
            ledc_update_duty(BUZZER_MODE, BUZZER_CHANNEL);

            toneStartTime = currentTime; // Début de la tonalité
            isToneActive = true;
        }
    }

    // Arrêter le son après la durée définie
    if (isToneActive && currentTime - toneStartTime >= toneDuration) {
        ledc_set_duty(BUZZER_MODE, BUZZER_CHANNEL, 0); // Couper le son
        ledc_update_duty(BUZZER_MODE, BUZZER_CHANNEL);
        isToneActive = false;
        Serial.println("Tone stopped.");
    }
}




// THIS ONE IS THE BEST SOUNDING FUNCTION BUT IS CONFLICTING WITH THE NEOPIZEL
// void playToneIfNecessary(String weatherCondition) {
//     static unsigned long lastToneTime = 0;  // Dernier moment où une note a été jouée
//     static bool isToneActive = false;      // Indique si un son est actuellement en cours

//     unsigned long currentTime = millis();

//     // Si un son est demandé
//     if (!isToneActive) {
//         lastToneTime = currentTime;
//         isToneActive = true;

//         // Associer les sons aux conditions météo
//         if (weatherCondition == "clear_sky") {
//             tone(BUZZER_PIN, 1000, 150); // Ton aigu pour ciel clair
//         } else if (weatherCondition == "light_clouds" || weatherCondition == "partly_cloudy") {
//             tone(BUZZER_PIN, 800, 200); // Mélodie douce pour nuages légers
//         } else if (weatherCondition == "cloudy" || weatherCondition == "overcast") {
//             tone(BUZZER_PIN, 500, 500); // Ton monotone pour ciel couvert
//         } else if (weatherCondition == "rain" || weatherCondition == "rain_shower" || weatherCondition == "drizzle") {
//             // Gouttes de pluie aléatoires
//             tone(BUZZER_PIN, 500 + random(-100, 100), 100);
//         } else if (weatherCondition == "thunderstorm") {
//             tone(BUZZER_PIN, 200, 300); // Ton grave pour orage
//         } else if (weatherCondition == "rain_and_snow" || weatherCondition == "sleet_shower") {
//             tone(BUZZER_PIN, 700, 300); // Mélange pluie/neige
//         } else if (weatherCondition == "snow" || weatherCondition == "snow_shower") {
//             tone(BUZZER_PIN, 1200, 150); // Mélodie cristalline pour neige
//         } else if (weatherCondition == "light_fog") {
//             tone(BUZZER_PIN, 400, 800); // Son sourd pour brouillard léger
//         } else if (weatherCondition == "dense_fog") {
//             tone(BUZZER_PIN, 300, 1200); // Son grave pour brouillard dense
//         } else if (weatherCondition == "freezing_rain") {
//             tone(BUZZER_PIN, 700, 300); // Sons dissonants pour pluie verglaçante
//         } else if (weatherCondition == "sandstorm") {
//             tone(BUZZER_PIN, 300 + random(-50, 50), 150); // Ton grave et rapide
//         } else {
//             // Silence si condition inconnue
//             noTone(BUZZER_PIN);
//             isToneActive = false;
//         }

//         // Log pour débogage
//         Serial.printf("Playing tone for: %s\n", weatherCondition.c_str());
//     }

//     // Désactiver le son après une courte durée pour éviter des sons prolongés
//     if (isToneActive && currentTime - lastToneTime > 1000) { // 1000 ms de durée maximale
//         noTone(BUZZER_PIN);
//         isToneActive = false;
//     }
//     Serial.printf("Is Tone Active: %d\n", isToneActive);
// }

// latest version
void interpretWeatherSymbol(int code, int temperature) {
    
    
    // Traiter les codes nocturnes (dans la centaine) comme leurs équivalents diurnes
    if (code >= 100) {
        code -= 100;
    }

    // Déterminer la condition météo correspondant au code
    String weatherCondition = "";

    switch (code) {
        case 0:  // Aucun symbole météo disponible
            weatherCondition = ""; // Pas de son
            break;
        case 1:  // Ciel clair
            weatherCondition = "clear_sky";
            break;
        case 2:  // Légers nuages
            weatherCondition = "light_clouds";
            break;
        case 3:  // Partiellement nuageux
            weatherCondition = "partly_cloudy";
            break;
        case 4:  // Nuageux
            weatherCondition = "cloudy";
            break;
        case 5:  // Pluie
            weatherCondition = "rain";
            break;
        case 6:  // Pluie et neige / grésil
            weatherCondition = "rain_and_snow";
            break;
        case 7:  // Neige
            weatherCondition = "snow";
            break;
        case 8:  // Averse de pluie
            weatherCondition = "rain_shower";
            break;
        case 9:  // Averse de neige
            weatherCondition = "snow_shower";
            break;
        case 10: // Averse de grésil
            weatherCondition = "sleet_shower";
            break;
        case 11: // Brouillard léger
            weatherCondition = "light_fog";
            break;
        case 12: // Brouillard dense
            weatherCondition = "dense_fog";
            break;
        case 13: // Pluie verglaçante
            weatherCondition = "freezing_rain";
            break;
        case 14: // Orages
            weatherCondition = "thunderstorm";
            break;
        case 15: // Bruine
            weatherCondition = "drizzle";
            break;
        case 16: // Tempête de sable
            weatherCondition = "sandstorm";
            break;
        default: // Code inconnu
            weatherCondition = ""; // Pas de son
            break;
    }

    // Appeler playToneIfNecessary pour jouer les sons correspondants
    playToneIfNecessary(weatherCondition);
    // Ajuster la LED en fonction de la température
    // setLEDRGB(temperature);
    // update Web Interface value
    lastWeatherCondition = weatherCondition;
}
