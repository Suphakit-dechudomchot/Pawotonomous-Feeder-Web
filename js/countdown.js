// countdown.js - next meal calculations and countdown
import { state } from './state.js';
import { DOMElements } from './ui.js';
import { t } from './translations.js';

const dayMap = { 'Sun':0,'Mon':1,'Tue':2,'Wed':3,'Thu':4,'Fri':5,'Sat':6 };
const dayNames = {
    th: ['อา','จ','อ','พ','พฤ','ศ','ส'],
    en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    zh: ['日','一','二','三','四','五','六'],
    ja: ['日','月','火','水','木','金','土']
};
const monthNames = {
    th: ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],
    en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    zh: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
    ja: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
};

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
    if (isNaN(timeZoneOffset)) { DOMElements.nextMealCountdownDisplay.textContent = t('countdown_setTimezone'); DOMElements.nextMealTimeDisplay.textContent = ''; return; }
    const { nextMeal, nextTimestamp } = findNextMeal(state.allMealsData, timeZoneOffset);
    if (nextMeal && nextTimestamp !== Infinity) {
        const now = Date.now(); let timeLeft = nextTimestamp - now; if (timeLeft <= 0) { DOMElements.nextMealCountdownDisplay.textContent = t('countdown_calculating'); DOMElements.nextMealTimeDisplay.textContent = ''; setTimeout(updateCountdownDisplay, 1000); return; }
        const days = Math.floor(timeLeft/(1000*60*60*24)); timeLeft %= (1000*60*60*24); const hours = Math.floor(timeLeft/(1000*60*60)); timeLeft %= (1000*60*60); const minutes = Math.floor(timeLeft/(1000*60)); timeLeft %= (1000*60); const seconds = Math.floor(timeLeft/1000);
        let countdownString = t('countdown_feedIn') + ' '; if (days>0) countdownString += `${days} ${t('countdown_days')} `; countdownString += `${String(hours).padStart(2,'0')} ${t('countdown_hours')} ${String(minutes).padStart(2,'0')} ${t('countdown_minutes')} ${String(seconds).padStart(2,'0')} ${t('countdown_seconds')}`;
        DOMElements.nextMealCountdownDisplay.textContent = countdownString;
        const lang = localStorage.getItem('pawtonomous_language') || 'th';
        const localNextMealDate = new Date(nextTimestamp + (timeZoneOffset*3600*1000)); 
        const dayOfWeek = dayNames[lang][localNextMealDate.getUTCDay()]; 
        const dayOfMonth = localNextMealDate.getUTCDate(); 
        const month = monthNames[lang][localNextMealDate.getUTCMonth()]; 
        const hour = String(localNextMealDate.getUTCHours()).padStart(2,'0'); 
        const minute = String(localNextMealDate.getUTCMinutes()).padStart(2,'0'); 
        DOMElements.nextMealTimeDisplay.textContent = lang === 'th' ? `${dayOfWeek}. ${dayOfMonth} ${month} ${hour}:${minute} น.` : `${dayOfWeek} ${dayOfMonth} ${month} ${hour}:${minute}`;
    } else { DOMElements.nextMealCountdownDisplay.textContent = t('countdown_noUpcoming'); DOMElements.nextMealTimeDisplay.textContent = ''; }
}

export function startCountdown() { if (state.countdownInterval) clearInterval(state.countdownInterval); updateCountdownDisplay(); state.countdownInterval = setInterval(updateCountdownDisplay, 1000); }
export function stopCountdown() { if (state.countdownInterval) { clearInterval(state.countdownInterval); state.countdownInterval = null; } }
