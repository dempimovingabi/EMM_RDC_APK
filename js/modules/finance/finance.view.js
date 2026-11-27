// js/modules/finance/finance.view.js
// Module Finance : SUIVI DE VERSEMENT (candidats membres) — EMM RD CONGO

import { COLLECTIONS } from '../../config/constants.js';
import { listDocuments, setDocument, deleteDocument } from '../../services/firestore.service.js';
import { getActiveProvince } from '../../core/province.context.js';
import { escapeHTML, formatNumberFr } from '../../utils/dom.js';
import { showToast } from '../../ui/toast.js';

export const MOTIFS_VERSEMENT = [
  'Initiation',
  'Réinitiation',
  'Shoku',
  'Kannon',
  'Photo sacrée',
  'Goshintai familial',
  'Mitamaya'
];

export const TYPES_ENTITE = [
  'Centre de Formation',
  'Johrei Center',
  'Unité religieuse',
  'Foyer de lumière',
  'Noyau de salut'
];

function toUsd(montant, devise, taux) {
  const val = Number(montant) || 0;
  if (devise === 'FC') {
    const rate = Number(taux) || 2800;
    return rate > 0 ? val / rate : 0;
  }
  return val;
}

function formatMoneyUsd(val) {
  return `${(Number(val) || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} $`;
}

function formatEntiteLabel(typeEntite, nomEntite) {
  const typeClean = String(typeEntite || '').trim();
  const nomClean = String(nomEntite || '').trim();
  if (typeClean && nomClean) return `${typeClean} — ${nomClean}`;
  return typeClean || nomClean || '';
}

