// js/modules/depouillement/depouillement.view.js
// Module Dépouillement (Séances & Lignes de collecte USD/FC) — EMM RD CONGO

import { COLLECTIONS, FINANCE_CURRENCIES } from '../../config/constants.js';
import { listDocuments, setDocument, deleteDocument } from '../../services/firestore.service.js';
import { exportHtmlToExcel } from '../../services/export.service.js';
import { getActiveProvince } from '../../core/province.context.js';
import { escapeHTML, formatCurrencyUsd, formatNumberFr } from '../../utils/dom.js';
import { showToast } from '../../ui/toast.js';

const COLLECTE_CATEGORIES = [
  'Offrande dominicale',
  'Dîme',
  'Don spécial',
  'Offrande de reconnaissance',
  'Autre collecte'
];

function lineToUsd(montant, devise, taux) {
  const val = Math.max(0, Number(montant) || 0);
  if (String(devise || 'USD').toUpperCase() === 'USD') {
    return val;
  }
  const rate = Number(taux) || 0;
  return rate > 0 ? val / rate : 0;
}

export async function renderDepouillementView(container) {
  let selectedSeanceId = '';

  const render = async () => {
    const province = getActiveProvince();
    const todayIso = new Date().toISOString().slice(0, 10);

    const [allSeances, allLignes] = await Promise.all([
      listDocuments(COLLECTIONS.DEPOUILLEMENTS),
      listDocuments(COLLECTIONS.DEPOUILLEMENT_LIGNES)
    ]);

    const seancesProv = allSeances
      .filter((s) => String(s.province || '').toUpperCase() === province.toUpperCase())
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    if (!selectedSeanceId && seancesProv.length > 0) {
      selectedSeanceId = seancesProv[0].id;
    }

    const activeSeance = seancesProv.find((s) => s.id === selectedSeanceId) || null;
    const lignesSeance = activeSeance
      ? allLignes.filter((l) => l.seanceId === activeSeance.id)
      : [];

    const totalUsd = lignesSeance.reduce(
      (sum, l) => sum + lineToUsd(l.montant, l.devise, l.taux || activeSeance?.taux || 2800),
      0
    );

    const totalFcDirect = lignesSeance
      .filter((l) => String(l.devise || '').toUpperCase() === 'FC')
      .reduce((sum, l) => sum + (Number(l.montant) || 0), 0);

    const seanceOptions = seancesProv
      .map(
        (s) =>
          `<option value="${escapeHTML(s.id)}" ${s.id === selectedSeanceId ? 'selected' : ''}>${escapeHTML(s.date || '')} — ${escapeHTML(s.titre || 'Séance')}</option>`
      )
      .join('');

    const categoryOptions = COLLECTE_CATEGORIES.map(
      (cat) => `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`
    ).join('');

    const currencyOptions = FINANCE_CURRENCIES.map(
      (cur) => `<option value="${escapeHTML(cur)}">${escapeHTML(cur)}</option>`
    ).join('');

    container.innerHTML = `
      <section class="module-page depouillement-page">
        <div class="page-header">
          <h2>Dépouillement — ${escapeHTML(province)}</h2>
        </div>

        <!-- Création d'une séance de dépouillement -->
        <div class="card">
          <h3 style="margin:0 0 10px;">Nouvelle Séance de Dépouillement</h3>
          <form id="form-new-seance" class="form-stack">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
              <div class="form-group">
                <label for="seance-date">Date</label>
                <input id="seance-date" type="date" value="${todayIso}" required />
              </div>
              <div class="form-group">
                <label for="seance-titre">Intitulé / Séance</label>
                <input id="seance-titre" type="text" required placeholder="Ex: Culte du dimanche" />
              </div>
              <div class="form-group">
                <label for="seance-taux">Taux du jour (FC / $)</label>
                <input id="seance-taux" type="number" min="1" step="0.01" value="2800" required />
              </div>
            </div>
            <button type="submit" class="btn-primary">Créer la séance</button>
          </form>
        </div>

        <!-- Sélection de séance active & ajout de ligne -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
            <div class="form-group" style="flex:1;min-width:220px;margin:0;">
              <label for="select-seance-active">Séance active</label>
              <select id="select-seance-active">
                ${
                  seancesProv.length === 0
                    ? `<option value="">Aucune séance créée pour ${escapeHTML(province)}</option>`
                    : seanceOptions
                }
              </select>
            </div>
            ${
              activeSeance
                ? `<button type="button" id="btn-export-seance-xls" class="btn-secondary">📊 Exporter Excel (.xls)</button>`
                : ''
            }
          </div>

          ${
            activeSeance
              ? `
                <form id="form-add-ligne" class="form-stack" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color);">
                  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
                    <div class="form-group">
                      <label for="ligne-entity">Entité</label>
                      <input id="ligne-entity" type="text" required placeholder="Ex: KANANGA — FOYER 1" />
                    </div>
                    <div class="form-group">
                      <label for="ligne-categorie">Catégorie</label>
                      <select id="ligne-categorie">${categoryOptions}</select>
                    </div>
                  </div>
                  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
                    <div class="form-group">
                      <label for="ligne-montant">Montant</label>
                      <input id="ligne-montant" type="number" min="0" step="0.01" required />
                    </div>
                    <div class="form-group">
                      <label for="ligne-devise">Devise</label>
                      <select id="ligne-devise">${currencyOptions}</select>
                    </div>
                  </div>
                  <button type="submit" class="btn-primary">+ Ajouter la ligne de collecte</button>
                </form>
              `
              : `<p style="color:var(--text-muted);margin:8px 0 0;">Créez d'abord une séance ci-dessus pour saisir les lignes de dépouillement.</p>`
          }
        </div>

        <!-- Tableau des lignes & Totaux -->
        ${
          activeSeance
            ? `
              <div class="card">
                <h3 style="margin:0 0 10px;">Lignes de la séance — ${escapeHTML(activeSeance.titre || '')} (${escapeHTML(activeSeance.date || '')})</h3>
                <div class="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Entité</th>
                        <th>Catégorie</th>
                        <th>Montant</th>
                        <th>Équivalent USD</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${
                        lignesSeance.length === 0
                          ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Aucune ligne enregistrée dans cette séance.</td></tr>`
                          : lignesSeance
                              .map((l) => {
                                const eqUsd = lineToUsd(l.montant, l.devise, l.taux || activeSeance.taux || 2800);
                                return `
                                  <tr>
                                    <td><strong>${escapeHTML(l.entityName || '')}</strong></td>
                                    <td>${escapeHTML(l.categorie || '')}</td>
                                    <td>${formatNumberFr(l.montant)} ${escapeHTML(l.devise || 'USD')}</td>
                                    <td><strong>${formatCurrencyUsd(eqUsd)}</strong></td>
                                    <td>
                                      <button type="button" class="btn-icon btn-del-ligne" data-id="${escapeHTML(l.id)}" title="Supprimer">🗑️</button>
                                    </td>
                                  </tr>
                                `;
                              })
                              .join('')
                      }
                    </tbody>
                    <tfoot>
                      <tr style="background:rgba(10,110,44,0.12);font-weight:800;">
                        <td colspan="2">TOTAL SÉANCE</td>
                        <td>${formatNumberFr(totalFcDirect)} FC (détail FC)</td>
                        <td>${formatCurrencyUsd(totalUsd)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            `
            : ''
        }
      </section>
    `;

    container.querySelector('#form-new-seance')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const created = await setDocument(COLLECTIONS.DEPOUILLEMENTS, null, {
        province,
        date: f['seance-date'].value,
        titre: f['seance-titre'].value.trim(),
        taux: Math.max(1, Number(f['seance-taux'].value) || 2800),
        statut: 'Ouverte'
      });
      selectedSeanceId = created.id;
      showToast('Séance de dépouillement créée.', 'success');
      render();
    });

    container.querySelector('#select-seance-active')?.addEventListener('change', (e) => {
      selectedSeanceId = e.target.value;
      render();
    });

    container.querySelector('#form-add-ligne')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeSeance) return;
      const f = e.target;
      await setDocument(COLLECTIONS.DEPOUILLEMENT_LIGNES, null, {
        seanceId: activeSeance.id,
        province,
        entityName: f['ligne-entity'].value.trim().toUpperCase(),
        categorie: f['ligne-categorie'].value,
        montant: Math.max(0, Number(f['ligne-montant'].value) || 0),
        devise: f['ligne-devise'].value,
        taux: Number(activeSeance.taux) || 2800
      });
      showToast('Ligne de dépouillement ajoutée.', 'success');
      render();
    });

    container.querySelectorAll('.btn-del-ligne').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await deleteDocument(COLLECTIONS.DEPOUILLEMENT_LIGNES, btn.dataset.id);
        showToast('Ligne supprimée.', 'info');
        render();
      });
    });

    container.querySelector('#btn-export-seance-xls')?.addEventListener('click', () => {
      if (!activeSeance) return;
      const rowsHtml = lignesSeance
        .map((l) => {
          const eqUsd = lineToUsd(l.montant, l.devise, l.taux || activeSeance.taux || 2800);
          return `<tr><td>${escapeHTML(l.entityName)}</td><td>${escapeHTML(l.categorie)}</td><td>${l.montant}</td><td>${escapeHTML(l.devise)}</td><td>${eqUsd.toFixed(2)}</td></tr>`;
        })
        .join('');
      exportHtmlToExcel(
        `<h3>Dépouillement — ${escapeHTML(province)} (${escapeHTML(activeSeance.date)})</h3><table border="1"><thead><tr><th>Entité</th><th>Catégorie</th><th>Montant</th><th>Devise</th><th>Équivalent USD</th></tr></thead><tbody>${rowsHtml}</tbody></table>`,
        `Depouillement_${province}_${activeSeance.date || 'seance'}.xls`
      );
      showToast('Export Excel (.xls) généré.', 'success');
    });
  };

  await render();
}
