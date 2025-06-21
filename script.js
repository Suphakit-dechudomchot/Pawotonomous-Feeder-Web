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
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdua2dhbWl6cWxvc3Zoa3V3emhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MzY3MTUsImV4cCI6MjA2NjAxMjcxNX0.Dq5oPJ2zV8UUyoNakh4JKzDary8MIGZLDG5BppF_pgc'
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
let openNotificationBtn, closeNotificationBtn; // ปุ่มสำหรับ Notification Modal
let makenoiseAudioInput, makenoiseAudioStatusSpan; // สำหรับอัปโหลดเสียง makenoise
let deviceStatusCircle, deviceStatusText; // สำหรับสถานะอุปกรณ์
let animalTypeSelect, animalSpeciesSelect, animalCountInput; // สำหรับ Animal Calculator
let animalWeightKgInput, lifeStageActivitySelect, calculationNotesSpan; // สำหรับ Calculator เพิ่มเติม

// ✅ เพิ่ม Global variables สำหรับ Custom Alert และ Toast Notification
let customAlertOverlay, customAlertContent, customAlertTitle, customAlertMessage, customAlertOkButton;
let newNotificationToast, newNotificationToastMessage;
let notificationDot; // Existing, but now will display count
let newNotificationToastTimeout; // To manage toast auto-hide

// Firebase reference for user-specific settings (e.g., last read notification timestamp)
const DEFAULT_USER_ID = "default-app-user"; // Placeholder userId; replace with actual user ID from auth
let lastNotificationReadTimestampRef;


// ฟังก์ชันช่วยสำหรับอัปเดตสถานะปุ่ม (ใช้สำหรับปุ่มควบคุมหลักที่เชื่อมกับ Firebase)
function updateButtonState(button, dbPath, initialText, workingText, iconClass = '', workingIconClass = '') {
    if (!button) {
        console.warn(`ไม่พบ Element ปุ่มที่มี ID สำหรับ ${dbPath}`);
        return;
    }

    const buttonIcon = button.querySelector('i');
    const buttonTextSpan = button.querySelector('.button-text');

    const useInnerHTMLFallback = !buttonIcon || !buttonTextSpan; // Fallback หากไม่มี icon/text span

    // Listener สำหรับ Firebase: คอยตรวจสอบสถานะการทำงานแบบ Realtime
    db.ref(dbPath).on('value', (snapshot) => {
        const isWorking = snapshot.val() === true;
        if (isWorking) {
            button.disabled = true;
            if (useInnerHTMLFallback) {
                button.textContent = workingText;
            } else {
                buttonIcon.className = workingIconClass;
                buttonTextSpan.textContent = workingText;
            }
            button.classList.add('working-state');
        } else {
            button.disabled = false;
            if (useInnerHTMLFallback) {
                button.textContent = initialText;
            } else {
                buttonIcon.className = iconClass;
                buttonTextSpan.textContent = initialText;
            }
            button.classList.remove('working-state');
        }
    });

    // เรียกครั้งแรกเพื่อตั้งค่าสถานะเริ่มต้น (เมื่อหน้าเว็บโหลด)
    db.ref(dbPath).once('value', (snapshot) => {
        const isWorking = snapshot.val() === true;
        if (isWorking) {
            button.disabled = true;
            if (useInnerHTMLFallback) {
                button.textContent = workingText;
            } else {
                buttonIcon.className = workingIconClass;
                buttonTextSpan.textContent = workingText;
            }
            button.classList.add('working-state');
        } else {
            if (useInnerHTMLFallback) {
                button.textContent = initialText;
            } else {
                buttonIcon.className = iconClass;
                buttonTextSpan.textContent = initialText;
            }
        }
    });
}

// ฟังก์ชันสำหรับสั่งให้อาหารทันที
function feedNow() {
    if (feedNowBtn && feedNowBtn.disabled) {
        showCustomAlert("ตอนนี้กำลังให้อาหารอยู่ ไม่สามารถสั่งการได้ กรุณารอสักครู่", "warning", "⚠️ กำลังดำเนินการ");
        return;
    }
    console.log("ส่งคำสั่งให้อาหารทันที");

    db.ref("feeder/feedNow").set(true)
        .then(() => showCustomAlert("ส่งคำสั่งให้อาหารแล้ว!", "success", "✅ สำเร็จ!"))
        .catch(error => showCustomAlert("เกิดข้อผิดพลาด: " + error.message, "error", "❌ ผิดพลาด!"));
}

