// sketch_arduino.ino

// Libraries
#include <Arduino.h> // ✅ Added explicitly for ledcSetup/ledcAttachPin
#include <AudioFileSourceHTTPStream.h>
#include <AudioFileSourceSD.h>
#include <AudioOutputI2S.h>
#include <AudioGeneratorMP3.h>
#include <FirebaseESP32.h> // Ensure this is Mobizt's version 4.4.17
#include <WiFi.h>
#include <ESP32Servo.h>
#include <HTTPClient.h>
#include <SD.h>
#include <SPI.h>
#include "time.h"
#include <ArduinoJson.h> // Make sure this library is installed

// Firebase Realtime Database credentials
#define FIREBASE_HOST "pawtonomous-default-rtdb.asia-southeast1.firebasedatabase.app" // Your Firebase project URL
#define FIREBASE_AUTH "AIzaSyAg-2VtD5q6Rw8JDKTiihp-ribH0HHvU-o" // Your Firebase project secret or database secret

// WiFi credentials (hardcoded for now, will be overwritten by Firebase/SD if available)
String firebaseSsid = "MyHomeWiFi";      // <<<<<< ใส่ชื่อ WiFi ของคุณที่นี่
String firebasePassword = "MySecretPass123"; // <<<<<< ใส่รหัสผ่าน WiFi ของคุณที่นี่

// Pins
const int FOOD_SERVO_PIN = 13; // Servo for food dispensing
const int FAN_SERVO_PIN = 12; // Servo for fan direction (swing)
const int FAN_PWM_PIN = 2;   // PWM pin for fan motor control (via MOSFET module)
const int BUTTON_PIN = 14; // Manual Feed Button
const int PIR_PIN = 27;    // PIR motion sensor
const int ECHO_PIN = 26;   // Ultrasonic sensor ECHO pin
const int TRIG_PIN = 25;   // Ultrasonic sensor TRIG pin
const int MY_SD_CS_PIN = 5;   // ✅ FIX: Renamed from SD_CS_PIN to MY_SD_CS_PIN to avoid conflict with Firebase library
const int BUZZER_PIN = 4;  // Active Buzzer for beeps

// I2S DAC Pins (for MAX98357A, adjust if using other DAC or internal DAC)
const int I2S_DOUT_PIN = 33; // I2S Data Out
const int I2S_BCLK_PIN = 27; // I2S Bit Clock (usually a common pin)
const int I2S_LRC_PIN = 26;  // I2S Left/Right Clock (usually a common pin)

// Battery Monitoring Pin (Analog Read)
// This is a placeholder. You need a voltage divider circuit to measure battery voltage.
const int BATTERY_ANALOG_PIN = 34; // Example analog pin for battery voltage (ESP32 ADC1_CH6)

// Servo objects
Servo foodServo;
Servo fanServo;

// Firebase objects
FirebaseConfig firebaseConfig;
FirebaseAuth firebaseAuth;
FirebaseData firebaseData; // This object is passed by pointer to Firebase.RTDB methods
FirebaseJson json; // For parsing JSON commands

// Audio objects (for ESP8266Audio library)
AudioGeneratorMP3 *mp3;
AudioFileSourceSD *fileSourceSD;
AudioFileSourceHTTPStream *fileSourceHTTP;
AudioOutputI2S *audioOutput;

// Time synchronization
const char* ntpServer = "pool.ntp.org"; // Corrected typo here
long gmtOffset_sec = 25200; // Default: GMT+7 (Thailand)
const int daylightOffset_sec = 0;

// Device ID (unique identifier, typically MAC address)
String deviceId = "";

// SD Card Config Files
const char* SD_CONFIG_FILE = "/feeder_config.json";
const char* SD_MEALS_FILE = "/feeder_meals.json";

// Meal Structure
struct Meal {
    int hour;
    int minute;
    int amount; // Amount of food to dispense (grams)
    String noiseFile; // URL to the sound file (Supabase public URL)
    String originalNoiseFileName; // Original file name for reference
    int fanStrength; // Fan strength (1-3)
    int fanDirection; // Fan direction (60-120 degrees)
    bool swingMode; // Swing mode (true/false)
};

// Array to store scheduled meals
#define MAX_MEALS 10 // Max number of meals
Meal meals[MAX_MEALS];
int mealCount = 0;

// Food Dispensing State Variables
bool isDispensing = false;
unsigned long dispenseStartTime = 0;
unsigned long currentDispenseDurationMs = 0; // Duration in milliseconds
int currentFanStrength = 0;
int currentFanDirection = 0;
bool currentSwingMode = false;
String currentNoiseFilePlaying = ""; // To track current playing sound
unsigned long lastMovementDetectedTime = 0; // Last time movement was detected

// Ultrasonic Sensor Variables
const float SOUND_SPEED = 0.0343; // Speed of sound in cm/microsecond
long duration;
float distanceCm;

// System Settings
float bottleHeightCm = 48.0; // Default bottle height in cm (18.9L bottle)
unsigned long lastFoodLevelCheckTime = 0;
const unsigned long FOOD_LEVEL_CHECK_INTERVAL_MS = 3600000; // 1 hour
unsigned long lastMovementNotifyTime = 0;
const unsigned long MOVEMENT_NOTIFY_INTERVAL_MS = 180000; // 3 minutes (180000 ms)

// Fan PWM settings
const int FAN_PWM_FREQUENCY = 5000; // 5 kHz
const int FAN_PWM_RESOLUTION = 8; // 8-bit resolution (0-255)
const int FAN_PWM_CHANNEL = 0; // PWM channel for the fan

