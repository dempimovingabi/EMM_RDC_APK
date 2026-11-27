// js/ui/header.js
// En-tête applicatif avec bouton Hamburger, bouton Retour vers Tableau de bord & Tutoriels — EMM RD CONGO

import { APP_CONFIG, PROVINCES_RDC } from '../config/constants.js';
import { store } from '../core/store.js';
import { setActiveProvince } from '../core/province.context.js';
import { router } from '../core/router.js';
import { escapeHTML } from '../utils/dom.js';

function isUserConnected(state) {
  if (!state) return false;
  if (state.currentRoute === 'login') return false;
  return Boolean(state.isAuthenticated || state.user || state.currentUser || state.currentRoute);
}

function ensureDrawerExists() {
  let drawer = document.getElementById('emm-side-drawer');
  if (drawer) return drawer;

  drawer = document.createElement('aside');
  drawer.id = 'emm-side-drawer';
  drawer.style.cssText = `
    position:fixed;
    top:0;
    left:0;
    bottom:0;
    width:275px;
    max-width:84vw;
    background:#ffffff;
    color:#111827;
    z-index:2500;
    box-shadow:4px 0 24px rgba(0,0,0,0.3);
    padding:16px;
    display:none;
    flex-direction:column;
    gap:8px;
    overflow-y:auto;
  `;

  let backdrop = document.getElementById('emm-drawer-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'emm-drawer-backdrop';
    backdrop.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(0,0,0,0.5);
      z-index:2490;
      display:none;
    `;
    document.body.appendChild(backdrop);
  }

  document.body.appendChild(drawer);
  return drawer;
}

function ensureBackBarExists() {
  let backBar = document.getElementById('emm-module-back-bar');
  if (backBar) return backBar;

  const mainEl = document.getElementById('app-main') || document.querySelector('main');
  if (!mainEl) return null;

  backBar = document.createElement('div');
  backBar.id = 'emm-module-back-bar';
  backBar.className = 'no-print';
  backBar.style.cssText = `
    display:none;
    align-items:center;
    justify-content:space-between;
    gap:8px;
    margin-bottom:10px;
    padding:8px 10px;
    background:var(--bg-card);
    border:1px solid var(--border-color);
    border-radius:10px;
  `;

  mainEl.insertBefore(backBar, mainEl.firstChild);
  return backBar;
}

export function initHeader(onLogout) {
  const headerEl =
    document.getElementById('app-header') ||
    document.querySelector('header.app-header') ||
    document.querySelector('header');

  if (!headerEl) return;

  const drawer = ensureDrawerExists();
  const backdrop = document.getElementById('emm-drawer-backdrop');
  const backBar = ensureBackBarExists();

  const closeDrawer = () => {
    drawer.style.display = 'none';
    if (backdrop) backdrop.style.display = 'none';
  };

  const openDrawer = () => {
    const state = store.getState() || {};
    const user = state.user || state.currentUser || {};
    const activeProvince = state.activeProvince || 'KASAÏ-CENTRAL';

    const menuItems = [
      { route: 'dashboard', icon: '🏠', label: 'Tableau de Bord' },
      { route: 'frequences', icon: '📊', label: 'Fréquences' },
      { route: 'finance', icon: '💰', label: 'Finance (Candidats & Versements)' },
      { route: 'depouillement', icon: '🧾', label: 'Dépouillement des Offrandes' },
      { route: 'patrimoine', icon: '🏛️', label: 'Patrimoine' },
      { route: 'archives', icon: '🗂️', label: 'Archives' },
      { route: 'administration', icon: '⚙️', label: 'Administration' },
      { route: 'tutoriels', icon: '🎓', label: 'Tutoriels & Guide d’utilisation' }
    ];

    drawer.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid #e5e7eb;">
        <div>
          <strong style="color:#0a6e2c;font-size:1rem;">${escapeHTML(APP_CONFIG.shortName)}</strong>
          <div style="font-size:0.75rem;color:#4b5563;">${escapeHTML(user.email || 'Session active')}</div>
          <div style="font-size:0.72rem;color:#0a6e2c;font-weight:700;">Province : ${escapeHTML(activeProvince)}</div>
        </div>
        <button type="button" id="btn-close-drawer" style="border:0;background:transparent;font-size:1.35rem;cursor:pointer;color:#111827;">✕</button>
      </div>

      ${menuItems
        .map(
          (item) => `
          <button
            type="button"
            class="drawer-nav-btn"
            data-route="${item.route}"
            style="text-align:left;padding:10px 12px;border:0;border-radius:9px;background:${
              item.route === 'administration'
                ? '#dcfce7'
                : item.route === 'tutoriels'
                ? '#fef3c7'
                : '#f3f4f6'
            };color:${
              item.route === 'administration'
                ? '#065f46'
                : item.route === 'tutoriels'
                ? '#92400e'
                : '#111827'
            };font-weight:700;font-size:0.86rem;cursor:pointer;"
          >
            ${item.icon} ${item.label}
          </button>
        `
        )
        .join('')}

      <div style="margin-top:auto;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;flex-direction:column;gap:8px;">
        <button type="button" id="btn-drawer-theme" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;background:#ffffff;color:#111827;font-weight:600;cursor:pointer;">
          ☀️ / 🌙 Mode Clair / Sombre
        </button>
        <button type="button" id="btn-drawer-logout" style="width:100%;padding:10px;border:0;border-radius:8px;background:#fee2e2;color:#991b1b;font-weight:700;cursor:pointer;">
          🚪 Déconnexion
        </button>
      </div>
    `;

    drawer.querySelector('#btn-close-drawer')?.addEventListener('click', closeDrawer);

    drawer.querySelectorAll('.drawer-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetRoute = btn.dataset.route;
        closeDrawer();
        if (targetRoute) router.navigate(targetRoute);
      });
    });

    drawer.querySelector('#btn-drawer-theme')?.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-mode');
      localStorage.setItem('emm_dark_mode', isDark ? '1' : '0');
    });

    drawer.querySelector('#btn-drawer-logout')?.addEventListener('click', async () => {
      closeDrawer();
      if (typeof onLogout === 'function') {
        await onLogout();
      }
      router.navigate('login');
    });

    drawer.style.display = 'flex';
    if (backdrop) backdrop.style.display = 'block';
  };

  backdrop?.addEventListener('click', closeDrawer);

  if (localStorage.getItem('emm_dark_mode') === '1') {
    document.body.classList.add('dark-mode');
  }

  const renderHeader = () => {
    const state = store.getState() || {};
    if (!isUserConnected(state)) {
      headerEl.classList.add('hidden');
      headerEl.style.display = 'none';
      if (backBar) backBar.style.display = 'none';
      closeDrawer();
      return;
    }

    const activeProvince = state.activeProvince || 'KASAÏ-CENTRAL';
    const currentRoute = state.currentRoute || 'dashboard';

    headerEl.classList.remove('hidden');
    headerEl.style.display = 'block';

    // Afficher automatiquement le bouton retour vers le Tableau de Bord dans tous les sous-modules
    if (backBar) {
      if (currentRoute && currentRoute !== 'dashboard' && currentRoute !== 'login') {
        backBar.style.display = 'flex';
        backBar.innerHTML = `
          <button
            type="button"
            id="btn-back-to-dashboard"
            style="background:var(--green-main);color:#ffffff;border:0;border-radius:8px;padding:7px 12px;font-size:0.82rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;"
          >
            ← Tableau de bord
          </button>
          <button
            type="button"
            id="btn-backbar-tutoriel"
            style="background:rgba(217,119,6,0.12);color:#b45309;border:1px solid rgba(217,119,6,0.3);border-radius:8px;padding:6px 10px;font-size:0.78rem;font-weight:700;cursor:pointer;"
          >
            🎓 Aide
          </button>
        `;
        backBar.querySelector('#btn-back-to-dashboard')?.addEventListener('click', () => {
          router.navigate('dashboard');
        });
        backBar.querySelector('#btn-backbar-tutoriel')?.addEventListener('click', () => {
          router.navigate('tutoriels');
        });
      } else {
        backBar.style.display = 'none';
      }
    }

    const provOptions = PROVINCES_RDC.map(
      (p) => `<option value="${escapeHTML(p)}" ${p === activeProvince ? 'selected' : ''}>${escapeHTML(p)}</option>`
    ).join('');

    headerEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;width:100%;">
        <div style="display:flex;align-items:center;gap:6px;">
          <button
            type="button"
            id="btn-hamburger-menu"
            aria-label="Ouvrir le menu"
            title="Menu"
            style="background:rgba(255,255,255,0.18);color:#ffffff;border:1px solid rgba(255,255,255,0.35);border-radius:8px;padding:6px 10px;font-size:1.1rem;line-height:1;cursor:pointer;"
          >
            ☰
          </button>
          <span style="font-weight:800;font-size:0.92rem;color:#ffffff;">${escapeHTML(APP_CONFIG.shortName)}</span>
        </div>

        <div style="display:flex;align-items:center;gap:5px;">
          <select
            id="header-province-select"
            aria-label="Province active"
            style="padding:5px 6px;border-radius:8px;border:0;font-size:0.74rem;font-weight:700;max-width:122px;background:#ffffff;color:#111827;"
          >
            ${provOptions}
          </select>
          <button
            type="button"
            id="btn-header-tutoriels"
            title="Tutoriels & Guide"
            style="background:rgba(255,255,255,0.18);color:#ffffff;border:1px solid rgba(255,255,255,0.35);border-radius:8px;padding:6px 8px;font-size:0.78rem;font-weight:700;cursor:pointer;"
          >
            🎓
          </button>
          <button
            type="button"
            id="btn-header-admin"
            title="Administration"
            style="background:#ffffff;color:#0a6e2c;border:0;border-radius:8px;padding:6px 8px;font-size:0.76rem;font-weight:800;cursor:pointer;white-space:nowrap;"
          >
            ⚙️ Admin
          </button>
        </div>
      </div>
    `;

    headerEl.querySelector('#btn-hamburger-menu')?.addEventListener('click', openDrawer);
    headerEl.querySelector('#btn-header-tutoriels')?.addEventListener('click', () => {
      router.navigate('tutoriels');
    });
    headerEl.querySelector('#btn-header-admin')?.addEventListener('click', () => {
      router.navigate('administration');
    });
    headerEl.querySelector('#header-province-select')?.addEventListener('change', (e) => {
      setActiveProvince(e.target.value);
    });
  };

  renderHeader();
  store.subscribe(renderHeader);
}
