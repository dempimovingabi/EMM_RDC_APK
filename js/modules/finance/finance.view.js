// js/modules/finance/finance.view.js
// Module SUIVI DE VERSEMENT (candidats membres) — EMM RD CONGO

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

const STORAGE_CANDIDATS_KEY = 'emm_finance_candidats_v1';
const STORAGE_VERSEMENTS_KEY = 'emm_finance_versements_v1';
const STORAGE_ARCHIVES_KEY = 'emm_archives_v1';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNum(val) {
  const n = Number(val) || 0;
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

function formatUsd(val) {
  const n = Number(val) || 0;
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

function toUsd(montant, devise, taux) {
  const val = Number(montant) || 0;
  if (devise === 'FC') {
    const rate = Number(taux) || 2800;
    return rate > 0 ? val / rate : 0;
  }
  return val;
}

function formatEntiteLabel(typeEntite, nomEntite) {
  const t = String(typeEntite || '').trim();
  const n = String(nomEntite || '').trim();
  if (t && n) return `${t} — ${n}`;
  return t || n || '—';
}

function getActiveProvinceSafe() {
  try {
    const raw = localStorage.getItem('emm_state');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.activeProvince) return parsed.activeProvince;
    }
  } catch (_) {}
  return localStorage.getItem('emm_active_province') || 'KASAÏ-CENTRAL';
}

function readLocalList(key) {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}

function writeLocalList(key, arr) {
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch (_) {}
}

async function getFirestoreBridge() {
  try {
    const [constantsMod, fsMod] = await Promise.all([
      import('../../config/constants.js').catch(() => null),
      import('../../services/firestore.service.js').catch(() => null)
    ]);
    if (constantsMod?.COLLECTIONS && fsMod?.listDocuments && fsMod?.setDocument && fsMod?.deleteDocument) {
      return {
        COLLECTIONS: constantsMod.COLLECTIONS,
        listDocuments: fsMod.listDocuments,
        setDocument: fsMod.setDocument,
        deleteDocument: fsMod.deleteDocument
      };
    }
  } catch (_) {}
  return null;
}

function notifyUser(msg, type = 'info') {
  try {
    const toastRoot = document.getElementById('toast-root');
    if (toastRoot) {
      const el = document.createElement('div');
      el.textContent = msg;
      el.style.cssText = `
        background:${type === 'error' ? '#991b1b' : type === 'success' ? '#0a6e2c' : '#1e293b'};
        color:#ffffff;padding:10px 14px;border-radius:8px;margin-top:6px;
        font-size:0.84rem;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,0.2);
      `;
      toastRoot.appendChild(el);
      setTimeout(() => el.remove(), 3000);
      return;
    }
  } catch (_) {}
  console.log('[EMM Finance]', msg);
}

