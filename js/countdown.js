// countdown.js - next meal calculations and countdown
import { state } from './state.js';
import { DOMElements } from './ui.js';

const dayMap = { 'Sun':0,'Mon':1,'Tue':2,'Wed':3,'Thu':4,'Fri':5,'Sat':6 };
const dayNamesThai = ['อา','จ','อ','พ','พฤ','ศ','ส'];
const monthNamesThai = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

export function findNextMeal(allMeals, timeZoneOffset) {
    if (!allMeals || Object.keys(allMeals).length === 0 || timeZoneOffset === null) return { nextMeal: null, nextTimestamp: null };
    let earliestNextMealTimestamp = Infinity; let nextMealData = null; const nowUtc = Date.now();
    const activeMeals = Object.values(allMeals).filter(meal => { if (!meal.enabled) return false; if (meal.specificDate) { const specificDateMidnightUtc = new Date(meal.specificDate + 'T00:00:00Z').getTime(); const [mealHour, mealMinute] = meal.time.split(':').map(Number); const mealTimeUtc = specificDateMidnightUtc + (mealHour*3600 + mealMinute*60)*1000 - (timeZoneOffset*3600*1000); return mealTimeUtc > nowUtc; } return true; });
    for (const meal of activeMeals) {
        const [mealHour, mealMinute] = meal.time.split(':').map(Number);
        let potentialNextTimestamp = null;
        if (meal.specificDate) {
            const specificDateMidnightUtc = new Date(meal.specificDate + 'T00:00:00Z').getTime();
            potentialNextTimestamp = specificDateMidnightUtc + (mealHour*3600 + mealMinute*60)*1000 - (timeZoneOffset*3600*1000);
        } else if (meal.days && meal.days.length > 0) {
            const nowLocal = new Date(nowUtc + (timeZoneOffset*3600*1000));
            const currentDayLocal = nowLocal.getUTCDay();
            for (const dayAbbr of meal.days) {
                const targetDayOfWeek = dayMap[dayAbbr]; if (targetDayOfWeek === undefined) continue;
                let daysToAdd = (targetDayOfWeek - currentDayLocal + 7) % 7;
                const todayLocalTimeAtMeal = new Date(nowUtc + (timeZoneOffset*3600*1000));
                todayLocalTimeAtMeal.setUTCHours(mealHour, mealMinute, 0, 0);
                const todayMealUtc = todayLocalTimeAtMeal.getTime() - (timeZoneOffset*3600*1000);
                if (daysToAdd === 0 && todayMealUtc <= nowUtc) daysToAdd = 7;
                const nextOccurrenceLocal = new Date(nowLocal.getTime() + daysToAdd*24*3600*1000);
                nextOccurrenceLocal.setUTCHours(mealHour, mealMinute, 0, 0);
                const candidateTimestamp = nextOccurrenceLocal.getTime() - (timeZoneOffset*3600*1000);
                if (candidateTimestamp > nowUtc) { if (potentialNextTimestamp === null || candidateTimestamp < potentialNextTimestamp) potentialNextTimestamp = candidateTimestamp; }
            }
        }
        if (potentialNextTimestamp !== null && potentialNextTimestamp < earliestNextMealTimestamp) { earliestNextMealTimestamp = potentialNextTimestamp; nextMealData = meal; }
    }
    if (nextMealData) return { nextMeal: nextMealData, nextTimestamp: earliestNextMealTimestamp }; else return { nextMeal: null, nextTimestamp: null };
}

export function updateCountdownDisplay() {
    if (!DOMElements.nextMealCountdownDisplay || !DOMElements.nextMealTimeDisplay || !DOMElements.timeZoneOffsetSelect) return;
    const timeZoneOffset = parseFloat(DOMElements.timeZoneOffsetSelect.value);
    if (isNaN(timeZoneOffset)) { DOMElements.nextMealCountdownDisplay.textContent = "กรุณาตั้งค่าโซนเวลาในหน้า 'ตั้งค่า'"; DOMElements.nextMealTimeDisplay.textContent = ''; return; }
    const { nextMeal, nextTimestamp } = findNextMeal(state.allMealsData, timeZoneOffset);
    if (nextMeal && nextTimestamp !== Infinity) {
        const now = Date.now(); let timeLeft = nextTimestamp - now; if (timeLeft <= 0) { DOMElements.nextMealCountdownDisplay.textContent = 'กำลังคำนวณมื้อถัดไป...'; DOMElements.nextMealTimeDisplay.textContent = ''; setTimeout(updateCountdownDisplay, 1000); return; }
        const days = Math.floor(timeLeft/(1000*60*60*24)); timeLeft %= (1000*60*60*24); const hours = Math.floor(timeLeft/(1000*60*60)); timeLeft %= (1000*60*60); const minutes = Math.floor(timeLeft/(1000*60)); timeLeft %= (1000*60); const seconds = Math.floor(timeLeft/1000);
        let countdownString = 'จะให้อาหารในอีก '; if (days>0) countdownString += `${days} วัน `; countdownString += `${String(hours).padStart(2,'0')} ชั่วโมง ${String(minutes).padStart(2,'0')} นาที ${String(seconds).padStart(2,'0')} วินาที`;
        DOMElements.nextMealCountdownDisplay.textContent = countdownString;
        const localNextMealDate = new Date(nextTimestamp + (timeZoneOffset*3600*1000)); const dayOfWeek = dayNamesThai[localNextMealDate.getUTCDay()]; const dayOfMonth = localNextMealDate.getUTCDate(); const month = monthNamesThai[localNextMealDate.getUTCMonth()]; const hour = String(localNextMealDate.getUTCHours()).padStart(2,'0'); const minute = String(localNextMealDate.getUTCMinutes()).padStart(2,'0'); DOMElements.nextMealTimeDisplay.textContent = `${dayOfWeek}. ${dayOfMonth} ${month} ${hour}:${minute} น.`;
    } else { DOMElements.nextMealCountdownDisplay.textContent = 'ไม่มีมื้ออาหารที่กำลังจะมาถึง'; DOMElements.nextMealTimeDisplay.textContent = ''; }
}

export function startCountdown() { if (state.countdownInterval) clearInterval(state.countdownInterval); updateCountdownDisplay(); state.countdownInterval = setInterval(updateCountdownDisplay, 1000); }
export function stopCountdown() { if (state.countdownInterval) { clearInterval(state.countdownInterval); state.countdownInterval = null; } }
