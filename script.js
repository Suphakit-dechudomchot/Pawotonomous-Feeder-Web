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
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdua2dhbWl6cWxvc3Zoa3V3emhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MzY3MTUsImV4cCI6MjA2NjAxMjcxNX0.Dq5oPJ2zV8UUyoNakh4JKZLDG5BppF_pgc'
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
    const customAlertOverlay = document.getElementById('customAlertOverlay');
    const customAlertTitle = document.getElementById('customAlertTitle');
    const customAlertMessage = document.getElementById('customAlertMessage');
    const customAlertOkButton = document.getElementById('customAlertOkButton');

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
    const toast = document.getElementById('newNotificationToast');
    const toastMessage = document.getElementById('newNotificationToastMessage');
    
    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
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

// ===============================================
// ✅ การจัดการอุปกรณ์ (ESP32) สถานะออนไลน์/ออฟไลน์
// ===============================================

// ตัวแปรสำหรับเก็บ Device ID ที่ได้รับจาก Firebase
let deviceId = null; 
// ✅ เพิ่ม DEFAULT_DEVICE_ID สำหรับการพัฒนาเว็บแอปโดยไม่พึ่ง ESP32
const DEFAULT_DEVICE_ID = "web_app_test_device"; 

// ฟังก์ชันสำหรับตั้งค่าสถานะอุปกรณ์บน UI
function setDeviceStatus(isOnline) {
    const mainContentContainer = document.getElementById('mainContentContainer');
    if (!mainContentContainer || !deviceStatusCircle || !deviceStatusText) return;

    if (isOnline) {
        deviceStatusCircle.classList.remove('offline');
        deviceStatusCircle.classList.add('online');
        deviceStatusText.classList.remove('offline');
        deviceStatusText.classList.add('online');
        deviceStatusText.textContent = 'ออนไลน์';
        // เปิดใช้งานปุ่มเมื่ออุปกรณ์ออนไลน์
        // mainContentContainer.style.display จะถูกจัดการโดย loadSettingsFromFirebase()
        if (feedNowBtn) feedNowBtn.disabled = false;
        if (saveMealsBtn) saveMealsBtn.disabled = false;
        if (addMealBtn) addMealBtn.disabled = false;
        if (checkFoodLevelBtn) checkFoodLevelBtn.disabled = false;
        if (checkAnimalMovementBtn) checkAnimalMovementBtn.disabled = false;
        if (makenoiseBtn) makenoiseBtn.disabled = false;
        // หากมี copiedMeal อยู่แล้ว ก็ให้ pasteBtn เปิดใช้งาน
        if (copiedMeal && pasteBtn) {
            pasteBtn.disabled = false;
        }

    } else {
        deviceStatusCircle.classList.remove('online');
        deviceStatusCircle.classList.add('offline');
        deviceStatusText.classList.remove('online');
        deviceStatusText.classList.add('offline');
        deviceStatusText.textContent = 'ออฟไลน์';
        // ปิดใช้งานปุ่มเมื่ออุปกรณ์ออฟไลน์
        mainContentContainer.style.display = 'none'; // ซ่อน main UI
        if (feedNowBtn) feedNowBtn.disabled = true;
        if (saveMealsBtn) saveMealsBtn.disabled = true;
        if (addMealBtn) addMealBtn.disabled = true;
        if (pasteBtn) pasteBtn.disabled = true; // pasteBtn ก็ต้องปิดด้วย
        if (checkFoodLevelBtn) checkFoodLevelBtn.disabled = true;
        if (checkAnimalMovementBtn) checkAnimalMovementBtn.disabled = true;
        if (makenoiseBtn) makenoiseBtn.disabled = true;
    }
}

// ฟังการเปลี่ยนแปลงสถานะออนไลน์ของอุปกรณ์จาก Firebase
db.ref('device/status/online').on('value', (snapshot) => {
    const isOnline = snapshot.val();
    console.log("Device online status:", isOnline);
    // ✅ เรียก setDeviceStatus() เพื่ออัปเดต UI Status Circle/Text
    setDeviceStatus(isOnline);
});

