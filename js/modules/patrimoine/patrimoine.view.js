// js/modules/patrimoine/patrimoine.view.js
// Module Patrimoine (Biens, Mouvements & Dépenses) — EMM RD CONGO

import { COLLECTIONS } from '../../config/constants.js';
import {
  listDocuments,
  setDocument,
  updateDocument,
  deleteDocument
} from '../../services/firestore.service.js';
import { getActiveProvince } from '../../core/province.context.js';
import { escapeHTML, formatCurrencyUsd, formatNumberFr } from '../../utils/dom.js';
import { showToast } from '../../ui/toast.js';

const BIEN_CATEGORIES = [
  'Immobilier / Local',
  'Mobilier & Bureautique',
  'Matériel Audio / Sono / Informatique',
  'Véhicule & Transport',
  'Objet liturgique / Cultuel',
  'Autre bien'
];

const BIEN_ETATS = ['Bon', 'À réparer', 'Hors service'];

export async function renderPatrimoineView(container) {
  let activeTab = 'biens';

  const render = async () => {
    const province = getActiveProvince();
    const todayIso = new Date().toISOString().slice(0, 10);

    const [allBiens, allMouvements, allDepenses] = await Promise.all([
      listDocuments(COLLECTIONS.PATRIMOINE_BIENS),
      listDocuments(COLLECTIONS.PATRIMOINE_MOUVEMENTS),
      listDocuments(COLLECTIONS.DEPENSES)
    ]);

    const biensProv = allBiens.filter(
      (b) => String(b.province || '').toUpperCase() === province.toUpperCase()
    );
    const mouvementsProv = allMouvements.filter(
      (m) => String(m.province || '').toUpperCase() === province.toUpperCase()
    );
    const depensesProv = allDepenses.filter(
      (d) => String(d.province || '').toUpperCase() === province.toUpperCase()
    );

    const totalValeurBiens = biensProv.reduce(
      (sum, b) => sum + (Number(b.quantite) || 0) * (Number(b.valeurUnitaire) || 0),
      0
    );

    const totalDepensesUsd = depensesProv.reduce(
      (sum, d) => sum + (Number(d.montant) || 0),
      0
    );

    const catOptions = BIEN_CATEGORIES.map(
      (c) => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`
    ).join('');

    const etatOptions = BIEN_ETATS.map(
      (et) => `<option value="${escapeHTML(et)}">${escapeHTML(et)}</option>`
    ).join('');

    const bienSelectOptions = biensProv
      .map(
        (b) =>
          `<option value="${escapeHTML(b.id)}">${escapeHTML(b.designation)} (Stock: ${formatNumberFr(b.quantite)})</option>`
      )
      .join('');

    const biensTabHtml = `
      <div class="card">
        <h3 style="margin:0 0 10px;">Ajouter un Bien — ${escapeHTML(province)}</h3>
        <form id="form-add-bien" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
            <div class="form-group">
              <label for="bien-designation">Désignation du bien</label>
              <input id="bien-designation" type="text" required placeholder="Ex: Amplificateur + 2 baffles" />
            </div>
            <div class="form-group">
              <label for="bien-entity">Entité / Site</label>
              <input id="bien-entity" type="text" required placeholder="Ex: KANANGA — JOHREI CENTER" />
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
            <div class="form-group">
              <label for="bien-categorie">Catégorie</label>
              <select id="bien-categorie">${catOptions}</select>
            </div>
            <div class="form-group">
              <label for="bien-etat">État</label>
              <select id="bien-etat">${etatOptions}</select>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
            <div class="form-group">
              <label for="bien-quantite">Quantité</label>
              <input id="bien-quantite" type="number" min="0" value="1" required />
            </div>
            <div class="form-group">
              <label for="bien-valeur">Valeur unitaire ($ USD)</label>
              <input id="bien-valeur" type="number" min="0" step="0.01" value="0" required />
            </div>
          </div>

          <button type="submit" class="btn-primary">Enregistrer le bien</button>
        </form>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <strong>Inventaire des Biens (${biensProv.length})</strong>
          <span style="font-weight:700;color:var(--green-main);">Valeur estimée : ${formatCurrencyUsd(totalValeurBiens)}</span>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Bien</th>
                <th>Catégorie</th>
                <th>Qté</th>
                <th>État</th>
                <th>Valeur Tot.</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                biensProv.length === 0
                  ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">Aucun bien enregistré pour ${escapeHTML(province)}.</td></tr>`
                  : biensProv
                      .map((b) => {
                        const qty = Number(b.quantite) || 0;
                        const valTot = qty * (Number(b.valeurUnitaire) || 0);
                        return `
                          <tr>
                            <td><strong>${escapeHTML(b.designation)}</strong><br><span style="font-size:0.76rem;color:var(--text-muted);">${escapeHTML(b.entityName || '')}</span></td>
                            <td>${escapeHTML(b.categorie || '')}</td>
                            <td><strong>${formatNumberFr(qty)}</strong></td>
                            <td>${escapeHTML(b.etat || 'Bon')}</td>
                            <td>${formatCurrencyUsd(valTot)}</td>
                            <td>
                              <button type="button" class="btn-icon btn-del-bien" data-id="${escapeHTML(b.id)}" title="Supprimer">🗑️</button>
                            </td>
                          </tr>
                        `;
                      })
                      .join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    const mouvementsTabHtml = `
      <div class="card">
        <h3 style="margin:0 0 10px;">Mouvement de Bien — ${escapeHTML(province)}</h3>
        <form id="form-add-mouvement" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
            <div class="form-group">
              <label for="mvt-bien">Bien concerné</label>
              <select id="mvt-bien" required>
                <option value="">-- Choisir un bien --</option>
                ${bienSelectOptions}
              </select>
            </div>
            <div class="form-group">
              <label for="mvt-type">Type de mouvement</label>
              <select id="mvt-type">
                <option value="Entrée (+)">Entrée (+)</option>
                <option value="Sortie (-)">Sortie (-)</option>
              </select>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
            <div class="form-group">
              <label for="mvt-qte">Quantité déplacée</label>
              <input id="mvt-qte" type="number" min="1" value="1" required />
            </div>
            <div class="form-group">
              <label for="mvt-date">Date</label>
              <input id="mvt-date" type="date" value="${todayIso}" required />
            </div>
          </div>

          <div class="form-group">
            <label for="mvt-motif">Motif / Destination</label>
            <input id="mvt-motif" type="text" placeholder="Ex: Affectation au culte mensuel" />
          </div>

          <button type="submit" class="btn-primary">Enregistrer le mouvement</button>
        </form>
      </div>

      <div class="card">
        <h3 style="margin:0 0 8px;">Historique des Mouvements (${mouvementsProv.length})</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Bien</th>
                <th>Type</th>
                <th>Qté</th>
                <th>Motif</th>
              </tr>
            </thead>
            <tbody>
              ${
                mouvementsProv.length === 0
                  ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Aucun mouvement enregistré.</td></tr>`
                  : mouvementsProv
                      .slice()
                      .reverse()
                      .map(
                        (m) => `
                          <tr>
                            <td>${escapeHTML(m.date || '')}</td>
                            <td><strong>${escapeHTML(m.designation || '')}</strong></td>
                            <td>${escapeHTML(m.typeMouvement || '')}</td>
                            <td>${formatNumberFr(m.quantite)}</td>
                            <td>${escapeHTML(m.motif || '')}</td>
                          </tr>
                        `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    const depensesTabHtml = `
      <div class="card">
        <h3 style="margin:0 0 10px;">Enregistrer une Dépense / Transport — ${escapeHTML(province)}</h3>
        <form id="form-add-depense" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
            <div class="form-group">
              <label for="dep-date">Date</label>
              <input id="dep-date" type="date" value="${todayIso}" required />
            </div>
            <div class="form-group">
              <label for="dep-montant">Montant ($ USD)</label>
              <input id="dep-montant" type="number" min="0" step="0.01" required />
            </div>
          </div>

          <div class="form-group">
            <label for="dep-motif">Motif de la dépense / transport</label>
            <input id="dep-motif" type="text" required placeholder="Ex: Transport matériel & entretien local" />
          </div>

          <button type="submit" class="btn-primary">Enregistrer la dépense</button>
        </form>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong>Dépenses enregistrées (${depensesProv.length})</strong>
          <span style="font-weight:700;color:#dc2626;">Total : ${formatCurrencyUsd(totalDepensesUsd)}</span>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Motif</th>
                <th>Montant (USD)</th>
              </tr>
            </thead>
            <tbody>
              ${
                depensesProv.length === 0
                  ? `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">Aucune dépense enregistrée.</td></tr>`
                  : depensesProv
                      .slice()
                      .reverse()
                      .map(
                        (d) => `
                          <tr>
                            <td>${escapeHTML(d.date || '')}</td>
                            <td>${escapeHTML(d.motif || '')}</td>
                            <td><strong>${formatCurrencyUsd(d.montant)}</strong></td>
                          </tr>
                        `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = `
      <section class="module-page patrimoine-page">
        <div class="page-header">
          <h2>Patrimoine — ${escapeHTML(province)}</h2>
        </div>

        <div class="tabs-bar">
          <button type="button" class="tab-btn ${activeTab === 'biens' ? 'active' : ''}" data-ptab="biens">Biens</button>
          <button type="button" class="tab-btn ${activeTab === 'mouvements' ? 'active' : ''}" data-ptab="mouvements">Mouvements</button>
          <button type="button" class="tab-btn ${activeTab === 'depenses' ? 'active' : ''}" data-ptab="depenses">Dépenses</button>
        </div>

        ${
          activeTab === 'biens'
            ? biensTabHtml
            : activeTab === 'mouvements'
              ? mouvementsTabHtml
              : depensesTabHtml
        }
      </section>
    `;

    container.querySelectorAll('[data-ptab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.ptab;
        render();
      });
    });

    container.querySelector('#form-add-bien')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      await setDocument(COLLECTIONS.PATRIMOINE_BIENS, null, {
        province,
        entityName: f['bien-entity'].value.trim().toUpperCase(),
        designation: f['bien-designation'].value.trim(),
        categorie: f['bien-categorie'].value,
        etat: f['bien-etat'].value,
        quantite: Math.max(0, Number(f['bien-quantite'].value) || 0),
        valeurUnitaire: Math.max(0, Number(f['bien-valeur'].value) || 0)
      });
      showToast('Bien ajouté au patrimoine.', 'success');
      render();
    });

    container.querySelectorAll('.btn-del-bien').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Supprimer ce bien de l’inventaire ?')) return;
        await deleteDocument(COLLECTIONS.PATRIMOINE_BIENS, btn.dataset.id);
        showToast('Bien supprimé.', 'info');
        render();
      });
    });

    container.querySelector('#form-add-mouvement')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const bienId = f['mvt-bien'].value;
      const bienObj = biensProv.find((b) => b.id === bienId);
      if (!bienObj) {
        showToast('Sélectionnez un bien valide.', 'error');
        return;
      }

      const typeMouvement = f['mvt-type'].value;
      const qte = Math.max(1, Number(f['mvt-qte'].value) || 1);
      const currentQty = Number(bienObj.quantite) || 0;
      const nextQty =
        typeMouvement.startsWith('Entrée')
          ? currentQty + qte
          : Math.max(0, currentQty - qte);

      await updateDocument(COLLECTIONS.PATRIMOINE_BIENS, bienObj.id, { quantite: nextQty });
      await setDocument(COLLECTIONS.PATRIMOINE_MOUVEMENTS, null, {
        province,
        bienId: bienObj.id,
        designation: bienObj.designation,
        typeMouvement,
        quantite: qte,
        date: f['mvt-date'].value,
        motif: f['mvt-motif'].value.trim()
      });

      showToast('Mouvement enregistré et stock mis à jour.', 'success');
      render();
    });

    container.querySelector('#form-add-depense')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      await setDocument(COLLECTIONS.DEPENSES, null, {
        province,
        date: f['dep-date'].value,
        montant: Math.max(0, Number(f['dep-montant'].value) || 0),
        devise: 'USD',
        taux: 1,
        motif: f['dep-motif'].value.trim()
      });
      showToast('Dépense enregistrée.', 'success');
      render();
    });
  };

  await render();
}
