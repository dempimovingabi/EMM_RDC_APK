// js/modules/dashboard/dashboard.view.js
// Module 1 : Tableau de Bord (Dashboard) — EMM RD CONGO

import { COLLECTIONS } from '../../config/constants.js';
import { listDocuments } from '../../services/firestore.service.js';
import { getActiveProvince } from '../../core/province.context.js';
import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { escapeHTML, formatNumberFr } from '../../utils/dom.js';

function getTodayFrench() {
  const str = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function renderDashboardView(container) {
  const state = store.getState() || {};
  const user = state.user || state.currentUser || {};
  const province = getActiveProvince();

  const [cultesNat, versements, candidats, depouillements, patrimoineSites] = await Promise.all([
    listDocuments(COLLECTIONS.FREQ_CULTE_NATIONAL).catch(() => []),
    listDocuments(COLLECTIONS.VERSEMENTS).catch(() => []),
    listDocuments(COLLECTIONS.CANDIDATS).catch(() => []),
    listDocuments(COLLECTIONS.DEPOUILLEMENTS).catch(() => []),
    listDocuments(COLLECTIONS.PATRIMOINE_SITES).catch(() => [])
  ]);

  // Totaux Cultes RDC
  const dernierCulte = cultesNat[0] || null;
  let totalMb = 0, totalSy = 0, totalNv = 0, nbEntites = 0;
  if (dernierCulte && Array.isArray(dernierCulte.provinces)) {
    dernierCulte.provinces.forEach((p) => {
      (p.entites || []).forEach((e) => {
        nbEntites += 1;
        totalMb += Number(e.mb) || 0;
        totalSy += Number(e.sy) || 0;
        totalNv += Number(e.nv) || 0;
      });
    });
  }
  const totalGeneralCulte = totalMb + totalSy + totalNv;

  // Recettes cumulées converties en USD
  const totalUsd = versements.reduce((sum, v) => {
    const montant = Number(v.montant) || 0;
    if (v.devise === 'FC') {
      const taux = Number(v.taux) || 2800;
      return sum + (taux > 0 ? montant / taux : 0);
    }
    return sum + montant;
  }, 0);

  const modulesCards = [
    {
      route: 'frequences',
      icon: '📊',
      title: 'Fréquences',
      desc: 'Diffusion journalière, Diffusion suite, Numérique & Synthèse nationale'
    },
    {
      route: 'finance',
      icon: '💰',
      title: 'Finance',
      desc: `Candidats (${candidats.length}) & Versements USD/FC (${versements.length})`
    },
    {
      route: 'depouillement',
      icon: '🧾',
      title: 'Dépouillement',
      desc: `Séances (${depouillements.length}) & comptage des 7 rubriques`
    },
    {
      route: 'patrimoine',
      icon: '🏛️',
      title: 'Patrimoine',
      desc: `Sites (${patrimoineSites.length}), biens mobiliers & réparations`
    },
    {
      route: 'archives',
      icon: '🗂️',
      title: 'Archives',
      desc: 'Classement annuel, recherche & restauration des dossiers'
    },
    {
      route: 'administration',
      icon: '⚙️',
      title: 'Administration',
      desc: 'Utilisateurs, annonces officielles & sauvegarde JSON'
    }
  ];

  container.innerHTML = `
    <section class="module-page dashboard-page">
      <div class="card" style="background:linear-gradient(135deg,#0d8a38,#0a6e2c,#043c16);color:#ffffff;border:0;">
        <div style="font-size:0.84rem;opacity:0.92;">${escapeHTML(getTodayFrench())}</div>
        <h2 style="margin:4px 0 6px;color:#ffffff;font-size:1.25rem;">ÉGLISE MESSIANIQUE MONDIALE</h2>
        <div style="font-size:0.84rem;">
          Connecté : <strong>${escapeHTML(user.email || 'Utilisateur')}</strong> • Province : <strong>${escapeHTML(province)}</strong>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Membres (MB)</div>
          <div class="kpi-value">${formatNumberFr(totalMb)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Sympathisants (SY)</div>
          <div class="kpi-value">${formatNumberFr(totalSy)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Nouveaux Venus (NV)</div>
          <div class="kpi-value">${formatNumberFr(totalNv)}</div>
        </div>
        <div class="kpi-card" style="border-left-color:#d97706;">
          <div class="kpi-label">Recettes Cumulées</div>
          <div class="kpi-value" style="color:#d97706;">${totalUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div>
            <strong>Effectif Total Cultes RDC : ${formatNumberFr(totalGeneralCulte)}</strong>
            <div style="font-size:0.8rem;color:var(--text-muted);">
              ${nbEntites} entités actives${dernierCulte?.culteDate ? ` • Culte du ${escapeHTML(dernierCulte.culteDate)}` : ''}
            </div>
          </div>
          <button type="button" class="btn-primary" data-go="frequences">Ouvrir Fréquences</button>
        </div>
      </div>

      <h3 style="margin:12px 0 8px;font-size:1rem;">Accès Direct aux Modules EMM RD CONGO</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;">
        ${modulesCards
          .map(
            (m) => `
            <div class="card" style="margin-bottom:0;display:flex;flex-direction:column;justify-content:space-between;gap:10px;">
              <div>
                <div style="font-weight:800;font-size:0.98rem;color:var(--green-main);">${m.icon} ${m.title}</div>
                <p style="margin:4px 0 0;font-size:0.82rem;color:var(--text-muted);">${m.desc}</p>
              </div>
              <button type="button" class="btn-secondary" data-go="${m.route}" style="align-self:flex-start;">
                Ouvrir ${m.title}
              </button>
            </div>
          `
          )
          .join('')}
      </div>
    </section>
  `;

  container.querySelectorAll('[data-go]').forEach((btn) => {
    btn.addEventListener('click', () => {
      router.navigate(btn.dataset.go);
    });
  });
}
