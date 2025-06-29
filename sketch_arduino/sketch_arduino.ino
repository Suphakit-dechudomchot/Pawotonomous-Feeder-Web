// arduino_code.cpp

// ✅ NEW: เปลี่ยนเป็นไลบรารี ESP8266Audio สำหรับการเล่นเสียง
#include <AudioFileSourceHTTPStream.h> // สำหรับสตรีมไฟล์เสียงจาก URL
#include <AudioFileSourceSD.h>       // สำหรับอ่านไฟล์เสียงจาก SD Card
#include <AudioOutputI2S.h>          // สำหรับ output เสียงผ่าน I2S DAC (เช่น MAX98357A)
// #include <AudioOutputAnalog.h>       // สำหรับเล่นเสียงผ่าน DAC ภายในของ ESP32 (ขา GPIO25/26) <--- บรรทัดนี้ถูกคอมเมนต์ออกเพื่อแก้ Error
#include <AudioGeneratorMP3.h>       // สำหรับเล่นไฟล์ MP3

#include <FirebaseESP32.h> // สำหรับ Firebase (Mobizt's library)
#include <WiFi.h>          // สำหรับ WiFi connection
#include <ESP32Servo.h>    // สำหรับควบคุม Servo Motors
#include <HTTPClient.h>    // สำหรับดาวน์โหลดไฟล์ (นอกเหนือจาก AudioStream)
#include <SD.h>            // สำหรับ SD Card
#include <SPI.h>           // สำหรับ SPI communication with SD Card
#include "time.h"          // สำหรับ NTP Client

// Firebase Realtime Database credentials
#define FIREBASE_HOST "pawtonomous-default-rtdb.asia-southeast1.firebasedatabase.app" // Your Firebase project URL
#define FIREBASE_AUTH "AIzaSyAg-2VtD5q6Rw8JDKTiihp-ribH0HHvU-o" // Your Firebase project secret or database secret

// WiFi credentials (will be loaded from Firebase)
String firebaseSsid = "";
String firebasePassword = "";

// Pins
const int FOOD_SERVO_PIN = 13; // Servo สำหรับกลไกจ่ายอาหาร (Feeding mechanism servo)
const int FAN_SERVO_PIN = 12; // Servo สำหรับปรับทิศทางพัดลม (Fan direction servo)
const int BUTTON_PIN = 14; // ปุ่มกด Manual Feed (Manual feed button)
const int PIR_PIN = 27;    // เซ็นเซอร์ PIR ตรวจจับการเคลื่อนไหว (PIR motion sensor)
const int ECHO_PIN = 26;   // Ultrasonic sensor ECHO pin
const int TRIG_PIN = 25;   // Ultrasonic sensor TRIG pin
const int SD_CS_PIN_LOCAL = 5; // SD Card Chip Select pin (renamed to avoid conflict)

// ✅ สำหรับ ESP8266Audio library, กำหนดขา DAC หรือ I2S
// หากใช้ I2S DAC เช่น MAX98357A
const int I2S_DOUT_PIN = 2; // I2S Data Out (DIN)
const int I2S_BCLK_PIN = 0; // I2S Bit Clock (BCLK)
const int I2S_LRC_PIN = 0;  // I2S Left/Right Clock (LRCK)

// หากต้องการใช้ DAC ภายในของ ESP32 (ขา GPIO25 หรือ GPIO26)
// const int AUDIO_OUT_DAC_PIN = 25; 

const int BEEP_PIN = 4; // Pin for beep (Active buzzer)

// Servo objects
Servo foodServo;    // Servo สำหรับกลไกจ่ายอาหาร
Servo fanServo;     // Servo สำหรับปรับทิศทางพัดลม

// Firebase objects
FirebaseConfig firebaseConfig;
FirebaseAuth firebaseAuth;
FirebaseData firebaseData; // ใช้ชื่อนี้เพื่อความสอดคล้องกับตัวอย่างไลบรารี
FirebaseJson json; // ใช้ json object ร่วมกัน

// NTP server for time synchronization
const char* ntpServer = "pool.ntp.org";
long gmtOffset_sec = 25200; // GMT+7 (7 hours * 60 minutes * 60 seconds) - Default for Thailand
const int daylightOffset_sec = 0; // No daylight saving