// Function Prototypes
void connectToWiFi();
void firebaseStreamCallback(StreamData data);
void firebaseStreamTimeoutCallback(bool timeout);
void syncTime();
void updateDeviceStatus(bool online);
void updateFoodLevel(float distance);
void updateLastMovementDetected(unsigned long timestamp);
void updateBatteryVoltage(float voltage);
void dispenseFood(int amount, int fan_strength, int fan_direction, bool swing_mode, const String& noiseFile, const String& originalNoiseName);
void playSoundFromURL(const String& url);
float getFoodLevel();
void beep(int duration_ms, int frequency_hz);
void handleFeedNowCommand(FirebaseJson &json);
void handleCheckFoodLevelCommand();
void handleCheckMovementCommand();
void handleMakeNoiseCommand(FirebaseJson &json);
void fetchMealsFromFirebase();
void fetchSettingsFromFirebase();
String getFirebaseTimestampString();
float getBatteryVoltage(); // Reads simulated battery voltage
void checkAndNotifyMovement();
void checkFoodLevelAndNotify();
void saveConfigToSD();
void loadConfigFromSD();
void saveMealsToSD();
void loadMealsFromSD();
void printFileContent(const char* filename); // For debugging SD card files

// Helper to clamp values
float clamp(float value, float min_val, float max_val) {
    return (value < min_val) ? min_val : ((value > max_val) ? max_val : value);
}

// ===========================================
// SETUP
// ===========================================
void setup() {
    Serial.begin(115200);

    // Initialize pins
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    pinMode(PIR_PIN, INPUT);
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW); // Ensure buzzer is off
    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);

    // Initialize servos
    foodServo.attach(FOOD_SERVO_PIN);
    fanServo.attach(FAN_SERVO_PIN);
    foodServo.write(0);  // Initial position (closed)
    fanServo.write(90);  // Initial position (neutral)

    // Initialize fan PWM
    ledcSetup(FAN_PWM_CHANNEL, FAN_PWM_FREQUENCY, FAN_PWM_RESOLUTION);
    ledcAttachPin(FAN_PWM_PIN, FAN_PWM_CHANNEL);
    ledcWrite(FAN_PWM_CHANNEL, 0); // Fan off initially

    // Initialize SD Card
    if (!SD.begin(MY_SD_CS_PIN)) { // Use MY_SD_CS_PIN
        Serial.println("SD Card initialization failed or not present!");
    } else {
        Serial.println("SD Card initialized.");
        // Try loading config from SD first
        loadConfigFromSD();
        loadMealsFromSD();
        // For debugging, you can print file contents
        // printFileContent(SD_CONFIG_FILE);
        // printFileContent(SD_MEALS_FILE);
    }

    // Initialize Firebase Configuration
    firebaseConfig.host = FIREBASE_HOST;
    firebaseConfig.signer.tokens.legacy_token = FIREBASE_AUTH;

    // Callback for token status - Adjusted for 4.4.17, directly print enum values
    firebaseConfig.token_status_callback = [](TokenInfo info){
      Serial.printf("Token info: type = %d, status = %d\n", info.type, info.status); // ✅ FIX: Directly print enum integers for 4.4.17
    };

    // Initialize Firebase
    Firebase.begin(&firebaseConfig, &firebaseAuth); // Pass pointers to config and auth objects
    Firebase.reconnectWiFi(true); // Auto reconnect WiFi if disconnected

    // Set up initial device ID (from SD or generate new)
    if (deviceId.length() < 5) { // If not loaded or invalid from SD
        deviceId = WiFi.macAddress();
        Serial.print("Generated Device ID (MAC): ");
        Serial.println(deviceId);
        // Save to Firebase (will be done after WiFi connect and Firebase ready)
        // Save to SD (will be done in saveConfigToSD)
    } else {
        Serial.print("Loaded Device ID from SD: ");
        Serial.println(deviceId);
    }

    // Connect to WiFi (using credentials loaded from SD or hardcoded)
    connectToWiFi();

    // After WiFi is connected, ensure deviceId is set in Firebase
    if (Firebase.ready()) {
        // ✅ FIX: Use &firebaseData for setString
        Firebase.RTDB.setString(&firebaseData, "/device/" + deviceId + "/status/deviceId", deviceId);
        saveConfigToSD(); // Save current config (including deviceId if newly generated)
        Serial.println("Device ID ensured in Firebase and saved to SD.");
    } else {
        Serial.println("Firebase not ready, will try to set device ID later.");
    }

    // Initialize Audio
    audioOutput = new AudioOutputI2S();
    audioOutput->SetPinout(I2S_BCLK_PIN, I2S_LRC_PIN, I2S_DOUT_PIN);
    audioOutput->SetGain(0.1); // Adjust gain as needed for your DAC
    mp3 = new AudioGeneratorMP3();

    // Set up Firebase stream for commands and settings for this specific device
    String devicePath = "/device/" + deviceId;
    Firebase.RTDB.setStreamCallback(&firebaseData, firebaseStreamCallback, firebaseStreamTimeoutCallback);
    if (!Firebase.RTDB.beginStream(&firebaseData, devicePath.c_str())) {
        Serial.printf("Failed to begin stream at %s: %s\n", devicePath.c_str(), firebaseData.errorReason().c_str());
    }

    // Sync time with NTP server
    syncTime();

    // Fetch initial settings and meals from Firebase (override SD if successful)
    fetchSettingsFromFirebase();
    fetchMealsFromFirebase();

    // Set device online status
    updateDeviceStatus(true);
}

