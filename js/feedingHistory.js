// feedingHistory.js - Feeding history tracking and chart display
import { db, ref, onValue, query, orderByChild, startAt, push, set } from './firebaseConfig.js';
import { state } from './state.js';
import { t } from './translations.js';

let feedingChart = null;
let currentPeriod = 'day';

export function setupFeedingHistory() {
    console.log('[FeedingHistory] setupFeedingHistory called, deviceId:', state.currentDeviceId);
    const filterButtons = document.querySelectorAll('.filter-btn');
    console.log('[FeedingHistory] Filter buttons found:', filterButtons.length);
    
    if (filterButtons.length > 0) {
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentPeriod = btn.dataset.period;
                console.log('[FeedingHistory] Button clicked, loading period:', currentPeriod);
                loadFeedingHistory(currentPeriod);
            });
        });
    }
    
    // โหลดข้อมูลทันที
    console.log('[FeedingHistory] Loading initial data for period:', currentPeriod);
    loadFeedingHistory(currentPeriod);
}

async function loadFeedingHistory(period) {
    console.log('[FeedingHistory] loadFeedingHistory called, deviceId:', state.currentDeviceId, 'period:', period);
    if (!state.currentDeviceId) {
        console.error('[FeedingHistory] No device ID!');
        return;
    }
    
    const now = new Date();
    let startTime;
    
    switch(period) {
        case 'day':
            // ตัดที่เที่ยงคืนของวันนี้ (00:00:00)
            const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            startTime = todayMidnight.getTime();
            break;
        case 'week':
            // ย้อนหลัง 7 วันตั้งแต่เที่ยงคืน
            const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
            startTime = weekStart.getTime();
            break;
        case 'month':
            startTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
            break;
        default:
            const defaultMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            startTime = defaultMidnight.getTime();
    }
    
    const historyRef = ref(db, `device/${state.currentDeviceId}/feedingHistory`);
    const historyQuery = query(historyRef, orderByChild('timestamp'), startAt(startTime));
    console.log('[FeedingHistory] Query path:', `device/${state.currentDeviceId}/feedingHistory`, 'startTime:', new Date(startTime));
    
    onValue(historyQuery, (snapshot) => {
        console.log('[FeedingHistory] Snapshot received, exists:', snapshot.exists());
        const feedingData = [];
        snapshot.forEach(child => {
            const data = child.val();
            console.log('[FeedingHistory] Data item:', data);
            if (data.timestamp && data.amount) {
                feedingData.push({
                    timestamp: data.timestamp,
                    amount: data.amount
                });
            }
        });
        
        console.log('[FeedingHistory] Total feeding data found:', feedingData.length, feedingData);
        feedingData.sort((a, b) => a.timestamp - b.timestamp);
        updateChart(feedingData, period);
        updateStats(feedingData);
    }, { onlyOnce: true });
}

function updateChart(data, period) {
    console.log('[FeedingHistory] updateChart called, data length:', data.length);
    const canvas = document.getElementById('feedingChart');
    console.log('[FeedingHistory] Canvas found:', !!canvas, 'Chart.js loaded:', typeof Chart !== 'undefined');
    if (!canvas || typeof Chart === 'undefined') {
        console.error('[FeedingHistory] Canvas or Chart.js not available!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (feedingChart) {
        feedingChart.destroy();
    }
    
    if (data.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Kanit';
        ctx.fillStyle = '#999';
        ctx.textAlign = 'center';
        ctx.fillText(t('noFeedingHistory'), canvas.width / 2, canvas.height / 2);
        updateStats([]);
        return;
    }
    
    const labels = [];
    const amounts = [];
    const backgroundColors = [];
    const borderColors = [];
    const lang = localStorage.getItem('pawtonomous_language') || 'th';
    
    // สีประจำวัน (อาทิตย์=0, จันทร์=1, ..., เสาร์=6)
    const dayColors = [
        { bg: 'rgba(233, 30, 99, 0.6)', border: 'rgba(233, 30, 99, 1)' },      // อาทิตย์ - แดง
        { bg: 'rgba(255, 193, 7, 0.6)', border: 'rgba(255, 193, 7, 1)' },      // จันทร์ - เหลือง
        { bg: 'rgba(255, 87, 34, 0.6)', border: 'rgba(255, 87, 34, 1)' },      // อังคาร - ชมพู/ส้ม
        { bg: 'rgba(76, 175, 80, 0.6)', border: 'rgba(76, 175, 80, 1)' },      // พุธ - เขียว
        { bg: 'rgba(255, 152, 0, 0.6)', border: 'rgba(255, 152, 0, 1)' },      // พฤหัส - ส้ม
        { bg: 'rgba(33, 150, 243, 0.6)', border: 'rgba(33, 150, 243, 1)' },    // ศุกร์ - ฟ้า
        { bg: 'rgba(187, 134, 252, 0.6)', border: 'rgba(187, 134, 252, 1)' }   // เสาร์ - ม่วง
    ];
    
    data.forEach(item => {
        const date = new Date(item.timestamp);
        const dayOfWeek = date.getDay(); // 0=อาทิตย์, 1=จันทร์, ..., 6=เสาร์
        let label;
        
        if (period === 'day') {
            label = date.toLocaleTimeString(lang === 'th' ? 'th-TH' : lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US', { hour: '2-digit', minute: '2-digit' });
            backgroundColors.push(dayColors[dayOfWeek].bg);
            borderColors.push(dayColors[dayOfWeek].border);
        } else {
            label = date.toLocaleDateString(lang === 'th' ? 'th-TH' : lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' });
            backgroundColors.push(dayColors[dayOfWeek].bg);
            borderColors.push(dayColors[dayOfWeek].border);
        }
        
        labels.push(label);
        amounts.push(item.amount);
    });
    
    feedingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: t('amountLabel'),
                data: amounts,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: { family: 'Kanit', size: 14 },
                    bodyFont: { family: 'Kanit', size: 12 },
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { family: 'Kanit' },
                        callback: function(value) {
                            return value + ' g';
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        font: { family: 'Kanit', size: 10 },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function updateStats(data) {
    const totalCount = data.length;
    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
    const avgAmount = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;
    
    const totalCountEl = document.getElementById('totalFeedingsCount');
    const totalAmountEl = document.getElementById('totalFeedingsAmount');
    const avgAmountEl = document.getElementById('avgFeedingAmount');
    
    if (totalCountEl) totalCountEl.textContent = totalCount;
    if (totalAmountEl) totalAmountEl.textContent = `${totalAmount} g`;
    if (avgAmountEl) avgAmountEl.textContent = `${avgAmount} g`;
}