// Audio objects (for ESP8266Audio library)
// ✅ NEW: เปลี่ยนการประกาศ Audio object
AudioGeneratorMP3 *mp3;
AudioFileSourceSD *fileSource;
AudioFileSourceHTTPStream *httpStream;
AudioOutputI2S *audioOutput; // ใช้ I2S DAC
// AudioOutputAnalog *audioOutputAnalog; // หากต้องการใช้ DAC ภายใน (GPIO25/26)

// Device ID (generated on first boot or read from Firebase if available)
String deviceId = "";

// Structure for a single meal
struct Meal {
    int hour;
    int minute;
    int amount; // Amount of food to dispense (g)
    String noiseFile; // URL to the sound file (e.g., Supabase public URL)
    String originalNoiseFileName; // ชื่อไฟล์เดิมที่ผู้ใช้อัปโหลด (สำหรับอ้างอิง)
    int fanStrength; // ความแรงลม (1-3)
    int fanDirection; // ทิศทางลม (60-120 องศา)
    bool swingMode; // โหมดสวิง (true/false)
};

// Array to store scheduled meals
#define MAX_MEALS 10 // Maximum number of meals
Meal meals[MAX_MEALS];
int mealCount = 0;

// Variables for manual feed button debounce
unsigned long lastButtonPressTime = 0;
const long debounceDelay = 50; // milliseconds

// Variables for food dispensing state
bool isDispensing = false;
unsigned long dispenseStartTime = 0;
unsigned long currentDispenseDuration = 0; // ระยะเวลาในการจ่ายอาหาร
int currentDispenseAmount = 0;
String currentNoiseFile = "";
String currentOriginalNoiseFileName = ""; // สำหรับเก็บชื่อไฟล์เดิม
int currentFanStrength = 0;
int currentFanDirection = 0;
bool currentSwingMode = false;

// Variables for ultrasonic sensor
const float SOUND_SPEED = 0.0343; // Speed of sound in cm/microsecond
long duration;
float distanceCm;

// Variables for system settings
String bottleSize = "48"; // Default bottle size (e.g., "48" for 48cm)
float customBottleHeight = 0.0; // Custom bottle height in cm if bottleSize is "custom"

// Function prototypes
void connectToWiFi();
void firebaseStreamCallback(FirebaseStream data); // Corrected: Use FirebaseStream
void firebaseStreamTimeoutCallback(bool timeout);
void syncTime();
void updateDeviceStatus(bool online);
void updateFoodLevel(float distance);
void updateLastMovementDetected(unsigned long timestamp);
void dispenseFood(int amount, int fan_strength, int fan_direction, bool swing_mode, const String& noiseFile, const String& originalNoiseName);
void playSoundFromURL(const String& url);
void downloadFile(const String& url, const String& path);
void playDownloadedSound(const String& filename);
float getFoodLevel();
void beep(int duration_ms, int frequency_hz);
void handleFeedNowCommand(FirebaseJson &json);
void handleCheckFoodLevelCommand();
void handleCheckMovementCommand();
void handleMakeNoiseCommand(FirebaseJson &json);
void fetchMealsFromFirebase();
void fetchSettingsFromFirebase();
String getFirebaseTimestampString(); // เพิ่มฟังก์ชันนี้

// Helper to clamp values (same as JS, useful for ESP32 too)
float clamp(float value, float min_val, float max_val) {
    return (value < min_val) ? min_val : ((value > max_val) ? max_val : value);
}

