// Orchestrator: imports modular JS and wires app behavior
import { db, auth, signInAnonymously, onAuthStateChanged, signOut, ref, onValue, set, update, remove, push, query, orderByChild, limitToLast, limitToFirst, serverTimestamp, supabaseClient } from './js/firebaseConfig.js';
import { populateDOMElements, DOMElements, showModal, hideModal, setButtonState, showCustomAlert, showNewNotificationToast, showSection, setupCustomSelects } from './js/ui.js';
import { state } from './js/state.js';
import { sanitizeFileName, clamp, debounce } from './js/utils.js';
import { openCalibrationModal, startCalibrationTest, saveCalibration } from './js/calibration.js';
import { loadMeals, addMealCard, openMealDetailModal, closeMealDetailModal, saveMealDetail, deleteMealDetail } from './js/meals.js';
import { sendCommand, feedNow, playMakeNoise } from './js/dashboard.js';
import { setupNotificationListener, fetchAndDisplayNotifications, cleanupOldNotifications } from './js/notifications.js';
import { setupCustomTimePicker, updateTimePicker, getTimeFromPicker } from './js/timepicker.js';
import { startCountdown, stopCountdown, updateCountdownDisplay } from './js/countdown.js';
import { populateAnimalType, updateAnimalSpecies, updateRecommendedAmount } from './js/animalCalculator.js';
import { t, setLanguage, getLanguage } from './js/translations.js';

// Constants
const CALIBRATION_TEST_SECONDS = 5;
const NOTIFICATION_HISTORY_LIMIT = 50;
const MEAL_BLOCK_DURATION_SECONDS = {
    movementCheck: 3 * 60,
    cooldown: 30,
};

const HEARTBEAT_THRESHOLD_MS = 20000;

// Try to load `sounds.json` manifest; fallback to simple inline manifest.
const INLINE_SOUND_MANIFEST = [
    { index: 1, label: 'Meow 1', filename: '001.mp3', url: '' },
    { index: 2, label: 'Meow 2', filename: '002.mp3', url: '' },
    { index: 3, label: 'Bark 1', filename: '003.mp3', url: '' }
];

async function loadSoundManifest() {
    try {
        const resp = await fetch('./sounds.json');
        if (!resp.ok) throw new Error('fetch failed');
        const m = await resp.json();
        return m;
    } catch (e) { return INLINE_SOUND_MANIFEST; }
}

async function populateSoundSelects() {
    const manifest = await loadSoundManifest();
    const selects = [DOMElements.soundSelectionSelect, DOMElements.mealAudioSelect, DOMElements.feedNowAudioSelect, DOMElements.makenoiseSelect];
    selects.forEach(sel => {
        if (!sel) return;
        sel.innerHTML = '';
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = t('noSelection');
        sel.appendChild(emptyOpt);
        manifest.forEach(s => {
            const o = document.createElement('option');
            o.value = String(s.index);
            o.textContent = `${String(s.index).padStart(3,'0')} — ${s.label}`;
            sel.appendChild(o);
        });
    });
    // enable/show preview labels
    if (DOMElements.mealAudioStatus) DOMElements.mealAudioStatus.textContent = '-';
    if (DOMElements.feedNowAudioStatus) DOMElements.feedNowAudioStatus.textContent = '-';
}

function computeOnlineFromStatus(status) {
    if (!status) return false;
    const lastSeen = status.lastSeen || status.lastSeenTimestamp || status.last_seen || null;
    if (lastSeen && typeof lastSeen === 'number') return Math.abs(Date.now() - lastSeen) <= HEARTBEAT_THRESHOLD_MS;
    if (typeof status.online === 'boolean') return status.online;
    return false;
}

