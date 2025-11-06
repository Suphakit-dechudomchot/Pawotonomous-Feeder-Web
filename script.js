// script.js (ไฟล์หลัก V2)

// Import ฟังก์ชันและตัวแปรจาก animalCalculator.js
import { populateAnimalType, updateAnimalSpecies, updateRecommendedAmount } from './animalCalculator.js';

// ✅ Import Firebase Modular SDKs - UPDATED TO 10.10.0
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
// ✅ Import modular database functions - UPDATED TO 10.10.0
import { getDatabase, ref, onValue, set, update, remove, push, query, orderByChild, limitToLast, limitToFirst, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";


// ===============================================
// ✅ Firebase & Supabase Configuration
// ===============================================
const firebaseConfig = {
  apiKey: "AIzaSyAg-2VtD5q6Rw8JDKTiihp-ribH0HHvU-o",
  authDomain: "pawtonomous.firebaseapp.com",
  databaseURL: "https://pawtonomous-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pawtonomous",
  storageBucket: "pawtonomous.appspot.com",
  messagingSenderId: "984959145190",
  appId: "1:984959145190:web:b050c1ed26962cdef4d727",
  measurementId: "G-1QQ3FLHD0M"
};

// ✅ Initialize Firebase App and Services using modular syntax
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp); // Use getDatabase with the app instance
const auth = getAuth(firebaseApp);

// ✅ สำคัญ: ตรวจสอบและแก้ไข Public (Anon) Key ของ Supabase ของคุณที่นี่
// คีย์ควรจะเป็นสตริงเดียว ไม่ใช่การต่อกันของหลายๆ คีย์
const supabaseClient = supabase.createClient(
    'https://gnkgamizqlosvhkuwzhc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdua2dhbWl6cWxvc3Zoa3V3emhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MzY3MTUsImV4cCI6MjA2NjAxMjcxNX0.Dq5oPJ2zV8UUyoNakh4JKzDary8MIGZLDN5BppF_pgc' // ⬅️⬅️⬅️ เปลี่ยนตรงนี้ด้วยคีย์จริงของคุณ
);

// ===============================================
// ✅ Global Variables and State
// ===============================================
let currentDeviceId = null;
const CALIBRATION_TEST_SECONDS = 5;
const NOTIFICATION_HISTORY_LIMIT = 50;
const MEAL_BLOCK_DURATION_SECONDS = {
    movementCheck: 3 * 60, // 3 minutes = 180 seconds
    cooldown: 30, // 30 seconds
};

// DOM Element References - Initialized in DOMContentLoaded
const DOMElements = {};

let activeMealId = null;
let lastNotificationId = '';
let gramsPerSecond = null; // Store calibration value globally
let hasShownInitialSetupOverlay = false; // ✅ Flag to show overlay only once per session
let isAuthReady = false; // ✅ Flag to indicate if Firebase Auth is ready
let countdownInterval = null; // สำหรับเก็บ Interval ID ของตัวนับถอยหลัง
let allMealsData = {}; // เก็บข้อมูลมื้ออาหารทั้งหมดสำหรับใช้ใน countdown

// Constants for time picker looping
const TIME_PICKER_BUFFER = 5; // Number of elements to duplicate at start/end
const TIME_PICKER_ITEM_HEIGHT = 50; // Height of each time slot div

// ===============================================
// ✅ Utility Functions
// ===============================================
function sanitizeFileName(name) {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
}
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// ===============================================
// ✅ UI Management (Alerts, Modals, Tabs, Buttons)
// ===============================================
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId)?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.target === sectionId);
    });

    // จัดการตัวนับถอยหลังเมื่อเปลี่ยน Section
    if (sectionId === 'meal-schedule-section') {
        startCountdown();
    } else {
        stopCountdown();
    }

    if (sectionId === 'notifications-section') {
        fetchAndDisplayNotifications();
    }
}

function setButtonState(button, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    button.classList.toggle('loading', isLoading);
    const spinner = button.querySelector('.spinner');
    if (isLoading && !spinner) {
        const newSpinner = document.createElement('div');
        newSpinner.className = 'spinner';
        button.prepend(newSpinner);
    } else if (!isLoading && spinner) {
        spinner.remove();
    }
}

async function showCustomAlert(title, message, type = "info") {
    // Ensure DOMElements are initialized before using them
    if (!DOMElements.customAlertTitle || !DOMElements.customAlertMessage || !DOMElements.customAlertContent || !DOMElements.customAlertOverlay || !DOMElements.customAlertOkButton) {
        console.error("Custom alert elements not found. Falling back to native alert.");
        alert(`${title}: ${message}`);
        return;
    }

    DOMElements.customAlertTitle.textContent = title;
    DOMElements.customAlertMessage.textContent = message;
    DOMElements.customAlertContent.className = `custom-alert-content ${type}`;
    DOMElements.customAlertOverlay.classList.add('show');
    return new Promise(resolve => {
        const handler = () => {
            DOMElements.customAlertOverlay.classList.remove('show');
            DOMElements.customAlertOkButton.removeEventListener('click', handler);
            resolve();
        };
        DOMElements.customAlertOkButton.addEventListener('click', handler);
    });
}

function showModal(modalElement) {
    if (!modalElement) return;
    modalElement.style.display = 'flex';
}
function hideModal(modalElement) {
    if (!modalElement) return;
    modalElement.style.display = 'none';
}

function showNewNotificationToast(message) {
    if (!DOMElements.newNotificationToastMessage || !DOMElements.newNotificationToast) return;
    DOMElements.newNotificationToastMessage.textContent = message;
    DOMElements.newNotificationToast.classList.add('show');
    setTimeout(() => DOMElements.newNotificationToast.classList.remove('show'), 5000);
}

// ===============================================
// ✅ Device & Session Management (Login/Logout)
// ===============================================
async function setAndLoadDeviceId(id, navigateToMealSchedule = false) { // เพิ่ม parameter ใหม่
    console.log("setAndLoadDeviceId called with ID:", id);
    currentDeviceId = id;
    localStorage.setItem('pawtonomous_device_id', currentDeviceId);
    
    if (DOMElements.deviceSelectionSection) {
        DOMElements.deviceSelectionSection.style.display = 'none';
        console.log("deviceSelectionSection hidden.");
    } else {
        console.warn("deviceSelectionSection not found in DOMElements!");
    }

    if (DOMElements.mainContentContainer) {
        DOMElements.mainContentContainer.style.display = 'block';
        console.log("mainContentContainer shown.");
    } else {
        console.warn("mainContentContainer not found in DOMElements!");
    }

    // ✅ Only load data if auth is ready
    if (isAuthReady) {
        try {
            // Load all settings and data for the new device ID
            await listenToDeviceStatus(); // Sets up listener, doesn't wait for data to arrive
            await loadSettingsFromFirebase(); // This will also trigger the initial setup check
            await setupNotificationListener(); // Sets up listener
            
            // ✅ 5. ถ้าตั้งค่าครบแล้วให้เด้งไปที่หน้ามื้ออาหาร
            const isSetupComplete = await checkInitialSetupComplete(); // เรียกใช้เพื่อตรวจสอบสถานะ
            if (isSetupComplete && navigateToMealSchedule) {
                showSection('meal-schedule-section');
            } else if (!isSetupComplete) {
                // ถ้ายังตั้งค่าไม่ครบ ให้แสดง overlay บังคับตั้งค่า
                if (DOMElements.forceSetupOverlay) {
                    DOMElements.forceSetupOverlay.style.display = 'flex';
                    hasShownInitialSetupOverlay = true;
                }
            }
            // Always load meals, regardless of setup completion, as countdown depends on it.
            // The countdown display will show appropriate message if settings are incomplete.
            await loadMeals(); 
            console.log("All initial data loading functions initiated.");
        } catch (error) {
            console.error("Error during initial data loading in setAndLoadDeviceId:", error);
            await showCustomAlert("ข้อผิดพลาดในการโหลดข้อมูล", "ไม่สามารถโหลดข้อมูลเริ่มต้นได้. โปรดลองใหม่อีกครั้ง.", "error");
        }
    } else {
        console.log("Authentication not ready, deferring data load.");
    }
}

// ✅ 1. แก้ไขให้มีวิธีออกจากบัญชีได้
function handleLogout() {
    localStorage.removeItem('pawtonomous_device_id');
    currentDeviceId = null;
    hasShownInitialSetupOverlay = false; // Reset flag on logout
    auth.signOut(); // Sign out from Firebase Auth
    window.location.reload(); // Easiest way to reset the app state
}

// ===============================================
// ✅ Initial Setup Check (สำหรับจุดแดงและบังคับตั้งค่าครั้งแรก)
// ===============================================
async function checkInitialSetupComplete() {
    console.log("checkInitialSetupComplete called.");
    if (!currentDeviceId) {
        console.log("checkInitialSetupComplete: No currentDeviceId.");
        return false;
    }
    try {
        // ✅ Use ref() and onValue() for modular SDK
        const settingsSnapshot = await new Promise(resolve => {
            onValue(ref(db, `device/${currentDeviceId}/settings`), (snapshot) => {
                resolve(snapshot);
            }, { onlyOnce: true });
        });
        const settings = settingsSnapshot.val() || {};
        
        // Define required settings for the red dot
        let isSetupComplete = true;
        let missingSettings = [];

        // Check Time Zone
        if (settings.timeZoneOffset == null || isNaN(parseFloat(settings.timeZoneOffset))) {
            isSetupComplete = false;
            missingSettings.push("โซนเวลา");
        }

        // Check Bottle Size and Custom Height (if applicable)
        if (settings.bottleSize == null || settings.bottleSize === '') {
            isSetupComplete = false;
            missingSettings.push("ขนาดขวด");
        } else if (settings.bottleSize === 'custom') {
            if (settings.customBottleHeight == null || isNaN(parseFloat(settings.customBottleHeight)) || parseFloat(settings.customBottleHeight) <= 0) {
                isSetupComplete = false;
                missingSettings.push("ความสูงถังอาหาร (กำหนดเอง)");
            }
        }

        // Check Calibration
        if (settings.calibration?.grams_per_second == null || settings.calibration.grams_per_second <= 0) {
            isSetupComplete = false;
            missingSettings.push("ค่าการสอบเทียบปริมาณอาหาร");
        }

        // ✅ 2. เพิ่มการเช็ค Wi-Fi SSID และ Password
        if (!settings.wifiCredentials || !settings.wifiCredentials.ssid || settings.wifiCredentials.ssid.trim() === '') {
            isSetupComplete = false;
            missingSettings.push("ชื่อ Wi-Fi (SSID)");
        }
        if (!settings.wifiCredentials || !settings.wifiCredentials.password || settings.wifiCredentials.password.trim() === '') {
            isSetupComplete = false;
            missingSettings.push("รหัสผ่าน Wi-Fi");
        }

        console.log("checkInitialSetupComplete: isSetupComplete =", isSetupComplete);
        console.log("checkInitialSetupComplete: Missing settings =", missingSettings.join(', ') || "None");

        // ✅ 4. แสดงจุดแดงบนเมนูตั้งค่าถ้ายังไม่ครบ
        if (DOMElements.settingsNavDot) {
            DOMElements.settingsNavDot.style.display = isSetupComplete ? 'none' : 'block';
            console.log("settingsNavDot display set to:", DOMElements.settingsNavDot.style.display);
        } else {
            console.warn("settingsNavDot element not found!");
        }
        
        const isInitialForcedSetup = (DOMElements.forceSetupOverlay && DOMElements.forceSetupOverlay.style.display === 'flex');
        
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.dataset.target === 'device-settings-section' || item.dataset.target === 'deviceSelectionSection') {
                item.disabled = false;
                item.classList.remove('disabled-overlay');
            } else if (isInitialForcedSetup || !isSetupComplete) { // Disable if forced setup or if setup is incomplete
                item.disabled = true;
                item.classList.add('disabled-overlay');
            } else {
                item.disabled = false;
                item.classList.remove('disabled-overlay');
            }
            console.log(`Nav item ${item.dataset.target} disabled: ${item.disabled}`);
        });

        // แสดง overlay เฉพาะเมื่อ setup ไม่สมบูรณ์, ยังไม่เคยแสดง, และไม่ได้อยู่ในหน้าตั้งค่าอยู่แล้ว
        if (!isSetupComplete && !hasShownInitialSetupOverlay && DOMElements.mainContentContainer.style.display === 'block' && document.getElementById('device-settings-section')?.classList.contains('active') === false) {
            if (DOMElements.forceSetupOverlay) {
                DOMElements.forceSetupOverlay.style.display = 'flex';
                hasShownInitialSetupOverlay = true;
                console.log("forceSetupOverlay displayed for initial incomplete setup.");
            }
        } else if (isSetupComplete && DOMElements.forceSetupOverlay && DOMElements.forceSetupOverlay.style.display === 'flex') {
            DOMElements.forceSetupOverlay.style.display = 'none';
            console.log("forceSetupOverlay hidden because setup is complete.");
        }

        return isSetupComplete;
    } catch (error) {
        console.error("Error checking initial setup:", error);
        return false;
    }
}