// ===========================================
// SETUP
// ===========================================
void setup() {
    Serial.begin(115200);

    // Initialize button and PIR sensor
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    pinMode(PIR_PIN, INPUT);
    pinMode(BEEP_PIN, OUTPUT);
    digitalWrite(BEEP_PIN, LOW); // Ensure buzzer is off initially

    // Initialize ultrasonic sensor pins
    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);

    // Initialize servos
    foodServo.attach(FOOD_SERVO_PIN);
    fanServo.attach(FAN_SERVO_PIN);
    foodServo.write(90); // Set initial position (closed/neutral)
    fanServo.write(90); // Set initial position (neutral)
    
    // Initialize Firebase Configuration
    firebaseConfig.host = FIREBASE_HOST;
    // ✅ แก้ไขการใช้ database_secret (เป็นรูปแบบที่ไลบรารีเวอร์ชันล่าสุดรองรับ)
    firebaseConfig.signer.test_mode = true; // เปิดใช้งาน test_mode
    firebaseConfig.database_secret = FIREBASE_AUTH; // กำหนด database_secret

    // Callback for token status (optional but good for debugging)
    firebaseConfig.token_status_callback = [](TokenInfo info){
      Serial.printf("Token info: type = %s, status = %s\n", Firebase.getTokenInfoType(info).c_str(), Firebase.getTokenStatus(info).c_str());
    };

    // Initialize Firebase
    Firebase.begin(&firebaseConfig, &firebaseAuth); // Pass pointers to config and auth objects
    Firebase.reconnectWiFi(true); // ตั้งค่าให้เชื่อมต่อ WiFi ใหม่โดยอัตโนมัติ

    // Get or create device ID
    if (Firebase.RTDB.getString(&firebaseData, "/device/status/deviceId")) { 
        deviceId = firebaseData.stringData();
        if (deviceId.length() < 5) { // If ID is too short/invalid, create new
            deviceId = WiFi.macAddress(); // Use MAC address as a unique ID
            Firebase.RTDB.setString(&firebaseData, "/device/status/deviceId", deviceId); 
        }
    } else {
        deviceId = WiFi.macAddress(); // Use MAC address as a unique ID
        Firebase.RTDB.setString(&firebaseData, "/device/status/deviceId", deviceId); 
    }
    Serial.print("Device ID: ");
    Serial.println(deviceId);

    // Fetch initial settings (including WiFi credentials) BEFORE connecting to WiFi
    fetchSettingsFromFirebase();

    // Connect to WiFi (ใช้ข้อมูลที่ได้จาก Firebase)
    connectToWiFi();

    // Initialize SD Card
    if (!SD.begin(SD_CS_PIN_LOCAL)) { 
        Serial.println("SD Card initialization failed!");
    } else {
        Serial.println("SD Card initialized.");
    }

    // Initialize Audio (for ESP8266Audio library)
    // ✅ NEW: ใช้ AudioOutputI2S (สำหรับ I2S DAC)
    audioOutput = new AudioOutputI2S(); 
    // กำหนดขา I2S (BCLK, LRC, DOUT)
    audioOutput->SetPinout(I2S_BCLK_PIN, I2S_LRC_PIN, I2S_DOUT_PIN); 
    audioOutput->SetGain(0.1); // Volume 0.0 - 1.0

    // หากต้องการใช้ DAC ภายในของ ESP32 (GPIO25/26) แทน I2S DAC:
    // audioOutputAnalog = new AudioOutputAnalog(AUDIO_OUT_DAC_PIN);
    // audioOutputAnalog->SetGain(0.1); // Volume 0.0 - 1.0
    
    mp3 = new AudioGeneratorMP3(); // สร้าง MP3 Generator

    // Set up Firebase stream for commands and settings for this specific device
    String devicePath = "/device/" + deviceId; 
    if (!Firebase.RTDB.beginStream(&firebaseData, devicePath.c_str())) { // ใช้ &firebaseData และ .c_str()
        Serial.printf("Failed to begin stream at %s: %s\n", devicePath.c_str(), firebaseData.errorReason().c_str());
    } else {
        Firebase.RTDB.setStreamCallback(&firebaseData, firebaseStreamCallback, firebaseStreamTimeoutCallback); // ใช้ &firebaseData
    }

    // Sync time with NTP server
    syncTime(); // gmtOffset_sec จะถูกโหลดจาก Firebase ใน fetchSettingsFromFirebase()

    // Set device online status
    updateDeviceStatus(true);

    // Fetch initial meals from Firebase (settings already fetched)
    fetchMealsFromFirebase();
}

