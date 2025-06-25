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
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdua2dhbWl6cWxvc3Zoa3V3emhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MzY3MTUsImV4cCI6MjA2NjAxMjcxNX0.Dq5oPJ2zV8UUyoNakh4JKzDary8MIGZLDG5BppF_pgc'
);

// ตัวแปรส่วนกลางสำหรับมื้ออาหารที่คัดลอกไว้
let copiedMeal = null;

// ฟังก์ชันช่วยเหลือสำหรับจำกัดค่าให้อยู่ในช่วงที่กำหนด
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
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
function showCustomAlert(title, message) {
    const customAlertOverlay = document.getElementById('customAlertOverlay');
    const customAlertTitle = document.getElementById('customAlertTitle');
    const customAlertMessage = document.getElementById('customAlertMessage');
    const customAlertOkButton = document.getElementById('customAlertOkButton');

    customAlertTitle.textContent = title;
    customAlertMessage.textContent = message;
    customAlertOverlay.style.display = 'flex'; // แสดง overlay
    
    // ตั้งค่า focus ไปที่ปุ่ม OK ทันทีที่แสดง alert
    customAlertOkButton.focus();
    
    // คืนค่า Promise เพื่อให้สามารถรอจนกว่าผู้ใช้จะกด OK
    return new Promise(resolve => {
        const handler = () => {
            customAlertOverlay.style.display = 'none'; // ซ่อน overlay
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
    
    toastMessage.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000); // ซ่อน toast หลังจาก 5 วินาที
}

// ฟังก์ชันเพิ่มการแจ้งเตือนในรายการ (โมดอล)
function addNotificationToList(message, timestamp) {
    const notificationList = document.getElementById('notificationList');
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

// ฟังก์ชันสำหรับตั้งค่าสถานะอุปกรณ์บน UI
function setDeviceStatus(isOnline) {
    if (isOnline) {
        deviceStatusCircle.classList.remove('offline');
        deviceStatusCircle.classList.add('online');
        deviceStatusText.classList.remove('offline');
        deviceStatusText.classList.add('online');
        deviceStatusText.textContent = 'ออนไลน์';
        // เปิดใช้งานปุ่มเมื่ออุปกรณ์ออนไลน์
        document.getElementById('mainContentContainer').style.display = 'block';
        feedNowBtn.disabled = false;
        saveMealsBtn.disabled = false;
        addMealBtn.disabled = false;
        checkFoodLevelBtn.disabled = false;
        checkAnimalMovementBtn.disabled = false;
        makenoiseBtn.disabled = false;
        // หากมี copiedMeal อยู่แล้ว ก็ให้ pasteBtn เปิดใช้งาน
        if (copiedMeal) {
            pasteBtn.disabled = false;
        }

    } else {
        deviceStatusCircle.classList.remove('online');
        deviceStatusCircle.classList.add('offline');
        deviceStatusText.classList.remove('online');
        deviceStatusText.classList.add('offline');
        deviceStatusText.textContent = 'ออฟไลน์';
        // ปิดใช้งานปุ่มเมื่ออุปกรณ์ออฟไลน์
        document.getElementById('mainContentContainer').style.display = 'none';
        feedNowBtn.disabled = true;
        saveMealsBtn.disabled = true;
        addMealBtn.disabled = true;
        pasteBtn.disabled = true; // pasteBtn ก็ต้องปิดด้วย
        checkFoodLevelBtn.disabled = true;
        checkAnimalMovementBtn.disabled = true;
        makenoiseBtn.disabled = true;
    }
}

// ฟังการเปลี่ยนแปลงสถานะออนไลน์ของอุปกรณ์จาก Firebase
db.ref('device/status/online').on('value', (snapshot) => {
    const isOnline = snapshot.val();
    console.log("Device online status:", isOnline);
    setDeviceStatus(isOnline);
});

// ฟังการเปลี่ยนแปลง Device ID (เช่น เมื่อ ESP32 รีสตาร์ทและส่ง ID มาใหม่)
db.ref('device/status/deviceId').on('value', (snapshot) => {
    const currentDeviceId = snapshot.val();
    if (currentDeviceId && currentDeviceId !== deviceId) {
        deviceId = currentDeviceId;
        console.log("New Device ID received:", deviceId);
        // อาจจะต้องโหลดข้อมูลใหม่หรือทำอะไรบางอย่างเมื่อ Device ID เปลี่ยน
        loadSettingsFromFirebase(); // โหลดการตั้งค่าระบบ
        loadMeals(); // โหลดมื้ออาหาร
        setupNotificationListener(deviceId); // ตั้งค่า Listener การแจ้งเตือนใหม่
        fetchAndDisplayNotifications(); // โหลดการแจ้งเตือนเก่ามาแสดง
    } else if (!currentDeviceId) {
        deviceId = null; // ถ้าไม่มี Device ID แสดงว่าอุปกรณ์อาจจะยังไม่เชื่อมต่อ
        console.log("Device ID is null, device might be offline or not connected.");
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
// ✅ การจัดการการตั้งค่าระบบ (โซนเวลา, ขนาดขวด)
// ===============================================

// โหลดการตั้งค่าระบบจาก Firebase
async function loadSettingsFromFirebase() {
    if (!deviceId) {
        console.log("No deviceId available to load system settings.");
        return;
    }
    try {
        const snapshot = await db.ref(`device/${deviceId}/settings`).once('value');
        const settings = snapshot.val();
        if (settings) {
            document.getElementById('timeZoneOffsetSelect').value = settings.timeZoneOffset || '7'; // Default เป็น +7
            document.getElementById('bottleSizeSelect').value = settings.bottleSize || '48'; // Default 48cm

            // จัดการ customBottleHeightInput
            const bottleSizeSelect = document.getElementById('bottleSizeSelect');
            const customBottleHeightInput = document.getElementById('customBottleHeightInput');
            if (settings.bottleSize === 'custom') {
                customBottleHeightInput.style.display = 'block';
                customBottleHeightInput.value = settings.customBottleHeight || '';
            } else {
                customBottleHeightInput.style.display = 'none';
            }
        } else {
            // ถ้ายังไม่มีการตั้งค่า ให้ตั้งค่าเริ่มต้น
            document.getElementById('timeZoneOffsetSelect').value = '7';
            document.getElementById('bottleSizeSelect').value = '48';
            document.getElementById('customBottleHeightInput').style.display = 'none';
            console.log("No existing system settings found. Using defaults.");
        }
    } catch (error) {
        console.error("Error loading system settings:", error);
    }
}

// บันทึกการตั้งค่าระบบไปที่ Firebase
async function saveSettingsToFirebase() {
    if (!deviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.");
        return;
    }
    const timeZoneOffset = document.getElementById('timeZoneOffsetSelect').value;
    const bottleSize = document.getElementById('bottleSizeSelect').value;
    let customBottleHeight = null;
    if (bottleSize === 'custom') {
        customBottleHeight = parseFloat(document.getElementById('customBottleHeightInput').value);
        if (isNaN(customBottleHeight) || customBottleHeight <= 0) {
            showCustomAlert("ข้อผิดพลาด", "โปรดระบุความสูงของขวดที่ถูกต้อง (มากกว่า 0).");
            return;
        }
    }

    try {
        await db.ref(`device/${deviceId}/settings`).set({
            timeZoneOffset: parseFloat(timeZoneOffset),
            bottleSize: bottleSize,
            customBottleHeight: customBottleHeight
        });
        console.log("System settings saved successfully!");
        showCustomAlert("สำเร็จ", "บันทึกการตั้งค่าระบบเรียบร้อยแล้ว.");
    } catch (error) {
        console.error("Error saving system settings:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถบันทึกการตั้งค่าระบบได้: ${error.message}`);
    }
}

// Listener สำหรับการเปลี่ยนแปลง select ของขนาดขวด
document.addEventListener('DOMContentLoaded', () => {
    const bottleSizeSelect = document.getElementById('bottleSizeSelect');
    const customBottleHeightInput = document.getElementById('customBottleHeightInput');

    bottleSizeSelect.addEventListener('change', () => {
        if (bottleSizeSelect.value === 'custom') {
            customBottleHeightInput.style.display = 'block';
            customBottleHeightInput.focus();
        } else {
            customBottleHeightInput.style.display = 'none';
        }
    });

    // กำหนดค่าให้กับตัวแปรที่รับ reference เมื่อ DOM โหลดเสร็จ
    feedNowBtn = document.getElementById('feedNowBtn');
    checkFoodLevelBtn = document.getElementById('checkFoodLevelBtn');
    checkAnimalMovementBtn = document.getElementById('checkAnimalMovementBtn');
    makenoiseBtn = document.getElementById('makenoiseBtn');
    pasteBtn = document.getElementById('pasteBtn');
    mealList = document.getElementById('mealList');
    addMealBtn = document.getElementById('addMealBtn');
    saveMealsBtn = document.getElementById('saveMealsBtn');
    openNotificationBtn = document.getElementById('openNotificationBtn');
    closeNotificationBtn = document.getElementById('closeNotificationBtn');
    notificationDot = document.getElementById('notificationDot');
    deviceStatusCircle = document.getElementById('deviceStatusCircle');
    deviceStatusText = document.getElementById('deviceStatusText');


    // โหลดการตั้งค่าระบบเมื่อหน้าเว็บโหลดเสร็จ
    loadSettingsFromFirebase();

    // Listener สำหรับการเปลี่ยนแปลงการตั้งค่าระบบ (เพื่อให้บันทึกอัตโนมัติ)
    document.getElementById('timeZoneOffsetSelect').addEventListener('change', saveSettingsToFirebase);
    document.getElementById('bottleSizeSelect').addEventListener('change', saveSettingsToFirebase);
    document.getElementById('customBottleHeightInput').addEventListener('input', saveSettingsToFirebase);
});

// ===============================================
// ✅ การจัดการมื้ออาหาร (เพิ่ม, ลบ, แก้ไข, บันทึก)
// ===============================================

// ฟังก์ชันสำหรับเพิ่มมื้ออาหารใหม่ใน UI
function addMeal(meal = {}) {
    const mealDiv = document.createElement('div');
    mealDiv.classList.add('meal');
    mealDiv.dataset.id = meal.id || Date.now(); // ใช้ id ที่มีอยู่หรือสร้างใหม่

    const hour = String(meal.hour || 0).padStart(2, '0');
    const minute = String(meal.minute || 0).padStart(2, '0');

    mealDiv.innerHTML = `
        <span class="meal-label">มื้อที่ ${mealList.children.length + 1}:</span>
        <input type="time" class="meal-time" value="${hour}:${minute}">
        <input type="number" class="meal-amount" value="${meal.amount || 1}" min="1" max="100">
        <label>
            เสียง: 
            <input type="file" accept="audio/*" class="meal-noise-input">
            <span class="meal-noise-status" style="color: grey;">${meal.noiseFile ? `ไฟล์: ${meal.noiseFile.split('/').pop()}` : 'ไม่มีไฟล์'}</span>
        </label>
        <button class="meal-noise-upload-btn" ${meal.noiseFile ? '' : 'disabled'}>อัปโหลดเสียง</button>
        <div class="servo-settings">
            <label>
                Servo 1 (อาหาร): 
                <input type="range" class="servo1-angle" min="0" max="180" value="${meal.servo1Angle || 90}">
                <span class="servo-angle-value">${meal.servo1Angle || 90}°</span>
            </label>
            <label>
                Servo 2 (พัดลม): 
                <input type="range" class="servo2-angle" min="0" max="180" value="${meal.servo2Angle || 90}">
                <span class="servo-angle-value">${meal.servo2Angle || 90}°</span>
            </label>
            <label class="swing-mode-label">
                <input type="checkbox" class="swing-mode-checkbox" ${meal.swingMode ? 'checked' : ''}>
                โหมดสวิง (พัดลม)
            </label>
        </div>
        <button class="copy-meal-btn">คัดลอก</button>
        <button class="delete-meal-btn">ลบ</button>
    `;
    mealList.appendChild(mealDiv);

    // อัปเดตค่ามุมเมื่อ slider ถูกลาก
    mealDiv.querySelector('.servo1-angle').addEventListener('input', (e) => {
        e.target.nextElementSibling.textContent = `${e.target.value}°`;
    });
    mealDiv.querySelector('.servo2-angle').addEventListener('input', (e) => {
        e.target.nextElementSibling.textContent = `${e.target.value}°`;
    });

    // Listener สำหรับ input file
    const noiseInput = mealDiv.querySelector('.meal-noise-input');
    const noiseStatus = mealDiv.querySelector('.meal-noise-status');
    const uploadBtn = mealDiv.querySelector('.meal-noise-upload-btn');

    noiseInput.addEventListener('change', () => {
        if (noiseInput.files.length > 0) {
            noiseStatus.textContent = `พร้อมอัปโหลด: ${noiseInput.files[0].name}`;
            uploadBtn.disabled = false;
        } else {
            noiseStatus.textContent = meal.noiseFile ? `ไฟล์: ${meal.noiseFile.split('/').pop()}` : 'ไม่มีไฟล์';
            uploadBtn.disabled = true;
        }
    });

    // Listener สำหรับปุ่มอัปโหลดเสียงเฉพาะมื้อ
    uploadBtn.addEventListener('click', async () => {
        if (noiseInput.files.length > 0) {
            const file = noiseInput.files[0];
            const originalFileName = file.name;
            setButtonState(uploadBtn, true); // ตั้งค่าปุ่มเป็นสถานะโหลด
            try {
                // อัปโหลดไปยัง Supabase Storage
                const path = `meal_noises/${mealDiv.dataset.id}/${sanitizeFileName(originalFileName)}`;
                const { data, error } = await supabaseClient
                    .storage
                    .from('feeder-sounds') // ชื่อ bucket ของคุณ
                    .upload(path, file, {
                        cacheControl: '3600',
                        upsert: true // อัปโหลดทับไฟล์เดิมถ้าชื่อซ้ำ
                    });

                if (error) {
                    throw error;
                }

                // รับ public URL ของไฟล์ที่อัปโหลด
                const { data: publicUrlData } = supabaseClient
                    .storage
                    .from('feeder-sounds')
                    .getPublicUrl(path);

                if (!publicUrlData || !publicUrlData.publicUrl) {
                    throw new Error("Failed to get public URL for the uploaded file.");
                }

                // บันทึก URL นี้ลงใน dataset ของ div มื้ออาหาร
                mealDiv.dataset.noiseFile = publicUrlData.publicUrl;
                noiseStatus.textContent = `อัปโหลดแล้ว: ${originalFileName}`;
                showCustomAlert("สำเร็จ", `อัปโหลดไฟล์เสียงสำหรับมื้อที่ ${Array.from(mealList.children).indexOf(mealDiv) + 1} เรียบร้อย!`);
                
            } catch (error) {
                console.error("Error uploading file to Supabase:", error);
                showCustomAlert("ข้อผิดพลาด", `ไม่สามารถอัปโหลดไฟล์เสียงได้: ${error.message}`);
                noiseStatus.textContent = `ผิดพลาด: ${originalFileName}`;
                // คืนสถานะเดิม
                noiseInput.value = ''; // เคลียร์ไฟล์ที่เลือก
                noiseStatus.textContent = meal.noiseFile ? `ไฟล์: ${meal.noiseFile.split('/').pop()}` : 'ไม่มีไฟล์';
                uploadBtn.disabled = true;
            } finally {
                setButtonState(uploadBtn, false); // คืนสถานะปุ่ม
            }
        }
    });

    mealDiv.querySelector('.delete-meal-btn').addEventListener('click', () => {
        mealDiv.remove();
        updateMealNumbers();
    });

    mealDiv.querySelector('.copy-meal-btn').addEventListener('click', () => {
        const timeInput = mealDiv.querySelector('.meal-time').value;
        const [hour, minute] = timeInput.split(':').map(Number);
        copiedMeal = {
            hour: hour,
            minute: minute,
            amount: parseInt(mealDiv.querySelector('.meal-amount').value),
            noiseFile: mealDiv.dataset.noiseFile || null,
            servo1Angle: parseInt(mealDiv.querySelector('.servo1-angle').value),
            servo2Angle: parseInt(mealDiv.querySelector('.servo2-angle').value),
            swingMode: mealDiv.querySelector('.swing-mode-checkbox').checked // ✅ อ่านค่า swingMode
        };
        pasteBtn.disabled = false; // เปิดใช้งานปุ่มวาง
        showCustomAlert("คัดลอก", "คัดลอกมื้ออาหารแล้ว! กด 'วางมื้อ' เพื่อเพิ่ม.");
    });

    updateMealNumbers();
}

// โหลดมื้ออาหารจาก Firebase
async function loadMeals() {
    if (!deviceId) {
        console.log("No deviceId available to load meals.");
        return;
    }
    mealList.innerHTML = ''; // เคลียร์มื้ออาหารที่มีอยู่
    try {
        const snapshot = await db.ref(`device/${deviceId}/meals`).once('value');
        const mealsData = snapshot.val();
        if (mealsData) {
            // Firebase จะเก็บเป็น Object, ต้องแปลงเป็น Array ก่อน
            const mealsArray = Object.values(mealsData);
            // เรียงลำดับมื้ออาหารตามเวลา
            mealsArray.sort((a, b) => {
                if (a.hour !== b.hour) return a.hour - b.hour;
                return a.minute - b.minute;
            });
            mealsArray.forEach(meal => {
                addMeal(meal);
                // ตรวจสอบและกำหนดค่า noiseFile ใน dataset สำหรับการโหลด
                const mealDiv = mealList.lastElementChild;
                if (meal.noiseFile) {
                    mealDiv.dataset.noiseFile = meal.noiseFile;
                    // อัปเดตสถานะการแสดงผลสำหรับไฟล์เสียงที่โหลดมา
                    const noiseStatusSpan = mealDiv.querySelector('.meal-noise-status');
                    const uploadBtn = mealDiv.querySelector('.meal-noise-upload-btn');
                    noiseStatusSpan.textContent = `ไฟล์: ${meal.noiseFile.split('/').pop()}`;
                    uploadBtn.disabled = true; // ไม่มีไฟล์ใหม่ให้ upload
                }
                // ✅ ตั้งค่าสถานะ checkbox ของ swingMode เมื่อโหลดมื้ออาหาร
                const swingModeCheckbox = mealDiv.querySelector('.swing-mode-checkbox');
                if (swingModeCheckbox) {
                    swingModeCheckbox.checked = meal.swingMode || false; // default เป็น false
                }
            });
        }
        console.log("Meals loaded successfully!");
    } catch (error) {
        console.error("Error loading meals:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถโหลดมื้ออาหารได้: ${error.message}`);
    }
}

// บันทึกมื้ออาหารไปที่ Firebase
async function saveMeals() {
    if (!deviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.");
        return;
    }
    setButtonState(saveMealsBtn, true); // ตั้งค่าปุ่มเป็นสถานะโหลด
    const mealsToSave = [];
    let isValid = true;
    document.querySelectorAll('.meal').forEach(mealDiv => {
        const timeInput = mealDiv.querySelector('.meal-time').value;
        const amountInput = mealDiv.querySelector('.meal-amount').value;
        const servo1AngleInput = mealDiv.querySelector('.servo1-angle').value;
        const servo2AngleInput = mealDiv.querySelector('.servo2-angle').value;
        const swingModeCheckbox = mealDiv.querySelector('.swing-mode-checkbox'); // ✅ อ่านค่า swingMode

        if (!timeInput || !amountInput) {
            isValid = false;
            showCustomAlert("ข้อผิดพลาด", "โปรดกรอกเวลาและปริมาณสำหรับทุกมื้อ.");
            return;
        }

        const [hour, minute] = timeInput.split(':').map(Number);
        const amount = parseInt(amountInput);
        const servo1Angle = parseInt(servo1AngleInput);
        const servo2Angle = parseInt(servo2AngleInput);
        const swingMode = swingModeCheckbox.checked; // ✅ รับค่า swingMode

        if (isNaN(hour) || isNaN(minute) || isNaN(amount) || amount <= 0 || isNaN(servo1Angle) || isNaN(servo2Angle)) {
            isValid = false;
            showCustomAlert("ข้อผิดพลาด", "ข้อมูลมื้ออาหารไม่ถูกต้อง. โปรดตรวจสอบเวลาและปริมาณ (ต้องเป็นตัวเลขมากกว่า 0).");
            return;
        }

        mealsToSave.push({
            id: mealDiv.dataset.id, // เก็บ id ไว้เพื่อใช้เป็น key ใน Firebase
            hour: hour,
            minute: minute,
            amount: amount,
            noiseFile: mealDiv.dataset.noiseFile || null, // URL ของไฟล์เสียง
            servo1Angle: servo1Angle,
            servo2Angle: servo2Angle,
            swingMode: swingMode // ✅ บันทึกค่า swingMode
        });
    });

    if (!isValid) {
        setButtonState(saveMealsBtn, false);
        return;
    }

    try {
        // ใช้ set เพื่อเขียนทับข้อมูลทั้งหมด
        await db.ref(`device/${deviceId}/meals`).set(mealsToSave);
        console.log("Meals saved successfully!");
        showCustomAlert("สำเร็จ", "บันทึกมื้ออาหารเรียบร้อยแล้ว.");
    } catch (error) {
        console.error("Error saving meals:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถบันทึกมื้ออาหารได้: ${error.message}`);
    } finally {
        setButtonState(saveMealsBtn, false); // คืนสถานะปุ่ม
    }
}

// ===============================================
// ✅ การสั่งให้อาหารทันที
// ===============================================

async function feedNow() {
    if (!deviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.");
        return;
    }

    setButtonState(feedNowBtn, true); // ตั้งค่าปุ่มเป็นสถานะโหลด
    try {
        // ดึงการตั้งค่ามื้ออาหารปัจจุบันจาก Firebase
        const snapshot = await db.ref(`device/${deviceId}/meals`).once('value');
        const mealsData = snapshot.val();

        if (!mealsData || Object.keys(mealsData).length === 0) {
            showCustomAlert("ข้อผิดพลาด", "ไม่มีการตั้งค่ามื้ออาหาร. โปรดเพิ่มมื้ออาหารก่อนที่จะให้อาหารทันที.");
            setButtonState(feedNowBtn, false);
            return;
        }

        // เลือกมื้ออาหารแรกเป็นค่าเริ่มต้นสำหรับการให้อาหารทันที (หรือตาม logic ที่ต้องการ)
        const firstMealKey = Object.keys(mealsData)[0];
        const mealToDispense = mealsData[firstMealKey];

        if (!mealToDispense) {
            showCustomAlert("ข้อผิดพลาด", "ไม่พบข้อมูลมื้ออาหารที่จะให้อาหาร.");
            setButtonState(feedNowBtn, false);
            return;
        }

        // ส่งคำสั่งให้อาหารทันทีไปยัง Firebase
        // ส่งเฉพาะค่าที่จำเป็นสำหรับการสั่งให้อาหาร
        await db.ref(`device/${deviceId}/commands/feedNow`).set({
            amount: mealToDispense.amount,
            servo1Angle: mealToDispense.servo1Angle,
            servo2Angle: mealToDispense.servo2Angle,
            noiseFile: mealToDispense.noiseFile || null,
            swingMode: mealToDispense.swingMode || false, // ✅ ส่งค่า swingMode ไปด้วย
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        showCustomAlert("กำลังให้อาหาร", "ส่งคำสั่งให้อาหารทันทีแล้ว. กรุณารอ...");
    } catch (error) {
        console.error("Error sending feedNow command:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถส่งคำสั่งให้อาหารได้: ${error.message}`);
    } finally {
        setButtonState(feedNowBtn, false); // คืนสถานะปุ่ม
    }
}

// ===============================================
// ✅ การเช็คปริมาณอาหาร
// ===============================================

async function checkFoodLevel() {
    if (!deviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.");
        return;
    }
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
        const bottleSize = document.getElementById('bottleSizeSelect').value;
        const customBottleHeight = parseFloat(document.getElementById('customBottleHeightInput').value);

        let bottleHeight = 0;
        if (bottleSize === 'custom' && !isNaN(customBottleHeight)) {
            bottleHeight = customBottleHeight;
        } else {
            // กำหนดความสูงตามที่เลือกใน select (ค่า value ของ option คือความสูงเป็น cm)
            bottleHeight = parseFloat(bottleSize);
        }

        // ตรวจสอบว่าได้ค่าความสูงของขวดหรือไม่
        if (isNaN(bottleHeight) || bottleHeight <= 0) {
            showCustomAlert("ข้อผิดพลาด", "โปรดตั้งค่าขนาดขวดใน 'การตั้งค่าระบบ' ก่อน.");
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

        showCustomAlert("ปริมาณอาหาร", message);

    } catch (error) {
        console.error("Error checking food level:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถตรวจสอบระดับอาหารได้: ${error.message}`);
    } finally {
        setButtonState(checkFoodLevelBtn, false); // คืนสถานะปุ่ม
    }
}

// ===============================================
// ✅ การเช็คการเคลื่อนไหวสัตว์
// ===============================================

async function checkAnimalMovement() {
    if (!deviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.");
        return;
    }
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
        showCustomAlert("การเคลื่อนไหวสัตว์", message);

    } catch (error) {
        console.error("Error checking animal movement:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถตรวจสอบการเคลื่อนไหวได้: ${error.message}`);
    } finally {
        setButtonState(checkAnimalMovementBtn, false); // คืนสถานะปุ่ม
    }
}

// ===============================================
// ✅ การเล่นเสียง Make Noise ทันที
// ===============================================
let selectedMakeNoiseFile = null; // เก็บไฟล์ที่เลือกสำหรับ Make Noise

document.getElementById('makenoiseAudioInput').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        selectedMakeNoiseFile = e.target.files[0];
        document.getElementById('makenoiseAudioStatus').textContent = `พร้อมอัปโหลด: ${selectedMakeNoiseFile.name}`;
        makenoiseBtn.disabled = false;
    } else {
        selectedMakeNoiseFile = null;
        document.getElementById('makenoiseAudioStatus').textContent = '';
        makenoiseBtn.disabled = true;
    }
});

async function playMakeNoise() {
    if (!deviceId) {
        showCustomAlert("ข้อผิดพลาด", "ไม่พบ ID อุปกรณ์. โปรดรอให้อุปกรณ์เชื่อมต่อ.");
        return;
    }
    if (!selectedMakeNoiseFile) {
        showCustomAlert("ข้อผิดพลาด", "โปรดเลือกไฟล์เสียงก่อน.");
        return;
    }

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

        showCustomAlert("สำเร็จ", `ส่งคำสั่งเล่นเสียง: ${originalFileName} แล้ว.`);

    } catch (error) {
        console.error("Error playing make noise:", error);
        showCustomAlert("ข้อผิดพลาด", `ไม่สามารถเล่นเสียงได้: ${error.message}`);
    } finally {
        setButtonState(makenoiseBtn, false); // คืนสถานะปุ่ม
        document.getElementById('makenoiseAudioInput').value = ''; // เคลียร์ไฟล์ที่เลือก
        document.getElementById('makenoiseAudioStatus').textContent = '';
        selectedMakeNoiseFile = null;
        makenoiseBtn.disabled = true;
    }
}

// ===============================================
// ✅ Initial Load และ Event Listeners
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    // กำหนดค่าให้กับตัวแปรที่รับ reference เมื่อ DOM โหลดเสร็จ
    feedNowBtn = document.getElementById('feedNowBtn');
    checkFoodLevelBtn = document.getElementById('checkFoodLevelBtn');
    checkAnimalMovementBtn = document.getElementById('checkAnimalMovementBtn');
    makenoiseBtn = document.getElementById('makenoiseBtn');
    pasteBtn = document.getElementById('pasteBtn');
    mealList = document.getElementById('mealList');
    addMealBtn = document.getElementById('addMealBtn');
    saveMealsBtn = document.getElementById('saveMealsBtn');
    openNotificationBtn = document.getElementById('openNotificationBtn');
    closeNotificationBtn = document.getElementById('closeNotificationBtn');
    notificationDot = document.getElementById('notificationDot');
    deviceStatusCircle = document.getElementById('deviceStatusCircle');
    deviceStatusText = document.getElementById('deviceStatusText');

    // เรียกใช้ populateAnimalType เพื่อเติมข้อมูลเริ่มต้น
    populateAnimalType();

    // Event listeners สำหรับส่วน Meal
    addMealBtn.addEventListener('click', () => addMeal({})); // เรียก addMeal พร้อม object เปล่าเพื่อสร้างค่าเริ่มต้น
    saveMealsBtn.addEventListener('click', saveMeals);
    pasteBtn.addEventListener('click', () => {
        if (copiedMeal) {
            addMeal(copiedMeal);
            copiedMeal = null; // ล้างข้อมูลที่คัดลอกหลังจากวาง
            pasteBtn.disabled = true; // ปิดใช้งานปุ่มวาง
        }
    });

    // Event listeners สำหรับปุ่มควบคุม
    feedNowBtn.addEventListener('click', feedNow);
    checkFoodLevelBtn.addEventListener('click', checkFoodLevel);
    checkAnimalMovementBtn.addEventListener('click', checkAnimalMovement);
    makenoiseBtn.addEventListener('click', playMakeNoise);

    // Event listeners สำหรับ Notification Modal
    openNotificationBtn.addEventListener('click', () => {
        document.getElementById('notificationModal').style.display = 'block';
        notificationCount = 0; // ตั้งค่าเป็น 0 เมื่อเปิดโมดอล
        updateNotificationCountUI(); // อัปเดต UI จุดแจ้งเตือน
    });
    closeNotificationBtn.addEventListener('click', () => {
        document.getElementById('notificationModal').style.display = 'none';
    });
    
    // ตั้งค่าสถานะเริ่มต้นของปุ่มเป็น disabled (จะเปิดใช้งานเมื่อ device ออนไลน์)
    setDeviceStatus(false);

    // Initial load ของมื้ออาหาร (จะถูกเรียกอีกครั้งเมื่อ deviceId ถูกกำหนด)
    loadMeals();
});

