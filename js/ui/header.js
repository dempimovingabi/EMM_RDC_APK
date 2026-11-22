// js/ui/header.js
// En-tête applicatif avec bouton Hamburger & accès Administration — EMM RD CONGO

import { APP_CONFIG, PROVINCES_RDC } from '../config/constants.js';
import { store } from '../core/store.js';
import { setActiveProvince } from '../core/province.context.js';
import { router } from '../core/router.js';
import { escapeHTML } from '../utils/dom.js';

function ensureDrawerExists() {
  let drawer = document.getElementById('emm-side-drawer');
  if (drawer) return drawer;

  drawer = document.createElement('aside');
  drawer.id = 'emm-side-drawer';
  drawer.className = 'emm-drawer hidden';
  drawer.style.cssText = `
    position:fixed;
    top:0;
    left:0;
    bottom:0;
    width:270px;
    max-width:82vw;
    background:#ffffff;
    color:#111827;
    z-index:999;
    box-shadow:4px 0 20px rgba(0,0,0,0.25);
    padding:16px;
    display:flex;
    flex-direction:column;
    gap:8px;
    overflow-y:auto;
  `;

  let backdrop = document.getElementById('emm-drawer-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'emm-drawer-backdrop';
    backdrop.className = 'hidden';
    backdrop.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(0,0,0,0.45);
      z-index:998;
    `;
    document.body.appendChild(backdrop);
  }

  document.body.appendChild(drawer);
  return drawer;
}

export function initHeader(onLogout) {
  const headerEl =
    document.getElementById('app-header') ||
    document.querySelector('header.app-header') ||
    document.querySelector('header');

  if (!headerEl) return;

  const drawer = ensureDrawerExists();
  const backdrop = document.getElementById('emm-drawer-backdrop');

  const closeDrawer = () => {
    drawer.classList.add('hidden');
    drawer.style.display = 'none';
    backdrop?.classList.add('hidden');
    if (backdrop) backdrop.style.display = 'none';
  };

  const openDrawer = () => {
    const { user, activeProvince } = store.getState();
    drawer.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid #e5e7eb;">
        <div>
          <strong style="color:#0a6e2c;font-size:1rem;">${escapeHTML(APP_CONFIG.shortName)}</strong>
          <div style="font-size:0.75rem;color:#4b5563;">${escapeHTML(user?.email || 'Session active')}</div>
          <div style="font-size:0.72rem;color:#0a6e2c;font-weight:600;">Province : ${escapeHTML(activeProvince)}</div>
        </div>
        <button type="button" id="btn-close-drawer" style="border:0;background:transparent;font-size:1.3rem;cursor:pointer;">✕</button>
      </div>

      <button type="button" class="drawer-nav-btn" data-route="dashboard" style="text-align:left;padding:10px;border:0;border-radius:8px;background:#f3f4f6;font-weight:600;cursor:pointer;">
        🏠 Tableau de Bord
      </button>
      <button type="button" class="drawer-nav-btn" data-route="frequences" style="text-align:left;padding:10px;border:0;border-radius:8px;background:#f3f4f6;font-weight:600;cursor:pointer;">
        📊 Fréquences
      </button>
      <button type="button" class="drawer-nav-btn" data-route="finance" style="text-align:left;padding:10px;border:0;border-radius:8px;background:#f3f4f6;font-weight:600;cursor:pointer;">
        💰 Finance
      </button>
      <button type="button" class="drawer-nav-btn" data-route="depouillement" style="text-align:left;padding:10px;border:0;border-radius:8px;background:#f3f4f6;font-weight:600;cursor:pointer;">
        🧾 Dépouillement
      </button>
      <button type="button" class="drawer-nav-btn" data-route="patrimoine" style="text-align:left;padding:10px;border:0;border-radius:8px;background:#f3f4f6;font-weight:600;cursor:pointer;">
        🏛️ Patrimoine
      </button>
      <button type="button" class="drawer-nav-btn" data-route="archives" style="text-align:left;padding:10px;border:0;border-radius:8px;background:#f3f4f6;font-weight:600;cursor:pointer;">
        🗂️ Archives
      </button>
      <button type="button" id="btn-drawer-admin" data-route="administration" style="text-align:left;padding:10px;border:0;border-radius:8px;background:#dcfce7;color:#065f46;font-weight:700;cursor:pointer;">
        ⚙️ Administration
      </button>

      <div style="margin-top:auto;padding-top:12px;border-top:1px solid #e5e7eb;">
        <button type="button" id="btn-drawer-logout" style="width:100%;padding:10px;border:0;border-radius:8px;background:#fee2e2;color:#991b1b;font-weight:700;cursor:pointer;">
          Déconnexion
        </button>
      </div>
    `;

    drawer.querySelector('#btn-close-drawer')?.addEventListener('click', closeDrawer);

    drawer.querySelectorAll('.drawer-nav-btn, #btn-drawer-admin').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetRoute = btn.dataset.route;
        closeDrawer();
        if (targetRoute) {
          router.navigate(targetRoute);
        }
      });
    });

    drawer.querySelector('#btn-drawer-logout')?.addEventListener('click', async () => {
      closeDrawer();
      if (typeof onLogout === 'function') {
        await onLogout();
      }
    });

    drawer.classList.remove('hidden');
    drawer.style.display = 'flex';
    backdrop?.classList.remove('hidden');
    if (backdrop) backdrop.style.display = 'block';
  };

  backdrop?.addEventListener('click', closeDrawer);
  closeDrawer();

  const renderHeader = () => {
    const { isAuthenticated, activeProvince } = store.getState();

    if (!isAuthenticated) {
      headerEl.classList.add('hidden');
      closeDrawer();
      return;
    }

    headerEl.classList.remove('hidden');

    const provOptions = PROVINCES_RDC.map(
      (p) => `<option value="${escapeHTML(p)}" ${p === activeProvince ? 'selected' : ''}>${escapeHTML(p)}</option>`
    ).join('');

    headerEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;">
        <div style="display:flex;align-items:center;gap:8px;">
          <button
            type="button"
            id="btn-hamburger-menu"
            aria-label="Ouvrir le menu"
            title="Menu"
            style="background:rgba(255,255,255,0.16);color:#ffffff;border:1px solid rgba(255,255,255,0.3);border-radius:8px;padding:6px 10px;font-size:1.1rem;line-height:1;cursor:pointer;"
          >
            ☰
          </button>
          <span style="font-weight:800;font-size:0.95rem;color:#ffffff;">${escapeHTML(APP_CONFIG.shortName)}</span>
        </div>

        <div style="display:flex;align-items:center;gap:6px;">
          <select
            id="header-province-select"
            aria-label="Province active"
            style="padding:5px 8px;border-radius:8px;border:0;font-size:0.78rem;font-weight:600;max-width:145px;"
          >
            ${provOptions}
          </select>
          <button
            type="button"
            id="btn-header-admin"
            title="Administration"
            style="background:#ffffff;color:#0a6e2c;border:0;border-radius:8px;padding:6px 9px;font-size:0.78rem;font-weight:700;cursor:pointer;white-space:nowrap;"
          >
            ⚙️ Admin
          </button>
        </div>
      </div>
    `;

    headerEl.querySelector('#btn-hamburger-menu')?.addEventListener('click', openDrawer);
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
