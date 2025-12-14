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
        console.log('snapColumn called, isUpdating:', isUpdating);
        const itemHeight = TIME_PICKER_ITEM_HEIGHT;
        const realItems = (index === 0) ? 24 : 60;
        const currentIndex = Math.round(col.scrollTop / itemHeight);
        if (currentIndex < TIME_PICKER_BUFFER) {
            col.scrollTop = (currentIndex + realItems) * itemHeight;
        } else if (currentIndex >= (realItems + TIME_PICKER_BUFFER)) {
            col.scrollTop = (currentIndex - realItems) * itemHeight;
        }
    }

    [hoursCol, minutesCol].forEach((col, index) => {
        // snap after scrolling stops
        col.addEventListener('scroll', () => {
            if (isUpdating) return;
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

let isUpdating = false;

export function updateTimePicker(hour, minute) {
    if (!DOMElements['hours-column'] || !DOMElements['minutes-column']) return;
    console.log('=== updateTimePicker ===');
    console.log('Input:', hour, minute);
    
    const targetScrollHour = (hour + TIME_PICKER_BUFFER) * TIME_PICKER_ITEM_HEIGHT;
    const targetScrollMinute = (minute + TIME_PICKER_BUFFER) * TIME_PICKER_ITEM_HEIGHT;
    console.log('Target scroll:', targetScrollHour, targetScrollMinute);
    
    isUpdating = true;
    DOMElements['hours-column'].scrollTop = targetScrollHour;
    DOMElements['minutes-column'].scrollTop = targetScrollMinute;
    console.log('Actual scroll after set:', DOMElements['hours-column'].scrollTop, DOMElements['minutes-column'].scrollTop);
    setTimeout(() => { 
        isUpdating = false;
        console.log('isUpdating = false');
    }, 500);
}

export function getTimeFromPicker() {
    if (!DOMElements['hours-column'] || !DOMElements['minutes-column']) return [0,0];
    const hoursCol = DOMElements['hours-column']; const minutesCol = DOMElements['minutes-column'];
    console.log('=== getTimeFromPicker ===');
    console.log('ScrollTop:', hoursCol.scrollTop, minutesCol.scrollTop);
    
    const hourIndex = Math.round(hoursCol.scrollTop / TIME_PICKER_ITEM_HEIGHT) - TIME_PICKER_BUFFER;
    const minuteIndex = Math.round(minutesCol.scrollTop / TIME_PICKER_ITEM_HEIGHT) - TIME_PICKER_BUFFER;
    console.log('Result:', hourIndex, minuteIndex);
    return [hourIndex, minuteIndex];
}
