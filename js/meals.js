// meals.js - meal management (load, add, edit, delete)
import { db, ref, onValue, push, set, update, remove, supabaseClient } from './firebaseConfig.js';
import { state } from './state.js';
import { DOMElements, showModal, hideModal, showCustomAlert } from './ui.js';
import { sanitizeFileName, clamp } from './utils.js';
import { t } from './translations.js';

function calculateMealBlockDuration(amount, gramsPerSecond, MEAL_BLOCK_DURATION_SECONDS) {
    if (!gramsPerSecond || gramsPerSecond <= 0) return 0;
    const feedDuration = amount / gramsPerSecond;
    return Math.ceil(feedDuration + MEAL_BLOCK_DURATION_SECONDS.movementCheck + MEAL_BLOCK_DURATION_SECONDS.cooldown);
}

async function isTimeConflict(newMeal, allMeals, gramsPerSecond, MEAL_BLOCK_DURATION_SECONDS, activeMealId) {
    if (!allMeals || !gramsPerSecond || gramsPerSecond <= 0) return false;
    const [newHour, newMinute] = newMeal.time.split(':').map(Number);
    const newMealStartTimeMs = (newHour * 60 + newMinute) * 60 * 1000;
    const newMealDurationSeconds = calculateMealBlockDuration(newMeal.amount, gramsPerSecond, MEAL_BLOCK_DURATION_SECONDS);
    const newMealEndTimeMs = newMealStartTimeMs + (newMealDurationSeconds * 1000);

    for (const id in allMeals) {
        if (id === activeMealId) continue;
        const existingMeal = allMeals[id];
        const [existingHour, existingMinute] = existingMeal.time.split(':').map(Number);
        const existingMealStartTimeMs = (existingHour * 60 + existingMinute) * 60 * 1000;
        const existingMealDurationSeconds = calculateMealBlockDuration(existingMeal.amount, gramsPerSecond, MEAL_BLOCK_DURATION_SECONDS);
        const existingMealEndTimeMs = existingMealStartTimeMs + (existingMealDurationSeconds * 1000);

        let conflict = false;
        if (newMeal.specificDate && existingMeal.specificDate) {
            if (newMeal.specificDate === existingMeal.specificDate) {
                if (newMealStartTimeMs < existingMealEndTimeMs && newMealEndTimeMs > existingMealStartTimeMs) conflict = true;
            }
        } else if (!newMeal.specificDate && !existingMeal.specificDate) {
            const daysOverlap = newMeal.days.some(day => existingMeal.days.includes(day));
            if (daysOverlap) {
                if (newMealStartTimeMs < existingMealEndTimeMs && newMealEndTimeMs > existingMealStartTimeMs) conflict = true;
            }
        } else {
            const specificDate = newMeal.specificDate || existingMeal.specificDate;
            const recurringDays = newMeal.specificDate ? existingMeal.days : newMeal.days;
            const specificDateDayOfWeek = new Date(specificDate).toLocaleString('en-US', { weekday: 'short' });
            if (recurringDays.includes(specificDateDayOfWeek)) {
                if (newMealStartTimeMs < existingMealEndTimeMs && newMealEndTimeMs > existingMealStartTimeMs) conflict = true;
            }
        }

        if (conflict) return true;
    }
    return false;
}

export async function loadMeals(db, DOMElements, MEAL_BLOCK_DURATION_SECONDS) {
    if (!state.currentDeviceId || !DOMElements.mealListContainer || !state.isAuthReady) return;
    DOMElements.mealListContainer.innerHTML = `<li>${t('loadingMeals')}</li>`;
    onValue(ref(db, `device/${state.currentDeviceId}/meals`), (snapshot) => {
        state.allMealsData = snapshot.val() || {};
        const mealsArray = state.allMealsData ? Object.entries(state.allMealsData).map(([id, data]) => ({ id, ...data })) : [];
        mealsArray.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
        DOMElements.mealListContainer.innerHTML = '';
        if (mealsArray.length > 0) mealsArray.forEach(m => addMealCard(m, DOMElements, db, MEAL_BLOCK_DURATION_SECONDS));
        else DOMElements.mealListContainer.innerHTML = `<p class="notes" style="text-align: center;" data-i18n="noMeals">${t('noMeals')}</p>`;
    });
}

