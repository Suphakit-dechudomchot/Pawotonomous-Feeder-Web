// state.js - shared runtime state between modules
export const state = {
    currentDeviceId: null,
    activeMealId: null,
    lastNotificationId: '',
    gramsPerSecond: null,
    hasShownInitialSetupOverlay: false,
    isAuthReady: false,
    countdownInterval: null,
    allMealsData: {}
};