export async function renderFinanceView(container) {
  let activeTab = 'candidats';
  let filterMotif = 'ALL';
  let editingCandidatId = null;
  let preselectedVerseCandidatId = '';

  const bridge = await getFirestoreBridge();

  async function loadCandidats() {
    const localList = readLocalList(STORAGE_CANDIDATS_KEY);
    if (!bridge) return localList.filter((c) => !c.archived);
    try {
      const remoteList = await bridge.listDocuments(bridge.COLLECTIONS.CANDIDATS);
      if (Array.isArray(remoteList) && remoteList.length > 0) {
        const mergedMap = new Map();
        localList.forEach((item) => mergedMap.set(item.id, item));
        remoteList.forEach((item) => mergedMap.set(item.id, { ...mergedMap.get(item.id), ...item }));
        return Array.from(mergedMap.values()).filter((c) => !c.archived);
      }
    } catch (_) {}
    return localList.filter((c) => !c.archived);
  }

  async function loadVersements() {
    const localList = readLocalList(STORAGE_VERSEMENTS_KEY);
    if (!bridge) return localList.filter((v) => !v.archived);
    try {
      const remoteList = await bridge.listDocuments(bridge.COLLECTIONS.VERSEMENTS);
      if (Array.isArray(remoteList) && remoteList.length > 0) {
        const mergedMap = new Map();
        localList.forEach((item) => mergedMap.set(item.id, item));
        remoteList.forEach((item) => mergedMap.set(item.id, { ...mergedMap.get(item.id), ...item }));
        return Array.from(mergedMap.values()).filter((v) => !v.archived);
      }
    } catch (_) {}
    return localList.filter((v) => !v.archived);
  }

  async function saveCandidat(record, existingId = null) {
    const id = existingId || record.id || `cand_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fullRecord = { ...record, id, archived: false };

    const localList = readLocalList(STORAGE_CANDIDATS_KEY);
    const idx = localList.findIndex((item) => item.id === id);
    if (idx >= 0) {
      localList[idx] = { ...localList[idx], ...fullRecord };
    } else {
      localList.unshift(fullRecord);
    }
    writeLocalList(STORAGE_CANDIDATS_KEY, localList);

    if (bridge) {
      try {
        await bridge.setDocument(bridge.COLLECTIONS.CANDIDATS, id, fullRecord, { merge: true });
      } catch (_) {}
    }
    return fullRecord;
  }

  async function archiveCandidat(candidat, paidUsd) {
    const archivedItem = {
      id: `arch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'candidat_versement',
      titre: `Candidat : ${candidat.nom || ''} (${candidat.motif || ''})`,
      province: candidat.province || getActiveProvinceSafe(),
      annee: new Date().getFullYear(),
      dateArchivage: new Date().toISOString(),
      montantPrevuUsd: Number(candidat.montantPrevuUsd) || 0,
      montantVerseUsd: Number(paidUsd) || 0,
      data: candidat
    };

    const archives = readLocalList(STORAGE_ARCHIVES_KEY);
    archives.unshift(archivedItem);
    writeLocalList(STORAGE_ARCHIVES_KEY, archives);

    const localList = readLocalList(STORAGE_CANDIDATS_KEY);
    const updated = localList.map((c) => (c.id === candidat.id ? { ...c, archived: true } : c));
    writeLocalList(STORAGE_CANDIDATS_KEY, updated);

    if (bridge) {
      try {
        await bridge.setDocument(bridge.COLLECTIONS.ARCHIVES, archivedItem.id, archivedItem, { merge: true });
        await bridge.setDocument(bridge.COLLECTIONS.CANDIDATS, candidat.id, { archived: true }, { merge: true });
      } catch (_) {}
    }
  }

  async function removeCandidat(id) {
    const localList = readLocalList(STORAGE_CANDIDATS_KEY).filter((c) => c.id !== id);
    writeLocalList(STORAGE_CANDIDATS_KEY, localList);
    if (bridge) {
      try {
        await bridge.deleteDocument(bridge.COLLECTIONS.CANDIDATS, id);
      } catch (_) {}
    }
  }

  async function saveVersement(record) {
    const id = `vers_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fullRecord = { ...record, id, archived: false };

    const localList = readLocalList(STORAGE_VERSEMENTS_KEY);
    localList.unshift(fullRecord);
    writeLocalList(STORAGE_VERSEMENTS_KEY, localList);

    if (bridge) {
      try {
        await bridge.setDocument(bridge.COLLECTIONS.VERSEMENTS, id, fullRecord, { merge: true });
      } catch (_) {}
    }
    return fullRecord;
  }

  async function removeVersement(id) {
    const localList = readLocalList(STORAGE_VERSEMENTS_KEY).filter((v) => v.id !== id);
    writeLocalList(STORAGE_VERSEMENTS_KEY, localList);
    if (bridge) {
      try {
        await bridge.deleteDocument(bridge.COLLECTIONS.VERSEMENTS, id);
      } catch (_) {}
    }
  }

  const render = async () => {
    const province = getActiveProvinceSafe();
    const [allCandidats, allVersements] = await Promise.all([loadCandidats(), loadVersements()]);

    const candidats = allCandidats.filter((c) => !c.province || c.province === province);
    const candidatIds = new Set(candidats.map((c) => c.id));
    const versements = allVersements.filter(
      (v) => (!v.province || v.province === province) || (v.candidatId && candidatIds.has(v.candidatId))
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
      (m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`
    ).join('');

    const typeEntiteOptionsHtml = TYPES_ENTITE.map(
      (t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`
    ).join('');

    container.innerHTML = `
      <section class="module-page finance-page">
        <div class="page-header">
          <h2>💰 SUIVI DE VERSEMENT (candidats membres)</h2>
        </div>

        <div class="card" style="padding:10px 14px;font-size:0.82rem;color:var(--text-muted);">
          Province : <strong style="color:var(--green-main);">${escapeHtml(province)}</strong> •
          Entités : <strong>Centre de Formation, Johrei Center, Unité religieuse, Foyer de lumière, Noyau de salut</strong>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Candidats Membres</div>
            <div class="kpi-value">${formatNum(candidats.length)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Prévu (USD)</div>
            <div class="kpi-value">${formatUsd(totalPrevuUsd)}</div>
          </div>
          <div class="kpi-card" style="border-left-color:#0d8a38;">
            <div class="kpi-label">Total Versé (USD)</div>
            <div class="kpi-value" style="color:#0d8a38;">${formatUsd(totalVerseUsd)}</div>
          </div>
          <div class="kpi-card" style="border-left-color:#d97706;">
            <div class="kpi-label">Reste à Payer (USD)</div>
            <div class="kpi-value" style="color:#d97706;">${formatUsd(totalResteUsd)}</div>
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
      await renderCandidatsTab(host, province, candidats, paidByCandidat, motifOptionsHtml, typeEntiteOptionsHtml);
    } else if (activeTab === 'versements') {
      await renderVersementsTab(host, province, candidats, versements, motifOptionsHtml, typeEntiteOptionsHtml);
    } else if (activeTab === 'releves') {
      renderRelevesTab(host, province, candidats, paidByCandidat);
    }
  };

  async function renderCandidatsTab(host, province, candidats, paidByCandidat, motifOptionsHtml, typeEntiteOptionsHtml) {
    const editingCand = editingCandidatId ? candidats.find((c) => c.id === editingCandidatId) || null : null;
    const filtered =
      filterMotif === 'ALL' ? candidats : candidats.filter((c) => c.motif === filterMotif);

    host.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 10px;">
          ${editingCand ? '✏️ Modifier le candidat membre' : 'Enregistrer un candidat membre'}
        </h3>
        <form id="form-add-candidat" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">
            <div class="form-group">
              <label for="cand-nom">Nom complet du candidat membre</label>
              <input id="cand-nom" type="text" required value="${escapeHtml(editingCand?.nom || '')}" placeholder="Ex: Kalombo Jean" />
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
              <input id="cand-montant-prevu" type="number" step="0.01" min="0" required value="${escapeHtml(editingCand?.montantPrevuUsd ?? '')}" placeholder="0.00" />
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
              <input id="cand-entite" type="text" required value="${escapeHtml(editingCand?.entite || '')}" placeholder="Ex: Kananga I" />
            </div>
            <div class="form-group">
              <label for="cand-telephone">Téléphone (optionnel)</label>
              <input id="cand-telephone" type="tel" value="${escapeHtml(editingCand?.telephone || '')}" placeholder="+243..." />
            </div>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
            <button type="submit" id="btn-submit-candidat" class="btn-primary">
              ${editingCand ? '💾 Enregistrer les modifications' : '➕ Enregistrer un candidat membre'}
            </button>
            ${
              editingCand
                ? `<button type="button" id="btn-cancel-edit-candidat" class="btn-secondary">Annuler</button>`
                : ''
            }
          </div>
        </form>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <h3 style="margin:0;">Candidats Membres enregistrés (${filtered.length})</h3>
          <select id="filter-motif-candidat" aria-label="Filtrer par motif" style="max-width:210px;">
            <option value="ALL" ${filterMotif === 'ALL' ? 'selected' : ''}>Tous les motifs (7)</option>
            ${MOTIFS_VERSEMENT.map(
              (m) => `<option value="${escapeHtml(m)}" ${filterMotif === m ? 'selected' : ''}>${escapeHtml(m)}</option>`
            ).join('')}
          </select>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Candidat & Entité</th>
                <th>Motif</th>
                <th>Prévu / Versé / Reste</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                filtered.length === 0
                  ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Aucun candidat membre enregistré.</td></tr>`
                  : filtered
                      .map((c) => {
                        const prevu = Number(c.montantPrevuUsd) || 0;
                        const verse = paidByCandidat[c.id] || 0;
                        const reste = Math.max(0, prevu - verse);
                        const entiteText = formatEntiteLabel(c.typeEntite, c.entite);
                        return `
                        <tr>
                          <td>
                            <strong>${escapeHtml(c.nom || '')}</strong>
                            <br><span style="font-size:0.75rem;color:var(--text-muted);">Entité : ${escapeHtml(entiteText)}</span>
                          </td>
                          <td><span class="badge">${escapeHtml(c.motif || '')}</span></td>
                          <td style="font-size:0.78rem;">
                            Prévu : <strong>${formatUsd(prevu)}</strong><br>
                            Versé : <strong style="color:#0d8a38;">${formatUsd(verse)}</strong><br>
                            Reste : <strong style="color:#b45309;">${formatUsd(reste)}</strong>
                          </td>
                          <td>
                            <div style="display:flex;gap:5px;flex-wrap:wrap;">
                              <button type="button" class="btn-secondary btn-edit-cand" data-id="${escapeHtml(c.id)}" style="padding:5px 8px;font-size:0.75rem;">✏️ Modifier</button>
                              <button type="button" class="btn-primary btn-verser-cand" data-id="${escapeHtml(c.id)}" style="padding:5px 8px;font-size:0.75rem;">💵 Verser</button>
                              <button type="button" class="btn-secondary btn-arch-cand" data-id="${escapeHtml(c.id)}" style="padding:5px 8px;font-size:0.75rem;">🗂️ Archiver</button>
                              <button type="button" class="btn-icon btn-del-cand" data-id="${escapeHtml(c.id)}" title="Supprimer">🗑️</button>
                            </div>
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

    if (editingCand) {
      const mSel = host.querySelector('#cand-motif');
      const tSel = host.querySelector('#cand-type-entite');
      if (mSel && editingCand.motif) mSel.value = editingCand.motif;
      if (tSel && editingCand.typeEntite) tSel.value = editingCand.typeEntite;
    }

    host.querySelector('#filter-motif-candidat')?.addEventListener('change', async (e) => {
      filterMotif = e.target.value;
      await render();
    });

    host.querySelector('#btn-cancel-edit-candidat')?.addEventListener('click', async () => {
      editingCandidatId = null;
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
        notifyUser('Veuillez renseigner le nom, le motif et l’entité.', 'error');
        return;
      }

      await saveCandidat(
        {
          nom,
          motif,
          montantPrevuUsd,
          typeEntite,
          entite,
          telephone,
          province,
          updatedAt: new Date().toISOString()
        },
        editingCandidatId
      );

      const wasEditing = Boolean(editingCandidatId);
      editingCandidatId = null;
      notifyUser(wasEditing ? 'Candidat membre modifié.' : 'Candidat membre enregistré.', 'success');
      await render();
    });

    host.querySelectorAll('.btn-edit-cand').forEach((btn) => {
      btn.addEventListener('click', async () => {
        editingCandidatId = btn.dataset.id;
        await render();
        host.querySelector('#cand-nom')?.focus();
      });
    });

    host.querySelectorAll('.btn-verser-cand').forEach((btn) => {
      btn.addEventListener('click', async () => {
        preselectedVerseCandidatId = btn.dataset.id;
        activeTab = 'versements';
        await render();
      });
    });

    host.querySelectorAll('.btn-arch-cand').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const cand = candidats.find((c) => c.id === btn.dataset.id);
        if (!cand) return;
        if (!window.confirm(`Archiver le dossier de ${cand.nom} ?`)) return;
        await archiveCandidat(cand, paidByCandidat[cand.id] || 0);
        notifyUser('Candidat archivé.', 'info');
        await render();
      });
    });

    host.querySelectorAll('.btn-del-cand').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Supprimer définitivement ce candidat membre ?')) return;
        await removeCandidat(btn.dataset.id);
        if (editingCandidatId === btn.dataset.id) editingCandidatId = null;
        notifyUser('Candidat membre supprimé.', 'info');
        await render();
      });
    });
  }

  async function renderVersementsTab(host, province, candidats, versements, motifOptionsHtml, typeEntiteOptionsHtml) {
    const candidatOptions = candidats
      .map((c) => {
        const entiteText = formatEntiteLabel(c.typeEntite, c.entite);
        const selectedAttr = c.id === preselectedVerseCandidatId ? 'selected' : '';
        return `<option value="${escapeHtml(c.id)}" ${selectedAttr} data-motif="${escapeHtml(
          c.motif || ''
        )}" data-type-entite="${escapeHtml(c.typeEntite || '')}" data-entite="${escapeHtml(
          c.entite || ''
        )}">${escapeHtml(c.nom || '')} (${escapeHtml(c.motif || '')} • ${escapeHtml(entiteText)})</option>`;
      })
      .join('');

    const todayStr = new Date().toISOString().slice(0, 10);

    host.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 10px;">💵 Enregistrer un Versement (USD ou FC)</h3>
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
                <th>Montant / USD</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                versements.length === 0
                  ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Aucun versement enregistré.</td></tr>`
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
                          <td>${escapeHtml(v.date || '')}</td>
                          <td>
                            <strong>${escapeHtml(cand?.nom || v.candidatNom || 'Candidat membre')}</strong>
                            <br><span style="font-size:0.75rem;color:var(--text-muted);">Entité : ${escapeHtml(entiteText)}</span>
                          </td>
                          <td><span class="badge">${escapeHtml(v.motif || cand?.motif || '')}</span></td>
                          <td>
                            ${formatNum(v.montant)} ${escapeHtml(v.devise || 'USD')}<br>
                            <strong style="color:#0a6e2c;">${formatUsd(usdVal)}</strong>
                          </td>
                          <td>
                            <button type="button" class="btn-icon btn-del-vers" data-id="${escapeHtml(v.id)}" title="Supprimer">🗑️</button>
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

    const syncFromSelectedCandidat = () => {
      if (!selCand) return;
      const opt = selCand.options[selCand.selectedIndex];
      if (!opt) return;
      const m = opt.dataset?.motif;
      const tEnt = opt.dataset?.typeEntite;
      const nEnt = opt.dataset?.entite;
      if (m && MOTIFS_VERSEMENT.includes(m) && selMotif) selMotif.value = m;
      if (tEnt && TYPES_ENTITE.includes(tEnt) && selTypeEntite) selTypeEntite.value = tEnt;
      if (nEnt && inputEntite) inputEntite.value = nEnt;
    };

    if (preselectedVerseCandidatId) {
      syncFromSelectedCandidat();
      preselectedVerseCandidatId = '';
    }

    selCand?.addEventListener('change', syncFromSelectedCandidat);

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
        notifyUser('Veuillez remplir tous les champs du versement.', 'error');
        return;
      }

      const candObj = candidats.find((c) => c.id === candidatId);
      const finalTypeEntite = typeEntite || candObj?.typeEntite || '';
      const finalEntite = entite || candObj?.entite || '';
      const montantUsd = toUsd(montant, devise, taux);

      await saveVersement({
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

      notifyUser('Versement enregistré.', 'success');
      await render();
    });

    host.querySelectorAll('.btn-del-vers').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Supprimer ce versement ?')) return;
        await removeVersement(btn.dataset.id);
        notifyUser('Versement supprimé.', 'info');
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
          <h3 style="margin:0;">Relevé par Catégorie / Motif — ${escapeHtml(province)}</h3>
          <button type="button" id="btn-export-finance-csv" class="btn-secondary">📥 Exporter CSV</button>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Catégorie / Motif</th>
                <th>Candidats</th>
                <th>Prévu ($)</th>
                <th>Versé ($)</th>
                <th>Reste ($)</th>
              </tr>
            </thead>
            <tbody>
              ${statsByMotif
                .map(
                  (row) => `
                  <tr>
                    <td><strong>${escapeHtml(row.motif)}</strong></td>
                    <td>${row.nbCandidats}</td>
                    <td>${formatUsd(row.prevu)}</td>
                    <td style="color:#0d8a38;font-weight:700;">${formatUsd(row.verse)}</td>
                    <td style="color:#b45309;font-weight:700;">${formatUsd(row.reste)}</td>
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
                <th>Candidat & Entité</th>
                <th>Motif</th>
                <th>Prévu / Versé / Reste</th>
              </tr>
            </thead>
            <tbody>
              ${
                candidats.length === 0
                  ? `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">Aucune donnée à afficher.</td></tr>`
                  : candidats
                      .map((c) => {
                        const prevu = Number(c.montantPrevuUsd) || 0;
                        const verse = paidByCandidat[c.id] || 0;
                        const reste = Math.max(0, prevu - verse);
                        const entiteText = formatEntiteLabel(c.typeEntite, c.entite);
                        return `
                        <tr>
                          <td>
                            <strong>${escapeHtml(c.nom || '')}</strong>
                            <br><span style="font-size:0.75rem;color:var(--text-muted);">Entité : ${escapeHtml(entiteText)}</span>
                          </td>
                          <td>${escapeHtml(c.motif || '')}</td>
                          <td style="font-size:0.78rem;">
                            Prévu : ${formatUsd(prevu)} • Versé : <strong>${formatUsd(verse)}</strong> • Reste : <strong>${formatUsd(reste)}</strong>
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
      notifyUser('Relevé CSV exporté.', 'success');
    });
  }

  await render();
}
