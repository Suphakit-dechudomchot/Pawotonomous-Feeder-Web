// script.js (ไฟล์หลัก)

// Import ฟังก์ชันและตัวแปรจาก animalCalculator.js
import { populateAnimalType, updateAnimalSpecies, animalData, updateRecommendedAmount } from './animalCalculator.js';

// ===============================================
// ✅ Firebase & Supabase Configuration
// ===============================================

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAg-2VtD5q6Rw8JDKTiihp-ribH0HHvU-o",
  authDomain: "pawtonomous.firebaseapp.com",
  databaseURL: "https://pawtonomous-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pawtonomous",
  storageBucket: "pawtonomous.firebasestorage.app",
  messagingSenderId: "984959145190",
  appId: "1:984959145190:web:b050c1ed26962cdef4d727",
  measurementId: "G-1QQ3FLHD0M"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Supabase Config
const supabaseClient = supabase.createClient(
    'https://gnkgamizqlosvhkuwzhc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdua2dhbWl6cWxvc3Zoa3V3emhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MzY3MTUsImV4cCI6MjA2NjAxMjcxNX0.Dq5oPJ2zV8UUyoNakh4JKzDary8MIGZLDG5BppF_pgc'
);

// ===============================================
// ✅ Global Variables and Utility Functions
// ===============================================

let currentDeviceId = null; // Device ID ที่ใช้งานอยู่
const DEFAULT_DEVICE_ID = "web_app_test_device"; // Device ID ชั่วคราวสำหรับการพัฒนา

const CALIBRATION_TEST_SECONDS = 5; // จำนวนวินาทีที่ใช้ทดสอบการปล่อยอาหารในการ Calibrate

// References to DOM elements (initialized in DOMContentLoaded)
let deviceIdInput, setDeviceIdBtn, mainContentContainer;
let deviceStatusCircle, deviceStatusText, notificationDot, openNotificationBtn;
let customAlertOverlay, customAlertContent, customAlertTitle, customAlertMessage, customAlertOkButton;
let newNotificationToast, newNotificationToastMessage;
let notificationModal, closeNotificationModalBtn, notificationList, notificationHistoryList;
let feedNowBtn, checkFoodLevelBtn, checkAnimalMovementBtn, makenoiseAudioInput, makenoiseAudioStatus, makenoiseBtn;
let timeZoneOffsetSelect, bottleSizeSelect, customBottleHeightInput, openCalibrationModalBtn, currentGramsPerSecondDisplay;
let calibrationModal, startCalibrationTestBtn, calibrationStatus, calibratedWeightInput, saveCalibrationBtn, closeCalibrationModalBtn;
let mealListContainer, addMealCardBtn, mealDetailModal, mealModalTitle, mealTimeInput, mealNameInput, mealAmountInput, mealFanStrengthInput, mealFanDirectionInput, mealSwingModeCheckbox, mealAudioInput, mealAudioStatus, mealAudioPreview, saveMealDetailBtn, deleteMealDetailBtn, cancelMealDetailBtn;
let animalTypeSelect, animalSpeciesSelect, animalCountInput, animalWeightKgInput, lifeStageActivitySelect, recommendedAmountSpan, calculationNotesSpan, applyRecommendedAmountBtn;
let wifiSsidInput, wifiPasswordInput;

let notificationCount = 0; // จำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
let lastNotificationId = ''; // ID ของการแจ้งเตือนล่าสุดที่แสดงใน toast
let activeMealId = null; // ID ของมื้ออาหารที่กำลังแก้ไขใน Modal

