// dashboard.js - quick actions and commands
import { db, ref, set, push, onValue } from './firebaseConfig.js';
import { state } from './state.js';
import { DOMElements, showCustomAlert, setButtonState, showCustomConfirm } from './ui.js';
import { sanitizeFileName, clamp } from './utils.js';

export async function sendCommand(command, payload = {}) {
    const deviceStatusIcon = document.getElementById('deviceStatusIcon');
    const isDeviceOnline = deviceStatusIcon && deviceStatusIcon.classList.contains('online');
    if (!isDeviceOnline || !state.isAuthReady) { await showCustomAlert('ออฟไลน์','อุปกรณ์ไม่ได้เชื่อมต่อ หรือการยืนยันตัวตนยังไม่พร้อม. ไม่สามารถส่งคำสั่งได้','error'); return false; }
    
    // ตรวจสอบว่าเครื่องกำลังทำงานอยู่หรือไม่
    const statusSnapshot = await new Promise(resolve => { onValue(ref(db, `device/${state.currentDeviceId}/status`), s => resolve(s), { onlyOnce: true }); });
    const status = statusSnapshot.val() || {};
    if (status.isBusy) {
        const stateText = {
            'playing_audio': 'กำลังเล่นเสียง',
            'blowing': 'กำลังเป่าลม',
            'feeding': 'กำลังให้อาหาร',
            'checking_movement': 'กำลังตรวจจับการเคลื่อนไหว'
        };
        const currentStateText = stateText[status.currentState] || 'กำลังทำงาน';
        await showCustomAlert('เครื่องไม่ว่าง', `เครื่อง${currentStateText}อยู่ กรุณารอให้เสร็จสิ้นก่อนสั่งคำสั่งใหม่`, 'warning');
        return false;
    }
    
    try {
        await set(ref(db, `device/${state.currentDeviceId}/commands/${command}`), { ...payload, timestamp: Date.now() });
        return true;
    } catch (error) { await showCustomAlert('ผิดพลาด', `ไม่สามารถส่งคำสั่ง ${command} ได้: ${error.message}`, 'error'); return false; }
}

export async function feedNow() {
    if (!state.currentDeviceId || !DOMElements.feedNowBtn || !state.isAuthReady) { await showCustomAlert('ข้อผิดพลาด','ไม่พบ ID อุปกรณ์ หรือการยืนยันตัวตนยังไม่พร้อม. โปรดลองใหม่อีกครั้ง.','error'); return; }
    setButtonState(DOMElements.feedNowBtn, true);
    try {
        const currentGramsPerSecond = state.gramsPerSecond;
        if (!currentGramsPerSecond || currentGramsPerSecond <= 0) { await showCustomAlert('ข้อผิดพลาด','กรุณาตั้งค่าการสอบเทียบปริมาณอาหารในหน้า \'ตั้งค่า\' ก่อน','error'); setButtonState(DOMElements.feedNowBtn, false); return; }
        const amountToFeed = parseInt(DOMElements.feedNowAmountInput.value);
        const fanStrength = clamp(parseInt(DOMElements.feedNowFanStrengthInput.value), 0, 100);
        const fanDirection = clamp(parseInt(DOMElements.feedNowFanDirectionInput.value), 60, 120);
        const swingMode = DOMElements.feedNowSwingModeCheckbox.checked;
        const audioIndex = DOMElements.feedNowAudioSelect ? parseInt(DOMElements.feedNowAudioSelect.value) : null;
        if (isNaN(amountToFeed) || amountToFeed <= 0) { await showCustomAlert('ข้อผิดพลาด','กรุณาระบุปริมาณอาหารที่ถูกต้อง (อย่างน้อย 1 กรัม)','error'); setButtonState(DOMElements.feedNowBtn, false); return; }
        const durationSeconds = amountToFeed / currentGramsPerSecond;
        if (durationSeconds <= 0) { await showCustomAlert('ข้อผิดพลาด','ปริมาณอาหารหรือค่าการสอบเทียบไม่ถูกต้อง','error'); setButtonState(DOMElements.feedNowBtn, false); return; }
        
        // ตรวจสอบการทับซ้อนกับมื้ออาหาร
        const conflictCheck = await checkMealConflict(durationSeconds);
        if (conflictCheck.hasConflict) {
            const confirmed = await showCustomConfirm(
                'คำเตือน',
                `การให้อาหารจะใช้เวลา ${Math.ceil(durationSeconds)} วินาที และจะทับกับมื้ออาหาร "${conflictCheck.mealName}" ที่ ${conflictCheck.mealTime}\n\nต้องการดำเนินการต่อหรือไม่?`
            );
            if (!confirmed) {
                setButtonState(DOMElements.feedNowBtn, false);
                return;
            }
        }
        
        if (await sendCommand('feedNow', { duration_seconds: durationSeconds.toFixed(2), fanStrength, fanDirection, swingMode, audioIndex: isNaN(audioIndex) ? null : audioIndex })) {
            await showCustomAlert('กำลังให้อาหาร', `ส่งคำสั่งให้อาหาร ${amountToFeed} กรัม (${durationSeconds.toFixed(1)} วินาที) แล้ว. กรุณารอ...`, 'info');
        }
    } catch (error) { await showCustomAlert('ข้อผิดพลาด', `ไม่สามารถส่งคำสั่งให้อาหารได้: ${error.message}`, 'error'); }
    finally { setButtonState(DOMElements.feedNowBtn, false); }
}