function updateDeviceStatusUI(isOnline) {
    if (!DOMElements.deviceStatusText) return;
    
    const deviceStatusIcon = document.getElementById('deviceStatusIcon');
    if (deviceStatusIcon) {
        deviceStatusIcon.className = `fa-solid fa-microchip ${isOnline ? 'online' : 'offline'}`;
    }
    
    DOMElements.deviceStatusText.className = `status-text ${isOnline ? 'online' : 'offline'}`;
    DOMElements.deviceStatusText.textContent = isOnline ? t('deviceOnline') : t('deviceOffline');
    
    // Update buttons based on both web and device status
    const webOnline = navigator.onLine;
    const canSendCommands = isOnline && webOnline;
    
    [DOMElements.checkFoodLevelBtn, DOMElements.checkAnimalMovementBtn].forEach(btn => { 
        if (btn) {
            btn.disabled = !canSendCommands;
            btn.classList.toggle('requires-online', !canSendCommands);
        }
    });
    
    if (DOMElements.feedNowBtn) { 
        const amount = parseFloat(DOMElements.feedNowAmountInput?.value || '0');
        DOMElements.feedNowBtn.disabled = !canSendCommands || isNaN(amount) || amount <= 0;
        DOMElements.feedNowBtn.classList.toggle('requires-online', !canSendCommands);
    }
    
    if (DOMElements.makenoiseBtn) { 
        DOMElements.makenoiseBtn.disabled = !canSendCommands || !DOMElements.makenoiseSelect?.value;
        DOMElements.makenoiseBtn.classList.toggle('requires-online', !canSendCommands);
    }
}

function updateWebConnectionStatus(isOnline) {
    const webStatusIcon = document.getElementById('webStatusIcon');
    const webConnectionStatus = document.getElementById('webConnectionStatus');
    const offlineBanner = document.getElementById('offlineBanner');
    
    if (webStatusIcon) {
        webStatusIcon.className = isOnline ? 'fa-solid fa-wifi online' : 'fa-solid fa-wifi-slash offline';
    }
    
    if (webConnectionStatus) {
        webConnectionStatus.className = `status-text ${isOnline ? 'online' : 'offline'}`;
        webConnectionStatus.textContent = isOnline ? t('webOnline') : t('webOffline');
    }
    
    if (offlineBanner) {
        offlineBanner.style.display = isOnline ? 'none' : 'flex';
    }
    
    document.body.classList.toggle('web-offline', !isOnline);
    
    // Re-update device status UI to reflect web connection changes
    if (state.currentDeviceId) {
        const deviceOnline = DOMElements.deviceStatusText?.classList.contains('online');
        updateDeviceStatusUI(deviceOnline);
    }
}

function listenToDeviceStatus() {
    if (!state.currentDeviceId) return;
    const statusRef = ref(db, `device/${state.currentDeviceId}/status`);
    onValue(statusRef, (snapshot) => {
        const status = snapshot.val() || {};
        const isOnline = computeOnlineFromStatus(status);
        updateDeviceStatusUI(isOnline);
        if ('foodLevel' in status) updateFoodLevelDisplay(status.foodLevel); else updateFoodLevelDisplay(null);
        if (DOMElements.lastMovementDisplay) {
            const lm = status.lastMovementDetected || status.lastMovement || null;
            DOMElements.lastMovementDisplay.textContent = lm ? new Date(lm).toLocaleString('th-TH', { timeStyle: 'short', dateStyle: 'short' }) : t('noData');
        }
    });
}

async function updateFoodLevelDisplay(foodLevelCm) {
    if (!DOMElements.currentFoodLevelDisplay) return;
    try {
        const settingsSnapshot = await new Promise(resolve => { onValue(ref(db, `device/${state.currentDeviceId}/settings`), s => resolve(s), { onlyOnce: true }); });
        const settings = settingsSnapshot.val() || {};
        let bottleHeight = 0;
        if (settings.bottleSize === 'custom') bottleHeight = parseFloat(settings.customBottleHeight || 0);
        else if (settings.bottleSize) bottleHeight = parseFloat(settings.bottleSize || 0);
        if (isNaN(foodLevelCm) || foodLevelCm === null || bottleHeight <= 0) { DOMElements.currentFoodLevelDisplay.textContent = '- %'; return; }
        const remainingHeight = bottleHeight - foodLevelCm;
        const percentage = clamp((remainingHeight / bottleHeight) * 100, 0, 100);
        DOMElements.currentFoodLevelDisplay.textContent = `${Math.round(percentage)} %`;
    } catch (err) { DOMElements.currentFoodLevelDisplay.textContent = 'Error'; }
}

