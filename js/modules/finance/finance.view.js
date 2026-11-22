// js/modules/finance/finance.view.js
// Module Finance (Candidats, Versements USD/FC & Relevés) — EMM RD CONGO[span_6](start_span)[span_6](end_span)

import { COLLECTIONS, FINANCE_MOTIFS, FINANCE_CURRENCIES } from '../../config/constants.js';
import { listDocuments, setDocument, updateDocument } from '../../services/firestore.service.js';
import { getActiveProvince } from '../../core/province.context.js';
import { escapeHTML, formatCurrencyUsd, formatNumberFr } from '../../utils/dom.js';
import { showToast } from '../../ui/toast.js';

function convertToUsd(montant, devise, taux) {
  const val = Math.max(0, Number(montant) || 0);
  if (String(devise || 'USD').toUpperCase() === 'USD') {
    return val;
  }
  const rate = Number(taux) || 0;
  return rate > 0 ? val / rate : 0;
}

export async function renderFinanceView(container) {
  let activeTab = 'candidats';
  let statusFilter = 'ALL'; // 'ALL' | 'En cours' | 'Terminé'

  const render = async () => {
    const province = getActiveProvince();
    const todayIso = new Date().toISOString().slice(0, 10);

    const [allCandidats, allVersements] = await Promise.all([
      listDocuments(COLLECTIONS.CANDIDATS),
      listDocuments(COLLECTIONS.VERSEMENTS)
    ]);

    const candidatsProv = allCandidats.filter(
      (c) =>
        !c.archived &&
        String(c.province || '').toUpperCase() === province.toUpperCase()
    );

    const versementsProv = allVersements.filter(
      (v) => String(v.province || '').toUpperCase() === province.toUpperCase()
    );

    const filteredCandidats =
      statusFilter === 'ALL'
        ? candidatsProv
        : candidatsProv.filter((c) => c.statut === statusFilter);

    const motifOptions = FINANCE_MOTIFS.map(
      (m) => `<option value="${escapeHTML(m)}">${escapeHTML(m)}</option>`
    ).join('');

    const candidatOptions = candidatsProv
      .map(
        (c) =>
          `<option value="${escapeHTML(c.id)}">${escapeHTML(c.nom)} (${escapeHTML(c.motif)})</option>`
      )
      .join('');

    const currencyOptions = FINANCE_CURRENCIES.map(
      (cur) => `<option value="${escapeHTML(cur)}">${escapeHTML(cur)}</option>`
    ).join('');

    const candidatsTabHtml = `
      <div class="card">
        <h3 style="margin:0 0 10px;">Nouveau Candidat — ${escapeHTML(province)}</h3>
        <form id="form-candidat" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
            <div class="form-group">
              <label for="cand-nom">Nom complet</label>
              <input id="cand-nom" type="text" required placeholder="Ex: KABONGO Jean" />
            </div>
            <div class="form-group">
              <label for="cand-entity">Entité</label>
              <input id="cand-entity" type="text" required placeholder="Ex: KANANGA — FOYER 1" />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            <div class="form-group">
              <label for="cand-motif">Motif</label>
              <select id="cand-motif" required>${motifOptions}</select>
            </div>
            <div class="form-group">
              <label for="cand-montant">Montant prévu ($)</label>
              <input id="cand-montant" type="number" min="0" step="0.01" value="0" required />
            </div>
            <div class="form-group">
              <label for="cand-statut">Statut</label>
              <select id="cand-statut">
                <option value="En cours">En cours</option>
                <option value="Terminé">Terminé</option>
              </select>
            </div>
          </div>
          <button type="submit" class="btn-primary">Enregistrer le candidat</button>
        </form>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
          <strong>Dossiers Candidats (${filteredCandidats.length})</strong>
          <div style="display:flex;gap:6px;">
            <button type="button" class="tab-btn ${statusFilter === 'ALL' ? 'active' : ''}" data-filter="ALL">Tous</button>
            <button type="button" class="tab-btn ${statusFilter === 'En cours' ? 'active' : ''}" data-filter="En cours">En cours</button>
            <button type="button" class="tab-btn ${statusFilter === 'Terminé' ? 'active' : ''}" data-filter="Terminé">Terminé</button>
          </div>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Candidat</th>
                <th>Motif</th>
                <th>Prévu</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                filteredCandidats.length === 0
                  ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Aucun candidat trouvé.</td></tr>`
                  : filteredCandidats
                      .map(
                        (c) => `
                          <tr>
                            <td><strong>${escapeHTML(c.nom)}</strong><br><span style="font-size:0.76rem;color:var(--text-muted);">${escapeHTML(c.entityName || '')}</span></td>
                            <td>${escapeHTML(c.motif)}</td>
                            <td>${formatCurrencyUsd(c.montantPrevu)}</td>
                            <td>${escapeHTML(c.statut || 'En cours')}</td>
                            <td>
                              <button type="button" class="btn-secondary btn-archive-cand" data-id="${escapeHTML(c.id)}" style="padding:4px 8px;font-size:0.76rem;">
                                Archiver
                              </button>
                            </td>
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

    const versementsTabHtml = `
      <div class="card">
        <h3 style="margin:0 0 10px;">Enregistrer un Versement — ${escapeHTML(province)}</h3>
        <form id="form-versement" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
            <div class="form-group">
              <label for="vers-candidat">Candidat</label>
              <select id="vers-candidat" required>
                <option value="">-- Choisir un candidat --</option>
                ${candidatOptions}
              </select>
            </div>
            <div class="form-group">
              <label for="vers-date">Date</label>
              <input id="vers-date" type="date" value="${todayIso}" required />
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            <div class="form-group">
              <label for="vers-montant">Montant</label>
              <input id="vers-montant" type="number" min="0" step="0.01" required />
            </div>
            <div class="form-group">
              <label for="vers-devise">Devise</label>
              <select id="vers-devise">${currencyOptions}</select>
            </div>
            <div class="form-group">
              <label for="vers-taux">Taux du jour (FC / 1 USD)</label>
              <input id="vers-taux" type="number" min="1" step="0.01" value="2800" required />
            </div>
          </div>

          <button type="submit" class="btn-primary">Valider le versement</button>
        </form>
      </div>

      <div class="card">
        <h3 style="margin:0 0 8px;">Historique des Versements (${versementsProv.length})</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Candidat</th>
                <th>Montant</th>
                <th>Équivalent USD</th>
              </tr>
            </thead>
            <tbody>
              ${
                versementsProv.length === 0
                  ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Aucun versement enregistré.</td></tr>`
                  : versementsProv
                      .slice()
                      .reverse()
                      .map((v) => {
                        const usdEquiv = convertToUsd(v.montant, v.devise, v.taux);
                        return `
                          <tr>
                            <td>${escapeHTML(v.date || '')}</td>
                            <td>${escapeHTML(v.candidatNom || '')}</td>
                            <td>${formatNumberFr(v.montant)} ${escapeHTML(v.devise || 'USD')}</td>
                            <td><strong>${formatCurrencyUsd(usdEquiv)}</strong></td>
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

    const relevesRows = candidatsProv.map((c) => {
      const paidUsd = versementsProv
        .filter((v) => v.candidatId === c.id)
        .reduce((sum, v) => sum + convertToUsd(v.montant, v.devise, v.taux), 0);
      const expectedUsd = Number(c.montantPrevu) || 0;
      const remainingUsd = Math.max(0, expectedUsd - paidUsd);
      return {
        nom: c.nom,
        entityName: c.entityName || '',
        expectedUsd,
        paidUsd,
        remainingUsd
      };
    });

    const totalExpected = relevesRows.reduce((s, r) => s + r.expectedUsd, 0);
    const totalPaid = relevesRows.reduce((s, r) => s + r.paidUsd, 0);
    const totalRemaining = relevesRows.reduce((s, r) => s + r.remainingUsd, 0);

    const relevesTabHtml = `
      <div class="card">
        <h3 style="margin:0 0 10px;">Relevé Individuel & Bilan — ${escapeHTML(province)}</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Candidat</th>
                <th>Prévu</th>
                <th>Versé (USD)</th>
                <th>Reste</th>
              </tr>
            </thead>
            <tbody>
              ${
                relevesRows.length === 0
                  ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Aucune donnée financière.</td></tr>`
                  : relevesRows
                      .map(
                        (r) => `
                          <tr>
                            <td><strong>${escapeHTML(r.nom)}</strong><br><span style="font-size:0.76rem;color:var(--text-muted);">${escapeHTML(r.entityName)}</span></td>
                            <td>${formatCurrencyUsd(r.expectedUsd)}</td>
                            <td><strong>${formatCurrencyUsd(r.paidUsd)}</strong></td>
                            <td>${formatCurrencyUsd(r.remainingUsd)}</td>
                          </tr>
                        `
                      )
                      .join('')
              }
            </tbody>
            <tfoot>
              <tr style="background:rgba(10,110,44,0.12);font-weight:800;">
                <td>TOTAL PROVINCE</td>
                <td>${formatCurrencyUsd(totalExpected)}</td>
                <td>${formatCurrencyUsd(totalPaid)}</td>
                <td>${formatCurrencyUsd(totalRemaining)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = `
      <section class="module-page finance-page">
        <div class="page-header">
          <h2>Finance — ${escapeHTML(province)}</h2>
        </div>

        <div class="tabs-bar">
          <button type="button" class="tab-btn ${activeTab === 'candidats' ? 'active' : ''}" data-ftab="candidats">Candidats</button>
          <button type="button" class="tab-btn ${activeTab === 'versements' ? 'active' : ''}" data-ftab="versements">Versements</button>
          <button type="button" class="tab-btn ${activeTab === 'releves' ? 'active' : ''}" data-ftab="releves">Relevés</button>
        </div>

        ${
          activeTab === 'candidats'
            ? candidatsTabHtml
            : activeTab === 'versements'
              ? versementsTabHtml
              : relevesTabHtml
        }
      </section>
    `;

    container.querySelectorAll('[data-ftab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.ftab;
        render();
      });
    });

    container.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        statusFilter = btn.dataset.filter;
        render();
      });
    });

    container.querySelector('#form-candidat')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      await setDocument(COLLECTIONS.CANDIDATS, null, {
        province,
        entityName: f['cand-entity'].value.trim().toUpperCase(),
        nom: f['cand-nom'].value.trim(),
        motif: f['cand-motif'].value,
        montantPrevu: Math.max(0, Number(f['cand-montant'].value) || 0),
        statut: f['cand-statut'].value,
        archived: false
      });
      showToast('Candidat enregistré.', 'success');
      render();
    });

    container.querySelectorAll('.btn-archive-cand').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await updateDocument(COLLECTIONS.CANDIDATS, btn.dataset.id, { archived: true });
        showToast('Candidat archivé.', 'info');
        render();
      });
    });

    container.querySelector('#form-versement')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const candidatId = f['vers-candidat'].value;
      const candObj = candidatsProv.find((c) => c.id === candidatId);
      if (!candObj) {
        showToast('Veuillez sélectionner un candidat.', 'error');
        return;
      }

      const montant = Math.max(0, Number(f['vers-montant'].value) || 0);
      const devise = f['vers-devise'].value;
      const taux = Math.max(1, Number(f['vers-taux'].value) || 1);

      await setDocument(COLLECTIONS.VERSEMENTS, null, {
        province,
        entityId: candObj.entityId || '',
        entityName: candObj.entityName || '',
        candidatId,
        candidatNom: candObj.nom,
        montant,
        devise,
        taux,
        date: f['vers-date'].value
      });

      showToast('Versement enregistré.', 'success');
      render();
    });
  };

  await render();
}