// ===========================================
// LOOP
// ===========================================
void loop() {
    // Keep WiFi connection alive
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi Disconnected. Reconnecting...");
        connectToWiFi();
        updateDeviceStatus(false); // Set status to offline if disconnected
    }

    // Process Firebase stream data
    // ✅ FIX: Use &firebaseData for readStream
    if (Firebase.RTDB.readStream(&firebaseData)) {
        // Stream data is handled in firebaseStreamCallback
    }

    // Update battery voltage periodically
    static unsigned long lastBatteryReadTime = 0;
    const unsigned long BATTERY_READ_INTERVAL_MS = 60000; // Read every 1 minute
    if (millis() - lastBatteryReadTime > BATTERY_READ_INTERVAL_MS) {
        float voltage = getBatteryVoltage();
        updateBatteryVoltage(voltage);
        lastBatteryReadTime = millis();
    }

    // Manual feed button check
    if (digitalRead(BUTTON_PIN) == LOW) {
        static unsigned long lastButtonPressTime = 0;
        const long debounceDelay = 50; // milliseconds
        if (millis() - lastButtonPressTime > debounceDelay) {
            Serial.println("Manual feed button pressed!");
            if (mealCount > 0) {
                // Use the first configured meal for manual dispense
                dispenseFood(meals[0].amount, meals[0].fanStrength, meals[0].fanDirection, meals[0].swingMode, meals[0].noiseFile, meals[0].originalNoiseFileName);
            } else {
                Serial.println("No meals configured for manual dispense.");
                beep(200, 1000); // Two short beeps
                delay(200);
                beep(200, 1000);
            }
            lastButtonPressTime = millis();
        }
    }

    // Automatic scheduled feeding check
    struct tm timeinfo;
    if (getLocalTime(&timeinfo)) {
        for (int i = 0; i < mealCount; i++) {
            // Check if current time matches scheduled meal time AND not currently dispensing
            if (timeinfo.tm_hour == meals[i].hour && timeinfo.tm_min == meals[i].minute && !isDispensing) {
                Serial.printf("Scheduled meal %d triggered at %02d:%02d\n", i + 1, meals[i].hour, meals[i].minute);
                dispenseFood(meals[i].amount, meals[i].fanStrength, meals[i].fanDirection, meals[i].swingMode, meals[i].noiseFile, meals[i].originalNoiseFileName);
                delay(60000); // Delay for 1 minute to prevent multiple triggers in the same minute
            }
        }
    }

    // Food dispensing process (non-blocking)
    if (isDispensing) {
        unsigned long elapsed = millis() - dispenseStartTime;
        if (elapsed < currentDispenseDurationMs) {
            if (currentSwingMode) {
                static unsigned long lastSwingMove = 0;
                // Swing fan every 500ms
                if (millis() - lastSwingMove > 500) {
                    static bool swingForward = true;
                    int swingRange = 20; // Swing 20 degrees from neutral (90 -> 70 or 110)
                    int targetAngle = swingForward ? 90 + swingRange : 90 - swingRange;
                    fanServo.write(clamp(targetAngle, 60.0f, 120.0f)); // Ensure within 60-120 range
                    swingForward = !swingForward;
                    lastSwingMove = millis();
                }
            } else {
                fanServo.write(currentFanDirection); // Fixed direction
            }
            // Control fan strength via PWM
            ledcWrite(FAN_PWM_CHANNEL, map(currentFanStrength, 1, 3, 0, 255)); // Map 1-3 to 0-255 PWM
        } else {
            Serial.println("Dispensing finished.");
            foodServo.write(0); // Close food dispensing
            isDispensing = false;
            currentDispenseDurationMs = 0;
            currentNoiseFilePlaying = "";
            fanServo.write(90); // Return fan to neutral
            ledcWrite(FAN_PWM_CHANNEL, 0); // Turn fan off

            beep(50, 2000); // Short beep to indicate dispense finished
            
            // After dispensing, immediately check food level and movement
            handleCheckFoodLevelCommand(); // Call handler directly
            checkAndNotifyMovement(); // Check and notify movement if needed
        }
    }

    // Audio loop for ESP8266Audio
    if (mp3 && mp3->isRunning()) {
      if (!mp3->loop()) {
        mp3->stop();
        delete mp3;
        mp3 = nullptr;
        if(fileSourceSD) { delete fileSourceSD; fileSourceSD = nullptr; }
        if(fileSourceHTTP) { delete fileSourceHTTP; fileSourceHTTP = nullptr; }
        currentNoiseFilePlaying = ""; // Clear current playing sound
      }
    }

    // Passive PIR motion sensor check
    static unsigned long lastPirCheck = 0;
    const unsigned long PIR_CHECK_INTERVAL = 1000; // Check PIR every 1 second
    if (millis() - lastPirCheck > PIR_CHECK_INTERVAL) {
        if (digitalRead(PIR_PIN) == HIGH) {
            Serial.println("Movement detected!");
            // Only update lastMovementDetectedTime here, notification handled by checkAndNotifyMovement()
            // ✅ FIX: Use Firebase.RTDB.getTimestamp()
            lastMovementDetectedTime = Firebase.RTDB.getTimestamp(); 
        }
        lastPirCheck = millis();
    }
    
    // Periodically check and notify movement and food level
    checkAndNotifyMovement();
    checkFoodLevelAndNotify();
}

// ===========================================
// WiFi Connection
// ===========================================
void connectToWiFi() {
    Serial.print("Connecting to WiFi: ");
    Serial.println(firebaseSsid.c_str());
    WiFi.begin(firebaseSsid.c_str(), firebasePassword.c_str());

    int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 40) { // Try for 20 seconds
        Serial.print(".");
        delay(500);
        retries++;
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.print("Connected with IP: ");
        Serial.println(WiFi.localIP());
        updateDeviceStatus(true); // Report online
    } else {
        Serial.println("\nFailed to connect to WiFi using stored credentials.");
        Serial.println("Attempting to connect with default Wokwi-GUEST WiFi...");
        WiFi.begin("Wokwi-GUEST", ""); // Fallback to Wokwi default WiFi
        retries = 0;
        while (WiFi.status() != WL_CONNECTED && retries < 40) { // Try for another 20 seconds
            Serial.print("-");
            delay(500);
            retries++;
        }
        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("\nConnected to hardcoded default WiFi (Wokwi-GUEST).");
            updateDeviceStatus(true); // Report online
        } else {
            Serial.println("\nFailed to connect to any WiFi. Operating in offline mode.");
            updateDeviceStatus(false); // Report offline
        }
    }
}

