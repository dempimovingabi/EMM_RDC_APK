// js/core/app.js
// Cycle de vie applicatif, Splash Screen & démarrage SPA — EMM RD CONGO

import { store } from './store.js';
import { router } from './router.js';
import { DEFAULT_GUEST_ROUTE, DEFAULT_AUTHENTICATED_ROUTE } from '../config/routes.js';

function hideSplashScreen() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  splash.style.opacity = '0';
  splash.style.pointerEvents = 'none';
  setTimeout(() => {
    splash.classList.add('hidden');
    splash.style.display = 'none';
  }, 250);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service Worker non enregistré :', err);
    });
  });
}

export async function initApp(splashDurationMs = 1500) {
  registerServiceWorker();

  // Sécurité absolue : quoi qu'il arrive, on retire le splash screen au bout de 3,5 s max
  const hardTimeout = setTimeout(hideSplashScreen, 3500);

  try {
    await new Promise((resolve) => setTimeout(resolve, splashDurationMs));
    const { isAuthenticated } = store.getState();
    const targetRoute = isAuthenticated ? DEFAULT_AUTHENTICATED_ROUTE : DEFAULT_GUEST_ROUTE;
    await router.navigate(targetRoute);
  } catch (err) {
    console.error('Erreur initApp :', err);
    await router.navigate(DEFAULT_GUEST_ROUTE).catch(() => {});
  } finally {
    clearTimeout(hardTimeout);
    hideSplashScreen();
  }
}
