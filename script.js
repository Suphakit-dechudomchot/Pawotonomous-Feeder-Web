// script.js (ไฟล์หลัก V2)

// Import ฟังก์ชันและตัวแปรจาก animalCalculator.js
import { populateAnimalType, updateAnimalSpecies, updateRecommendedAmount } from './animalCalculator.js';

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
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const supabaseClient = supabase.createClient(
    'https://gnkgamizqlosvhkuwzhc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdua2dhbWl6cWxvc3Zoa3V3emhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MzY3MTUsImV4cCI6MjA2NjAxMjcxNX0.Dq5oPJ2zV8UUyoNakh4JKzDary8MIGZLDG5BppF_pgc'
);

// ===============================================
// ✅ Global Variables and State
// ===============================================
let currentDeviceId = null;
const CALIBRATION_TEST_SECONDS = 5;
const NOTIFICATION_HISTORY_LIMIT = 50;
const MEAL_BLOCK_DURATION_SECONDS = {
    movementCheck: 3 * 60, // 3 minutes
    cooldown: 30, // 30 seconds
};

// DOM Element References
const DOMElements = {};

let activeMealId = null;
let lastNotificationId = '';
let gramsPerSecond = null; // Store calibration value globally

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
    modalElement.style.display = 'flex';
}
function hideModal(modalElement) {
    modalElement.style.display = 'none';
}

function showNewNotificationToast(message) {
    DOMElements.newNotificationToastMessage.textContent = message;
    DOMElements.newNotificationToast.classList.add('show');
    setTimeout(() => DOMElements.newNotificationToast.classList.remove('show'), 5000);
}

// ===============================================
// ✅ Device & Session Management (Login/Logout)
// ===============================================
function setAndLoadDeviceId(id) {
    currentDeviceId = id;
    localStorage.setItem('pawtonomous_device_id', currentDeviceId);
    DOMElements.deviceSelectionSection.style.display = 'none';
    DOMElements.mainContentContainer.style.display = 'block';
    
    // Start listening and loading data
    listenToDeviceStatus();
    loadSettingsFromFirebase(); // This will also trigger the initial setup check
    loadMeals();
    setupNotificationListener();
}

function handleLogout() {
    localStorage.removeItem('pawtonomous_device_id');
    currentDeviceId = null;
    window.location.reload(); // Easiest way to reset the app state
}

// ===============================================
// ✅ Initial Setup Check
// ===============================================
async function checkInitialSetupComplete() {
    if (!currentDeviceId) return false;
    try {
        const settingsSnapshot = await db.ref(`device/${currentDeviceId}/settings`).once('value');
        const settings = settingsSnapshot.val() || {};
        const isSetupComplete = 
            settings.timeZoneOffset != null &&
            settings.bottleSize != null &&
            settings.calibration?.grams_per_second > 0;

        DOMElements.forceSetupOverlay.style.display = isSetupComplete ? 'none' : 'flex';
        DOMElements.settingsNavDot.style.display = isSetupComplete ? 'none' : 'block';
        
        // Disable other tabs if setup is not complete
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.dataset.target !== 'device-settings-section') {
                item.disabled = !isSetupComplete;
            }
        });

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
    DOMElements.deviceStatusCircle.className = `status-circle ${isOnline ? 'online' : 'offline'}`;
    DOMElements.deviceStatusText.className = `status-text ${isOnline ? 'online' : 'offline'}`;
    DOMElements.deviceStatusText.textContent = isOnline ? 'ออนไลน์' : 'ออฟไลน์';
    
    // Enable/disable real-time command buttons
    [DOMElements.feedNowBtn, DOMElements.checkFoodLevelBtn, DOMElements.checkAnimalMovementBtn, DOMElements.makenoiseBtn].forEach(btn => {
        if (btn) btn.disabled = !isOnline;
    });
    if (DOMElements.makenoiseBtn && !DOMElements.makenoiseAudioInput.files.length) {
        DOMElements.makenoiseBtn.disabled = true;
    }
}

