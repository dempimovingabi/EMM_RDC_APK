// js/main.js
// Point d'entrée principal ES6+ — EMM RD CONGO

import { initApp } from './core/app.js';
import { router } from './core/router.js';
import { store } from './core/store.js';
import { renderLoginView } from './modules/auth/login.view.js';
import { initAuthListener, logoutUser } from './modules/auth/auth.controller.js';
import { initHeader } from './ui/header.js';
import { initBottomNav } from './ui/bottom-nav.js';
import { syncService } from './services/sync.service.js';

async function safeRegister(routeName, modulePath, exportName) {
  try {
    const mod = await import(modulePath);
    if (typeof mod[exportName] === 'function') {
      router.register(routeName, mod[exportName]);
    }
  } catch (err) {
    console.warn(`Module non chargé (${routeName} -> ${modulePath}) :`, err);
  }
}

function initOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  if (!banner) return;

  const updateBanner = () => {
    const online = store.getState().isOnline;
    banner.classList.toggle('hidden', online);
    banner.style.display = online ? 'none' : 'block';
    if (online && typeof syncService?.flush === 'function') {
      syncService.flush().catch(() => {});
    }
  };

  updateBanner();
  store.subscribe(updateBanner);
}

async function bootstrap() {
  router.register('login', renderLoginView);

  await safeRegister('dashboard', './modules/dashboard/dashboard.view.js', 'renderDashboardView');
  await safeRegister('frequences', './modules/frequences/frequences.page.js', 'renderFrequencesPage');
  await safeRegister('finance', './modules/finance/finance.view.js', 'renderFinanceView');
  await safeRegister('depouillement', './modules/depouillement/depouillement.view.js', 'renderDepouillementView');
  await safeRegister('patrimoine', './modules/patrimoine/patrimoine.view.js', 'renderPatrimoineView');
  await safeRegister('archives', './modules/archives/archives.view.js', 'renderArchivesView');
  await safeRegister('administration', './modules/administration/administration.view.js', 'renderAdministrationView');

  router.setFallback(async (container, _params, { route }) => {
    const { activeProvince } = store.getState();
    container.innerHTML = `
      <section class="module-page">
        <div class="card">
          <h2>${route.title}</h2>
          <p>Province active : <strong>${activeProvince}</strong></p>
          <p>Module prêt dans l'architecture EMM RD CONGO.</p>
        </div>
      </section>
    `;
  });

  initHeader(logoutUser);
  initBottomNav();
  initOfflineBanner();

  // Ne pas bloquer le démarrage si l'écouteur auth prend du temps sur réseau lent
  Promise.resolve(initAuthListener()).catch((err) => {
    console.warn('initAuthListener :', err);
  });

  await initApp(1500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