export function addMealCard(mealData, DOMElements, db, MEAL_BLOCK_DURATION_SECONDS) {
    if (!DOMElements.mealListContainer) return;
    const { id, name, time, days = [], specificDate, enabled = true } = mealData;
    const card = document.createElement('div');
    card.className = 'meal-card';
    card.dataset.id = id;
    const lang = localStorage.getItem('pawtonomous_language') || 'th';
    const dayAbbreviations = {
        th: {'Mon':'จ','Tue':'อ','Wed':'พ','Thu':'พฤ','Fri':'ศ','Sat':'ส','Sun':'อา'},
        en: {'Mon':'Mon','Tue':'Tue','Wed':'Wed','Thu':'Thu','Fri':'Fri','Sat':'Sat','Sun':'Sun'},
        zh: {'Mon':'一','Tue':'二','Wed':'三','Thu':'四','Fri':'五','Sat':'六','Sun':'日'},
        ja: {'Mon':'月','Tue':'火','Wed':'水','Thu':'木','Fri':'金','Sat':'土','Sun':'日'}
    };
    let daysDisplay = '';
    if (specificDate) {
        const dateObj = new Date(specificDate);
        const locale = lang === 'th' ? 'th-TH' : lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US';
        const formattedDate = dateObj.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
        daysDisplay = `<div class="meal-card-specific-date">${formattedDate}</div>`;
    } else {
        const displayDaysStr = days.length === 7 ? t('everyDay') : days.map(d => dayAbbreviations[lang][d]).join(' ');
        daysDisplay = `<div class="meal-card-days">${displayDaysStr || t('noDaysSelected')}</div>`;
    }
    card.innerHTML = `
        <div class="meal-card-left">
            <div class="meal-card-name">${name || t('noName')}</div>
            <div class="meal-card-time">${time || '00:00'}</div>
            ${daysDisplay}
        </div>
        <label class="toggle-label">
            <input type="checkbox" class="toggle-switch" ${enabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
        </label>
    `;
    card.addEventListener('click', e => { if (!e.target.closest('.toggle-label')) openMealDetailModal(id, null, db, DOMElements, MEAL_BLOCK_DURATION_SECONDS); });
    card.querySelector('.toggle-switch').addEventListener('change', async e => {
        if (!state.currentDeviceId || !state.isAuthReady) return;
        const isEnabled = e.target.checked;
        try {
            await set(ref(db, `device/${state.currentDeviceId}/meals/${id}/enabled`), isEnabled);
            await showCustomAlert('สำเร็จ', `มื้อ ${name} ถูก ${isEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}`, 'info');
        } catch (error) {
            console.error('Error toggling meal status:', error);
            await showCustomAlert('ข้อผิดพลาด', `ไม่สามารถเปลี่ยนสถานะมื้ออาหารได้: ${error.message}`, 'error');
        }
    });
    DOMElements.mealListContainer.appendChild(card);
}