// ฟังการเปลี่ยนแปลง Device ID (เช่น เมื่อ ESP32 รีสตาร์ทและส่ง ID มาใหม่)
db.ref('device/status/deviceId').on('value', (snapshot) => {
    let currentDeviceId = snapshot.val();
    if (!currentDeviceId || currentDeviceId.length < 5) { // ถ้าไม่มีค่าหรือค่าไม่ถูกต้อง (กรณี ESP32 ยังไม่ทำงาน)
        currentDeviceId = DEFAULT_DEVICE_ID; // ✅ ใช้ DEFAULT_DEVICE_ID ชั่วคราว
        console.log("No valid Device ID from ESP32. Using default for web app development:", DEFAULT_DEVICE_ID);
        // หากคุณต้องการให้แสดง UI หลักทันทีที่โหลดหน้าเว็บ แม้ไม่มี ESP32
        // สามารถเรียก loadSettingsFromFirebase() และ loadMeals() ที่นี่ได้เลย
        // โดยไม่สนใจ device online status
    }

    if (currentDeviceId !== deviceId) {
        deviceId = currentDeviceId;
        console.log("Active Device ID set to:", deviceId);
        // สิ่งเหล่านี้จะถูกเรียกเมื่อ deviceId ถูกกำหนด (ไม่ว่าจะเป็นจาก ESP32 หรือ default)
        loadSettingsFromFirebase(); 
        loadMeals(); 
        setupNotificationListener(deviceId); 
        fetchAndDisplayNotifications(); 

        // ✅ ถ้าใช้ DEFAULT_DEVICE_ID ให้ set online status เป็น true ชั่วคราว
        // เพื่อให้ mainContentContainer แสดงผล
        if (currentDeviceId === DEFAULT_DEVICE_ID) {
            setDeviceStatus(true);
        }
    } else if (!currentDeviceId) {
        deviceId = null; 
        console.log("Device ID is null, device might be offline or not connected.");
        setDeviceStatus(false); // ซ่อน UI หลัก
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

// ตัวแปรสำหรับ input Wi-Fi
let wifiSsidInput, wifiPasswordInput;
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
        // showCustomAlert("สำเร็จ", "บันทึกข้อมูล Wi-Fi แล้ว", "success"); // อาจจะถี่ไป ไม่ต้องโชว์ alert ทุกครั้งที่พิมพ์
    } catch (error) {
        console.error("Error saving Wi-Fi settings:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถบันทึกข้อมูล Wi-Fi ได้: ${error.message}`, "error");
    }
}, 1000); // Debounce by 1 second

// โหลดการตั้งค่าระบบจาก Firebase
async function loadSettingsFromFirebase() {
    const timeZoneOffsetSelect = document.getElementById('timeZoneOffsetSelect');
    const bottleSizeSelect = document.getElementById('bottleSizeSelect');
    const customBottleHeightInput = document.getElementById('customBottleHeightInput');
    const mainContentContainer = document.getElementById('mainContentContainer');

    // รับ Element Wi-Fi
    wifiSsidInput = document.getElementById('wifiSsidInput');
    wifiPasswordInput = document.getElementById('wifiPasswordInput');

    if (!deviceId) {
        console.log("No deviceId available to load system settings. Hiding main content.");
        if (mainContentContainer) mainContentContainer.style.display = 'none';
        return;
    }
    try {
        const snapshot = await db.ref(`device/${deviceId}/settings`).once('value');
        const settings = snapshot.val();
        let timeZoneSet = false;
        let bottleHeightSet = false; // จะตรวจสอบผ่าน bottleSizeSelect
        let wifiSet = false;

        if (settings) {
            // โหลด TimeZone
            if (settings.timeZoneOffset !== null && !isNaN(parseFloat(settings.timeZoneOffset))) {
                timeZoneOffsetSelect.value = settings.timeZoneOffset;
                timeZoneSet = true;
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
                    // ไม่ต้องบันทึกลง Firebase ที่นี่ เพราะ saveSettingsToFirebase จะทำเองเมื่อมีการเปลี่ยนแปลง
                }
            }


            // โหลด Bottle Size
            if (settings.bottleSize !== null && settings.bottleSize !== "") {
                bottleSizeSelect.value = settings.bottleSize;
                if (settings.bottleSize === 'custom') {
                    customBottleHeightInput.style.display = 'block';
                    if (settings.customBottleHeight !== null && !isNaN(parseFloat(settings.customBottleHeight))) {
                         customBottleHeightInput.value = settings.customBottleHeight;
                         bottleHeightSet = true; // ตั้งค่าเป็น true เมื่อ custom height มีค่า
                    } else {
                        customBottleHeightInput.value = ''; // เคลียร์ค่าถ้าไม่มี
                    }
                } else {
                    customBottleHeightInput.style.display = 'none';
                    bottleHeightSet = true; // ตั้งค่าเป็น true เมื่อเลือกแบบ predefined
                }
            } else {
                bottleSizeSelect.value = ''; // เลือก option "-- เลือกขนาดขวด --"
                customBottleHeightInput.style.display = 'none';
            }

            // ✅ NEW: โหลด Wi-Fi Credentials
            if (settings.wifiCredentials && settings.wifiCredentials.ssid) {
                if (wifiSsidInput) wifiSsidInput.value = settings.wifiCredentials.ssid;
                if (wifiPasswordInput) wifiPasswordInput.value = settings.wifiCredentials.password || ''; // Password might be optional or empty
                wifiSet = true;
            } else {
                if (wifiSsidInput) wifiSsidInput.value = '';
                if (wifiPasswordInput) wifiPasswordInput.value = '';
                wifiSet = false;
            }

        } else {
            // ถ้ายังไม่มีการตั้งค่า ให้ตั้งค่าเริ่มต้น
            timeZoneOffsetSelect.value = ''; // เริ่มต้นเป็น "-- เลือกโซนเวลา --"
            bottleSizeSelect.value = ''; // เริ่มต้นเป็น "-- เลือกขนาดขวด --"
            customBottleHeightInput.style.display = 'none';
            if (wifiSsidInput) wifiSsidInput.value = '';
            if (wifiPasswordInput) wifiPasswordInput.value = '';
            console.log("No existing system settings found. Using defaults.");
        }

        // ตรวจสอบและแสดง/ซ่อน mainContentContainer
        if (timeZoneSet && bottleHeightSet && wifiSet) { // ✅ ตรวจสอบ wifiSet ด้วย
            mainContentContainer.style.display = 'block';
        } else {
            mainContentContainer.style.display = 'none';
        }

    } catch (error) {
        console.error("Error loading system settings:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถโหลดการตั้งค่าระบบได้: ${error.message}`, "error");
        if (mainContentContainer) mainContentContainer.style.display = 'none'; // ซ่อน UI ในกรณีเกิดข้อผิดพลาด
    }
}

// บันทึกการตั้งค่าระบบไปที่ Firebase (ไม่รวม Wi-Fi เพราะมี debounce แยก)
async function saveSettingsToFirebase() {
    const timeZoneOffsetSelect = document.getElementById('timeZoneOffsetSelect');
    const bottleSizeSelect = document.getElementById('bottleSizeSelect');
    const customBottleHeightInput = document.getElementById('customBottleHeightInput');
    const mainContentContainer = document.getElementById('mainContentContainer');

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

    let timeZoneSet = (timeZoneOffset !== "" && !isNaN(parseFloat(timeZoneOffset)));
    let bottleHeightSet = false; // จะตรวจสอบผ่าน bottleSizeSelect
    let wifiSet = (wifiSsidInput && wifiSsidInput.value.length > 0); // ตรวจสอบว่ามี SSID กรอกหรือไม่

    if (bottleSize === 'custom') {
        customBottleHeight = parseFloat(customBottleHeightInput.value);
        if (!isNaN(customBottleHeight) && customBottleHeight > 0) {
            settingsToSave.customBottleHeight = customBottleHeight;
            bottleHeightSet = true;
        } else {
            settingsToSave.customBottleHeight = null; // ลบค่าถ้าไม่ถูกต้อง
            bottleHeightSet = false;
        }
    } else if (bottleSize !== "") {
        // หากเลือก preset
        settingsToSave.customBottleHeight = null; // ลบ custom height หากเปลี่ยนกลับไป preset
        bottleHeightSet = true;
    } else {
        // หากเลือก "-- เลือกขนาดขวด --"
        settingsToSave.customBottleHeight = null;
        bottleHeightSet = false;
    }

    try {
        // อัปเดตเฉพาะ TimeZone และ BottleSize
        await db.ref(`device/${deviceId}/settings`).update(settingsToSave);
        console.log("System settings (TimeZone/BottleSize) saved successfully!");
        // ไม่ต้องแสดง alert บ่อยๆ ทุกครั้งที่พิมพ์ หรือเปลี่ยน
    } catch (error) {
        console.error("Error saving system settings:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถบันทึกการตั้งค่าระบบได้: ${error.message}`, "error");
    } finally {
        // หลังจากบันทึกเสร็จ ตรวจสอบสถานะอีกครั้งเพื่ออัปเดต UI
        if (timeZoneSet && bottleHeightSet && wifiSet) { // ✅ ตรวจสอบ wifiSet ด้วย
            mainContentContainer.style.display = 'block';
        } else {
            mainContentContainer.style.display = 'none';
        }
    }
}


// ===============================================
// ✅ การจัดการมื้ออาหาร (เพิ่ม, ลบ, แก้ไข, บันทึก)
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
    const initialUploadBtnDisabled = audioUrl ? '' : 'disabled'; // ปุ่มอัปโหลดจะถูกปิดถ้าไม่มีไฟล์เสียงที่โหลดมาแต่แรก

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
            // pasteBtn.innerHTML = '<i class="fa-solid fa-paste"></i> <span>วางมื้อ (คัดลอกแล้ว)</span>'; // ไม่ต้องเปลี่ยนข้อความ
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
            // pasteBtn.innerHTML = '<i class="fa-solid fa-paste"></i> <span>วางมื้อ</span>'; // ไม่ต้องเปลี่ยนข้อความ
        }
        showCustomAlert("วาง", "วางมื้ออาหารที่คัดลอกแล้ว!", "success");
    } else {
        showCustomAlert("คำเตือน", "ยังไม่มีมื้ออาหารที่คัดลอก!", "warning");
    }
}


