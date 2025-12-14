// feedingHistory.js - Feeding history tracking and chart display
import { db, ref, onValue, query, orderByChild, startAt, push, set } from './firebaseConfig.js';
import { state } from './state.js';
import { t } from './translations.js';

let feedingChart = null;
let currentPeriod = 'day';

export function setupFeedingHistory() {
    console.log('setupFeedingHistory called');
    const filterButtons = document.querySelectorAll('.filter-btn');
    console.log('Filter buttons found:', filterButtons.length);
    if (filterButtons.length === 0) return;
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            loadFeedingHistory(currentPeriod);
        });
    });
    
    setTimeout(() => {
        console.log('Loading feeding history for period: day');
        loadFeedingHistory('day');
    }, 100);
}

async function loadFeedingHistory(period) {
    console.log('loadFeedingHistory called, deviceId:', state.currentDeviceId, 'period:', period);
    if (!state.currentDeviceId) {
        console.log('No device ID, returning');
        return;
    }
    
    const now = Date.now();
    let startTime;
    
    switch(period) {
        case 'day':
            startTime = now - (24 * 60 * 60 * 1000);
            break;
        case 'week':
            startTime = now - (7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startTime = now - (30 * 24 * 60 * 60 * 1000);
            break;
        default:
            startTime = now - (24 * 60 * 60 * 1000);
    }
    
    const historyRef = ref(db, `device/${state.currentDeviceId}/feedingHistory`);
    const historyQuery = query(historyRef, orderByChild('timestamp'), startAt(startTime));
    
    onValue(historyQuery, (snapshot) => {
        const feedingData = [];
        snapshot.forEach(child => {
            const data = child.val();
            console.log('Feeding history data:', data);
            if (data.timestamp && data.amount) {
                feedingData.push({
                    timestamp: data.timestamp,
                    amount: data.amount,
                    mealName: data.mealName || t('feedNow')
                });
            }
        });
        
        console.log('Feeding data found:', feedingData.length, feedingData);
        feedingData.sort((a, b) => a.timestamp - b.timestamp);
        updateChart(feedingData, period);
        updateStats(feedingData);
    }, { onlyOnce: true });
}

function updateChart(data, period) {
    const canvas = document.getElementById('feedingChart');
    console.log('updateChart called, canvas:', canvas, 'data length:', data.length, 'Chart available:', typeof Chart !== 'undefined');
    if (!canvas) return;
    
    if (typeof Chart === 'undefined') {
        console.log('Chart.js not loaded!');
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
    const lang = localStorage.getItem('pawtonomous_language') || 'th';
    
    data.forEach(item => {
        const date = new Date(item.timestamp);
        let label;
        
        if (period === 'day') {
            label = date.toLocaleTimeString(lang === 'th' ? 'th-TH' : lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US', { hour: '2-digit', minute: '2-digit' });
        } else {
            label = date.toLocaleDateString(lang === 'th' ? 'th-TH' : lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' });
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
                backgroundColor: 'rgba(187, 134, 252, 0.6)',
                borderColor: 'rgba(187, 134, 252, 1)',
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