// Utility: Sanitize file name
function sanitizeFileName(name) {
    return name
        .normalize("NFD")
        .replace(/\u0300-\u036f/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Utility: Clamp value within a range
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Utility: Debounce function for input fields
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// ===============================================
// ✅ UI State Management (Buttons, Modals, Tabs)
// ===============================================

// Show/Hide Content Sections (Tab Navigation)
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.nav-item[data-target="${sectionId}"]`).classList.add('active');

    // Special handling for notification history section
    if (sectionId === 'notifications-section') {
        fetchAndDisplayNotifications(); // Refresh notifications when section is opened
        notificationDot.style.display = 'none'; // Hide dot when user views notifications
        notificationCount = 0;
    }
}

// Set Button State (Loading/Enabled/Disabled)
function setButtonState(button, isLoading) {
    if (!button) return;

    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
        if (!button.querySelector('.spinner')) {
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            button.prepend(spinner);
        }
    } else {
        button.disabled = false;
        button.classList.remove('loading');
        const spinner = button.querySelector('.spinner');
        if (spinner) spinner.remove();
    }
}

// Custom Alert Modal
async function showCustomAlert(title, message, type = "info") {
    if (!customAlertOverlay || !customAlertTitle || !customAlertMessage || !customAlertOkButton) {
        console.error("Custom alert elements not found. Falling back to native alert.");
        alert(`${title}: ${message}`);
        return;
    }

    customAlertTitle.textContent = title;
    customAlertMessage.textContent = message;
    customAlertContent.classList.remove('success', 'error', 'warning', 'info');
    customAlertContent.classList.add(type);
    customAlertOverlay.classList.add('show');
    customAlertOkButton.focus();

    return new Promise(resolve => {
        const handler = () => {
            customAlertOverlay.classList.remove('show');
            customAlertContent.classList.remove('success', 'error', 'warning', 'info');
            customAlertOkButton.removeEventListener('click', handler);
            resolve();
        };
        customAlertOkButton.addEventListener('click', handler);
    });
}

// Show/Hide Modals
function showModal(modalElement) {
    modalElement.style.display = 'flex';
    setTimeout(() => modalElement.classList.add('show'), 10); // Add class for transition
}

function hideModal(modalElement) {
    modalElement.classList.remove('show');
    setTimeout(() => modalElement.style.display = 'none', 300); // Hide after transition
}

// Toast Notification
function showNewNotificationToast(message) {
    if (!newNotificationToast || !newNotificationToastMessage) return;

    newNotificationToastMessage.textContent = message;
    newNotificationToast.classList.add('show');

    setTimeout(() => {
        newNotificationToast.classList.remove('show');
    }, 5000); // Hide after 5 seconds
}

// ===============================================
// ✅ Device ID Management
// ===============================================

// Set Device ID and enable main UI
function setAndLoadDeviceId(id) {
    currentDeviceId = id;
    console.log("Active Device ID set to:", currentDeviceId);

    // Save device ID to localStorage for persistence
    localStorage.setItem('pawtonomous_device_id', currentDeviceId);

    // Hide device selection and show main content
    document.querySelector('.device-selection-section').style.display = 'none';
    mainContentContainer.style.display = 'block';

    // Load all settings and data for the new device ID
    loadSettingsFromFirebase();
    loadMeals();
    setupNotificationListener();
    fetchAndDisplayNotifications();
    // Initially update status based on Firebase, but allow editing regardless
    listenToDeviceStatus(); 
}

// ===============================================
// ✅ Device Status (Online/Offline)
// ===============================================

// Update UI based on device online status
function updateDeviceStatusUI(isOnline, batteryVoltage = null) {
    if (!deviceStatusCircle || !deviceStatusText) return;

    deviceStatusCircle.classList.remove('online', 'offline', 'low-battery');
    deviceStatusText.classList.remove('online', 'offline', 'low-battery');

    if (isOnline) {
        deviceStatusCircle.classList.add('online');
        deviceStatusText.classList.add('online');
        deviceStatusText.textContent = 'ออนไลน์';
        
        // Enable command buttons
        if (feedNowBtn) feedNowBtn.disabled = false;
        if (checkFoodLevelBtn) checkFoodLevelBtn.disabled = false;
        if (checkAnimalMovementBtn) checkAnimalMovementBtn.disabled = false;
        // Enable makenoiseBtn only if a file is selected AND online
        if (makenoiseAudioInput && makenoiseAudioInput.files.length > 0) { 
            if (makenoiseBtn) makenoiseBtn.disabled = false;
        } else {
            if (makenoiseBtn) makenoiseBtn.disabled = true;
        }

        // Check battery status if provided
        if (batteryVoltage !== null && batteryVoltage < 3.5) { // Example threshold for low battery
            deviceStatusCircle.classList.remove('online');
            deviceStatusCircle.classList.add('low-battery');
            deviceStatusText.classList.remove('online');
            deviceStatusText.classList.add('low-battery');
            deviceStatusText.textContent = 'แบตเตอรี่ต่ำ';
        }

    } else { // Device is offline
        deviceStatusCircle.classList.add('offline');
        deviceStatusText.classList.add('offline');
        deviceStatusText.textContent = 'ออฟไลน์';
        
        // Disable command buttons when offline
        if (feedNowBtn) feedNowBtn.disabled = true;
        if (checkFoodLevelBtn) checkFoodLevelBtn.disabled = true;
        if (checkAnimalMovementBtn) checkAnimalMovementBtn.disabled = true;
        if (makenoiseBtn) makenoiseBtn.disabled = true;
        
        // Keep settings/meal editing buttons enabled
        // openCalibrationModalBtn and addMealCardBtn are NOT disabled here.
        // Their state will be managed by their respective functions or default enabled state.
    }
}

// Listen for device online status from Firebase
function listenToDeviceStatus() {
    if (!currentDeviceId) return;

    db.ref(`device/${currentDeviceId}/status/online`).on('value', (snapshot) => {
        const isOnline = snapshot.val();
        console.log("Device online status:", isOnline);
        db.ref(`device/${currentDeviceId}/status/batteryVoltage`).once('value', (batterySnapshot) => {
            const batteryVoltage = batterySnapshot.val();
            updateDeviceStatusUI(isOnline, batteryVoltage);
        });
    });

    db.ref(`device/${currentDeviceId}/status/foodLevel`).on('value', (snapshot) => {
        const foodLevelCm = snapshot.val();
        updateFoodLevelDisplay(foodLevelCm);
    });

    db.ref(`device/${currentDeviceId}/status/lastMovementDetected`).on('value', (snapshot) => {
        const lastDetectedTimestamp = snapshot.val();
        updateLastMovementDisplay(lastDetectedTimestamp);
    });
}

// Update food level display
async function updateFoodLevelDisplay(foodLevelCm) {
    if (!currentFoodLevelDisplay) return;

    let bottleHeight = 0;
    try {
        const bottleSnapshot = await db.ref(`device/${currentDeviceId}/settings/bottleSize`).once('value');
        const customHeightSnapshot = await db.ref(`device/${currentDeviceId}/settings/customBottleHeight`).once('value');
        
        const savedBottleSize = bottleSnapshot.val();
        const savedCustomHeight = customHeightSnapshot.val();

        if (savedBottleSize === 'custom' && savedCustomHeight !== null) {
            bottleHeight = parseFloat(savedCustomHeight);
        } else if (savedBottleSize && savedBottleSize !== "") {
            // Find the height from the predefined options
            const predefinedHeight = parseFloat(savedBottleSize); // Value is already the height in cm
            if (!isNaN(predefinedHeight) && predefinedHeight > 0) {
                bottleHeight = predefinedHeight;
            }
        }
    } catch (error) {
        console.error("Error fetching bottle height for display:", error);
    }

    if (isNaN(foodLevelCm) || foodLevelCm === null || bottleHeight <= 0) {
        currentFoodLevelDisplay.textContent = "- %";
        return;
    }

    const remainingHeight = bottleHeight - foodLevelCm;
    const percentage = clamp((remainingHeight / bottleHeight) * 100, 0, 100);
    currentFoodLevelDisplay.textContent = `${Math.round(percentage)} %`;
}

// Update last movement display
function updateLastMovementDisplay(timestamp) {
    if (!lastMovementDisplay) return;

    if (timestamp && timestamp > 0) {
        const date = new Date(timestamp);
        const options = {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric',
            hour12: false, timeZoneName: 'shortOffset', timeZone: 'Asia/Bangkok'
        };
        lastMovementDisplay.textContent = date.toLocaleString('th-TH', options);
    } else {
        lastMovementDisplay.textContent = "ไม่มีข้อมูล";
    }
}

// ===============================================
// ✅ Notifications
// ===============================================

let notificationListenerRef = null; // To store Firebase listener reference

// Setup Firebase listener for new notifications
function setupNotificationListener() {
    if (notificationListenerRef) {
        notificationListenerRef.off('child_added'); // Detach old listener
        console.log("Previous notification listener removed.");
    }

    if (!currentDeviceId) {
        console.warn("Cannot set up notification listener: Device ID is not available.");
        return;
    }

    notificationListenerRef = db.ref(`device/${currentDeviceId}/notifications`);
    notificationListenerRef.limitToLast(1).on('child_added', (snapshot) => {
        const notification = snapshot.val();
        const notificationId = snapshot.key;
        console.log("New notification received:", notification);

        const date = new Date(notification.timestamp);
        const options = {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric',
            hour12: false, timeZoneName: 'shortOffset', timeZone: 'Asia/Bangkok'
        };
        const formattedTime = date.toLocaleString('th-TH', options);

        if (notificationId !== lastNotificationId) {
            lastNotificationId = notificationId;
            showNewNotificationToast(notification.message);
            addNotificationToList(notification.message, formattedTime, notificationList); // Add to modal list
            notificationCount++;
            updateNotificationDotUI();
        }
    });
}

// Fetch and display historical notifications
async function fetchAndDisplayNotifications() {
    if (!notificationHistoryList) return;
    notificationHistoryList.innerHTML = ''; // Clear old list
    notificationCount = 0; // Reset unread count

    if (!currentDeviceId) {
        console.log("No deviceId available to fetch notifications.");
        updateNotificationDotUI();
        return;
    }

    try {
        const snapshot = await db.ref(`device/${currentDeviceId}/notifications`)
                                .orderByChild('timestamp')
                                .limitToLast(50) // Load last 50 notifications
                                .once('value');
        
        const notifications = [];
        snapshot.forEach(childSnapshot => {
            notifications.push(childSnapshot.val());
            lastNotificationId = childSnapshot.key; // Update last ID to prevent re-toast
        });

        notifications.sort((a, b) => b.timestamp - a.timestamp); // Sort newest first for history list

        notifications.forEach(notification => {
            const date = new Date(notification.timestamp);
            const options = {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: 'numeric', minute: 'numeric', second: 'numeric',
                hour12: false, timeZoneName: 'shortOffset', timeZone: 'Asia/Bangkok'
            };
            const formattedTime = date.toLocaleString('th-TH', options);
            addNotificationToList(notification.message, formattedTime, notificationHistoryList);
        });
        updateNotificationDotUI(); // Should be 0 if user just opened it
    } catch (error) {
        console.error("Error fetching historical notifications:", error);
    }
}

// Add notification item to a list (reusable for toast and history)
function addNotificationToList(message, timestamp, listElement) {
    if (!listElement) return;
    const listItem = document.createElement('li');
    listItem.innerHTML = `
        <span>${message}</span>
        <span class="notification-timestamp">${timestamp}</span>
    `;
    listElement.prepend(listItem); // Add to the top
}

// Update notification dot UI
function updateNotificationDotUI() {
    if (!notificationDot) return;
    if (notificationCount > 0) {
        notificationDot.textContent = notificationCount;
        notificationDot.style.display = 'block';
    } else {
        notificationDot.style.display = 'none';
    }
}

// Open/Close Notification Modal
function openNotificationModal() {
    showModal(notificationModal);
    // When modal is opened, all notifications are considered "read"
    notificationCount = 0;
    updateNotificationDotUI();
    // No need to update Firebase for read status for now, as per user's current requirements
}

function closeNotificationModal() {
    hideModal(notificationModal);
}

// ===============================================
// ✅ System Settings (Time Zone, Bottle Size, Wi-Fi)
// ===============================================

// Load system settings from Firebase
async function loadSettingsFromFirebase() {
    if (!currentDeviceId) {
        console.log("No deviceId available to load system settings.");
        return;
    }
    try {
        const snapshot = await db.ref(`device/${currentDeviceId}/settings`).once('value');
        const settings = snapshot.val();

        if (settings) {
            // TimeZone
            if (timeZoneOffsetSelect) {
                if (settings.timeZoneOffset !== null && !isNaN(parseFloat(settings.timeZoneOffset))) {
                    timeZoneOffsetSelect.value = settings.timeZoneOffset;
                } else {
                    const currentOffsetHours = new Date().getTimezoneOffset() / -60;
                    let closestOffsetOption = null;
                    let minDiff = Infinity;
                    Array.from(timeZoneOffsetSelect.options).forEach(option => {
                        if (option.value === "") return;
                        const optionValue = parseFloat(option.value);
                        const diff = Math.abs(currentOffsetHours - optionValue);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestOffsetOption = option;
                        }
                    });
                    if (closestOffsetOption) {
                        timeZoneOffsetSelect.value = closestOffsetOption.value;
                    }
                }
            }

            // Bottle Size
            if (bottleSizeSelect && customBottleHeightInput) {
                if (settings.bottleSize !== null && settings.bottleSize !== "") {
                    bottleSizeSelect.value = settings.bottleSize;
                    if (settings.bottleSize === 'custom') {
                        customBottleHeightInput.style.display = 'block';
                        customBottleHeightInput.value = settings.customBottleHeight !== null ? settings.customBottleHeight : '';
                    } else {
                        customBottleHeightInput.style.display = 'none';
                    }
                } else {
                    bottleSizeSelect.value = '';
                    customBottleHeightInput.style.display = 'none';
                }
            }

            // Wi-Fi Credentials
            if (wifiSsidInput && wifiPasswordInput) {
                if (settings.wifiCredentials && settings.wifiCredentials.ssid) {
                    wifiSsidInput.value = settings.wifiCredentials.ssid;
                    wifiPasswordInput.value = settings.wifiCredentials.password || '';
                } else {
                    wifiSsidInput.value = '';
                    wifiPasswordInput.value = '';
                }
            }

            // Calibration (grams_per_second)
            if (currentGramsPerSecondDisplay) {
                if (settings.calibration && settings.calibration.grams_per_second !== null) {
                    currentGramsPerSecondDisplay.textContent = `${settings.calibration.grams_per_second.toFixed(2)} กรัม/วินาที`;
                } else {
                    currentGramsPerSecondDisplay.textContent = "- กรัม/วินาที";
                }
            }

        } else {
            console.log("No existing system settings found. Using defaults.");
            // Set default values if no settings exist
            if (timeZoneOffsetSelect) timeZoneOffsetSelect.value = '';
            if (bottleSizeSelect) bottleSizeSelect.value = '';
            if (customBottleHeightInput) customBottleHeightInput.style.display = 'none';
            if (wifiSsidInput) wifiSsidInput.value = '';
            if (wifiPasswordInput) wifiPasswordInput.value = '';
            if (currentGramsPerSecondDisplay) currentGramsPerSecondDisplay.textContent = "- กรัม/วินาที";
        }
    } catch (error) {
        console.error("Error loading system settings:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถโหลดการตั้งค่าระบบได้: ${error.message}`, "error");
    }
}