// ===========================================
// Firebase Stream Callbacks
// ===========================================
void firebaseStreamCallback(StreamData data) {
    // Check if data is for this device
    if (!data.dataPath().startsWith("/device/" + deviceId)) {
        Serial.printf("Ignoring stream data from other device: %s\n", data.dataPath().c_str());
        return;
    }

    String relativePath = data.dataPath().substring(("/device/" + deviceId).length());

    if (relativePath == "/status/online") {
        bool onlineStatus = data.boolData();
        Serial.printf("Device online status updated: %s\n", onlineStatus ? "online" : "offline");
    } else if (relativePath == "/status/deviceId") {
        String newDeviceId = data.stringData();
        if (newDeviceId != deviceId) {
            deviceId = newDeviceId;
            Serial.printf("Device ID updated to: %s\n", deviceId.c_str());
            // Re-fetch everything for the new device
            fetchMealsFromFirebase();
            fetchSettingsFromFirebase();
            // Also re-establish stream if deviceId changes
            String devicePath = "/device/" + deviceId;
            Firebase.RTDB.setStreamCallback(&firebaseData, firebaseStreamCallback, firebaseStreamTimeoutCallback);
            if (!Firebase.RTDB.beginStream(&firebaseData, devicePath.c_str())) {
                Serial.printf("Failed to re-begin stream at %s: %s\n", devicePath.c_str(), firebaseData.errorReason().c_str());
            }
        }
    } else if (relativePath == "/commands/feedNow") {
        Serial.println("FeedNow command received!");
        json.setJsonData(data.jsonString());
        handleFeedNowCommand(json);
        // ✅ FIX: Use &firebaseData for deleteNode
        Firebase.RTDB.deleteNode(&firebaseData, data.dataPath()); // Clear command after processing
    } else if (relativePath == "/commands/checkFoodLevel") {
        Serial.println("CheckFoodLevel command received!");
        handleCheckFoodLevelCommand();
        // ✅ FIX: Use &firebaseData for deleteNode
        Firebase.RTDB.deleteNode(&firebaseData, data.dataPath()); // Clear command after processing
    } else if (relativePath == "/commands/checkMovement") {
        Serial.println("CheckMovement command received!");
        handleCheckMovementCommand();
        // ✅ FIX: Use &firebaseData for deleteNode
        Firebase.RTDB.deleteNode(&firebaseData, data.dataPath()); // Clear command after processing
    } else if (relativePath == "/commands/makeNoise") {
        Serial.println("MakeNoise command received!");
        json.setJsonData(data.jsonString());
        handleMakeNoiseCommand(json);
        // ✅ FIX: Use &firebaseData for deleteNode
        Firebase.RTDB.deleteNode(&firebaseData, data.dataPath()); // Clear command after processing
    } else if (relativePath == "/meals") {
        Serial.println("Meals data updated from Firebase.");
        fetchMealsFromFirebase(); // Re-fetch all meals
    } else if (relativePath == "/settings") {
        Serial.println("Settings data updated from Firebase.");
        fetchSettingsFromFirebase(); // Re-fetch all settings
    }
}

void firebaseStreamTimeoutCallback(bool timeout) {
    if (timeout) {
        Serial.println("Stream timeout, re-establishing...");
    } else {
        Serial.println("Stream re-established.");
    }
}

// ===========================================
// Time Synchronization (NTP)
// ===========================================
void syncTime() {
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
    Serial.println("Waiting for NTP time sync...");
    struct tm timeinfo;
    unsigned long startSyncTime = millis();
    while (!getLocalTime(&timeinfo) && (millis() - startSyncTime < 10000)) { // Wait up to 10 seconds
        Serial.print(".");
        delay(500);
    }
    if (getLocalTime(&timeinfo)) {
      Serial.println("\nTime synchronized.");
      Serial.println(&timeinfo, "%A, %B %d %Y %H:%M:%S");
    } else {
      Serial.println("\nFailed to synchronize time.");
    }
}

// ===========================================
// Firebase Data Updates
// ===========================================
String getFirebaseTimestampString() {
    // ✅ FIX: Use Firebase.RTDB.getTimestamp() which is available in newer versions
    // This function doesn't take FirebaseData* anymore
    return String(Firebase.RTDB.getTimestamp());
}

void updateDeviceStatus(bool online) {
    if (deviceId.length() == 0) return; // Ensure deviceId is set
    // ✅ FIX: Use &firebaseData for setBool
    Firebase.RTDB.setBool(&firebaseData, "/device/" + deviceId + "/status/online", online);
    if (online) {
        // ✅ FIX: Use &firebaseData for set and Firebase.RTDB.getTimestamp()
        Firebase.RTDB.set(&firebaseData, "/device/" + deviceId + "/status/lastOnline", Firebase.RTDB.getTimestamp());
    }
}

void updateFoodLevel(float distance) {
    if (deviceId.length() == 0) return;
    // ✅ FIX: Use &firebaseData for setFloat
    Firebase.RTDB.setFloat(&firebaseData, "/device/" + deviceId + "/status/foodLevel", distance);
    // ✅ FIX: Use &firebaseData for set and Firebase.RTDB.getTimestamp()
    Firebase.RTDB.set(&firebaseData, "/device/" + deviceId + "/status/lastFoodLevelCheck", Firebase.RTDB.getTimestamp());
    // Also send a notification to the web app
    // ✅ FIX: Use &firebaseData for setString and Firebase.RTDB.getTimestamp()
    Firebase.RTDB.setString(&firebaseData, "/device/" + deviceId + "/notifications/" + getFirebaseTimestampString(),
                             "Food level checked: " + String(distance, 2) + " cm");
}

