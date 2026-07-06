function ensureToastContainer() {
    let container = document.getElementById('toastContainer');
    if (container) return container;

    container = document.createElement('div');
    container.id = 'toastContainer';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
    return container;
}

export function showToast(message, type = 'info') {
    if (!message || typeof message !== 'string') return;

    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
        success: '✓',
        error: '!',
        info: 'i',
    };

    toast.innerHTML = `
        <div class="toast-icon">${iconMap[type] || 'i'}</div>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    window.setTimeout(() => {
        toast.classList.remove('show');
        window.setTimeout(() => toast.remove(), 220);
    }, 3200);
}