// Save system settings to Firebase (debounced for Wi-Fi)
const saveSettingsToFirebase = debounce(async (settingType) => {
    if (!currentDeviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        return;
    }

    let settingsToSave = {};
    let alertMessage = "";
    let alertType = "success";
    let isDeviceOnline = deviceStatusCircle.classList.contains('online') || deviceStatusCircle.classList.contains('low-battery'); // Check current UI status

    try {
        if (settingType === 'timezone') {
            const timeZoneOffset = timeZoneOffsetSelect.value;
            settingsToSave.timeZoneOffset = (timeZoneOffset === "") ? null : parseFloat(timeZoneOffset);
            alertMessage = `ตั้งค่าโซนเวลาเป็น UTC${settingsToSave.timeZoneOffset >= 0 ? '+' : ''}${settingsToSave.timeZoneOffset}`;
        } else if (settingType === 'bottlesize') {
            const bottleSize = bottleSizeSelect.value;
            let customBottleHeight = null;
            if (bottleSize === 'custom') {
                customBottleHeight = parseFloat(customBottleHeightInput.value);
                settingsToSave.bottleSize = "custom";
                settingsToSave.customBottleHeight = !isNaN(customBottleHeight) && customBottleHeight > 0 ? customBottleHeight : null;
                alertMessage = `ตั้งค่าขนาดขวดเป็นแบบกำหนดเอง ${settingsToSave.customBottleHeight || ''} cm`;
            } else if (bottleSize !== "") {
                settingsToSave.bottleSize = bottleSize;
                settingsToSave.customBottleHeight = null; // Clear custom height if preset is selected
                alertMessage = `ตั้งค่าขนาดขวดเป็น ${bottleSize} cm`;
            } else {
                settingsToSave.bottleSize = null;
                settingsToSave.customBottleHeight = null;
                alertMessage = "ล้างการตั้งค่าขนาดขวด";
            }
        } else if (settingType === 'wifi') {
            settingsToSave.wifiCredentials = {
                ssid: wifiSsidInput.value,
                password: wifiPasswordInput.value
            };
            alertMessage = "บันทึกข้อมูล Wi-Fi แล้ว";
        }

        await db.ref(`device/${currentDeviceId}/settings`).update(settingsToSave);
        console.log(`System settings (${settingType}) saved successfully!`);

        if (!isDeviceOnline) {
            alertMessage += "\n(ข้อมูลจะถูกส่งไปยังตัวเครื่องเมื่ออุปกรณ์กลับมาออนไลน์)";
            alertType = "info"; // Use info type for offline sync message
        }
        showCustomAlert("สำเร็จ", alertMessage, alertType);

    } catch (error) {
        console.error(`Error saving system settings (${settingType}):`, error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถบันทึกการตั้งค่า ${settingType} ได้: ${error.message}`, "error");
    }
}, 1000); // Debounce by 1 second

// ===============================================
// ✅ Calibration (Grams per Second)
// ===============================================

// Open Calibration Modal
function openCalibrationModal() {
    showModal(calibrationModal);
    calibrationStatus.textContent = "กด 'ปล่อยอาหารทดสอบ' เพื่อเริ่ม";
    calibratedWeightInput.value = '';
    saveCalibrationBtn.disabled = true;
    setButtonState(startCalibrationTestBtn, false);
    
    // Check if device is online to enable calibration test button
    const isDeviceOnline = deviceStatusCircle.classList.contains('online') || deviceStatusCircle.classList.contains('low-battery');
    if (!isDeviceOnline) {
        startCalibrationTestBtn.disabled = true;
        calibrationStatus.textContent = "อุปกรณ์ออฟไลน์. ไม่สามารถทำการทดสอบได้.";
    }
}

// Start Calibration Test
async function startCalibrationTest() {
    if (!currentDeviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        return;
    }
    // Re-check online status before sending command
    const isDeviceOnline = deviceStatusCircle.classList.contains('online') || deviceStatusCircle.classList.contains('low-battery');
    if (!isDeviceOnline) {
        showCustomAlert("ข้อผิดพลาด", "อุปกรณ์ออฟไลน์. ไม่สามารถเริ่มการทดสอบได้.", "error");
        return;
    }

    setButtonState(startCalibrationTestBtn, true);
    calibrationStatus.textContent = "กำลังปล่อยอาหาร...";
    calibratedWeightInput.value = '';
    saveCalibrationBtn.disabled = true;

    try {
        // Send command to ESP32 to dispense food for CALIBRATION_TEST_SECONDS
        await db.ref(`device/${currentDeviceId}/commands/calibrate`).set({
            duration_seconds: CALIBRATION_TEST_SECONDS,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        // ESP32 will send back a confirmation/completion message
        // For now, we'll just assume it works and enable input after a delay
        await new Promise(resolve => setTimeout(resolve, CALIBRATION_TEST_SECONDS * 1000 + 1000)); // Wait for dispense + 1 sec buffer

        calibrationStatus.textContent = `ปล่อยอาหารเสร็จสิ้น. กรุณาชั่งน้ำหนักและกรอกข้อมูล.`;
        calibratedWeightInput.disabled = false;
        calibratedWeightInput.focus();
        // Enable save button only when weight is entered
        calibratedWeightInput.addEventListener('input', () => {
            saveCalibrationBtn.disabled = isNaN(parseFloat(calibratedWeightInput.value)) || parseFloat(calibratedWeightInput.value) <= 0;
        }, { once: true }); // Listen only once, then re-add if needed

    } catch (error) {
        console.error("Error starting calibration test:", error);
        calibrationStatus.textContent = `ข้อผิดพลาด: ${error.message}`;
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถเริ่มการทดสอบได้: ${error.message}`, "error");
    } finally {
        setButtonState(startCalibrationTestBtn, false);
    }
}

// Save Calibration Value
async function saveCalibration() {
    if (!currentDeviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        return;
    }
    const weight = parseFloat(calibratedWeightInput.value);
    if (isNaN(weight) || weight <= 0) {
        showCustomAlert("ข้อผิดพลาด", "กรุณากรอกน้ำหนักที่ถูกต้อง.", "error");
        return;
    }

    setButtonState(saveCalibrationBtn, true);
    calibrationStatus.textContent = "กำลังบันทึก...";
    let isDeviceOnline = deviceStatusCircle.classList.contains('online') || deviceStatusCircle.classList.contains('low-battery');

    try {
        const gramsPerSecond = weight / CALIBRATION_TEST_SECONDS;
        await db.ref(`device/${currentDeviceId}/settings/calibration`).set({
            grams_per_second: gramsPerSecond,
            last_calibrated: firebase.database.ServerValue.TIMESTAMP
        });
        currentGramsPerSecondDisplay.textContent = `${gramsPerSecond.toFixed(2)} กรัม/วินาที`;
        
        let alertMessage = `บันทึกค่า Calibrate แล้ว: ${gramsPerSecond.toFixed(2)} กรัม/วินาที`;
        let alertType = "success";
        if (!isDeviceOnline) {
            alertMessage += "\n(ข้อมูลจะถูกส่งไปยังตัวเครื่องเมื่ออุปกรณ์กลับมาออนไลน์)";
            alertType = "info";
        }
        showCustomAlert("สำเร็จ", alertMessage, alertType);
        hideModal(calibrationModal);
    } catch (error) {
        console.error("Error saving calibration:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถบันทึกค่า Calibrate ได้: ${error.message}`, "error");
    } finally {
        setButtonState(saveCalibrationBtn, false);
    }
}

// ===============================================
// ✅ Meal Schedule Management
// ===============================================

const DAYS_OF_WEEK = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];

// Load meals from Firebase and display as cards
async function loadMeals() {
    if (!currentDeviceId) {
        console.log("No deviceId available to load meals.");
        return;
    }
    mealListContainer.innerHTML = ''; // Clear existing meals

    try {
        const snapshot = await db.ref(`device/${currentDeviceId}/meals`).once('value');
        const mealsData = snapshot.val();
        const mealsArray = [];

        if (mealsData) {
            // Convert object of meals to an array and sort by time
            for (const id in mealsData) {
                mealsArray.push({ id, ...mealsData[id] });
            }
            mealsArray.sort((a, b) => {
                const timeA = a.time.split(':').map(Number);
                const timeB = b.time.split(':').map(Number);
                if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0];
                return timeA[1] - timeB[1];
            });
        }

        if (mealsArray.length > 0) {
            mealsArray.forEach(meal => addMealCard(meal));
        } else {
            // Optionally add a placeholder or message if no meals
            mealListContainer.innerHTML = '<p class="notes" style="text-align: center;">ยังไม่มีมื้ออาหารที่ตั้งค่าไว้</p>';
        }
    } catch (error) {
        console.error("Error loading meals:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถโหลดมื้ออาหารได้: ${error.message}`, "error");
    }
}

// Add a new meal card to the UI
function addMealCard(mealData = {}) {
    const mealCard = document.createElement('div');
    mealCard.className = 'meal-card';
    mealCard.dataset.id = mealData.id || Date.now().toString(); // Use existing ID or generate new

    const mealTime = mealData.time || '07:00';
    const mealName = mealData.name || 'มื้ออาหาร';
    const mealEnabled = mealData.enabled !== undefined ? mealData.enabled : true;
    const mealDays = mealData.days || []; // Array of selected days e.g., ['Mon', 'Wed']

    // Display days
    const displayDays = mealDays.length === 7 ? 'ทุกวัน' : 
                         mealDays.length === 0 ? 'ไม่มีวัน' : 
                         mealDays.map(d => DAYS_OF_WEEK[DAYS_OF_WEEK.indexOf(d)]).join(', ');

    mealCard.innerHTML = `
        <div class="meal-card-left">
            <div class="meal-card-time">${mealTime}</div>
            <div class="meal-card-name">${mealName}</div>
            <div class="meal-card-days">${displayDays}</div>
        </div>
        <label class="toggle-label">
            <input type="checkbox" class="toggle-switch" ${mealEnabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
        </label>
    `;

    // Add event listener to open meal detail modal
    mealCard.addEventListener('click', (event) => {
        // Prevent opening modal if toggle switch was clicked
        if (event.target.classList.contains('toggle-switch') || event.target.classList.contains('toggle-slider')) {
            return;
        }
        openMealDetailModal(mealCard.dataset.id);
    });

    // Add event listener for toggle switch
    const toggleSwitch = mealCard.querySelector('.toggle-switch');
    toggleSwitch.addEventListener('change', async () => {
        const mealId = mealCard.dataset.id;
        const isEnabled = toggleSwitch.checked;
        let isDeviceOnline = deviceStatusCircle.classList.contains('online') || deviceStatusCircle.classList.contains('low-battery');

        try {
            await db.ref(`device/${currentDeviceId}/meals/${mealId}/enabled`).set(isEnabled);
            let alertMessage = `มื้อ ${mealName} ถูก ${isEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}`;
            let alertType = "info";
            if (!isDeviceOnline) {
                alertMessage += "\n(ข้อมูลจะถูกส่งไปยังตัวเครื่องเมื่ออุปกรณ์กลับมาออนไลน์)";
            }
            showCustomAlert("สำเร็จ", alertMessage, alertType);
        } catch (error) {
            console.error("Error toggling meal status:", error);
            showCustomAlert("ข้อผิดพลาด", `ไม่สามารถเปลี่ยนสถานะมื้ออาหารได้: ${error.message}`, "error");
        }
    });

    mealListContainer.appendChild(mealCard);
}

// Open Meal Detail Modal for Add/Edit
async function openMealDetailModal(mealId = null) {
    activeMealId = mealId;
    mealModalTitle.textContent = mealId ? 'แก้ไขมื้ออาหาร' : 'เพิ่มมื้ออาหารใหม่';
    deleteMealDetailBtn.style.display = mealId ? 'block' : 'none';

    // Reset form fields
    mealTimeInput.value = '07:00';
    mealNameInput.value = '';
    mealAmountInput.value = 1;
    mealFanStrengthInput.value = 1;
    mealFanDirectionInput.value = 90;
    mealSwingModeCheckbox.checked = false;
    mealFanDirectionInput.disabled = false; // Ensure it's enabled by default
    mealAudioInput.value = ''; // Clear file input
    mealAudioStatus.textContent = 'ไม่มีไฟล์';
    mealAudioStatus.style.color = 'grey';
    mealAudioPreview.style.display = 'none';
    mealAudioPreview.src = '';
    document.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('selected'));

    let currentMealData = {};
    if (mealId) {
        try {
            const snapshot = await db.ref(`device/${currentDeviceId}/meals/${mealId}`).once('value');
            currentMealData = snapshot.val();
            if (currentMealData) {
                mealTimeInput.value = currentMealData.time || '07:00';
                mealNameInput.value = currentMealData.name || '';
                mealAmountInput.value = currentMealData.amount || 1;
                mealFanStrengthInput.value = currentMealData.fanStrength || 1;
                mealFanDirectionInput.value = currentMealData.fanDirection || 90;
                mealSwingModeCheckbox.checked = currentMealData.swingMode || false;
                mealFanDirectionInput.disabled = mealSwingModeCheckbox.checked;

                // Set audio status and preview
                if (currentMealData.audioUrl) {
                    mealAudioStatus.innerHTML = `ไฟล์: <a href="${currentMealData.audioUrl}" target="_blank">${currentMealData.originalNoiseFileName || currentMealData.audioUrl.split('/').pop()}</a>`;
                    mealAudioStatus.style.color = 'green';
                    mealAudioPreview.src = currentMealData.audioUrl;
                    mealAudioPreview.style.display = 'block';
                }

                // Set selected days
                if (currentMealData.days && Array.isArray(currentMealData.days)) {
                    currentMealData.days.forEach(day => {
                        const btn = document.querySelector(`.day-btn[data-day="${day}"]`);
                        if (btn) btn.classList.add('selected');
                    });
                }
            }
        } catch (error) {
            console.error("Error loading meal data for editing:", error);
            showCustomAlert("ข้อผิดพลาด", `ไม่สามารถโหลดข้อมูลมื้ออาหารได้: ${error.message}`, "error");
            hideModal(mealDetailModal);
            return;
        }
    }

    showModal(mealDetailModal);
}

