// js/core/app.js
// Cycle de vie applicatif, Splash Screen & démarrage SPA — EMM RD CONGO

import { store } from './store.js';
import { router } from './router.js';
import { DEFAULT_GUEST_ROUTE, DEFAULT_AUTHENTICATED_ROUTE } from '../config/routes.js';

function hideSplashScreen() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  splash.style.opacity = '0';
  setTimeout(() => {
    splash.classList.add('hidden');
    splash.style.display = 'none';
  }, 350);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Enregistrement Service Worker ignoré :', err);
    });
  });
}

export async function initApp(splashDurationMs = 2500) {
  registerServiceWorker();

  const minWait = new Promise((resolve) => setTimeout(resolve, splashDurationMs));

  try {
    await minWait;
    const { isAuthenticated } = store.getState();
    const targetRoute = isAuthenticated ? DEFAULT_AUTHENTICATED_ROUTE : DEFAULT_GUEST_ROUTE;
    await router.navigate(targetRoute);
  } catch (err) {
    console.error('Erreur initApp :', err);
    await router.navigate(DEFAULT_GUEST_ROUTE).catch(() => {});
  } finally {
    hideSplashScreen();
  }
}