export async function openMealDetailModal(mealId = null, prefillData = null, db, DOMElements, MEAL_BLOCK_DURATION_SECONDS) {
    if (!DOMElements.mealDetailModal) return;
    state.activeMealId = mealId;
    DOMElements.mealModalTitle.textContent = mealId ? t('editMeal') : t('addMealTitle');
    DOMElements.deleteMealDetailBtn.style.display = mealId ? 'inline-flex' : 'none';
    document.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('selected', 'disabled'));
    if (DOMElements.specificDateInput) { DOMElements.specificDateInput.value = ''; DOMElements.specificDateInput.style.display = 'none'; }
    if (DOMElements.specificDateDisplay) DOMElements.specificDateDisplay.textContent = '';
    if (DOMElements.mealAudioSelect) DOMElements.mealAudioSelect.value = '';
    if (DOMElements.mealAudioStatus) DOMElements.mealAudioStatus.textContent = t('noDataText');

    let mealData = prefillData || {};
    if (mealId && !prefillData) {
        const snapshot = await new Promise(resolve => { onValue(ref(db, `device/${state.currentDeviceId}/meals/${mealId}`), s => resolve(s), { onlyOnce: true }); });
        mealData = snapshot.val() || {};
    }
    const [hours, minutes] = (mealData.time || '07:00').split(':');
    // UI timepicker functions will update via external module
    if (DOMElements.mealNameInput) DOMElements.mealNameInput.value = mealData.name || '';
    if (DOMElements.mealAmountInput) DOMElements.mealAmountInput.value = mealData.amount || 10;
    if (DOMElements.mealFanStrengthInput) DOMElements.mealFanStrengthInput.value = mealData.fanStrength ?? 50;
    if (DOMElements.mealFanDirectionInput) DOMElements.mealFanDirectionInput.value = mealData.fanDirection || 90;
    if (DOMElements.mealSwingModeCheckbox) DOMElements.mealSwingModeCheckbox.checked = mealData.swingMode || false;
    if (mealData.specificDate) {
        if (DOMElements.specificDateInput) { DOMElements.specificDateInput.value = mealData.specificDate; DOMElements.specificDateInput.style.display = 'block'; }
        if (DOMElements.specificDateDisplay) {
            const lang = localStorage.getItem('pawtonomous_language') || 'th';
            const locale = lang === 'th' ? 'th-TH' : lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US';
            DOMElements.specificDateDisplay.textContent = `${t('specificDateLabel')} ${new Date(mealData.specificDate).toLocaleDateString(locale)}`;
        }
        document.querySelectorAll('.day-btn:not(.date-btn)').forEach(btn => btn.classList.add('disabled'));
        if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.classList.add('selected');
    } else if (mealData.days && mealData.days.length > 0) {
        mealData.days.forEach(day => document.querySelector(`.day-btn[data-day="${day}"]`)?.classList.add('selected'));
        if (DOMElements.specificDateBtn) { DOMElements.specificDateBtn.classList.remove('selected'); DOMElements.specificDateBtn.disabled = true; }
        if (DOMElements.specificDateInput) DOMElements.specificDateInput.style.display = 'none';
    }
    if (mealData.audioIndex && DOMElements.mealAudioSelect) {
        DOMElements.mealAudioSelect.value = String(mealData.audioIndex);
        if (DOMElements.mealAudioStatus) DOMElements.mealAudioStatus.textContent = DOMElements.mealAudioSelect.selectedOptions[0]?.textContent || t('noDataText');
    }
    showModal(DOMElements.mealDetailModal);
}

export function closeMealDetailModal() {
    if (!DOMElements.mealDetailModal) return;
    hideModal(DOMElements.mealDetailModal);
}