async function loadSettingsFromFirebase() {
    if (!state.currentDeviceId || !state.isAuthReady) return;
    try {
        const snapshot = await new Promise(resolve => { onValue(ref(db, `device/${state.currentDeviceId}/settings`), s => resolve(s), { onlyOnce: true }); });
        const settings = snapshot.val() || {};
        state.gramsPerSecond = settings.calibration?.grams_per_second || null;
        // owner name
        if (DOMElements.ownerNameDisplay) DOMElements.ownerNameDisplay.textContent = settings.ownerName ? `${t('accountText')} ${settings.ownerName}` : `${t('accountText')} ${t('noDataText')}`;
        if (DOMElements.timeZoneOffsetSelect) DOMElements.timeZoneOffsetSelect.value = settings.timeZoneOffset ?? '';
        if (DOMElements.wifiSsidInput) DOMElements.wifiSsidInput.value = settings.wifiCredentials?.ssid ?? '';
        if (DOMElements.wifiPasswordInput) DOMElements.wifiPasswordInput.value = settings.wifiCredentials?.password ?? '';
        if (DOMElements.currentGramsPerSecondDisplay) DOMElements.currentGramsPerSecondDisplay.textContent = state.gramsPerSecond ? `${state.gramsPerSecond.toFixed(2)} ${t('gramsPerSecond')}` : `${t('noDataText')} ${t('gramsPerSecond')}`;
        if (DOMElements.soundSelectionSelect) DOMElements.soundSelectionSelect.value = settings.sound_selection ?? '';
        await checkInitialSetupComplete();
    } catch (error) { await showCustomAlert(t('error'), t('cannotLoadData'), 'error'); }
}

const saveSettingsToFirebase = debounce(async (settingType) => {
    if (!state.currentDeviceId || !state.isAuthReady) { await showCustomAlert(t('error'), t('enterDeviceIdMsg'), 'error'); return; }
    try {
        const updates = {};
        if (settingType === 'timezone') updates.timeZoneOffset = parseFloat(DOMElements.timeZoneOffsetSelect.value);
        // bottle size setting removed — nothing to do here anymore
        else if (settingType === 'wifi') updates.wifiCredentials = { ssid: DOMElements.wifiSsidInput.value, password: DOMElements.wifiPasswordInput.value };
        await update(ref(db, `device/${state.currentDeviceId}/settings`), updates);
        await checkInitialSetupComplete();
        updateCountdownDisplay();
    } catch (err) { await showCustomAlert(t('error'), t('cannotSaveAccountName'), 'error'); }
}, 1000);

const saveSoundSelectionToFirebase = debounce(async () => {
    if (!state.currentDeviceId || !state.isAuthReady) { await showCustomAlert(t('error'), t('enterDeviceIdMsg'), 'error'); return; }
    try {
        const val = DOMElements.soundSelectionSelect ? parseInt(DOMElements.soundSelectionSelect.value) : null;
        const updates = { sound_selection: isNaN(val) ? null : val };
        await update(ref(db, `device/${state.currentDeviceId}/settings`), updates);
        await checkInitialSetupComplete();
    } catch (err) { await showCustomAlert(t('error'), t('cannotSaveAccountName'), 'error'); }
}, 800);