void updateLastMovementDetected(unsigned long timestamp) {
    if (deviceId.length() == 0) return;
    lastMovementDetectedTime = timestamp; // Update local variable
    // ✅ FIX: Use &firebaseData for set
    Firebase.RTDB.set(&firebaseData, "/device/" + deviceId + "/status/lastMovementDetected", timestamp);
    // Notification for movement is handled in checkAndNotifyMovement()
}

void updateBatteryVoltage(float voltage) {
    if (deviceId.length() == 0) return;
    // ✅ FIX: Use &firebaseData for setFloat
    Firebase.RTDB.setFloat(&firebaseData, "/device/" + deviceId + "/status/batteryVoltage", voltage);
}

// ===========================================
// Food Dispensing Logic
// ===========================================
void dispenseFood(int amount, int fan_strength, int fan_direction, bool swing_mode, const String& noiseFile, const String& originalNoiseName) {
    if (isDispensing) {
        Serial.println("Already dispensing food. Ignoring new command.");
        return;
    }

    Serial.printf("Dispensing: Amount=%d, FanStrength=%d, FanDirection=%d, SwingMode=%d, Noise=%s\n",
                  amount, fan_strength, fan_direction, swing_mode, noiseFile.c_str());

    currentDispenseDurationMs = amount * 1000; // 1 gram = 1 second dispense time (adjust as needed)
    currentNoiseFilePlaying = noiseFile;
    currentFanStrength = clamp(fan_strength, 1.0f, 3.0f);
    currentFanDirection = clamp(fan_direction, 60.0f, 120.0f);
    currentSwingMode = swing_mode;

    foodServo.write(30); // Open food dispensing (adjust angle as needed for your servo setup)
    isDispensing = true;
    dispenseStartTime = millis();

    // Start fan immediately
    if (!currentSwingMode) {
        fanServo.write(currentFanDirection); // Set fixed direction
    }
    ledcWrite(FAN_PWM_CHANNEL, map(currentFanStrength, 1, 3, 0, 255)); // Start fan PWM

    if (currentNoiseFilePlaying.length() > 0) {
        playSoundFromURL(currentNoiseFilePlaying);
    } else {
        Serial.println("No noise file. Playing default beep.");
        beep(500, 1500); // Default beep sound
    }
}

// ===========================================
// Sound Playing Logic (using ESP8266Audio)
// ===========================================
void playSoundFromURL(const String& url) {
    if (mp3 && mp3->isRunning()) {
        mp3->stop();
    }
    if(fileSourceHTTP) { delete fileSourceHTTP; fileSourceHTTP = nullptr; }
    if(fileSourceSD) { delete fileSourceSD; fileSourceSD = nullptr; }

    if (url.startsWith("http://") || url.startsWith("https://")) {
        Serial.printf("Playing from HTTP URL: %s\n", url.c_str());
        fileSourceHTTP = new AudioFileSourceHTTPStream(url.c_str());
        if(fileSourceHTTP && fileSourceHTTP->isOpen()) {
            mp3->begin(fileSourceHTTP, audioOutput);
        } else {
            Serial.println("Failed to open HTTP stream. Playing default beep.");
            beep(500, 1500);
            if(fileSourceHTTP) { delete fileSourceHTTP; fileSourceHTTP = nullptr; }
        }
    } else {
        // Assume it's a local file path on SD card
        Serial.printf("Playing from SD card path: %s\n", url.c_str());
        // Use MY_SD_CS_PIN for SD operations
        if (!SD.begin(MY_SD_CS_PIN)) {
            Serial.println("SD Card not available. Cannot play local sound.");
            beep(500, 1500);
            return;
        }
        fileSourceSD = new AudioFileSourceSD(url.c_str());
        if(fileSourceSD && fileSourceSD->isOpen()) {
            mp3->begin(fileSourceSD, audioOutput);
        } else {
            Serial.println("Failed to open SD file. Playing default beep.");
            beep(500, 1500);
            if(fileSourceSD) { delete fileSourceSD; fileSourceSD = nullptr; }
        }
        SD.end(); // Release SD card
    }
}

// ===========================================
// Ultrasonic Sensor Logic (Food Level)
// ===========================================
float getFoodLevel() {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    duration = pulseIn(ECHO_PIN, HIGH);
    // Ensure duration is not 0 to avoid division by zero or invalid calculations
    if (duration == 0) return -1.0; // Indicate an error or no measurement

    distanceCm = duration * SOUND_SPEED / 2;

    Serial.printf("Distance: %.2f cm\n", distanceCm);
    return distanceCm;
}

// ===========================================
// Buzzer Beep Function
// ===========================================
void beep(int duration_ms, int frequency_hz) {
    if (frequency_hz > 0) {
        tone(BUZZER_PIN, frequency_hz);
    }
    delay(duration_ms);
    noTone(BUZZER_PIN);
}

// ===========================================
// Firebase Command Handlers
// ===========================================
void handleFeedNowCommand(FirebaseJson &json) {
    int amount = 0;
    int fan_strength = 0;
    int fan_direction = 0;
    bool swing_mode = false;
    String noiseFile = "";
    String originalNoiseName = "";

    FirebaseJsonData data;

    if (json.get(data, "amount")) amount = data.intValue;
    if (json.get(data, "fanStrength")) fan_strength = data.intValue;
    if (json.get(data, "fanDirection")) fan_direction = data.intValue;
    if (json.get(data, "swingMode")) swing_mode = data.boolValue;
    if (json.get(data, "noiseFile")) noiseFile = data.stringValue;
    if (json.get(data, "originalNoiseFileName")) originalNoiseName = data.stringValue;

    dispenseFood(amount, fan_strength, fan_direction, swing_mode, noiseFile, originalNoiseName);
}

