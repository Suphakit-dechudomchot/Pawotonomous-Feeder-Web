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
// ตรวจสอบให้แน่ใจว่า Firebase SDK ถูกโหลดใน HTML ก่อนไฟล์นี้ (firebase-app-compat.js, firebase-database-compat.js)
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
// ตรวจสอบให้แน่ใจว่า Supabase SDK ถูกโหลดใน HTML ก่อนไฟล์นี้ (supabase-js)
const supabaseClient = supabase.createClient(
    'https://gnkgamizqlosvhkuwzhc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdua2dhbWizcWxvc3Zoa3V3emhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MzY3MTUsImV4cCI6MjA2NjAxMjcxNX0.Dq5oPJ2zV8UUyoNakh4JKZLDG5BppF_pgc'
);

// ตัวแปรส่วนกลางสำหรับมื้ออาหารที่คัดลอกไว้
let copiedMeal = null;

// ฟังก์ชันช่วยเหลือสำหรับจำกัดค่าให้อยู่ในช่วงที่กำหนด
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// ✅ NEW: ฟังก์ชันสำหรับจำกัดค่า input และอัปเดต UI ทันที
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
        mealDiv.querySelector(".meal-label").textContent = `มื้อที่ ${index + 1}:`;
    });
}

// ===============================================
// ✅ การควบคุมสถานะปุ่มหลัก (เช่น กำลังทำงาน/พร้อมใช้งาน)
// ===============================================

// รับ reference ของปุ่มและ Element ต่างๆ (จะถูกกำหนดค่าเมื่อ DOM โหลดเสร็จ)
let feedNowBtn, checkFoodLevelBtn, checkAnimalMovementBtn, makenoiseBtn, pasteBtn; 
let mealList; // อ้างอิงถึง div#mealList
let addMealBtn, saveMealsBtn; // ปุ่มสำหรับจัดการมื้ออาหาร
let openNotificationBtn, closeNotificationBtn;
let deviceStatusCircle, deviceStatusText, notificationDot; // Notification elements

// ตัวแปรสำหรับ Custom Alert
let customAlertOverlay, customAlertContent, customAlertTitle, customAlertMessage, customAlertOkButton;
// ตัวแปรสำหรับ New Notification Toast
let newNotificationToast, newNotificationToastMessage;

// ตัวแปรสำหรับ System Settings (Time Zone, Bottle Size, Wi-Fi)
let timeZoneOffsetSelect, bottleSizeSelect, customBottleHeightInput, mainContentContainer;
let wifiSsidInput, wifiPasswordInput; // Wi-Fi Input fields

// ตัวแปรสำหรับ Animal Calculator
let animalTypeSelect, animalSpeciesSelect, animalCountInput, animalWeightKgInput, lifeStageActivitySelect, calculationNotesSpan;

// กำหนดสถานะปุ่ม
function setButtonState(button, isLoading) {
    if (!button) return; // เพิ่มการตรวจสอบ null

    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
        // เพิ่มสปินเนอร์ถ้ายังไม่มี
        if (!button.querySelector('.spinner')) {
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            button.prepend(spinner); // เพิ่มสปินเนอร์ไว้ข้างหน้าข้อความ
        }
        // ซ่อนข้อความปุ่มและไอคอนปกติ
        const buttonText = button.querySelector('.button-text');
        if (buttonText) buttonText.style.display = 'none';
        const buttonIcon = button.querySelector('.fa-solid');
        if (buttonIcon) buttonIcon.style.display = 'none';

    } else {
        button.disabled = false;
        button.classList.remove('loading');
        // ลบสปินเนอร์
        const spinner = button.querySelector('.spinner');
        if (spinner) spinner.remove();
        // แสดงข้อความปุ่มและไอคอนปกติ
        const buttonText = button.querySelector('.button-text');
        if (buttonText) buttonText.style.display = '';
        const buttonIcon = button.querySelector('.fa-solid');
        if (buttonIcon) buttonIcon.style.display = '';
    }
}

// ===============================================
// ✅ การจัดการ Custom Alert
// ===============================================
function showCustomAlert(title, message, type = "info") { // เพิ่ม type parameter
    if (!customAlertOverlay || !customAlertTitle || !customAlertMessage || !customAlertOkButton) {
        console.error("Custom alert elements not found. Falling back to native alert.");
        alert(`${title}: ${message}`);
        return;
    }

    customAlertTitle.textContent = title;
    customAlertMessage.textContent = message;
    
    // Clear previous type classes and add the new one
    customAlertContent.classList.remove('success', 'error', 'warning', 'info');
    customAlertContent.classList.add(type); 
    
    customAlertOverlay.classList.add('show');
    
    // ตั้งค่า focus ไปที่ปุ่ม OK ทันทีที่แสดง alert
    customAlertOkButton.focus();
    
    // คืนค่า Promise เพื่อให้สามารถรอจนกว่าผู้ใช้จะกด OK
    return new Promise(resolve => {
        const handler = () => {
            customAlertOverlay.classList.remove('show'); // ซ่อน overlay ด้วยการลบ class 'show'
            customAlertContent.classList.remove('success', 'error', 'warning', 'info'); // Clean up types
            customAlertOkButton.removeEventListener('click', handler);
            resolve();
        };
        customAlertOkButton.addEventListener('click', handler);
    });
}

// ===============================================
// ✅ การจัดการ Notification (แสดงผลและ Toast)
// ===============================================
let notificationCount = 0; // จำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
let lastNotificationId = ''; // ID ของการแจ้งเตือนล่าสุดที่แสดงใน toast

// ฟังก์ชันแสดง Toast Notification
function showNewNotificationToast(message) {
    if (!newNotificationToast || !newNotificationToastMessage) return;

    newNotificationToastMessage.textContent = message;
    newNotificationToast.classList.add('show');

    setTimeout(() => {
        newNotificationToast.classList.remove('show');
    }, 5000); // ซ่อน toast หลังจาก 5 วินาที
}

// ฟังก์ชันเพิ่มการแจ้งเตือนในรายการ (โมดอล)
function addNotificationToList(message, timestamp) {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;

    const listItem = document.createElement('li');
    listItem.classList.add('notification-item');
    listItem.innerHTML = `
        <span>${message}</span>
        <span class="notification-timestamp">${timestamp}</span>
    `;
    notificationList.prepend(listItem); // เพิ่มที่ด้านบนสุด
}

// อัปเดตจำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
function updateNotificationCountUI() {
    if (!notificationDot) return;
    if (notificationCount > 0) {
        notificationDot.textContent = notificationCount;
        notificationDot.style.display = 'block';
    } else {
        notificationDot.style.display = 'none';
    }
}

