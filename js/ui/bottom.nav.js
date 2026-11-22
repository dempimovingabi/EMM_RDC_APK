// js/ui/bottom-nav.js
// Barre de navigation inférieure — EMM RD CONGO (sans Premium)

import { store } from '../core/store.js';
import { router } from '../core/router.js';

const NAV_ITEMS = [
  { route: 'dashboard', label: 'Accueil', icon: '🏠' },
  { route: 'frequences', label: 'Fréquences', icon: '📊' },
  { route: 'finance', label: 'Finance', icon: '💰' },
  { route: 'depouillement', label: 'Dépouillement', icon: '🧾' },
  { route: 'administration', label: 'Admin', icon: '⚙️' }
];

export function initBottomNav() {
  const navEl =
    document.getElementById('bottom-nav') ||
    document.querySelector('nav.bottom-nav') ||
    document.querySelector('nav');

  if (!navEl) return;

  const renderNav = () => {
    const { isAuthenticated, currentRoute } = store.getState();

    if (!isAuthenticated) {
      navEl.classList.add('hidden');
      return;
    }

    navEl.classList.remove('hidden');
    navEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(${NAV_ITEMS.length},1fr);width:100%;">
        ${NAV_ITEMS.map((item) => {
          const active = currentRoute === item.route;
          return `
            <button
              type="button"
              class="bottom-nav-btn ${active ? 'active' : ''}"
              data-nav-route="${item.route}"
              style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:8px 4px;border:0;background:transparent;color:${active ? '#0a6e2c' : '#6b7280'};font-weight:${active ? '700' : '500'};font-size:0.72rem;cursor:pointer;"
            >
              <span style="font-size:1.05rem;line-height:1;">${item.icon}</span>
              <span>${item.label}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;

    navEl.querySelectorAll('[data-nav-route]').forEach((btn) => {
      btn.addEventListener('click', () => {
        router.navigate(btn.dataset.navRoute);
      });
    });
  };

  renderNav();
  store.subscribe(renderNav);
}