// ===========================================
// LOOP
// ===========================================
void loop() {
    // Check Firebase stream for new commands/data
    if (Firebase.RTDB.readStream(&firebaseData)) { // ใช้ &firebaseData
        // Stream data is handled in firebaseStreamCallback
    }

    // Manual feed button check
    if (digitalRead(BUTTON_PIN) == LOW) { // Button is pressed
        if (millis() - lastButtonPressTime > debounceDelay) {
            Serial.println("Manual feed button pressed!");
            // Check if there are any meals configured
            if (mealCount > 0) {
                // Use the settings of the first meal for manual dispense
                dispenseFood(meals[0].amount, meals[0].fanStrength, meals[0].fanDirection, meals[0].swingMode, meals[0].noiseFile, meals[0].originalNoiseFileName);
            } else {
                Serial.println("No meals configured for manual dispense.");
                beep(200, 1000); // Error beep
                delay(200);
                beep(200, 1000);
            }
            lastButtonPressTime = millis(); // Update last press time
        }
    }

    // Automatic scheduled feeding check
    struct tm timeinfo;
    if (getLocalTime(&timeinfo)) {
        for (int i = 0; i < mealCount; i++) {
            // Check if current time matches scheduled meal time
            if (timeinfo.tm_hour == meals[i].hour && timeinfo.tm_min == meals[i].minute && !isDispensing) {
                Serial.printf("Scheduled meal %d triggered at %02d:%02d\n", i + 1, meals[i].hour, meals[i].minute);
                dispenseFood(meals[i].amount, meals[i].fanStrength, meals[i].fanDirection, meals[i].swingMode, meals[i].noiseFile, meals[i].originalNoiseFileName);
                delay(60000); // Wait 1 minute after dispensing
            }
        }
    }

    // PIR motion sensor check
    int pirState = digitalRead(PIR_PIN);
    if (pirState == HIGH) {
        // Motion detected
        updateLastMovementDetected(Firebase.RTDB.getTimestamp(&firebaseData)); // ใช้ getTimestamp() ที่ถูกต้อง
        delay(5000); // Wait 5 seconds before checking again
    }

    // Food dispensing process (non-blocking)
    if (isDispensing) {
        unsigned long elapsed = millis() - dispenseStartTime;
        if (elapsed < currentDispenseDuration) {
            // Continue dispensing, foodServo is already open
            if (currentSwingMode) {
                static unsigned long lastSwingMove = 0;
                if (millis() - lastSwingMove > 500) { 
                    static bool swingForward = true;
                    int swingRange = 20; // Example: Swing 20 degrees around the center (90)
                    int targetAngle = swingForward ? 90 + swingRange : 90 - swingRange; 
                    fanServo.write(clamp(targetAngle, 60.0f, 120.0f)); // Ensure within bounds
                    swingForward = !swingForward;
                    lastSwingMove = millis();
                }
            } else {
                fanServo.write(currentFanDirection); // Maintain fixed direction
            }

        } else {
            // Dispensing finished
            Serial.println("Dispensing finished.");
            foodServo.write(90); // Close food servo
            isDispensing = false;
            currentDispenseDuration = 0;
            currentDispenseAmount = 0;
            currentNoiseFile = "";
            currentOriginalNoiseFileName = "";
            fanServo.write(90); // Return fan to neutral position (assuming 90 is neutral)

            beep(50, 2000); // Short beep to confirm dispense end
        }
    }

    // ✅ NEW: Audio loop for ESP8266Audio
    if (mp3 && mp3->isRunning()) { // ตรวจสอบว่า mp3 object ไม่เป็น nullptr ก่อนเรียกใช้
      if (!mp3->loop()) { // หากเล่นจบ (loop() ส่งค่า false)
        mp3->stop();
        delete mp3;
        mp3 = nullptr;
        if(fileSource) { delete fileSource; fileSource = nullptr; }
        if(httpStream) { delete httpStream; httpStream = nullptr; }
      }
    }
}

