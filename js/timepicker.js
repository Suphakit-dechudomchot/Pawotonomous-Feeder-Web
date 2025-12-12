// timepicker.js - custom time picker setup and helpers
import { DOMElements } from './ui.js';

const TIME_PICKER_BUFFER = 5;
const TIME_PICKER_ITEM_HEIGHT = 50;

export function setupCustomTimePicker() {
    if (!DOMElements['hours-column'] || !DOMElements['minutes-column']) return;
    const hoursCol = DOMElements['hours-column']; const minutesCol = DOMElements['minutes-column'];
    hoursCol.innerHTML = '';
    minutesCol.innerHTML = '';
    // helper to create an item div with consistent styling and behaviors
    function makeItem(text, isDuplicate = false) {
        const div = document.createElement('div');
        div.textContent = text;
        div.classList.add('time-picker-item');
        if (isDuplicate) div.classList.add('time-picker-duplicate');
        // ensure consistent height so snapping works reliably
        div.style.height = `${TIME_PICKER_ITEM_HEIGHT}px`;
        div.style.lineHeight = `${TIME_PICKER_ITEM_HEIGHT}px`;
        div.tabIndex = 0; // allow keyboard focus
        return div;
    }

    for (let i = 24 - TIME_PICKER_BUFFER; i < 24; i++) hoursCol.appendChild(makeItem(String(i).padStart(2,'0'), true));
    for (let i = 0; i < 24; i++) hoursCol.appendChild(makeItem(String(i).padStart(2,'0')));
    for (let i = 0; i < TIME_PICKER_BUFFER; i++) hoursCol.appendChild(makeItem(String(i).padStart(2,'0'), true));

    for (let i = 60 - TIME_PICKER_BUFFER; i < 60; i++) minutesCol.appendChild(makeItem(String(i).padStart(2,'0'), true));
    for (let i = 0; i < 60; i++) minutesCol.appendChild(makeItem(String(i).padStart(2,'0')));
    for (let i = 0; i < TIME_PICKER_BUFFER; i++) minutesCol.appendChild(makeItem(String(i).padStart(2,'0'), true));

    // Improved interactions: click-to-select, wheel step, pointer drag, and keyboard
    let scrollTimeout;
    const snapDelay = 90; // faster snap for snappier feel

    function snapColumn(col, index) {
        const itemHeight = TIME_PICKER_ITEM_HEIGHT;
        const realItems = (index === 0) ? 24 : 60;
        const selectedIndex = Math.round(col.scrollTop / itemHeight);
        if (selectedIndex < TIME_PICKER_BUFFER) {
            col.scrollTop = (selectedIndex + realItems) * itemHeight;
        } else if (selectedIndex >= (realItems + TIME_PICKER_BUFFER)) {
            col.scrollTop = (selectedIndex - realItems) * itemHeight;
        } else {
            col.scrollTop = selectedIndex * itemHeight;
        }
    }

    [hoursCol, minutesCol].forEach((col, index) => {
        // snap after scrolling stops
        col.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => snapColumn(col, index), snapDelay);
        });

        // wheel: move one item per wheel tick for precision
        col.addEventListener('wheel', (ev) => {
            ev.preventDefault();
            const delta = Math.sign(ev.deltaY);
            col.scrollTop += delta * TIME_PICKER_ITEM_HEIGHT;
        }, { passive: false });

        // click to select an item
        col.addEventListener('click', (ev) => {
            const item = ev.target.closest('.time-picker-item');
            if (!item) return;
            // compute index of clicked item among all children
            const children = Array.from(col.children);
            const idx = children.indexOf(item);
            if (idx >= 0) {
                col.scrollTop = idx * TIME_PICKER_ITEM_HEIGHT;
                // snap immediately
                snapColumn(col, index);
            }
        });

        // pointer drag: enhance touch/mouse dragging
        let isPointerDown = false; let startY = 0; let startScroll = 0;
        col.addEventListener('pointerdown', (ev) => { isPointerDown = true; startY = ev.clientY; startScroll = col.scrollTop; col.setPointerCapture(ev.pointerId); });
        col.addEventListener('pointermove', (ev) => { if (!isPointerDown) return; const dy = startY - ev.clientY; col.scrollTop = startScroll + dy; });
        col.addEventListener('pointerup', (ev) => { if (!isPointerDown) return; isPointerDown = false; col.releasePointerCapture(ev.pointerId); snapColumn(col, index); });

        // keyboard: up/down arrows
        col.addEventListener('keydown', (ev) => {
            if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
                ev.preventDefault();
                const dir = ev.key === 'ArrowUp' ? -1 : 1;
                col.scrollTop += dir * TIME_PICKER_ITEM_HEIGHT;
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => snapColumn(col, index), snapDelay);
            }
        });
    });
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
