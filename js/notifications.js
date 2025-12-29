// notifications.js - notification listeners and display
import { ref, onValue, query, orderByChild, update } from './firebaseConfig.js';
import { state } from './state.js';
import { DOMElements, showNewNotificationToast, showCustomAlert } from './ui.js';

const NOTIFICATION_HISTORY_LIMIT = 50;

export function setupNotificationListener(db) {
    if (!state.currentDeviceId) return;
    const notificationsRef = ref(db, `device/${state.currentDeviceId}/notifications`);
    onValue(notificationsRef, (snapshot) => {
        if (!snapshot.exists()) { displayNotificationsList([]); return; }
        const notifications = [];
        snapshot.forEach(child => { const data = child.val(); notifications.push({ id: child.key, message: data.message, timestamp: data.timestamp, read: data.read, type: data.type || 'info' }); });
        notifications.sort((a,b) => b.timestamp - a.timestamp);
        displayNotificationsList(notifications);
        const latest = notifications[0];
        if (latest && latest.id !== state.lastNotificationId) {
            state.lastNotificationId = latest.id;
            showNewNotificationToast(latest.message);
            
            // แสดง Alert ถ้าเป็น warning ที่เกี่ยวกับเครื่องไม่ว่าง
            if (latest.type === 'warning' && latest.message.includes('เครื่องกำลังทำงานอยู่')) {
                showCustomAlert('เครื่องไม่ว่าง', latest.message, 'warning');
            }
        }
        // schedule cleanup
        setTimeout(() => cleanupOldNotifications(db), 10000);
    });
}

export async function fetchAndDisplayNotifications(db) {
    if (!state.currentDeviceId) return;
    const notificationsRef = ref(db, `device/${state.currentDeviceId}/notifications`);
    // Use onValue once
    onValue(notificationsRef, (snapshot) => {
        if (!snapshot.exists()) { displayNotificationsList([]); return; }
        const notifications = [];
        snapshot.forEach(child => { const data = child.val(); notifications.push({ id: child.key, message: data.message, timestamp: data.timestamp, read: data.read, type: data.type || 'info' }); });
        notifications.sort((a,b) => b.timestamp - a.timestamp);
        displayNotificationsList(notifications);
    }, { onlyOnce: true });
}

export function displayNotificationsList(notifications) {
    const list = DOMElements?.notificationHistoryList || document.getElementById('notificationHistoryList');
    if (!list) return;
    list.innerHTML = '';
    if (notifications.length === 0) { list.innerHTML = '<li>ไม่มีการแจ้งเตือน</li>'; return; }
    notifications.forEach(n => {
        const li = document.createElement('li');
        const date = new Date(n.timestamp);
        const formattedDate = date.toLocaleString('en-GB', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
        li.innerHTML = `<span>${n.message}</span><span class="notification-timestamp">${formattedDate}</span>`;
        list.appendChild(li);
    });
}

export async function cleanupOldNotifications(db) {
    if (!state.currentDeviceId) return;
    const notificationsRef = ref(db, `device/${state.currentDeviceId}/notifications`);
    onValue(query(notificationsRef, orderByChild('timestamp')), async (snapshot) => {
        const notifications = [];
        snapshot.forEach(child => notifications.push({ key: child.key, ...child.val() }));
        if (notifications.length > NOTIFICATION_HISTORY_LIMIT) {
            notifications.sort((a,b) => a.timestamp - b.timestamp);
            const toDelete = notifications.slice(0, notifications.length - NOTIFICATION_HISTORY_LIMIT);
            const updates = {};
            toDelete.forEach(n => updates[n.key] = null);
            await update(notificationsRef, updates);
        }
    }, { onlyOnce: true });
}
