// js/modules/frequences/frequences.page.js
// Contrôleur principal Module Fréquences (3 onglets) — EMM RD CONGO[span_10](start_span)[span_10](end_span)

import { getActiveProvince } from '../../core/province.context.js';
import { renderStatistiquesCultesView } from './statistiques-cultes/statistiques.view.js';
import { renderDiffusionView } from './diffusion/diffusion.view.js';
import { renderNumeriqueView } from './numerique/numerique.view.js';

export async function renderFrequencesPage(container, params = {}) {
  const activeTab = params.tab || 'cultes';
  const province = getActiveProvince();

  container.innerHTML = `
    <section class="module-page frequences-page">
      <div class="page-header">
        <h2>Fréquences — ${province}</h2>
      </div>

      <div class="tabs-bar" role="tablist">
        <button type="button" class="tab-btn ${activeTab === 'diffusion' ? 'active' : ''}" data-tab="diffusion">
          Diffusion
        </button>
        <button type="button" class="tab-btn ${activeTab === 'numerique' ? 'active' : ''}" data-tab="numerique">
          Numérique
        </button>
        <button type="button" class="tab-btn ${activeTab === 'cultes' ? 'active' : ''}" data-tab="cultes">
          Statistiques Cultes RDC
        </button>
      </div>

      <div id="frequences-tab-content" class="tab-content"></div>
    </section>
  `;

  const tabContent = container.querySelector('#frequences-tab-content');

  const renderTab = async (tabName) => {
    if (!tabContent) return;
    if (tabName === 'cultes') {
      renderStatistiquesCultesView(tabContent);
    } else if (tabName === 'diffusion') {
      await renderDiffusionView(tabContent);
    } else {
      await renderNumeriqueView(tabContent);
    }
  };

  await renderTab(activeTab);

  container.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      container.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      await renderTab(btn.dataset.tab);
    });
  });
}