async function checkInitialSetupComplete() {
    if (!state.currentDeviceId) return false;
    try {
        const settingsSnapshot = await new Promise(resolve => { onValue(ref(db, `device/${state.currentDeviceId}/settings`), s => resolve(s), { onlyOnce: true }); });
        const settings = settingsSnapshot.val() || {};
        let isSetupComplete = true;
        if (settings.timeZoneOffset == null || isNaN(parseFloat(settings.timeZoneOffset))) isSetupComplete = false;
        // bottle size removed from required checks
        if (settings.calibration?.grams_per_second == null || settings.calibration.grams_per_second <= 0) isSetupComplete = false;
        if (!settings.wifiCredentials || !settings.wifiCredentials.ssid || settings.wifiCredentials.ssid.trim() === '') isSetupComplete = false;
        if (!settings.wifiCredentials || !settings.wifiCredentials.password || settings.wifiCredentials.password.trim() === '') isSetupComplete = false;
        if (DOMElements.settingsNavDot) DOMElements.settingsNavDot.style.display = isSetupComplete ? 'none' : 'block';
        document.querySelectorAll('.nav-item').forEach(item => { if (!isSetupComplete) { item.disabled = true; item.classList.add('disabled-overlay'); } else { item.disabled = false; item.classList.remove('disabled-overlay'); } });
        return isSetupComplete;
    } catch (e) { return false; }
}

async function setAndLoadDeviceId(id, navigateToMealSchedule = false) {
    // Validate device existence before committing
    try {
        const deviceSnapshot = await new Promise(resolve => { onValue(ref(db, `device/${id}`), s => resolve(s), { onlyOnce: true }); });
        const deviceVal = deviceSnapshot.val();
        if (!deviceVal) {
            await showCustomAlert(t('deviceNotFound'), t('deviceIdNotFound'), 'error');
            return;
        }
    } catch (err) {
        await showCustomAlert(t('error'), t('cannotVerifyDevice'), 'error');
        return;
    }

    state.currentDeviceId = id;
    localStorage.setItem('pawtonomous_device_id', id);
    if (DOMElements.deviceSelectionSection) DOMElements.deviceSelectionSection.style.display = 'none';
    if (DOMElements.mainContentContainer) DOMElements.mainContentContainer.style.display = 'block';
    if (state.isAuthReady) {
        try {
            listenToDeviceStatus();
            await loadSettingsFromFirebase();
            setupNotificationListener(db);

            // Decide which section to show: if initial setup is incomplete, show settings; otherwise
            // respect navigateToMealSchedule when true (used for returning users).
            const isSetupComplete = await checkInitialSetupComplete();
            if (!isSetupComplete) {
                showSection('device-settings-section');
            } else if (navigateToMealSchedule) {
                showSection('meal-schedule-section');
            } else {
                // Default to settings for newly-entered IDs (user requested landing on settings)
                showSection('device-settings-section');
            }

            loadMeals(db, DOMElements, MEAL_BLOCK_DURATION_SECONDS);
            // Start the countdown updater (it will react once meals arrive)
            startCountdown();
        } catch (err) {
            await showCustomAlert(t('error'), t('cannotLoadData'), 'error');
        }
    }
}

function handleLogout() { localStorage.removeItem('pawtonomous_device_id'); state.currentDeviceId = null; state.hasShownInitialSetupOverlay = false; signOut(auth).catch(()=>{}); window.location.reload(); }

