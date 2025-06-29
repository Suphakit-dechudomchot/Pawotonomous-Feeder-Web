// script.js (ไฟล์หลักของคุณ)

// Import ฟังก์ชันและตัวแปรจาก animalCalculator.js
// ต้องแน่ใจว่า animalCalculator.js มีการ export ฟังก์ชันเหล่านี้
import { populateAnimalType, updateAnimalSpecies, updateRecommendedAmount, animalData } from './animalCalculator.js';

// Sanitize ชื่อไฟล์ก่อนอัปโหลด
function sanitizeFileName(name) {
    return name
        .normalize("NFD")
        .replace(/\u0300-\u036f/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Firebase Config
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
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Supabase Config
const supabaseClient = supabase.createClient(
    'https://gnkgamizqlosvhkuwzhc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdua2dhbWizcWxvc3Zoa3V2emhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MzY3MTUsImV4cCI6MjA2NjAxMjcxNX0.Dq5oPJ2zV8UUyoNakh4JKZLDG5BppF_pgc'
);

// ตัวแปรส่วนกลางสำหรับมื้ออาหารที่คัดลอกไว้
let copiedMeal = null;

// ฟังก์ชันช่วยเหลือสำหรับจำกัดค่าให้อยู่ในช่วงที่กำหนด
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// ✅ ฟังก์ชันสำหรับจำกัดค่า input และอัปเดต UI ทันที
function clampInput(inputElement, min, max) {
    let value = parseFloat(inputElement.value);
    if (isNaN(value)) {
        value = min; // หากไม่ใช่ตัวเลข ให้ตั้งค่าเป็นค่า min
    }
    const clampedValue = clamp(value, min, max);
    if (inputElement.value != clampedValue) { // อัปเดตเฉพาะเมื่อค่าเปลี่ยน
        inputElement.value = clampedValue;
    }
}

// ฟังก์ชันสำหรับอัปเดตหมายเลขมื้ออาหาร
function updateMealNumbers() {
    document.querySelectorAll(".meal").forEach((mealDiv, index) => {
        const mealLabel = mealDiv.querySelector(".meal-label");
        if (mealLabel) { 
            mealLabel.textContent = `มื้อที่ ${index + 1}:`;
        }
    });
}

// ===============================================
// ✅ การควบคุมสถานะปุ่มหลัก (เช่น กำลังทำงาน/พร้อมใช้งาน)
// ===============================================

// รับ reference ของปุ่มและ Element ต่างๆ (จะถูกกำหนดค่าเมื่อ DOM โหลดเสร็จ)
let feedNowBtn, checkFoodLevelBtn, checkAnimalMovementBtn, makenoiseBtn, pasteBtn; 
let mealList; 
let addMealBtn, saveMealsBtn; 
let openNotificationBtn, closeNotificationBtn;
let deviceStatusCircle, deviceStatusText, notificationDot; 

let customAlertOverlay, customAlertContent, customAlertTitle, customAlertMessage, customAlertOkButton;
let newNotificationToast, newNotificationToastMessage;

let timeZoneOffsetSelect, bottleSizeSelect, customBottleHeightInput, mainContentContainer;
let wifiSsidInput, wifiPasswordInput; 

let animalTypeSelect, animalSpeciesSelect, animalCountInput, animalWeightKgInput, lifeStageActivitySelect, calculationNotesSpan;
let makenoiseAudioInput, makenoiseAudioStatusSpan; 

// กำหนดสถานะปุ่ม
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
        const buttonText = button.querySelector('.button-text');
        if (buttonText) buttonText.style.display = 'none';
        const buttonIcon = button.querySelector('.fa-solid');
        if (buttonIcon) buttonIcon.style.display = 'none';

    } else {
        button.disabled = false;
        button.classList.remove('loading');
        const spinner = button.querySelector('.spinner');
        if (spinner) spinner.remove();
        const buttonText = button.querySelector('.button-text');
        if (buttonText) buttonText.style.display = '';
        const buttonIcon = button.querySelector('.fa-solid');
        if (buttonIcon) buttonIcon.style.display = '';
    }
}

// ✅ NEW: ฟังก์ชันสำหรับตั้งค่าสถานะ Read-Only ของ Input Fields
function setInputsReadOnly(isReadOnly) {
    const inputs = document.querySelectorAll('.meal-time, .meal-amount, .meal-fan-strength-input, .meal-fan-direction-input, .swing-mode-checkbox, #timeZoneOffsetSelect, #bottleSizeSelect, #customBottleHeightInput, #wifiSsidInput, #wifiPasswordInput');
    inputs.forEach(input => {
        input.readOnly = isReadOnly;
        input.disabled = isReadOnly; // ใช้ disabled สำหรับ select และ checkbox
        // หากต้องการให้ select/checkbox ดูเหมือน disabled แต่ยังเลือกได้เพื่อดูค่า
        // อาจจะต้องใช้ overlay หรือเปลี่ยนสีพื้นหลังแทน disabled จริงๆ
        // แต่ disabled ทำให้ชัดเจนที่สุด
    });

    // สำหรับ input file เสียง ให้ซ่อน input field จริงๆ ถ้าเป็น Read-Only
    document.querySelectorAll('.meal-audio').forEach(audioInput => {
        audioInput.style.display = isReadOnly ? 'none' : 'inline-block';
        const audioStatusSpan = audioInput.nextElementSibling; // span.audio-status
        if (audioStatusSpan) {
            audioStatusSpan.style.marginRight = isReadOnly ? '0' : '10px';
        }
    });
}