// ===============================================
// ✅ Device Status Listeners
// ===============================================
function updateDeviceStatusUI(isOnline) {
    if (!DOMElements.deviceStatusCircle || !DOMElements.deviceStatusText) return; // Safety check
    DOMElements.deviceStatusCircle.className = `status-circle ${isOnline ? 'online' : 'offline'}`;
    DOMElements.deviceStatusText.className = `status-text ${isOnline ? 'online' : 'offline'}`;
    DOMElements.deviceStatusText.textContent = isOnline ? 'ออนไลน์' : 'ออฟไลน์';
    
    // Enable/disable real-time command buttons (excluding makenoiseBtn for now)
    [DOMElements.checkFoodLevelBtn, DOMElements.checkAnimalMovementBtn].forEach(btn => {
        if (btn) btn.disabled = !isOnline;
    });
    // Special handling for feedNowBtn: disabled if no amount or offline
    if (DOMElements.feedNowBtn) {
        const amount = parseFloat(DOMElements.feedNowAmountInput.value);
        DOMElements.feedNowBtn.disabled = !isOnline || isNaN(amount) || amount <= 0;
    }
    // Special handling for makenoiseBtn: disabled if no file or offline
    if (DOMElements.makenoiseBtn) {
        DOMElements.makenoiseBtn.disabled = !isOnline || !DOMElements.makenoiseAudioInput.files.length;
    }
}

function listenToDeviceStatus() {
    if (!currentDeviceId) return;
    // ✅ Use ref() and onValue() for modular SDK
    onValue(ref(db, `device/${currentDeviceId}/status`), (snapshot) => {
        const status = snapshot.val() || {};
        updateDeviceStatusUI(status.online);
        updateFoodLevelDisplay(status.foodLevel);
        if (DOMElements.lastMovementDisplay) { // Safety check
            DOMElements.lastMovementDisplay.textContent = status.lastMovementDetected 
                ? new Date(status.lastMovementDetected).toLocaleString('th-TH', { timeStyle: 'short' }) 
                : 'ไม่มีข้อมูล';
        }
    });
}

async function updateFoodLevelDisplay(foodLevelCm) {
    if (!DOMElements.currentFoodLevelDisplay) return; // Safety check
    try {
        // ✅ Use ref() and onValue() for modular SDK
        const settingsSnapshot = await new Promise(resolve => {
            onValue(ref(db, `device/${currentDeviceId}/settings`), (snapshot) => {
                resolve(snapshot);
            }, { onlyOnce: true });
        });
        const settings = settingsSnapshot.val() || {}; // Corrected: use settingsSnapshot.val()
        let bottleHeight = 0;
        if (settings.bottleSize === 'custom') {
            bottleHeight = parseFloat(settings.customBottleHeight);
        } else if (settings.bottleSize) {
            bottleHeight = parseFloat(settings.bottleSize);
        }

        if (isNaN(foodLevelCm) || foodLevelCm === null || bottleHeight <= 0) {
            DOMElements.currentFoodLevelDisplay.textContent = "- %";
            return;
        }

        const remainingHeight = bottleHeight - foodLevelCm;
        const percentage = clamp((remainingHeight / bottleHeight) * 100, 0, 100);
        DOMElements.currentFoodLevelDisplay.textContent = `${Math.round(percentage)} %`;
    } catch (error) {
        console.error("Error updating food level display:", error);
        DOMElements.currentFoodLevelDisplay.textContent = "Error";
    }
}

// ==========================================================
// NOTIFICATION SYSTEM (FIXED MULTIPLE ENTRIES)
// ==========================================================
let cleanupScheduled = false;

function setupNotificationListener() {
  if (!currentDeviceId) return;

  const notificationsRef = ref(db, `device/${currentDeviceId}/notifications`);
  onValue(notificationsRef, (snapshot) => {
    if (!snapshot.exists()) {
      displayNotificationsList([]);
      return;
    }

    const notifications = [];
    snapshot.forEach((child) => {
      const data = child.val();
      notifications.push({
        id: child.key,
        message: data.message,
        timestamp: data.timestamp,
        read: data.read,
        type: data.type || "info",
      });
    });

    notifications.sort((a, b) => b.timestamp - a.timestamp);
    displayNotificationsList(notifications);

    const latest = notifications[0];
    if (latest && latest.id !== lastNotificationId) {
      lastNotificationId = latest.id;
      showNewNotificationToast(latest.message);
    }

    // 🔧 cleanup หลัง 10 วินาที
    if (!cleanupScheduled) {
      cleanupScheduled = true;
      setTimeout(() => {
        cleanupOldNotifications();
        cleanupScheduled = false;
      }, 10000);
    }
  });
} // ✅ ปิด function ให้ครบ

function fetchAndDisplayNotifications() {
  if (!currentDeviceId) return;

  const notificationsRef = ref(db, `device/${currentDeviceId}/notifications`);
  get(notificationsRef).then((snapshot) => {
    if (!snapshot.exists()) {
      displayNotificationsList([]);
      return;
    }

    const notifications = [];
    snapshot.forEach((child) => {
      const data = child.val();
      notifications.push({
        id: child.key,
        message: data.message,
        timestamp: data.timestamp,
        read: data.read,
        type: data.type || "info",
      });
    });

    notifications.sort((a, b) => b.timestamp - a.timestamp);
    displayNotificationsList(notifications);
  });
}