// Register Service Worker for offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // Setup online/offline listeners
    window.addEventListener('online', () => {
        updateWebConnectionStatus(true);
        showCustomAlert(t('backOnline'), t('internetConnected'), 'success');
    });
    
    window.addEventListener('offline', () => {
        updateWebConnectionStatus(false);
        showCustomAlert(t('offline'), t('noInternet'), 'warning');
    });
    
    // Set initial web connection status
    updateWebConnectionStatus(navigator.onLine);
    
    // Update all translatable elements
    function updateTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = t(key);
        });
        
        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = t(key);
        });
        
        // Update select options with data-i18n
        document.querySelectorAll('option[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = t(key);
        });
    }
    
    // Load saved theme and language first
    const savedTheme = localStorage.getItem('pawtonomous_theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    const savedLang = getLanguage();
    
    const ids = [
        'deviceSelectionSection','deviceIdInput','setDeviceIdBtn','mainContentContainer','deviceStatusText','themeSelect','languageSelect',
        'customAlertOverlay','customAlertContent','customAlertTitle','customAlertMessage','customAlertOkButton','newNotificationToast','newNotificationToastMessage',
        'calibrationModal','startCalibrationTestBtn','calibrationStatus','calibratedWeightInput','saveCalibrationBtn','closeCalibrationModalBtn',
        'mealDetailModal','mealModalTitle','mealNameInput','specificDateBtn','specificDateInput','specificDateDisplay','mealAmountInput','mealFanStrengthInput',
        'mealFanDirectionInput','mealSwingModeCheckbox','mealAudioInput','mealAudioStatus','mealAudioPreview','saveMealDetailBtn','deleteMealDetailBtn','cancelMealDetailBtn',
        'forceSetupOverlay','goToSettingsBtn','feedNowBtn','checkFoodLevelBtn','checkAnimalMovementBtn','currentFoodLevelDisplay','lastMovementDisplay',
        'makenoiseAudioInput','makenoiseAudioStatus','makenoiseBtn','mealListContainer','addMealCardBtn','wifiSsidInput','wifiPasswordInput','timeZoneOffsetSelect','soundSelectionSelect',
        'ownerNameDisplay','editOwnerNameBtn','ownerNameModal','ownerNameInput','ownerNameSaveBtn','ownerNameCancelBtn',
        'openCalibrationModalBtn','currentGramsPerSecondDisplay','logoutBtn','settingsNavDot','notifications-section','notificationHistoryList',
        'animal-calculator-section','animalCount','weightInputContainer','animalWeightKg','lifeStageActivityContainer','recommendedAmount','calculationNotes','applyRecommendedAmountBtn',
        'nextMealCountdownDisplay','nextMealTimeDisplay','hours-column','minutes-column','confirmModal','confirmModalTitle','confirmModalMessage','confirmYesBtn','confirmNoBtn',
        'feedNowAmountInput','feedNowFanStrengthInput','feedNowFanDirectionInput','feedNowSwingModeCheckbox','feedNowAudioInput','feedNowAudioStatus','feedNowAudioPreview'
    ];
    populateDOMElements(ids);
    DOMElements.animalTypeOptions = document.getElementById('animalType-options');
    DOMElements.animalSpeciesOptions = document.getElementById('animalSpecies-options');
    DOMElements.lifeStageActivityOptions = document.getElementById('lifeStageActivity-options');
    
    // Set theme and language select values after DOM elements are populated
    if (DOMElements.themeSelect) DOMElements.themeSelect.value = savedTheme;
    if (DOMElements.languageSelect) DOMElements.languageSelect.value = savedLang;
    updateTranslations();

    setupCustomTimePicker();
    setupCustomSelects();
    window.getTimeFromPicker = getTimeFromPicker;
    window.updateTimePicker = updateTimePicker;
    
    // Setup feeding history immediately
    let feedingHistoryModule = null;
    import('./js/feedingHistory.js').then(module => {
        feedingHistoryModule = module;
        if (module.setupFeedingHistory) module.setupFeedingHistory();
    }).catch(() => {});

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            state.isAuthReady = true;
            const saved = localStorage.getItem('pawtonomous_device_id');
            if (saved) { DOMElements.deviceIdInput.value = saved; await setAndLoadDeviceId(saved, true); }
            else { if (DOMElements.deviceSelectionSection) DOMElements.deviceSelectionSection.style.display = 'block'; if (DOMElements.mainContentContainer) DOMElements.mainContentContainer.style.display = 'none'; updateDeviceStatusUI(false); }
        } else {
            state.isAuthReady = false;
            try { await signInAnonymously(auth); } catch (e) { await showCustomAlert(t('authError'), t('cannotLogin'), 'error'); }
        }
    });

    if (DOMElements.setDeviceIdBtn) DOMElements.setDeviceIdBtn.addEventListener('click', async () => { const id = DOMElements.deviceIdInput.value.trim(); if (id) await setAndLoadDeviceId(id, false); else await showCustomAlert(t('error'), t('enterDeviceIdMsg'), 'error'); });
    if (DOMElements.logoutBtn) DOMElements.logoutBtn.addEventListener('click', handleLogout);
    document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => { 
        if (!btn.disabled) {
            showSection(btn.dataset.target);
            if (btn.dataset.target === 'notifications-section' && feedingHistoryModule) {
                setTimeout(() => {
                    if (feedingHistoryModule.setupFeedingHistory) feedingHistoryModule.setupFeedingHistory();
                }, 100);
            }
        }
    }));
    if (DOMElements.goToSettingsBtn) DOMElements.goToSettingsBtn.addEventListener('click', () => { showSection('device-settings-section'); hideModal(DOMElements.forceSetupOverlay); });

    if (DOMElements.closeCalibrationModalBtn) DOMElements.closeCalibrationModalBtn.addEventListener('click', () => hideModal(DOMElements.calibrationModal));
    if (DOMElements.cancelMealDetailBtn) DOMElements.cancelMealDetailBtn.addEventListener('click', () => closeMealDetailModal());

    if (DOMElements.timeZoneOffsetSelect) DOMElements.timeZoneOffsetSelect.addEventListener('change', () => saveSettingsToFirebase('timezone'));
    if (DOMElements.wifiSsidInput) DOMElements.wifiSsidInput.addEventListener('input', () => saveSettingsToFirebase('wifi'));
    if (DOMElements.wifiPasswordInput) DOMElements.wifiPasswordInput.addEventListener('input', () => saveSettingsToFirebase('wifi'));

    // populate sound selector and handle changes
    await populateSoundSelects();
    if (DOMElements.soundSelectionSelect) DOMElements.soundSelectionSelect.addEventListener('change', () => saveSoundSelectionToFirebase());
    if (DOMElements.mealAudioSelect) DOMElements.mealAudioSelect.addEventListener('change', () => { if (DOMElements.mealAudioStatus) DOMElements.mealAudioStatus.textContent = DOMElements.mealAudioSelect.selectedOptions[0]?.textContent || '-'; });
    if (DOMElements.feedNowAudioSelect) DOMElements.feedNowAudioSelect.addEventListener('change', () => { if (DOMElements.feedNowAudioStatus) DOMElements.feedNowAudioStatus.textContent = DOMElements.feedNowAudioSelect.selectedOptions[0]?.textContent || '-'; });
    if (DOMElements.makenoiseSelect) DOMElements.makenoiseSelect.addEventListener('change', () => { if (DOMElements.makenoiseAudioStatus) DOMElements.makenoiseAudioStatus.textContent = DOMElements.makenoiseSelect.selectedOptions[0]?.textContent || '-'; if (DOMElements.makenoiseSelect.value) DOMElements.makenoiseBtn.disabled = false; else DOMElements.makenoiseBtn.disabled = true; });

    // Owner name edit
    // Owner name: open modal to edit (uses custom modal in DOM)
    if (DOMElements.editOwnerNameBtn) DOMElements.editOwnerNameBtn.addEventListener('click', () => {
        if (!state.currentDeviceId || !state.isAuthReady) { showCustomAlert(t('error'), t('authError'), 'error'); return; }
        if (DOMElements.ownerNameInput) {
            const currentText = DOMElements.ownerNameDisplay?.textContent || '';
            const accountPrefix = `${t('accountText')} `;
            const current = currentText === `${accountPrefix}${t('noDataText')}` ? '' : currentText.replace(new RegExp(`^${accountPrefix}`), '');
            DOMElements.ownerNameInput.value = current;
            // set save button state based on current value
            if (DOMElements.ownerNameSaveBtn) DOMElements.ownerNameSaveBtn.disabled = current.trim().length === 0 || current.trim().length > 20;
        }
        const modal = DOMElements.ownerNameModal;
        if (modal) showModal(modal);
    });

    // Modal buttons
    if (DOMElements.ownerNameCancelBtn) DOMElements.ownerNameCancelBtn.addEventListener('click', () => { if (DOMElements.ownerNameModal) hideModal(DOMElements.ownerNameModal); });
    if (DOMElements.ownerNameSaveBtn) DOMElements.ownerNameSaveBtn.addEventListener('click', async () => {
        if (!state.currentDeviceId || !state.isAuthReady) { await showCustomAlert(t('error'), t('authError'), 'error'); return; }
        const newName = DOMElements.ownerNameInput?.value?.trim() || '';
        if (newName.length > 20) {
            await showCustomAlert(t('error'), t('accountNameTooLong'), 'error');
            return;
        }
        try {
            await update(ref(db, `device/${state.currentDeviceId}/settings`), { ownerName: newName || null });
            if (DOMElements.ownerNameModal) hideModal(DOMElements.ownerNameModal);
            await showCustomAlert(t('success'), t('accountNameSaved'), 'success');
            await loadSettingsFromFirebase();
        } catch (e) {
            await showCustomAlert(t('error'), t('cannotSaveAccountName'), 'error');
        }
    });

    // validate owner name input live and disable/enable save button
    if (DOMElements.ownerNameInput) {
        DOMElements.ownerNameInput.addEventListener('input', () => {
            const v = (DOMElements.ownerNameInput.value || '').trim();
            if (DOMElements.ownerNameSaveBtn) DOMElements.ownerNameSaveBtn.disabled = v.length === 0 || v.length > 20;
        });
    }

    if (DOMElements.openCalibrationModalBtn) DOMElements.openCalibrationModalBtn.addEventListener('click', openCalibrationModal);
    if (DOMElements.startCalibrationTestBtn) DOMElements.startCalibrationTestBtn.addEventListener('click', startCalibrationTest);
    if (DOMElements.saveCalibrationBtn) DOMElements.saveCalibrationBtn.addEventListener('click', saveCalibration);
    if (DOMElements.calibratedWeightInput) DOMElements.calibratedWeightInput.addEventListener('input', () => { if (DOMElements.saveCalibrationBtn) DOMElements.saveCalibrationBtn.disabled = isNaN(parseFloat(DOMElements.calibratedWeightInput.value)) || parseFloat(DOMElements.calibratedWeightInput.value) <= 0; });

    if (DOMElements.feedNowBtn) DOMElements.feedNowBtn.addEventListener('click', feedNow);
    if (DOMElements.checkFoodLevelBtn) DOMElements.checkFoodLevelBtn.addEventListener('click', () => sendCommand('checkFoodLevel'));
    if (DOMElements.checkAnimalMovementBtn) DOMElements.checkAnimalMovementBtn.addEventListener('click', () => sendCommand('checkMovement'));
    if (DOMElements.makenoiseBtn) DOMElements.makenoiseBtn.addEventListener('click', playMakeNoise);

    if (DOMElements.addMealCardBtn) DOMElements.addMealCardBtn.addEventListener('click', () => openMealDetailModal(null, null, db, DOMElements, MEAL_BLOCK_DURATION_SECONDS));
    if (DOMElements.saveMealDetailBtn) DOMElements.saveMealDetailBtn.addEventListener('click', () => saveMealDetail(db, DOMElements, MEAL_BLOCK_DURATION_SECONDS));
    if (DOMElements.deleteMealDetailBtn) DOMElements.deleteMealDetailBtn.addEventListener('click', () => deleteMealDetail(db));

    document.querySelectorAll('.day-btn:not(.date-btn)').forEach(btn => btn.addEventListener('click', () => {
        btn.classList.toggle('selected');
        if (document.querySelectorAll('.day-btn.selected:not(.date-btn)').length > 0) {
            if (DOMElements.specificDateInput) DOMElements.specificDateInput.value = '';
            if (DOMElements.specificDateDisplay) DOMElements.specificDateDisplay.textContent = '';
            if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.classList.remove('selected');
            if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.disabled = true;
        } else { document.querySelectorAll('.day-btn:not(.date-btn)').forEach(b => b.classList.remove('disabled')); if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.disabled = false; }
    }));
    if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.addEventListener('click', () => { document.querySelectorAll('.day-btn:not(.date-btn)').forEach(b => { b.classList.remove('selected'); b.classList.add('disabled'); }); if (DOMElements.specificDateInput) { DOMElements.specificDateInput.style.display = 'block'; DOMElements.specificDateInput.focus(); DOMElements.specificDateBtn.classList.add('selected'); DOMElements.specificDateInput.showPicker?.(); } });
    if (DOMElements.specificDateInput) DOMElements.specificDateInput.addEventListener('change', e => { if (e.target.value) { if (DOMElements.specificDateDisplay) { const lang = getLanguage(); const locale = lang === 'th' ? 'th-TH' : lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US'; DOMElements.specificDateDisplay.textContent = `${t('specificDateLabel')} ${new Date(e.target.value).toLocaleDateString(locale)}`; } document.querySelectorAll('.day-btn:not(.date-btn)').forEach(b => { b.classList.remove('selected'); b.classList.add('disabled'); }); if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.classList.add('selected'); DOMElements.specificDateInput.style.display = 'none'; } else { document.querySelectorAll('.day-btn:not(.date-btn)').forEach(b => b.classList.remove('disabled')); if (DOMElements.specificDateBtn) DOMElements.specificDateBtn.classList.remove('selected'); if (DOMElements.specificDateDisplay) DOMElements.specificDateDisplay.textContent = ''; DOMElements.specificDateInput.style.display = 'none'; } });

    if (DOMElements.mealSwingModeCheckbox && DOMElements.mealFanDirectionInput) DOMElements.mealSwingModeCheckbox.addEventListener('change', e => { DOMElements.mealFanDirectionInput.disabled = e.target.checked; });

    if (DOMElements.mealAudioInput) DOMElements.mealAudioInput.addEventListener('change', e => { const file = e.target.files[0]; if (DOMElements.mealAudioStatus) DOMElements.mealAudioStatus.textContent = file ? file.name : t('noData'); if (DOMElements.mealAudioPreview) { DOMElements.mealAudioPreview.src = file ? URL.createObjectURL(file) : ''; DOMElements.mealAudioPreview.style.display = file ? 'block' : 'none'; } });

    populateAnimalType(DOMElements);
    document.querySelectorAll('.custom-select-trigger').forEach(trigger => trigger.addEventListener('change', () => { if (trigger.dataset.target === 'animalType') updateAnimalSpecies(DOMElements); updateRecommendedAmount(DOMElements); }));
    [DOMElements.animalCount, DOMElements.animalWeightKg].forEach(inp => { if (inp) inp.addEventListener('input', () => updateRecommendedAmount(DOMElements)); });
    if (DOMElements.applyRecommendedAmountBtn) DOMElements.applyRecommendedAmountBtn.addEventListener('click', () => { const recommendedAmountText = DOMElements.recommendedAmount.textContent; const match = recommendedAmountText.match(/(\d+\.?\d*)/); if (match) { const amount = Math.max(1, Math.round(parseFloat(match[1]))); openMealDetailModal(null, { amount }, db, DOMElements, MEAL_BLOCK_DURATION_SECONDS); showSection('meal-schedule-section'); } else { showCustomAlert('ผิดพลาด', 'ไม่สามารถนำปริมาณที่แนะนำไปใช้ได้', 'error'); } });

    if (DOMElements.applyRecommendedAmountBtn) DOMElements.applyRecommendedAmountBtn.disabled = true;
    
    // Theme selector
    if (DOMElements.themeSelect) {
        DOMElements.themeSelect.addEventListener('change', (e) => {
            const theme = e.target.value;
            document.body.setAttribute('data-theme', theme);
            localStorage.setItem('pawtonomous_theme', theme);
            showCustomAlert(t('save'), `${t('selectTheme')}: ${e.target.selectedOptions[0].text}`, 'success');
        });
    }
    
    // Language selector
    if (DOMElements.languageSelect) {
        DOMElements.languageSelect.addEventListener('change', (e) => {
            const lang = e.target.value;
            setLanguage(lang);
            // Reload page to apply all translations
            window.location.reload();
        });
    }
});

export { setAndLoadDeviceId, listenToDeviceStatus, updateDeviceStatusUI, updateTimePicker };