// Save Meal Detail
async function saveMealDetail() {
    if (!currentDeviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        return;
    }

    const time = mealTimeInput.value;
    const name = mealNameInput.value.trim();
    const amount = clamp(parseInt(mealAmountInput.value), 1, 100);
    const fanStrength = clamp(parseInt(mealFanStrengthInput.value), 1, 3);
    const fanDirection = clamp(parseInt(mealFanDirectionInput.value), 60, 120);
    const swingMode = mealSwingModeCheckbox.checked;
    const selectedDays = Array.from(document.querySelectorAll('.day-btn.selected')).map(btn => btn.dataset.day);

    if (!time || !name || isNaN(amount) || amount <= 0 || isNaN(fanStrength) || isNaN(fanDirection) || selectedDays.length === 0) {
        showCustomAlert("ข้อผิดพลาด", "โปรดกรอกข้อมูลให้ครบถ้วนและถูกต้อง (เวลา, ชื่อ, ปริมาณ, วัน).", "error");
        return;
    }

    setButtonState(saveMealDetailBtn, true);

    let audioUrl = mealAudioPreview.src || null; // Use existing preview URL if no new file selected
    let originalNoiseFileName = mealAudioStatus.textContent.includes('ไฟล์:') ? mealAudioStatus.textContent.replace('ไฟล์: ', '').split(' ')[0] : null;
    let isDeviceOnline = deviceStatusCircle.classList.contains('online') || deviceStatusCircle.classList.contains('low-battery');

    // Handle new audio file upload if selected
    const file = mealAudioInput.files[0];
    if (file) {
        mealAudioStatus.textContent = "🔄 กำลังอัปโหลด...";
        mealAudioStatus.style.color = "orange";
        const uniqueFileName = `${Date.now()}_${sanitizeFileName(file.name)}`;
        const path = `meal_noises/${activeMealId || Date.now()}/${uniqueFileName}`; // Use activeMealId or new timestamp for path

        try {
            const { data, error } = await supabaseClient.storage.from("feeder-sounds").upload(path, file);
            if (error) throw error;
            const { data: publicData } = supabaseClient.storage.from("feeder-sounds").getPublicUrl(path);
            audioUrl = publicData.publicUrl;
            originalNoiseFileName = file.name;
            mealAudioStatus.innerHTML = `✅ อัปโหลดแล้ว<br><small>(${originalNoiseFileName})</small>`;
            mealAudioStatus.style.color = "green";
        } catch (e) {
            showCustomAlert("อัปโหลดไฟล์เสียงไม่สำเร็จ", "เกิดข้อผิดพลาดขณะอัปโหลดไฟล์: " + e.message, "error");
            console.error("Supabase Upload Error:", e);
            setButtonState(saveMealDetailBtn, false);
            return;
        }
    }

    const mealData = {
        time,
        name,
        amount,
        fanStrength,
        fanDirection,
        swingMode,
        days: selectedDays,
        audioUrl,
        originalNoiseFileName,
        enabled: true // New meals are enabled by default
    };

    try {
        if (activeMealId) {
            await db.ref(`device/${currentDeviceId}/meals/${activeMealId}`).update(mealData);
            let alertMessage = `บันทึกมื้ออาหาร "${name}" เรียบร้อยแล้ว.`;
            let alertType = "success";
            if (!isDeviceOnline) {
                alertMessage += "\n(ข้อมูลจะถูกส่งไปยังตัวเครื่องเมื่ออุปกรณ์กลับมาออนไลน์)";
                alertType = "info";
            }
            showCustomAlert("สำเร็จ", alertMessage, alertType);
        } else {
            const newMealRef = db.ref(`device/${currentDeviceId}/meals`).push(); // Push generates a unique ID
            await newMealRef.set(mealData);
            let alertMessage = `เพิ่มมื้ออาหาร "${name}" เรียบร้อยแล้ว.`;
            let alertType = "success";
            if (!isDeviceOnline) {
                alertMessage += "\n(ข้อมูลจะถูกส่งไปยังตัวเครื่องเมื่ออุปกรณ์กลับมาออนไลน์)";
                alertType = "info";
            }
            showCustomAlert("สำเร็จ", alertMessage, alertType);
        }
        hideModal(mealDetailModal);
        loadMeals(); // Reload meals to update UI
    } catch (error) {
        console.error("Error saving meal:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถบันทึกมื้ออาหารได้: ${error.message}`, "error");
    } finally {
        setButtonState(saveMealDetailBtn, false);
    }
}

// Delete Meal
async function deleteMealDetail() {
    if (!currentDeviceId || !activeMealId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์หรือมื้ออาหารที่จะลบ.", "error");
        return;
    }
    const confirmDelete = await showCustomAlert("ยืนยันการลบ", "คุณแน่ใจหรือไม่ที่จะลบมื้ออาหารนี้?", "warning");
    // For simplicity, customAlert doesn't return true/false directly for confirmation.
    // In a real app, you'd need a custom confirm modal. For now, just proceed if they click OK.
    // If you implement a custom confirm, check its result here.

    setButtonState(deleteMealDetailBtn, true);
    let isDeviceOnline = deviceStatusCircle.classList.contains('online') || deviceStatusCircle.classList.contains('low-battery');

    try {
        await db.ref(`device/${currentDeviceId}/meals/${activeMealId}`).remove();
        let alertMessage = "ลบมื้ออาหารเรียบร้อยแล้ว.";
        let alertType = "success";
        if (!isDeviceOnline) {
            alertMessage += "\n(ข้อมูลจะถูกส่งไปยังตัวเครื่องเมื่ออุปกรณ์กลับมาออนไลน์)";
            alertType = "info";
        }
        showCustomAlert("สำเร็จ", alertMessage, alertType);
        hideModal(mealDetailModal);
        loadMeals(); // Reload meals to update UI
    } catch (error) {
        console.error("Error deleting meal:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถลบมื้ออาหารได้: ${error.message}`, "error");
    } finally {
        setButtonState(deleteMealDetailBtn, false);
    }
}

// ===============================================
// ✅ Dashboard Actions
// ===============================================

// Feed Now
async function feedNow() {
    if (!currentDeviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        return;
    }
    // Re-check online status before sending command
    const isDeviceOnline = deviceStatusCircle.classList.contains('online') || deviceStatusCircle.classList.contains('low-battery');
    if (!isDeviceOnline) {
        showCustomAlert("ข้อผิดพลาด", "อุปกรณ์ออฟไลน์. ไม่สามารถส่งคำสั่งได้.", "error");
        return;
    }

    setButtonState(feedNowBtn, true);
    try {
        // Fetch current calibration value
        const calibrationSnapshot = await db.ref(`device/${currentDeviceId}/settings/calibration/grams_per_second`).once('value');
        const gramsPerSecond = calibrationSnapshot.val() || 100; // Default to 100g/s if not calibrated

        // Fetch the first enabled meal to use its settings for "feed now"
        // In a real app, you might want to allow user to select which meal to use
        const mealsSnapshot = await db.ref(`device/${currentDeviceId}/meals`).once('value');
        const mealsData = mealsSnapshot.val();
        let mealToDispense = null;
        if (mealsData) {
            for (const mealId in mealsData) {
                if (mealsData[mealId].enabled) {
                    mealToDispense = mealsData[mealId];
                    break; // Take the first enabled meal found
                }
            }
        }

        if (!mealToDispense) {
            showCustomAlert("ข้อผิดพลาด", "ไม่พบมื้ออาหารที่เปิดใช้งาน. โปรดตั้งค่ามื้ออาหารก่อน.", "error");
            setButtonState(feedNowBtn, false);
            return;
        }

        const durationSeconds = mealToDispense.amount / gramsPerSecond;

        await db.ref(`device/${currentDeviceId}/commands/feedNow`).set({
            duration_seconds: durationSeconds.toFixed(2), // Send calculated duration
            fanStrength: mealToDispense.fanStrength, 
            fanDirection: mealToDispense.fanDirection, 
            swingMode: mealToDispense.swingMode || false, 
            noiseFile: mealToDispense.audioUrl || null,
            originalNoiseFileName: mealToDispense.originalNoiseFileName || null,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        showCustomAlert("กำลังให้อาหาร", `ส่งคำสั่งให้อาหาร ${mealToDispense.amount} กรัม (${durationSeconds.toFixed(1)} วินาที) แล้ว. กรุณารอ...`, "info");
    } catch (error) {
        console.error("Error sending feedNow command:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถส่งคำสั่งให้อาหารได้: ${error.message}`, "error");
    } finally {
        setButtonState(feedNowBtn, false);
    }
}

// Check Food Level
async function checkFoodLevel() {
    if (!currentDeviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        return;
    }
    // Re-check online status before sending command
    const isDeviceOnline = deviceStatusCircle.classList.contains('online') || deviceStatusCircle.classList.contains('low-battery');
    if (!isDeviceOnline) {
        showCustomAlert("ข้อผิดพลาด", "อุปกรณ์ออฟไลน์. ไม่สามารถส่งคำสั่งได้.", "error");
        return;
    }

    setButtonState(checkFoodLevelBtn, true);
    try {
        await db.ref(`device/${currentDeviceId}/commands/checkFoodLevel`).set(firebase.database.ServerValue.TIMESTAMP);

        const resultPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                db.ref(`device/${currentDeviceId}/status/foodLevel`).off('value', listener);
                reject(new Error("การตรวจสอบระดับอาหารใช้เวลานานเกินไป."));
            }, 15000);

            const listener = db.ref(`device/${currentDeviceId}/status/foodLevel`).on('value', (snapshot) => {
                const foodLevel = snapshot.val();
                if (foodLevel !== null) {
                    clearTimeout(timeout);
                    db.ref(`device/${currentDeviceId}/status/foodLevel`).off('value', listener);
                    resolve(foodLevel);
                }
            });
        });

        const foodLevelResult = await resultPromise;
        
        let bottleHeight = 0;
        const bottleSnapshot = await db.ref(`device/${currentDeviceId}/settings/bottleSize`).once('value');
        const customHeightSnapshot = await db.ref(`device/${currentDeviceId}/settings/customBottleHeight`).once('value');
        
        const savedBottleSize = bottleSnapshot.val();
        const savedCustomHeight = customHeightSnapshot.val();

        if (savedBottleSize === 'custom' && savedCustomHeight !== null) {
            bottleHeight = parseFloat(savedCustomHeight);
        } else if (savedBottleSize && savedBottleSize !== "") {
            bottleHeight = parseFloat(savedBottleSize);
        }

        if (isNaN(bottleHeight) || bottleHeight <= 0) {
            showCustomAlert("ข้อผิดพลาด", "โปรดตั้งค่าขนาดขวดใน 'การตั้งค่าอุปกรณ์' ก่อน.", "error");
            setButtonState(checkFoodLevelBtn, false);
            return;
        }

        const remainingHeight = bottleHeight - foodLevelResult;
        const percentage = clamp((remainingHeight / bottleHeight) * 100, 0, 100);

        let message = `ระดับอาหารที่วัดได้: ${foodLevelResult} cm.`;
        if (foodLevelResult < 0) {
             message = "ค่าระดับอาหารไม่ถูกต้อง. โปรดตรวจสอบการติดตั้งเซ็นเซอร์";
        } else if (foodLevelResult > bottleHeight + 5) {
            message = `น่าจะไม่มีอาหารในถัง หรือเซ็นเซอร์วัดค่าผิดปกติ (วัดได้ ${foodLevelResult} cm จากขวดสูง ${bottleHeight} cm)`;
        }
        else if (foodLevelResult > bottleHeight - 5) {
            message += `\nอาหารในถังเหลือน้อยมาก (< ${Math.round(percentage)}%).`;
        } else {
            message += `\nประมาณ ${Math.round(percentage)}% ของถัง.`;
        }

        showCustomAlert("ปริมาณอาหาร", message, "info");

    } catch (error) {
        console.error("Error checking food level:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถตรวจสอบระดับอาหารได้: ${error.message}`, "error");
    } finally {
        setButtonState(checkFoodLevelBtn, false);
    }
}

// Check Animal Movement
async function checkAnimalMovement() {
    if (!currentDeviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        return;
    }
    // Re-check online status before sending command
    const isDeviceOnline = deviceStatusCircle.classList.contains('online') || deviceStatusCircle.classList.contains('low-battery');
    if (!isDeviceOnline) {
        showCustomAlert("ข้อผิดพลาด", "อุปกรณ์ออฟไลน์. ไม่สามารถส่งคำสั่งได้.", "error");
        return;
    }

    setButtonState(checkAnimalMovementBtn, true);
    try {
        await db.ref(`device/${currentDeviceId}/commands/checkMovement`).set(firebase.database.ServerValue.TIMESTAMP);

        const resultPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                db.ref(`device/${currentDeviceId}/status/lastMovementDetected`).off('value', listener);
                reject(new Error("การตรวจสอบการเคลื่อนไหวใช้เวลานานเกินไป."));
            }, 15000);

            const listener = db.ref(`device/${currentDeviceId}/status/lastMovementDetected`).on('value', (snapshot) => {
                const lastDetectedTimestamp = snapshot.val();
                if (lastDetectedTimestamp !== null) {
                    clearTimeout(timeout);
                    db.ref(`device/${currentDeviceId}/status/lastMovementDetected`).off('value', listener);
                    resolve(lastDetectedTimestamp);
                }
            });
        });

        const lastDetectedTimestamp = await resultPromise;

        let message = "ไม่พบการเคลื่อนไหวล่าสุด.";
        if (lastDetectedTimestamp && lastDetectedTimestamp > 0) {
            const date = new Date(lastDetectedTimestamp);
            const options = {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: 'numeric', minute: 'numeric', second: 'numeric',
                hour12: false, timeZoneName: 'shortOffset', timeZone: 'Asia/Bangkok'
            };
            const formattedTime = date.toLocaleString('th-TH', options);
            message = `ตรวจพบการเคลื่อนไหวล่าสุดเมื่อ: ${formattedTime}`;
        }
        showCustomAlert("การเคลื่อนไหวสัตว์", message, "info");

    } catch (error) {
        console.error("Error checking animal movement:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถตรวจสอบการเคลื่อนไหวได้: ${error.message}`, "error");
    } finally {
        setButtonState(checkAnimalMovementBtn, false);
    }
}

