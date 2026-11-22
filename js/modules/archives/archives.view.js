// js/modules/archives/archives.view.js
// Module Archives & Recherche transversale — EMM RD CONGO

import { COLLECTIONS } from '../../config/constants.js';
import { listDocuments } from '../../services/firestore.service.js';
import { exportHtmlToWord, exportHtmlToExcel } from '../../services/export.service.js';
import { getActiveProvince } from '../../core/province.context.js';
import { escapeHTML, formatCurrencyUsd } from '../../utils/dom.js';
import { showToast } from '../../ui/toast.js';

export async function renderArchivesView(container) {
  let queryText = '';

  const render = async () => {
    const province = getActiveProvince();
    const [candidats, depouillements, rapportsNum] = await Promise.all([
      listDocuments(COLLECTIONS.CANDIDATS),
      listDocuments(COLLECTIONS.DEPOUILLEMENTS),
      listDocuments(COLLECTIONS.FREQ_NUMERIQUE)
    ]);

    const archivedCandidats = candidats.filter((c) => Boolean(c.archived));
    const q = queryText.trim().toLowerCase();

    const filteredCandidats = archivedCandidats.filter((c) => {
      if (!q) return true;
      return (
        String(c.nom || '').toLowerCase().includes(q) ||
        String(c.province || '').toLowerCase().includes(q) ||
        String(c.motif || '').toLowerCase().includes(q)
      );
    });

    const summaryHtml = `
      <div id="archives-export-zone">
        <div class="card">
          <h3 style="margin:0 0 8px;">Synthèse des Archives (${escapeHTML(province)})</h3>
          <p style="margin:0 0 12px;font-size:0.86rem;color:var(--text-muted);">
            Candidats archivés : <strong>${archivedCandidats.length}</strong> •
            Séances de dépouillement : <strong>${depouillements.length}</strong> •
            Rapports numériques : <strong>${rapportsNum.length}</strong>
          </p>

          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Candidat archivé</th>
                  <th>Province</th>
                  <th>Motif</th>
                  <th>Montant prévu</th>
                </tr>
              </thead>
              <tbody>
                ${
                  filteredCandidats.length === 0
                    ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Aucune archive correspondante.</td></tr>`
                    : filteredCandidats
                        .map(
                          (c) => `
                            <tr>
                              <td><strong>${escapeHTML(c.nom || '')}</strong></td>
                              <td>${escapeHTML(c.province || '')}</td>
                              <td>${escapeHTML(c.motif || '')}</td>
                              <td>${formatCurrencyUsd(c.montantPrevu)}</td>
                            </tr>
                          `
                        )
                        .join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = `
      <section class="module-page archives-page">
        <div class="page-header">
          <h2>Archives — ${escapeHTML(province)}</h2>
        </div>

        <div class="card">
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;">
            <input
              id="archive-search-input"
              type="search"
              value="${escapeHTML(queryText)}"
              placeholder="Rechercher un nom, une province ou un motif..."
              style="flex:1;min-width:200px;"
            />
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button type="button" id="btn-export-archives-doc" class="btn-secondary">📄 Export Word (.doc)</button>
              <button type="button" id="btn-export-archives-xls" class="btn-secondary">📊 Export Excel (.xls)</button>
            </div>
          </div>
        </div>

        ${summaryHtml}
      </section>
    `;

    container.querySelector('#archive-search-input')?.addEventListener('input', (e) => {
      queryText = e.target.value;
      render();
    });

    container.querySelector('#btn-export-archives-doc')?.addEventListener('click', () => {
      const zone = container.querySelector('#archives-export-zone')?.innerHTML || '';
      exportHtmlToWord(zone, `Archives_EMM_RDC_${province}.doc`);
      showToast('Export Word (.doc) généré.', 'success');
    });

    container.querySelector('#btn-export-archives-xls')?.addEventListener('click', () => {
      const zone = container.querySelector('#archives-export-zone')?.innerHTML || '';
      exportHtmlToExcel(zone, `Archives_EMM_RDC_${province}.xls`);
      showToast('Export Excel (.xls) généré.', 'success');
    });
  };

  await render();
}