export async function renderFinanceView(container) {
  let activeTab = 'candidats';
  let filterMotif = 'ALL';
  let editingCandidatId = null;
  let preselectedCandidatId = '';

  const render = async () => {
    const province = getActiveProvince();

    const [allCandidats, allVersements] = await Promise.all([
      listDocuments(COLLECTIONS.CANDIDATS).catch(() => []),
      listDocuments(COLLECTIONS.VERSEMENTS).catch(() => [])
    ]);

    const candidats = allCandidats.filter(
      (c) => !c.archived && (!c.province || c.province === province)
    );
    const candidatIds = new Set(candidats.map((c) => c.id));
    const versements = allVersements.filter(
      (v) =>
        (!v.province || v.province === province) ||
        (v.candidatId && candidatIds.has(v.candidatId))
    );

    const paidByCandidat = {};
    versements.forEach((v) => {
      if (!v.candidatId) return;
      const usd =
        v.montantUsd !== undefined && v.montantUsd !== null
          ? Number(v.montantUsd) || 0
          : toUsd(v.montant, v.devise, v.taux);
      paidByCandidat[v.candidatId] = (paidByCandidat[v.candidatId] || 0) + usd;
    });

    const totalPrevuUsd = candidats.reduce((s, c) => s + (Number(c.montantPrevuUsd) || 0), 0);
    const totalVerseUsd = candidats.reduce((s, c) => s + (paidByCandidat[c.id] || 0), 0);
    const totalResteUsd = Math.max(0, totalPrevuUsd - totalVerseUsd);

    const motifOptionsHtml = MOTIFS_VERSEMENT.map(
      (m) => `<option value="${escapeHTML(m)}">${escapeHTML(m)}</option>`
    ).join('');

    const typeEntiteOptionsHtml = TYPES_ENTITE.map(
      (t) => `<option value="${escapeHTML(t)}">${escapeHTML(t)}</option>`
    ).join('');

    container.innerHTML = `
      <section class="module-page finance-page">
        <div class="page-header">
          <h2>💰 SUIVI DE VERSEMENT (candidats membres)</h2>
        </div>

        <div class="card" style="padding:10px 14px;font-size:0.84rem;color:var(--text-muted);">
          Province active : <strong style="color:var(--green-main);">${escapeHTML(province)}</strong> •
          Entités : <strong>Centre de Formation, Johrei Center, Unité religieuse, Foyer de lumière, Noyau de salut</strong>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Candidats Membres</div>
            <div class="kpi-value">${formatNumberFr(candidats.length)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Prévu (USD)</div>
            <div class="kpi-value">${formatMoneyUsd(totalPrevuUsd)}</div>
          </div>
          <div class="kpi-card" style="border-left-color:#0d8a38;">
            <div class="kpi-label">Total Versé (USD)</div>
            <div class="kpi-value" style="color:#0d8a38;">${formatMoneyUsd(totalVerseUsd)}</div>
          </div>
          <div class="kpi-card" style="border-left-color:#d97706;">
            <div class="kpi-label">Reste à Payer (USD)</div>
            <div class="kpi-value" style="color:#d97706;">${formatMoneyUsd(totalResteUsd)}</div>
          </div>
        </div>

        <div class="tabs-bar" role="tablist">
          <button type="button" class="tab-btn ${activeTab === 'candidats' ? 'active' : ''}" data-ftab="candidats">
            👤 Candidats Membres
          </button>
          <button type="button" class="tab-btn ${activeTab === 'versements' ? 'active' : ''}" data-ftab="versements">
            💵 Versements (USD / FC)
          </button>
          <button type="button" class="tab-btn ${activeTab === 'releves' ? 'active' : ''}" data-ftab="releves">
            📄 Relevés
          </button>
        </div>

        <div id="finance-tab-host"></div>
      </section>
    `;

    container.querySelectorAll('[data-ftab]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        activeTab = btn.dataset.ftab;
        editingCandidatId = null;
        await render();
      });
    });

    const host = container.querySelector('#finance-tab-host');
    if (!host) return;

    if (activeTab === 'candidats') {
      await renderCandidatsTab(
        host,
        province,
        candidats,
        versements,
        paidByCandidat,
        motifOptionsHtml,
        typeEntiteOptionsHtml
      );
    } else if (activeTab === 'versements') {
      await renderVersementsTab(
        host,
        province,
        candidats,
        versements,
        motifOptionsHtml,
        typeEntiteOptionsHtml
      );
    } else if (activeTab === 'releves') {
      renderRelevesTab(host, province, candidats, paidByCandidat);
    }
  };

  async function renderCandidatsTab(
    host,
    province,
    candidats,
    versements,
    paidByCandidat,
    motifOptionsHtml,
    typeEntiteOptionsHtml
  ) {
    const filtered =
      filterMotif === 'ALL'
        ? candidats
        : candidats.filter((c) => c.motif === filterMotif);

    host.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 10px;">Enregistrer un candidat membre</h3>
        <form id="form-add-candidat" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">
            <div class="form-group">
              <label for="cand-nom">Nom complet du candidat membre</label>
              <input id="cand-nom" type="text" required placeholder="Ex: Kalombo Jean" />
            </div>
            <div class="form-group">
              <label for="cand-motif">Catégorie / Motif du versement</label>
              <select id="cand-motif" required>
                <option value="">-- Choisir un motif --</option>
                ${motifOptionsHtml}
              </select>
            </div>
            <div class="form-group">
              <label for="cand-montant-prevu">Montant prévu (USD)</label>
              <input id="cand-montant-prevu" type="number" step="0.01" min="0" required placeholder="0.00" />
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;">
            <div class="form-group">
              <label for="cand-type-entite">Type d'entité</label>
              <select id="cand-type-entite" required>
                <option value="">-- Choisir le type d'entité --</option>
                ${typeEntiteOptionsHtml}
              </select>
            </div>
            <div class="form-group">
              <label for="cand-entite">Nom de l'entité</label>
              <input id="cand-entite" type="text" required placeholder="Ex: Kananga I" />
            </div>
            <div class="form-group">
              <label for="cand-telephone">Téléphone (optionnel)</label>
              <input id="cand-telephone" type="tel" placeholder="+243..." />
            </div>
          </div>

          <div style="margin-top:6px;">
            <button type="submit" id="btn-submit-candidat" class="btn-primary">
              ➕ Enregistrer un candidat membre
            </button>
          </div>
        </form>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <h3 style="margin:0;">Liste des Candidats Membres (${filtered.length})</h3>
          <select id="filter-motif-candidat" aria-label="Filtrer par motif" style="max-width:210px;">
            <option value="ALL" ${filterMotif === 'ALL' ? 'selected' : ''}>Tous les motifs (7)</option>
            ${MOTIFS_VERSEMENT.map(
              (m) => `<option value="${escapeHTML(m)}" ${filterMotif === m ? 'selected' : ''}>${escapeHTML(m)}</option>`
            ).join('')}
          </select>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Candidat & Entité</th>
                <th>Motif</th>
                <th>Prévu ($)</th>
                <th>Versé ($)</th>
                <th>Reste ($)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                filtered.length === 0
                  ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">Aucun candidat membre enregistré pour ce filtre.</td></tr>`
                  : filtered
                      .map((c) => {
                        const prevu = Number(c.montantPrevuUsd) || 0;
                        const verse = paidByCandidat[c.id] || 0;
                        const reste = Math.max(0, prevu - verse);
                        const entiteText = formatEntiteLabel(c.typeEntite, c.entite);
                        const isEditing = editingCandidatId === c.id;

                        const mainRow = `
                        <tr>
                          <td>
                            <strong>${escapeHTML(c.nom \vert{}\vert{} '')}</strong>${entiteText ? `<br><span style="font-size:0.75rem;color:var(--text-muted);">Entité : ${escapeHTML(entiteText)}</span>` : ''}
                          </td>
                          <td><span class="badge">${escapeHTML(c.motif || '')}</span></td>
                          <td>${formatMoneyUsd(prevu)}</td>
                          <td style="color:#0d8a38;font-weight:700;">${formatMoneyUsd(verse)}</td>
                          <td style="color:${reste > 0 ? '#b45309' : '#065f46'};font-weight:700;">${formatMoneyUsd(reste)}</td>
                          <td>
                            <div style="display:flex;gap:4px;flex-wrap:wrap;">
                              <button type="button" class="btn-secondary btn-edit-cand" data-id="${escapeHTML(c.id)}" style="padding:5px 8px;font-size:0.75rem;">✏️ Modifier</button>
                              <button type="button" class="btn-primary btn-vers-cand" data-id="${escapeHTML(c.id)}" style="padding:5px 8px;font-size:0.75rem;">💵 Versement</button>
                              <button type="button" class="btn-secondary btn-arch-cand" data-id="${escapeHTML(c.id)}" style="padding:5px 8px;font-size:0.75rem;">🗂️ Archiver</button>
                              <button type="button" class="btn-icon btn-del-cand" data-id="${escapeHTML(c.id)}" title="Supprimer">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      `;

                        if (!isEditing) return mainRow;

                        const editRow = `
                        <tr style="background:#f0fdf4;">
                          <td colspan="6">
                            <form class="form-edit-candidat form-stack" data-id="${escapeHTML(c.id)}" style="padding:6px 0;">
                              <strong style="color:#065f46;font-size:0.84rem;">Modification de : ${escapeHTML(c.nom || '')}</strong>
                              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:6px;">
                                <div class="form-group">
                                  <label>Nom complet</label>
                                  <input type="text" name="nom" value="${escapeHTML(c.nom || '')}" required />
                                </div>
                                <div class="form-group">
                                  <label>Motif</label>
                                  <select name="motif" required>
                                    ${MOTIFS_VERSEMENT.map(
                                      (m) => `<option value="${escapeHTML(m)}" ${c.motif === m ? 'selected' : ''}>${escapeHTML(m)}</option>`
                                    ).join('')}
                                  </select>
                                </div>
                                <div class="form-group">
                                  <label>Type d'entité</label>
                                  <select name="typeEntite" required>
                                    ${TYPES_ENTITE.map(
                                      (t) => `<option value="${escapeHTML(t)}" ${c.typeEntite === t ? 'selected' : ''}>${escapeHTML(t)}</option>`
                                    ).join('')}
                                  </select>
                                </div>
                                <div class="form-group">
                                  <label>Nom de l'entité</label>
                                  <input type="text" name="entite" value="${escapeHTML(c.entite || '')}" required />
                                </div>
                                <div class="form-group">
                                  <label>Montant prévu ($)</label>
                                  <input type="number" step="0.01" min="0" name="montantPrevuUsd" value="${escapeHTML(String(prevu))}" required />
                                </div>
                                <div class="form-group">
                                  <label>Téléphone</label>
                                  <input type="tel" name="telephone" value="${escapeHTML(c.telephone || '')}" />
                                </div>
                              </div>
                              <div style="display:flex;gap:8px;margin-top:6px;">
                                <button type="submit" class="btn-primary" style="padding:6px 10px;font-size:0.78rem;">💾 Enregistrer</button>
                                <button type="button" class="btn-secondary btn-cancel-edit-cand" style="padding:6px 10px;font-size:0.78rem;">Annuler</button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      `;

                        return mainRow + editRow;
                      })
                      .join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    host.querySelector('#filter-motif-candidat')?.addEventListener('change', async (e) => {
      filterMotif = e.target.value;
      await render();
    });

    host.querySelector('#form-add-candidat')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const submitBtn = host.querySelector('#btn-submit-candidat');
      const nom = f['cand-nom'].value.trim();
      const motif = f['cand-motif'].value;
      const montantPrevuUsd = Number(f['cand-montant-prevu'].value) || 0;
      const typeEntite = f['cand-type-entite'].value;
      const entite = f['cand-entite'].value.trim();
      const telephone = f['cand-telephone'].value.trim();

      if (!nom || !motif || !typeEntite || !entite) {
        showToast('Veuillez renseigner le nom, le motif et l’entité.', 'error');
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      try {
        await setDocument(COLLECTIONS.CANDIDATS, null, {
          nom,
          motif,
          montantPrevuUsd,
          typeEntite,
          entite,
          telephone,
          province,
          archived: false,
          createdAt: new Date().toISOString()
        });

        showToast('Candidat membre enregistré.', 'success');
        await render();
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    host.querySelectorAll('.btn-edit-cand').forEach((btn) => {
      btn.addEventListener('click', async () => {
        editingCandidatId = editingCandidatId === btn.dataset.id ? null : btn.dataset.id;
        await render();
      });
    });

    host.querySelectorAll('.btn-cancel-edit-cand').forEach((btn) => {
      btn.addEventListener('click', async () => {
        editingCandidatId = null;
        await render();
      });
    });

    host.querySelectorAll('.form-edit-candidat').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = form.dataset.id;
        const fd = new FormData(form);
        const nom = String(fd.get('nom') || '').trim();
        const motif = String(fd.get('motif') || '').trim();
        const typeEntite = String(fd.get('typeEntite') || '').trim();
        const entite = String(fd.get('entite') || '').trim();
        const montantPrevuUsd = Number(fd.get('montantPrevuUsd')) || 0;
        const telephone = String(fd.get('telephone') || '').trim();

        if (!nom || !motif || !typeEntite || !entite) {
          showToast('Veuillez compléter tous les champs obligatoires.', 'error');
          return;
        }

        await setDocument(
          COLLECTIONS.CANDIDATS,
          id,
          {
            nom,
            motif,
            typeEntite,
            entite,
            montantPrevuUsd,
            telephone,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );

        editingCandidatId = null;
        showToast('Candidat membre modifié.', 'success');
        await render();
      });
    });

    host.querySelectorAll('.btn-vers-cand').forEach((btn) => {
      btn.addEventListener('click', async () => {
        preselectedCandidatId = btn.dataset.id;
        activeTab = 'versements';
        await render();
      });
    });

    host.querySelectorAll('.btn-arch-cand').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const cand = candidats.find((c) => c.id === id);
        if (!cand) return;
        if (!window.confirm(`Archiver le dossier de "${cand.nom}" ?`)) return;

        const candVersements = versements.filter((v) => v.candidatId === id);
        const year = new Date().getFullYear();

        await setDocument(COLLECTIONS.ARCHIVES, null, {
          titre: `Candidat : ${cand.nom} (${cand.motif || ''})`,
          categorie: 'Suivi de Versement',
          annee: year,
          province,
          payload: {
            candidat: cand,
            versements: candVersements
          },
          archivedAt: new Date().toISOString()
        });

        await setDocument(COLLECTIONS.CANDIDATS, id, { archived: true, archivedAt: new Date().toISOString() }, { merge: true });
        showToast('Candidat archivé.', 'success');
        await render();
      });
    });

    host.querySelectorAll('.btn-del-cand').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Supprimer définitivement ce candidat membre ?')) return;
        await deleteDocument(COLLECTIONS.CANDIDATS, btn.dataset.id);
        showToast('Candidat membre supprimé.', 'info');
        await render();
      });
    });
  }

  async function renderVersementsTab(
    host,
    province,
    candidats,
    versements,
    motifOptionsHtml,
    typeEntiteOptionsHtml
  ) {
    const candidatOptions = candidats
      .map((c) => {
        const entiteText = formatEntiteLabel(c.typeEntite, c.entite);
        const selected = c.id === preselectedCandidatId ? 'selected' : '';
        return `<option value="${escapeHTML(c.id)}" ${selected} data-motif="${escapeHTML(
          c.motif || ''
        )}" data-type-entite="${escapeHTML(c.typeEntite || '')}" data-entite="${escapeHTML(
          c.entite || ''
        )}">${escapeHTML(c.nom || '')} (${escapeHTML(c.motif || '')}${
          entiteText ? ` • ${escapeHTML(entiteText)}` : ''
        })</option>`;
      })
      .join('');

    const todayStr = new Date().toISOString().slice(0, 10);

    host.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 10px;">Enregistrer un Versement (USD ou FC)</h3>
        <form id="form-add-versement" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">
            <div class="form-group">
              <label for="vers-candidat">Candidat membre</label>
              <select id="vers-candidat" required>
                <option value="">-- Sélectionner un candidat membre --</option>
                ${candidatOptions}
              </select>
            </div>
            <div class="form-group">
              <label for="vers-motif">Catégorie / Motif du versement</label>
              <select id="vers-motif" required>
                <option value="">-- Choisir un motif --</option>
                ${motifOptionsHtml}
              </select>
            </div>
            <div class="form-group">
              <label for="vers-date">Date du versement</label>
              <input id="vers-date" type="date" value="${todayStr}" required />
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;">
            <div class="form-group">
              <label for="vers-type-entite">Type d'entité</label>
              <select id="vers-type-entite">
                <option value="">-- Choisir le type d'entité --</option>
                ${typeEntiteOptionsHtml}
              </select>
            </div>
            <div class="form-group">
              <label for="vers-entite">Nom de l'entité</label>
              <input id="vers-entite" type="text" placeholder="Ex: Kananga I" />
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;">
            <div class="form-group">
              <label for="vers-montant">Montant versé</label>
              <input id="vers-montant" type="number" step="0.01" min="0.01" required placeholder="0.00" />
            </div>
            <div class="form-group">
              <label for="vers-devise">Devise</label>
              <select id="vers-devise">
                <option value="USD">USD ($)</option>
                <option value="FC">FC (Francs Congolais)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="vers-taux">Taux du jour (FC pour 1 USD)</label>
              <input id="vers-taux" type="number" step="1" min="1" value="2800" />
            </div>
          </div>

          <div class="form-group">
            <label for="vers-obs">Observation / Référence reçu (optionnel)</label>
            <input id="vers-obs" type="text" placeholder="Ex: Reçu n° 014" />
          </div>

          <button type="submit" class="btn-primary">💾 Enregistrer le versement</button>
        </form>
      </div>

      <div class="card">
        <h3 style="margin:0 0 10px;">Historique des Versements (${versements.length})</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Candidat & Entité</th>
                <th>Motif</th>
                <th>Montant saisi</th>
                <th>Équivalent USD</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                versements.length === 0
                  ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">Aucun versement enregistré.</td></tr>`
                  : versements
                      .map((v) => {
                        const cand = candidats.find((c) => c.id === v.candidatId);
                        const usdVal =
                          v.montantUsd !== undefined && v.montantUsd !== null
                            ? Number(v.montantUsd) || 0
                            : toUsd(v.montant, v.devise, v.taux);
                        const entiteText = formatEntiteLabel(
                          v.typeEntite || cand?.typeEntite,
                          v.entite || cand?.entite
                        );
                        return `
                        <tr>
                          <td>${escapeHTML(v.date || '')}</td>
                          <td>
                            <strong>${escapeHTML(cand?.nom \vert{}\vert{} v.candidatNom \vert{}\vert{} 'Candidat membre')}</strong>${entiteText ? `<br><span style="font-size:0.75rem;color:var(--text-muted);">Entité : ${escapeHTML(entiteText)}</span>` : ''}
                          </td>
                          <td><span class="badge">${escapeHTML(v.motif || cand?.motif || '')}</span></td>
                          <td>${formatNumberFr(v.montant)}${escapeHTML(v.devise || 'USD')}</td>
                          <td style="font-weight:700;color:#0a6e2c;">${formatMoneyUsd(usdVal)}</td>
                          <td>
                            <button type="button" class="btn-icon btn-del-
