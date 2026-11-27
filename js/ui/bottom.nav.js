// js/ui/bottom-nav.js
// Barre de navigation inférieure & tiroir "Plus" — EMM RD CONGO

import { store } from '../core/store.js';
import { router } from '../core/router.js';

const PRIMARY_ITEMS = [
  { route: 'dashboard', label: 'Accueil', icon: '🏠' },
  { route: 'frequences', label: 'Fréquences', icon: '📊' },
  { route: 'finance', label: 'Finance', icon: '💰' },
  { route: 'depouillement', label: 'Dépouillement', icon: '🧾' },
  { route: 'more', label: 'Modules', icon: '☰' }
];

const EXTRA_MODULES = [
  { route: 'patrimoine', label: 'Patrimoine', icon: '🏛️' },
  { route: 'archives', label: 'Archives', icon: '🗂️' },
  { route: 'administration', label: 'Administration', icon: '⚙️' }
];

export function initBottomNav() {
  const navEl =
    document.getElementById('bottom-nav') ||
    document.querySelector('nav.bottom-nav') ||
    document.querySelector('nav');

  if (!navEl) return;

  let moreSheetOpen = false;

  const renderNav = () => {
    const state = store.getState() || {};
    const isConnected =
      state.currentRoute !== 'login' &&
      Boolean(state.isAuthenticated || state.user || state.currentUser || state.currentRoute);

    if (!isConnected) {
      navEl.classList.add('hidden');
      navEl.style.display = 'none';
      return;
    }

    const currentRoute = state.currentRoute || 'dashboard';

    navEl.classList.remove('hidden');
    navEl.style.display = 'block';

    const sheetHtml = moreSheetOpen
      ? `
        <div id="bottom-more-sheet" style="padding:10px 12px;border-bottom:1px solid var(--border-color);background:var(--bg-card);display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          ${EXTRA_MODULES.map(
            (m) => `
              <button
                type="button"
                data-nav-route="${m.route}"
                style="padding:10px 6px;border-radius:10px;border:1px solid var(--border-color);background:${
                  currentRoute === m.route ? '#dcfce7' : 'var(--bg-page)'
                };color:${currentRoute === m.route ? '#065f46' : 'var(--text-main)'};font-weight:700;font-size:0.78rem;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;"
              >
                <span style="font-size:1.15rem;">${m.icon}</span>
                <span>${m.label}</span>
              </button>
            `
          ).join('')}
        </div>
      `
      : '';

    navEl.innerHTML = `
      ${sheetHtml}
      <div style="display:grid;grid-template-columns:repeat(${PRIMARY_ITEMS.length},1fr);width:100%;background:var(--bg-card);">
        ${PRIMARY_ITEMS.map((item) => {
          const active =
            currentRoute === item.route ||
            (item.route === 'more' && ['patrimoine', 'archives', 'administration'].includes(currentRoute));
          return `
            <button
              type="button"
              data-nav-route="${item.route}"
              style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:8px 4px;border:0;background:transparent;color:${
                active ? '#0a6e2c' : '#6b7280'
              };font-weight:${active ? '800' : '600'};font-size:0.72rem;cursor:pointer;"
            >
              <span style="font-size:1.08rem;line-height:1;">${item.icon}</span>
              <span>${item.label}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;

    navEl.querySelectorAll('[data-nav-route]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.navRoute;
        if (target === 'more') {
          moreSheetOpen = !moreSheetOpen;
          renderNav();
          return;
        }
        moreSheetOpen = false;
        router.navigate(target);
      });
    });
  };

  renderNav();
  store.subscribe(renderNav);
}