// Function to open the notification modal
function openNotificationModal() {
    const notificationModal = document.getElementById('notificationModal');
    if (notificationModal) {
        notificationModal.style.display = 'flex'; // Use flex to center
        notificationCount = 0; // Reset unread count when opened
        updateNotificationCountUI();
        // Scroll to top of notification list to see latest
        const notificationList = document.getElementById('notificationList');
        if (notificationList) notificationList.scrollTop = 0;
    }
}

// Function to close the notification modal
function closeNotificationModal() {
    const notificationModal = document.getElementById('notificationModal');
    if (notificationModal) {
        notificationModal.style.display = 'none';
    }
}

// Close toast function
function closeNewNotificationToast() {
    const toast = document.getElementById('newNotificationToast');
    if (toast) {
        toast.classList.remove('show');
    }
}


// ===============================================
// ✅ การจัดการอุปกรณ์ (ESP32) สถานะออนไลน์/ออฟไลน์
// ===============================================

// ตัวแปรสำหรับเก็บ Device ID ที่ได้รับจาก Firebase
let deviceId = null; 
// ✅ เพิ่ม DEFAULT_DEVICE_ID สำหรับการพัฒนาเว็บแอปโดยไม่พึ่ง ESP32
const DEFAULT_DEVICE_ID = "web_app_test_device"; 

// ฟังก์ชันสำหรับตั้งค่าสถานะอุปกรณ์บน UI
function setDeviceStatus(isOnline) {
    if (!deviceStatusCircle || !deviceStatusText) return; // ตรวจสอบว่า elements พร้อมใช้งาน

    if (isOnline) {
        deviceStatusCircle.classList.remove('offline');
        deviceStatusCircle.classList.add('online');
        deviceStatusText.classList.remove('offline');
        deviceStatusText.classList.add('online');
        deviceStatusText.textContent = 'ออนไลน์';
        // การเปิด/ปิด mainContentContainer จะถูกจัดการใน checkSystemSettingsAndToggleUI
        // และปุ่มต่างๆ จะเปิดใช้งานเมื่อ deviceId พร้อมใช้งาน
    } else {
        deviceStatusCircle.classList.remove('online');
        deviceStatusCircle.classList.add('offline');
        deviceStatusText.classList.remove('online');
        deviceStatusText.classList.add('offline');
        deviceStatusText.textContent = 'ออฟไลน์';
        if (mainContentContainer) mainContentContainer.style.display = 'none'; // ซ่อน main UI
        // ปิดใช้งานปุ่มทั้งหมดเมื่อออฟไลน์
        if (feedNowBtn) setButtonState(feedNowBtn, true); // ตั้งเป็น loading state เพื่อ disabled
        if (saveMealsBtn) setButtonState(saveMealsBtn, true);
        if (addMealBtn) addMealBtn.disabled = true;
        if (pasteBtn) pasteBtn.disabled = true; 
        if (checkFoodLevelBtn) setButtonState(checkFoodLevelBtn, true);
        if (checkAnimalMovementBtn) setButtonState(checkAnimalMovementBtn, true);
        if (makenoiseBtn) setButtonState(makenoiseBtn, true);
    }
}

// ฟังการเปลี่ยนแปลงสถานะออนไลน์ของอุปกรณ์จาก Firebase
db.ref('device/status/online').on('value', (snapshot) => {
    const isOnline = snapshot.val();
    console.log("Device online status:", isOnline);
    setDeviceStatus(isOnline);
});

// ฟังการเปลี่ยนแปลง Device ID (เช่น เมื่อ ESP32 รีสตาร์ทและส่ง ID มาใหม่)
// ✅ แก้ไข: เพิ่มการอ้างอิงถึง `device/status/deviceId` เพื่อให้มีการอัปเดต deviceId ที่ถูกต้อง
db.ref('device/status/deviceId').on('value', (snapshot) => {
    let currentDeviceId = snapshot.val();
    if (!currentDeviceId || currentDeviceId.length < 5) { // ถ้าไม่มีค่าหรือค่าไม่ถูกต้อง (กรณี ESP32 ยังไม่ทำงาน)
        currentDeviceId = DEFAULT_DEVICE_ID; // ✅ ใช้ DEFAULT_DEVICE_ID ชั่วคราว
        console.log("No valid Device ID from ESP32. Using default for web app development:", DEFAULT_DEVICE_ID);
    }

    if (currentDeviceId !== deviceId) {
        deviceId = currentDeviceId;
        console.log("Active Device ID set to:", deviceId);
        
        // โหลดข้อมูลที่เกี่ยวข้องกับ deviceId ใหม่
        loadSettingsFromFirebase(); 
        loadMeals(); 
        setupNotificationListener(deviceId); 
        fetchAndDisplayNotifications(); 

        // ✅ ถ้าใช้ DEFAULT_DEVICE_ID ให้ set online status เป็น true ชั่วคราว
        // เพื่อให้ mainContentContainer แสดงผลโดยไม่รอ ESP32 จริงๆ
        if (currentDeviceId === DEFAULT_DEVICE_ID) {
            setDeviceStatus(true);
            checkSystemSettingsAndToggleUI(); // ตรวจสอบการตั้งค่าระบบเพื่อเปิด UI
        }
    } else if (!currentDeviceId) { // กรณี deviceId เป็น null
        deviceId = null; 
        console.log("Device ID is null, device might be offline or not connected.");
        setDeviceStatus(false); // ซ่อน UI หลักและปิดใช้งานปุ่ม
    }
});


// ===============================================
// ✅ การจัดการ Notification Listener (Firebase)
// ===============================================

