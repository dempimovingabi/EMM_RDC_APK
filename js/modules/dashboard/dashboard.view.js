// js/modules/dashboard/dashboard.view.js
// Vue Tableau de Bord analytique — EMM RD CONGO

import { APP_CONFIG, ROLE_LABELS } from '../../config/constants.js';
import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { escapeHTML, formatNumberFr, formatCurrencyUsd } from '../../utils/dom.js';
import { formatTodayFr, formatDateFr } from '../../utils/date.js';
import { computeDashboardMetrics } from './dashboard.stats.js';

function renderQuarterlyBars(series = []) {
  const maxVal = Math.max(
    1,
    ...series.flatMap((s) => [Number(s.entrees) || 0, Number(s.sorties) || 0])
  );

  return `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;align-items:end;height:150px;padding-top:16px;">
      ${series
        .map((item) => {
          const hIn = Math.max(6, Math.round((item.entrees / maxVal) * 105));
          const hOut = Math.max(6, Math.round((item.sorties / maxVal) * 105));
          return `
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
              <div style="display:flex;align-items:flex-end;gap:6px;height:110px;">
                <div title="Entrées : ${formatCurrencyUsd(item.entrees)}"
                     style="width:20px;height:${hIn}px;background:#0a6e2c;border-radius:6px 6px 0 0;"></div>
                <div title="Sorties : ${formatCurrencyUsd(item.sorties)}"
                     style="width:20px;height:${hOut}px;background:#dc2626;border-radius:6px 6px 0 0;"></div>
              </div>
              <strong style="font-size:0.78rem;">${escapeHTML(item.label)}</strong>
              <span style="font-size:0.7rem;color:var(--text-muted);">
                +${formatNumberFr(item.entrees)}$ / -${formatNumberFr(item.sorties)}$
              </span>
            </div>
          `;
        })
        .join('')}
    </div>
    <div style="display:flex;gap:16px;justify-content:center;margin-top:10px;font-size:0.8rem;">
      <span><strong style="color:#0a6e2c;">■</strong> Entrées (USD)</span>
      <span><strong style="color:#dc2626;">■</strong> Sorties (USD)</span>
    </div>
  `;
}

export async function renderDashboardView(container) {
  const { user, activeProvince } = store.getState();
  const roleLabel = ROLE_LABELS[user?.role] || 'Utilisateur';
  const todayLabel = formatTodayFr();

  container.innerHTML = `<div class="card"><p>Chargement des indicateurs...</p></div>`;

  const metrics = await computeDashboardMetrics(activeProvince);
  const { culte, totalRecettesUsd, series } = metrics;

  container.innerHTML = `
    <section class="module-page dashboard-page">
      <!-- Bannière institutionnelle -->
      <div class="card" style="background:linear-gradient(135deg,#0d8a38,#043c16);color:#ffffff;border:0;">
        <div style="font-size:0.8rem;opacity:0.9;text-transform:capitalize;">${escapeHTML(todayLabel)}</div>
        <h2 style="margin:6px 0 4px;color:#ffffff;font-size:1.18rem;">${APP_CONFIG.churchName}</h2>
        <div style="font-size:0.84rem;opacity:0.92;">
          Connecté : <strong>${escapeHTML(user?.email || 'Utilisateur')}</strong> (${escapeHTML(roleLabel)}) • Province : <strong>${escapeHTML(activeProvince)}</strong>
        </div>
      </div>

      <!-- Cartes KPI -->
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px;">
        <div class="card" style="margin:0;">
          <div style="font-size:0.78rem;color:var(--text-muted);">Membres (MB)</div>
          <div style="font-size:1.35rem;font-weight:800;color:var(--green-main);">${formatNumberFr(culte.mb)}</div>
        </div>
        <div class="card" style="margin:0;">
          <div style="font-size:0.78rem;color:var(--text-muted);">Sympathisants (SY)</div>
          <div style="font-size:1.35rem;font-weight:800;">${formatNumberFr(culte.sy)}</div>
        </div>
        <div class="card" style="margin:0;">
          <div style="font-size:0.78rem;color:var(--text-muted);">Nouveaux Venus (NV)</div>
          <div style="font-size:1.35rem;font-weight:800;">${formatNumberFr(culte.nv)}</div>
        </div>
        <div class="card" style="margin:0;">
          <div style="font-size:0.78rem;color:var(--text-muted);">Recettes Cumulées</div>
          <div style="font-size:1.25rem;font-weight:800;color:#eab308;">${formatCurrencyUsd(totalRecettesUsd)}</div>
        </div>
      </div>

      <!-- Synthèse Fréquentation Nationale -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
          <div>
            <strong>Effectif Total Cultes RDC : ${formatNumberFr(culte.total)}</strong>
            <div style="font-size:0.8rem;color:var(--text-muted);">
              ${culte.entitiesCount} entités actives ${culte.culteDate ? `• Dernier culte : ${escapeHTML(formatDateFr(culte.culteDate))}` : ''}
            </div>
          </div>
          <button type="button" id="btn-dash-go-freq" class="btn-primary">Ouvrir Fréquences</button>
        </div>
      </div>

      <!-- Graphique Trimestriel Glissant -->
      <div class="card">
        <h3 style="margin:0 0 4px;font-size:1rem;">Évolution Financière Trimestrielle (3 derniers mois)</h3>
        <p style="margin:0;font-size:0.8rem;color:var(--text-muted);">Comparaison Entrées / Sorties converties en USD</p>
        ${renderQuarterlyBars(series)}
      </div>
    </section>
  `;

  container.querySelector('#btn-dash-go-freq')?.addEventListener('click', () => {
    router.navigate('frequences', { tab: 'cultes' });
  });
}