// ===========================================
// WiFi Connection
// ===========================================
void connectToWiFi() {
    Serial.print("Connecting to WiFi");
    const char* currentSsid = firebaseSsid.length() > 0 ? firebaseSsid.c_str() : "Wokwi-GUEST";
    const char* currentPassword = firebasePassword.length() > 0 ? firebasePassword.c_str() : "";

    WiFi.begin(currentSsid, currentPassword);
    int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 40) { // ลองเชื่อมต่อ 20 วินาที
        Serial.print(".");
        delay(500);
        retries++;
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.print("Connected with IP: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("\nFailed to connect to WiFi using stored credentials.");
        Serial.println("Attempting to connect with hardcoded default WiFi.");
        WiFi.begin("Wokwi-GUEST", ""); // ลองเชื่อมต่อกับค่าเริ่มต้น (ถ้ายังไม่ได้เชื่อมต่อ)
        retries = 0;
        while (WiFi.status() != WL_CONNECTED && retries < 40) {
            Serial.print("-");
            delay(500);
            retries++;
        }
        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("\nConnected to hardcoded default WiFi.");
        } else {
            Serial.println("\nFailed to connect to any WiFi. Operating in offline mode.");
        }
    }
}

// ===========================================
// Firebase Stream Callbacks
// ===========================================
void firebaseStreamCallback(FirebaseStream data) { // Corrected: Use FirebaseStream
    // ตรวจสอบว่าข้อมูลมาจาก Device ID ของตัวเอง
    if (!data.dataPath.startsWith("/device/" + deviceId)) {
        Serial.printf("Ignoring stream data from other device: %s\n", data.dataPath.c_str());
        return;
    }

    // ใช้ data.dataPath.substring เพื่อตัดส่วนที่ไม่จำเป็นออก ให้เหลือแค่ส่วนที่เป็น commands, meals, settings
    String relativePath = data.dataPath.substring(("/device/" + deviceId).length());

    if (relativePath == "/status/online") {
        bool onlineStatus = data.value.as<bool>();
        Serial.printf("Device online status updated: %s\n", onlineStatus ? "online" : "offline");
    } else if (relativePath == "/status/deviceId") {
        String newDeviceId = data.value.as<String>();
        if (newDeviceId != deviceId) {
            deviceId = newDeviceId;
            Serial.printf("Device ID updated to: %s\n", deviceId.c_str());
            fetchMealsFromFirebase();
            fetchSettingsFromFirebase(); 
        }
    } else if (relativePath == "/commands/feedNow") {
        Serial.println("FeedNow command received!");
        json.setJsonData(data.value.raw());
        handleFeedNowCommand(json);
        Firebase.RTDB.deleteNode(&firebaseData, data.dataPath); 
    } else if (relativePath == "/commands/checkFoodLevel") {
        Serial.println("CheckFoodLevel command received!");
        handleCheckFoodLevelCommand();
        Firebase.RTDB.deleteNode(&firebaseData, data.dataPath); 
    } else if (relativePath == "/commands/checkMovement") {
        Serial.println("CheckMovement command received!");
        handleCheckMovementCommand();
        Firebase.RTDB.deleteNode(&firebaseData, data.dataPath); 
    } else if (relativePath == "/commands/makeNoise") {
        Serial.println("MakeNoise command received!");
        json.setJsonData(data.value.raw());
        handleMakeNoiseCommand(json);
        Firebase.RTDB.deleteNode(&firebaseData, data.dataPath); 
    } else if (relativePath == "/meals") {
        Serial.println("Meals data updated from Firebase.");
        fetchMealsFromFirebase();
    } else if (relativePath == "/settings") {
        Serial.println("Settings data updated from Firebase.");
        fetchSettingsFromFirebase(); 
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
    while (!getLocalTime(&timeinfo) && (millis() - startSyncTime < 10000)) { // ลอง sync 10 วินาที
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
    return String(Firebase.RTDB.getTimestamp(&firebaseData)); 
}

void updateDeviceStatus(bool online) {
    if (deviceId.length() == 0) return; 
    Firebase.RTDB.setBool(&firebaseData, "/device/" + deviceId + "/status/online", online); 
    if (online) {
        Firebase.RTDB.set(&firebaseData, "/device/" + deviceId + "/status/lastOnline", Firebase.RTDB.getTimestamp(&firebaseData)); 
    }
}

void updateFoodLevel(float distance) {
    if (deviceId.length() == 0) return;
    Firebase.RTDB.setFloat(&firebaseData, "/device/" + deviceId + "/status/foodLevel", distance); 
    Firebase.RTDB.set(&firebaseData, "/device/" + deviceId + "/status/lastFoodLevelCheck", Firebase.RTDB.getTimestamp(&firebaseData)); 
}

void updateLastMovementDetected(unsigned long timestamp) {
    if (deviceId.length() == 0) return;
    Firebase.RTDB.set(&firebaseData, "/device/" + deviceId + "/status/lastMovementDetected", timestamp); 
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

    currentDispenseAmount = amount;
    currentDispenseDuration = amount * 1000; // Example: 1 unit = 1 second (adjust as needed)

    currentNoiseFile = noiseFile;
    currentOriginalNoiseFileName = originalNoiseName;
    currentFanStrength = clamp(fan_strength, 1.0f, 3.0f); 
    currentFanDirection = clamp(fan_direction, 60.0f, 120.0f); 
    currentSwingMode = swing_mode;
    
    foodServo.write(90); // Example: angle to open food
    isDispensing = true;
    dispenseStartTime = millis();

    if (!currentSwingMode) {
        fanServo.write(currentFanDirection); 
    }
    
    if (currentNoiseFile.length() > 0) { 
        playSoundFromURL(currentNoiseFile);
    } else {
        Serial.println("No noise file. Playing default beep.");
        beep(500, 1500); 
    }
    
    Serial.printf("Fan set to fixed angle: %d degrees, Strength: %d, Swing: %d\n", currentFanDirection, currentFanStrength, currentSwingMode);
}

// ===========================================
// Sound Playing Logic (using ESP8266Audio)
// ===========================================
void playSoundFromURL(const String& url) {
    // ตรวจสอบและหยุดการเล่นเพลงที่กำลังทำงานอยู่ก่อนเริ่มต้นใหม่
    if (mp3 && mp3->isRunning()) { 
        mp3->stop();
    }
    // ลบ objects เก่าทิ้งเพื่อป้องกัน memory leak
    if(httpStream) { delete httpStream; httpStream = nullptr; }
    if(fileSource) { delete fileSource; fileSource = nullptr; }

    // กำหนด AudioOutput (ใช้ I2S หรือ Analog ตามที่เลือกใน setup)
    AudioOutput *currentAudioOutput = audioOutput;
    // AudioOutput *currentAudioOutput = audioOutputAnalog; // หากใช้ Analog DAC แทน

    if (url.startsWith("http://") || url.startsWith("https://")) {
        Serial.printf("Playing from HTTP URL: %s\n", url.c_str());
        httpStream = new AudioFileSourceHTTPStream(url.c_str());
        if(httpStream && httpStream->isFileOpen()) { // ตรวจสอบว่า httpStream ถูกสร้างและเปิดไฟล์ได้
            mp3->begin(httpStream, currentAudioOutput);
        } else {
            Serial.println("Failed to open HTTP stream. Playing default beep.");
            beep(500, 1500);
            if(httpStream) { delete httpStream; httpStream = nullptr; } // ลบทิ้งถ้ามีปัญหา
        }
    } else { // Assume it's a local path on SD card
        Serial.printf("Playing from SD card path: %s\n", url.c_str());
        if (!SD.begin(SD_CS_PIN_LOCAL)) {
            Serial.println("SD Card not available. Cannot play local sound.");
            beep(500, 1500);
            return;
        }
        fileSource = new AudioFileSourceSD(url.c_str());
        if(fileSource && fileSource->isOpen()) { // ตรวจสอบว่า fileSource ถูกสร้างและเปิดไฟล์ได้
            mp3->begin(fileSource, currentAudioOutput);
        } else {
            Serial.println("Failed to open SD file. Playing default beep.");
            beep(500, 1500);
            if(fileSource) { delete fileSource; fileSource = nullptr; } // ลบทิ้งถ้ามีปัญหา
        }
        SD.end(); // ปิดการ์ด SD หลังใช้งานเสร็จ
    }
}

// downloadFile is generally not needed if streaming directly from URL using AudioFileSourceHTTPStream
void downloadFile(const String& url, const String& path) {
    HTTPClient http;
    File file;
    Serial.printf("[HTTP] begin download: %s\n", url.c_str());

    http.begin(url);
    int httpCode = http.GET();

    if (httpCode > 0) {
        if (httpCode == HTTP_CODE_OK) {
            if (!SD.begin(SD_CS_PIN_LOCAL)) {
                Serial.println("SD Card for download failed!");
                http.end();
                return;
            }
            file = SD.open(path, FILE_WRITE);
            if (!file) {
                Serial.println("Failed to open file for writing on SD card.");
                http.end();
                SD.end(); // Close SD if opened
                return;
            }
            http.writeToStream(&file);
            file.close();
            SD.end(); // Close SD after writing
            Serial.printf("[HTTP] file downloaded to %s\n", path.c_str());
        }
    } else {
        Serial.printf("[HTTP] GET failed, error: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
}

void playDownloadedSound(const String& filename) {
    if (mp3 && mp3->isRunning()) {
        mp3->stop();
    }
    if(fileSource) { delete fileSource; fileSource = nullptr; } // Clear previous
    if(httpStream) { delete httpStream; httpStream = nullptr; } // Clear previous

    AudioOutput *currentAudioOutput = audioOutput;
    // AudioOutput *currentAudioOutput = audioOutputAnalog; // หากใช้ Analog DAC แทน

    if (!SD.begin(SD_CS_PIN_LOCAL)) { // Initialize SD card for reading
        Serial.println("SD card not available, cannot play downloaded sound.");
        beep(500, 1500);
        return;
    }
    fileSource = new AudioFileSourceSD(filename.c_str());
    if (fileSource && fileSource->isOpen()) { // ตรวจสอบว่า fileSource ถูกสร้างและเปิดไฟล์ได้
        Serial.printf("Playing %s from SD card...\n", filename.c_str());
        mp3->begin(fileSource, currentAudioOutput);
    } else {
        Serial.printf("Failed to open %s from SD card.\n", filename.c_str());
        beep(500, 1500);
        if(fileSource) { delete fileSource; fileSource = nullptr; }
    }
    SD.end(); // Close SD after use
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
    distanceCm = duration * SOUND_SPEED / 2; 

    Serial.printf("Distance: %.2f cm\n", distanceCm);
    return distanceCm;
}

// ===========================================
// Buzzer Beep Function
// ===========================================
void beep(int duration_ms, int frequency_hz) {
    if (frequency_hz > 0) {
        tone(BEEP_PIN, frequency_hz);
    }
    delay(duration_ms);
    noTone(BEEP_PIN);
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
    if (json.get(data, "audioUrl")) noiseFile = data.stringValue; 
    if (json.get(data, "originalNoiseFileName")) originalNoiseName = data.stringValue; 

    dispenseFood(amount, fan_strength, fan_direction, swing_mode, noiseFile, originalNoiseName);
}

void handleCheckFoodLevelCommand() {
    float distance = getFoodLevel();
    updateFoodLevel(distance);
    Firebase.RTDB.setString(&firebaseData, "/device/" + deviceId + "/notifications/" + getFirebaseTimestampString(),
                      "Food level checked: " + String(distance, 2) + " cm"); 
}

void handleCheckMovementCommand() {
    Serial.println("Received check movement command. PIR updates passively.");
    Firebase.RTDB.setString(&firebaseData, "/device/" + deviceId + "/notifications/" + getFirebaseTimestampString(),
                          "Movement check requested. Last detected time is available in app."); 
}

void handleMakeNoiseCommand(FirebaseJson &json) {
    String url = "";
    FirebaseJsonData data; 
    if (json.get(data, "url")) url = data.stringValue;

    if (url.length() > 0) {
        Serial.printf("Received makeNoise command with URL: %s\n", url.c_str());
        playSoundFromURL(url);
        Firebase.RTDB.setString(&firebaseData, "/device/" + deviceId + "/notifications/" + getFirebaseTimestampString(),
                          "Playing sound from URL: " + url); 
    } else {
        Serial.println("MakeNoise command received but no URL specified.");
        beep(500, 1000); 
        Firebase.RTDB.setString(&firebaseData, "/device/" + deviceId + "/notifications/" + getFirebaseTimestampString(),
                          "Make Noise command received with no URL. Playing default beep."); 
    }
}

// ===========================================
// Firebase Data Fetchers
// ===========================================
void fetchMealsFromFirebase() {
    if (deviceId.length() == 0) {
        Serial.println("Cannot fetch meals: Device ID not set.");
        return;
    }
    Serial.println("Fetching meals from Firebase...");
    if (Firebase.RTDB.get(&firebaseData, "/device/" + deviceId + "/meals")) { 
        if (firebaseData.dataType() == "json") {
            FirebaseJson jsonRef; 
            jsonRef.setJsonData(firebaseData.jsonString()); 
            
            size_t len = jsonRef.iteratorBegin();
            mealCount = 0;
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
                    
                    newMeal.amount = clamp(newMeal.amount, 1.0f, 100.0f);
                    newMeal.fanStrength = clamp(newMeal.fanStrength, 1.0f, 3.0f);
                    newMeal.fanDirection = clamp(newMeal.fanDirection, 60.0f, 120.0f);

                    meals[mealCount++] = newMeal;
                    Serial.printf("Loaded meal: %02d:%02d, Amount: %d, FanStrength: %d, FanDirection: %d, SwingMode: %d\n",
                                  newMeal.hour, newMeal.minute, newMeal.amount, newMeal.fanStrength,
                                  newMeal.fanDirection, newMeal.swingMode);
                } else {
                    Serial.printf("Failed to get time for meal at index %d\n", i);
                }
            }
            jsonRef.iteratorEnd();
            Serial.printf("Total meals loaded: %d\n", mealCount);
        } else {
            Serial.println("Meals data is not JSON or empty.");
            mealCount = 0; 
        }
    } else {
        Serial.println("Failed to get meals data.");
        mealCount = 0; 
    }
}

void fetchSettingsFromFirebase() {
    if (deviceId.length() == 0) {
        Serial.println("Cannot fetch settings: Device ID not set.");
        return;
    }
    Serial.println("Fetching settings from Firebase...");
    if (Firebase.RTDB.get(&firebaseData, "/device/" + deviceId + "/settings")) { 
        if (firebaseData.dataType() == "json") {
            FirebaseJson jsonRef;
            jsonRef.setJsonData(firebaseData.jsonString()); 

            FirebaseJsonData data;
            
            // Time Zone Offset
            if (jsonRef.get(data, "timeZoneOffset")) { 
                gmtOffset_sec = data.floatValue * 3600; 
                Serial.printf("Time Zone Offset: %.1f\n", data.floatValue);
            }

            // Bottle Size
            if (jsonRef.get(data, "bottleSize")) {
                bottleSize = data.stringValue;
                Serial.printf("Bottle Size: %s\n", bottleSize.c_str());
            }

            if (bottleSize == "custom") {
                if (jsonRef.get(data, "customBottleHeight")) {
                    customBottleHeight = data.floatValue;
                    Serial.printf("Custom Bottle Height: %.2f cm\n", customBottleHeight);
                }
            }

            // Wi-Fi Credentials
            FirebaseJsonData wifiCredentialsData;
            if (jsonRef.get(wifiCredentialsData, "wifiCredentials")) {
                if (wifiCredentialsData.dataType == FirebaseJson::JSON_OBJECT) {
                    // ✅ แก้ไข: ดึงค่าจาก wifiCredentialsData.jsonValue (เป็น FirebaseJson object)
                    if (wifiCredentialsData.jsonValue.get(data, "ssid")) {
                        firebaseSsid = data.stringValue;
                        Serial.printf("Loaded WiFi SSID: %s\n", firebaseSsid.c_str());
                    }
                    if (wifiCredentialsData.jsonValue.get(data, "password")) {
                        // บรรทัดนี้ถูกต้องแล้วหลังจากแก้ไข `.jsonValue.get()`
                        firebasePassword = data.stringValue; 
                        Serial.println("Loaded WiFi Password."); 
                    }
                }
            }
            Serial.println("Settings loaded successfully.");
        } else {
            Serial.println("Settings data is not JSON or empty.");
        }
    } else {
        Serial.println("Failed to get settings data.");
    }
}