let notificationRef = null; // เก็บ reference ของ listener เพื่อยกเลิกได้
function setupNotificationListener(currentDeviceId) {
    // ถ้ามี listener เก่า ให้ยกเลิกก่อน
    if (notificationRef) {
        notificationRef.off('child_added'); // ยกเลิกการฟัง child_added
        console.log("Previous notification listener removed.");
    }

    if (currentDeviceId) {
        // อ้างอิงถึง node การแจ้งเตือนของอุปกรณ์นั้นๆ
        notificationRef = db.ref(`device/${currentDeviceId}/notifications`);
        console.log(`Setting up notification listener for device: device/${currentDeviceId}/notifications`);

        notificationRef.limitToLast(1).on('child_added', (snapshot) => {
            const notification = snapshot.val();
            const notificationId = snapshot.key; // ได้รับ key ของ node การแจ้งเตือน
            console.log("New notification received:", notification);

            // แปลง timestamp เป็นวันที่อ่านง่าย
            const date = new Date(notification.timestamp);
            // เพิ่ม options เพื่อให้แสดงโซนเวลาประเทศไทย (GMT+0700)
            const options = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: false, // ใช้ 24-hour format
                timeZoneName: 'shortOffset', // แสดง UTC+07:00
                timeZone: 'Asia/Bangkok' // ระบุโซนเวลาให้ชัดเจน
            };
            const formattedTime = date.toLocaleString('th-TH', options);

            // ตรวจสอบว่าเป็นการแจ้งเตือนซ้ำหรือไม่ (จากที่โหลดมาตอนแรก)
            // ถ้า ID ที่ได้มาใหม่ไม่ตรงกับ ID ล่าสุดที่โหลด (หรือเป็น ID ใหม่เอี่ยม)
            if (notificationId !== lastNotificationId) {
                // อัปเดต ID การแจ้งเตือนล่าสุด
                lastNotificationId = notificationId;
                showNewNotificationToast(notification.message); // แสดง toast
                addNotificationToList(notification.message, formattedTime); // เพิ่มในรายการโมดอล
                notificationCount++; // เพิ่มจำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
                updateNotificationCountUI(); // อัปเดต UI จุดแจ้งเตือน
            }
        });
    } else {
        console.warn("Cannot set up notification listener: Device ID is not available.");
    }
}

// ฟังก์ชันโหลดและแสดงการแจ้งเตือนเก่า
async function fetchAndDisplayNotifications() {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;
    notificationList.innerHTML = ''; // เคลียร์รายการเก่าออกก่อน
    notificationCount = 0; // รีเซ็ตจำนวนที่ยังไม่ได้อ่าน

    if (!deviceId) {
        console.log("No deviceId available to fetch notifications.");
        updateNotificationCountUI();
        return;
    }

    try {
        const snapshot = await db.ref(`device/${deviceId}/notifications`)
                                .orderByChild('timestamp') // เรียงตาม timestamp
                                .limitToLast(20) // โหลด 20 รายการล่าสุด
                                .once('value');
        
        const notifications = [];
        snapshot.forEach(childSnapshot => {
            notifications.push(childSnapshot.val());
            // ตั้งค่า lastNotificationId ให้เป็น ID ล่าสุดที่โหลดมา เพื่อไม่ให้ child_added listener ทำงานซ้ำซ้อน
            lastNotificationId = childSnapshot.key;
        });

        // แสดงการแจ้งเตือนจากเก่าไปใหม่ (ถ้าต้องการเรียงตามเวลาที่เข้ามา)
        // หรือแสดงจากใหม่ไปเก่า (ถ้าต้องการให้ล่าสุดอยู่ด้านบนในโมดอล)
        // เนื่องจากใช้ prepend ใน addNotificationToList เราจะวนจากเก่าไปใหม่
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
        updateNotificationCountUI(); // อัปเดต UI จุดแจ้งเตือน (ควรจะเป็น 0 ถ้าเราเปิดดูแล้ว)

    } catch (error) {
        console.error("Error fetching historical notifications:", error);
    }
}

// ===============================================
// ✅ การจัดการการตั้งค่าระบบ (โซนเวลา, ขนาดขวด, Wi-Fi)
// ===============================================

let wifiSettingsTimeout; // สำหรับ debounce