export async function playMakeNoise() {
    if (!DOMElements.makenoiseSelect || !DOMElements.makenoiseBtn || !state.isAuthReady) { await showCustomAlert('ข้อผิดพลาด','ไม่พบ ID อุปกรณ์ หรือการยืนยันตัวตนยังไม่พร้อม. โปรดลองใหม่อีกครั้ง.','error'); return; }
    const audioIndex = parseInt(DOMElements.makenoiseSelect.value);
    if (isNaN(audioIndex) || !audioIndex) { await showCustomAlert('ผิดพลาด','กรุณาเลือกเสียงก่อน','error'); return; }
    setButtonState(DOMElements.makenoiseBtn, true);
    try {
        if (await sendCommand('makeNoise', { audioIndex })) await showCustomAlert('สำเร็จ','ส่งคำสั่งเล่นเสียงแล้ว','success');
    } catch (e) { await showCustomAlert('ผิดพลาด', `ไม่สามารถส่งคำสั่งเล่นเสียงได้: ${e.message}`, 'error'); }
    finally { setButtonState(DOMElements.makenoiseBtn, false); }
}

// ฟังก์ชันตรวจสอบการทับซ้อนกับมื้ออาหาร
async function checkMealConflict(operationDurationSeconds) {
    try {
        const mealsSnapshot = await new Promise(resolve => { onValue(ref(db, `device/${state.currentDeviceId}/meals`), s => resolve(s), { onlyOnce: true }); });
        const meals = mealsSnapshot.val() || {};
        
        const now = new Date();
        const currentTimeMs = now.getHours() * 3600000 + now.getMinutes() * 60000 + now.getSeconds() * 1000;
        const operationEndTimeMs = currentTimeMs + (operationDurationSeconds * 1000);
        
        const daysOfWeek = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const today = daysOfWeek[now.getDay()];
        const todayDate = now.toISOString().split('T')[0];
        
        for (const [mealId, meal] of Object.entries(meals)) {
            if (!meal.enabled) continue;
            
            // ตรวจสอบว่ามื้อนี้ทำงานวันนี้หรือไม่
            let isToday = false;
            if (meal.specificDate) {
                isToday = meal.specificDate === todayDate;
            } else if (meal.days && meal.days.includes(today)) {
                isToday = true;
            }
            
            if (!isToday) continue;
            
            // คำนวณเวลามื้ออาหาร
            const [mealHour, mealMinute] = meal.time.split(':').map(Number);
            const mealTimeMs = mealHour * 3600000 + mealMinute * 60000;
            
            // ตรวจสอบการทับซ้อน (ถ้าการทำงานจะเสร็จภายใน 5 นาทีก่อนมื้ออาหาร)
            const bufferMs = 5 * 60000; // 5 นาที
            if (operationEndTimeMs >= (mealTimeMs - bufferMs) && currentTimeMs < mealTimeMs) {
                return {
                    hasConflict: true,
                    mealName: meal.name || 'มื้ออาหาร',
                    mealTime: meal.time
                };
            }
        }
        
        return { hasConflict: false };
    } catch (error) {
        console.error('Error checking meal conflict:', error);
        return { hasConflict: false };
    }
}