function listenToDeviceStatus() {
    if (!currentDeviceId) return;
    const statusRef = db.ref(`device/${currentDeviceId}/status`);
    statusRef.on('value', (snapshot) => {
        const status = snapshot.val() || {};
        updateDeviceStatusUI(status.online);
        updateFoodLevelDisplay(status.foodLevel);
        DOMElements.lastMovementDisplay.textContent = status.lastMovementDetected 
            ? new Date(status.lastMovementDetected).toLocaleString('th-TH', { timeStyle: 'short' }) 
            : 'ไม่มีข้อมูล';
    });
}

async function updateFoodLevelDisplay(foodLevelCm) {
    try {
        const settingsSnapshot = await db.ref(`device/${currentDeviceId}/settings`).once('value');
        const settings = settingsSnapshot.val() || {};
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

// ===============================================
// ✅ Notifications Management
// ===============================================
let notificationListenerRef = null;
function setupNotificationListener() {
    if (notificationListenerRef) notificationListenerRef.off();
    if (!currentDeviceId) return;

    notificationListenerRef = db.ref(`device/${currentDeviceId}/notifications`).limitToLast(1);
    notificationListenerRef.on('child_added', (snapshot) => {
        if (snapshot.key !== lastNotificationId) {
            lastNotificationId = snapshot.key;
            showNewNotificationToast(snapshot.val().message);
        }
    });
}

async function fetchAndDisplayNotifications() {
    if (!currentDeviceId) return;
    DOMElements.notificationHistoryList.innerHTML = '<li>กำลังโหลด...</li>';
    try {
        const snapshot = await db.ref(`device/${currentDeviceId}/notifications`).orderByChild('timestamp').limitToLast(NOTIFICATION_HISTORY_LIMIT).once('value');
        DOMElements.notificationHistoryList.innerHTML = '';
        const notifications = [];
        snapshot.forEach(child => notifications.push(child.val()));
        
        if(notifications.length === 0) {
            DOMElements.notificationHistoryList.innerHTML = '<li>ไม่มีการแจ้งเตือน</li>';
            return;
        }

        notifications.sort((a, b) => b.timestamp - a.timestamp).forEach(n => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${n.message}</span><span class="notification-timestamp">${new Date(n.timestamp).toLocaleString('th-TH')}</span>`;
            DOMElements.notificationHistoryList.appendChild(li);
        });
        
        cleanupOldNotifications(); // Trigger cleanup after fetching
    } catch (error) {
        console.error("Error fetching notifications:", error);
        DOMElements.notificationHistoryList.innerHTML = '<li>เกิดข้อผิดพลาดในการโหลด</li>';
    }
}

async function cleanupOldNotifications() {
    if (!currentDeviceId) return;
    const ref = db.ref(`device/${currentDeviceId}/notifications`);
    try {
        const snapshot = await ref.orderByChild('timestamp').once('value');
        const notifications = [];
        snapshot.forEach(child => notifications.push({ key: child.key, ...child.val() }));

        if (notifications.length > NOTIFICATION_HISTORY_LIMIT) {
            const updates = {};
            const notificationsToDelete = notifications.slice(0, notifications.length - NOTIFICATION_HISTORY_LIMIT);
            notificationsToDelete.forEach(n => {
                updates[n.key] = null;
            });
            await ref.update(updates);
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
    if (!currentDeviceId) return;
    try {
        const snapshot = await db.ref(`device/${currentDeviceId}/settings`).once('value');
        const settings = snapshot.val() || {};

        // Set global gramsPerSecond
        gramsPerSecond = settings.calibration?.grams_per_second || null;

        // TimeZone
        DOMElements.timeZoneOffsetSelect.value = settings.timeZoneOffset ?? '7';

        // Bottle Size
        DOMElements.bottleSizeSelect.value = settings.bottleSize ?? '';
        DOMElements.customBottleHeightInput.style.display = settings.bottleSize === 'custom' ? 'block' : 'none';
        DOMElements.customBottleHeightInput.value = settings.customBottleHeight ?? '';

        // Wi-Fi
        DOMElements.wifiSsidInput.value = settings.wifiCredentials?.ssid ?? '';
        DOMElements.wifiPasswordInput.value = settings.wifiCredentials?.password ?? '';

        // Calibration Display
        DOMElements.currentGramsPerSecondDisplay.textContent = gramsPerSecond ? `${gramsPerSecond.toFixed(2)} กรัม/วินาที` : "- กรัม/วินาที";

        // After loading, check if setup is complete
        await checkInitialSetupComplete();

    } catch (error) {
        console.error("Error loading system settings:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถโหลดการตั้งค่าระบบได้`, "error");
    }
}

const saveSettingsToFirebase = debounce(async (settingType) => {
    if (!currentDeviceId) return;
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
        await db.ref(`device/${currentDeviceId}/settings`).update(settingsToSave);
        showCustomAlert("สำเร็จ", "บันทึกการตั้งค่าแล้ว", "success");
        await checkInitialSetupComplete(); // Re-check setup after saving
    } catch (error) {
        console.error(`Error saving system settings (${settingType}):`, error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถบันทึกการตั้งค่าได้`, "error");
    }
}, 1000);

// ===============================================
// ✅ Calibration
// ===============================================
function openCalibrationModal() {
    showModal(DOMElements.calibrationModal);
    DOMElements.calibrationStatus.textContent = "กด 'ปล่อยอาหารทดสอบ' เพื่อเริ่ม";
    DOMElements.calibratedWeightInput.value = '';
    DOMElements.saveCalibrationBtn.disabled = true;
    setButtonState(DOMElements.startCalibrationTestBtn, false);
    DOMElements.startCalibrationTestBtn.disabled = !DOMElements.deviceStatusCircle.classList.contains('online');
}

async function startCalibrationTest() {
    if (!currentDeviceId) return;
    setButtonState(DOMElements.startCalibrationTestBtn, true);
    DOMElements.calibrationStatus.textContent = "กำลังปล่อยอาหาร...";
    try {
        await db.ref(`device/${currentDeviceId}/commands/calibrate`).set({
            duration_seconds: CALIBRATION_TEST_SECONDS,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        await new Promise(resolve => setTimeout(resolve, CALIBRATION_TEST_SECONDS * 1000 + 1000));
        DOMElements.calibrationStatus.textContent = `ปล่อยอาหารเสร็จสิ้น. กรุณาชั่งน้ำหนักและกรอกข้อมูล.`;
        DOMElements.calibratedWeightInput.disabled = false;
        DOMElements.calibratedWeightInput.focus();
    } catch (error) {
        DOMElements.calibrationStatus.textContent = `ข้อผิดพลาด: ${error.message}`;
    } finally {
        setButtonState(DOMElements.startCalibrationTestBtn, false);
    }
}

async function saveCalibration() {
    const weight = parseFloat(DOMElements.calibratedWeightInput.value);
    if (isNaN(weight) || weight <= 0) {
        showCustomAlert("ข้อมูลผิดพลาด", "กรุณากรอกน้ำหนักที่ถูกต้อง", "error");
        return;
    }
    setButtonState(DOMElements.saveCalibrationBtn, true);
    try {
        const newGramsPerSecond = weight / CALIBRATION_TEST_SECONDS;
        await db.ref(`device/${currentDeviceId}/settings/calibration`).set({
            grams_per_second: newGramsPerSecond,
            last_calibrated: firebase.database.ServerValue.TIMESTAMP
        });
        gramsPerSecond = newGramsPerSecond; // Update global value
        DOMElements.currentGramsPerSecondDisplay.textContent = `${gramsPerSecond.toFixed(2)} กรัม/วินาที`;
        showCustomAlert("สำเร็จ", "บันทึกค่า Calibrate แล้ว", "success");
        hideModal(DOMElements.calibrationModal);
        await checkInitialSetupComplete();
    } catch (error) {
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถบันทึกค่าได้: ${error.message}`, "error");
    } finally {
        setButtonState(DOMElements.saveCalibrationBtn, false);
    }
}

// ===============================================
// ✅ Meal Schedule & Time Blocking
// ===============================================
function calculateMealBlockDuration(amount) {
    if (!gramsPerSecond || gramsPerSecond <= 0) return 0;
    const feedDuration = amount / gramsPerSecond;
    return Math.ceil(feedDuration + MEAL_BLOCK_DURATION_SECONDS.movementCheck + MEAL_BLOCK_DURATION_SECONDS.cooldown);
}

function isTimeConflict(newMeal, allMeals) {
    if (!allMeals) return false;
    
    const newMealTime = new Date(`1970-01-01T${newMeal.time}:00`);
    const newMealDuration = calculateMealBlockDuration(newMeal.amount);
    const newMealEnd = new Date(newMealTime.getTime() + newMealDuration * 1000);

    for (const id in allMeals) {
        if (id === activeMealId) continue;
        const existingMeal = allMeals[id];

        // Check for conflicts only if days overlap or one is a specific date matching the other's day
        const daysOverlap = newMeal.days && existingMeal.days && newMeal.days.some(day => existingMeal.days.includes(day));
        if (!daysOverlap && !newMeal.specificDate && !existingMeal.specificDate) continue;

        const existingMealTime = new Date(`1970-01-01T${existingMeal.time}:00`);
        const existingMealDuration = calculateMealBlockDuration(existingMeal.amount);
        const existingMealEnd = new Date(existingMealTime.getTime() + existingMealDuration * 1000);

        // Simple overlap check: (StartA <= EndB) and (EndA >= StartB)
        if (newMealTime <= existingMealEnd && newMealEnd >= existingMealTime) {
            return true; // Conflict found
        }
    }
    return false;
}

async function loadMeals() {
    if (!currentDeviceId) return;
    DOMElements.mealListContainer.innerHTML = '';
    try {
        const snapshot = await db.ref(`device/${currentDeviceId}/meals`).once('value');
        const mealsData = snapshot.val();
        const mealsArray = mealsData ? Object.entries(mealsData).map(([id, data]) => ({ id, ...data })) : [];
        mealsArray.sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));
        
        if (mealsArray.length > 0) {
            mealsArray.forEach(addMealCard);
        } else {
            DOMElements.mealListContainer.innerHTML = '<p class="notes" style="text-align: center;">ยังไม่มีมื้ออาหารที่ตั้งค่าไว้</p>';
        }
    } catch (error) {
        console.error("Error loading meals:", error);
    }
}