void handleCheckFoodLevelCommand() {
    Serial.println("Handling checkFoodLevel command...");
    float distance = getFoodLevel();
    updateFoodLevel(distance); // Update status in Firebase and send notification
}

void handleCheckMovementCommand() {
    Serial.println("Handling checkMovement command. Checking PIR now...");
    if (digitalRead(PIR_PIN) == HIGH) {
        // Use Firebase.RTDB.getTimestamp()
        updateLastMovementDetected(Firebase.RTDB.getTimestamp()); 
        // Use &firebaseData for setString
        Firebase.RTDB.setString(&firebaseData, "/device/" + deviceId + "/notifications/" + getFirebaseTimestampString(),
                                 "Movement detected immediately!");
    } else {
        // Use &firebaseData for setString
        Firebase.RTDB.setString(&firebaseData, "/device/" + deviceId + "/notifications/" + getFirebaseTimestampString(),
                                 "No movement detected at the moment.");
    }
}

void handleMakeNoiseCommand(FirebaseJson &json) {
    String url = "";
    FirebaseJsonData data;
    if (json.get(data, "url")) url = data.stringValue;

    if (url.length() > 0) {
        Serial.printf("Received makeNoise command with URL: %s\n", url.c_str());
        playSoundFromURL(url);
        // Use &firebaseData for setString
        Firebase.RTDB.setString(&firebaseData, "/device/" + deviceId + "/notifications/" + getFirebaseTimestampString(),
                                 "Playing sound from URL: " + url);
    } else {
        Serial.println("MakeNoise command received but no URL specified. Playing default beep.");
        beep(500, 1000);
        // Use &firebaseData for setString
        Firebase.RTDB.setString(&firebaseData, "/device/" + deviceId + "/notifications/" + getFirebaseTimestampString(),
                                 "Make Noise command received with no URL. Playing default beep.");
    }
}

// ===========================================
// Firebase Data Fetchers
// ===========================================
void fetchMealsFromFirebase() {
    if (deviceId.length() == 0 || !Firebase.ready()) {
        Serial.println("Cannot fetch meals: Device ID not set or Firebase not ready. Using SD card meals.");
        loadMealsFromSD(); // Load from SD if Firebase is not ready
        return;
    }
    Serial.println("Fetching meals from Firebase...");
    // Use &firebaseData for get
    if (Firebase.RTDB.get(&firebaseData, "/device/" + deviceId + "/meals")) {
        if (firebaseData.dataType() == "json") {
            FirebaseJson jsonRef;
            jsonRef.setJsonData(firebaseData.jsonString());

            size_t len = jsonRef.iteratorBegin();
            mealCount = 0; // Reset meal count
            for (size_t i = 0; i < len; i++) {
                FirebaseJsonData data;
                String pathPrefix = "[" + String(i) + "]";

                if (jsonRef.get(data, (pathPrefix + ".time").c_str())) {
                    Meal newMeal;
                    newMeal.hour = data.stringValue.substring(0, 2).toInt();
                    newMeal.minute = data.stringValue.substring(3, 5).toInt();

                    if (jsonRef.get(data, (pathPrefix + ".amount").c_str())) newMeal.amount = data.intValue;
                    if (jsonRef.get(data, (pathPrefix + ".audioUrl").c_str())) newMeal.noiseFile = data.stringValue;
                    if (jsonRef.get(data, (pathPrefix + ".originalNoiseFileName").c_str())) newMeal.originalNoiseFileName = data.stringValue;
                    if (jsonRef.get(data, (pathPrefix + ".fanStrength").c_str())) newMeal.fanStrength = data.intValue;
                    if (jsonRef.get(data, (pathPrefix + ".fanDirection").c_str())) newMeal.fanDirection = data.intValue;
                    if (jsonRef.get(data, (pathPrefix + ".swingMode").c_str())) newMeal.swingMode = data.boolValue;

                    newMeal.amount = clamp(newMeal.amount, 1.0f, 100.0f); // Clamp amount 1-100g
                    newMeal.fanStrength = clamp(newMeal.fanStrength, 1.0f, 3.0f); // Clamp fan strength 1-3
                    newMeal.fanDirection = clamp(newMeal.fanDirection, 60.0f, 120.0f); // Clamp fan direction 60-120
                    
                    if (mealCount < MAX_MEALS) {
                        meals[mealCount++] = newMeal;
                        Serial.printf("Loaded meal: %02d:%02d, Amount: %d, FanStrength: %d, FanDirection: %d, SwingMode: %d, Noise: %s\n",
                                      newMeal.hour, newMeal.minute, newMeal.amount, newMeal.fanStrength,
                                      newMeal.fanDirection, newMeal.swingMode, newMeal.noiseFile.c_str());
                    } else {
                        Serial.println("Max meals reached, skipping.");
                    }
                } else {
                    Serial.printf("Failed to get time for meal at index %d\n", i);
                }
            }
            jsonRef.iteratorEnd();
            Serial.printf("Total meals loaded: %d\n", mealCount);
            saveMealsToSD(); // Save fetched meals to SD card for backup
        } else {
            Serial.println("Meals data is not JSON or empty.");
            mealCount = 0; // No meals
        }
    } else {
        Serial.printf("Failed to get meals data from Firebase: %s\n", firebaseData.errorReason().c_str());
        // If Firebase fails, will use meals loaded from SD (if any)
    }
}

