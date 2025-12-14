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
        if (!allowSnap) {
            console.log('snapColumn blocked by allowSnap');
            return;
        }
        console.log('snapColumn called, isUpdating:', isUpdating, 'scrollTop before:', col.scrollTop);
        const itemHeight = TIME_PICKER_ITEM_HEIGHT;
        const realItems = (index === 0) ? 24 : 60;
        const currentIndex = Math.round(col.scrollTop / itemHeight);
        if (currentIndex < TIME_PICKER_BUFFER) {
            col.scrollTop = (currentIndex + realItems) * itemHeight;
            console.log('Wrapped forward, scrollTop after:', col.scrollTop);
        } else if (currentIndex >= (realItems + TIME_PICKER_BUFFER)) {
            col.scrollTop = (currentIndex - realItems) * itemHeight;
            console.log('Wrapped backward, scrollTop after:', col.scrollTop);
        }
    }

    [hoursCol, minutesCol].forEach((col, index) => {
        // snap after scrolling stops
        col.addEventListener('scroll', () => {
            if (isUpdating) {
                console.log('Scroll event blocked by isUpdating');
                return;
            }
            userHasScrolled = true;
            targetHour = null;
            targetMinute = null;
            console.log('Scroll event triggered, scrollTop:', col.scrollTop);
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
        col.addEventListener('pointerdown', (ev) => { 
            userHasScrolled = true;
            targetHour = null;
            targetMinute = null;
            allowSnap = true;
            col.style.scrollBehavior = 'auto';
            isPointerDown = true; startY = ev.clientY; startScroll = col.scrollTop; col.setPointerCapture(ev.pointerId); 
        });
        col.addEventListener('pointerup', (ev) => { 
            if (!isPointerDown) return; 
            isPointerDown = false; 
            col.releasePointerCapture(ev.pointerId); 
            const finalScroll = col.scrollTop;
            setTimeout(() => {
                col.scrollTop = finalScroll;
                snapColumn(col, index);
            }, 100);
        });
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
let targetHour = null;
let targetMinute = null;
let userHasScrolled = false;
let allowSnap = true;

export function updateTimePicker(hour, minute) {
    if (!DOMElements['hours-column'] || !DOMElements['minutes-column']) return;
    console.log('=== updateTimePicker ===');
    console.log('Input:', hour, minute);
    
    targetHour = hour;
    targetMinute = minute;
    userHasScrolled = false;
    allowSnap = false;
    isUpdating = true;
    
    const hourCol = DOMElements['hours-column'];
    const minCol = DOMElements['minutes-column'];
    
    const hourIndex = hour + TIME_PICKER_BUFFER;
    const minuteIndex = minute + TIME_PICKER_BUFFER;
    
    const hourItem = hourCol.children[hourIndex];
    const minuteItem = minCol.children[minuteIndex];
    
    if (hourItem && minuteItem) {
        hourCol.style.scrollBehavior = 'auto';
        minCol.style.scrollBehavior = 'auto';
        
        const targetScrollHour = hourIndex * TIME_PICKER_ITEM_HEIGHT - (hourCol.clientHeight / 2) + (TIME_PICKER_ITEM_HEIGHT / 2);
        const targetScrollMinute = minuteIndex * TIME_PICKER_ITEM_HEIGHT - (minCol.clientHeight / 2) + (TIME_PICKER_ITEM_HEIGHT / 2);
        
        hourCol.scrollTop = targetScrollHour;
        minCol.scrollTop = targetScrollMinute;
        console.log('Final scroll:', hourCol.scrollTop, minCol.scrollTop);
    }
    
    setTimeout(() => {
        isUpdating = false;
        console.log('isUpdating = false');
    }, 200);
}

export function getTimeFromPicker() {
    if (!DOMElements['hours-column'] || !DOMElements['minutes-column']) return [0,0];
    
    if (!userHasScrolled && targetHour !== null && targetMinute !== null) {
        console.log('=== getTimeFromPicker (using target) ===');
        console.log('Result:', targetHour, targetMinute);
        return [targetHour, targetMinute];
    }
    
    const hoursCol = DOMElements['hours-column']; const minutesCol = DOMElements['minutes-column'];
    console.log('=== getTimeFromPicker ===');
    console.log('ScrollTop:', hoursCol.scrollTop, minutesCol.scrollTop);
    
    const centerY = hoursCol.clientHeight / 2;
    
    let closestHourIndex = 0;
    let closestHourDist = Infinity;
    for (let i = 0; i < hoursCol.children.length; i++) {
        const item = hoursCol.children[i];
        const itemTop = item.offsetTop - hoursCol.scrollTop;
        const itemCenter = itemTop + (TIME_PICKER_ITEM_HEIGHT / 2);
        const dist = Math.abs(itemCenter - centerY);
        if (dist < closestHourDist) {
            closestHourDist = dist;
            closestHourIndex = i;
        }
    }
    
    let closestMinuteIndex = 0;
    let closestMinuteDist = Infinity;
    for (let i = 0; i < minutesCol.children.length; i++) {
        const item = minutesCol.children[i];
        const itemTop = item.offsetTop - minutesCol.scrollTop;
        const itemCenter = itemTop + (TIME_PICKER_ITEM_HEIGHT / 2);
        const dist = Math.abs(itemCenter - centerY);
        if (dist < closestMinuteDist) {
            closestMinuteDist = dist;
            closestMinuteIndex = i;
        }
    }
    
    console.log('Closest indices:', closestHourIndex, closestMinuteIndex);
    console.log('Closest items text:', hoursCol.children[closestHourIndex]?.textContent, minutesCol.children[closestMinuteIndex]?.textContent);
    
    let hourIndex = closestHourIndex - TIME_PICKER_BUFFER;
    let minuteIndex = closestMinuteIndex - TIME_PICKER_BUFFER;
    
    console.log('After subtracting BUFFER:', hourIndex, minuteIndex);
    
    if (hourIndex < 0) hourIndex += 24;
    if (hourIndex >= 24) hourIndex -= 24;
    if (minuteIndex < 0) minuteIndex += 60;
    if (minuteIndex >= 60) minuteIndex -= 60;
    
    console.log('After wrapping:', hourIndex, minuteIndex);
    
    hourIndex = Math.max(0, Math.min(23, hourIndex));
    minuteIndex = Math.max(0, Math.min(59, minuteIndex));
    
    console.log('Result:', hourIndex, minuteIndex);
    return [hourIndex, minuteIndex];
}