// Play Make Noise
let selectedMakeNoiseFile = null;
async function playMakeNoise() {
    if (!currentDeviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        return;
    }
    if (!selectedMakeNoiseFile) {
        showCustomAlert("ข้อผิดพลาด", "โปรดเลือกไฟล์เสียงก่อน.", "error");
        return;
    }
    // Re-check online status before sending command
    const isDeviceOnline = deviceStatusCircle.classList.contains('online') || deviceStatusCircle.classList.contains('low-battery');
    if (!isDeviceOnline) {
        showCustomAlert("ข้อผิดพลาด", "อุปกรณ์ออฟไลน์. ไม่สามารถส่งคำสั่งได้.", "error");
        return;
    }

    setButtonState(makenoiseBtn, true);
    const originalFileName = selectedMakeNoiseFile.name;
    const sanitizedFileName = sanitizeFileName(originalFileName);

    try {
        const path = `make_noise/${currentDeviceId}/${sanitizedFileName}`;
        const { data, error } = await supabaseClient.storage.from("feeder-sounds").upload(path, selectedMakeNoiseFile, {
            cacheControl: '3600',
            upsert: true
        });

        if (error) throw error;

        const { data: publicUrlData } = supabaseClient.storage.from('feeder-sounds').getPublicUrl(path);

        if (!publicUrlData || !publicUrlData.publicUrl) {
            throw new Error("Failed to get public URL for the uploaded file.");
        }

        await db.ref(`device/${currentDeviceId}/commands/makeNoise`).set({
            url: publicUrlData.publicUrl,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        showCustomAlert("สำเร็จ", `ส่งคำสั่งเล่นเสียง: ${originalFileName} แล้ว.`, "success");

    } catch (error) {
        console.error("Error playing make noise:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถเล่นเสียงได้: ${error.message}`, "error");
    } finally {
        setButtonState(makenoiseBtn, false);
        makenoiseAudioInput.value = '';
        makenoiseAudioStatus.textContent = '';
        selectedMakeNoiseFile = null;
        makenoiseBtn.disabled = true;
    }
}

// ===============================================
// ✅ Animal Calculator Integration
// ===============================================

// Apply recommended amount to meal detail modal
function applyRecommendedAmount() {
    const recommendedAmountText = recommendedAmountSpan.textContent;
    const match = recommendedAmountText.match(/(\d+\.?\d*)\s*กรัม/);
    if (match && mealAmountInput) {
        mealAmountInput.value = parseFloat(match[1]);
        showCustomAlert("สำเร็จ", `นำปริมาณที่แนะนำ ${match[1]} กรัม ไปใส่ในช่องปริมาณแล้ว.`, "success");
        // Optionally switch to meal schedule tab
        showSection('meal-schedule-section');
        hideModal(mealDetailModal); // Close calculator modal if it was open
    } else {
        showCustomAlert("ข้อผิดพลาด", "ไม่สามารถนำปริมาณที่แนะนำไปใช้ได้.", "error");
    }
}


// ===============================================
// ✅ DOMContentLoaded and Event Listeners
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    // Get all DOM elements
    deviceIdInput = document.getElementById('deviceIdInput');
    setDeviceIdBtn = document.getElementById('setDeviceIdBtn');
    mainContentContainer = document.getElementById('mainContentContainer');

    deviceStatusCircle = document.getElementById('deviceStatusCircle');
    deviceStatusText = document.getElementById('deviceStatusText');
    notificationDot = document.getElementById('notificationDot');
    openNotificationBtn = document.getElementById('openNotificationBtn');

    customAlertOverlay = document.getElementById('customAlertOverlay');
    customAlertContent = document.getElementById('customAlertContent');
    customAlertTitle = document.getElementById('customAlertTitle');
    customAlertMessage = document.getElementById('customAlertMessage');
    customAlertOkButton = document.getElementById('customAlertOkButton');

    newNotificationToast = document.getElementById('newNotificationToast');
    newNotificationToastMessage = document.getElementById('newNotificationToastMessage');

    notificationModal = document.getElementById('notificationModal');
    closeNotificationModalBtn = document.getElementById('closeNotificationModalBtn');
    notificationList = document.getElementById('notificationList');
    notificationHistoryList = document.getElementById('notificationHistoryList');

    feedNowBtn = document.getElementById('feedNowBtn');
    checkFoodLevelBtn = document.getElementById('checkFoodLevelBtn');
    checkAnimalMovementBtn = document.getElementById('checkAnimalMovementBtn');
    makenoiseAudioInput = document.getElementById('makenoiseAudioInput');
    makenoiseAudioStatus = document.getElementById('makenoiseAudioStatus');
    makenoiseBtn = document.getElementById('makenoiseBtn');

    timeZoneOffsetSelect = document.getElementById('timeZoneOffsetSelect');
    bottleSizeSelect = document.getElementById('bottleSizeSelect');
    customBottleHeightInput = document.getElementById('customBottleHeightInput');
    openCalibrationModalBtn = document.getElementById('openCalibrationModalBtn');
    currentGramsPerSecondDisplay = document.getElementById('currentGramsPerSecondDisplay');

    calibrationModal = document.getElementById('calibrationModal');
    startCalibrationTestBtn = document.getElementById('startCalibrationTestBtn');
    calibrationStatus = document.getElementById('calibrationStatus');
    calibratedWeightInput = document.getElementById('calibratedWeightInput');
    saveCalibrationBtn = document.getElementById('saveCalibrationBtn');
    closeCalibrationModalBtn = document.getElementById('closeCalibrationModalBtn');

    mealListContainer = document.getElementById('mealListContainer');
    addMealCardBtn = document.getElementById('addMealCardBtn');
    mealDetailModal = document.getElementById('mealDetailModal');
    mealModalTitle = document.getElementById('mealModalTitle');
    mealTimeInput = document.getElementById('mealTimeInput');
    mealNameInput = document.getElementById('mealNameInput');
    mealAmountInput = document.getElementById('mealAmountInput');
    mealFanStrengthInput = document.getElementById('mealFanStrengthInput');
    mealFanDirectionInput = document.getElementById('mealFanDirectionInput');
    mealSwingModeCheckbox = document.getElementById('mealSwingModeCheckbox');
    mealAudioInput = document.getElementById('mealAudioInput');
    mealAudioStatus = document.getElementById('mealAudioStatus');
    mealAudioPreview = document.getElementById('mealAudioPreview');
    saveMealDetailBtn = document.getElementById('saveMealDetailBtn');
    deleteMealDetailBtn = document.getElementById('deleteMealDetailBtn');
    cancelMealDetailBtn = document.getElementById('cancelMealDetailBtn');

    animalTypeSelect = document.getElementById('animalType');
    animalSpeciesSelect = document.getElementById('animalSpecies');
    animalCountInput = document.getElementById('animalCount');
    animalWeightKgInput = document.getElementById('animalWeightKg');
    lifeStageActivitySelect = document.getElementById('lifeStageActivity');
    recommendedAmountSpan = document.getElementById('recommendedAmount');
    calculationNotesSpan = document.getElementById('calculationNotes');
    applyRecommendedAmountBtn = document.getElementById('applyRecommendedAmountBtn');

    wifiSsidInput = document.getElementById('wifiSsidInput');
    wifiPasswordInput = document.getElementById('wifiPasswordInput');

    // --- Initial Setup ---
    // Check for saved Device ID
    const savedDeviceId = localStorage.getItem('pawtonomous_device_id');
    if (savedDeviceId) {
        deviceIdInput.value = savedDeviceId;
        setAndLoadDeviceId(savedDeviceId);
        // listenToDeviceStatus() is called inside setAndLoadDeviceId
    } else {
        // If no saved ID, show device selection section
        document.querySelector('.device-selection-section').style.display = 'block';
        mainContentContainer.style.display = 'none';
        updateDeviceStatusUI(false); // Ensure UI is offline initially
    }

    // --- Event Listeners ---

    // Device ID setup
    setDeviceIdBtn.addEventListener('click', () => {
        const inputId = deviceIdInput.value.trim();
        if (inputId) {
            setAndLoadDeviceId(inputId);
        } else {
            showCustomAlert("ข้อผิดพลาด", "กรุณากรอก Device ID.", "error");
        }
    });

    // Tab Navigation
    document.querySelectorAll('.nav-item').forEach(button => {
        button.addEventListener('click', (e) => {
            showSection(e.currentTarget.dataset.target);
        });
    });

    // Custom Alert OK button
    customAlertOkButton.addEventListener('click', () => hideModal(customAlertOverlay));

    // Toast Notification click
    newNotificationToast.addEventListener('click', () => {
        newNotificationToast.classList.remove('show');
        openNotificationModal();
    });

    // Notification Modal buttons
    openNotificationBtn.addEventListener('click', openNotificationModal);
    closeNotificationModalBtn.addEventListener('click', closeNotificationModal);

    // Dashboard Actions
    if (feedNowBtn) feedNowBtn.addEventListener('click', feedNow);
    if (checkFoodLevelBtn) checkFoodLevelBtn.addEventListener('click', checkFoodLevel);
    if (checkAnimalMovementBtn) checkAnimalMovementBtn.addEventListener('click', checkAnimalMovement);
    
    // Make Noise
    if (makenoiseAudioInput && makenoiseAudioStatus && makenoiseBtn) {
        makenoiseAudioInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                selectedMakeNoiseFile = e.target.files[0];
                makenoiseAudioStatus.textContent = `พร้อมอัปโหลด: ${selectedMakeNoiseFile.name}`;
                // Only enable if a file is selected AND device is online
                if (deviceStatusCircle.classList.contains('online') || deviceStatusCircle.classList.contains('low-battery')) { 
                    makenoiseBtn.disabled = false;
                }
            } else {
                selectedMakeNoiseFile = null;
                makenoiseAudioStatus.textContent = '';
                makenoiseBtn.disabled = true;
            }
        });
    }
    if (makenoiseBtn) makenoiseBtn.addEventListener('click', playMakeNoise);

    // System Settings
    if (timeZoneOffsetSelect) {
        timeZoneOffsetSelect.addEventListener('change', () => saveSettingsToFirebase('timezone'));
    }
    if (bottleSizeSelect && customBottleHeightInput) {
        bottleSizeSelect.addEventListener('change', () => {
            if (bottleSizeSelect.value === 'custom') {
                customBottleHeightInput.style.display = 'block';
                customBottleHeightInput.focus();
            } else {
                customBottleHeightInput.style.display = 'none';
            }
            saveSettingsToFirebase('bottlesize');
        });
        customBottleHeightInput.addEventListener('input', () => saveSettingsToFirebase('bottlesize'));
    }
    if (wifiSsidInput) wifiSsidInput.addEventListener('input', () => saveSettingsToFirebase('wifi'));
    if (wifiPasswordInput) wifiPasswordInput.addEventListener('input', () => saveSettingsToFirebase('wifi'));

    // Calibration Modal
    if (openCalibrationModalBtn) openCalibrationModalBtn.addEventListener('click', openCalibrationModal);
    if (closeCalibrationModalBtn) closeCalibrationModalBtn.addEventListener('click', () => hideModal(calibrationModal));
    if (startCalibrationTestBtn) startCalibrationTestBtn.addEventListener('click', startCalibrationTest);
    if (saveCalibrationBtn) saveCalibrationBtn.addEventListener('click', saveCalibration);
    if (calibratedWeightInput) {
        calibratedWeightInput.addEventListener('input', () => {
            saveCalibrationBtn.disabled = isNaN(parseFloat(calibratedWeightInput.value)) || parseFloat(calibratedWeightInput.value) <= 0;
        });
    }

    // Meal Schedule
    if (addMealCardBtn) addMealCardBtn.addEventListener('click', () => openMealDetailModal());
    if (saveMealDetailBtn) saveMealDetailBtn.addEventListener('click', saveMealDetail);
    if (deleteMealDetailBtn) deleteMealDetailBtn.addEventListener('click', deleteMealDetail);
    if (cancelMealDetailBtn) cancelMealDetailBtn.addEventListener('click', () => hideModal(mealDetailModal));

    // Meal Detail Modal specific listeners
    if (mealSwingModeCheckbox && mealFanDirectionInput) {
        mealSwingModeCheckbox.addEventListener('change', () => {
            mealFanDirectionInput.disabled = mealSwingModeCheckbox.checked;
        });
    }
    document.querySelectorAll('.day-btn').forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('selected');
        });
    });
    if (mealAudioInput && mealAudioStatus && mealAudioPreview) {
        mealAudioInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                mealAudioStatus.textContent = `ไฟล์: ${file.name}`;
                mealAudioStatus.style.color = 'grey';
                const fileURL = URL.createObjectURL(file);
                mealAudioPreview.src = fileURL;
                mealAudioPreview.style.display = 'block';
            } else {
                mealAudioStatus.textContent = 'ไม่มีไฟล์';
                mealAudioStatus.style.color = 'grey';
                mealAudioPreview.src = '';
                mealAudioPreview.style.display = 'none';
            }
        });
    }


    // Animal Calculator
    if (animalTypeSelect) {
        populateAnimalType();
        animalTypeSelect.addEventListener('change', () => {
            updateAnimalSpecies();
            updateRecommendedAmount();
        });
    }
    if (animalSpeciesSelect) animalSpeciesSelect.addEventListener('change', updateRecommendedAmount);
    if (animalCountInput) animalCountInput.addEventListener('input', updateRecommendedAmount);
    if (animalWeightKgInput) animalWeightKgInput.addEventListener('input', updateRecommendedAmount);
    if (lifeStageActivitySelect) lifeStageActivitySelect.addEventListener('change', updateRecommendedAmount);
    if (applyRecommendedAmountBtn) applyRecommendedAmountBtn.addEventListener('click', applyRecommendedAmount);

    // Initial call for animal calculator
    updateRecommendedAmount();
});

