// timepicker.js - custom time picker setup and helpers
import { DOMElements } from './ui.js';

const TIME_PICKER_BUFFER = 5;
const TIME_PICKER_ITEM_HEIGHT = 50;

export function setupCustomTimePicker() {
    if (!DOMElements['hours-column'] || !DOMElements['minutes-column']) return;
    const hoursCol = DOMElements['hours-column']; const minutesCol = DOMElements['minutes-column'];
    hoursCol.innerHTML = '';
    minutesCol.innerHTML = '';
    for (let i = 24 - TIME_PICKER_BUFFER; i < 24; i++) { const hourDiv = document.createElement('div'); hourDiv.textContent = String(i).padStart(2,'0'); hourDiv.classList.add('time-picker-duplicate'); hoursCol.appendChild(hourDiv); }
    for (let i = 0; i < 24; i++) { const hourDiv = document.createElement('div'); hourDiv.textContent = String(i).padStart(2,'0'); hoursCol.appendChild(hourDiv); }
    for (let i = 0; i < TIME_PICKER_BUFFER; i++) { const hourDiv = document.createElement('div'); hourDiv.textContent = String(i).padStart(2,'0'); hourDiv.classList.add('time-picker-duplicate'); hoursCol.appendChild(hourDiv); }
    for (let i = 60 - TIME_PICKER_BUFFER; i < 60; i++) { const minuteDiv = document.createElement('div'); minuteDiv.textContent = String(i).padStart(2,'0'); minuteDiv.classList.add('time-picker-duplicate'); minutesCol.appendChild(minuteDiv); }
    for (let i = 0; i < 60; i++) { const minuteDiv = document.createElement('div'); minuteDiv.textContent = String(i).padStart(2,'0'); minutesCol.appendChild(minuteDiv); }
    for (let i = 0; i < TIME_PICKER_BUFFER; i++) { const minuteDiv = document.createElement('div'); minuteDiv.textContent = String(i).padStart(2,'0'); minuteDiv.classList.add('time-picker-duplicate'); minutesCol.appendChild(minuteDiv); }
    let scrollTimeout;
    [hoursCol, minutesCol].forEach((col, index) => { col.addEventListener('scroll', () => { clearTimeout(scrollTimeout); scrollTimeout = setTimeout(() => { const scrollTop = col.scrollTop; const itemHeight = TIME_PICKER_ITEM_HEIGHT; const realItems = (index === 0) ? 24 : 60; const selectedIndex = Math.round(scrollTop / itemHeight); if (selectedIndex < TIME_PICKER_BUFFER) { col.scrollTo({ top: (selectedIndex + realItems) * itemHeight, behavior: 'instant' }); } else if (selectedIndex >= (realItems + TIME_PICKER_BUFFER)) { col.scrollTo({ top: (selectedIndex - realItems) * itemHeight, behavior: 'instant' }); } else { col.scrollTo({ top: selectedIndex * itemHeight, behavior: 'smooth' }); } }, 150); }); });
}

export function updateTimePicker(hour, minute) {
    if (!DOMElements['hours-column'] || !DOMElements['minutes-column']) return;
    DOMElements['hours-column'].scrollTop = (hour + TIME_PICKER_BUFFER) * TIME_PICKER_ITEM_HEIGHT;
    DOMElements['minutes-column'].scrollTop = (minute + TIME_PICKER_BUFFER) * TIME_PICKER_ITEM_HEIGHT;
    DOMElements['hours-column'].dispatchEvent(new Event('scroll'));
    DOMElements['minutes-column'].dispatchEvent(new Event('scroll'));
}

export function getTimeFromPicker() {
    if (!DOMElements['hours-column'] || !DOMElements['minutes-column']) return [0,0];
    const hoursCol = DOMElements['hours-column']; const minutesCol = DOMElements['minutes-column'];
    let selectedHour = 0; let minHourDiff = Infinity;
    hoursCol.querySelectorAll('div').forEach(div => { const divCenter = div.offsetTop + (div.offsetHeight / 2); const diff = Math.abs(divCenter - (hoursCol.scrollTop + (hoursCol.offsetHeight / 2))); if (diff < minHourDiff) { minHourDiff = diff; selectedHour = parseInt(div.textContent); } });
    let selectedMinute = 0; let minMinuteDiff = Infinity;
    minutesCol.querySelectorAll('div').forEach(div => { const divCenter = div.offsetTop + (div.offsetHeight / 2); const diff = Math.abs(divCenter - (minutesCol.scrollTop + (minutesCol.offsetHeight / 2))); if (diff < minMinuteDiff) { minMinuteDiff = diff; selectedMinute = parseInt(div.textContent); } });
    return [selectedHour, selectedMinute];
}