// ฟังก์ชันสำหรับ debounce
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// ฟังก์ชันสำหรับบันทึก Wi-Fi Settings
const saveWifiSettingsToFirebase = debounce(async () => {
    if (!deviceId) {
        console.warn("Cannot save Wi-Fi settings: Device ID is not available.");
        return;
    }

    const ssid = wifiSsidInput.value;
    const password = wifiPasswordInput.value;

    try {
        await db.ref(`device/${deviceId}/settings/wifiCredentials`).set({
            ssid: ssid,
            password: password,
            timestamp: firebase.database.ServerValue.TIMESTAMP // Optional: add timestamp
        });
        console.log("Wi-Fi settings saved successfully.");
        checkSystemSettingsAndToggleUI(); // ตรวจสอบสถานะการตั้งค่าและสลับ UI หลังจากบันทึก
        // showCustomAlert("สำเร็จ", "บันทึกข้อมูล Wi-Fi แล้ว", "success"); // อาจจะถี่ไป ไม่ต้องโชว์ alert ทุกครั้งที่พิมพ์
    } catch (error) {
        console.error("Error saving Wi-Fi settings:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถบันทึกข้อมูล Wi-Fi ได้: ${error.message}`, "error");
    }
}, 1000); // Debounce by 1 second

// โหลดการตั้งค่าระบบจาก Firebase
async function loadSettingsFromFirebase() {
    if (!deviceId) {
        console.log("No deviceId available to load system settings. Hiding main content.");
        if (mainContentContainer) mainContentContainer.style.display = 'none';
        return;
    }
    try {
        const snapshot = await db.ref(`device/${deviceId}/settings`).once('value');
        const settings = snapshot.val();
        
        if (settings) {
            // โหลด TimeZone
            if (settings.timeZoneOffset !== null && !isNaN(parseFloat(settings.timeZoneOffset))) {
                timeZoneOffsetSelect.value = settings.timeZoneOffset;
            } else {
                 // ถ้าไม่มีค่าใน Firebase ให้ตั้งค่าเริ่มต้นจาก Time Zone ของเบราว์เซอร์
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

            // โหลด Bottle Size
            if (settings.bottleSize !== null && settings.bottleSize !== "") {
                bottleSizeSelect.value = settings.bottleSize;
                if (settings.bottleSize === 'custom') {
                    customBottleHeightInput.style.display = 'block';
                    if (settings.customBottleHeight !== null && !isNaN(parseFloat(settings.customBottleHeight))) {
                         customBottleHeightInput.value = settings.customBottleHeight;
                    } else {
                        customBottleHeightInput.value = ''; // เคลียร์ค่าถ้าไม่มี
                    }
                } else {
                    customBottleHeightInput.style.display = 'none';
                    customBottleHeightInput.value = ''; // เคลียร์ค่าในช่องกรอกเอง
                }
            } else {
                bottleSizeSelect.value = ''; // เลือก option "-- เลือกขนาดขวด --"
                customBottleHeightInput.style.display = 'none';
                customBottleHeightInput.value = ''; // เคลียร์ค่าในช่องกรอกเอง
            }

            // ✅ โหลด Wi-Fi Credentials
            if (settings.wifiCredentials && settings.wifiCredentials.ssid) {
                if (wifiSsidInput) wifiSsidInput.value = settings.wifiCredentials.ssid;
                if (wifiPasswordInput) wifiPasswordInput.value = settings.wifiCredentials.password || ''; 
            } else {
                if (wifiSsidInput) wifiSsidInput.value = '';
                if (wifiPasswordInput) wifiPasswordInput.value = '';
            }

        } else {
            // ถ้ายังไม่มีการตั้งค่า ให้ตั้งค่าเริ่มต้น (เลือกค่าว่าง)
            timeZoneOffsetSelect.value = ''; 
            bottleSizeSelect.value = ''; 
            customBottleHeightInput.style.display = 'none';
            customBottleHeightInput.value = '';
            if (wifiSsidInput) wifiSsidInput.value = '';
            if (wifiPasswordInput) wifiPasswordInput.value = '';
            console.log("No existing system settings found. Using defaults.");
        }
        checkSystemSettingsAndToggleUI(); // ตรวจสอบสถานะการตั้งค่าและสลับ UI
    } catch (error) {
        console.error("Error loading system settings:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถโหลดการตั้งค่าระบบได้: ${error.message}`, "error");
        if (mainContentContainer) mainContentContainer.style.display = 'none'; // ซ่อน UI ในกรณีเกิดข้อผิดพลาด
    }
}

// บันทึกการตั้งค่าระบบไปที่ Firebase (ไม่รวม Wi-Fi เพราะมี debounce แยก)
async function saveSettingsToFirebase() {
    if (!deviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        return;
    }
    
    const timeZoneOffset = timeZoneOffsetSelect.value;
    const bottleSize = bottleSizeSelect.value;
    let customBottleHeight = null;

    let settingsToSave = {
        timeZoneOffset: (timeZoneOffset === "") ? null : parseFloat(timeZoneOffset),
        bottleSize: (bottleSize === "") ? null : bottleSize
    };

    if (bottleSize === 'custom') {
        customBottleHeight = parseFloat(customBottleHeightInput.value);
        if (!isNaN(customBottleHeight) && customBottleHeight > 0) {
            settingsToSave.customBottleHeight = customBottleHeight;
        } else {
            settingsToSave.customBottleHeight = null; // ลบค่าถ้าไม่ถูกต้อง
        }
    } else {
        settingsToSave.customBottleHeight = null; // ลบ custom height หากเปลี่ยนกลับไป preset
    }

    try {
        await db.ref(`device/${deviceId}/settings`).update(settingsToSave);
        console.log("System settings (TimeZone/BottleSize) saved successfully!");
        checkSystemSettingsAndToggleUI(); // ตรวจสอบสถานะการตั้งค่าและสลับ UI
    } catch (error) {
        console.error("Error saving system settings:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถบันทึกการตั้งค่าระบบได้: ${error.message}`, "error");
    }
}

// ✅ NEW: ฟังก์ชันตรวจสอบว่าการตั้งค่าระบบหลักครบถ้วนหรือไม่เพื่อเปิด/ปิด UI หลัก
function checkSystemSettingsAndToggleUI() {
    if (!mainContentContainer || !timeZoneOffsetSelect || !bottleSizeSelect || !wifiSsidInput || !wifiPasswordInput) {
        console.warn("System settings UI elements not fully initialized.");
        return;
    }

    // ต้องมี Time Zone ถูกเลือก
    const isTimeZoneSet = (timeZoneOffsetSelect.value !== "" && !isNaN(parseFloat(timeZoneOffsetSelect.value)));
    
    // ต้องมี Bottle Size ถูกเลือก
    let isBottleSizeSet = false;
    if (bottleSizeSelect.value === 'custom') {
        const customHeight = parseFloat(customBottleHeightInput.value);
        isBottleSizeSet = (!isNaN(customHeight) && customHeight > 0);
    } else {
        isBottleSizeSet = (bottleSizeSelect.value !== "");
    }

    // ต้องมี WiFi SSID ถูกกรอก
    const isWifiSet = (wifiSsidInput.value.trim().length > 0);

    // ✅ เปิดใช้งานปุ่มทั้งหมดเมื่ออุปกรณ์ออนไลน์ และการตั้งค่าระบบหลักครบถ้วน
    const isOnline = deviceStatusCircle.classList.contains('online'); // ตรวจสอบจากสถานะ UI
    
    if (isOnline && isTimeZoneSet && isBottleSizeSet && isWifiSet) {
        mainContentContainer.style.display = 'block';
        if (feedNowBtn) setButtonState(feedNowBtn, false);
        if (saveMealsBtn) setButtonState(saveMealsBtn, false);
        if (addMealBtn) addMealBtn.disabled = false;
        if (checkFoodLevelBtn) setButtonState(checkFoodLevelBtn, false);
        if (checkAnimalMovementBtn) setButtonState(checkAnimalMovementBtn, false);
        if (makenoiseBtn) setButtonState(makenoiseBtn, false);
        // หากมี copiedMeal อยู่แล้ว ก็ให้ pasteBtn เปิดใช้งาน
        if (copiedMeal && pasteBtn) {
            pasteBtn.disabled = false;
        }
    } else {
        mainContentContainer.style.display = 'none';
        if (feedNowBtn) setButtonState(feedNowBtn, true);
        if (saveMealsBtn) setButtonState(saveMealsBtn, true);
        if (addMealBtn) addMealBtn.disabled = true;
        if (pasteBtn) pasteBtn.disabled = true;
        if (checkFoodLevelBtn) setButtonState(checkFoodLevelBtn, true);
        if (checkAnimalMovementBtn) setButtonState(checkAnimalMovementBtn, true);
        if (makenoiseBtn) setButtonState(makenoiseBtn, true);
    }
}


// ===============================================
// ✅ การจัดการมื้ออาหาร (เพิ่ม, ลบ, แก้ไข, บันทึก, โหลด)
// ===============================================

// ฟังก์ชันสำหรับเพิ่มมื้ออาหารใหม่ (หรือโหลดจาก Firebase)
function addMeal(meal = {}) { // ใช้ parameter เป็น object เพื่อให้รองรับค่าเริ่มต้นและการโหลดข้อมูล
    const div = document.createElement("div");
    div.className = "meal";
    div.dataset.id = meal.id || Date.now(); // ใช้ id ที่มีอยู่หรือสร้างใหม่

    const time = meal.time || "";
    const amount = meal.amount || 1;
    const fanStrength = meal.fanStrength || 1; // ค่าเริ่มต้น 1-3
    const fanDirection = meal.fanDirection || 90; // ค่าเริ่มต้น 60-120
    const swingMode = meal.swingMode || false; // ค่าเริ่มต้น false
    const audioUrl = meal.audioUrl || "";
    const originalFileName = meal.originalNoiseFileName || "";

    // กำหนด initial status text สำหรับไฟล์เสียง
    let initialAudioStatusText = originalFileName ? `ไฟล์: ${originalFileName}` : 'ไม่มีไฟล์';
    if (audioUrl && !originalFileName) { // ถ้ามี URL แต่ไม่มีชื่อไฟล์เดิม ให้ดึงจาก URL (อาจจะเป็นชื่อที่ถูก sanitize)
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
    
    // ตั้งค่า dataset สำหรับ URL และชื่อไฟล์เดิม
    div.dataset.audioUrl = audioUrl;
    div.dataset.originalNoiseFileName = originalFileName;


    // รับ Element ของ input ต่างๆ ในมื้ออาหารนี้
    const amountInput = div.querySelector('.meal-amount');
    const fanStrengthInput = div.querySelector('.meal-fan-strength-input');
    const fanDirectionInput = div.querySelector('.meal-fan-direction-input');
    const swingModeCheckbox = div.querySelector('.swing-mode-checkbox');
    const audioInput = div.querySelector(".meal-audio");
    const audioStatusSpan = div.querySelector(".audio-status");
    const copyButton = div.querySelector(".copy-meal-btn");
    const deleteButton = div.querySelector(".delete-meal-btn");

    // ✅ NEW: เพิ่ม Event Listener สำหรับ Client-side Clamping (ค่าจะเด้งกลับมาใน UI ทันที)
    amountInput.addEventListener('input', () => clampInput(amountInput, 1, 100));
    fanStrengthInput.addEventListener('input', () => clampInput(fanStrengthInput, 1, 3));
    fanDirectionInput.addEventListener('input', () => clampInput(fanDirectionInput, 60, 120));

    // Listener สำหรับ Swing Mode Checkbox
    swingModeCheckbox.addEventListener('change', () => {
        fanDirectionInput.disabled = swingModeCheckbox.checked; // ปิด/เปิดใช้งานช่องทิศทางลม
    });

    // Listener สำหรับ input file
    audioInput.addEventListener("change", async () => {
        const file = audioInput.files[0];
        if (!file) {
            audioStatusSpan.textContent = "ไม่มีไฟล์"; // เปลี่ยนเป็น "ไม่มีไฟล์" เมื่อล้าง
            audioStatusSpan.style.color = "grey";
            div.dataset.audioUrl = "";
            div.dataset.originalNoiseFileName = "";
            return;
        }

        audioStatusSpan.textContent = "🔄 กำลังอัปโหลด...";
        audioStatusSpan.style.color = "orange";
        // สำหรับ Supabase เพื่อป้องกันชื่อซ้ำ/มีอักขระพิเศษ
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
            div.dataset.originalNoiseFileName = file.name; // เก็บชื่อไฟล์เดิมไว้ใน dataset

            audioStatusSpan.innerHTML = `✅ อัปโหลดแล้ว<br><small>(${file.name})</small>`; // แสดงชื่อไฟล์เดิม
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
        div.remove();
        updateMealNumbers();
    });

    copyButton.addEventListener("click", () => {
        copiedMeal = {
            id: Date.now(), // สร้าง ID ใหม่สำหรับการคัดลอก
            time: amountInput.value, // เวลา
            amount: parseInt(amountInput.value), // ปริมาณ
            fanStrength: parseInt(fanStrengthInput.value), // ความแรงลม
            fanDirection: parseInt(fanDirectionInput.value), // ทิศทางลม
            swingMode: swingModeCheckbox.checked, // โหมดสวิง
            audioUrl: div.dataset.audioUrl || "", // URL เสียง
            originalNoiseFileName: div.dataset.originalNoiseFileName || "" // ชื่อไฟล์เสียงเดิม
        };
        showCustomAlert("คัดลอก", "คัดลอกมื้อเรียบร้อยแล้ว!", "info");
        if (pasteBtn) {
            pasteBtn.disabled = false;
        }
    });

    mealList.appendChild(div);
    updateMealNumbers();
}

// ฟังก์ชันสำหรับวางมื้ออาหารที่คัดลอกมา
function pasteCopiedMeal() {
    if (copiedMeal) {
        // ใช้ spread operator เพื่อส่งค่าทั้งหมดจาก copiedMeal ไปยัง addMeal
        addMeal({
            id: Date.now(), // สร้าง ID ใหม่เมื่อวาง
            time: copiedMeal.time,
            amount: copiedMeal.amount,
            fanStrength: copiedMeal.fanStrength,
            fanDirection: copiedMeal.fanDirection,
            swingMode: copiedMeal.swingMode,
            audioUrl: copiedMeal.audioUrl,
            originalNoiseFileName: copiedMeal.originalNoiseFileName
        });
        copiedMeal = null; // ล้างข้อมูลที่คัดลอกหลังจากวาง
        if (pasteBtn) {
            pasteBtn.disabled = true;
        }
        showCustomAlert("วาง", "วางมื้ออาหารที่คัดลอกแล้ว!", "success");
    } else {
        showCustomAlert("คำเตือน", "ยังไม่มีมื้ออาหารที่คัดลอก!", "warning");
    }
}


// ฟังก์ชันสำหรับบันทึกมื้ออาหารทั้งหมดไปยัง Firebase
async function saveMeals() {
    if (!deviceId || deviceId === DEFAULT_DEVICE_ID) { // ✅ เพิ่มเงื่อนไขตรวจสอบ DEFAULT_DEVICE_ID
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์จริง (กำลังใช้โหมดทดสอบ). โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        setButtonState(saveMealsBtn, false); // คืนสถานะปุ่ม
        return;
    }
    if (!saveMealsBtn) return; // เพิ่มการตรวจสอบ null
    setButtonState(saveMealsBtn, true); // ตั้งค่าปุ่มเป็นสถานะโหลด

    const mealsToSave = [];
    let isValid = true;
    document.querySelectorAll(".meal").forEach(div => {
        const timeInput = div.querySelector(".meal-time");
        const amountInput = div.querySelector(".meal-amount");
        const fanStrengthInput = div.querySelector(".meal-fan-strength-input");
        const fanDirectionInput = div.querySelector(".meal-fan-direction-input");
        const swingModeCheckbox = div.querySelector(".swing-mode-checkbox");

        const time = timeInput.value;
        let amount = parseInt(amountInput.value);
        let fanStrength = parseInt(fanStrengthInput.value);
        let fanDirection = parseInt(fanDirectionInput.value);
        const swingMode = swingModeCheckbox.checked;
        const audioUrl = div.dataset.audioUrl || null; // ใช้ null แทน "" หากไม่มี
        const originalFileName = div.dataset.originalNoiseFileName || null; // ใช้ null แทน "" หากไม่มี

        // ✅ Clamp ค่าก่อนบันทึกไปยัง Firebase
        amount = clamp(amount, 1, 100);
        fanStrength = clamp(fanStrength, 1, 3);
        fanDirection = clamp(fanDirection, 60, 120);

        if (!time || isNaN(amount) || amount <= 0 || isNaN(fanStrength) || isNaN(fanDirection)) {
            isValid = false;
            showCustomAlert("ข้อผิดพลาด", "โปรดกรอกข้อมูลให้ครบถ้วนและถูกต้องสำหรับทุกมื้อ (เวลา, ปริมาณ).", "error");
            return;
        }

        mealsToSave.push({
            id: div.dataset.id, // เก็บ id ไว้เพื่อใช้เป็น key ใน Firebase
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
        setButtonState(saveMealsBtn, false); // คืนสถานะปุ่ม
    }
}

// โหลดมื้ออาหารจาก Firebase และแสดงผล
async function loadMeals() {
    if (!deviceId) {
        console.log("No deviceId available to load meals.");
        mealList.innerHTML = ""; // Clear existing meals
        addMeal({}); // Add an empty meal if no deviceId
        updateMealNumbers();
        return;
    }
    try {
        const snapshot = await db.ref(`device/${deviceId}/meals`).once("value");
        mealList.innerHTML = ""; // ล้างรายการเก่าก่อนโหลดใหม่
        const mealsData = snapshot.val();
        if (mealsData && Array.isArray(mealsData) && mealsData.length > 0) {
            mealsData.forEach(meal => {
                addMeal(meal); // ส่ง meal object เข้าไปตรงๆ
            });
        } else {
            addMeal({}); // เพิ่มมื้อแรกที่เป็นค่าว่าง
        }
        updateMealNumbers();
    } catch (error) {
        console.error("Error loading meals:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถโหลดมื้ออาหารได้: ${error.message}`, "error");
        mealList.innerHTML = ""; // Clear in case of error
        addMeal({}); // Add an empty meal on error
        updateMealNumbers();
    }
}


// ===============================================
// ✅ การสั่งให้อาหารทันที
// ===============================================

async function feedNow() {
    if (!deviceId || deviceId === DEFAULT_DEVICE_ID) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์จริง (กำลังใช้โหมดทดสอบ). โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        setButtonState(feedNowBtn, false);
        return;
    }
    if (!feedNowBtn) return; // เพิ่มการตรวจสอบ null
    setButtonState(feedNowBtn, true); // ตั้งค่าปุ่มเป็นสถานะโหลด
    try {
        // ดึงการตั้งค่ามื้ออาหารปัจจุบันจาก Firebase
        const snapshot = await db.ref(`device/${deviceId}/meals`).once('value');
        const mealsData = snapshot.val();

        if (!mealsData || Object.keys(mealsData).length === 0) {
            showCustomAlert("ข้อผิดพลาด", "ไม่มีการตั้งค่ามื้ออาหาร. โปรดเพิ่มมื้ออาหารก่อนที่จะให้อาหารทันที.", "error");
            setButtonState(feedNowBtn, false);
            return;
        }

        // เลือกมื้ออาหารแรกเป็นค่าเริ่มต้นสำหรับการให้อาหารทันที (หรือตาม logic ที่ต้องการ)
        // **อาจจะต้องเพิ่ม logic เลือกมื้อที่เหมาะสมกว่านี้ในอนาคต**
        const firstMealKey = Object.keys(mealsData)[0];
        const mealToDispense = mealsData[firstMealKey];

        if (!mealToDispense) {
            showCustomAlert("ข้อผิดพลาด", "ไม่พบข้อมูลมื้ออาหารที่จะให้อาหาร.", "error");
            setButtonState(feedNowBtn, false);
            return;
        }

        // ส่งคำสั่งให้อาหารทันทีไปยัง Firebase
        // ส่งเฉพาะค่าที่จำเป็นสำหรับการสั่งให้อาหาร
        await db.ref(`device/${deviceId}/commands/feedNow`).set({
            amount: mealToDispense.amount,
            fanStrength: mealToDispense.fanStrength, 
            fanDirection: mealToDispense.fanDirection, 
            swingMode: mealToDispense.swingMode || false, 
            noiseFile: mealToDispense.audioUrl || null, // ใช้ audioUrl
            originalNoiseFileName: mealToDispense.originalNoiseFileName || null, // ส่งชื่อไฟล์เดิมไปด้วย
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        showCustomAlert("กำลังให้อาหาร", "ส่งคำสั่งให้อาหารทันทีแล้ว. กรุณารอ...", "info");
    }
    catch (error) {
        console.error("Error sending feedNow command:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถส่งคำสั่งให้อาหารได้: ${error.message}`, "error");
    } finally {
        setButtonState(feedNowBtn, false); // คืนสถานะปุ่ม
    }
}

// ===============================================
// ✅ การเช็คปริมาณอาหาร
// ===============================================

// Define BOTTLE_SIZES_MAPPING if it's not defined in animalCalculator.js and is needed here
// For now, assume it's not strictly needed here for the purpose of the bug fix
// const BOTTLE_SIZES_MAPPING = {
//     "48": "18.9 ลิตร - สูง 48cm",
//     "45": "15 ลิตร - สูง 45cm",
//     "37": "12 ลิตร - สูง 37cm",
//     "24": "10 ลิตร / 600ml - สูง 24cm",
//     "32": "1.5 ลิตร - สูง 32cm",
//     "17": "350ml - สูง 17cm",
//     "custom": "กรอกความสูงเอง"
// };


async function checkFoodLevel() {
    if (!deviceId || deviceId === DEFAULT_DEVICE_ID) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์จริง (กำลังใช้โหมดทดสอบ). โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        setButtonState(checkFoodLevelBtn, false);
        return;
    }
    if (!checkFoodLevelBtn) return; // เพิ่มการตรวจสอบ null
    setButtonState(checkFoodLevelBtn, true); // ตั้งค่าปุ่มเป็นสถานะโหลด
    try {
        // ส่งคำสั่งไปยัง Firebase ให้ ESP32 ตรวจสอบระดับอาหาร
        await db.ref(`device/${deviceId}/commands/checkFoodLevel`).set(firebase.database.ServerValue.TIMESTAMP);

        // รอผลลัพธ์จาก Firebase (ตัวอย่าง: ESP32 จะอัปเดต 'device/{deviceId}/status/foodLevel')
        // ตั้งเวลา timeout เพื่อไม่ให้รอนานเกินไป
        const resultPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                db.ref(`device/${deviceId}/status/foodLevel`).off('value', listener); // ยกเลิก listener
                reject(new Error("การตรวจสอบระดับอาหารใช้เวลานานเกินไป."));
            }, 15000); // 15 วินาที

            const listener = db.ref(`device/${deviceId}/status/foodLevel`).on('value', (snapshot) => {
                const foodLevel = snapshot.val();
                if (foodLevel !== null) {
                    clearTimeout(timeout);
                    db.ref(`device/${deviceId}/status/foodLevel`).off('value', listener); // ยกเลิก listener หลังได้ค่า
                    resolve(foodLevel);
                }
            });
        });

        const foodLevelResult = await resultPromise;
        
        let bottleHeight = 0;
        // โหลดค่าความสูงขวดจาก Firebase ก่อนคำนวณ
        const bottleSnapshot = await db.ref(`device/${deviceId}/settings/bottleSize`).once('value');
        const customHeightSnapshot = await db.ref(`device/${deviceId}/settings/customBottleHeight`).once('value');
        
        const savedBottleSize = bottleSnapshot.val();
        const savedCustomHeight = customHeightSnapshot.val();

        if (savedBottleSize === 'custom' && savedCustomHeight !== null) {
            bottleHeight = parseFloat(savedCustomHeight);
        } else if (savedBottleSize && savedBottleSize !== "") {
            // ดึงค่าความสูงจาก option value โดยตรง (ซึ่งเก็บเป็นตัวเลข)
            bottleHeight = parseFloat(savedBottleSize);
        }

        // ตรวจสอบว่าได้ค่าความสูงของขวดหรือไม่
        if (isNaN(bottleHeight) || bottleHeight <= 0) {
            showCustomAlert("ข้อผิดพลาด", "โปรดตั้งค่าขนาดขวดใน 'การตั้งค่าระบบ' ก่อน.", "error");
            setButtonState(checkFoodLevelBtn, false); // คืนสถานะปุ่มก่อนออก
            return;
        }

        // สมมติว่า foodLevelResult คือระยะห่างจากเซนเซอร์ถึงอาหาร (cm)
        // ถ้าค่าน้อย แสดงว่าอาหารเยอะ, ถ้าค่ามาก แสดงว่าอาหารน้อย
        // คำนวณปริมาณที่เหลือเป็น %
        // ตัวอย่าง: ถ้าเซนเซอร์อยู่ด้านบน และวัดค่าได้ 5cm จากขวดสูง 30cm แสดงว่าเหลือ (30-5)/30 * 100
        const remainingHeight = bottleHeight - foodLevelResult;
        const percentage = clamp((remainingHeight / bottleHeight) * 100, 0, 100);

        let message = `ระดับอาหารที่วัดได้: ${foodLevelResult} cm.`;
        if (foodLevelResult < 0) {
             message = "ค่าระดับอาหารไม่ถูกต้อง. โปรดตรวจสอบการติดตั้งเซ็นเซอร์";
        } else if (foodLevelResult > bottleHeight + 5) { // +5cm เผื่อความคลาดเคลื่อน
            message = `น่าจะไม่มีอาหารในถัง หรือเซ็นเซอร์วัดค่าผิดปกติ (วัดได้ ${foodLevelResult} cm จากขวดสูง ${bottleHeight} cm)`;
        }
        else if (foodLevelResult > bottleHeight - (bottleHeight * 0.1)) { // ถ้าเหลือน้อยกว่า 10%
            message += `\nอาหารในถังเหลือน้อยมาก (ประมาณ ${Math.round(percentage)}%).`;
        } else {
            message += `\nประมาณ ${Math.round(percentage)}% ของถัง.`;
        }

        showCustomAlert("ปริมาณอาหาร", message, "info");

    } catch (error) {
        console.error("Error checking food level:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถตรวจสอบระดับอาหารได้: ${error.message}`, "error");
    } finally {
        setButtonState(checkFoodLevelBtn, false); // คืนสถานะปุ่ม
    }
}

// ===============================================
// ✅ การเช็คการเคลื่อนไหวสัตว์
// ===============================================

async function checkAnimalMovement() {
    if (!deviceId || deviceId === DEFAULT_DEVICE_ID) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์จริง (กำลังใช้โหมดทดสอบ). โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        setButtonState(checkAnimalMovementBtn, false);
        return;
    }
    if (!checkAnimalMovementBtn) return; // เพิ่มการตรวจสอบ null
    setButtonState(checkAnimalMovementBtn, true); // ตั้งค่าปุ่มเป็นสถานะโหลด
    try {
        // ส่งคำสั่งไปยัง Firebase ให้ ESP32 ตรวจสอบการเคลื่อนไหว
        await db.ref(`device/${deviceId}/commands/checkMovement`).set(firebase.database.ServerValue.TIMESTAMP);

        // รอผลลัพธ์จาก Firebase
        const resultPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                db.ref(`device/${deviceId}/status/lastMovementDetected`).off('value', listener);
                reject(new Error("การตรวจสอบการเคลื่อนไหวใช้เวลานานเกินไป."));
            }, 15000); // 15 วินาที

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
        setButtonState(checkAnimalMovementBtn, false); // คืนสถานะปุ่ม
    }
}

// ===============================================
// ✅ การเล่นเสียง Make Noise ทันที
// ===============================================
let selectedMakeNoiseFile = null; // เก็บไฟล์ที่เลือกสำหรับ Make Noise
let makenoiseUploadedAudioURL = ""; // URL ของเสียงที่อัปโหลดสำหรับ Make Noise

document.addEventListener('DOMContentLoaded', () => { // Ensure this part runs after DOM is ready
    const makenoiseAudioInput = document.getElementById('makenoiseAudioInput');
    const makenoiseAudioStatus = document.getElementById('makenoiseAudioStatus');
    // makenoiseBtn ถูกประกาศเป็น global แล้ว ไม่ต้องประกาศซ้ำ

    if (makenoiseAudioInput && makenoiseAudioStatus && makenoiseBtn) {
        makenoiseAudioInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                selectedMakeNoiseFile = e.target.files[0];
                makenoiseAudioStatus.textContent = `พร้อมอัปโหลด: ${selectedMakeNoiseFile.name}`;
                if (deviceId && deviceId !== DEFAULT_DEVICE_ID) { // เปิดใช้งานถ้ามี deviceId จริง
                    setButtonState(makenoiseBtn, false); // เปิดปุ่ม
                }
            } else {
                selectedMakeNoiseFile = null;
                makenoiseAudioStatus.textContent = '';
                setButtonState(makenoiseBtn, true); // ปิดปุ่ม
            }
        });
    }
});


async function playMakeNoise() {
    if (!deviceId || deviceId === DEFAULT_DEVICE_ID) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์จริง (กำลังใช้โหมดทดสอบ). โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
        setButtonState(makenoiseBtn, false);
        return;
    }
    if (!selectedMakeNoiseFile) {
        showCustomAlert("ข้อผิดพลาด", "โปรดเลือกไฟล์เสียงก่อน.", "error");
        return;
    }

    if (!makenoiseBtn) return; // Add null check
    setButtonState(makenoiseBtn, true); // ตั้งค่าปุ่มเป็นสถานะโหลด
    const originalFileName = selectedMakeNoiseFile.name;
    const sanitizedFileName = sanitizeFileName(originalFileName);

    try {
        // อัปโหลดไปยัง Supabase Storage (ใช้ path ชั่วคราวหรือเฉพาะสำหรับ make_noise)
        const path = `make_noise/${deviceId}/${sanitizedFileName}`; // ใช้ deviceId ใน path เพื่อแยกไฟล์
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

        // ส่งคำสั่งให้ ESP32 เล่นเสียง
        await db.ref(`device/${deviceId}/commands/makeNoise`).set({
            url: publicUrlData.publicUrl,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        showCustomAlert("สำเร็จ", `ส่งคำสั่งเล่นเสียง: ${originalFileName} แล้ว.`, "success");

    } catch (error) {
        console.error("Error playing make noise:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถเล่นเสียงได้: ${error.message}`, "error");
    } finally {
        setButtonState(makenoiseBtn, false); // คืนสถานะปุ่ม
        const makenoiseAudioInput = document.getElementById('makenoiseAudioInput');
        const makenoiseAudioStatus = document.getElementById('makenoiseAudioStatus');
        if (makenoiseAudioInput) makenoiseAudioInput.value = ''; // เคลียร์ไฟล์ที่เลือก
        if (makenoiseAudioStatus) makenoiseAudioStatus.textContent = '';
        selectedMakeNoiseFile = null;
        setButtonState(makenoiseBtn, true); // ปิดใช้งานปุ่มหลังทำงานเสร็จ
    }
}

// ===============================================
// ✅ Initial Load และ Event Listeners
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. รับ Reference ของ Element ต่างๆ
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

    // ✅ รับ Reference สำหรับ Custom Alert และ Toast Notification
    customAlertOverlay = document.getElementById('customAlertOverlay');
    customAlertContent = document.getElementById('customAlertContent');
    customAlertTitle = document.getElementById('customAlertTitle');
    customAlertMessage = document.getElementById('customAlertMessage');
    customAlertOkButton = document.getElementById('customAlertOkButton');
    newNotificationToast = document.getElementById('newNotificationToast');
    newNotificationToastMessage = document.getElementById('newNotificationToastMessage');

    // ✅ รับ Reference สำหรับ System Settings (Time Zone และ Bottle Size และ Wi-Fi)
    timeZoneOffsetSelect = document.getElementById('timeZoneOffsetSelect');
    bottleSizeSelect = document.getElementById('bottleSizeSelect');
    customBottleHeightInput = document.getElementById('customBottleHeightInput');
    mainContentContainer = document.getElementById('mainContentContainer');

    // ✅ รับ Reference สำหรับ Wi-Fi Input Fields
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
    setDeviceStatus(false); // เริ่มต้นเป็นออฟไลน์
    if (pasteBtn) {
        pasteBtn.disabled = true;
        // pasteBtn.innerHTML = '<i class="fa-solid fa-paste"></i> <span>วางมื้อ</span>'; // ไม่จำเป็นต้องเปลี่ยนข้อความ
    }
    setButtonState(makenoiseBtn, true); // ปิดใช้งานปุ่ม Make Noise ตั้งแต่เริ่มต้น


    // 3. แนบ Event Listeners ทั้งหมด
    if (feedNowBtn) feedNowBtn.addEventListener('click', feedNow);
    if (addMealBtn) addMealBtn.addEventListener('click', () => addMeal());
    if (saveMealsBtn) saveMealsBtn.addEventListener('click', saveMeals);
    if (pasteBtn) pasteBtn.addEventListener('click', pasteCopiedMeal);
    if (openNotificationBtn) openNotificationBtn.addEventListener('click', openNotificationModal);
    if (closeNotificationBtn) closeNotificationBtn.addEventListener('click', closeNotificationModal);
    if (checkFoodLevelBtn) checkFoodLevelBtn.addEventListener('click', checkFoodLevel);
    if (checkAnimalMovementBtn) checkAnimalMovementBtn.addEventListener('click', checkAnimalMovement);
    if (makenoiseBtn) makenoiseBtn.addEventListener('click', playMakeNoise);

    // ✅ Listener และ Logic สำหรับ System Settings (Time Zone Offset)
    if (timeZoneOffsetSelect) {
        timeZoneOffsetSelect.addEventListener('change', async () => {
            await saveSettingsToFirebase(); // บันทึกและตรวจสอบ UI หลังเปลี่ยน
        });
    }

    // ✅ Listener และ Logic สำหรับ System Settings (Bottle Size)
    if (bottleSizeSelect && customBottleHeightInput) {
        const toggleCustomHeightInput = (show) => {
            customBottleHeightInput.style.display = show ? 'block' : 'none';
        };

        bottleSizeSelect.addEventListener('change', async () => {
            const selectedValue = bottleSizeSelect.value;
            toggleCustomHeightInput(selectedValue === "custom");
            await saveSettingsToFirebase(); // บันทึกและตรวจสอบ UI หลังเปลี่ยน
        });

        customBottleHeightInput.addEventListener('input', async () => {
            await saveSettingsToFirebase(); // บันทึกและตรวจสอบ UI หลังพิมพ์
        });
    }

    // ✅ NEW: Listener และ Logic สำหรับ Wi-Fi Input Fields
    if (wifiSsidInput && wifiPasswordInput) {
        wifiSsidInput.addEventListener('input', saveWifiSettingsToFirebase);
        wifiPasswordInput.addEventListener('input', saveWifiSettingsToFirebase);
    }

    // 4. Initial load of settings and meals (handled by deviceId listener now)
    // Эти функции будут вызваны внутри слушателя deviceId
    // loadSettingsFromFirebase(); 
    // loadMeals();
    // setupNotificationListener(deviceId); 
    // fetchAndDisplayNotifications();

    // 5. ✅ เรียก populateAnimalType ครั้งแรกเมื่อ DOM โหลดเสร็จ เพื่อให้ Calculator เริ่มทำงาน
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
});
