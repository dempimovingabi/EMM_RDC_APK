// js/core/app.js
// Cycle de vie applicatif et Splash Screen — EMM RD CONGO

import { APP_CONFIG } from '../config/constants.js';
import { DEFAULT_AUTHENTICATED_ROUTE, DEFAULT_GUEST_ROUTE } from '../config/routes.js';
import { store } from './store.js';
import { router } from './router.js';
import { initOnlineStatusWatcher } from './online-status.js';

export function applyTheme(darkMode) {
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  document.body.classList.toggle('dark-mode', Boolean(darkMode));
}

export function hideSplashScreen() {
  const splash = document.getElementById('splash-screen');
  if (!splash) {
    store.setState({ splashDone: true });
    return;
  }

  splash.classList.add('splash-hide');
  setTimeout(() => {
    splash.style.display = 'none';
    store.setState({ splashDone: true });
  }, 350);
}

export async function initApp() {
  const startTime = Date.now();
  initOnlineStatusWatcher();

  const initialState = store.getState();
  applyTheme(initialState.darkMode);

  store.subscribe((state, prevState) => {
    if (state.darkMode !== prevState.darkMode) {
      applyTheme(state.darkMode);
    }
  });

  window.dispatchEvent(new CustomEvent('emm:app-ready', { detail: { store } }));

  const elapsed = Date.now() - startTime;
  const minDuration = APP_CONFIG.splashMinDurationMs || 3800;
  const remaining = Math.max(0, minDuration - elapsed);

  setTimeout(() => {
    hideSplashScreen();
    const currentUser = store.getState().user;
    router.navigate(currentUser ? DEFAULT_AUTHENTICATED_ROUTE : DEFAULT_GUEST_ROUTE);
    store.setState({ initialized: true });
  }, remaining);
}