void fetchSettingsFromFirebase() {
    if (deviceId.length() == 0 || !Firebase.ready()) {
        Serial.println("Cannot fetch settings: Device ID not set or Firebase not ready. Using SD card settings.");
        loadConfigFromSD(); // Load from SD if Firebase is not ready
        return;
    }
    Serial.println("Fetching settings from Firebase...");
    // Use &firebaseData for get
    if (Firebase.RTDB.get(&firebaseData, "/device/" + deviceId + "/settings")) {
        if (firebaseData.dataType() == "json") {
            FirebaseJson jsonRef;
            jsonRef.setJsonData(firebaseData.jsonString());

            FirebaseJsonData data;

            // Time Zone Offset
            if (jsonRef.get(data, "timeZoneOffset")) {
                if (data.floatValue != 0) { // Check if a valid float value is present
                   gmtOffset_sec = static_cast<long>(data.floatValue * 3600);
                   syncTime(); // Re-sync time with new offset
                   Serial.printf("Time Zone Offset updated to: %.1f hours\n", data.floatValue);
                }
            }

            // Bottle Height
            if (jsonRef.get(data, "bottleSize") && data.stringValue == "custom") {
                if (jsonRef.get(data, "customBottleHeight") && data.floatValue > 0) {
                    bottleHeightCm = data.floatValue;
                    Serial.printf("Custom Bottle Height updated to: %.2f cm\n", bottleHeightCm);
                }
            } else if (jsonRef.get(data, "bottleSize") && data.stringValue.length() > 0) {
                // Ensure to convert string to float for numerical bottle sizes
                bottleHeightCm = data.stringValue.toFloat(); 
                Serial.printf("Bottle Size updated to: %.2f cm\n", bottleHeightCm);
            }
            bottleHeightCm = clamp(bottleHeightCm, 1.0f, 100.0f); // Clamp reasonable bottle height

            // Wi-Fi Credentials
            FirebaseJsonData wifiCredentialsData;
            if (jsonRef.get(wifiCredentialsData, "wifiCredentials") && wifiCredentialsData.dataType() == FirebaseJson::JSON_OBJECT) {
                // Access jsonValue() as a method, then get data
                if (wifiCredentialsData.jsonValue().get(data, "ssid")) {
                    String newSsid = data.stringValue;
                    if (newSsid != firebaseSsid) { // Only reconnect if SSID changed
                        firebaseSsid = newSsid;
                        if (wifiCredentialsData.jsonValue().get(data, "password")) {
                            firebasePassword = data.stringValue;
                        } else {
                            firebasePassword = ""; // Clear password if not provided
                        }
                        Serial.printf("New WiFi credentials received. SSID: %s. Reconnecting...\n", firebaseSsid.c_str());
                        connectToWiFi(); // Reconnect with new WiFi credentials
                    }
                }
            }
            saveConfigToSD(); // Save fetched settings to SD card for backup
            Serial.println("Settings loaded successfully.");
        } else {
            Serial.println("Settings data is not JSON or empty.");
        }
    } else {
        Serial.printf("Failed to get settings data from Firebase: %s\n", firebaseData.errorReason().c_str());
        // If Firebase fails, will use settings loaded from SD (if any)
    }
}

// ===========================================
// Battery Monitoring
// ===========================================
float getBatteryVoltage() {
    // This is a dummy implementation.
    // Replace with actual ADC reading and voltage divider calculation.
    // Example: For a 12V battery and a voltage divider that scales 12V to 3.3V (e.g., 10k and 22k resistors)
    // ADC value will be (batteryVoltage / (R1+R2)) * R2 * (ADC_MAX / ADC_REF_VOLTAGE)
    // float rawADC = analogRead(BATTERY_ANALOG_PIN);
    // float voltage = rawADC * (ADC_REF_VOLTAGE / ADC_MAX_VALUE) * (R1 + R2) / R2;

    // For now, return a fixed value or simulate changes
    static float simulatedVoltage = 12.5; // Start at 12.5V
    static unsigned long lastSimulatedUpdate = 0;
    if (millis() - lastSimulatedUpdate > 5000) { // Decrease by 0.1V every 5 seconds
        simulatedVoltage -= 0.01; // Slower drain for testing
        if (simulatedVoltage < 10.0) simulatedVoltage = 12.5; // Reset if too low
        lastSimulatedUpdate = millis();
    }
    return simulatedVoltage;
}

// ===========================================
// Scheduled/Periodic Checks & Notifications
// ===========================================
void checkAndNotifyMovement() {
    if (deviceId.length() == 0 || !Firebase.ready()) return;

    // Only notify if enough time has passed since last notification AND movement was detected
    // And if the movement detected time is within the last MOVEMENT_NOTIFY_INTERVAL_MS
    if (millis() - lastMovementNotifyTime > MOVEMENT_NOTIFY_INTERVAL_MS) {
        if (lastMovementDetectedTime > 0) {
            // ✅ FIX: Use Firebase.RTDB.getTimestamp()
            unsigned long currentTime = Firebase.RTDB.getTimestamp(); 
            // Check if last detected movement was recent enough
            if (currentTime - lastMovementDetectedTime < MOVEMENT_NOTIFY_INTERVAL_MS) { 
                Serial.println("Notifying movement to Firebase.");
                Firebase.RTDB.setString(&firebaseData, "/device/" + deviceId + "/notifications/" + getFirebaseTimestampString(),
                                         "Movement detected at feeder!");
                lastMovementDetectedTime = 0; // Reset after notification to prevent spamming
            }
        }
        lastMovementNotifyTime = millis();
    }
}

void checkFoodLevelAndNotify() {
    if (deviceId.length() == 0 || !Firebase.ready()) return;

    if (millis() - lastFoodLevelCheckTime > FOOD_LEVEL_CHECK_INTERVAL_MS) {
        Serial.println("Performing scheduled food level check.");
        float currentFoodLevelCm = getFoodLevel();
        updateFoodLevel(currentFoodLevelCm); // This also sends a notification
        lastFoodLevelCheckTime = millis();
    }
}

// ===========================================
// SD Card Functions (Configuration & Meals Backup)
// ===========================================

