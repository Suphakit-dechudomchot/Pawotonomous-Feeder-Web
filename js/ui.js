// ui.js - DOM helpers and UI utilities
export const DOMElements = {};

export function populateDOMElements(ids) {
    ids.forEach(id => {
        DOMElements[id] = document.getElementById(id);
        if (!DOMElements[id]) {
            console.warn(`Element with ID '${id}' not found!`);
        }
    });
}

export function showModal(modalElement) {
    if (!modalElement) return;
    modalElement.style.display = 'flex';
}
export function hideModal(modalElement) {
    if (!modalElement) return;
    modalElement.style.display = 'none';
}

export function setButtonState(button, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    button.classList.toggle('loading', isLoading);
    const spinner = button.querySelector('.spinner');
    if (isLoading && !spinner) {
        const newSpinner = document.createElement('div');
        newSpinner.className = 'spinner';
        button.prepend(newSpinner);
    } else if (!isLoading && spinner) {
        spinner.remove();
    }
}

export async function showCustomAlert(title, message, type = "info") {
    if (!DOMElements.customAlertTitle || !DOMElements.customAlertMessage || !DOMElements.customAlertContent || !DOMElements.customAlertOverlay || !DOMElements.customAlertOkButton) {
        console.error("Custom alert elements not found. Falling back to native alert.");
        alert(`${title}: ${message}`);
        return;
    }

    DOMElements.customAlertTitle.textContent = title;
    DOMElements.customAlertMessage.textContent = message;
    DOMElements.customAlertContent.className = `custom-alert-content ${type}`;
    DOMElements.customAlertOverlay.classList.add('show');
    return new Promise(resolve => {
        const handler = () => {
            DOMElements.customAlertOverlay.classList.remove('show');
            DOMElements.customAlertOkButton.removeEventListener('click', handler);
            resolve();
        };
        DOMElements.customAlertOkButton.addEventListener('click', handler);
    });
}

export async function showCustomConfirm(title, message) {
    if (!DOMElements.confirmModal || !DOMElements.confirmModalTitle || !DOMElements.confirmModalMessage || !DOMElements.confirmYesBtn || !DOMElements.confirmNoBtn) {
        console.error("Custom confirm elements not found. Falling back to native confirm.");
        return confirm(`${title}: ${message}`);
    }

    DOMElements.confirmModalTitle.textContent = title;
    DOMElements.confirmModalMessage.textContent = message;
    showModal(DOMElements.confirmModal);
    
    return new Promise(resolve => {
        const yesHandler = () => {
            hideModal(DOMElements.confirmModal);
            DOMElements.confirmYesBtn.removeEventListener('click', yesHandler);
            DOMElements.confirmNoBtn.removeEventListener('click', noHandler);
            resolve(true);
        };
        const noHandler = () => {
            hideModal(DOMElements.confirmModal);
            DOMElements.confirmYesBtn.removeEventListener('click', yesHandler);
            DOMElements.confirmNoBtn.removeEventListener('click', noHandler);
            resolve(false);
        };
        DOMElements.confirmYesBtn.addEventListener('click', yesHandler);
        DOMElements.confirmNoBtn.addEventListener('click', noHandler);
    });
}

export function showNewNotificationToast(message) {
    if (!DOMElements.newNotificationToastMessage || !DOMElements.newNotificationToast) return;
    DOMElements.newNotificationToastMessage.textContent = message;
    DOMElements.newNotificationToast.classList.add('show');
    setTimeout(() => DOMElements.newNotificationToast.classList.remove('show'), 5000);
}

export function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId)?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.target === sectionId);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function setupCustomSelects() {
    document.addEventListener('click', e => {
        const wrapper = e.target.closest('.custom-select-wrapper');
        document.querySelectorAll('.custom-select-wrapper.open').forEach(openWrapper => {
            if (openWrapper !== wrapper) openWrapper.classList.remove('open');
        });

        if (e.target.classList.contains('custom-select-trigger')) {
            wrapper.classList.toggle('open');
        } else if (e.target.classList.contains('custom-option')) {
            const trigger = wrapper.querySelector('.custom-select-trigger');
            trigger.textContent = e.target.textContent;
            trigger.dataset.value = e.target.dataset.value;
            wrapper.classList.remove('open');
            wrapper.querySelectorAll('.custom-option').forEach(opt => {
                opt.classList.toggle('selected', opt.dataset.value === e.target.dataset.value);
            });
            const event = new Event('change', { bubbles: true });
            trigger.dispatchEvent(event);
        } else if (wrapper && !e.target.closest('.custom-options')) {
            wrapper.classList.remove('open');
        }
    });
}