function displayNotificationsList(notifications) {
  const list = DOMElements?.notificationHistoryList || document.getElementById('notificationHistoryList');
  if (!list) {
    console.warn("⚠️ notificationHistoryList element not found");
    return;
  }

  list.innerHTML = '';

  if (notifications.length === 0) {
    list.innerHTML = '<li>ไม่มีการแจ้งเตือน</li>';
    return;
  }

  notifications.forEach((n) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${n.message}</span>
      <span class="notification-timestamp">
        ${new Date(n.timestamp).toLocaleString('th-TH')}
      </span>`;
    list.appendChild(li);
  });
}

async function cleanupOldNotifications() {
  if (!currentDeviceId) return;
  const notificationsRef = ref(db, `device/${currentDeviceId}/notifications`);
  try {
    const snapshot = await new Promise((resolve) => {
      onValue(query(notificationsRef, orderByChild('timestamp')), (snapshot) => {
        resolve(snapshot);
      }, { onlyOnce: true });
    });

    const notifications = [];
    snapshot.forEach((child) =>
      notifications.push({ key: child.key, ...child.val() })
    );

    if (notifications.length > NOTIFICATION_HISTORY_LIMIT) {
      const updates = {};
      notifications.sort((a, b) => a.timestamp - b.timestamp);
      const notificationsToDelete = notifications.slice(
        0,
        notifications.length - NOTIFICATION_HISTORY_LIMIT
      );
      notificationsToDelete.forEach((n) => {
        updates[n.key] = null;
      });
      await update(notificationsRef, updates);
      console.log(`Cleaned up ${notificationsToDelete.length} old notifications.`);
    }
  } catch (error) {
    console.error("Error cleaning up notifications:", error);
  }
}

// ===============================================
// ✅ System Settings
// ===============================================
async function loadSettingsFromFirebase() {
    if (!currentDeviceId || !isAuthReady) { // ✅ Ensure auth is ready before loading settings
        console.log("Auth not ready or no device ID, skipping loadSettingsFromFirebase.");
        return;
    }
    try {
        // ✅ Use ref() and onValue() for modular SDK
        const snapshot = await new Promise(resolve => {
            onValue(ref(db, `device/${currentDeviceId}/settings`), (snapshot) => {
                resolve(snapshot);
            }, { onlyOnce: true });
        });
        const settings = snapshot.val() || {};

        // Set global gramsPerSecond
        gramsPerSecond = settings.calibration?.grams_per_second || null; // Corrected typo here

        // TimeZone
        if (DOMElements.timeZoneOffsetSelect) DOMElements.timeZoneOffsetSelect.value = settings.timeZoneOffset ?? ''; // Default to empty if not set

        // Bottle Size
        if (DOMElements.bottleSizeSelect) DOMElements.bottleSizeSelect.value = settings.bottleSize ?? '';
        if (DOMElements.customBottleHeightInput) {
            DOMElements.customBottleHeightInput.style.display = settings.bottleSize === 'custom' ? 'block' : 'none';
            DOMElements.customBottleHeightInput.value = settings.customBottleHeight ?? '';
        }

        // Wi-Fi
        if (DOMElements.wifiSsidInput) DOMElements.wifiSsidInput.value = settings.wifiCredentials?.ssid ?? '';
        if (DOMElements.wifiPasswordInput) DOMElements.wifiPasswordInput.value = settings.wifiCredentials?.password ?? '';

        // Calibration Display
        if (DOMElements.currentGramsPerSecondDisplay) {
            DOMElements.currentGramsPerSecondDisplay.textContent = gramsPerSecond ? `${gramsPerSecond.toFixed(2)} กรัม/วินาที` : "- กรัม/วินาที";
        }

        // After loading, check if setup is complete
        await checkInitialSetupComplete();

    } catch (error) {
        console.error("Error loading system settings:", error);
        await showCustomAlert("ข้อผิดพลาด", `ไม่สามารถโหลดการตั้งค่าระบบได้`, "error");
    }
}

const saveSettingsToFirebase = debounce(async (settingType) => {
    if (!currentDeviceId || !isAuthReady) { // ✅ Ensure auth is ready before saving settings
        await showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์ หรือการยืนยันตัวตนยังไม่พร้อม. โปรดลองใหม่อีกครั้ง.", "error");
        return;
    }
    let settingsToSave = {};
    try {
        if (settingType === 'timezone') {
            settingsToSave.timeZoneOffset = parseFloat(DOMElements.timeZoneOffsetSelect.value);
        } else if (settingType === 'bottlesize') {
            settingsToSave.bottleSize = DOMElements.bottleSizeSelect.value;
            settingsToSave.customBottleHeight = settingsToSave.bottleSize === 'custom' ? parseFloat(DOMElements.customBottleHeightInput.value) : null;
        } else if (settingType === 'wifi') {
            settingsToSave.wifiCredentials = {
                ssid: DOMElements.wifiSsidInput.value,
                password: DOMElements.wifiPasswordInput.value
            };
        }
        // ✅ Use update() for modular SDK
        await update(ref(db, `device/${currentDeviceId}/settings`), settingsToSave);
        
        // ✅ 4. ตรวจสอบสถานะการตั้งค่าหลังบันทึก เพื่ออัปเดตจุดแดง
        await checkInitialSetupComplete(); 
        // ✅ 2. อัปเดตตัวนับถอยหลังเมื่อ TimeZone เปลี่ยน
        updateCountdownDisplay();
    }
    catch (error) {
        console.error(`Error saving system settings (${settingType}):`, error);
        await showCustomAlert("ข้อผิดพลาด", `ไม่สามารถบันทึกการตั้งค่าได้`, "error");
    }
}, 1000);

// ===============================================
// ✅ Calibration
// ===============================================
function openCalibrationModal() {
    console.log("openCalibrationModal called."); // Add this log
    if (!DOMElements.calibrationModal) return; // Safety check
    showModal(DOMElements.calibrationModal);
    DOMElements.calibrationStatus.textContent = "กด 'ปล่อยอาหารทดสอบ' เพื่อเริ่ม";
    DOMElements.calibratedWeightInput.value = '';
    DOMElements.saveCalibrationBtn.disabled = true;
    setButtonState(DOMElements.startCalibrationTestBtn, false);
    // Enable/disable start calibration button based on device online status
    if (DOMElements.deviceStatusCircle) {
        DOMElements.startCalibrationTestBtn.disabled = !DOMElements.deviceStatusCircle.classList.contains('online');
    } else {
        DOMElements.startCalibrationTestBtn.disabled = true; // Default to disabled if status circle not found
    }
}

async function startCalibrationTest() {
    if (!currentDeviceId || !isAuthReady) { // ✅ Ensure auth is ready
        await showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์ หรือการยืนยันตัวตนยังไม่พร้อม. โปรดลองใหม่อีกครั้ง.", "error");
        return;
    }
    setButtonState(DOMElements.startCalibrationTestBtn, true);
    DOMElements.calibrationStatus.textContent = "กำลังปล่อยอาหาร...";
    try {
        // ✅ Use set() for modular SDK
        await set(ref(db, `device/${currentDeviceId}/commands/calibrate`), {
            duration_seconds: CALIBRATION_TEST_SECONDS,
            timestamp: serverTimestamp() // ✅ Use serverTimestamp()
        });
        await new Promise(resolve => setTimeout(resolve, CALIBRATION_TEST_SECONDS * 1000 + 1000));
        DOMElements.calibrationStatus.textContent = `ปล่อยอาหารเสร็จสิ้น. กรุณาชั่งน้ำหนักและกรอกข้อมูล.`;
        DOMElements.calibratedWeightInput.disabled = false;
        DOMElements.calibratedWeightInput.focus();
    } catch (error) {
        DOMElements.calibrationStatus.textContent = `ข้อผิดพลาด: ${error.message}`;
        await showCustomAlert("ข้อผิดพลาด", `ไม่สามารถเริ่มการทดสอบได้: ${error.message}`, "error");
    } finally {
        setButtonState(DOMElements.startCalibrationTestBtn, false);
    }
}

async function saveCalibration() {
    if (!currentDeviceId || !isAuthReady) { // ✅ Ensure auth is ready
        await showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์ หรือการยืนยันตัวตนยังไม่พร้อม. โปรดลองใหม่อีกครั้ง.", "error");
        return;
    }
    const weight = parseFloat(DOMElements.calibratedWeightInput.value);
    if (isNaN(weight) || weight <= 0) {
        await showCustomAlert("ข้อมูลผิดพลาด", "กรุณากรอกน้ำหนักที่ถูกต้อง", "error");
        return;
    }
    setButtonState(DOMElements.saveCalibrationBtn, true);
    try {
        const newGramsPerSecond = weight / CALIBRATION_TEST_SECONDS;
        // ✅ Use set() for modular SDK
        await set(ref(db, `device/${currentDeviceId}/settings/calibration`), {
            grams_per_second: newGramsPerSecond,
            last_calibrated: serverTimestamp() // ✅ Use serverTimestamp()
        });
        gramsPerSecond = newGramsPerSecond; // Update global value
        if (DOMElements.currentGramsPerSecondDisplay) { // Safety check
            DOMElements.currentGramsPerSecondDisplay.textContent = `${gramsPerSecond.toFixed(2)} กรัม/วินาที`;
        }
        await showCustomAlert("สำเร็จ", "บันทึกค่า Calibrate แล้ว", "success");
        hideModal(DOMElements.calibrationModal);
        // ✅ 4. ตรวจสอบสถานะการตั้งค่าหลังบันทึก เพื่ออัปเดตจุดแดง
        await checkInitialSetupComplete(); 
    } catch (error) {
        await showCustomAlert("ข้อผิดพลาด", `ไม่สามารถบันทึกค่าได้: ${error.message}`, "error");
    } finally {
        setButtonState(DOMElements.saveCalibrationBtn, false);
    }
}

// ===============================================
// ✅ Meal Schedule & Time Blocking
// ===============================================
function calculateMealBlockDuration(amount) {
    if (!gramsPerSecond || gramsPerSecond <= 0) {
        console.warn("gramsPerSecond is not set for meal block duration calculation. Returning 0.");
        return 0; // Cannot calculate duration without calibration
    }
    const feedDuration = amount / gramsPerSecond; // Duration in seconds based on calibration
    // ✅ 7. คำนวณเวลารวม: เวลาจ่ายอาหาร + เวลาเช็คการเคลื่อนไหว + เวลาพักเครื่อง
    return Math.ceil(feedDuration + MEAL_BLOCK_DURATION_SECONDS.movementCheck + MEAL_BLOCK_DURATION_SECONDS.cooldown);
}

async function isTimeConflict(newMeal, allMeals) {
    if (!allMeals || !gramsPerSecond || gramsPerSecond <= 0) return false; // ไม่ต้องเช็คถ้าไม่มีข้อมูลมื้ออาหารหรือยังไม่ได้ calibrate
    
    // Convert new meal time to a comparable format (milliseconds from midnight)
    const [newHour, newMinute] = newMeal.time.split(':').map(Number);
    const newMealStartTimeMs = (newHour * 60 + newMinute) * 60 * 1000; // Milliseconds from midnight
    const newMealDurationSeconds = calculateMealBlockDuration(newMeal.amount);
    const newMealEndTimeMs = newMealStartTimeMs + (newMealDurationSeconds * 1000);

    for (const id in allMeals) {
        if (id === activeMealId) continue; // Don't check against itself when editing
        const existingMeal = allMeals[id];

        const [existingHour, existingMinute] = existingMeal.time.split(':').map(Number);
        const existingMealStartTimeMs = (existingHour * 60 + existingMinute) * 60 * 1000;
        const existingMealDurationSeconds = calculateMealBlockDuration(existingMeal.amount);
        const existingMealEndTimeMs = existingMealStartTimeMs + (existingMealDurationSeconds * 1000);

        let conflict = false;

        // Check for date/day overlap
        if (newMeal.specificDate && existingMeal.specificDate) {
            // Both are specific dates
            if (newMeal.specificDate === existingMeal.specificDate) {
                if (newMealStartTimeMs < existingMealEndTimeMs && newMealEndTimeMs > existingMealStartTimeMs) {
                    conflict = true;
                }
            }
        } else if (!newMeal.specificDate && !existingMeal.specificDate) {
            // Both are recurring meals
            const daysOverlap = newMeal.days.some(day => existingMeal.days.includes(day));
            if (daysOverlap) {
                if (newMealStartTimeMs < existingMealEndTimeMs && newMealEndTimeMs > existingMealStartTimeMs) {
                    conflict = true;
                }
            }
        } else {
            // One is specific date, one is recurring
            const specificDate = newMeal.specificDate || existingMeal.specificDate;
            const recurringDays = newMeal.specificDate ? existingMeal.days : newMeal.days;
            
            // Get day of week for the specific date (e.g., "Mon", "Tue")
            const specificDateDayOfWeek = new Date(specificDate).toLocaleString('en-US', { weekday: 'short' });

            if (recurringDays.includes(specificDateDayOfWeek)) {
                if (newMealStartTimeMs < existingMealEndTimeMs && newMealEndTimeMs > existingMealStartTimeMs) {
                    conflict = true;
                }
            }
        }

        if (conflict) {
            console.log(`Conflict detected between new meal (${newMeal.time}, ${newMeal.specificDate || newMeal.days.join(',')}) and existing meal (${existingMeal.time}, ${existingMeal.specificDate || existingMeal.days.join(',')}). Durations: New=${newMealDurationSeconds}s, Existing=${existingMealDurationSeconds}s`);
            return true;
        }
    }
    return false;
}

async function loadMeals() {
    if (!currentDeviceId || !DOMElements.mealListContainer || !isAuthReady) { // ✅ Ensure auth is ready
        console.log("Auth not ready or no device ID, skipping loadMeals.");
        return;
    }
    DOMElements.mealListContainer.innerHTML = '<li>กำลังโหลด...</li>';
    try {
        // ✅ Use ref() and onValue() for modular SDK
        // Use onValue for real-time updates of meals
        onValue(ref(db, `device/${currentDeviceId}/meals`), (snapshot) => {
            allMealsData = snapshot.val() || {}; // Store all meals globally
            const mealsArray = allMealsData ? Object.entries(allMealsData).map(([id, data]) => ({ id, ...data })) : [];
            mealsArray.sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));
            
            DOMElements.mealListContainer.innerHTML = ''; // Clear loading message
            if (mealsArray.length > 0) {
                mealsArray.forEach(addMealCard);
            } else {
                DOMElements.mealListContainer.innerHTML = '<p class="notes" style="text-align: center;">ไม่มีมื้ออาหารที่ตั้งค่าไว้</p>';
            }
            // อัปเดตตัวนับถอยหลังหลังจากโหลดมื้ออาหาร
            updateCountdownDisplay();
        });
    } catch (error) {
        console.error("Error loading meals:", error);
        await showCustomAlert("ข้อผิดพลาด", `ไม่สามารถโหลดมื้ออาหารได้: ${error.message}`, "error");
    }
}

function addMealCard(mealData) {
    if (!DOMElements.mealListContainer) return; // Safety check
    const { id, name, time, days = [], specificDate, enabled = true } = mealData;
    const card = document.createElement('div');
    card.className = 'meal-card';
    card.dataset.id = id;

    let daysDisplay = '';
    const dayAbbreviations = {'Mon':'จ', 'Tue':'อ', 'Wed':'พ', 'Thu':'พฤ', 'Fri':'ศ', 'Sat':'ส', 'Sun':'อา'};

    // ✅ 4. แสดงวันใน Meal Card
    if (specificDate) {
        const dateObj = new Date(specificDate);
        const formattedDate = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        daysDisplay = `<div class="meal-card-specific-date">${formattedDate}</div>`;
    } else {
        const displayDaysStr = days.length === 7 ? 'ทุกวัน' : days.map(d => dayAbbreviations[d]).join(' ');
        daysDisplay = `<div class="meal-card-days">${displayDaysStr || 'ไม่ระบุวัน'}</div>`;
    }

    card.innerHTML = `
        <div class="meal-card-left">
            <div class="meal-card-name">${name || 'ไม่มีชื่อ'}</div> <!-- ✅ 3. ชื่อมื้ออาหารอยู่บนสุด -->
            <div class="meal-card-time">${time || '00:00'}</div>
            ${daysDisplay}
        </div>
        <label class="toggle-label">
            <input type="checkbox" class="toggle-switch" ${enabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
        </label>
    `;
    card.addEventListener('click', e => {
        if (!e.target.closest('.toggle-label')) openMealDetailModal(id);
    });
    card.querySelector('.toggle-switch').addEventListener('change', async e => {
        if (!currentDeviceId || !isAuthReady) return; // ✅ Ensure auth is ready
        const isEnabled = e.target.checked;
        try {
            // ✅ Use set() for modular SDK
            await set(ref(db, `device/${currentDeviceId}/meals/${id}/enabled`), isEnabled);
            await showCustomAlert("สำเร็จ", `มื้อ ${name} ถูก ${isEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}`, "info");
            // updateCountdownDisplay() is called by the onValue listener on meals
        } catch (error) {
            console.error("Error toggling meal status:", error);
            await showCustomAlert("ข้อผิดพลาด", `ไม่สามารถเปลี่ยนสถานะมื้ออาหารได้: ${error.message}`, "error");
        }
    });
    DOMElements.mealListContainer.appendChild(card);
}

// Function to close meal detail modal and manage apply button state
function closeMealDetailModal() {
    if (!DOMElements.mealDetailModal) return; // Safety check
    hideModal(DOMElements.mealDetailModal);
    // DOMElements.applyRecommendedAmountBtn.disabled = true; // ปุ่มนี้อยู่ในหน้าคำนวณ ไม่ได้อยู่ใน modal
}

// Open Meal Detail Modal for Add/Edit
async function openMealDetailModal(mealId = null, prefillData = null) {
    if (!DOMElements.mealDetailModal) return; // Safety check
    activeMealId = mealId;
    DOMElements.mealModalTitle.textContent = mealId ? 'แก้ไขมื้ออาหาร' : 'เพิ่มมื้ออาหารใหม่';
    DOMElements.deleteMealDetailBtn.style.display = mealId ? 'inline-flex' : 'none';

    // Reset form
    document.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('selected', 'disabled'));
    // ✅ ซ่อน specificDateInput และล้างค่าเมื่อเปิด modal
    if (DOMElements.specificDateInput) {
        DOMElements.specificDateInput.value = '';
        DOMElements.specificDateInput.style.display = 'none';
    }
    if (DOMElements.specificDateDisplay) DOMElements.specificDateDisplay.textContent = '';
    if (DOMElements.mealAudioInput) DOMElements.mealAudioInput.value = '';
    if (DOMElements.mealAudioStatus) DOMElements.mealAudioStatus.textContent = 'ไม่มีไฟล์';
    if (DOMElements.mealAudioPreview) DOMElements.mealAudioPreview.style.display = 'none';

    let mealData = prefillData || {};
    if (mealId && !prefillData) {
        // ✅ Use ref() and onValue() for modular SDK
        const snapshot = await new Promise(resolve => {
            onValue(ref(db, `device/${currentDeviceId}/meals/${mealId}`), (snapshot) => {
                resolve(snapshot);
            }, { onlyOnce: true });
        });
        mealData = snapshot.val() || {};
    }

    // Populate form
    const [hours, minutes] = (mealData.time || '07:00').split(':');
    updateTimePicker(parseInt(hours), parseInt(minutes));
    
    if (DOMElements.mealNameInput) DOMElements.mealNameInput.value = mealData.name || '';
    if (DOMElements.mealAmountInput) DOMElements.mealAmountInput.value = mealData.amount || 10;
    // ✅ 6. เปลี่ยนความแรงลมจาก 1-3 เป็น 0-100%
    if (DOMElements.mealFanStrengthInput) DOMElements.mealFanStrengthInput.value = mealData.fanStrength ?? 50; // Default to 50%
    if (DOMElements.mealFanDirectionInput) DOMElements.mealFanDirectionInput.value = mealData.fanDirection || 90;
    if (DOMElements.mealSwingModeCheckbox) DOMElements.mealSwingModeCheckbox.checked = mealData.swingMode || false;

    // ✅ ควบคุมสถานะ disabled ของทิศทางลมตามโหมดสวิง
    if (DOMElements.mealFanDirectionInput) {
        DOMElements.mealFanDirectionInput.disabled = DOMElements.mealSwingModeCheckbox.checked;
    }

    // ✅ 8. จัดการการเลือกวันที่เจาะจง
    if (mealData.specificDate) {
        if (DOMElements.specificDateInput) {
            DOMElements.specificDateInput.value = mealData.specificDate;
            DOMElements.specificDateInput.style.display = 'block'; // ✅ แสดง input เมื่อมี specificDate
        }
        if (DOMElements.specificDateDisplay) DOMElements.specificDateDisplay.textContent = `วันที่ระบุ: ${new Date(mealData.specificDate).toLocaleDateString('th-TH')}`;
        document.querySelectorAll('.day-btn:not(.date-btn)').forEach(btn => btn.classList.add('disabled')); // Disable recurring days
        if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.classList.add('selected');
        if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.disabled = false; // Ensure specific date button is enabled
    } else if (mealData.days && mealData.days.length > 0) {
        mealData.days.forEach(day => document.querySelector(`.day-btn[data-day="${day}"]`)?.classList.add('selected'));
        if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.classList.remove('selected');
        if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.disabled = true; // Disable specific date button
        if (DOMElements.specificDateInput) DOMElements.specificDateInput.style.display = 'none'; // ✅ ซ่อน input ถ้าเป็น recurring days
    } else {
        // If no days or specific date are set, enable both options
        document.querySelectorAll('.day-btn:not(.date-btn)').forEach(btn => btn.classList.remove('disabled'));
        if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.disabled = false;
        if (DOMElements.specificDateInput) DOMElements.specificDateInput.style.display = 'none'; // ✅ ซ่อน input โดยค่าเริ่มต้น
    }
    
    if (mealData.audioUrl) {
        if (DOMElements.mealAudioStatus) DOMElements.mealAudioStatus.textContent = mealData.originalNoiseFileName || 'ไฟล์ที่บันทึกไว้';
        if (DOMElements.mealAudioPreview) {
            DOMElements.mealAudioPreview.src = mealData.audioUrl;
            DOMElements.mealAudioPreview.style.display = 'block';
        }
    }

    showModal(DOMElements.mealDetailModal);
}

async function saveMealDetail() {
    if (!currentDeviceId || !DOMElements.saveMealDetailBtn || !isAuthReady) { // ✅ Ensure auth is ready
        await showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์ หรือการยืนยันตัวตนยังไม่พร้อม. โปรดลองใหม่อีกครั้ง.", "error");
        return;
    }
    if (!gramsPerSecond || gramsPerSecond <= 0) { // Ensure gramsPerSecond is valid
        await showCustomAlert("ข้อผิดพลาด", "กรุณาทำการ Calibrate ปริมาณอาหารในหน้า 'ตั้งค่า' ก่อนตั้งค่ามื้ออาหาร", "error");
        return;
    }

    const [hour, minute] = getTimeFromPicker();
    let selectedDays = Array.from(document.querySelectorAll('.day-btn.selected:not(.date-btn)')).map(btn => btn.dataset.day);
    let specificDate = DOMElements.specificDateInput.value || null;

    // ✅ 2. ปรับให้ถ้าผู้ใช้ไม่ได้ระบุวัน ให้เซตไปที่เวลาล่าสุดที่จะถึง
    if (!specificDate && selectedDays.length === 0) {
        const now = new Date();
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
        const mealTimeInMinutes = hour * 60 + minute;

        // Create a Date object for the meal time today (in local timezone)
        const mealDateTimeToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);

        if (mealDateTimeToday.getTime() <= now.getTime()) {
            // If the meal time has already passed today, set it for tomorrow
            now.setDate(now.getDate() + 1);
        }
        // Set specificDate to today or tomorrow's date
        specificDate = now.toISOString().split('T')[0];
        await showCustomAlert("แจ้งเตือน", `เนื่องจากไม่ได้ระบุวัน มื้ออาหารนี้จะถูกตั้งค่าสำหรับวันที่ ${new Date(specificDate).toLocaleDateString('th-TH')}`, "info");
    }


    const mealData = {
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        name: DOMElements.mealNameInput.value.trim() || 'มื้ออาหาร',
        amount: parseInt(DOMElements.mealAmountInput.value) || 10, // Default to 10 if invalid
        fanStrength: clamp(parseInt(DOMElements.mealFanStrengthInput.value), 0, 100), // ✅ 6. เปลี่ยนเป็น 0-100
        fanDirection: clamp(parseInt(DOMElements.mealFanDirectionInput.value), 60, 120),
        swingMode: DOMElements.mealSwingModeCheckbox.checked,
        days: selectedDays, // Use the determined selectedDays
        specificDate: specificDate, // Use the determined specificDate
        enabled: true
    };

    // Validate amount: must be at least 1
    if (mealData.amount < 1) {
        mealData.amount = 1;
        await showCustomAlert("แจ้งเตือน", "ปริมาณอาหารต้องไม่น้อยกว่า 1 กรัม", "warning");
    }

    // ✅ 7. Time blocking check
    // ✅ Use ref() and onValue() for modular SDK
    const existingMealsSnapshot = await new Promise(resolve => {
        onValue(ref(db, `device/${currentDeviceId}/meals`), (snapshot) => {
            resolve(snapshot);
        }, { onlyOnce: true });
    });
    if (await isTimeConflict(mealData, existingMealsSnapshot.val())) {
        await showCustomAlert("เวลาทับซ้อน", "เวลาที่ตั้งค่าทับซ้อนกับมื้ออาหารอื่น กรุณาเลือกเวลาใหม่", "warning");
        return;
    }

    setButtonState(DOMElements.saveMealDetailBtn, true);
    
    // Audio upload
    const file = DOMElements.mealAudioInput.files[0];
    if (file) {
        const path = `meal_noises/${currentDeviceId}/${Date.now()}_${sanitizeFileName(file.name)}`;
        try {
            // ✅ เปลี่ยนชื่อ bucket จาก "feeder-sounds" เป็น "audio"
            const { error } = await supabaseClient.storage.from("audio").upload(path, file);
            if (error) throw error;
            // ✅ เปลี่ยนชื่อ bucket จาก "feeder-sounds" เป็น "audio"
            const { data: publicData } = supabaseClient.storage.from("audio").getPublicUrl(path);
            mealData.audioUrl = publicData.publicUrl;
            mealData.originalNoiseFileName = file.name;
        } catch (e) {
            await showCustomAlert("อัปโหลดล้มเหลว", e.message, "error");
            setButtonState(DOMElements.saveMealDetailBtn, false);
            return;
        }
    } else if (activeMealId) {
        // ✅ Use ref() and onValue() for modular SDK
        const oldDataSnapshot = await new Promise(resolve => {
            onValue(ref(db, `device/${currentDeviceId}/meals/${activeMealId}`), (snapshot) => {
                resolve(snapshot);
            }, { onlyOnce: true });
        });
        const oldData = oldDataSnapshot.val();
        mealData.audioUrl = oldData?.audioUrl || null;
        mealData.originalNoiseFileName = oldData?.originalNoiseFileName || null;
    }

    try {
        // ✅ Use push() and set() or update() for modular SDK
        let mealRef;
        if (activeMealId) {
            mealRef = ref(db, `device/${currentDeviceId}/meals/${activeMealId}`);
            await update(mealRef, mealData);
        } else {
            mealRef = push(ref(db, `device/${currentDeviceId}/meals`));
            await set(mealRef, mealData);
        }
        
        await showCustomAlert("สำเร็จ", "บันทึกมื้ออาหารเรียบร้อย", "success");
        closeMealDetailModal(); // ✅ Use new close function
        // No need to call loadMeals() here, as onValue listener will handle updates
    } catch (error) {
        console.error("Error saving meal:", error);
        await showCustomAlert("ผิดพลาด", `ไม่สามารถบันทึกได้: ${error.message}`, "error");
    } finally {
        setButtonState(DOMElements.saveMealDetailBtn, false);
    }
}

async function deleteMealDetail() {
    if (!activeMealId || !DOMElements.deleteMealDetailBtn || !isAuthReady) { // ✅ Ensure auth is ready
        await showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์ หรือการยืนยันตัวตนยังไม่พร้อม. โปรดลองใหม่อีกครั้ง.", "error");
        return;
    }
    
    // Custom Confirmation Modal
    const confirmed = await new Promise(resolve => {
        // Check if elements are available before using them
        if (!DOMElements.confirmModal || !DOMElements.confirmModalTitle || !DOMElements.confirmModalMessage || !DOMElements.confirmYesBtn || !DOMElements.confirmNoBtn) {
            console.error("Confirmation modal elements not found. Falling back to simple alert.");
            resolve(confirm("คุณแน่ใจหรือไม่ที่จะลบมื้ออาหารนี้?"));
            return;
        }
        DOMElements.confirmModalTitle.textContent = "ยืนยันการลบ";
        DOMElements.confirmModalMessage.textContent = "คุณแน่ใจหรือไม่ที่จะลบมื้ออาหารนี้?";
        showModal(DOMElements.confirmModal);

        const yesHandler = () => {
            hideModal(DOMElements.confirmModal);
            DOMElements.confirmYesBtn.removeEventListener('click', yesHandler);
            DOMElements.confirmNoBtn.removeEventListener('click', noHandler);
            resolve(true);
        };
        const noHandler = () => {
            hideModal(DOMElements.confirmModal);
            DOMElements.confirmYesBtn.removeEventListener('click', yesHandler);
            DOMElements.confirmNoBtn.removeEventListener('click', noHandler);
            resolve(false);
        };
        DOMElements.confirmYesBtn.addEventListener('click', yesHandler);
        DOMElements.confirmNoBtn.addEventListener('click', noHandler);
    });

    if (!confirmed) {
        setButtonState(DOMElements.deleteMealDetailBtn, false);
        return;
    }

    setButtonState(DOMElements.deleteMealDetailBtn, true);
    try {
        // ✅ Use remove() for modular SDK
        await remove(ref(db, `device/${currentDeviceId}/meals/${activeMealId}`));
        await showCustomAlert("สำเร็จ", "ลบมื้ออาหารแล้ว", "success");
        closeMealDetailModal(); // ✅ Use new close function
        // No need to call loadMeals() here, as onValue listener will handle updates
    } catch (error) {
        await showCustomAlert("ผิดพลาด", `ไม่สามารถลบได้: ${error.message}`, "error");
    } finally {
        setButtonState(DOMElements.deleteMealDetailBtn, false);
    }
}

// ===============================================
// ✅ Dashboard Actions
// ===============================================
async function sendCommand(command, payload = {}) {
    if (!DOMElements.deviceStatusCircle || !DOMElements.deviceStatusCircle.classList.contains('online') || !isAuthReady) { // ✅ Ensure auth is ready
        await showCustomAlert("ออฟไลน์", "อุปกรณ์ไม่ได้เชื่อมต่อ หรือการยืนยันตัวตนยังไม่พร้อม. ไม่สามารถส่งคำสั่งได้", "error");
        return false;
    }
    try {
        // ✅ Use set() for modular SDK
        await set(ref(db, `device/${currentDeviceId}/commands/${command}`), {
            ...payload,
            timestamp: serverTimestamp() // ✅ Use serverTimestamp()
        });
        return true;
    }
    catch (error) {
        await showCustomAlert("ผิดพลาด", `ไม่สามารถส่งคำสั่ง ${command} ได้: ${error.message}`, "error");
        return false;
    }
}

async function feedNow() {
    if (!currentDeviceId || !DOMElements.feedNowBtn || !isAuthReady) { // ✅ Ensure auth is ready
        await showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์ หรือการยืนยันตัวตนยังไม่พร้อม. โปรดลองใหม่อีกครั้ง.", "error");
        return;
    }
    setButtonState(DOMElements.feedNowBtn, true);
    try {
        // ✅ Use ref() and onValue() for modular SDK
        const calibrationSnapshot = await new Promise(resolve => {
            onValue(ref(db, `device/${currentDeviceId}/settings/calibration/grams_per_second`), (snapshot) => {
                resolve(snapshot);
            }, { onlyOnce: true });
        });
        const currentGramsPerSecond = calibrationSnapshot.val();

        if (!currentGramsPerSecond || currentGramsPerSecond <= 0) {
            await showCustomAlert("ข้อผิดพลาด", "กรุณาตั้งค่าการสอบเทียบปริมาณอาหารในหน้า 'ตั้งค่า' ก่อน", "error");
            setButtonState(DOMElements.feedNowBtn, false);
            return;
        }

        // --- Read values from new input fields ---
        const amountToFeed = parseInt(DOMElements.feedNowAmountInput.value);
        const fanStrength = clamp(parseInt(DOMElements.feedNowFanStrengthInput.value), 0, 100);
        const fanDirection = clamp(parseInt(DOMElements.feedNowFanDirectionInput.value), 60, 120);
        const swingMode = DOMElements.feedNowSwingModeCheckbox.checked;
        const audioFile = DOMElements.feedNowAudioInput.files[0];

        // Validate amount: must be at least 1
        if (isNaN(amountToFeed) || amountToFeed <= 0) {
            await showCustomAlert("ข้อผิดพลาด", "กรุณาระบุปริมาณอาหารที่ถูกต้อง (อย่างน้อย 1 กรัม)", "error");
            setButtonState(DOMElements.feedNowBtn, false);
            return;
        }

        let audioUrl = null;
        let originalNoiseFileName = null;

        if (audioFile) {
            const path = `quick_feed_noises/${currentDeviceId}/${Date.now()}_${sanitizeFileName(audioFile.name)}`;
            try {
                const { error } = await supabaseClient.storage.from("audio").upload(path, audioFile, { upsert: true });
                if (error) throw error;
                const { data: publicData } = supabaseClient.storage.from("audio").getPublicUrl(path);
                audioUrl = publicData.publicUrl;
                originalNoiseFileName = audioFile.name;
            } catch (e) {
                await showCustomAlert("อัปโหลดเสียงล้มเหลว", `ไม่สามารถอัปโหลดไฟล์เสียงได้: ${e.message}`, "error");
                setButtonState(DOMElements.feedNowBtn, false);
                return;
            }
        }

        const durationSeconds = amountToFeed / currentGramsPerSecond;
        if (durationSeconds <= 0) {
            await showCustomAlert("ข้อผิดพลาด", "ปริมาณอาหารหรือค่าการสอบเทียบไม่ถูกต้อง", "error");
            setButtonState(DOMElements.feedNowBtn, false);
            return;
        }

        if (await sendCommand('feedNow', {
            duration_seconds: durationSeconds.toFixed(2),
            fanStrength: fanStrength,
            fanDirection: fanDirection,
            swingMode: swingMode,
            noiseFile: audioUrl,
            originalNoiseFileName: originalNoiseFileName,
        })) {
            await showCustomAlert("กำลังให้อาหาร", `ส่งคำสั่งให้อาหาร ${amountToFeed} กรัม (${durationSeconds.toFixed(1)} วินาที) แล้ว. กรุณารอ...`, "info");
        }
    } catch (error) {
        console.error("Error in feedNow:", error);
        await showCustomAlert("ข้อผิดพลาด", `ไม่สามารถส่งคำสั่งให้อาหารได้: ${error.message}`, "error");
    } finally {
        setButtonState(DOMElements.feedNowBtn, false);
    }
}

async function playMakeNoise() {
    if (!DOMElements.makenoiseAudioInput || !DOMElements.makenoiseBtn || !isAuthReady) { // ✅ Ensure auth is ready
        await showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์ หรือการยืนยันตัวตนยังไม่พร้อม. โปรดลองใหม่อีกครั้ง.", "error");
        return;
    }
    const file = DOMElements.makenoiseAudioInput.files[0];
    if (!file) {
        await showCustomAlert("ผิดพลาด", "กรุณาเลือกไฟล์เสียงก่อน", "error");
        return;
    }
    setButtonState(DOMElements.makenoiseBtn, true);
    const path = `make_noise/${currentDeviceId}/${Date.now()}_${sanitizeFileName(file.name)}`;
    try {
        // ✅ เปลี่ยนชื่อ bucket จาก "feeder-sounds" เป็น "audio"
        const { error } = await supabaseClient.storage.from("audio").upload(path, file, { upsert: true });
        if (error) throw error;
        // ✅ เปลี่ยนชื่อ bucket จาก "feeder-sounds" เป็น "audio"
        const { data: publicData } = supabaseClient.storage.from('audio').getPublicUrl(path);
        if (await sendCommand('makeNoise', { url: publicData.publicUrl })) {
            await showCustomAlert("สำเร็จ", "ส่งคำสั่งเล่นเสียงแล้ว", "success");
        }
    } catch (e) {
        await showCustomAlert("ผิดพลาด", `ไม่สามารถอัปโหลดหรือเล่นเสียงได้: ${e.message}`, "error");
    } finally {
        setButtonState(DOMElements.makenoiseBtn, false);
    }
}

// ===============================================
// ✅ Animal Calculator Integration
// ===============================================
// ✅ 9. ปุ่ม "นำไปสร้างมื้ออาหาร" ในเมนูคำนวณ
function applyRecommendedAmount() {
    if (!DOMElements.recommendedAmount || !DOMElements.mealAmountInput) return; // Safety check
    const recommendedAmountText = DOMElements.recommendedAmount.textContent;
    const match = recommendedAmountText.match(/(\d+\.?\d*)/);
    if (match) {
        const amount = Math.max(1, Math.round(parseFloat(match[1]))); // Ensure amount is at least 1
        openMealDetailModal(null, { amount }); // Open new meal modal with prefilled amount
        showSection('meal-schedule-section'); // Navigate to meal schedule section
    } else {
        showCustomAlert("ผิดพลาด", "ไม่สามารถนำปริมาณที่แนะนำไปใช้ได้", "error");
    }
}

// ===============================================
// ✅ Next Meal Countdown Logic
// ===============================================

const dayMap = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
};
const dayNamesThai = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const monthNamesThai = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function findNextMeal(allMeals, timeZoneOffset) {
    if (!allMeals || Object.keys(allMeals).length === 0 || timeZoneOffset === null) {
        return { nextMeal: null, nextTimestamp: null };
    }

    let earliestNextMealTimestamp = Infinity;
    let nextMealData = null;

    const nowUtc = Date.now(); // Current UTC timestamp in milliseconds

    // Filter out disabled meals and past specific date meals
    const activeMeals = Object.values(allMeals).filter(meal => {
        if (!meal.enabled) return false;
        if (meal.specificDate) {
            // For specific date meals, calculate their exact UTC timestamp
            // The specificDate is assumed to be YYYY-MM-DD. We add T00:00:00Z to parse it as UTC midnight.
            const specificDateMidnightUtc = new Date(meal.specificDate + 'T00:00:00Z').getTime();
            const [mealHour, mealMinute] = meal.time.split(':').map(Number);
            
            // Convert meal time (HH:MM in device's local timezone) to UTC timestamp
            // mealTimeUtc represents the exact moment the meal should occur in UTC
            const mealTimeUtc = specificDateMidnightUtc + (mealHour * 3600 + mealMinute * 60) * 1000 - (timeZoneOffset * 3600 * 1000);
            
            // Only consider if the meal time is in the future
            return mealTimeUtc > nowUtc;
        }
        return true; // Recurring meals are always considered active if enabled
    });

    for (const meal of activeMeals) {
        const [mealHour, mealMinute] = meal.time.split(':').map(Number);
        let potentialNextTimestamp = null;

        if (meal.specificDate) {
            // Specific date meal (already filtered if in past by activeMeals filter)
            const specificDateMidnightUtc = new Date(meal.specificDate + 'T00:00:00Z').getTime();
            potentialNextTimestamp = specificDateMidnightUtc + (mealHour * 3600 + mealMinute * 60) * 1000 - (timeZoneOffset * 3600 * 1000);
        } else if (meal.days && meal.days.length > 0) {
            // Recurring meal
            // Get current day of week in the *device's local time*
            // To do this, we take nowUtc, apply the timezone offset, then get the day of the week.
            const nowLocal = new Date(nowUtc + (timeZoneOffset * 3600 * 1000));
            const currentDayLocal = nowLocal.getUTCDay(); // 0 (Sunday) to 6 (Saturday)

            for (const dayAbbr of meal.days) {
                const targetDayOfWeek = dayMap[dayAbbr];
                if (targetDayOfWeek === undefined) continue;

                let daysToAdd = (targetDayOfWeek - currentDayLocal + 7) % 7;

                // Calculate the timestamp for the meal on the current day (adjusted for timezone)
                const todayLocalTimeAtMeal = new Date(nowUtc + (timeZoneOffset * 3600 * 1000));
                todayLocalTimeAtMeal.setUTCHours(mealHour, mealMinute, 0, 0); // Set hours/minutes in UTC for this adjusted date
                const todayMealUtc = todayLocalTimeAtMeal.getTime() - (timeZoneOffset * 3600 * 1000); // Convert back to UTC

                // If it's today (daysToAdd === 0) but the meal time (in device's local time) has already passed
                if (daysToAdd === 0 && todayMealUtc <= nowUtc) {
                    daysToAdd = 7; // Schedule for next week
                }

                // Calculate the timestamp for the next occurrence of this meal in UTC
                const nextOccurrenceLocal = new Date(nowLocal.getTime() + daysToAdd * 24 * 3600 * 1000);
                nextOccurrenceLocal.setUTCHours(mealHour, mealMinute, 0, 0); // Set hours/minutes in UTC for this adjusted date

                const candidateTimestamp = nextOccurrenceLocal.getTime() - (timeZoneOffset * 3600 * 1000);

                if (candidateTimestamp > nowUtc) {
                    if (potentialNextTimestamp === null || candidateTimestamp < potentialNextTimestamp) {
                        potentialNextTimestamp = candidateTimestamp;
                    }
                }
            }
        }

        if (potentialNextTimestamp !== null && potentialNextTimestamp < earliestNextMealTimestamp) {
            earliestNextMealTimestamp = potentialNextTimestamp;
            nextMealData = meal;
        }
    }

    if (nextMealData) {
        return { nextMeal: nextMealData, nextTimestamp: earliestNextMealTimestamp };
    } else {
        return { nextMeal: null, nextTimestamp: null };
    }
}


function updateCountdownDisplay() {
    if (!DOMElements.nextMealCountdownDisplay || !DOMElements.nextMealTimeDisplay || !DOMElements.timeZoneOffsetSelect) return;

    const timeZoneOffset = parseFloat(DOMElements.timeZoneOffsetSelect.value);
    if (isNaN(timeZoneOffset)) {
        DOMElements.nextMealCountdownDisplay.textContent = "กรุณาตั้งค่าโซนเวลาในหน้า 'ตั้งค่า'";
        DOMElements.nextMealTimeDisplay.textContent = "";
        return;
    }

    const { nextMeal, nextTimestamp } = findNextMeal(allMealsData, timeZoneOffset);

    if (nextMeal && nextTimestamp !== Infinity) {
        const now = Date.now();
        let timeLeft = nextTimestamp - now;

        if (timeLeft <= 0) {
            // If time has passed, re-evaluate next meal immediately
            DOMElements.nextMealCountdownDisplay.textContent = "กำลังคำนวณมื้อถัดไป...";
            DOMElements.nextMealTimeDisplay.textContent = "";
            // Trigger a re-evaluation by calling updateCountdownDisplay again after a short delay
            setTimeout(updateCountdownDisplay, 1000); 
            return;
        }

        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        timeLeft %= (1000 * 60 * 60 * 24);
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        timeLeft %= (1000 * 60 * 60);
        const minutes = Math.floor(timeLeft / (1000 * 60));
        timeLeft %= (1000 * 60);
        const seconds = Math.floor(timeLeft / 1000);

        let countdownString = "จะให้อาหารในอีก ";
        if (days > 0) countdownString += `${days} วัน `;
        countdownString += `${String(hours).padStart(2, '0')} ชั่วโมง ${String(minutes).padStart(2, '0')} นาที ${String(seconds).padStart(2, '0')} วินาที`;
        
        DOMElements.nextMealCountdownDisplay.textContent = countdownString;

        // Display exact next meal time in device's local time
        const localNextMealDate = new Date(nextTimestamp + (timeZoneOffset * 3600 * 1000));

        const dayOfWeek = dayNamesThai[localNextMealDate.getUTCDay()]; // Use getUTCDay as date is already adjusted
        const dayOfMonth = localNextMealDate.getUTCDate();
        const month = monthNamesThai[localNextMealDate.getUTCMonth()];
        const hour = String(localNextMealDate.getUTCHours()).padStart(2, '0');
        const minute = String(localNextMealDate.getUTCMinutes()).padStart(2, '0');

        DOMElements.nextMealTimeDisplay.textContent = `${dayOfWeek}. ${dayOfMonth} ${month} ${hour}:${minute} น.`;

    } else {
        DOMElements.nextMealCountdownDisplay.textContent = "ไม่มีมื้ออาหารที่กำลังจะมาถึง";
        DOMElements.nextMealTimeDisplay.textContent = "";
    }
}

function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval); // Clear any existing interval
    updateCountdownDisplay(); // Initial display
    countdownInterval = setInterval(updateCountdownDisplay, 1000); // Update every second
}

function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}


// ===============================================
// ✅ Custom UI Component Logic (Time Picker, Select)
// ===============================================
function setupCustomTimePicker() {
    if (!DOMElements['hours-column'] || !DOMElements['minutes-column']) return;

    const hoursCol = DOMElements['hours-column'];
    const minutesCol = DOMElements['minutes-column'];

    hoursCol.innerHTML = '';
    minutesCol.innerHTML = '';

    // Add duplicates for looping (end of range at start)
    for (let i = 24 - TIME_PICKER_BUFFER; i < 24; i++) {
        const hourDiv = document.createElement('div');
        hourDiv.textContent = String(i).padStart(2, '0');
        hourDiv.classList.add('time-picker-duplicate'); // Optional: for debugging/styling
        hoursCol.appendChild(hourDiv);
    }
    // Add real hours
    for (let i = 0; i < 24; i++) {
        const hourDiv = document.createElement('div');
        hourDiv.textContent = String(i).padStart(2, '0');
        hoursCol.appendChild(hourDiv);
    }
    // Add duplicates for looping (start of range at end)
    for (let i = 0; i < TIME_PICKER_BUFFER; i++) {
        const hourDiv = document.createElement('div');
        hourDiv.textContent = String(i).padStart(2, '0');
        hourDiv.classList.add('time-picker-duplicate');
        hoursCol.appendChild(hourDiv);
    }

    // Same for minutes
    for (let i = 60 - TIME_PICKER_BUFFER; i < 60; i++) {
        const minuteDiv = document.createElement('div');
        minuteDiv.textContent = String(i).padStart(2, '0');
        minuteDiv.classList.add('time-picker-duplicate');
        minutesCol.appendChild(minuteDiv);
    }
    for (let i = 0; i < 60; i++) {
        const minuteDiv = document.createElement('div');
        minuteDiv.textContent = String(i).padStart(2, '0');
        minutesCol.appendChild(minuteDiv);
    }
    for (let i = 0; i < TIME_PICKER_BUFFER; i++) {
        const minuteDiv = document.createElement('div');
        minuteDiv.textContent = String(i).padStart(2, '0');
        minuteDiv.classList.add('time-picker-duplicate');
        minutesCol.appendChild(minuteDiv);
    }

    let scrollTimeout;
    [hoursCol, minutesCol].forEach((col, index) => {
        col.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const scrollTop = col.scrollTop;
                const itemHeight = TIME_PICKER_ITEM_HEIGHT;
                const realItems = (index === 0) ? 24 : 60; // 24 hours or 60 minutes

                // Calculate the index of the visually centered item
                const selectedIndex = Math.round(scrollTop / itemHeight);
                
                // If scrolled into the "start duplicates" (showing end values)
                if (selectedIndex < TIME_PICKER_BUFFER) {
                    col.scrollTo({ top: (selectedIndex + realItems) * itemHeight, behavior: 'instant' });
                } 
                // If scrolled into the "end duplicates" (showing start values)
                else if (selectedIndex >= (realItems + TIME_PICKER_BUFFER)) {
                    col.scrollTo({ top: (selectedIndex - realItems) * itemHeight, behavior: 'instant' });
                } else {
                    // Snap to the closest item in the "real" range
                    col.scrollTo({ top: selectedIndex * itemHeight, behavior: 'smooth' });
                }
            }, 150);
        });
    });
}

function updateTimePicker(hour, minute) {
    if (!DOMElements['hours-column'] || !DOMElements['minutes-column']) return;

    // Scroll to the correct "real" position (after the initial duplicates)
    DOMElements['hours-column'].scrollTop = (hour + TIME_PICKER_BUFFER) * TIME_PICKER_ITEM_HEIGHT;
    DOMElements['minutes-column'].scrollTop = (minute + TIME_PICKER_BUFFER) * TIME_PICKER_ITEM_HEIGHT;

    // Trigger scroll event to ensure snapping/centering logic is applied
    DOMElements['hours-column'].dispatchEvent(new Event('scroll'));
    DOMElements['minutes-column'].dispatchEvent(new Event('scroll'));
}

function getTimeFromPicker() {
    if (!DOMElements['hours-column'] || !DOMElements['minutes-column']) return [0, 0];

    const hoursCol = DOMElements['hours-column'];
    const minutesCol = DOMElements['minutes-column'];

    // Calculate the scroll position that corresponds to the center of the highlight area
    const centerOfHighlight = TIME_PICKER_ITEM_HEIGHT * TIME_PICKER_BUFFER + (TIME_PICKER_ITEM_HEIGHT / 2);

    // Find the hour element that is closest to the center of the highlight
    let selectedHour = 0;
    let minHourDiff = Infinity;
    hoursCol.querySelectorAll('div').forEach((div, index) => {
        const divCenter = div.offsetTop + (div.offsetHeight / 2);
        const diff = Math.abs(divCenter - (hoursCol.scrollTop + (hoursCol.offsetHeight / 2)));
        if (diff < minHourDiff) {
            minHourDiff = diff;
            selectedHour = parseInt(div.textContent);
        }
    });

    // Find the minute element that is closest to the center of the highlight
    let selectedMinute = 0;
    let minMinuteDiff = Infinity;
    minutesCol.querySelectorAll('div').forEach((div, index) => {
        const divCenter = div.offsetTop + (div.offsetHeight / 2);
        const diff = Math.abs(divCenter - (minutesCol.scrollTop + (minutesCol.offsetHeight / 2)));
        if (diff < minMinuteDiff) {
            minMinuteDiff = diff;
            selectedMinute = parseInt(div.textContent);
        }
    });

    return [selectedHour, selectedMinute];
}


function setupCustomSelects() {
    document.addEventListener('click', e => {
        const wrapper = e.target.closest('.custom-select-wrapper');
        
        // Close all other selects
        document.querySelectorAll('.custom-select-wrapper.open').forEach(openWrapper => {
            if (openWrapper !== wrapper) {
                openWrapper.classList.remove('open');
            }
        });

        if (e.target.classList.contains('custom-select-trigger')) {
            wrapper.classList.toggle('open');
        } else if (e.target.classList.contains('custom-option')) {
            const trigger = wrapper.querySelector('.custom-select-trigger');
            trigger.textContent = e.target.textContent;
            trigger.dataset.value = e.target.dataset.value;
            wrapper.classList.remove('open');
            
            // Update selected state for options
            wrapper.querySelectorAll('.custom-option').forEach(opt => {
                opt.classList.toggle('selected', opt.dataset.value === e.target.dataset.value);
            });

            // Manually trigger change event for our logic
            const event = new Event('change', { bubbles: true });
            trigger.dispatchEvent(event);
        } else if (wrapper && !e.target.closest('.custom-options')) {
            wrapper.classList.remove('open');
        }
    });
}

// ===============================================
// ✅ DOMContentLoaded (Initialization)
// ===============================================
document.addEventListener('DOMContentLoaded', async () => { // Make DOMContentLoaded async
    // Populate DOMElements object
    const ids = [
        'deviceSelectionSection', 'deviceIdInput', 'setDeviceIdBtn', 'mainContentContainer',
        'deviceStatusCircle', 'deviceStatusText', 'customAlertOverlay', 'customAlertContent',
        'customAlertTitle', 'customAlertMessage', 'customAlertOkButton', 'newNotificationToast',
        'newNotificationToastMessage', 'calibrationModal', 'startCalibrationTestBtn',
        'calibrationStatus', 'calibratedWeightInput', 'saveCalibrationBtn', 'closeCalibrationModalBtn',
        'mealDetailModal', 'mealModalTitle', 'mealNameInput', 'specificDateBtn', 'specificDateInput',
        'specificDateDisplay', 'mealAmountInput', 'mealFanStrengthInput', 'mealFanDirectionInput',
        'mealSwingModeCheckbox', 'mealAudioInput', 'mealAudioStatus', 'mealAudioPreview',
        'saveMealDetailBtn', 'deleteMealDetailBtn', 'cancelMealDetailBtn', 'forceSetupOverlay',
        'goToSettingsBtn', 'feedNowBtn', 'checkFoodLevelBtn', 'checkAnimalMovementBtn',
        'currentFoodLevelDisplay', 'lastMovementDisplay', 'makenoiseAudioInput', 'makenoiseAudioStatus',
        'makenoiseBtn', 'mealListContainer', 'addMealCardBtn', 'wifiSsidInput', 'wifiPasswordInput',
        'timeZoneOffsetSelect', 'bottleSizeSelect', 'customBottleHeightInput', 'openCalibrationModalBtn',
        'currentGramsPerSecondDisplay', 'logoutBtn', 'settingsNavDot', 'notifications-section',
        'notificationHistoryList', 'animal-calculator-section', 'animalCount', 'weightInputContainer',
        'animalWeightKg', 'lifeStageActivityContainer', 'recommendedAmount', 'calculationNotes',
        'applyRecommendedAmountBtn', 'nextMealCountdownDisplay', 'nextMealTimeDisplay',
        'hours-column', 'minutes-column', 'confirmModal', 'confirmModalTitle', 'confirmModalMessage',
        'confirmYesBtn', 'confirmNoBtn',
        // New elements for Quick Feed
        'feedNowAmountInput', 'feedNowFanStrengthInput', 'feedNowFanDirectionInput',
        'feedNowSwingModeCheckbox', 'feedNowAudioInput', 'feedNowAudioStatus', 'feedNowAudioPreview'
    ];
    ids.forEach(id => {
        DOMElements[id] = document.getElementById(id);
        if (!DOMElements[id]) {
            console.warn(`Element with ID '${id}' not found!`);
        }
    });

    // Special handling for custom select options containers
    DOMElements.animalTypeOptions = document.getElementById('animalType-options');
    DOMElements.animalSpeciesOptions = document.getElementById('animalSpecies-options');
    DOMElements.lifeStageActivityOptions = document.getElementById('lifeStageActivity-options');


    // --- Initial Setup ---
    setupCustomTimePicker();
    setupCustomSelects();

    // ✅ Listen for Firebase Auth state changes
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("Firebase Auth: User is signed in anonymously.");
            isAuthReady = true;
            const savedDeviceId = localStorage.getItem('pawtonomous_device_id');
            if (savedDeviceId) {
                DOMElements.deviceIdInput.value = savedDeviceId; // Pre-fill the input
                // ✅ 5. ถ้าเข้าไอดีที่ตั้งค่าครบแล้วให้เด้งไปที่หน้ามื้ออาหาร
                await setAndLoadDeviceId(savedDeviceId, true); // Pass true to navigate
            } else {
                DOMElements.deviceSelectionSection.style.display = 'block';
                if (DOMElements.mainContentContainer) DOMElements.mainContentContainer.style.display = 'none';
                updateDeviceStatusUI(false); // Ensure UI is offline initially
            }
        } else {
            console.log("Firebase Auth: No user signed in. Signing in anonymously...");
            isAuthReady = false;
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("Error signing in anonymously:", error);
                await showCustomAlert("ข้อผิดพลาดการยืนยันตัวตน", "ไม่สามารถเข้าสู่ระบบได้. โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต.", "error");
                // Keep device selection visible if auth fails critically
                DOMElements.deviceSelectionSection.style.display = 'block';
                if (DOMElements.mainContentContainer) DOMElements.mainContentContainer.style.display = 'none';
            }
        }
    });


    // ✅ Set initial state for applyRecommendedAmountBtn (disabled by default)
    if (DOMElements.applyRecommendedAmountBtn) {
        DOMElements.applyRecommendedAmountBtn.disabled = true; 
    }

    // --- Event Listeners ---

    // Device ID setup
    if (DOMElements.setDeviceIdBtn) {
        DOMElements.setDeviceIdBtn.addEventListener('click', async () => { // Make it async
            console.log("Set Device ID button clicked.");
            const id = DOMElements.deviceIdInput.value.trim();
            console.log("Entered Device ID:", id);

            if (id) {
                try {
                    // ✅ 5. ถ้าเข้าไอดีที่ตั้งค่าครบแล้วให้เด้งไปที่หน้ามื้ออาหาร
                    await setAndLoadDeviceId(id, true); // Pass true to navigate
                    console.log("setAndLoadDeviceId completed.");
                } catch (error) {
                    console.error("Error during setAndLoadDeviceId:", error);
                    await showCustomAlert("ข้อผิดพลาด", `ไม่สามารถตั้งค่า Device ID ได้: ${error.message}`, "error");
                }
            } else {
                console.log("Device ID input is empty.");
                await showCustomAlert("ข้อผิดพลาด", "กรุณากรอก Device ID.", "error");
            }
        });
    }

    // ✅ 1. เพิ่ม Event Listener สำหรับปุ่มออกจากระบบ
    if (DOMElements.logoutBtn) DOMElements.logoutBtn.addEventListener('click', handleLogout);

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            // ✅ 5. ตรวจสอบว่าปุ่มไม่ได้ถูก disabled โดย overlay บังคับตั้งค่า
            if (!btn.disabled) showSection(btn.dataset.target);
        });
    });
    
    // ✅ 5. Fix for "Go to Settings" button on initial setup overlay
    if (DOMElements.goToSettingsBtn) {
        DOMElements.goToSettingsBtn.addEventListener('click', () => {
            console.log("Go to Settings button clicked.");
            showSection('device-settings-section'); // Navigate to settings
            hideModal(DOMElements.forceSetupOverlay); // Use hideModal for consistency
            console.log("forceSetupOverlay hidden by goToSettingsBtn.");
            // No need to reset hasShownInitialSetupOverlay here, as it's meant to prevent re-showing
        });
    }

    // Modals
    if (DOMElements.closeCalibrationModalBtn) DOMElements.closeCalibrationModalBtn.addEventListener('click', () => hideModal(DOMElements.calibrationModal));
    if (DOMElements.cancelMealDetailBtn) DOMElements.cancelMealDetailBtn.addEventListener('click', () => closeMealDetailModal()); // ใช้ closeMealDetailModal
    
    // Settings
    if (DOMElements.timeZoneOffsetSelect) DOMElements.timeZoneOffsetSelect.addEventListener('change', (e) => {
        saveSettingsToFirebase('timezone');
        // updateCountdownDisplay(); // Called inside saveSettingsToFirebase now
    });
    if (DOMElements.bottleSizeSelect) DOMElements.bottleSizeSelect.addEventListener('change', (e) => {
        if (DOMElements.customBottleHeightInput) {
            DOMElements.customBottleHeightInput.style.display = DOMElements.bottleSizeSelect.value === 'custom' ? 'block' : 'none';
        }
        saveSettingsToFirebase('bottlesize');
    });
    if (DOMElements.customBottleHeightInput) DOMElements.customBottleHeightInput.addEventListener('input', (e) => saveSettingsToFirebase('bottlesize'));
    if (DOMElements.wifiSsidInput) DOMElements.wifiSsidInput.addEventListener('input', (e) => saveSettingsToFirebase('wifi'));
    if (DOMElements.wifiPasswordInput) DOMElements.wifiPasswordInput.addEventListener('input', (e) => saveSettingsToFirebase('wifi'));
    
    // Calibration
    if (DOMElements.openCalibrationModalBtn) DOMElements.openCalibrationModalBtn.addEventListener('click', openCalibrationModal);
    if (DOMElements.startCalibrationTestBtn) DOMElements.startCalibrationTestBtn.addEventListener('click', startCalibrationTest);
    if (DOMElements.saveCalibrationBtn) DOMElements.saveCalibrationBtn.addEventListener('click', saveCalibration);
    if (DOMElements.calibratedWeightInput) {
        DOMElements.calibratedWeightInput.addEventListener('input', () => {
            if (DOMElements.saveCalibrationBtn) { // Safety check
                DOMElements.saveCalibrationBtn.disabled = isNaN(parseFloat(DOMElements.calibratedWeightInput.value)) || parseFloat(DOMElements.calibratedWeightInput.value) <= 0;
            }
        });
    }

    // Dashboard Actions
    // Event listeners for new quick feed inputs
    if (DOMElements.feedNowAmountInput) {
        DOMElements.feedNowAmountInput.addEventListener('input', () => updateDeviceStatusUI(DOMElements.deviceStatusCircle.classList.contains('online')));
    }
    if (DOMElements.feedNowSwingModeCheckbox && DOMElements.feedNowFanDirectionInput) {
        DOMElements.feedNowSwingModeCheckbox.addEventListener('change', (e) => {
            DOMElements.feedNowFanDirectionInput.disabled = e.target.checked;
        });
    }
    if (DOMElements.feedNowAudioInput) {
        DOMElements.feedNowAudioInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (DOMElements.feedNowAudioStatus) DOMElements.feedNowAudioStatus.textContent = file ? file.name : 'ไม่มีไฟล์';
            if (DOMElements.feedNowAudioPreview) {
                DOMElements.feedNowAudioPreview.src = file ? URL.createObjectURL(file) : '';
                DOMElements.feedNowAudioPreview.style.display = file ? 'block' : 'none';
            }
        });
    }

    if (DOMElements.feedNowBtn) DOMElements.feedNowBtn.addEventListener('click', feedNow);
    if (DOMElements.checkFoodLevelBtn) DOMElements.checkFoodLevelBtn.addEventListener('click', () => sendCommand('checkFoodLevel'));
    if (DOMElements.checkAnimalMovementBtn) DOMElements.checkAnimalMovementBtn.addEventListener('click', () => sendCommand('checkMovement'));
    if (DOMElements.makenoiseAudioInput) { // Safety check
        DOMElements.makenoiseAudioInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (DOMElements.makenoiseAudioStatus) DOMElements.makenoiseAudioStatus.textContent = file ? file.name : '';
            if (DOMElements.makenoiseBtn && DOMElements.deviceStatusCircle) { // Safety check for makenoiseBtn and deviceStatusCircle
                DOMElements.makenoiseBtn.disabled = !file || !DOMElements.deviceStatusCircle.classList.contains('online');
            }
        });
    }
    if (DOMElements.makenoiseBtn) DOMElements.makenoiseBtn.addEventListener('click', playMakeNoise);

    // Meal Schedule
    if (DOMElements.addMealCardBtn) DOMElements.addMealCardBtn.addEventListener('click', () => openMealDetailModal());
    if (DOMElements.saveMealDetailBtn) DOMElements.saveMealDetailBtn.addEventListener('click', saveMealDetail);
    if (DOMElements.deleteMealDetailBtn) DOMElements.deleteMealDetailBtn.addEventListener('click', deleteMealDetail);
    
    // Meal Modal Logic (Days and Specific Date)
    document.querySelectorAll('.day-btn:not(.date-btn)').forEach(btn => btn.addEventListener('click', () => {
        btn.classList.toggle('selected');
        // If any day is selected, disable specific date input and button
        if (document.querySelectorAll('.day-btn.selected:not(.date-btn)').length > 0) {
            if (DOMElements.specificDateInput) DOMElements.specificDateInput.value = ''; // Clear specific date
            if (DOMElements.specificDateDisplay) DOMElements.specificDateDisplay.textContent = '';
            if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.classList.remove('selected');
            if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.disabled = true; // Disable specific date button
        } else {
            // If no days are selected, enable specific date input and button
            document.querySelectorAll('.day-btn:not(.date-btn)').forEach(btn => btn.classList.remove('disabled'));
            if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.disabled = false;
        }
        // Ensure all day buttons are enabled if specific date is not selected
        document.querySelectorAll('.day-btn:not(.date-btn)').forEach(b => b.classList.remove('disabled'));
    }));

    // ✅ 4. ตรงเลือกวันที่เจาะจงพอกดปุ่มแล้วไม่ขึ้น popup ให้เลือกวันที่เลย
    if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.addEventListener('click', () => {
        // When specific date is selected, disable all recurring day buttons
        document.querySelectorAll('.day-btn:not(.date-btn)').forEach(btn => {
            btn.classList.remove('selected'); // Deselect all days
            btn.classList.add('disabled'); // Disable all days
        });
        if (DOMElements.specificDateInput) {
            DOMElements.specificDateInput.style.display = 'block'; // ✅ ทำให้ input แสดงผล
            DOMElements.specificDateInput.focus(); // Focus ไปที่ input
            DOMElements.specificDateBtn.classList.add('selected'); // Mark specific date button as selected
            DOMElements.specificDateInput.showPicker(); // ✅ แสดง Date Picker
        }
    });

    if (DOMElements.specificDateInput) {
        DOMElements.specificDateInput.addEventListener('change', e => {
            if (e.target.value) {
                if (DOMElements.specificDateDisplay) DOMElements.specificDateDisplay.textContent = `วันที่ระบุ: ${new Date(e.target.value).toLocaleDateString('th-TH')}`;
                // When a specific date is chosen, disable recurring day buttons
                document.querySelectorAll('.day-btn:not(.date-btn)').forEach(btn => {
                    btn.classList.remove('selected');
                    btn.classList.add('disabled');
                });
                if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.classList.add('selected');
                DOMElements.specificDateInput.style.display = 'none'; // ✅ ซ่อน input หลังจากเลือกวันที่
            } else {
                // If specific date is cleared, enable recurring day buttons
                document.querySelectorAll('.day-btn:not(.date-btn)').forEach(btn => btn.classList.remove('disabled'));
                if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.classList.remove('selected');
                if (DOMElements.specificDateDisplay) DOMElements.specificDateDisplay.textContent = '';
                DOMElements.specificDateInput.style.display = 'none'; // ✅ ซ่อน input ถ้าล้างค่า
            }
        });
    }

    // ✅ เพิ่ม Event Listener สำหรับโหมดสวิง
    if (DOMElements.mealSwingModeCheckbox && DOMElements.mealFanDirectionInput) {
        DOMElements.mealSwingModeCheckbox.addEventListener('change', (e) => {
            DOMElements.mealFanDirectionInput.disabled = e.target.checked;
        });
    }

    if (DOMElements.mealAudioInput) { // Safety check
        DOMElements.mealAudioInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (DOMElements.mealAudioStatus) DOMElements.mealAudioStatus.textContent = file ? file.name : 'ไม่มีไฟล์';
            if (DOMElements.mealAudioPreview) { // Safety check
                DOMElements.mealAudioPreview.src = file ? URL.createObjectURL(file) : '';
                DOMElements.mealAudioPreview.style.display = file ? 'block' : 'none';
            }
        });
    }

    // Animal Calculator
    // Pass DOMElements to animalCalculator functions
    populateAnimalType(DOMElements); 
    document.querySelectorAll('.custom-select-trigger').forEach(trigger => {
        trigger.addEventListener('change', () => {
            if (trigger.dataset.target === 'animalType') {
                updateAnimalSpecies(DOMElements); 
            }
            updateRecommendedAmount(DOMElements); 
        });
    });
    if (DOMElements.animalCount && DOMElements.animalWeightKg) { // Safety check
        [DOMElements.animalCount, DOMElements.animalWeightKg].forEach(input => {
            input.addEventListener('input', () => updateRecommendedAmount(DOMElements)); 
        });
    }
    // ✅ 6. ปุ่มนำไปสร้างมื้ออาหารในเมนูคำนวณใช้งานได้
    if (DOMElements.applyRecommendedAmountBtn) DOMElements.applyRecommendedAmountBtn.addEventListener('click', applyRecommendedAmount);

    // Initial call for animal calculator
    updateRecommendedAmount(DOMElements); 
});

