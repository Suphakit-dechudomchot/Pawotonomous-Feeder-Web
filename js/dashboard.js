// dashboard.js - quick actions and commands
import { db, ref, set, push } from './firebaseConfig.js';
import { state } from './state.js';
import { DOMElements, showCustomAlert, setButtonState } from './ui.js';
import { sanitizeFileName, clamp } from './utils.js';

export async function sendCommand(command, payload = {}) {
    const deviceStatusIcon = document.getElementById('deviceStatusIcon');
    const isDeviceOnline = deviceStatusIcon && deviceStatusIcon.classList.contains('online');
    if (!isDeviceOnline || !state.isAuthReady) { await showCustomAlert('ออฟไลน์','อุปกรณ์ไม่ได้เชื่อมต่อ หรือการยืนยันตัวตนยังไม่พร้อม. ไม่สามารถส่งคำสั่งได้','error'); return false; }
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
