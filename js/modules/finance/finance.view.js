// js/modules/finance/finance.view.js
// Module Finance : SUIVI DE VERSEMENT (Candidats Membres) — EMM RD CONGO

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

  const render = async () => {
    const province = getActiveProvince();

    const [allCandidats, allVersements] = await Promise.all([
      listDocuments(COLLECTIONS.CANDIDATS).catch(() => []),
      listDocuments(COLLECTIONS.VERSEMENTS).catch(() => [])
    ]);

    const candidats = allCandidats.filter(
      (c) => !c.province || c.province === province
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
          <h2>💰 SUIVI DE VERSEMENT — Candidats Membres</h2>
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
        <h3 style="margin:0 0 10px;">Enregistrer un Candidat Membre</h3>
        <form id="form-add-candidat" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">
            <div class="form-group">
              <label for="cand-nom">Nom complet du candidat</label>
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

          <button type="submit" class="btn-primary">➕ Ajouter le candidat membre</button>
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                filtered.length === 0
                  ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">Aucun candidat enregistré pour ce filtre.</td></tr>`
                  : filtered
                      .map((c) => {
                        const prevu = Number(c.montantPrevuUsd) || 0;
                        const verse = paidByCandidat[c.id] || 0;
                        const reste = Math.max(0, prevu - verse);
                        const entiteText = formatEntiteLabel(c.typeEntite, c.entite);
                        return `
                        <tr>
                          <td>
                            <strong>${escapeHTML(c.nom || '')}</strong>
                            ${entiteText ? `<br><span style="font-size:0.75rem;color:var(--text-muted);">Entité : ${escapeHTML(entiteText)}</span>` : ''}
                          </td>
                          <td><span class="badge">${escapeHTML(c.motif || '')}</span></td>
                          <td>${formatMoneyUsd(prevu)}</td>
                          <td style="color:#0d8a38;font-weight:700;">${formatMoneyUsd(verse)}</td>
                          <td style="color:${reste > 0 ? '#b45309' : '#065f46'};font-weight:700;">${formatMoneyUsd(reste)}</td>
                          <td>
                            <button type="button" class="btn-icon btn-del-cand" data-id="${escapeHTML(c.id)}" title="Supprimer">🗑️</button>
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

    host.querySelector('#filter-motif-candidat')?.addEventListener('change', async (e) => {
      filterMotif = e.target.value;
      await render();
    });

    host.querySelector('#form-add-candidat')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
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

      await setDocument(COLLECTIONS.CANDIDATS, null, {
        nom,
        motif,
        montantPrevuUsd,
        typeEntite,
        entite,
        telephone,
        province,
        createdAt: new Date().toISOString()
      });

      showToast('Candidat membre enregistré.', 'success');
      await render();
    });

    host.querySelectorAll('.btn-del-cand').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Supprimer ce candidat membre ?')) return;
        await deleteDocument(COLLECTIONS.CANDIDATS, btn.dataset.id);
        showToast('Candidat supprimé.', 'info');
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
        return `<option value="${escapeHTML(c.id)}" data-motif="${escapeHTML(
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
                <option value="">-- Sélectionner un candidat --</option>
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
                            <strong>${escapeHTML(cand?.nom || v.candidatNom || 'Candidat')}</strong>
                            ${entiteText ? `<br><span style="font-size:0.75rem;color:var(--text-muted);">Entité : ${escapeHTML(entiteText)}</span>` : ''}
                          </td>
                          <td><span class="badge">${escapeHTML(v.motif || cand?.motif || '')}</span></td>
                          <td>${formatNumberFr(v.montant)} ${escapeHTML(v.devise || 'USD')}</td>
                          <td style="font-weight:700;color:#0a6e2c;">${formatMoneyUsd(usdVal)}</td>
                          <td>
                            <button type="button" class="btn-icon btn-del-vers" data-id="${escapeHTML(v.id)}" title="Supprimer">🗑️</button>
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

    const selCand = host.querySelector('#vers-candidat');
    const selMotif = host.querySelector('#vers-motif');
    const selTypeEntite = host.querySelector('#vers-type-entite');
    const inputEntite = host.querySelector('#vers-entite');

    selCand?.addEventListener('change', () => {
      const opt = selCand.options[selCand.selectedIndex];
      const m = opt?.dataset?.motif;
      const tEnt = opt?.dataset?.typeEntite;
      const nEnt = opt?.dataset?.entite;
      if (m && MOTIFS_VERSEMENT.includes(m) && selMotif) {
        selMotif.value = m;
      }
      if (tEnt && TYPES_ENTITE.includes(tEnt) && selTypeEntite) {
        selTypeEntite.value = tEnt;
      }
      if (nEnt && inputEntite) {
        inputEntite.value = nEnt;
      }
    });

    host.querySelector('#form-add-versement')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const candidatId = f['vers-candidat'].value;
      const motif = f['vers-motif'].value;
      const date = f['vers-date'].value;
      const typeEntite = f['vers-type-entite'].value;
      const entite = f['vers-entite'].value.trim();
      const montant = Number(f['vers-montant'].value) || 0;
      const devise = f['vers-devise'].value;
      const taux = Number(f['vers-taux'].value) || 2800;
      const obs = f['vers-obs'].value.trim();

      if (!candidatId || !motif || montant <= 0) {
        showToast('Veuillez remplir tous les champs obligatoires du versement.', 'error');
        return;
      }

      const candObj = candidats.find((c) => c.id === candidatId);
      const finalTypeEntite = typeEntite || candObj?.typeEntite || '';
      const finalEntite = entite || candObj?.entite || '';
      const montantUsd = toUsd(montant, devise, taux);

      await setDocument(COLLECTIONS.VERSEMENTS, null, {
        candidatId,
        candidatNom: candObj?.nom || '',
        motif,
        date,
        typeEntite: finalTypeEntite,
        entite: finalEntite,
        montant,
        devise,
        taux,
        montantUsd,
        obs,
        province,
        createdAt: new Date().toISOString()
      });

      showToast('Versement enregistré avec succès.', 'success');
      await render();
    });

    host.querySelectorAll('.btn-del-vers').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Supprimer ce versement ?')) return;
        await deleteDocument(COLLECTIONS.VERSEMENTS, btn.dataset.id);
        showToast('Versement supprimé.', 'info');
        await render();
      });
    });
  }

  function renderRelevesTab(host, province, candidats, paidByCandidat) {
    const statsByMotif = MOTIFS_VERSEMENT.map((motif) => {
      const candsMotif = candidats.filter((c) => c.motif === motif);
      const prevu = candsMotif.reduce((s, c) => s + (Number(c.montantPrevuUsd) || 0), 0);
      const verse = candsMotif.reduce((s, c) => s + (paidByCandidat[c.id] || 0), 0);
      return {
        motif,
        nbCandidats: candsMotif.length,
        prevu,
        verse,
        reste: Math.max(0, prevu - verse)
      };
    });

    host.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <h3 style="margin:0;">Relevé par Catégorie / Motif — ${escapeHTML(province)}</h3>
          <button type="button" id="btn-export-finance-csv" class="btn-secondary">📥 Exporter CSV</button>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Catégorie / Motif</th>
                <th>Candidats</th>
                <th>Prévu (USD)</th>
                <th>Versé (USD)</th>
                <th>Reste (USD)</th>
              </tr>
            </thead>
            <tbody>
              ${statsByMotif
                .map(
                  (row) => `
                  <tr>
                    <td><strong>${escapeHTML(row.motif)}</strong></td>
                    <td>${row.nbCandidats}</td>
                    <td>${formatMoneyUsd(row.prevu)}</td>
                    <td style="color:#0d8a38;font-weight:700;">${formatMoneyUsd(row.verse)}</td>
                    <td style="color:#b45309;font-weight:700;">${formatMoneyUsd(row.reste)}</td>
                  </tr>
                `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h3 style="margin:0 0 8px;">Relevé Individuel des Candidats Membres</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Candidat</th>
                <th>Entité</th>
                <th>Motif</th>
                <th>Prévu ($)</th>
                <th>Versé ($)</th>
                <th>Solde Restant ($)</th>
              </tr>
            </thead>
            <tbody>
              ${
                candidats.length === 0
                  ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">Aucune donnée à afficher.</td></tr>`
                  : candidats
                      .map((c) => {
                        const prevu = Number(c.montantPrevuUsd) || 0;
                        const verse = paidByCandidat[c.id] || 0;
                        const reste = Math.max(0, prevu - verse);
                        const entiteText = formatEntiteLabel(c.typeEntite, c.entite);
                        return `
                        <tr>
                          <td><strong>${escapeHTML(c.nom || '')}</strong></td>
                          <td>${escapeHTML(entiteText || '—')}</td>
                          <td>${escapeHTML(c.motif || '')}</td>
                          <td>${formatMoneyUsd(prevu)}</td>
                          <td>${formatMoneyUsd(verse)}</td>
                          <td><strong>${formatMoneyUsd(reste)}</strong></td>
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

    host.querySelector('#btn-export-finance-csv')?.addEventListener('click', () => {
      const headers = [
        'Candidat',
        'Type Entite',
        'Nom Entite',
        'Motif',
        'Province',
        'Montant Prevu USD',
        'Montant Verse USD',
        'Reste a Payer USD'
      ];
      const lines = [headers.join(';')];
      candidats.forEach((c) => {
        const prevu = Number(c.montantPrevuUsd) || 0;
        const verse = paidByCandidat[c.id] || 0;
        const reste = Math.max(0, prevu - verse);
        lines.push(
          [
            `"${String(c.nom || '').replace(/"/g, '""')}"`,
            `"${String(c.typeEntite || '').replace(/"/g, '""')}"`,
            `"${String(c.entite || '').replace(/"/g, '""')}"`,
            `"${String(c.motif || '').replace(/"/g, '""')}"`,
            `"${String(province).replace(/"/g, '""')}"`,
            prevu.toFixed(2),
            verse.toFixed(2),
            reste.toFixed(2)
          ].join(';')
        );
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SUIVI_VERSEMENT_${province}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Relevé CSV exporté.', 'success');
    });
  }

  await render();
}