// ===============================================
// ✅ การจัดการ Custom Alert
// ===============================================
function showCustomAlert(title, message, type = "info") { 
    if (!customAlertOverlay || !customAlertTitle || !customAlertMessage || !customAlertOkButton || !customAlertContent) { 
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

// ===============================================
// ✅ การจัดการ Notification (แสดงผลและ Toast)
// ===============================================
let notificationCount = 0; 
let lastNotificationId = ''; 

function showNewNotificationToast(message) {
    if (!newNotificationToast || !newNotificationToastMessage) return;

    newNotificationToastMessage.textContent = message;
    newNotificationToast.classList.add('show');

    setTimeout(() => {
        newNotificationToast.classList.remove('show');
    }, 5000); 
}

function addNotificationToList(message, timestamp) {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;

    const listItem = document.createElement('li');
    listItem.classList.add('notification-item');
    listItem.innerHTML = `
        <span>${message}</span>
        <span class="notification-timestamp">${timestamp}</span>
    `;
    notificationList.prepend(listItem); 
}

function updateNotificationCountUI() {
    if (!notificationDot) return;
    if (notificationCount > 0) {
        notificationDot.textContent = notificationCount;
        notificationDot.style.display = 'block';
    } else {
        notificationDot.style.display = 'none';
    }
}

function openNotificationModal() {
    const notificationModal = document.getElementById('notificationModal');
    if (notificationModal) {
        notificationModal.style.display = 'flex'; 
        notificationCount = 0; 
        updateNotificationCountUI();
        const notificationList = document.getElementById('notificationList');
        if (notificationList) notificationList.scrollTop = 0;
    }
}

function closeNotificationModal() {
    const notificationModal = document.getElementById('notificationModal');
    if (notificationModal) {
        notificationModal.style.display = 'none';
    }
}

function closeNewNotificationToast() {
    const toast = document.getElementById('newNotificationToast');
    if (toast) {
        toast.classList.remove('show');
    }
}


// ===============================================
// ✅ การจัดการอุปกรณ์ (ESP32) สถานะออนไลน์/ออฟไลน์
// ===============================================

let deviceId = null; 
const DEFAULT_DEVICE_ID = "web_app_test_device"; 
let isDeviceReallyOnline = false; // ✅ NEW: สถานะจริงของอุปกรณ์

function setDeviceStatus(isOnline) {
    if (!deviceStatusCircle || !deviceStatusText) { // ไม่จำเป็นต้องตรวจสอบปุ่มอื่น ๆ ที่นี่
        return; 
    }
    isDeviceReallyOnline = isOnline; // อัปเดตสถานะจริง

    if (isOnline) {
        deviceStatusCircle.classList.remove('offline');
        deviceStatusCircle.classList.add('online');
        deviceStatusText.classList.remove('offline');
        deviceStatusText.classList.add('online');
        deviceStatusText.textContent = 'ออนไลน์';
    } else {
        deviceStatusCircle.classList.remove('online');
        deviceStatusCircle.classList.add('offline');
        deviceStatusText.classList.remove('online');
        deviceStatusText.classList.add('offline');
        deviceStatusText.textContent = 'ออฟไลน์';
    }
    checkSystemSettingsAndToggleUI(); // เรียกใช้เพื่ออัปเดต UI หลักและปุ่ม
}

// ฟังการเปลี่ยนแปลงสถานะออนไลน์ของอุปกรณ์จาก Firebase
db.ref('device/status/online').on('value', (snapshot) => {
    const isOnline = snapshot.val();
    console.log("Device online status:", isOnline);
    setDeviceStatus(isOnline);
});

// ฟังการเปลี่ยนแปลง Device ID (เช่น เมื่อ ESP32 รีสตาร์ทและส่ง ID มาใหม่)
db.ref('device/status/deviceId').on('value', (snapshot) => {
    let currentDeviceId = snapshot.val();
    let isDefaultIdUsed = false; // ✅ NEW: Flag สำหรับบอกว่าใช้ ID จำลองหรือไม่

    if (!currentDeviceId || currentDeviceId.length < 5) { 
        currentDeviceId = DEFAULT_DEVICE_ID; 
        isDefaultIdUsed = true;
        console.log("No valid Device ID from ESP32. Using default for web app development:", DEFAULT_DEVICE_ID);
    }

    if (currentDeviceId !== deviceId) {
        deviceId = currentDeviceId;
        console.log("Active Device ID set to:", deviceId);
        
        loadSettingsFromFirebase(); 
        loadMeals(); 
        setupNotificationListener(deviceId); 
        fetchAndDisplayNotifications(); 

        // หากใช้ ID จำลอง ให้เว็บถือว่า "ออนไลน์ชั่วคราว" เพื่อแสดง UI ได้
        if (isDefaultIdUsed) {
            setDeviceStatus(true); // ตั้งสถานะ UI เป็นออนไลน์ (แม้ ESP32 จริงจะออฟไลน์)
        } else {
            // หากได้ ID จริงมา setDeviceStatus จะถูกเรียกจาก listener 'device/status/online' อีกที
            // เพื่อให้สถานะ isDeviceReallyOnline ถูกต้อง
        }
        checkSystemSettingsAndToggleUI(); // ตรวจสอบการตั้งค่าระบบเพื่อเปิด UI
    } else if (!currentDeviceId) { 
        deviceId = null; 
        console.log("Device ID is null, device might be offline or not connected.");
        setDeviceStatus(false); // ซ่อน UI หลักและปิดใช้งานปุ่ม
    }
});


// ===============================================
// ✅ การจัดการ Notification Listener (Firebase)
// ===============================================

let notificationRef = null; 
function setupNotificationListener(currentDeviceId) {
    if (notificationRef) {
        notificationRef.off('child_added'); 
        console.log("Previous notification listener removed.");
    }

    if (currentDeviceId) {
        notificationRef = db.ref(`device/${currentDeviceId}/notifications`);
        console.log(`Setting up notification listener for device: device/${currentDeviceId}/notifications`);

        notificationRef.limitToLast(1).on('child_added', (snapshot) => {
            const notification = snapshot.val();
            const notificationId = snapshot.key; 
            console.log("New notification received:", notification);

            const date = new Date(notification.timestamp);
            const options = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: false, 
                timeZoneName: 'shortOffset', 
                timeZone: 'Asia/Bangkok' 
            };
            const formattedTime = date.toLocaleString('th-TH', options);

            if (notificationId !== lastNotificationId) {
                lastNotificationId = notificationId;
                showNewNotificationToast(notification.message); 
                addNotificationToList(notification.message, formattedTime); 
                notificationCount++; 
                updateNotificationCountUI(); 
            }
        });
    } else {
        console.warn("Cannot set up notification listener: Device ID is not available.");
    }
}

async function fetchAndDisplayNotifications() {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;
    notificationList.innerHTML = ''; 
    notificationCount = 0; 

    if (!deviceId) {
        console.log("No deviceId available to fetch notifications.");
        updateNotificationCountUI();
        return;
    }

    try {
        const snapshot = await db.ref(`device/${deviceId}/notifications`)
                                .orderByChild('timestamp') 
                                .limitToLast(20) 
                                .once('value');
        
        const notifications = [];
        snapshot.forEach(childSnapshot => {
            notifications.push(childSnapshot.val());
            lastNotificationId = childSnapshot.key;
        });

        notifications.sort((a, b) => a.timestamp - b.timestamp);

        notifications.forEach(notification => {
            const date = new Date(notification.timestamp);
            const options = {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: 'numeric', minute: 'numeric', second: 'numeric',
                hour12: false, timeZoneName: 'shortOffset', timeZone: 'Asia/Bangkok'
            };
            const formattedTime = date.toLocaleString('th-TH', options);
            addNotificationToList(notification.message, formattedTime);
        });
        updateNotificationCountUI(); 

    } catch (error) {
        console.error("Error fetching historical notifications:", error);
    }
}

// ===============================================
// ✅ การจัดการการตั้งค่าระบบ (โซนเวลา, ขนาดขวด, Wi-Fi)
// ===============================================

let wifiSettingsTimeout; 

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

const saveWifiSettingsToFirebase = debounce(async () => {
    // ✅ เงื่อนไขการบันทึก: ต้องมี Device ID จริงและออนไลน์
    if (!deviceId || deviceId === DEFAULT_DEVICE_ID || !isDeviceReallyOnline) { 
        showCustomAlert("ข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูล Wi-Fi ได้: อุปกรณ์ไม่ได้ออนไลน์หรือกำลังใช้โหมดทดสอบ.", "error");
        return;
    }
    if (!wifiSsidInput || !wifiPasswordInput) { 
        console.error("Wi-Fi input elements not found in saveWifiSettingsToFirebase.");
        return;
    }

    const ssid = wifiSsidInput.value;
    const password = wifiPasswordInput.value;

    try {
        await db.ref(`device/${deviceId}/settings/wifiCredentials`).set({
            ssid: ssid,
            password: password,
            timestamp: firebase.database.ServerValue.TIMESTAMP 
        });
        console.log("Wi-Fi settings saved successfully.");
        checkSystemSettingsAndToggleUI(); 
    } catch (error) {
        console.error("Error saving Wi-Fi settings:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถบันทึกข้อมูล Wi-Fi ได้: ${error.message}`, "error");
    }
}, 1000); 

async function loadSettingsFromFirebase() {
    if (!deviceId) {
        console.log("No deviceId available to load system settings. Hiding main content.");
        if (mainContentContainer) mainContentContainer.style.display = 'none'; // อาจจะลบหรือไม่ก็ได้ ขึ้นอยู่กับว่าต้องการซ่อนเมื่อไม่มี ID เลยหรือไม่
        return;
    }
    try {
        const snapshot = await db.ref(`device/${deviceId}/settings`).once('value');
        const settings = snapshot.val();
        
        if (settings) {
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

            if (bottleSizeSelect) { 
                if (settings.bottleSize !== null && settings.bottleSize !== "") {
                    bottleSizeSelect.value = settings.bottleSize;
                    if (settings.bottleSize === 'custom') {
                        if (customBottleHeightInput) { 
                            customBottleHeightInput.style.display = 'block';
                            if (settings.customBottleHeight !== null && !isNaN(parseFloat(settings.customBottleHeight))) {
                                customBottleHeightInput.value = settings.customBottleHeight;
                            } else {
                                customBottleHeightInput.value = ''; 
                            }
                        }
                    } else {
                        if (customBottleHeightInput) { 
                            customBottleHeightInput.style.display = 'none';
                            customBottleHeightInput.value = ''; 
                        }
                    }
                } else {
                    bottleSizeSelect.value = ''; 
                    if (customBottleHeightInput) { 
                        customBottleHeightInput.style.display = 'none';
                        customBottleHeightInput.value = ''; 
                    }
                }
            }

            if (wifiSsidInput && wifiPasswordInput) { 
                if (settings.wifiCredentials && settings.wifiCredentials.ssid) {
                    wifiSsidInput.value = settings.wifiCredentials.ssid;
                    wifiPasswordInput.value = settings.wifiCredentials.password || ''; 
                } else {
                    wifiSsidInput.value = '';
                    wifiPasswordInput.value = '';
                }
            }

        } else {
            // ถ้ายังไม่มีการตั้งค่า ให้ตั้งค่าเริ่มต้น (เลือกค่าว่าง)
            if (timeZoneOffsetSelect) timeZoneOffsetSelect.value = ''; 
            if (bottleSizeSelect) bottleSizeSelect.value = ''; 
            if (customBottleHeightInput) {
                customBottleHeightInput.style.display = 'none';
                customBottleHeightInput.value = '';
            }
            if (wifiSsidInput) wifiSsidInput.value = '';
            if (wifiPasswordInput) wifiPasswordInput.value = '';
            console.log("No existing system settings found. Using defaults.");
        }
        checkSystemSettingsAndToggleUI(); 
    } catch (error) {
        console.error("Error loading system settings:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถโหลดการตั้งค่าระบบได้: ${error.message}`, "error");
        if (mainContentContainer) mainContentContainer.style.display = 'none'; 
    }
}

async function saveSettingsToFirebase() {
    // ✅ เงื่อนไขการบันทึก: ต้องมี Device ID จริงและออนไลน์
    if (!deviceId || deviceId === DEFAULT_DEVICE_ID || !isDeviceReallyOnline) {
        showCustomAlert("ข้อผิดพลาด", "ไม่สามารถบันทึกการตั้งค่าระบบได้: อุปกรณ์ไม่ได้ออนไลน์หรือกำลังใช้โหมดทดสอบ.", "error");
        return;
    }
    
    const timeZoneOffset = timeZoneOffsetSelect ? timeZoneOffsetSelect.value : null; 
    const bottleSize = bottleSizeSelect ? bottleSizeSelect.value : null; 
    let customBottleHeightValue = null;
    if (customBottleHeightInput) {
        customBottleHeightValue = parseFloat(customBottleHeightInput.value);
    }

    let settingsToSave = {
        timeZoneOffset: (timeZoneOffset === "" || timeZoneOffset === null) ? null : parseFloat(timeZoneOffset),
        bottleSize: (bottleSize === "" || bottleSize === null) ? null : bottleSize
    };

    if (bottleSize === 'custom' && customBottleHeightInput && !isNaN(customBottleHeightValue) && customBottleHeightValue > 0) { 
        settingsToSave.customBottleHeight = customBottleHeightValue;
    } else {
        settingsToSave.customBottleHeight = null; 
    }

    try {
        await db.ref(`device/${deviceId}/settings`).update(settingsToSave);
        console.log("System settings (TimeZone/BottleSize) saved successfully!");
        checkSystemSettingsAndToggleUI(); 
    } catch (error) {
        console.error("Error saving system settings:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถบันทึกการตั้งค่าระบบได้: ${error.message}`, "error");
    }
}

// ✅ NEW: ปรับปรุง checkSystemSettingsAndToggleUI เพื่อจัดการโหมด Read-Only
function checkSystemSettingsAndToggleUI() {
    // ตรวจสอบ Element ที่สำคัญทั้งหมด
    if (!mainContentContainer || !timeZoneOffsetSelect || !bottleSizeSelect || !customBottleHeightInput || !wifiSsidInput || !wifiPasswordInput || !deviceStatusCircle || !feedNowBtn || !saveMealsBtn || !addMealBtn || !pasteBtn || !checkFoodLevelBtn || !checkAnimalMovementBtn || !makenoiseBtn || !makenoiseAudioInput) { 
        console.warn("System settings UI elements not fully initialized or missing.");
        return;
    }

    // แสดง mainContentContainer เสมอเมื่อมี deviceId ไม่ว่าจะเป็นจริงหรือจำลอง
    if (deviceId) {
        mainContentContainer.style.display = 'block';
    } else {
        mainContentContainer.style.display = 'none';
        return; // ไม่ต้องทำต่อถ้าไม่มี deviceId เลย
    }

    // กำหนดว่าอยู่ในโหมด Read-Only หรือไม่
    const isReadOnlyMode = (!isDeviceReallyOnline || deviceId === DEFAULT_DEVICE_ID); // ถ้าอุปกรณ์ไม่ออนไลน์จริง หรือใช้ ID จำลอง

    // ตั้งค่า Read-Only สำหรับ Input Fields ทั้งหมด
    setInputsReadOnly(isReadOnlyMode);

    // ✅ แสดงข้อความแจ้งเตือนสถานะ
    const statusMessageDiv = document.getElementById('statusMessage'); // คุณอาจต้องเพิ่ม div นี้ใน HTML
    if (statusMessageDiv) {
        if (isReadOnlyMode) {
            if (deviceId === DEFAULT_DEVICE_ID) {
                statusMessageDiv.textContent = "กำลังใช้งานโหมดพัฒนา: การตั้งค่าจะไม่ถูกส่งไปยังอุปกรณ์จริง";
                statusMessageDiv.style.color = "orange";
            } else {
                statusMessageDiv.textContent = "อุปกรณ์ออฟไลน์: แสดงการตั้งค่าล่าสุด. การเปลี่ยนแปลงจะถูกบันทึกเมื่ออุปกรณ์ออนไลน์.";
                statusMessageDiv.style.color = "red";
            }
            statusMessageDiv.style.display = 'block';
        } else {
            statusMessageDiv.style.display = 'none'; // ซ่อนข้อความเมื่อออนไลน์
        }
    }


    // จัดการสถานะ Disabled ของปุ่ม
    const enableInteraction = (isDeviceReallyOnline && deviceId !== DEFAULT_DEVICE_ID);

    setButtonState(feedNowBtn, !enableInteraction);
    setButtonState(saveMealsBtn, !enableInteraction);
    addMealBtn.disabled = !enableInteraction;
    setButtonState(checkFoodLevelBtn, !enableInteraction);
    setButtonState(checkAnimalMovementBtn, !enableInteraction);
    
    // ปุ่ม Make Noise: ปิดใช้งานถ้าไม่ออนไลน์ หรือไม่มีไฟล์เสียงเลือก
    if (makenoiseBtn) {
        const hasSelectedFile = makenoiseAudioInput && makenoiseAudioInput.files.length > 0;
        setButtonState(makenoiseBtn, !(enableInteraction && hasSelectedFile));
    }

    // ปุ่ม Paste: ปิดใช้งานถ้าไม่ออนไลน์ หรือไม่มี copiedMeal
    if (pasteBtn) {
        pasteBtn.disabled = !(enableInteraction && copiedMeal);
    }
}


// ===============================================
// ✅ การจัดการมื้ออาหาร (เพิ่ม, ลบ, แก้ไข, บันทึก, โหลด)
// ===============================================

function addMeal(meal = {}) { 
    const div = document.createElement("div");
    div.className = "meal";
    div.dataset.id = meal.id || Date.now(); 

    const time = meal.time || "";
    const amount = meal.amount || 1;
    const fanStrength = meal.fanStrength || 1; 
    const fanDirection = meal.fanDirection || 90; 
    const swingMode = meal.swingMode || false; 
    const audioUrl = meal.audioUrl || "";
    const originalFileName = meal.originalNoiseFileName || "";

    let initialAudioStatusText = originalFileName ? `ไฟล์: ${originalFileName}` : 'ไม่มีไฟล์';
    if (audioUrl && !originalFileName) { 
         initialAudioStatusText = `ไฟล์: ${audioUrl.split('/').pop()}`;
    }

    div.innerHTML = `
        <span class="meal-label"></span>
        <label>เวลา: <input type="time" value="${time}" class="meal-time"></label>
        <label> ปริมาณ (g): <input type="number" value="${amount}" class="meal-amount" min="1" max="100"></label>
        <label>ความแรงลม (1-3): <input type="number" class="meal-fan-strength-input" min="1" max="3" value="${fanStrength}"></label>
        <label>ทิศทางลม (60°-120°): 
            <input type="number" class="meal-fan-direction-input" min="60" max="120" value="${fanDirection}" ${swingMode ? 'disabled' : ''}>
            <span class="swing-toggle">
                <input type="checkbox" class="swing-mode-checkbox" ${swingMode ? 'checked' : ''}> โหมดสวิง
            </span>
        </label>
        <label>เสียง: <input type="file" accept="audio/*" class="meal-audio"> <span class="audio-status" style="color: grey;">${initialAudioStatusText}</span></label>
        <button class="copy-meal-btn"><i class="fa-solid fa-copy"></i></button>
        <button class="delete-meal-btn"><i class="fa-solid fa-trash"></i></button>
    `;
    
    div.dataset.audioUrl = audioUrl;
    div.dataset.originalNoiseFileName = originalFileName;


    const timeInput = div.querySelector(".meal-time"); // ต้องอ้างอิงถึง timeInput
    const amountInput = div.querySelector('.meal-amount');
    const fanStrengthInput = div.querySelector('.meal-fan-strength-input');
    const fanDirectionInput = div.querySelector('.meal-fan-direction-input');
    const swingModeCheckbox = div.querySelector('.swing-mode-checkbox');
    const audioInput = div.querySelector(".meal-audio");
    const audioStatusSpan = div.querySelector(".audio-status");
    const copyButton = div.querySelector(".copy-meal-btn");
    const deleteButton = div.querySelector(".delete-meal-btn");

    amountInput.addEventListener('input', () => clampInput(amountInput, 1, 100));
    fanStrengthInput.addEventListener('input', () => clampInput(fanStrengthInput, 1, 3));
    fanDirectionInput.addEventListener('input', () => clampInput(fanDirectionInput, 60, 120));

    swingModeCheckbox.addEventListener('change', () => {
        fanDirectionInput.disabled = swingModeCheckbox.checked; 
    });

    audioInput.addEventListener("change", async () => {
        const file = audioInput.files[0];
        if (!file) {
            audioStatusSpan.textContent = "ไม่มีไฟล์"; 
            audioStatusSpan.style.color = "grey";
            div.dataset.audioUrl = "";
            div.dataset.originalNoiseFileName = "";
            return;
        }

        // ✅ เงื่อนไขการอัปโหลดไฟล์: ต้องมี Device ID จริงและออนไลน์
        if (!deviceId || deviceId === DEFAULT_DEVICE_ID || !isDeviceReallyOnline) {
            showCustomAlert("ข้อผิดพลาด", "ไม่สามารถอัปโหลดไฟล์เสียงได้: อุปกรณ์ไม่ได้ออนไลน์หรือกำลังใช้โหมดทดสอบ.", "error");
            audioInput.value = ''; // เคลียร์ไฟล์ที่เลือก
            audioStatusSpan.textContent = "อัปโหลดไม่สำเร็จ";
            audioStatusSpan.style.color = "red";
            return;
        }

        audioStatusSpan.textContent = "🔄 กำลังอัปโหลด...";
        audioStatusSpan.style.color = "orange";
        const uniqueFileName = `${Date.now()}_${sanitizeFileName(file.name)}`;

        try {
            const { data, error } = await supabaseClient.storage.from("feeder-sounds").upload(`meal_noises/${div.dataset.id}/${uniqueFileName}`, file);

            if (error) {
                showCustomAlert("อัปโหลดไม่สำเร็จ", "อัปโหลดไฟล์เสียงไม่สำเร็จ: " + error.message, "error");
                audioStatusSpan.textContent = "❌ อัปโหลดไม่สำเร็จ: " + error.message;
                audioStatusSpan.style.color = "red";
                div.dataset.audioUrl = "";
                div.dataset.originalNoiseFileName = "";
                console.error("Supabase Upload Error:", error);
                return;
            }

            const { data: publicData } = supabaseClient.storage.from("feeder-sounds").getPublicUrl(`meal_noises/${div.dataset.id}/${uniqueFileName}`);
            const downloadURL = publicData.publicUrl;

            div.dataset.audioUrl = downloadURL;
            div.dataset.originalNoiseFileName = file.name; 

            audioStatusSpan.innerHTML = `✅ อัปโหลดแล้ว<br><small>(${file.name})</small>`; 
            audioStatusSpan.style.color = "green";
            showCustomAlert("สำเร็จ", `อัปโหลดไฟล์เสียง "${file.name}" สำเร็จแล้ว!`, "success");
        } catch (e) {
            showCustomAlert("ข้อผิดพลาด", "เกิดข้อผิดพลาดขณะอัปโหลดไฟล์: " + e.message, "error");
            audioStatusSpan.textContent = `❌ เกิดข้อผิดพลาด: ${e.message}`;
            audioStatusSpan.style.color = "red";
            div.dataset.audioUrl = "";
            div.dataset.originalNoiseFileName = "";
            console.error("General Upload Error:", e);
        }
    });

    // แนบ Event Listener สำหรับ Element ภายใน Div ของมื้ออาหารใหม่
    deleteButton.addEventListener("click", () => {
        // ✅ เงื่อนไขการลบมื้ออาหาร: ต้องมี Device ID จริงและออนไลน์
        if (!deviceId || deviceId === DEFAULT_DEVICE_ID || !isDeviceReallyOnline) {
            showCustomAlert("ข้อผิดพลาด", "ไม่สามารถลบมื้ออาหารได้: อุปกรณ์ไม่ได้ออนไลน์หรือกำลังใช้โหมดทดสอบ.", "error");
            return;
        }
        div.remove();
        updateMealNumbers();
    });

    copyButton.addEventListener("click", () => {
        copiedMeal = {
            id: Date.now(), 
            time: timeInput.value, 
            amount: parseInt(amountInput.value), 
            fanStrength: parseInt(fanStrengthInput.value), 
            fanDirection: parseInt(fanDirectionInput.value), 
            swingMode: swingModeCheckbox.checked, 
            audioUrl: div.dataset.audioUrl || "", 
            originalNoiseFileName: div.dataset.originalNoiseFileName || "" 
        };
        showCustomAlert("คัดลอก", "คัดลอกมื้อเรียบร้อยแล้ว!", "info");
        if (pasteBtn) {
            pasteBtn.disabled = false;
        }
        // อัปเดตสถานะปุ่มหลังจากคัดลอก
        checkSystemSettingsAndToggleUI();
    });

    if (mealList) { 
        mealList.appendChild(div);
    }
    updateMealNumbers();

    // ✅ เรียก setInputsReadOnly อีกครั้งหลังเพิ่มมื้ออาหารใหม่
    checkSystemSettingsAndToggleUI(); 
}

function pasteCopiedMeal() {
    // ✅ เงื่อนไขการวางมื้ออาหาร: ต้องมี Device ID จริงและออนไลน์
    if (!deviceId || deviceId === DEFAULT_DEVICE_ID || !isDeviceReallyOnline) {
        showCustomAlert("ข้อผิดพลาด", "ไม่สามารถวางมื้ออาหารได้: อุปกรณ์ไม่ได้ออนไลน์หรือกำลังใช้โหมดทดสอบ.", "error");
        return;
    }

    if (copiedMeal) {
        addMeal({
            id: Date.now(), 
            time: copiedMeal.time,
            amount: copiedMeal.amount,
            fanStrength: copiedMeal.fanStrength,
            fanDirection: copiedMeal.fanDirection,
            swingMode: copiedMeal.swingMode,
            audioUrl: copiedMeal.audioUrl,
            originalNoiseFileName: copiedMeal.originalNoiseFileName
        });
        copiedMeal = null; 
        if (pasteBtn) {
            pasteBtn.disabled = true;
        }
        showCustomAlert("วาง", "วางมื้ออาหารที่คัดลอกแล้ว!", "success");
    } else {
        showCustomAlert("คำเตือน", "ยังไม่มีมื้ออาหารที่คัดลอก!", "warning");
    }
}

async function saveMeals() {
    // ✅ เงื่อนไขการบันทึก: ต้องมี Device ID จริงและออนไลน์
    if (!deviceId || deviceId === DEFAULT_DEVICE_ID || !isDeviceReallyOnline) { 
        showCustomAlert("ข้อผิดพลาด", "ไม่สามารถบันทึกมื้ออาหารได้: อุปกรณ์ไม่ได้ออนไลน์หรือกำลังใช้โหมดทดสอบ.", "error");
        if (saveMealsBtn) setButtonState(saveMealsBtn, false); 
        return;
    }
    if (!saveMealsBtn) return; 
    setButtonState(saveMealsBtn, true); 

    const mealsToSave = [];
    let isValid = true;
    document.querySelectorAll(".meal").forEach(div => {
        const timeInput = div.querySelector(".meal-time");
        const amountInput = div.querySelector(".meal-amount");
        const fanStrengthInput = div.querySelector(".meal-fan-strength-input");
        const fanDirectionInput = div.querySelector(".meal-fan-direction-input");
        const swingModeCheckbox = div.querySelector(".swing-mode-checkbox");

        const time = timeInput ? timeInput.value : "";
        let amount = amountInput ? parseInt(amountInput.value) : 0;
        let fanStrength = fanStrengthInput ? parseInt(fanStrengthInput.value) : 1;
        let fanDirection = fanDirectionInput ? parseInt(fanDirectionInput.value) : 90;
        const swingMode = swingModeCheckbox ? swingModeCheckbox.checked : false;
        const audioUrl = div.dataset.audioUrl || null; 
        const originalFileName = div.dataset.originalNoiseFileName || null; 

        amount = clamp(amount, 1, 100);
        fanStrength = clamp(fanStrength, 1, 3);
        fanDirection = clamp(fanDirection, 60, 120);

        if (!time || isNaN(amount) || amount <= 0 || isNaN(fanStrength) || isNaN(fanDirection)) {
            isValid = false;
            showCustomAlert("ข้อผิดพลาด", "โปรดกรอกข้อมูลให้ครบถ้วนและถูกต้องสำหรับทุกมื้อ (เวลา, ปริมาณ).", "error");
            return;
        }

        mealsToSave.push({
            id: div.dataset.id, 
            time: time,
            amount: amount,
            fanStrength: fanStrength,
            fanDirection: fanDirection,
            swingMode: swingMode,
            audioUrl: audioUrl,
            originalNoiseFileName: originalFileName
        });
    });

    if (!isValid) {
        setButtonState(saveMealsBtn, false);
        return;
    }

    try {
        await db.ref(`device/${deviceId}/meals`).set(mealsToSave);
        console.log("Meals saved successfully!");
        showCustomAlert("สำเร็จ", "บันทึกมื้ออาหารเรียบร้อยแล้ว.", "success");
    } catch (err) {
        console.error("Error saving meals:", err);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถบันทึกมื้ออาหารได้: ${err.message}`, "error");
    } finally {
        setButtonState(saveMealsBtn, false); 
    }
}

async function loadMeals() {
    if (!deviceId) {
        console.log("No deviceId available to load meals.");
        if (mealList) mealList.innerHTML = ""; 
        addMeal({}); 
        updateMealNumbers();
        return;
    }
    try {
        const snapshot = await db.ref(`device/${deviceId}/meals`).once("value");
        if (mealList) mealList.innerHTML = ""; 
        const mealsData = snapshot.val();
        if (mealsData && Array.isArray(mealsData) && mealsData.length > 0) {
            mealsData.forEach(meal => {
                addMeal(meal); 
            });
        } else {
            addMeal({}); 
        }
        updateMealNumbers();
    } catch (error) {
        console.error("Error loading meals:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถโหลดมื้ออาหารได้: ${error.message}`, "error");
        if (mealList) mealList.innerHTML = ""; 
        addMeal({}); 
        updateMealNumbers();
    }
}


// ===============================================
// ✅ การสั่งให้อาหารทันที
// ===============================================

async function feedNow() {
    // ✅ เงื่อนไขการสั่งงาน: ต้องมี Device ID จริงและออนไลน์
    if (!deviceId || deviceId === DEFAULT_DEVICE_ID || !isDeviceReallyOnline) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์จริง (กำลังใช้โหมดทดสอบ). โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        if (feedNowBtn) setButtonState(feedNowBtn, false);
        return;
    }
    if (!feedNowBtn) return; 
    setButtonState(feedNowBtn, true); 
    try {
        const snapshot = await db.ref(`device/${deviceId}/meals`).once('value');
        const mealsData = snapshot.val();

        if (!mealsData || Object.keys(mealsData).length === 0) {
            showCustomAlert("ข้อผิดพลาด", "ไม่มีการตั้งค่ามื้ออาหาร. โปรดเพิ่มมื้ออาหารก่อนที่จะให้อาหารทันที.", "error");
            setButtonState(feedNowBtn, false);
            return;
        }

        const firstMealKey = Object.keys(mealsData)[0];
        const mealToDispense = mealsData[firstMealKey];

        if (!mealToDispense) {
            showCustomAlert("ข้อผิดพลาด", "ไม่พบข้อมูลมื้ออาหารที่จะให้อาหาร.", "error");
            setButtonState(feedNowBtn, false);
            return;
        }

        await db.ref(`device/${deviceId}/commands/feedNow`).set({
            amount: mealToDispense.amount,
            fanStrength: mealToDispense.fanStrength, 
            fanDirection: mealToDispense.fanDirection, 
            swingMode: mealToDispense.swingMode || false, 
            noiseFile: mealToDispense.audioUrl || null, 
            originalNoiseFileName: mealToDispense.originalNoiseFileName || null, 
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        showCustomAlert("กำลังให้อาหาร", "ส่งคำสั่งให้อาหารทันทีแล้ว. กรุณารอ...", "info");
    }
    catch (error) {
        console.error("Error sending feedNow command:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถส่งคำสั่งให้อาหารได้: ${error.message}`, "error");
    } finally {
        setButtonState(feedNowBtn, false); 
    }
}

// ===============================================
// ✅ การเช็คปริมาณอาหาร
// ===============================================

async function checkFoodLevel() {
    // ✅ เงื่อนไขการสั่งงาน: ต้องมี Device ID จริงและออนไลน์
    if (!deviceId || deviceId === DEFAULT_DEVICE_ID || !isDeviceReallyOnline) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์จริง (กำลังใช้โหมดทดสอบ). โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        if (checkFoodLevelBtn) setButtonState(checkFoodLevelBtn, false);
        return;
    }
    if (!checkFoodLevelBtn) return; 
    setButtonState(checkFoodLevelBtn, true); 
    try {
        await db.ref(`device/${deviceId}/commands/checkFoodLevel`).set(firebase.database.ServerValue.TIMESTAMP);

        const resultPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                db.ref(`device/${deviceId}/status/foodLevel`).off('value', listener); 
                reject(new Error("การตรวจสอบระดับอาหารใช้เวลานานเกินไป."));
            }, 15000); 

            const listener = db.ref(`device/${deviceId}/status/foodLevel`).on('value', (snapshot) => {
                const foodLevel = snapshot.val();
                if (foodLevel !== null) {
                    clearTimeout(timeout);
                    db.ref(`device/${deviceId}/status/foodLevel`).off('value', listener); 
                    resolve(foodLevel);
                }
            });
        });

        const foodLevelResult = await resultPromise;
        
        let bottleHeight = 0;
        const bottleSnapshot = await db.ref(`device/${deviceId}/settings/bottleSize`).once('value');
        const customHeightSnapshot = await db.ref(`device/${deviceId}/settings/customBottleHeight`).once('value');
        
        const savedBottleSize = bottleSnapshot.val();
        const savedCustomHeight = customHeightSnapshot.val();

        if (savedBottleSize === 'custom' && savedCustomHeight !== null) {
            bottleHeight = parseFloat(savedCustomHeight);
        } else if (savedBottleSize && savedBottleSize !== "") {
            bottleHeight = parseFloat(savedBottleSize);
        }

        if (isNaN(bottleHeight) || bottleHeight <= 0) {
            showCustomAlert("ข้อผิดพลาด", "โปรดตั้งค่าขนาดขวดใน 'การตั้งค่าระบบ' ก่อน.", "error");
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
        else if (foodLevelResult > bottleHeight - (bottleHeight * 0.1)) { 
            message += `\nอาหารในถังเหลือน้อยมาก (ประมาณ ${Math.round(percentage)}%).`;
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

// ===============================================
// ✅ การเช็คการเคลื่อนไหวสัตว์
// ===============================================

async function checkAnimalMovement() {
    // ✅ เงื่อนไขการสั่งงาน: ต้องมี Device ID จริงและออนไลน์
    if (!deviceId || deviceId === DEFAULT_DEVICE_ID || !isDeviceReallyOnline) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์จริง (กำลังใช้โหมดทดสอบ). โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        if (checkAnimalMovementBtn) setButtonState(checkAnimalMovementBtn, false);
        return;
    }
    if (!checkAnimalMovementBtn) return; 
    setButtonState(checkAnimalMovementBtn, true); 
    try {
        await db.ref(`device/${deviceId}/commands/checkMovement`).set(firebase.database.ServerValue.TIMESTAMP);

        const resultPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                db.ref(`device/${deviceId}/status/lastMovementDetected`).off('value', listener);
                reject(new Error("การตรวจสอบการเคลื่อนไหวใช้เวลานานเกินไป."));
            }, 15000); 

            const listener = db.ref(`device/${deviceId}/status/lastMovementDetected`).on('value', (snapshot) => {
                const lastDetectedTimestamp = snapshot.val();
                if (lastDetectedTimestamp !== null) {
                    clearTimeout(timeout);
                    db.ref(`device/${deviceId}/status/lastMovementDetected`).off('value', listener);
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

// ===============================================
// ✅ การเล่นเสียง Make Noise ทันที
// ===============================================
let selectedMakeNoiseFile = null; 

document.addEventListener('DOMContentLoaded', () => {
    // Event listener สำหรับ makenoiseAudioInput
    if (makenoiseAudioInput && makenoiseAudioStatusSpan && makenoiseBtn) { 
        makenoiseAudioInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                selectedMakeNoiseFile = e.target.files[0];
                makenoiseAudioStatusSpan.textContent = `พร้อมอัปโหลด: ${selectedMakeNoiseFile.name}`;
                // เรียก checkSystemSettingsAndToggleUI เพื่ออัปเดตสถานะปุ่ม makenoiseBtn
                checkSystemSettingsAndToggleUI(); 
            } else {
                selectedMakeNoiseFile = null;
                makenoiseAudioStatusSpan.textContent = '';
                // เรียก checkSystemSettingsAndToggleUI เพื่ออัปเดตสถานะปุ่ม makenoiseBtn
                checkSystemSettingsAndToggleUI(); 
            }
        });
    }
});


async function playMakeNoise() {
    // ✅ เงื่อนไขการสั่งงาน: ต้องมี Device ID จริงและออนไลน์
    if (!deviceId || deviceId === DEFAULT_DEVICE_ID || !isDeviceReallyOnline) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์จริง (กำลังใช้โหมดทดสอบ). โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        if (makenoiseBtn) setButtonState(makenoiseBtn, false);
        return;
    }
    if (!selectedMakeNoiseFile) {
        showCustomAlert("ข้อผิดพลาด", "โปรดเลือกไฟล์เสียงก่อน.", "error");
        return;
    }

    if (!makenoiseBtn) return; 
    setButtonState(makenoiseBtn, true); 
    const originalFileName = selectedMakeNoiseFile.name;
    const sanitizedFileName = sanitizeFileName(originalFileName);

    try {
        const path = `make_noise/${deviceId}/${sanitizedFileName}`; 
        const { data, error } = await supabaseClient
            .storage
            .from('feeder-sounds')
            .upload(path, selectedMakeNoiseFile, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            throw error;
        }

        const { data: publicUrlData } = supabaseClient
            .storage
            .from('feeder-sounds')
            .getPublicUrl(path);

        if (!publicUrlData || !publicUrlData.publicUrl) {
            throw new Error("Failed to get public URL for the uploaded file.");
        }

        await db.ref(`device/${deviceId}/commands/makeNoise`).set({
            url: publicUrlData.publicUrl,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        showCustomAlert("สำเร็จ", `ส่งคำสั่งเล่นเสียง: ${originalFileName} แล้ว.`, "success");

    } catch (error) {
        console.error("Error playing make noise:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถเล่นเสียงได้: ${error.message}`, "error");
    } finally {
        if (makenoiseBtn) setButtonState(makenoiseBtn, false); 
        if (makenoiseAudioInput) makenoiseAudioInput.value = ''; 
        if (makenoiseAudioStatusSpan) makenoiseAudioStatusSpan.textContent = '';
        selectedMakeNoiseFile = null;
        // เรียก checkSystemSettingsAndToggleUI เพื่ออัปเดตสถานะปุ่ม makenoiseBtn
        checkSystemSettingsAndToggleUI(); 
    }
}

// ===============================================
// ✅ Initial Load และ Event Listeners
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. ✅ รับ Reference ของ Element ต่างๆ ทั้งหมด ที่นี่ ณ จุดเริ่มต้นของ DOMContentLoaded
    feedNowBtn = document.getElementById('feedNowBtn');
    checkFoodLevelBtn = document.getElementById('checkFoodLevelBtn');
    checkAnimalMovementBtn = document.getElementById('checkAnimalMovementBtn');
    makenoiseBtn = document.getElementById('makenoiseBtn');
    pasteBtn = document.getElementById('pasteBtn');
    mealList = document.getElementById("mealList");
    addMealBtn = document.getElementById('addMealBtn');
    saveMealsBtn = document.getElementById('saveMealsBtn');
    openNotificationBtn = document.getElementById('openNotificationBtn');
    closeNotificationBtn = document.getElementById('closeNotificationBtn');
    
    makenoiseAudioInput = document.getElementById("makenoiseAudioInput");
    makenoiseAudioStatusSpan = document.getElementById("makenoiseAudioStatus");

    deviceStatusCircle = document.getElementById("deviceStatusCircle");
    deviceStatusText = document.getElementById("deviceStatusText");
    animalTypeSelect = document.getElementById("animalType");
    animalSpeciesSelect = document.getElementById("animalSpecies");
    animalCountInput = document.getElementById("animalCount");
    animalWeightKgInput = document.getElementById("animalWeightKg");
    lifeStageActivitySelect = document.getElementById("lifeStageActivity");
    calculationNotesSpan = document.getElementById("calculationNotes"); 
    notificationDot = document.getElementById("notificationDot"); 

    customAlertOverlay = document.getElementById('customAlertOverlay');
    customAlertContent = document.getElementById('customAlertContent');
    customAlertTitle = document.getElementById('customAlertTitle');
    customAlertMessage = document.getElementById('customAlertMessage');
    customAlertOkButton = document.getElementById('customAlertOkButton');
    newNotificationToast = document.getElementById('newNotificationToast');
    newNotificationToastMessage = document.getElementById('newNotificationToastMessage');

    timeZoneOffsetSelect = document.getElementById('timeZoneOffsetSelect');
    bottleSizeSelect = document.getElementById('bottleSizeSelect');
    customBottleHeightInput = document.getElementById('customBottleHeightInput');
    mainContentContainer = document.getElementById('mainContentContainer');

    wifiSsidInput = document.getElementById('wifiSsidInput');
    wifiPasswordInput = document.getElementById('wifiPasswordInput');


    // Add event listener for custom alert OK button
    if (customAlertOkButton) {
        customAlertOkButton.addEventListener('click', () => {
            customAlertOverlay.classList.remove('show');
            customAlertContent.classList.remove('success', 'error', 'warning', 'info'); 
        });
    }

    // Add event listener for new notification toast click
    if (newNotificationToast) {
        newNotificationToast.addEventListener('click', () => {
            closeNewNotificationToast();
            openNotificationModal(); 
        });
    }

    // 2. กำหนดสถานะเริ่มต้นของ UI (รวมถึงปุ่ม paste)
    // setDeviceStatus(false); // จะถูกจัดการโดย listener ของ Firebase device/status/online
    if (pasteBtn) {
        pasteBtn.disabled = true;
    }
    // setButtonState(makenoiseBtn, true); // จะถูกจัดการโดย checkSystemSettingsAndToggleUI

    // 3. แนบ Event Listeners ทั้งหมด
    if (feedNowBtn) feedNowBtn.addEventListener('click', feedNow);
    if (addMealBtn) addMealBtn.addEventListener('click', () => addMeal());
    if (saveMealsBtn) saveMealsBtn.addEventListener('click', saveMeals);
    if (pasteBtn) pasteBtn.addEventListener('click', pasteCopiedMeal);
    if (openNotificationBtn) openNotificationBtn.addEventListener('click', openNotificationModal);
    if (closeNotificationBtn) closeNotificationBtn.addEventListener('click', closeNotificationModal);
    if (checkFoodLevelBtn) checkFoodLevelBtn.addEventListener('click', checkFoodLevel);
    if (checkAnimalMovementBtn) checkAnimalMovementBtn.addEventListener('click', checkAnimalMovement);
    // Event Listener สำหรับ makenoiseAudioInput อยู่ในบล็อก DOMContentLoaded ด้านบนแล้ว
    if (makenoiseBtn) makenoiseBtn.addEventListener('click', playMakeNoise);

    if (timeZoneOffsetSelect) {
        timeZoneOffsetSelect.addEventListener('change', async () => {
            await saveSettingsToFirebase(); 
        });
    }

    if (bottleSizeSelect && customBottleHeightInput) {
        const toggleCustomHeightInput = (show) => {
            customBottleHeightInput.style.display = show ? 'block' : 'none';
        };

        bottleSizeSelect.addEventListener('change', async () => {
            const selectedValue = bottleSizeSelect.value;
            toggleCustomHeightInput(selectedValue === "custom");
            await saveSettingsToFirebase(); 
        });

        customBottleHeightInput.addEventListener('input', async () => {
            await saveSettingsToFirebase(); 
        });
    }

    if (wifiSsidInput && wifiPasswordInput) {
        wifiSsidInput.addEventListener('input', saveWifiSettingsToFirebase);
        wifiPasswordInput.addEventListener('input', saveWifiPasswordToFirebase); // ควรเป็น saveWifiSettingsToFirebase
    }
    
    // 4. Initial setup for animal calculator
    if (animalTypeSelect) {
        populateAnimalType(); 
        animalTypeSelect.addEventListener('change', () => updateAnimalSpecies()); 
        
        const calculatorInputs = [animalTypeSelect, animalSpeciesSelect, animalWeightKgInput, lifeStageActivitySelect];
        calculatorInputs.forEach(input => {
            if (input) {
                input.addEventListener('change', () => {
                    updateRecommendedAmount(); 
                });
            }
        });

        if (animalCountInput) {
            animalCountInput.addEventListener('input', () => { 
                updateRecommendedAmount(); 
            });
        }
        updateRecommendedAmount(); 
    }

    // 5. Initial toggle of UI based on current status (after all elements are initialized)
    // checkSystemSettingsAndToggleUI(); // จะถูกเรียกจาก listener ของ deviceId
});