// ฟังก์ชันสำหรับบันทึกมื้ออาหารทั้งหมดไปยัง Firebase
async function saveMeals() {
    if (!deviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
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

// ===============================================
// ✅ การสั่งให้อาหารทันที
// ===============================================

async function feedNow() {
    if (!deviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
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

async function checkFoodLevel() {
    if (!deviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
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
        const bottleSizeSelect = document.getElementById('bottleSizeSelect');
        const customBottleHeightInput = document.getElementById('customBottleHeightInput');
        
        let bottleHeight = 0;
        // โหลดค่าความสูงขวดจาก Firebase ก่อนคำนวณ
        const bottleSnapshot = await db.ref(`device/${deviceId}/settings/bottleSize`).once('value');
        const customHeightSnapshot = await db.ref(`device/${deviceId}/settings/customBottleHeight`).once('value');
        
        const savedBottleSize = bottleSnapshot.val();
        const savedCustomHeight = customHeightSnapshot.val();

        if (savedBottleSize === 'custom' && savedCustomHeight !== null) {
            bottleHeight = parseFloat(savedCustomHeight);
        } else if (savedBottleSize && savedBottleSize !== "") {
            // ดึงค่าความสูงจาก BOTTLE_SIZES_MAPPING
            const matchingOption = Object.keys(BOTTLE_SIZES_MAPPING).find(key => key === savedBottleSize);
            if (matchingOption && matchingOption !== "custom") {
                bottleHeight = parseFloat(matchingOption); // ใช้ค่า key ที่เป็นตัวเลข
            }
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
        setButtonState(checkFoodLevelBtn, false); // คืนสถานะปุ่ม
    }
}

// ===============================================
// ✅ การเช็คการเคลื่อนไหวสัตว์
// ===============================================

async function checkAnimalMovement() {
    if (!deviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
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

document.addEventListener('DOMContentLoaded', () => { // Ensure this part runs after DOM is ready
    const makenoiseAudioInput = document.getElementById('makenoiseAudioInput');
    const makenoiseAudioStatus = document.getElementById('makenoiseAudioStatus');
    const makenoiseBtn = document.getElementById('makenoiseBtn'); // Make sure this is retrieved

    if (makenoiseAudioInput && makenoiseAudioStatus && makenoiseBtn) {
        makenoiseAudioInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                selectedMakeNoiseFile = e.target.files[0];
                makenoiseAudioStatus.textContent = `พร้อมอัปโหลด: ${selectedMakeNoiseFile.name}`;
                makenoiseBtn.disabled = false;
            } else {
                selectedMakeNoiseFile = null;
                makenoiseAudioStatus.textContent = '';
                makenoiseBtn.disabled = true;
            }
        });
    }
});


async function playMakeNoise() {
    if (!deviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.", "error");
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
        if (makenoiseBtn) makenoiseBtn.disabled = true;
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
    // เพิ่มการรับ Reference สำหรับ Element Calculator ใหม่
    animalWeightKgInput = document.getElementById("animalWeightKg");
    lifeStageActivitySelect = document.getElementById("lifeStageActivity");
    calculationNotesSpan = document.getElementById("calculationNotes"); // รับ reference ของ Notes
    notificationDot = document.getElementById("notificationDot"); // ✅ รับ reference ของจุดแจ้งเตือน

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
            customAlertContent.classList.remove('success', 'error', 'warning', 'info'); // Clean up types
        });
    }

    // Add event listener for new notification toast click
    if (newNotificationToast) {
        newNotificationToast.addEventListener('click', () => {
            closeNewNotificationToast();
            openNotificationModal(); // Open main notification modal when toast is clicked
        });
    }

    // Initialize Firebase reference for user settings
    // Note: This DEFAULT_USER_ID is a placeholder. For a multi-user app, you'd integrate Firebase Auth.
    // For device settings like WiFi, it's generally better to store them under `device/{deviceId}/settings`.
    // The current implementation is already using `device/${deviceId}/settings` for TimeZone/BottleSize,
    // so WiFi will follow that pattern for consistency.
    // The `last_notification_read_timestamp` is user-specific, so it's fine under `user_settings`.
    // For now, let's keep `lastNotificationReadTimestampRef` as is for user-specific notification tracking.
    let lastNotificationReadTimestampRef = db.ref(`user_settings/${DEFAULT_USER_ID}/last_notification_read_timestamp`);


    // 2. กำหนดสถานะเริ่มต้นของ UI (รวมถึงปุ่ม paste)
    updateDeviceStatusUI(false); // เริ่มต้นเป็นออฟไลน์
    if (pasteBtn) {
        pasteBtn.disabled = true;
        pasteBtn.innerHTML = '<i class="fa-solid fa-paste"></i> <span>วางมื้อ</span>';
    }

    // 3. ใช้งานฟังก์ชัน updateButtonState สำหรับปุ่มหลักที่เชื่อมกับ Firebase
    updateButtonState(feedNowBtn, `device/${deviceId}/commands/feedNow`, 'ให้อาหารทันที', 'กำลังให้อาหาร...', 'fa-solid fa-bowl-food', 'fa-solid fa-spinner fa-spin');
    updateButtonState(checkFoodLevelBtn, `device/${deviceId}/commands/checkFoodLevel`, 'เช็คปริมาณอาหาร', 'กำลังเช็ค...', 'fa-solid fa-scale-balanced', 'fa-solid fa-spinner fa-spin');
    updateButtonState(checkAnimalMovementBtn, `device/${deviceId}/commands/checkMovement`, 'เช็คการเคลื่อนไหว', 'กำลังเช็ค...', 'fa-solid fa-paw', 'fa-solid fa-spinner fa-spin');
    updateButtonState(makenoiseBtn, `device/${deviceId}/commands/makeNoise`, 'เล่นเสียงนี้ทันที', 'กำลังเล่นเสียง...', 'fa-solid fa-volume-high', 'fa-solid fa-spinner fa-spin');

    // 4. แนบ Event Listeners ทั้งหมด
    if (feedNowBtn) feedNowBtn.addEventListener('click', feedNow);
    if (addMealBtn) addMealBtn.addEventListener('click', () => addMeal());
    if (saveMealsBtn) saveMealsBtn.addEventListener('click', saveMeals);
    if (pasteBtn) pasteBtn.addEventListener('click', pasteCopiedMeal);
    if (openNotificationBtn) openNotificationBtn.addEventListener('click', openNotificationModal);
    if (closeNotificationBtn) closeNotificationBtn.addEventListener('click', closeNotificationModal);
    if (checkFoodLevelBtn) checkFoodLevelBtn.addEventListener('click', checkFoodLevel);
    if (checkAnimalMovementBtn) checkAnimalMovementBtn.addEventListener('click', checkAnimalMovement);
    if (makenoiseBtn) makenoiseBtn.addEventListener('click', playMakeNoise);

    // Event Listener สำหรับอัปโหลดเสียงเฉพาะ makenoise
    if (makenoiseAudioInput && makenoiseAudioStatusSpan) {
        makenoiseAudioInput.addEventListener("change", async () => {
            const file = makenoiseAudioInput.files[0];
            if (!file) {
                makenoiseUploadedAudioURL = "";
                makenoiseAudioStatusSpan.textContent = "ไม่มีไฟล์ที่เลือก";
                makenoiseAudioStatusSpan.style.color = "grey";
                if (makenoiseBtn) makenoiseBtn.disabled = true; // disable makenoise button if no file
                return;
            }

            makenoiseAudioStatusSpan.textContent = "🔄 กำลังอัปโหลด...";
            makenoiseAudioStatusSpan.style.color = "orange";
            if (makenoiseBtn) makenoiseBtn.disabled = true; // disable while uploading

            const fileName = `${Date.now()}_${sanitizeFileName(file.name)}`;

            try {
                const { data, error } = await supabaseClient.storage.from("feeder-sounds").upload(`make_noise/${deviceId}/${fileName}`, file); // Store under deviceId

                if (error) {
                    showCustomAlert("อัปโหลดไม่สำเร็จ: " + error.message, "error", "❌ ผิดพลาด!");
                    makenoiseAudioStatusSpan.textContent = "❌ อัปโหลดไม่สำเร็จ: " + error.message;
                    makenoiseAudioStatusSpan.style.color = "red";
                    makenoiseUploadedAudioURL = ""; // ตั้งค่าเป็นค่าว่างหากอัปโหลดไม่สำเร็จ
                    console.error("Supabase Upload Error:", error);
                    return;
                }

                const { data: publicData } = supabaseClient.storage.from("feeder-sounds").getPublicUrl(`make_noise/${deviceId}/${fileName}`);
                makenoiseUploadedAudioURL = publicData.publicUrl; // เก็บ URL ที่ได้มา

                const uploadedFileName = file.name;
                makenoiseAudioStatusSpan.innerHTML = `✅ อัปโหลดแล้ว<br><small>(${uploadedFileName})</small>`;
                makenoiseAudioStatusSpan.style.color = "green";
                showCustomAlert(`อัปโหลดไฟล์เสียง "${file.name}" สำเร็จ!`, "success", "✅ สำเร็จ!");
                if (makenoiseBtn) makenoiseBtn.disabled = false; // enable after successful upload
            } catch (e) {
                showCustomAlert("เกิดข้อผิดพลาด: " + e.message, "error", "❌ ผิดพลาด!");
                makenoiseAudioStatusSpan.textContent = "❌ เกิดข้อผิดพลาด: " + e.message;
                makenoiseAudioStatusSpan.style.color = "red";
                makenoiseUploadedAudioURL = ""; // ตั้งค่าเป็นค่าว่างหากเกิดข้อผิดพลาด
                console.error("General Upload Error:", e);
            }
        });
    }

    // ✅ Listener และ Logic สำหรับ System Settings (Time Zone Offset)
    if (timeZoneOffsetSelect) {
        // โหลดค่าเริ่มต้นและฟังการเปลี่ยนแปลง
        // db.ref(`user_settings/${DEFAULT_USER_ID}/time_zone_offset_hours`).on('value', snapshot => { // Path เดิม
        db.ref(`device/${deviceId}/settings/timeZoneOffset`).on('value', snapshot => { // Path ใหม่
            const offset = snapshot.val();
            if (offset !== null) { // Check for null as 0 is a valid offset
                timeZoneOffsetSelect.value = offset;
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
                    // db.ref(`user_settings/${DEFAULT_USER_ID}/time_zone_offset_hours`).set(parseFloat(closestOffsetOption.value)); // Path เดิม
                    db.ref(`device/${deviceId}/settings/timeZoneOffset`).set(parseFloat(closestOffsetOption.value)); // Path ใหม่
                    showCustomAlert(`ตั้งค่าโซนเวลาเริ่มต้นเป็น UTC${parseFloat(closestOffsetOption.value) >= 0 ? '+' : ''}${closestOffsetOption.value} (อิงตามเบราว์เซอร์)`, "info", "⚙️ ตั้งค่า");
                }
            }
            checkSystemSettingsAndToggleUI(); // ตรวจสอบสถานะการตั้งค่าและสลับ UI
        });
        // บันทึกเมื่อมีการเปลี่ยนแปลง
        timeZoneOffsetSelect.addEventListener('change', () => {
            const selectedOffset = parseFloat(timeZoneOffsetSelect.value);
            if (!isNaN(selectedOffset)) {
                // db.ref(`user_settings/${DEFAULT_USER_ID}/time_zone_offset_hours`).set(selectedOffset) // Path เดิม
                db.ref(`device/${deviceId}/settings/timeZoneOffset`).set(selectedOffset) // Path ใหม่
                    .then(() => showCustomAlert(`ตั้งค่าโซนเวลาเป็น UTC${selectedOffset >= 0 ? '+' : ''}${selectedOffset}`, "success", "⚙️ ตั้งค่าสำเร็จ"))
                    .catch(error => {
                        showCustomAlert("เกิดข้อผิดพลาดในการบันทึกโซนเวลา: " + error.message, "error", "❌ ผิดพลาด!");
                        console.error("Firebase save timezone error:", error);
                    });
            } else {
                // db.ref(`user_settings/${DEFAULT_USER_ID}/time_zone_offset_hours`).remove(); // Path เดิม
                db.ref(`device/${deviceId}/settings/timeZoneOffset`).remove(); // Path ใหม่
                showCustomAlert("ล้างการตั้งค่าโซนเวลา", "info", "⚙️ ตั้งค่า");
            }
        });
    }

    // ✅ Listener และ Logic สำหรับ System Settings (Bottle Size)
    if (bottleSizeSelect && customBottleHeightInput) {
        // ฟังก์ชันสำหรับแสดง/ซ่อนช่องกรอกเอง
        const toggleCustomHeightInput = (show) => {
            customBottleHeightInput.style.display = show ? 'block' : 'none';
        };

        // โหลดค่าเริ่มต้นและฟังการเปลี่ยนแปลง
        // db.ref(`user_settings/${DEFAULT_USER_ID}/feeder_settings/bottle_height_cm`).on('value', snapshot => { // Path เดิม
        db.ref(`device/${deviceId}/settings/bottleSize`).on('value', snapshot => { // Path ใหม่ (bottleSize)
            const savedBottleSizeValue = snapshot.val(); // ค่าที่บันทึกใน Firebase (เช่น "48", "custom")
            // db.ref(`user_settings/${DEFAULT_USER_ID}/feeder_settings/custom_bottle_height_cm`).on('value', customHeightSnapshot => { // Path เดิม
            db.ref(`device/${deviceId}/settings/customBottleHeight`).on('value', customHeightSnapshot => { // Path ใหม่ (customBottleHeight)
                const savedCustomHeight = customHeightSnapshot.val(); // ค่าความสูงเอง
                
                if (savedBottleSizeValue) { // ถ้ามีค่า bottleSize
                    bottleSizeSelect.value = savedBottleSizeValue; // ตั้งค่า dropdown

                    if (savedBottleSizeValue === 'custom') {
                        toggleCustomHeightInput(true); // แสดงช่องกรอกเอง
                        customBottleHeightInput.value = savedCustomHeight !== null ? savedCustomHeight : ''; // ใส่ค่าที่บันทึกไว้
                    } else {
                        toggleCustomHeightInput(false); // ซ่อนช่องกรอกเอง
                        customBottleHeightInput.value = ''; // ล้างค่าในช่องกรอกเอง
                    }
                } else {
                    // ถ้าไม่มีค่าใน Firebase เลย
                    bottleSizeSelect.value = ""; // ตั้งค่าเริ่มต้นของ dropdown
                    toggleCustomHeightInput(false);
                    customBottleHeightInput.value = ''; // ล้างค่าในช่องกรอกเอง
                }
                checkSystemSettingsAndToggleUI(); // ตรวจสอบสถานะการตั้งค่าและสลับ UI
            });
        });

        // Event Listener สำหรับการเปลี่ยนแปลงใน Dropdown ขนาดขวด
        bottleSizeSelect.addEventListener('change', () => {
            const selectedValue = bottleSizeSelect.value;
            if (selectedValue === "custom") {
                toggleCustomHeightInput(true); // แสดงช่องกรอกเอง
                customBottleHeightInput.value = ''; // ล้างค่าในช่องกรอกเอง
                customBottleHeightInput.focus(); // ให้ผู้ใช้กรอกได้ทันที
                
                // db.ref(`user_settings/${DEFAULT_USER_ID}/feeder_settings/bottle_height_cm`).remove(); // Path เดิม
                db.ref(`device/${deviceId}/settings/bottleSize`).set("custom"); // บันทึกว่าเลือก custom
                db.ref(`device/${deviceId}/settings/customBottleHeight`).remove(); // ลบค่าความสูงเดิม (ถ้ามี)
                showCustomAlert("กรุณากรอกความสูงขวด", "info", "⚙️ ตั้งค่า");

            } else if (selectedValue === "") { // ถ้าเลือก "-- เลือกขนาดขวด --"
                toggleCustomHeightInput(false); // ซ่อนช่องกรอกเอง
                customBottleHeightInput.value = ''; // ล้างค่า
                // db.ref(`user_settings/${DEFAULT_USER_ID}/feeder_settings/bottle_height_cm`).remove(); // Path เดิม
                db.ref(`device/${deviceId}/settings/bottleSize`).remove(); // ลบค่า
                db.ref(`device/${deviceId}/settings/customBottleHeight`).remove(); // ลบ custom height ด้วย
                showCustomAlert("ล้างการตั้งค่าขนาดขวด", "info", "⚙️ ตั้งค่า");
            }
            else {
                // ถ้าเลือกขนาดที่กำหนดไว้ล่วงหน้า
                toggleCustomHeightInput(false); // ซ่อนช่องกรอกเอง
                customBottleHeightInput.value = ''; // ล้างค่าในช่องกรอกเอง
                const selectedHeightCm = parseFloat(selectedValue); // ค่า height คือ value ของ option ตรงๆ

                if (!isNaN(selectedHeightCm) && selectedHeightCm > 0) {
                    // db.ref(`user_settings/${DEFAULT_USER_ID}/feeder_settings/bottle_height_cm`).set(selectedHeightCm) // Path เดิม
                    db.ref(`device/${deviceId}/settings/bottleSize`).set(selectedValue); // บันทึก value ของ dropdown option
                    db.ref(`device/${deviceId}/settings/customBottleHeight`).remove(); // ลบ custom height ถ้าเปลี่ยนมาใช้ preset
                    showCustomAlert(`ตั้งค่าขนาดขวดเป็น ${BOTTLE_SIZES_MAPPING[selectedValue]}`, "success", "⚙️ ตั้งค่าสำเร็จ");
                }
            }
        });

        // Event Listener สำหรับช่องกรอกความสูงเอง
        customBottleHeightInput.addEventListener('input', () => {
            const customHeight = parseFloat(customBottleHeightInput.value);
            if (!isNaN(customHeight) && customHeight > 0) {
                // db.ref(`user_settings/${DEFAULT_USER_ID}/feeder_settings/bottle_height_cm`).set(customHeight) // Path เดิม
                db.ref(`device/${deviceId}/settings/customBottleHeight`).set(customHeight); // บันทึก custom height
                db.ref(`device/${deviceId}/settings/bottleSize`).set("custom"); // ตรวจสอบให้แน่ใจว่า bottleSize ถูกตั้งเป็น "custom"
                // ไม่ต้อง showCustomAlert บ่อยๆ เมื่อพิมพ์
            } else if (customBottleHeightInput.value === '') {
                 // ถ้าลบค่าออก ให้ลบจาก Firebase ด้วย
                // db.ref(`user_settings/${DEFAULT_USER_ID}/feeder_settings/bottle_height_cm`).remove(); // Path เดิม
                db.ref(`device/${deviceId}/settings/customBottleHeight`).remove();
            }
        });
    }

    // ✅ NEW: Listener และ Logic สำหรับ Wi-Fi Input Fields
    if (wifiSsidInput && wifiPasswordInput) {
        wifiSsidInput.addEventListener('input', saveWifiSettingsToFirebase);
        wifiPasswordInput.addEventListener('input', saveWifiSettingsToFirebase);

        // Load Wi-Fi settings on page load (part of loadSettingsFromFirebase now)
        // No explicit separate listener needed here as it's included in loadSettingsFromFirebase
    }

    // 5. โหลดมื้ออาหารจาก Firebase และแสดงผล
    db.ref(`device/${deviceId}/meals`).on("value", (snapshot) => { // เปลี่ยน Path ให้ใช้ deviceId
        mealList.innerHTML = ""; // ล้างรายการเก่าก่อนโหลดใหม่
        const mealsData = snapshot.val();
        if (mealsData && Array.isArray(mealsData) && mealsData.length > 0) {
            mealsData.forEach(meal => {
                addMeal(meal); // ส่ง meal object เข้าไปตรงๆ
            });
        } else {
            // ✅ แก้ไข: ถ้าไม่มีข้อมูลมื้ออาหาร ให้แสดงมื้อที่ 1 เป็นค่าว่าง
            addMeal({}); // เพิ่มมื้อแรกที่เป็นค่าว่าง
        }
        updateMealNumbers();
    });

    // 6. ดึงสถานะอุปกรณ์แบบ Realtime
    // db.ref('feeder/isOnline').on('value', (snapshot) => { // Path เดิม
    db.ref(`device/${deviceId}/status/online`).on('value', (snapshot) => { // Path ใหม่
        const isOnline = snapshot.val();
        // db.ref('feeder/batteryVoltage').once('value', (batterySnapshot) => { // Path เดิม
        db.ref(`device/${deviceId}/status/batteryVoltage`).once('value', (batterySnapshot) => { // Path ใหม่
            const batteryVoltage = batterySnapshot.val();
            updateDeviceStatusUI(isOnline, batteryVoltage);
        });
    });

    // 7. ตั้งค่า Firebase listener สำหรับ Notification Badge & Toast
    // db.ref("notifications").on("value", (snapshot) => { // Path เดิม
    db.ref(`device/${deviceId}/notifications`).on("value", (snapshot) => { // Path ใหม่
        updateNotificationBadgeAndToast();
    });

    // เรียก updateNotificationBadgeAndToast ครั้งแรกเมื่อโหลดหน้าเว็บ
    updateNotificationBadgeAndToast();

    // ✅ เรียก populateAnimalType ครั้งแรกเมื่อ DOM โหลดเสร็จ เพื่อให้ Calculator เริ่มทำงาน
    if (animalTypeSelect) {
        populateAnimalType(); // ไม่ต้องส่ง animalTypeSelect, animalData เพราะเป็น global แล้ว
        animalTypeSelect.addEventListener('change', () => updateAnimalSpecies()); // ไม่ต้องส่ง parameters
        
        // แนบ Event Listener สำหรับการเปลี่ยนแปลงค่าใน Calculator เพื่ออัปเดตคำแนะนำ
        const calculatorInputs = [animalTypeSelect, animalSpeciesSelect, animalWeightKgInput, lifeStageActivitySelect];
        calculatorInputs.forEach(input => {
            if (input) {
                input.addEventListener('change', () => {
                    updateRecommendedAmount(); // ไม่ต้องส่ง parameters
                });
            }
        });

        // Event listener สำหรับ animalCountInput (หากมีการเปลี่ยนแปลงจำนวนสัตว์)
        if (animalCountInput) {
            animalCountInput.addEventListener('input', () => { // ใช้ 'input' event สำหรับการเปลี่ยนแปลงทุกครั้ง
                updateRecommendedAmount(); // ไม่ต้องส่ง parameters
            });
        }
        // เมื่อโหลดหน้าเว็บเสร็จ ให้เรียก updateRecommendedAmount ครั้งแรกด้วย
        updateRecommendedAmount(); // ไม่ต้องส่ง parameters
    }
});