// ฟังก์ชันสำหรับเพิ่มมื้ออาหารใหม่ (หรือโหลดจาก Firebase)
// แก้ไข: ไม่ต้อง clamp ค่า fanSpeed และ direction ที่นี่โดยตรงในพารามิเตอร์แล้ว เพราะจะใช้กับค่าที่รับจาก UI โดยตรง
function addMeal(time = "", amount = "", fanSpeed = "", direction = "", audioURL = "", originalFileName = "", scrollToView = true) { // เปลี่ยนค่าเริ่มต้นเป็น "" เพื่อให้ input ว่างเปล่า
    if (document.querySelectorAll(".meal").length >= 100) {
        showCustomAlert("เกิน 100 มื้อแล้ว!", "warning", "แจ้งเตือน");
        return;
    }

    // ลบ clamp ออกจากตรงนี้ เพราะต้องการให้ผู้ใช้ใส่ค่าอะไรก็ได้ใน UI ก่อน
    // fanSpeed = clamp(parseInt(fanSpeed), 1, 3);
    // direction = clamp(parseInt(direction), 60, 120);

    const div = document.createElement("div");
    div.className = "meal";

    let initialAudioStatusText = '';
    let initialAudioStatusColor = '';
    if (audioURL) {
        initialAudioStatusText = `✅ อัปโหลดแล้ว<br><small>(${originalFileName || 'ไฟล์เสียง'})</small>`;
        initialAudioStatusColor = 'green';
    }

    div.innerHTML = `
        <span class="meal-label"></span> <label>เวลา: <input type="time" value="${time}" class="meal-time"></label>
        <label> ปริมาณ (g): <input type="number" value="${amount}" class="meal-amount" min="1"></label>
        <label>แรงลม (1-3): <input type="number" class="meal-fan" min="1" max="1000" value="${fanSpeed}"></label> <!-- เปลี่ยน max เป็นค่าที่กว้างขึ้น -->
        <label>ทิศทางลม(60°–120°): <input type="number" class="meal-direction" min="0" max="360" value="${direction}"></label> <!-- เปลี่ยน min/max เป็นค่าที่กว้างขึ้น -->
        <label>เสียง: <input type="file" accept="audio/*" class="meal-audio"> <span class="audio-status" style="color: ${initialAudioStatusColor};">${initialAudioStatusText}</span></label>
        <button class="copy-button"><i class="fa-solid fa-copy"></i></button>
        <button class="delete-button"><i class="fa-solid fa-trash"></i></button>
    `;

    div.dataset.audioUrl = audioURL;
    div.dataset.originalFileName = originalFileName;

    // แนบ Event Listener สำหรับ Element ภายใน Div ของมื้ออาหารใหม่
    div.querySelector(".delete-button").addEventListener("click", () => {
        div.remove();
        updateMealNumbers();
    });

    const audioInput = div.querySelector(".meal-audio");
    const audioStatusSpan = div.querySelector(".audio-status");

    audioInput.addEventListener("change", async () => {
        const file = audioInput.files[0];
        if (!file) {
            audioStatusSpan.textContent = "";
            audioStatusSpan.style.color = "";
            div.dataset.audioUrl = "";
            div.dataset.originalFileName = "";
            return;
        }

        audioStatusSpan.textContent = "🔄 กำลังอัปโหลด...";
        audioStatusSpan.style.color = "orange";

        const fileName = `${Date.now()}_${sanitizeFileName(file.name)}`;

        try {
            const { data, error } = await supabaseClient.storage.from("audio").upload(fileName, file);

            if (error) {
                showCustomAlert("อัปโหลดไม่สำเร็จ: " + error.message, "error", "❌ ผิดพลาด!");
                audioStatusSpan.textContent = "❌ อัปโหลดไม่สำเร็จ: " + error.message;
                audioStatusSpan.style.color = "red";
                div.dataset.audioUrl = "";
                div.dataset.originalFileName = "";
                console.error("Supabase Upload Error:", error);
                return;
            }

            const { data: publicData } = supabaseClient.storage.from("audio").getPublicUrl(fileName);
            const downloadURL = publicData.publicUrl;

            div.dataset.audioUrl = downloadURL;
            div.dataset.originalFileName = file.name;

            const uploadedFileName = file.name;
            audioStatusSpan.innerHTML = `✅ อัปโหลดแล้ว<br><small>(${uploadedFileName})</small>`;
            audioStatusSpan.style.color = "green";
            showCustomAlert(`อัปโหลดไฟล์เสียง "${file.name}" สำเร็จ!`, "success", "✅ สำเร็จ!");
        } catch (e) {
            showCustomAlert("เกิดข้อผิดพลาด: " + e.message, "error", "❌ ผิดพลาด!");
            audioStatusSpan.textContent = "❌ เกิดข้อผิดพลาด: " + e.message;
            audioStatusSpan.style.color = "red";
            div.dataset.audioUrl = "";
            div.dataset.originalFileName = "";
            console.error("General Upload Error:", e);
        }
    });

    // ลบ Event Listener สำหรับ input ที่มีการ clamp ออก เพราะจะ clamp ตอน save แทน
    // div.querySelector(".meal-fan").addEventListener("input", (event) => {
    //     let value = parseInt(event.target.value);
    //     if (isNaN(value)) value = 1;
    //     event.target.value = clamp(value, 1, 3);
    // });

    // div.querySelector(".meal-direction").addEventListener("input", (event) => {
    //     let value = parseInt(event.target.value);
    //     if (isNaN(value)) value = 90;
    //     event.target.value = clamp(value, 60, 120);
    // });

    div.querySelector(".copy-button").addEventListener("click", () => {
        copiedMeal = {
            time: div.querySelector(".meal-time").value,
            amount: div.querySelector(".meal-amount").value,
            fan: div.querySelector(".meal-fan").value,
            direction: div.querySelector(".meal-direction").value,
            audioUrl: div.dataset.audioUrl || "",
            originalFileName: div.dataset.originalFileName || ""
        };
        showCustomAlert("คัดลอกมื้อเรียบร้อยแล้ว!", "info", "📋 คัดลอก");
        if (pasteBtn) {
            pasteBtn.disabled = false;
            pasteBtn.innerHTML = '<i class="fa-solid fa-paste"></i> <span>วางมื้อ (คัดลอกแล้ว)</span>';
        }
    });

    mealList.appendChild(div);
    updateMealNumbers();

    if (scrollToView) {
        div.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ฟังก์ชันสำหรับวางมื้ออาหารที่คัดลอกมา
function pasteCopiedMeal() {
    if (pasteBtn && pasteBtn.disabled) {
        showCustomAlert("ยังไม่มีมื้ออาหารที่คัดลอก!", "warning", "⚠️ คำเตือน");
        return;
    }
    if (copiedMeal) {
        addMeal(
            copiedMeal.time,
            copiedMeal.amount,
            copiedMeal.fan,
            copiedMeal.direction,
            copiedMeal.audioUrl,
            copiedMeal.originalFileName
        );
    } else {
        showCustomAlert("ยังไม่มีมื้ออาหารที่คัดลอก!", "warning", "⚠️ คำเตือน");
    }
}

// ฟังก์ชันสำหรับบันทึกมื้ออาหารทั้งหมดไปยัง Firebase
function saveMeals() {
    const meals = [];
    document.querySelectorAll(".meal").forEach(div => {
        const time = div.querySelector(".meal-time").value;
        const amount = parseInt(div.querySelector(".meal-amount").value);

        // ✅ ปรับเปลี่ยนการ clamp ค่า fan และ direction ที่นี่
        // ดึงค่าจาก input ก่อน
        let fanInput = parseInt(div.querySelector(".meal-fan").value);
        let directionInput = parseInt(div.querySelector(".meal-direction").value);

        // ใช้ clamp เพื่อจำกัดค่าให้อยู่ในช่วงที่ Arduino ใช้ได้จริง
        // ตรวจสอบว่าไม่ใช่ NaN ก่อน clamp เพื่อป้องกันปัญหา
        let fan = isNaN(fanInput) ? 1 : clamp(fanInput, 1, 3);
        let direction = isNaN(directionInput) ? 90 : clamp(directionInput, 60, 120);
        
        const audioUrl = div.dataset.audioUrl || "";
        const originalFileName = div.dataset.originalFileName || "";

        if (time && !isNaN(amount)) {
            meals.push({ time, amount, fan, direction, audioUrl, originalFileName });
        }
    });

    db.ref("meals").set(meals)
        .then(() => showCustomAlert("บันทึกเรียบร้อยแล้ว!", "success", "✅ สำเร็จ!"))
        .catch(err => showCustomAlert("เกิดข้อผิดพลาด: " + err, "error", "❌ ผิดพลาด!"));
}

// ===============================================
// ✅ ฟังก์ชันแจ้งเตือน (Notification)
// ===============================================

// --- Custom Alert Functions ---
function showCustomAlert(message, type = 'info', title = 'แจ้งเตือน') {
    if (!customAlertOverlay || !customAlertContent || !customAlertTitle || !customAlertMessage || !customAlertOkButton) {
        console.error("Custom alert elements not found. Falling back to native alert.");
        alert(message); // Fallback to native alert if elements are missing
        return;
    }

    customAlertTitle.textContent = title;
    customAlertMessage.textContent = message;
    
    // Clear previous type classes and add the new one
    customAlertContent.classList.remove('success', 'error', 'warning', 'info');
    customAlertContent.classList.add(type); 
    
    customAlertOverlay.classList.add('show');
}

// --- New Notification Toast Functions ---
function showNewNotificationToast(message) {
    if (!newNotificationToast || !newNotificationToastMessage) return;

    clearTimeout(newNotificationToastTimeout); // Clear any existing timeout

    newNotificationToastMessage.textContent = message;
    newNotificationToast.classList.add('show');

    newNotificationToastTimeout = setTimeout(() => {
        closeNewNotificationToast();
    }, 5000); // Hide after 5 seconds
}

function closeNewNotificationToast() {
    if (!newNotificationToast) return;
    newNotificationToast.classList.remove('show');
    // clearTimeout(newNotificationToastTimeout); // Moved to showNewNotificationToast to prevent multiple timeouts
}

// --- Notification Logic (Badge & Toast) ---
async function updateNotificationBadgeAndToast() {
    // Get last read timestamp from Firebase
    let lastReadTimestamp = "0"; // Default to very old timestamp if not set
    if (lastNotificationReadTimestampRef) {
        try {
            const snapshot = await lastNotificationReadTimestampRef.once("value");
            lastReadTimestamp = snapshot.val() || "0";
        } catch (error) {
            console.error("Error fetching last read timestamp:", error);
            // Fallback: don't show toast if there's an error fetching timestamp
            if (notificationDot) notificationDot.style.display = 'none';
            closeNewNotificationToast();
            return;
        }
    }

    // Fetch all notifications to count unread
    try {
        const snapshot = await db.ref("notifications").once("value");
        const data = snapshot.val();
        let unreadCount = 0;
        let latestUnreadMessage = "";
        let latestUnreadTimestamp = "0";

        if (data) {
            const entries = Object.entries(data)
                .map(([key, value]) => ({ id: key, ...value }))
                .sort((a, b) => (a.time || "").localeCompare(b.time || "")); // Ensure sorted by time

            for (const notif of entries) {
                // Check if notification is newer than lastReadTimestamp
                if (notif.time && notif.time > lastReadTimestamp) {
                    unreadCount++;
                    // Find the absolute latest unread message
                    if (notif.time > latestUnreadTimestamp) {
                        latestUnreadTimestamp = notif.time;
                        latestUnreadMessage = notif.message;
                    }
                }
            }
        }

        // Update notification dot badge
        if (notificationDot) {
            if (unreadCount > 0) {
                notificationDot.textContent = unreadCount;
                notificationDot.style.display = 'block';
            } else {
                notificationDot.style.display = 'none';
            }
        }

        // Show toast for latest unread notification only if it's new and not already showing
        // And if the main notification modal is NOT open
        const notificationModal = document.getElementById("notificationModal");
        if (unreadCount > 0 && latestUnreadMessage && !newNotificationToast.classList.contains('show') && notificationModal.style.display !== 'block') {
             showNewNotificationToast(latestUnreadMessage);
        } else if (unreadCount === 0 || !latestUnreadMessage || notificationModal.style.display === 'block') {
            closeNewNotificationToast(); // Hide toast if no unread or modal is open
        }

    } catch (error) {
        console.error("Error updating notification badge and toast:", error);
        if (notificationDot) notificationDot.style.display = 'none';
        closeNewNotificationToast();
    }
}

// Override fetchNotifications, openNotificationModal, closeNotificationModal
// to integrate with unread count and dot/toast
function fetchNotifications() {
    const notificationList = document.getElementById("notificationList");
    notificationList.innerHTML = "<li>🔄 กำลังโหลด...</li>";

    db.ref("notifications").once("value")
        .then(snapshot => {
            const data = snapshot.val();
            notificationList.innerHTML = "";

            if (!data) {
                // ✅ แก้ไขตรงนี้เพื่อแสดงไอคอนและข้อความ "ไม่มีแจ้งเตือน"
                notificationList.innerHTML = "<li><i class='fa-solid fa-bell-slash'></i> <p style='display:inline-block; margin-left: 5px;'>ไม่มีแจ้งเตือน</p></li>";
                // No unread notifications if no data - badge will be updated by listener
                return;
            }

            const entries = Object.entries(data)
                .map(([key, value]) => ({ id: key, ...value }))
                .sort((a, b) => (b.time || "").localeCompare(a.time || "")); // เรียงจากเวลาล่าสุด

            const latest10 = entries.slice(0, 10); // แสดงแค่ 10 รายการล่าสุด
            latest10.forEach(notif => {
                const li = document.createElement("li");
                li.innerHTML = `<i class="fa-solid fa-bullhorn"></i><strong>   ${notif.message}</strong><br><small>${notif.time || ""}</small>`;
                li.style.borderBottom = "1px solid #eee";
                li.style.padding = "5px 0";
                notificationList.appendChild(li);
            });

            // No need to call updateNotificationBadgeAndToast here, the Firebase listener in DOMContentLoaded handles it
            // This fetchNotifications is primarily for populating the modal content.

            // ลบรายการแจ้งเตือนที่เกิน 20 รายการออกจาก Firebase
            const toDelete = entries.slice(20);
            const updates = {};
            toDelete.forEach(notif => {
                updates[`/notifications/${notif.id}`] = null;
            });

            if (Object.keys(updates).length > 0) {
                db.ref().update(updates)
                    .then(() => console.log("ลบแจ้งเตือนเก่าที่เกิน 20 รายการออกจาก Database แล้ว"))
                    .catch(error => console.error("เกิดข้อผิดพลาดในการลบแจ้งเตือนเก่า:", error));
            }
        })
        .catch(error => {
            notificationList.innerHTML = "<li>❌ เกิดข้อผิดพลาดในการโหลดแจ้งเตือน</li>";
            console.error("เกิดข้อผิดพลาดในการดึงแจ้งเตือน:", error);
            // Hide badge if there's an error fetching notifications for the list
            if (notificationDot) notificationDot.style.display = 'none';
        });
}

function openNotificationModal() {
    document.getElementById("notificationModal").style.display = "block";
    fetchNotifications(); // Fetch and display notifications inside the modal

    // Mark all current notifications as read by updating timestamp
    db.ref("notifications").once("value").then(snapshot => {
        const data = snapshot.val();
        if (data) {
            const latestTimestamp = Object.values(data).reduce((maxTime, notif) => {
                return (notif.time && notif.time > maxTime) ? notif.time : maxTime;
            }, "0"); // Find the latest notification timestamp
            if (latestTimestamp !== "0" && lastNotificationReadTimestampRef) {
                lastNotificationReadTimestampRef.set(latestTimestamp)
                    .then(() => {
                        // After setting, immediately hide the dot as they are now read
                        if (notificationDot) notificationDot.style.display = 'none';
                    })
                    .catch(error => console.error("Error setting last read timestamp:", error));
            } else {
                // If no notifications, ensure dot is hidden
                if (notificationDot) notificationDot.style.display = 'none';
            }
        } else {
             // If no notifications, ensure dot is hidden
           if (notificationDot) notificationDot.style.display = 'none';
        }
    });

    closeNewNotificationToast(); // Hide toast if it's showing when main modal is opened
}

function closeNotificationModal() {
    document.getElementById("notificationModal").style.display = "none";
    // After closing modal, trigger badge/toast update based on latest state (if new notifications arrived while modal was open)
    updateNotificationBadgeAndToast(); 
}


// ===============================================
// ✅ ฟังก์ชันควบคุมการทำงานของอุปกรณ์ (เช็คอาหาร/เคลื่อนไหว/เล่นเสียง)
// ===============================================
function Checkfoodlevel() {
    if (checkFoodLevelBtn && checkFoodLevelBtn.disabled) {
        showCustomAlert("ตอนนี้กำลังเช็คปริมาณอาหารอยู่ ไม่สามารถสั่งการได้ กรุณารอสักครู่", "warning", "⚠️ กำลังดำเนินการ");
        return;
    }
    console.log("ส่งคำสั่งเช็คปริมาณอาหารทันที");

    db.ref("Checkfoodlevel/true").set(true)
        .then(() => {
            showCustomAlert("ส่งคำสั่งเช็คปริมาณอาหารแล้ว!", "success", "✅ สำเร็จ!");
        })
        .catch((error) => {
            showCustomAlert("เกิดข้อผิดพลาด: " + error.message, "error", "❌ ผิดพลาด!");
        });
}

function Checkanimalmovement() {
    if (checkAnimalMovementBtn && checkAnimalMovementBtn.disabled) {
        showCustomAlert("ตอนนี้กำลังเช็คการเคลื่อนไหวอยู่ ไม่สามารถสั่งการได้ กรุณารอสักครู่", "warning", "⚠️ กำลังดำเนินการ");
        return;
    }
    console.log("ส่งคำสั่งเช็คการเคลื่อนไหว");

    db.ref("Checkanimalmovement/true").set(true)
        .then(() => {
            showCustomAlert("ส่งคำสั่งเช็คการเคลื่อนไหวแล้ว!", "success", "✅ สำเร็จ!");
        })
        .catch((error) => {
            showCustomAlert("เกิดข้อผิดพลาด: " + error.message, "error", "❌ ผิดพลาด!");
        });
}

let makenoiseUploadedAudioURL = ""; // ใช้เก็บ URL ของเสียงที่อัปโหลดสำหรับ makenoise

function makenoise() {
    if (makenoiseBtn && makenoiseBtn.disabled) {
        showCustomAlert("ตอนนี้กำลังเล่นเสียงอยู่ ไม่สามารถสั่งการได้ กรุณารอสักครู่", "warning", "⚠️ กำลังดำเนินการ");
        return;
    }
    console.log("ส่งเสียง");

    if (!makenoiseUploadedAudioURL) {
        showCustomAlert("กรุณาอัปโหลดไฟล์เสียงสำหรับเล่นทันทีก่อนส่งคำสั่ง", "warning", "⚠️ คำเตือน");
        return;
    }

    const data = {
        play: true,
        audioUrl: makenoiseUploadedAudioURL
    };

    db.ref("makenoise").set(data)
        .then(() => {
            showCustomAlert("ส่งคำสั่งเล่นเสียงแล้ว!", "success", "✅ สำเร็จ!");
        })
        .catch((error) => {
            showCustomAlert("เกิดข้อผิดพลาดในการส่งคำสั่ง: " + error.message, "error", "❌ ผิดพลาด!");
            console.error("Firebase makenoise error:", error);
        });
}


// ===============================================
// ✅ ส่วนอัปเดตสถานะอุปกรณ์ (ออนไลน์/ออฟไลน์/แบตเตอรี่)
// ===============================================
function updateDeviceStatusUI(isOnline, batteryVoltage = null) {
    if (deviceStatusCircle) deviceStatusCircle.classList.remove("online", "offline", "low-battery");
    if (deviceStatusText) deviceStatusText.classList.remove("online", "offline", "low-battery");

    let statusMessage = "ออฟไลน์";
    let statusClass = "offline";

    if (isOnline) {
        statusClass = "online";
        statusMessage = "ออนไลน์";

        if (batteryVoltage !== null) {
            const LOW_BATTERY_THRESHOLD = 11.5;

            if (batteryVoltage < LOW_BATTERY_THRESHOLD) {
                statusClass = "low-battery";
                statusMessage = `แบตต่ำ (${batteryVoltage.toFixed(1)}V)`;
            } else {
                statusMessage = `ออนไลน์ (${batteryVoltage.toFixed(1)}V)`;
            }
        }
    } else {
        statusClass = "offline";
        statusMessage = "ออฟไลน์";
    }

    if (deviceStatusCircle) {
        deviceStatusCircle.classList.add(statusClass);
        deviceStatusCircle.title = `สถานะอุปกรณ์: ${statusMessage}`;
    }
    if (deviceStatusText) {
        deviceStatusText.textContent = statusMessage;
        deviceStatusText.classList.add(statusClass);
    }
}


// ===============================================
// ✅ เมื่อ DOM โหลดเสร็จสิ้น: ดึง Element, แนบ Event Listener, โหลดข้อมูลเริ่มต้น
// ===============================================
document.addEventListener("DOMContentLoaded", () => {
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
    lastNotificationReadTimestampRef = db.ref(`user_settings/${DEFAULT_USER_ID}/last_notification_read_timestamp`);

    // 2. กำหนดสถานะเริ่มต้นของ UI (รวมถึงปุ่ม paste)
    updateDeviceStatusUI(false); // เริ่มต้นเป็นออฟไลน์
    if (pasteBtn) {
        pasteBtn.disabled = true;
        pasteBtn.innerHTML = '<i class="fa-solid fa-paste"></i> <span>วางมื้อ</span>';
    }

    // 3. ใช้งานฟังก์ชัน updateButtonState สำหรับปุ่มหลักที่เชื่อมกับ Firebase
    updateButtonState(feedNowBtn, 'feeder/feedNow', 'ให้อาหารทันที', 'กำลังให้อาหาร...', 'fa-solid fa-bowl-food', 'fa-solid fa-spinner fa-spin');
    updateButtonState(checkFoodLevelBtn, 'Checkfoodlevel/true', 'เช็คปริมาณอาหาร', 'กำลังเช็ค...', 'fa-solid fa-scale-balanced', 'fa-solid fa-spinner fa-spin');
    updateButtonState(checkAnimalMovementBtn, 'Checkanimalmovement/true', 'เช็คการเคลื่อนไหว', 'กำลังเช็ค...', 'fa-solid fa-paw', 'fa-solid fa-spinner fa-spin');
    updateButtonState(makenoiseBtn, 'makenoise/play', 'เล่นเสียงนี้ทันที', 'กำลังเล่นเสียง...', 'fa-solid fa-volume-high', 'fa-solid fa-spinner fa-spin');

    // 4. แนบ Event Listeners ทั้งหมด (แทนการใช้ onclick ใน HTML)
    if (feedNowBtn) feedNowBtn.addEventListener('click', feedNow);
    if (addMealBtn) addMealBtn.addEventListener('click', () => addMeal());
    if (saveMealsBtn) saveMealsBtn.addEventListener('click', saveMeals);
    if (pasteBtn) pasteBtn.addEventListener('click', pasteCopiedMeal);
    if (openNotificationBtn) openNotificationBtn.addEventListener('click', openNotificationModal);
    if (closeNotificationBtn) closeNotificationBtn.addEventListener('click', closeNotificationModal);
    if (checkFoodLevelBtn) checkFoodLevelBtn.addEventListener('click', Checkfoodlevel);
    if (checkAnimalMovementBtn) checkAnimalMovementBtn.addEventListener('click', Checkanimalmovement);
    if (makenoiseBtn) makenoiseBtn.addEventListener('click', makenoise);

    // Event Listener สำหรับอัปโหลดเสียงเฉพาะ makenoise
    if (makenoiseAudioInput && makenoiseAudioStatusSpan) {
        makenoiseAudioInput.addEventListener("change", async () => {
            const file = makenoiseAudioInput.files[0];
            if (!file) {
                makenoiseUploadedAudioURL = "";
                makenoiseAudioStatusSpan.textContent = "ไม่มีไฟล์ที่เลือก";
                makenoiseAudioStatusSpan.style.color = "grey";
                return;
            }

            makenoiseAudioStatusSpan.textContent = "🔄 กำลังอัปโหลด...";
            makenoiseAudioStatusSpan.style.color = "orange";

            const fileName = `${Date.now()}_${sanitizeFileName(file.name)}`;

            try {
                const { data, error } = await supabaseClient.storage.from("audio").upload(fileName, file);

                if (error) {
                    showCustomAlert("อัปโหลดไม่สำเร็จ: " + error.message, "error", "❌ ผิดพลาด!");
                    makenoiseAudioStatusSpan.textContent = "❌ อัปโหลดไม่สำเร็จ: " + error.message;
                    makenoiseAudioStatusSpan.style.color = "red";
                    makenoiseUploadedAudioURL = ""; // ตั้งค่าเป็นค่าว่างหากอัปโหลดไม่สำเร็จ
                    console.error("Supabase Upload Error:", error);
                    return;
                }

                const { data: publicData } = supabaseClient.storage.from("audio").getPublicUrl(fileName);
                makenoiseUploadedAudioURL = publicData.publicUrl; // เก็บ URL ที่ได้มา

                const uploadedFileName = file.name;
                makenoiseAudioStatusSpan.innerHTML = `✅ อัปโหลดแล้ว<br><small>(${uploadedFileName})</small>`;
                makenoiseAudioStatusSpan.style.color = "green";
                showCustomAlert(`อัปโหลดไฟล์เสียง "${file.name}" สำเร็จ!`, "success", "✅ สำเร็จ!");
            } catch (e) {
                showCustomAlert("เกิดข้อผิดพลาด: " + e.message, "error", "❌ ผิดพลาด!");
                makenoiseAudioStatusSpan.textContent = "❌ เกิดข้อผิดพลาด: " + e.message;
                makenoiseAudioStatusSpan.style.color = "red";
                makenoiseUploadedAudioURL = ""; // ตั้งค่าเป็นค่าว่างหากเกิดข้อผิดพลาด
                console.error("General Upload Error:", e);
            }
        });
    }


    // 5. โหลดมื้ออาหารจาก Firebase และแสดงผล
    db.ref("meals").on("value", (snapshot) => {
        mealList.innerHTML = ""; // ล้างรายการเก่าก่อนโหลดใหม่
        const mealsData = snapshot.val();
        if (mealsData && Array.isArray(mealsData) && mealsData.length > 0) {
            mealsData.forEach(meal => {
                addMeal(meal.time, meal.amount, meal.fan, meal.direction, meal.audioUrl, meal.originalFileName, false); // false = ไม่ต้อง scroll to view เมื่อโหลดจาก DB
            });
        } else {
            // ✅ แก้ไข: ถ้าไม่มีข้อมูลมื้ออาหาร ให้แสดงมื้อที่ 1 เป็นค่าว่าง
            addMeal("", "", "", "", "", "", false); // เพิ่มมื้อแรกที่เป็นค่าว่าง
        }
        updateMealNumbers();
    });

    // 6. ดึงสถานะอุปกรณ์แบบ Realtime
    db.ref('feeder/isOnline').on('value', (snapshot) => {
        const isOnline = snapshot.val();
        db.ref('feeder/batteryVoltage').once('value', (batterySnapshot) => {
            const batteryVoltage = batterySnapshot.val();
            updateDeviceStatusUI(isOnline, batteryVoltage);
        });
    });

    // 7. ตั้งค่า Firebase listener สำหรับ Notification Badge & Toast
    db.ref("notifications").on("value", (snapshot) => {
        updateNotificationBadgeAndToast();
    });

    // เรียก updateNotificationBadgeAndToast ครั้งแรกเมื่อโหลดหน้าเว็บ
    updateNotificationBadgeAndToast();

    // ✅ เรียก populateAnimalType ครั้งแรกเมื่อ DOM โหลดเสร็จ เพื่อให้ Calculator เริ่มทำงาน
    if (animalTypeSelect) {
        populateAnimalType(animalTypeSelect, animalData);
        animalTypeSelect.addEventListener('change', () => updateAnimalSpecies(animalTypeSelect, animalSpeciesSelect, animalData));
        
        // แนบ Event Listener สำหรับการเปลี่ยนแปลงค่าใน Calculator เพื่ออัปเดตคำแนะนำ
        const calculatorInputs = [animalTypeSelect, animalSpeciesSelect, animalWeightKgInput, lifeStageActivitySelect];
        calculatorInputs.forEach(input => {
            if (input) {
                input.addEventListener('change', () => {
                    updateRecommendedAmount(
                        animalTypeSelect, 
                        animalSpeciesSelect, 
                        animalWeightKgInput, 
                        lifeStageActivitySelect, 
                        animalCountInput, 
                        calculationNotesSpan, 
                        animalData
                    );
                });
            }
        });

        // Event listener สำหรับ animalCountInput (หากมีการเปลี่ยนแปลงจำนวนสัตว์)
        if (animalCountInput) {
            animalCountInput.addEventListener('input', () => { // ใช้ 'input' event สำหรับการเปลี่ยนแปลงทุกครั้ง
                updateRecommendedAmount(
                    animalTypeSelect, 
                    animalSpeciesSelect, 
                    animalWeightKgInput, 
                    lifeStageActivitySelect, 
                    animalCountInput, 
                    calculationNotesSpan, 
                    animalData
                );
            });
        }

        // เมื่อโหลดหน้าเว็บเสร็จ ให้เรียก updateRecommendedAmount ครั้งแรกด้วย
        updateRecommendedAmount(
            animalTypeSelect, 
            animalSpeciesSelect, 
            animalWeightKgInput, 
            lifeStageActivitySelect, 
            animalCountInput, 
            calculationNotesSpan, 
            animalData
        );
    }
});
// ===============================================================
    // ✅ ฟังก์ชันสำหรับทดสอบการเพิ่มแจ้งเตือน (สามารถเรียกใช้หรือ uncomment เพื่อทดสอบ)
    // ===============================================================
    window.addTestNotification = function() {
        if (typeof firebase !== 'undefined' && firebase.database) {
            const db = firebase.database();
            const message = "นี่คือข้อความแจ้งเตือนทดสอบ (จากฟังก์ชัน)";
            const timestamp = new Date().toISOString(); 

            db.ref("notifications").push({
                message: message,
                time: timestamp
            })
            .then(() => {
                console.log("✅ เพิ่มการแจ้งเตือนสำเร็จ:", { message, time: timestamp });
                showCustomAlert("เพิ่มการแจ้งเตือนทดสอบแล้ว!", "info", "✅ ทดสอบสำเร็จ");
            })
            .catch(error => {
                console.error("❌ เพิ่มการแจ้งเตือนล้มเหลว:", error);
                showCustomAlert("เกิดข้อผิดพลาดในการเพิ่มการแจ้งเตือน: " + error.message, "error", "❌ ทดสอบล้มเหลว");
            });
        } else {
            console.error("Firebase SDK ไม่พร้อมใช้งาน");
            showCustomAlert("Firebase ไม่พร้อมใช้งาน! ตรวจสอบการเชื่อมต่อ.", "error", "❌ ข้อผิดพลาด");
        }
    };

    // ✅ คุณสามารถ uncomment บรรทัดด้านล่างนี้เพื่อเรียกใช้ฟังก์ชันทดสอบ
    //    เมื่อหน้าเว็บโหลดเสร็จหนึ่งครั้ง และคอมเมนต์กลับเมื่อทดสอบเสร็จแล้ว
    // addTestNotification(); 
    
