// calibration.js - calibration UI and logic
import { db, ref, set, serverTimestamp } from './firebaseConfig.js';
import { state } from './state.js';
import { DOMElements, showModal, hideModal, showCustomAlert, setButtonState } from './ui.js';

const CALIBRATION_TEST_SECONDS = 5;

export function openCalibrationModal() {
    if (!DOMElements.calibrationModal) return;
    showModal(DOMElements.calibrationModal);
    DOMElements.calibrationStatus.textContent = "กด 'ปล่อยอาหารทดสอบ' เพื่อเริ่ม";
    DOMElements.calibratedWeightInput.value = '';
    DOMElements.saveCalibrationBtn.disabled = true;
    setButtonState(DOMElements.startCalibrationTestBtn, false);
    const deviceStatusIcon = document.getElementById('deviceStatusIcon');
    if (deviceStatusIcon) DOMElements.startCalibrationTestBtn.disabled = !deviceStatusIcon.classList.contains('online');
}

export async function startCalibrationTest() {
    if (!state.currentDeviceId || !state.isAuthReady) { await showCustomAlert('ข้อผิดพลาด','ไม่พบ ID อุปกรณ์ หรือการยืนยันตัวตนยังไม่พร้อม. โปรดลองใหม่อีกครั้ง.','error'); return; }
    setButtonState(DOMElements.startCalibrationTestBtn, true);
    DOMElements.calibrationStatus.textContent = 'กำลังปล่อยอาหาร...';
    try {
        await set(ref(db, `device/${state.currentDeviceId}/commands/calibrate`), { duration_seconds: CALIBRATION_TEST_SECONDS, timestamp: serverTimestamp() });
        await new Promise(r => setTimeout(r, CALIBRATION_TEST_SECONDS * 1000 + 1000));
        DOMElements.calibrationStatus.textContent = 'ปล่อยอาหารเสร็จสิ้น. กรุณาชั่งน้ำหนักและกรอกข้อมูล.';
        DOMElements.calibratedWeightInput.disabled = false;
        DOMElements.calibratedWeightInput.focus();
    } catch (error) {
        DOMElements.calibrationStatus.textContent = `ข้อผิดพลาด: ${error.message}`;
        await showCustomAlert('ข้อผิดพลาด', `ไม่สามารถเริ่มการทดสอบได้: ${error.message}`, 'error');
    } finally { setButtonState(DOMElements.startCalibrationTestBtn, false); }
}

export async function saveCalibration() {
    if (!state.currentDeviceId || !state.isAuthReady) { await showCustomAlert('ข้อผิดพลาด','ไม่พบ ID อุปกรณ์ หรือการยืนยันตัวตนยังไม่พร้อม. โปรดลองใหม่อีกครั้ง.','error'); return; }
    const weight = parseFloat(DOMElements.calibratedWeightInput.value);
    if (isNaN(weight) || weight <= 0) { await showCustomAlert('ข้อมูลผิดพลาด','กรุณากรอกน้ำหนักที่ถูกต้อง','error'); return; }
    setButtonState(DOMElements.saveCalibrationBtn, true);
    try {
        const newGramsPerSecond = weight / CALIBRATION_TEST_SECONDS;
        await set(ref(db, `device/${state.currentDeviceId}/settings/calibration`), { grams_per_second: newGramsPerSecond, last_calibrated: serverTimestamp() });
        state.gramsPerSecond = newGramsPerSecond;
        if (DOMElements.currentGramsPerSecondDisplay) DOMElements.currentGramsPerSecondDisplay.textContent = `${state.gramsPerSecond.toFixed(2)} กรัม/วินาที`;
        await showCustomAlert('สำเร็จ','บันทึกค่า Calibrate แล้ว','success');
        hideModal(DOMElements.calibrationModal);
    } catch (error) {
        await showCustomAlert('ข้อผิดพลาด', `ไม่สามารถบันทึกค่าได้: ${error.message}`, 'error');
    } finally { setButtonState(DOMElements.saveCalibrationBtn, false); }
}
