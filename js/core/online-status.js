// js/core/online-status.js
// Détection temps réel de la connectivité réseau — EMM RD CONGO

import { store } from './store.js';

let initialized = false;

export function initOnlineStatusWatcher() {
  if (initialized) return;
  initialized = true;

  const updateStatus = () => {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    store.setState({ isOnline: online });
    window.dispatchEvent(
      new CustomEvent('emm:network-status', {
        detail: { isOnline: online }
      })
    );
  };

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus();
}

export function isAppOnline() {
  return Boolean(store.getState().isOnline);
}