function addMealCard(mealData) {
    const { id, name, time, days = [], specificDate, enabled = true } = mealData;
    const card = document.createElement('div');
    card.className = 'meal-card';
    card.dataset.id = id;

    let daysDisplay = '';
    if (specificDate) {
        daysDisplay = `<div class="meal-card-specific-date">${new Date(specificDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</div>`;
    } else {
        const dayAbbreviations = {'Mon':'จ', 'Tue':'อ', 'Wed':'พ', 'Thu':'พฤ', 'Fri':'ศ', 'Sat':'ส', 'Sun':'อา'};
        const displayDaysStr = days.length === 7 ? 'ทุกวัน' : days.map(d => dayAbbreviations[d]).join(' ');
        daysDisplay = `<div class="meal-card-days">${displayDaysStr || 'ไม่ระบุวัน'}</div>`;
    }

    card.innerHTML = `
        <div class="meal-card-left">
            <div class="meal-card-name">${name || 'ไม่มีชื่อ'}</div>
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
    card.querySelector('.toggle-switch').addEventListener('change', e => {
        db.ref(`device/${currentDeviceId}/meals/${id}/enabled`).set(e.target.checked);
    });
    DOMElements.mealListContainer.appendChild(card);
}

async function openMealDetailModal(mealId = null, prefillData = null) {
    activeMealId = mealId;
    DOMElements.mealModalTitle.textContent = mealId ? 'แก้ไขมื้ออาหาร' : 'เพิ่มมื้ออาหารใหม่';
    DOMElements.deleteMealDetailBtn.style.display = mealId ? 'inline-flex' : 'none';

    // Reset form
    document.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('selected', 'disabled'));
    DOMElements.specificDateInput.value = '';
    DOMElements.specificDateDisplay.textContent = '';
    DOMElements.mealAudioInput.value = '';
    DOMElements.mealAudioStatus.textContent = 'ไม่มีไฟล์';
    DOMElements.mealAudioPreview.style.display = 'none';

    let mealData = prefillData || {};
    if (mealId && !prefillData) {
        const snapshot = await db.ref(`device/${currentDeviceId}/meals/${mealId}`).once('value');
        mealData = snapshot.val() || {};
    }

    // Populate form
    const [hours, minutes] = (mealData.time || '07:00').split(':');
    updateTimePicker(parseInt(hours), parseInt(minutes));
    
    DOMElements.mealNameInput.value = mealData.name || '';
    DOMElements.mealAmountInput.value = mealData.amount || 10;
    DOMElements.mealFanStrengthInput.value = mealData.fanStrength || 1;
    DOMElements.mealFanDirectionInput.value = mealData.fanDirection || 90;
    DOMElements.mealSwingModeCheckbox.checked = mealData.swingMode || false;

    if (mealData.specificDate) {
        DOMElements.specificDateInput.value = mealData.specificDate;
        DOMElements.specificDateDisplay.textContent = `วันที่ระบุ: ${new Date(mealData.specificDate).toLocaleDateString('th-TH')}`;
        document.querySelectorAll('.day-btn:not(.date-btn)').forEach(btn => btn.classList.add('disabled'));
        DOMElements.specificDateBtn.classList.add('selected');
    } else if (mealData.days) {
        mealData.days.forEach(day => document.querySelector(`.day-btn[data-day="${day}"]`)?.classList.add('selected'));
        DOMElements.specificDateBtn.classList.remove('selected');
    }
    
    if (mealData.audioUrl) {
        DOMElements.mealAudioStatus.textContent = mealData.originalNoiseFileName || 'ไฟล์ที่บันทึกไว้';
        DOMElements.mealAudioPreview.src = mealData.audioUrl;
        DOMElements.mealAudioPreview.style.display = 'block';
    }

    showModal(DOMElements.mealDetailModal);
}

async function saveMealDetail() {
    if (!gramsPerSecond) {
        showCustomAlert("ข้อผิดพลาด", "กรุณาทำการ Calibrate ปริมาณอาหารก่อนตั้งค่ามื้ออาหาร", "error");
        return;
    }

    const [hour, minute] = getTimeFromPicker();
    const mealData = {
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        name: DOMElements.mealNameInput.value.trim() || 'มื้ออาหาร',
        amount: parseInt(DOMElements.mealAmountInput.value) || 10,
        fanStrength: clamp(parseInt(DOMElements.mealFanStrengthInput.value), 1, 3),
        fanDirection: clamp(parseInt(DOMElements.mealFanDirectionInput.value), 60, 120),
        swingMode: DOMElements.mealSwingModeCheckbox.checked,
        days: DOMElements.specificDateInput.value ? [] : Array.from(document.querySelectorAll('.day-btn.selected:not(.date-btn)')).map(btn => btn.dataset.day),
        specificDate: DOMElements.specificDateInput.value || null,
        enabled: true
    };

    // Time blocking check
    const existingMealsSnapshot = await db.ref(`device/${currentDeviceId}/meals`).once('value');
    if (isTimeConflict(mealData, existingMealsSnapshot.val())) {
        showCustomAlert("เวลาทับซ้อน", "เวลาที่ตั้งค่าทับซ้อนกับมื้ออาหารอื่น กรุณาเลือกเวลาใหม่", "warning");
        return;
    }

    setButtonState(DOMElements.saveMealDetailBtn, true);
    
    // Audio upload
    const file = DOMElements.mealAudioInput.files[0];
    if (file) {
        const path = `meal_noises/${currentDeviceId}/${Date.now()}_${sanitizeFileName(file.name)}`;
        try {
            const { error } = await supabaseClient.storage.from("feeder-sounds").upload(path, file);
            if (error) throw error;
            const { data: publicData } = supabaseClient.storage.from("feeder-sounds").getPublicUrl(path);
            mealData.audioUrl = publicData.publicUrl;
            mealData.originalNoiseFileName = file.name;
        } catch (e) {
            showCustomAlert("อัปโหลดล้มเหลว", e.message, "error");
            setButtonState(DOMElements.saveMealDetailBtn, false);
            return;
        }
    } else if (activeMealId) {
        const oldDataSnapshot = await db.ref(`device/${currentDeviceId}/meals/${activeMealId}`).once('value');
        const oldData = oldDataSnapshot.val();
        mealData.audioUrl = oldData?.audioUrl || null;
        mealData.originalNoiseFileName = oldData?.originalNoiseFileName || null;
    }

    try {
        const ref = activeMealId ? db.ref(`device/${currentDeviceId}/meals/${activeMealId}`) : db.ref(`device/${currentDeviceId}/meals`).push();
        await ref.update(mealData);
        showCustomAlert("สำเร็จ", "บันทึกมื้ออาหารเรียบร้อย", "success");
        hideModal(DOMElements.mealDetailModal);
        loadMeals();
    } catch (error) {
        showCustomAlert("ผิดพลาด", `ไม่สามารถบันทึกได้: ${error.message}`, "error");
    } finally {
        setButtonState(DOMElements.saveMealDetailBtn, false);
    }
}

async function deleteMealDetail() {
    if (!activeMealId) return;
    setButtonState(DOMElements.deleteMealDetailBtn, true);
    try {
        await db.ref(`device/${currentDeviceId}/meals/${activeMealId}`).remove();
        showCustomAlert("สำเร็จ", "ลบมื้ออาหารแล้ว", "success");
        hideModal(DOMElements.mealDetailModal);
        loadMeals();
    } catch (error) {
        showCustomAlert("ผิดพลาด", `ไม่สามารถลบได้: ${error.message}`, "error");
    } finally {
        setButtonState(DOMElements.deleteMealDetailBtn, false);
    }
}

// ===============================================
// ✅ Dashboard Actions
// ===============================================
async function sendCommand(command, payload = {}) {
    if (!DOMElements.deviceStatusCircle.classList.contains('online')) {
        showCustomAlert("ออฟไลน์", "อุปกรณ์ไม่ได้เชื่อมต่อ ไม่สามารถส่งคำสั่งได้", "error");
        return false;
    }
    try {
        await db.ref(`device/${currentDeviceId}/commands/${command}`).set({
            ...payload,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        return true;
    } catch (error) {
        showCustomAlert("ผิดพลาด", `ไม่สามารถส่งคำสั่ง ${command} ได้: ${error.message}`, "error");
        return false;
    }
}

async function feedNow() {
    setButtonState(DOMElements.feedNowBtn, true);
    const snapshot = await db.ref(`device/${currentDeviceId}/meals`).orderByChild('enabled').equalTo(true).limitToFirst(1).once('value');
    const meals = snapshot.val();
    if (!meals) {
        showCustomAlert("ผิดพลาด", "ไม่พบมื้ออาหารที่เปิดใช้งาน", "error");
        setButtonState(DOMElements.feedNowBtn, false);
        return;
    }
    const mealToDispense = Object.values(meals)[0];
    await sendCommand('feedNow', mealToDispense);
    setButtonState(DOMElements.feedNowBtn, false);
}

async function playMakeNoise() {
    const file = DOMElements.makenoiseAudioInput.files[0];
    if (!file) {
        showCustomAlert("ผิดพลาด", "กรุณาเลือกไฟล์เสียงก่อน", "error");
        return;
    }
    setButtonState(DOMElements.makenoiseBtn, true);
    const path = `make_noise/${currentDeviceId}/${Date.now()}_${sanitizeFileName(file.name)}`;
    try {
        const { error } = await supabaseClient.storage.from("feeder-sounds").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data: publicData } = supabaseClient.storage.from('feeder-sounds').getPublicUrl(path);
        if (await sendCommand('makeNoise', { url: publicData.publicUrl })) {
            showCustomAlert("สำเร็จ", "ส่งคำสั่งเล่นเสียงแล้ว", "success");
        }
    } catch (e) {
        showCustomAlert("ผิดพลาด", `ไม่สามารถอัปโหลดหรือเล่นเสียงได้: ${e.message}`, "error");
    } finally {
        setButtonState(DOMElements.makenoiseBtn, false);
    }
}

// ===============================================
// ✅ Animal Calculator Integration
// ===============================================
function applyRecommendedAmount() {
    const recommendedAmountText = DOMElements.recommendedAmount.textContent;
    const match = recommendedAmountText.match(/(\d+\.?\d*)/);
    if (match) {
        const amount = Math.round(parseFloat(match[1]));
        openMealDetailModal(null, { amount }); // Open new meal modal with prefilled amount
        showSection('meal-schedule-section');
    } else {
        showCustomAlert("ผิดพลาด", "ไม่สามารถนำปริมาณที่แนะนำไปใช้ได้", "error");
    }
}

// ===============================================
// ✅ Custom UI Component Logic (Time Picker, Select)
// ===============================================
function setupCustomTimePicker() {
    const hoursCol = DOMElements.hoursColumn;
    const minutesCol = DOMElements.minutesColumn;

    for (let i = 0; i < 24; i++) {
        hoursCol.innerHTML += `<div>${String(i).padStart(2, '0')}</div>`;
    }
    for (let i = 0; i < 60; i++) {
        minutesCol.innerHTML += `<div>${String(i).padStart(2, '0')}</div>`;
    }

    let scrollTimeout;
    [hoursCol, minutesCol].forEach(col => {
        col.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const scrollTop = col.scrollTop;
                const itemHeight = 50;
                const selectedIndex = Math.round(scrollTop / itemHeight);
                col.scrollTo({ top: selectedIndex * itemHeight, behavior: 'smooth' });
            }, 150);
        });
    });
}

function updateTimePicker(hour, minute) {
    const itemHeight = 50;
    DOMElements.hoursColumn.scrollTo({ top: hour * itemHeight, behavior: 'instant' });
    DOMElements.minutesColumn.scrollTo({ top: minute * itemHeight, behavior: 'instant' });
}

function getTimeFromPicker() {
    const itemHeight = 50;
    const hour = Math.round(DOMElements.hoursColumn.scrollTop / itemHeight);
    const minute = Math.round(DOMElements.minutesColumn.scrollTop / itemHeight);
    return [hour, minute];
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
document.addEventListener('DOMContentLoaded', () => {
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
        'applyRecommendedAmountBtn', 'hoursColumn', 'minutesColumn'
    ];
    ids.forEach(id => DOMElements[id] = document.getElementById(id));

    // --- Initial Setup ---
    setupCustomTimePicker();
    setupCustomSelects();
    const savedDeviceId = localStorage.getItem('pawtonomous_device_id');
    if (savedDeviceId) {
        setAndLoadDeviceId(savedDeviceId);
    } else {
        DOMElements.deviceSelectionSection.style.display = 'block';
    }

    // --- Event Listeners ---
    DOMElements.setDeviceIdBtn.addEventListener('click', () => {
        const id = DOMElements.deviceIdInput.value.trim();
        if (id) setAndLoadDeviceId(id);
    });

    DOMElements.logoutBtn.addEventListener('click', handleLogout);

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.disabled) showSection(btn.dataset.target);
        });
    });
    
    DOMElements.goToSettingsBtn.addEventListener('click', () => showSection('device-settings-section'));

    // Modals
    DOMElements.closeCalibrationModalBtn.addEventListener('click', () => hideModal(DOMElements.calibrationModal));
    DOMElements.cancelMealDetailBtn.addEventListener('click', () => hideModal(DOMElements.mealDetailModal));

    // Settings
    [DOMElements.timeZoneOffsetSelect, DOMElements.bottleSizeSelect].forEach(el => el.addEventListener('change', (e) => saveSettingsToFirebase(e.target.id.includes('timeZone') ? 'timezone' : 'bottlesize')));
    [DOMElements.customBottleHeightInput, DOMElements.wifiSsidInput, DOMElements.wifiPasswordInput].forEach(el => el.addEventListener('input', (e) => saveSettingsToFirebase(e.target.id.includes('wifi') ? 'wifi' : 'bottlesize')));
    
    // Calibration
    DOMElements.openCalibrationModalBtn.addEventListener('click', openCalibrationModal);
    DOMElements.startCalibrationTestBtn.addEventListener('click', startCalibrationTest);
    DOMElements.saveCalibrationBtn.addEventListener('click', saveCalibration);
    DOMElements.calibratedWeightInput.addEventListener('input', () => {
        DOMElements.saveCalibrationBtn.disabled = isNaN(parseFloat(DOMElements.calibratedWeightInput.value)) || parseFloat(DOMElements.calibratedWeightInput.value) <= 0;
    });

    // Dashboard Actions
    DOMElements.feedNowBtn.addEventListener('click', feedNow);
    DOMElements.checkFoodLevelBtn.addEventListener('click', () => sendCommand('checkFoodLevel'));
    DOMElements.checkAnimalMovementBtn.addEventListener('click', () => sendCommand('checkMovement'));
    DOMElements.makenoiseAudioInput.addEventListener('change', e => {
        const file = e.target.files[0];
        DOMElements.makenoiseAudioStatus.textContent = file ? file.name : '';
        DOMElements.makenoiseBtn.disabled = !file || !DOMElements.deviceStatusCircle.classList.contains('online');
    });
    DOMElements.makenoiseBtn.addEventListener('click', playMakeNoise);

    // Meal Schedule
    DOMElements.addMealCardBtn.addEventListener('click', () => openMealDetailModal());
    DOMElements.saveMealDetailBtn.addEventListener('click', saveMealDetail);
    DOMElements.deleteMealDetailBtn.addEventListener('click', deleteMealDetail);
    
    // Meal Modal Logic
    document.querySelectorAll('.day-btn:not(.date-btn)').forEach(btn => btn.addEventListener('click', () => {
        btn.classList.toggle('selected');
        DOMElements.specificDateInput.value = ''; // Clear specific date if a day is clicked
        DOMElements.specificDateDisplay.textContent = '';
        document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('disabled'));
        DOMElements.specificDateBtn.classList.remove('selected');
    }));
    DOMElements.specificDateBtn.addEventListener('click', () => DOMElements.specificDateInput.click());
    DOMElements.specificDateInput.addEventListener('change', e => {
        if (e.target.value) {
            document.querySelectorAll('.day-btn:not(.date-btn)').forEach(btn => btn.classList.remove('selected'));
            document.querySelectorAll('.day-btn:not(.date-btn)').forEach(btn => btn.classList.add('disabled'));
            DOMElements.specificDateDisplay.textContent = `วันที่ระบุ: ${new Date(e.target.value).toLocaleDateString('th-TH')}`;
            DOMElements.specificDateBtn.classList.add('selected');
        }
    });
    DOMElements.mealAudioInput.addEventListener('change', e => {
        const file = e.target.files[0];
        DOMElements.mealAudioStatus.textContent = file ? file.name : 'ไม่มีไฟล์';
        DOMElements.mealAudioPreview.src = file ? URL.createObjectURL(file) : '';
        DOMElements.mealAudioPreview.style.display = file ? 'block' : 'none';
    });

    // Animal Calculator
    populateAnimalType(DOMElements);
    document.querySelectorAll('.custom-select-trigger').forEach(trigger => {
        trigger.addEventListener('change', () => {
            if (trigger.dataset.target === 'animalType') {
                updateAnimalSpecies(DOMElements);
            }
            updateRecommendedAmount(DOMElements);
        });
    });
    [DOMElements.animalCount, DOMElements.animalWeightKg].forEach(input => {
        input.addEventListener('input', () => updateRecommendedAmount(DOMElements));
    });
    DOMElements.applyRecommendedAmountBtn.addEventListener('click', applyRecommendedAmount);
});
