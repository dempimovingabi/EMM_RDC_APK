// js/main.js — Chargement résilient sans blocage d'importation — EMM RD CONGO

async function safeImport(path) {
  try {
    return await import(path);
  } catch (err) {
    console.warn('Échec import :', path, err);
    return null;
  }
}

function showRuntimeMessage(title, detail) {
  const container = document.getElementById('container') || document.body;
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.style.opacity = '0';
    splash.style.pointerEvents = 'none';
    setTimeout(() => {
      splash.classList.add('hidden');
      splash.style.display = 'none';
    }, 200);
  }

  container.innerHTML = `
    <section class="module-page">
      <div class="card">
        <h3>${title}</h3>
        <p style="font-size:0.85rem;color:var(--text-muted);">${detail}</p>
      </div>
    </section>
  `;
}

async function bootstrap() {
  const routerMod = await safeImport('./core/router.js');
  const storeMod = await safeImport('./core/store.js');
  const appMod = await safeImport('./core/app.js');
  const loginMod = await safeImport('./modules/auth/login.view.js');
  const authCtrlMod = await safeImport('./modules/auth/auth.controller.js');
  const headerMod = await safeImport('./ui/header.js');
  const navMod = await safeImport('./ui/bottom-nav.js');
  const syncMod = await safeImport('./services/sync.service.js');

  const router = routerMod?.router;
  const store = storeMod?.store;

  if (!router || !store) {
    showRuntimeMessage(
      'Fichiers noyau manquants ou incomplets',
      'Vérifiez la présence et la syntaxe de ./js/core/router.js et ./js/core/store.js sur GitHub.'
    );
    return;
  }

  if (typeof loginMod?.renderLoginView === 'function') {
    router.register('login', loginMod.renderLoginView);
  }

  const optionalRoutes = [
    ['dashboard', './modules/dashboard/dashboard.view.js', 'renderDashboardView'],
    ['frequences', './modules/frequences/frequences.page.js', 'renderFrequencesPage'],
    ['finance', './modules/finance/finance.view.js', 'renderFinanceView'],
    ['depouillement', './modules/depouillement/depouillement.view.js', 'renderDepouillementView'],
    ['patrimoine', './modules/patrimoine/patrimoine.view.js', 'renderPatrimoineView'],
    ['archives', './modules/archives/archives.view.js', 'renderArchivesView'],
    ['administration', './modules/administration/administration.view.js', 'renderAdministrationView']
  ];

  for (const [routeName, modPath, exportName] of optionalRoutes) {
    const mod = await safeImport(modPath);
    if (mod && typeof mod[exportName] === 'function') {
      router.register(routeName, mod[exportName]);
    }
  }

  router.setFallback(async (container, _params, { route }) => {
    const { activeProvince } = store.getState();
    container.innerHTML = `
      <section class="module-page">
        <div class="card">
          <h2>${route.title}</h2>
          <p>Province active : <strong>${activeProvince || 'KINSHASA'}</strong></p>
          <p>Module prêt dans l'architecture EMM RD CONGO.</p>
        </div>
      </section>
    `;
  });

  if (typeof headerMod?.initHeader === 'function') {
    headerMod.initHeader(authCtrlMod?.logoutUser);
  }
  if (typeof navMod?.initBottomNav === 'function') {
    navMod.initBottomNav();
  }

  const banner = document.getElementById('offline-banner');
  if (banner) {
    const updateBanner = () => {
      const online = store.getState().isOnline !== false;
      banner.classList.toggle('hidden', online);
      banner.style.display = online ? 'none' : 'block';
      if (online && typeof syncMod?.syncService?.flush === 'function') {
        syncMod.syncService.flush().catch(() => {});
      }
    };
    updateBanner();
    store.subscribe(updateBanner);
  }

  if (typeof authCtrlMod?.initAuthListener === 'function') {
    Promise.resolve(authCtrlMod.initAuthListener()).catch((err) => {
      console.warn('initAuthListener :', err);
    });
  }

  if (typeof appMod?.initApp === 'function') {
    await appMod.initApp(1000);
  } else {
    await router.navigate('login');
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.classList.add('hidden');
      splash.style.display = 'none';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
