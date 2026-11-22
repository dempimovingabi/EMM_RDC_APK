// js/ui/toast.js
// Notifications visuelles temporaires (Toast) — EMM RD CONGO

let containerEl = null;

function ensureToastContainer() {
  if (containerEl && document.body.contains(containerEl)) {
    return containerEl;
  }
  containerEl = document.createElement('div');
  containerEl.id = 'toast-container';
  containerEl.className = 'toast-container';
  document.body.appendChild(containerEl);
  return containerEl;
}

export function showToast(message, type = 'info', durationMs = 3200) {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 260);
  }, durationMs);
}