void saveConfigToSD() {
    // Use MY_SD_CS_PIN for SD operations
    if (!SD.begin(MY_SD_CS_PIN)) { 
        Serial.println("SD Card not available for saving config!");
        return;
    }
    File configFile = SD.open(SD_CONFIG_FILE, FILE_WRITE);
    if (!configFile) {
        Serial.println("Failed to open config file for writing.");
        SD.end();
        return;
    }

    StaticJsonDocument<256> doc;
    doc["deviceId"] = deviceId;
    doc["ssid"] = firebaseSsid;
    doc["password"] = firebasePassword;
    doc["gmtOffset_sec"] = gmtOffset_sec;
    doc["bottleHeightCm"] = bottleHeightCm;

    if (serializeJson(doc, configFile) == 0) {
        Serial.println("Failed to write to config file.");
    } else {
        Serial.println("Config saved to SD card.");
    }
    configFile.close();
    SD.end();
}

void loadConfigFromSD() {
    // Use MY_SD_CS_PIN for SD operations
    if (!SD.begin(MY_SD_CS_PIN)) { 
        Serial.println("SD Card not available for loading config!");
        return;
    }
    File configFile = SD.open(SD_CONFIG_FILE, FILE_READ);
    if (!configFile) {
        Serial.println("Config file not found on SD card.");
        SD.end();
        return;
    }

    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, configFile);
    if (error) {
        Serial.print(F("Failed to read config file, using default configuration: "));
        Serial.println(error.f_str());
    } else {
        deviceId = doc["deviceId"].as<String>();
        firebaseSsid = doc["ssid"].as<String>();
        firebasePassword = doc["password"].as<String>();
        gmtOffset_sec = doc["gmtOffset_sec"] | 25200; // Use default if not found
        bottleHeightCm = doc["bottleHeightCm"] | 48.0; // Use default if not found
        Serial.println("Config loaded from SD card.");
    }
    configFile.close();
    SD.end();
}

void saveMealsToSD() {
    // Use MY_SD_CS_PIN for SD operations
    if (!SD.begin(MY_SD_CS_PIN)) { 
        Serial.println("SD Card not available for saving meals!");
        return;
    }
    File mealsFile = SD.open(SD_MEALS_FILE, FILE_WRITE);
    if (!mealsFile) {
        Serial.println("Failed to open meals file for writing.");
        SD.end();
        return;
    }

    StaticJsonDocument<2048> doc; // Adjust size based on MAX_MEALS and data per meal
    JsonArray mealsArray = doc.to<JsonArray>();

    for (int i = 0; i < mealCount; i++) {
        JsonObject mealObj = mealsArray.add<JsonObject>();
        mealObj["hour"] = meals[i].hour;
        mealObj["minute"] = meals[i].minute;
        mealObj["amount"] = meals[i].amount;
        mealObj["noiseFile"] = meals[i].noiseFile;
        mealObj["originalNoiseFileName"] = meals[i].originalNoiseFileName;
        mealObj["fanStrength"] = meals[i].fanStrength;
        mealObj["fanDirection"] = meals[i].fanDirection;
        mealObj["swingMode"] = meals[i].swingMode;
    }

    if (serializeJson(doc, mealsFile) == 0) {
        Serial.println("Failed to write to meals file.");
    } else {
        Serial.printf("Meals (%d) saved to SD card.\n", mealCount);
    }
    mealsFile.close();
    SD.end();
}

void loadMealsFromSD() {
    // Use MY_SD_CS_PIN for SD operations
    if (!SD.begin(MY_SD_CS_PIN)) { 
        Serial.println("SD Card not available for loading meals!");
        return;
    }
    File mealsFile = SD.open(SD_MEALS_FILE, FILE_READ);
    if (!mealsFile) {
        Serial.println("Meals file not found on SD card.");
        SD.end();
        return;
    }

    StaticJsonDocument<2048> doc; // Adjust size based on MAX_MEALS and data per meal
    DeserializationError error = deserializeJson(doc, mealsFile);
    if (error) {
        Serial.print(F("Failed to read meals file, using no meals: "));
        Serial.println(error.f_str());
        mealCount = 0;
    } else {
        JsonArray mealsArray = doc.as<JsonArray>();
        mealCount = 0;
        for (JsonObject mealObj : mealsArray) {
            if (mealCount < MAX_MEALS) {
                meals[mealCount].hour = mealObj["hour"] | 0;
                meals[mealCount].minute = mealObj["minute"] | 0;
                meals[mealCount].amount = mealObj["amount"] | 1;
                meals[mealCount].noiseFile = mealObj["noiseFile"].as<String>();
                meals[mealCount].originalNoiseFileName = mealObj["originalNoiseFileName"].as<String>();
                meals[mealCount].fanStrength = mealObj["fanStrength"] | 1;
                meals[mealCount].fanDirection = mealObj["fanDirection"] | 90;
                meals[mealCount].swingMode = mealObj["swingMode"] | false;
                mealCount++;
            } else {
                Serial.println("Max meals reached when loading from SD, skipping.");
            }
        }
        Serial.printf("Meals (%d) loaded from SD card.\n", mealCount);
    }
    mealsFile.close();
    SD.end();
}

// Function to print content of a file (for debugging)
void printFileContent(const char* filename) {
    // Use MY_SD_CS_PIN for SD operations
    if (!SD.begin(MY_SD_CS_PIN)) { 
        Serial.println("SD Card not available to print file!");
        return;
    }
    File file = SD.open(filename, FILE_READ);
    if (!file) {
        Serial.printf("Failed to open file %s for reading.\n", filename);
        SD.end();
        return;
    }
    Serial.printf("--- Content of %s ---\n", filename);
    while (file.available()) {
        Serial.write(file.read());
    }
    Serial.println("\n--------------------");
    file.close();
    SD.end();
}