export async function saveMealDetail(db, DOMElements, MEAL_BLOCK_DURATION_SECONDS) {
    if (!state.currentDeviceId || !DOMElements.saveMealDetailBtn || !state.isAuthReady) { await showCustomAlert('ข้อผิดพลาด', 'ไม่พบ ID อุปกรณ์', 'error'); return; }
    if (!state.gramsPerSecond || state.gramsPerSecond <= 0) { await showCustomAlert('ข้อผิดพลาด', 'กรุณาทำการ Calibrate ปริมาณอาหารในหน้า \'\'ตั้งค่า\'\' ก่อน', 'error'); return; }
    const [hour, minute] = window.getTimeFromPicker ? window.getTimeFromPicker() : [7,0];
    let selectedDays = Array.from(document.querySelectorAll('.day-btn.selected:not(.date-btn)')).map(btn => btn.dataset.day);
    let specificDate = DOMElements.specificDateInput.value || null;
    if (!specificDate && selectedDays.length === 0) {
        const now = new Date();
        const mealDateTimeToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
        if (mealDateTimeToday.getTime() <= now.getTime()) now.setDate(now.getDate() + 1);
        specificDate = now.toISOString().split('T')[0];
        const lang = localStorage.getItem('pawtonomous_language') || 'th';
        await showCustomAlert('แจ้งเตือน', `เนื่องจากไม่ได้ระบุวัน มื้ออาหารนี้จะถูกตั้งค่าสำหรับวันที่ ${new Date(specificDate).toLocaleDateString(lang === 'th' ? 'th-TH' : lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US')}`, 'info');
    }
    const mealData = {
        time: `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`,
        name: DOMElements.mealNameInput.value.trim() || t('mealName'),
        amount: parseInt(DOMElements.mealAmountInput.value) || 10,
        fanStrength: clamp(parseInt(DOMElements.mealFanStrengthInput.value), 0, 100),
        fanDirection: clamp(parseInt(DOMElements.mealFanDirectionInput.value), 60, 120),
        swingMode: DOMElements.mealSwingModeCheckbox.checked,
        days: selectedDays,
        specificDate: specificDate,
        enabled: true
    };
    if (mealData.amount < 1) { mealData.amount = 1; await showCustomAlert('แจ้งเตือน', 'ปริมาณอาหารต้องไม่น้อยกว่า 1 กรัม', 'warning'); }

    const existingMealsSnapshot = await new Promise(resolve => { onValue(ref(db, `device/${state.currentDeviceId}/meals`), s => resolve(s), { onlyOnce: true }); });
    if (await isTimeConflict(mealData, existingMealsSnapshot.val(), state.gramsPerSecond, MEAL_BLOCK_DURATION_SECONDS, state.activeMealId)) { await showCustomAlert('เวลาทับซ้อน', 'เวลาที่ตั้งค่าทับซ้อนกับมื้ออาหารอื่น กรุณาเลือกเวลาใหม่', 'warning'); return; }

    // Audio selection (using select dropdown instead of file upload)
    const selectedAudioIndex = DOMElements.mealAudioSelect ? parseInt(DOMElements.mealAudioSelect.value) : null;
    if (selectedAudioIndex && !isNaN(selectedAudioIndex)) {
        mealData.audioIndex = selectedAudioIndex;
    } else if (state.activeMealId) {
        const oldDataSnapshot = await new Promise(resolve => { onValue(ref(db, `device/${state.currentDeviceId}/meals/${state.activeMealId}`), s => resolve(s), { onlyOnce: true }); });
        const oldData = oldDataSnapshot.val();
        mealData.audioIndex = oldData?.audioIndex || null;
    }

    try {
        if (state.activeMealId) {
            await update(ref(db, `device/${state.currentDeviceId}/meals/${state.activeMealId}`), mealData);
        } else {
            const mealRef = push(ref(db, `device/${state.currentDeviceId}/meals`));
            await set(mealRef, mealData);
        }
        await showCustomAlert('สำเร็จ', 'บันทึกมื้ออาหารเรียบร้อย', 'success');
        closeMealDetailModal();
    } catch (error) {
        console.error('Error saving meal:', error);
        await showCustomAlert('ผิดพลาด', `ไม่สามารถบันทึกได้: ${error.message}`, 'error');
    }
}

export async function deleteMealDetail(db) {
    if (!state.activeMealId || !state.isAuthReady) { await showCustomAlert('ข้อผิดพลาด', 'ไม่พบ ID อุปกรณ์', 'error'); return; }
    // Confirm
    const confirmed = confirm('คุณแน่ใจหรือไม่ที่จะลบมื้ออาหารนี้?');
    if (!confirmed) return;
    try {
        await remove(ref(db, `device/${state.currentDeviceId}/meals/${state.activeMealId}`));
        await showCustomAlert('สำเร็จ', 'ลบมื้ออาหารแล้ว', 'success');
        closeMealDetailModal();
    } catch (error) {
        await showCustomAlert('ผิดพลาด', `ไม่สามารถลบได้: ${error.message}`, 'error');
    }
}
