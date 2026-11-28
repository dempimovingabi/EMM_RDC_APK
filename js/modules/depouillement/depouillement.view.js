// js/modules/depouillement/depouillement.view.js
// Module Dépouillement des Offrandes — EMM RD CONGO

export const TYPES_ENTITE_OFFRANDES = [
  'Centre de Formation',
  'Johrei Center',
  'Unité religieuse',
  'Foyer de lumière',
  'Noyau de salut'
];

export const RUBRIQUES_NOMINATIVES = [
  'Initiation',
  'Sorei saichi',
  'shinrei saichi',
  'Shoku',
  'Kannon',
  'Photo sacrée',
  'Goshintai familial',
  'Mitamaya'
];

const STORAGE_SEANCES_KEY = 'emm_depouillement_seances_v3';
const STORAGE_ARCHIVES_KEY = 'emm_archives_v1';
const STORAGE_DELETED_IDS_KEY = 'emm_depouillement_deleted_ids_v1';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNum(val) {
  return (Number(val) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

function formatFc(val) {
  return `${(Number(val) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FC`;
}

function formatUsd(val) {
  return `${(Number(val) || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} $`;
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
    return true;
  } catch (_) {
    return false;
  }
}

function getDeletedIdsSet() {
  return new Set(readLocalList(STORAGE_DELETED_IDS_KEY).map((x) => String(x)));
}

function markIdDeleted(id) {
  const set = getDeletedIdsSet();
  set.add(String(id));
  writeLocalList(STORAGE_DELETED_IDS_KEY, Array.from(set));
}

function unmarkIdDeleted(id) {
  const set = getDeletedIdsSet();
  set.delete(String(id));
  writeLocalList(STORAGE_DELETED_IDS_KEY, Array.from(set));
}

async function getFirestoreBridge() {
  try {
    const [constantsMod, fsMod] = await Promise.all([
      import('../../config/constants.js').catch(() => null),
      import('../../services/firestore.service.js').catch(() => null)
    ]);
    if (
      constantsMod?.COLLECTIONS &&
      fsMod?.listDocuments &&
      fsMod?.setDocument &&
      fsMod?.deleteDocument
    ) {
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
        background:${type === 'error' ? '#991b1b' : type === 'success' ? '#0a6e2c' : '#0f172a'};
        color:#ffffff;padding:10px 14px;border-radius:8px;margin-top:6px;
        font-size:0.84rem;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,0.25);
      `;
      toastRoot.appendChild(el);
      setTimeout(() => el.remove(), 3000);
      return;
    }
  } catch (_) {}
  console.log('[EMM Dépouillement]', msg);
}

function createEmptyEntiteEntry(typeEntite = TYPES_ENTITE_OFFRANDES[0], nomEntite = '') {
  const nominatifsParRubrique = {};
  RUBRIQUES_NOMINATIVES.forEach((rub) => {
    nominatifsParRubrique[rub] = [];
  });
  return {
    id: `ent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    typeEntite: String(typeEntite || TYPES_ENTITE_OFFRANDES[0]).trim(),
    nomEntite: String(nomEntite || '').trim(),
    enveloppes: 0,
    constructionFc: 0,
    constructionUsd: 0,
    normalesFc: 0,
    normalesUsd: 0,
    nominatifsParRubrique,
    transportFc: 0,
    transportUsd: 0
  };
}

function computeEntiteSummary(entite) {
  const safeEnt = entite || {};
  const enveloppes = Math.max(0, Number(safeEnt.enveloppes) || 0);
  const constrFc = Math.max(0, Number(safeEnt.constructionFc) || 0);
  const constrUsd = Math.max(0, Number(safeEnt.constructionUsd) || 0);
  const normFc = Math.max(0, Number(safeEnt.normalesFc) || 0);
  const normUsd = Math.max(0, Number(safeEnt.normalesUsd) || 0);

  const sousTotalCnFc = constrFc + normFc;
  const sousTotalCnUsd = constrUsd + normUsd;

  const rubriquesResume = {};
  let totalNomFc = 0;
  let totalNomUsd = 0;

  RUBRIQUES_NOMINATIVES.forEach((rub) => {
    const entries = Array.isArray(safeEnt.nominatifsParRubrique?.[rub])
      ? safeEnt.nominatifsParRubrique[rub]
      : [];
    let rubFc = 0;
    let rubUsd = 0;
    entries.forEach((item) => {
      const m = Math.max(0, Number(item?.montant) || 0);
      if (item?.devise === 'USD') {
        rubUsd += m;
      } else {
        rubFc += m;
      }
    });
    rubriquesResume[rub] = {
      items: entries,
      count: entries.length,
      fc: rubFc,
      usd: rubUsd
    };
    totalNomFc += rubFc;
    totalNomUsd += rubUsd;
  });

  const totalSousTotauxFc = sousTotalCnFc + totalNomFc;
  const totalSousTotauxUsd = sousTotalCnUsd + totalNomUsd;

  const transportFc = Math.max(0, Number(safeEnt.transportFc) || 0);
  const transportUsd = Math.max(0, Number(safeEnt.transportUsd) || 0);

  const soldeFc = totalSousTotauxFc - transportFc;
  const soldeUsd = totalSousTotauxUsd - transportUsd;

  return {
    enveloppes,
    constrFc,
    constrUsd,
    normFc,
    normUsd,
    sousTotalCnFc,
    sousTotalCnUsd,
    rubriquesResume,
    totalNomFc,
    totalNomUsd,
    totalSousTotauxFc,
    totalSousTotauxUsd,
    transportFc,
    transportUsd,
    soldeFc,
    soldeUsd
  };
}

function computeSeanceSummary(seance) {
  const safeSeance = seance || {};
  const entites = Array.isArray(safeSeance.entites) ? safeSeance.entites : [];
  const depensesGenerales = Array.isArray(safeSeance.depensesGenerales)
    ? safeSeance.depensesGenerales
    : [];

  let totalSoldesEntitesFc = 0;
  let totalSoldesEntitesUsd = 0;
  let totalTransportFc = 0;
  let totalTransportUsd = 0;

  const entitesCalculees = entites.map((ent) => {
    const resume = computeEntiteSummary(ent);
    totalSoldesEntitesFc += resume.soldeFc;
    totalSoldesEntitesUsd += resume.soldeUsd;
    totalTransportFc += resume.transportFc;
    totalTransportUsd += resume.transportUsd;
    return { entite: ent, resume };
  });

  let totalDepGenFc = 0;
  let totalDepGenUsd = 0;

  depensesGenerales.forEach((d) => {
    const m = Math.max(0, Number(d?.montant) || 0);
    if (d?.devise === 'USD') {
      totalDepGenUsd += m;
    } else {
      totalDepGenFc += m;
    }
  });

  // Décaissement = dépenses de transport + dépenses générales (sans conversion)
  const totalDecaissementFc = totalTransportFc + totalDepGenFc;
  const totalDecaissementUsd = totalTransportUsd + totalDepGenUsd;

  // Solde à transférer à la banque = Total des soldes des entités - Total des dépenses générales (sans conversion)
  const soldeBanqueFc = totalSoldesEntitesFc - totalDepGenFc;
  const soldeBanqueUsd = totalSoldesEntitesUsd - totalDepGenUsd;

  return {
    entitesCalculees,
    totalSoldesEntitesFc,
    totalSoldesEntitesUsd,
    totalTransportFc,
    totalTransportUsd,
    totalDepGenFc,
    totalDepGenUsd,
    totalDecaissementFc,
    totalDecaissementUsd,
    soldeBanqueFc,
    soldeBanqueUsd
  };
}

export async function renderDepouillementView(container) {
  if (!container) return;

  let activeTab = 'seance';
  let selectedSeanceId = '';
  let editingSeanceId = null;
  let selectedEntiteId = '';
  let activeRubriqueNom = RUBRIQUES_NOMINATIVES[0];
  let selectedForDeleteIds = new Set();

  const bridge = await getFirestoreBridge();
  const colSeances = bridge?.COLLECTIONS?.DEPOUILLEMENTS || 'depouillements';
  const colArchives = bridge?.COLLECTIONS?.ARCHIVES || 'archives';

  function getLocalSeances() {
    const deletedSet = getDeletedIdsSet();
    return readLocalList(STORAGE_SEANCES_KEY).filter(
      (s) => s && s.id && !s.archived && !deletedSet.has(String(s.id))
    );
  }

  async function loadSeances() {
    const deletedSet = getDeletedIdsSet();
    const localList = readLocalList(STORAGE_SEANCES_KEY).filter(
      (s) => s && s.id && !deletedSet.has(String(s.id))
    );

    if (!bridge) {
      return localList.filter((s) => !s.archived);
    }

    try {
      const remoteList = await bridge.listDocuments(colSeances);
      if (Array.isArray(remoteList)) {
        const map = new Map();
        localList.forEach((item) => {
          if (item?.id && !deletedSet.has(String(item.id))) {
            map.set(String(item.id), item);
          }
        });
        remoteList.forEach((item) => {
          if (item?.id && !deletedSet.has(String(item.id))) {
            const idStr = String(item.id);
            const prev = map.get(idStr) || {};
            const localEntites = Array.isArray(prev.entites) ? prev.entites : [];
            const remoteEntites = Array.isArray(item.entites) ? item.entites : [];
            map.set(idStr, {
              ...prev,
              ...item,
              entites: remoteEntites.length > 0 ? remoteEntites : localEntites
            });
          }
        });
        return Array.from(map.values()).filter((s) => s && !s.archived);
      }
    } catch (_) {}

    return localList.filter((s) => !s.archived);
  }

  async function persistSeance(seance) {
    const id = String(seance.id || `seance_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    unmarkIdDeleted(id);

    const full = {
      ...seance,
      id,
      archived: false,
      statut: seance.statut || 'Ouverte',
      entites: Array.isArray(seance.entites) ? seance.entites : [],
      depensesGenerales: Array.isArray(seance.depensesGenerales) ? seance.depensesGenerales : []
    };

    const allStored = readLocalList(STORAGE_SEANCES_KEY);
    const idx = allStored.findIndex((s) => s && String(s.id) === id);
    if (idx >= 0) {
      allStored[idx] = { ...allStored[idx], ...full };
    } else {
      allStored.unshift(full);
    }
    writeLocalList(STORAGE_SEANCES_KEY, allStored);

    if (bridge) {
      try {
        await bridge.setDocument(colSeances, id, full, { merge: true });
      } catch (_) {}
    }
    return full;
  }

  async function deleteSeance(id) {
    const idStr = String(id);
    markIdDeleted(idStr);
    selectedForDeleteIds.delete(idStr);

    const allStored = readLocalList(STORAGE_SEANCES_KEY).filter(
      (s) => s && String(s.id) !== idStr
    );
    writeLocalList(STORAGE_SEANCES_KEY, allStored);

    if (bridge) {
      try {
        await bridge.deleteDocument(colSeances, idStr);
      } catch (_) {}
    }
  }

  async function deleteMultipleSeances(idsArray) {
    const uniqueIds = Array.from(new Set(idsArray.map((x) => String(x))));
    uniqueIds.forEach((idStr) => {
      markIdDeleted(idStr);
      selectedForDeleteIds.delete(idStr);
    });

    const idSet = new Set(uniqueIds);
    const allStored = readLocalList(STORAGE_SEANCES_KEY).filter(
      (s) => s && !idSet.has(String(s.id))
    );
    writeLocalList(STORAGE_SEANCES_KEY, allStored);

    if (bridge) {
      for (const idStr of uniqueIds) {
        try {
          await bridge.deleteDocument(colSeances, idStr);
        } catch (_) {}
      }
    }
  }

  async function archiveSeance(seance) {
    const idStr = String(seance.id);
    markIdDeleted(idStr);
    selectedForDeleteIds.delete(idStr);

    const summary = computeSeanceSummary(seance);
    const archivedItem = {
      id: `arch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'depouillement_seance',
      titre: `Dépouillement ${seance.mois || ''} ${seance.annee || ''} (${seance.phase || ''})`,
      province: seance.province || getActiveProvinceSafe(),
      annee: Number(seance.annee) || new Date().getFullYear(),
      dateArchivage: new Date().toISOString(),
      soldeBanqueFc: summary.soldeBanqueFc,
      soldeBanqueUsd: summary.soldeBanqueUsd,
      data: { ...seance, archived: true }
    };

    const archives = readLocalList(STORAGE_ARCHIVES_KEY);
    archives.unshift(archivedItem);
    writeLocalList(STORAGE_ARCHIVES_KEY, archives);

    const localList = readLocalList(STORAGE_SEANCES_KEY).filter(
      (s) => s && String(s.id) !== idStr
    );
    writeLocalList(STORAGE_SEANCES_KEY, localList);

    if (bridge) {
      try {
        await bridge.setDocument(colArchives, archivedItem.id, archivedItem, { merge: true });
        await bridge.deleteDocument(colSeances, idStr);
      } catch (_) {}
    }
  }

  const render = async () => {
    try {
      const province = getActiveProvinceSafe();
      const allSeances = await loadSeances();
      const seances = allSeances.filter((s) => !s.province || s.province === province);

      // Nettoyer les IDs cochés qui n'existent plus
      const validIds = new Set(seances.map((s) => String(s.id)));
      selectedForDeleteIds = new Set(
        Array.from(selectedForDeleteIds).filter((id) => validIds.has(String(id)))
      );

      if (selectedSeanceId && !seances.some((s) => String(s.id) === String(selectedSeanceId))) {
        selectedSeanceId = '';
      }
      if (!selectedSeanceId && seances[0]) {
        selectedSeanceId = String(seances[0].id);
      }

      const activeSeance =
        seances.find((s) => String(s.id) === String(selectedSeanceId)) || seances[0] || null;
      const entitesList = Array.isArray(activeSeance?.entites) ? activeSeance.entites : [];

      if (selectedEntiteId && !entitesList.some((e) => String(e.id) === String(selectedEntiteId))) {
        selectedEntiteId = '';
      }
      if (!selectedEntiteId && entitesList[0]) {
        selectedEntiteId = String(entitesList[0].id);
      }

      const summary = activeSeance ? computeSeanceSummary(activeSeance) : null;

      container.innerHTML = `
        <section class="module-page depouillement-page" style="background:#ffffff;color:#0f172a;padding:10px;border-radius:12px;">
          <div class="page-header" style="color:#0f172a;">
            <h2 style="color:#0f172a;">🧾 Dépouillement — ${escapeHtml(province)}</h2>
          </div>

          <div class="card" style="background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;padding:10px 14px;font-size:0.82rem;">
            Province : <strong style="color:#0a6e2c;">${escapeHtml(province)}</strong> •
            Entités : <strong>Centre de Formation, Johrei Center, Unité religieuse, Foyer de lumière, Noyau de salut</strong>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card" style="background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;">
              <div class="kpi-label" style="color:#475569;">Entités dans la Séance</div>
              <div class="kpi-value" style="color:#0f172a;">${summary ? summary.entitesCalculees.length : 0}</div>
            </div>
            <div class="kpi-card" style="background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;">
              <div class="kpi-label" style="color:#475569;">Total Soldes Entités</div>
              <div class="kpi-value" style="color:#0f172a;font-size:0.95rem;">
                ${summary ? formatFc(summary.totalSoldesEntitesFc) : '0 FC'}<br>
                ${summary ? formatUsd(summary.totalSoldesEntitesUsd) : '0,00 $'}
              </div>
            </div>
            <div class="kpi-card" style="background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;border-left:4px solid #b45309;">
              <div class="kpi-label" style="color:#475569;">Décaissement (Transport + Dép. gén.)</div>
              <div class="kpi-value" style="color:#b45309;font-size:0.95rem;">
                Décaissement FC : ${summary ? formatFc(summary.totalDecaissementFc) : '0 FC'}<br>
                Décaissement USD : ${summary ? formatUsd(summary.totalDecaissementUsd) : '0,00 $'}
              </div>
            </div>
            <div class="kpi-card" style="background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;border-left:4px solid #0d8a38;">
              <div class="kpi-label" style="color:#475569;">Solde à Transférer (Banque)</div>
              <div class="kpi-value" style="color:#0d8a38;font-size:0.95rem;">
                ${summary ? formatFc(summary.soldeBanqueFc) : '0 FC'}<br>
                ${summary ? formatUsd(summary.soldeBanqueUsd) : '0,00 $'}
              </div>
            </div>
          </div>

          <div class="tabs-bar" role="tablist">
            <button type="button" class="tab-btn ${activeTab === 'seance' ? 'active' : ''}" data-dtab="seance">
              📅 Séance & Entités
            </button>
            <button type="button" class="tab-btn ${activeTab === 'saisie' ? 'active' : ''}" data-dtab="saisie">
              ✍️ Saisie par Entité
            </button>
            <button type="button" class="tab-btn ${activeTab === 'depenses' ? 'active' : ''}" data-dtab="depenses">
              💸 Dépenses Générales & Banque
            </button>
            <button type="button" class="tab-btn ${activeTab === 'rapport' ? 'active' : ''}" data-dtab="rapport">
              📄 Rapport Complet
            </button>
          </div>

          <div id="dep-tab-host" style="color:#0f172a;"></div>
        </section>
      `;

      container.querySelectorAll('[data-dtab]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          activeTab = btn.dataset.dtab;
          await render();
        });
      });

      const host = container.querySelector('#dep-tab-host');
      if (!host) return;

      if (activeTab === 'seance') {
        await renderSeanceTab(host, province, seances, activeSeance);
      } else if (activeTab === 'saisie') {
        await renderSaisieEntiteTab(host, activeSeance);
      } else if (activeTab === 'depenses') {
        await renderDepensesGeneralesTab(host, activeSeance);
      } else {
        await renderRapportTab(host, province, activeSeance);
      }
    } catch (err) {
      console.error('[EMM Dépouillement]', err);
      container.innerHTML = `
        <div class="card" style="background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;">
          <h3 style="color:#0f172a;">🧾 Dépouillement</h3>
          <p style="color:#334155;">Impossible de charger les données pour le moment. Réessaie dans un instant.</p>
        </div>
      `;
    }
  };

  async function renderSeanceTab(host, province, seances, activeSeance) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.toLocaleString('fr-FR', { month: 'long' });
    const todayStr = now.toISOString().slice(0, 10);

    const editingSeance = editingSeanceId
      ? seances.find((s) => String(s.id) === String(editingSeanceId)) || null
      : null;

    const seanceOptions = seances
      .map(
        (s) =>
          `<option value="${escapeHtml(s.id)}" ${
            activeSeance && String(s.id) === String(activeSeance.id) ? 'selected' : ''
          }>${escapeHtml(`${s.mois || ''} ${s.annee || ''} — ${s.phase || ''} (${s.statut || 'Ouverte'})`)}</option>`
      )
      .join('');

    const typeOptions = TYPES_ENTITE_OFFRANDES.map(
      (t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`
    ).join('');

    const currentSummary = activeSeance ? computeSeanceSummary(activeSeance) : null;
    const allChecked =
      seances.length > 0 && seances.every((s) => selectedForDeleteIds.has(String(s.id)));

    host.innerHTML = `
      <div class="card" style="background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;">
        <h3 style="margin:0 0 10px;color:#0f172a;">
          ${editingSeance ? '✏️ Modifier la Séance de Dépouillement' : 'Ouvrir une Séance de Dépouillement (Toutes Entités)'}
        </h3>
        <form id="form-new-seance" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;">
            <div class="form-group">
              <label for="s-mois" style="color:#0f172a;">Mois</label>
              <input id="s-mois" type="text" value="${escapeHtml(editingSeance?.mois || currentMonth)}" required placeholder="Ex: novembre" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;" />
            </div>
            <div class="form-group">
              <label for="s-annee" style="color:#0f172a;">Année</label>
              <input id="s-annee" type="number" min="2020" max="2099" value="${escapeHtml(editingSeance?.annee || currentYear)}" required style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;" />
            </div>
            <div class="form-group">
              <label for="s-phase" style="color:#0f172a;">Phase</label>
              <input id="s-phase" type="text" value="${escapeHtml(editingSeance?.phase || 'Phase 1')}" required placeholder="Ex: Phase 1" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;" />
            </div>
            <div class="form-group">
              <label for="s-date" style="color:#0f172a;">Date</label>
              <input id="s-date" type="date" value="${escapeHtml(editingSeance?.date || todayStr)}" required style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;" />
            </div>
          </div>

          <div class="form-group">
            <label for="s-responsable" style="color:#0f172a;">Responsable de séance</label>
            <input id="s-responsable" type="text" value="${escapeHtml(editingSeance?.responsable || '')}" required placeholder="Nom du responsable" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;" />
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="submit" class="btn-primary">
              ${editingSeance ? '💾 Enregistrer les modifications' : '➕ Créer la séance de dépouillement'}
            </button>
            ${
              editingSeance
                ? `<button type="button" id="btn-cancel-edit-seance" class="btn-secondary">Annuler</button>`
                : ''
            }
          </div>
        </form>
      </div>

      <div class="card" style="background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <h3 style="margin:0;color:#0f172a;">Liste des Séances (${seances.length})</h3>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <button type="button" id="btn-toggle-select-all" class="btn-secondary" style="padding:5px 9px;font-size:0.76rem;">
              ${allChecked ? '☐ Tout décocher' : '☑️ Tout cocher'}
            </button>
            <button
              type="button"
              id="btn-delete-selected-seances"
              style="padding:5px 10px;font-size:0.76rem;border-radius:8px;border:none;background:#b91c1c;color:#ffffff;font-weight:700;cursor:pointer;"
            >
              🗑️ Supprimer la sélection (${selectedForDeleteIds.size})
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th style="width:36px;color:#0f172a;">Sel.</th>
                <th style="color:#0f172a;">Séance & Phase</th>
                <th style="color:#0f172a;">Responsable</th>
                <th style="color:#0f172a;">Statut</th>
                <th style="color:#0f172a;">Actions Séance</th>
              </tr>
            </thead>
            <tbody>
              ${
                seances.length === 0
                  ? `<tr><td colspan="5" style="text-align:center;color:#475569;">Aucune séance enregistrée pour ${escapeHtml(province)}.</td></tr>`
                  : seances
                      .map((s) => {
                        const idStr = String(s.id);
                        const isSelected = activeSeance && String(activeSeance.id) === idStr;
                        const isTerminated = s.statut === 'Terminée';
                        const isChecked = selectedForDeleteIds.has(idStr);
                        return `
                        <tr style="${isSelected ? 'background:#f0fdf4;' : 'background:#ffffff;'}color:#0f172a;">
                          <td>
                            <input
                              type="checkbox"
                              class="chk-select-seance"
                              data-id="${escapeHtml(idStr)}"
                              ${isChecked ? 'checked' : ''}
                              aria-label="Sélectionner la séance"
                              style="width:16px;height:16px;cursor:pointer;"
                            />
                          </td>
                          <td>
                            <strong>${escapeHtml(s.mois || '')} ${escapeHtml(s.annee || '')}</strong> — ${escapeHtml(s.phase || '')}
                            <br><span style="font-size:0.75rem;color:#475569;">Date : ${escapeHtml(s.date || '')}</span>
                          </td>
                          <td>${escapeHtml(s.responsable || '—')}</td>
                          <td>
                            <span class="badge" style="background:${isTerminated ? '#dcfce7' : '#fef3c7'};color:${isTerminated ? '#166534' : '#92400e'};">
                              ${escapeHtml(s.statut || 'Ouverte')}
                            </span>
                          </td>
                          <td>
                            <div style="display:flex;gap:4px;flex-wrap:wrap;">
                              <button type="button" class="btn-secondary btn-edit-seance" data-id="${escapeHtml(idStr)}" style="padding:4px 7px;font-size:0.74rem;">✏️ Modifier</button>
                              <button type="button" class="btn-primary btn-term-seance" data-id="${escapeHtml(idStr)}" style="padding:4px 7px;font-size:0.74rem;">✅ Terminer</button>
                              <button type="button" class="btn-secondary btn-arch-seance-row" data-id="${escapeHtml(idStr)}" style="padding:4px 7px;font-size:0.74rem;">🗂️ Archiver</button>
                              <button type="button" class="btn-icon btn-del-seance-row" data-id="${escapeHtml(idStr)}" title="Supprimer">🗑️</button>
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

      ${
        activeSeance && currentSummary
          ? `
          <div class="card" style="background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
              <h3 style="margin:0;color:#0f172a;">Entités de la séance : ${escapeHtml(activeSeance.mois || '')} ${escapeHtml(activeSeance.annee || '')}</h3>
              <select id="select-seance-courante" aria-label="Sélectionner une séance" style="max-width:260px;background:#ffffff;color:#0f172a;border:1px solid #94a3b8;">
                ${seanceOptions}
              </select>
            </div>

            <div style="padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#0f172a;margin-bottom:12px;">
              <strong style="display:block;font-size:0.84rem;margin-bottom:8px;color:#0f172a;">Ajouter une entité à cette séance</strong>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin-bottom:8px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label for="new-ent-type" style="color:#0f172a;">Type d'entité</label>
                  <select id="new-ent-type" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;">
                    ${typeOptions}
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label for="new-ent-nom" style="color:#0f172a;">Nom de l'entité</label>
                  <input id="new-ent-nom" type="text" placeholder="Ex: Kananga I" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;" />
                </div>
              </div>
              <button type="button" id="btn-confirm-add-entite" class="btn-secondary">➕ Confirmer et ajouter l'entité</button>
            </div>

            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th style="color:#0f172a;">Entité</th>
                    <th style="color:#0f172a;">Total Sous-totaux</th>
                    <th style="color:#0f172a;">Transport</th>
                    <th style="color:#0f172a;">Solde Entité</th>
                    <th style="color:#0f172a;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    currentSummary.entitesCalculees.length === 0
                      ? `<tr><td colspan="5" style="text-align:center;color:#475569;">Ajoutez les entités concernées par cette séance.</td></tr>`
                      : currentSummary.entitesCalculees
                          .map(({ entite, resume }) => {
                            const label = `${entite.typeEntite || ''} — ${entite.nomEntite || ''}`;
                            return `
                            <tr style="background:#ffffff;color:#0f172a;">
                              <td><strong>${escapeHtml(label)}</strong></td>
                              <td style="font-size:0.78rem;">
                                ${formatFc(resume.totalSousTotauxFc)}<br>
                                ${formatUsd(resume.totalSousTotauxUsd)}
                              </td>
                              <td style="font-size:0.78rem;color:#b45309;">
                                ${formatFc(resume.transportFc)}<br>${formatUsd(resume.transportUsd)}
                              </td>
                              <td style="font-size:0.78rem;">
                                <strong style="color:#0a6e2c;">${formatFc(resume.soldeFc)}</strong><br>
                                <strong style="color:#0a6e2c;">${formatUsd(resume.soldeUsd)}</strong>
                              </td>
                              <td>
                                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                                  <button type="button" class="btn-primary btn-open-entite" data-id="${escapeHtml(entite.id)}" style="padding:5px 8px;font-size:0.75rem;">
                                    ✍️ Saisir
                                  </button>
                                  <button type="button" class="btn-icon btn-del-entite" data-id="${escapeHtml(entite.id)}" title="Retirer l'entité">🗑️</button>
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
        `
          : ''
      }
    `;

    host.querySelector('#btn-cancel-edit-seance')?.addEventListener('click', async () => {
      editingSeanceId = null;
      await render();
    });

    host.querySelector('#form-new-seance')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const mois = f['s-mois'].value.trim();
      const annee = Number(f['s-annee'].value) || currentYear;
      const phase = f['s-phase'].value.trim();
      const date = f['s-date'].value;
      const responsable = f['s-responsable'].value.trim();

      if (!mois || !phase || !date || !responsable) {
        notifyUser('Veuillez renseigner tous les champs de la séance.', 'error');
        return;
      }

      if (editingSeance) {
        const updated = await persistSeance({
          ...editingSeance,
          mois,
          annee,
          phase,
          date,
          responsable
        });
        editingSeanceId = null;
        selectedSeanceId = String(updated.id);
        notifyUser('Séance modifiée.', 'success');
        await render();
        return;
      }

      const created = await persistSeance({
        province,
        mois,
        annee,
        phase,
        date,
        responsable,
        statut: 'Ouverte',
        entites: [],
        depensesGenerales: [],
        createdAt: new Date().toISOString()
      });

      selectedSeanceId = String(created.id);
      selectedEntiteId = '';
      notifyUser('Séance de dépouillement créée.', 'success');
      await render();
    });

    host.querySelectorAll('.chk-select-seance').forEach((chk) => {
      chk.addEventListener('change', async () => {
        const idStr = String(chk.dataset.id);
        if (chk.checked) {
          selectedForDeleteIds.add(idStr);
        } else {
          selectedForDeleteIds.delete(idStr);
        }
        await render();
      });
    });

    host.querySelector('#btn-toggle-select-all')?.addEventListener('click', async () => {
      if (allChecked) {
        seances.forEach((s) => selectedForDeleteIds.delete(String(s.id)));
      } else {
        seances.forEach((s) => selectedForDeleteIds.add(String(s.id)));
      }
      await render();
    });

    host.querySelector('#btn-delete-selected-seances')?.addEventListener('click', async () => {
      const idsToDelete = Array.from(selectedForDeleteIds);
      if (idsToDelete.length === 0) {
        notifyUser('Cochez au moins une séance à supprimer.', 'error');
        return;
      }
      if (!window.confirm(`Supprimer définitivement les ${idsToDelete.length} séance(s) sélectionnée(s) ?`)) {
        return;
      }
      await deleteMultipleSeances(idsToDelete);
      if (idsToDelete.includes(String(selectedSeanceId))) selectedSeanceId = '';
      if (idsToDelete.includes(String(editingSeanceId))) editingSeanceId = null;
      notifyUser(`${idsToDelete.length} séance(s) supprimée(s).`, 'info');
      await render();
    });

    host.querySelectorAll('.btn-edit-seance').forEach((btn) => {
      btn.addEventListener('click', async () => {
        editingSeanceId = String(btn.dataset.id);
        selectedSeanceId = String(btn.dataset.id);
        await render();
        host.querySelector('#s-mois')?.focus();
      });
    });

    host.querySelectorAll('.btn-term-seance').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const target = seances.find((s) => String(s.id) === String(btn.dataset.id));
        if (!target) return;
        await persistSeance({ ...target, statut: 'Terminée' });
        notifyUser('Séance marquée comme Terminée.', 'success');
        await render();
      });
    });

    host.querySelectorAll('.btn-arch-seance-row').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const target = seances.find((s) => String(s.id) === String(btn.dataset.id));
        if (!target) return;
        if (!window.confirm('Archiver cette séance de dépouillement ?')) return;
        await archiveSeance(target);
        if (String(selectedSeanceId) === String(target.id)) selectedSeanceId = '';
        if (String(editingSeanceId) === String(target.id)) editingSeanceId = null;
        notifyUser('Séance archivée.', 'info');
        await render();
      });
    });

    host.querySelectorAll('.btn-del-seance-row').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idStr = String(btn.dataset.id);
        if (!window.confirm('Supprimer définitivement cette séance ?')) return;
        await deleteSeance(idStr);
        if (String(selectedSeanceId) === idStr) selectedSeanceId = '';
        if (String(editingSeanceId) === idStr) editingSeanceId = null;
        notifyUser('Séance supprimée.', 'info');
        await render();
      });
    });

    host.querySelector('#select-seance-courante')?.addEventListener('change', async (e) => {
      selectedSeanceId = String(e.target.value);
      selectedEntiteId = '';
      await render();
    });

    const handleAddEntite = async () => {
      const latestSeance =
        getLocalSeances().find((s) => String(s.id) === String(activeSeance?.id)) || activeSeance;
      if (!latestSeance) {
        notifyUser('Veuillez d’abord créer ou sélectionner une séance.', 'error');
        return;
      }
      const typeEntite = host.querySelector('#new-ent-type')?.value || TYPES_ENTITE_OFFRANDES[0];
      const nomEntite = (host.querySelector('#new-ent-nom')?.value || '').trim();
      if (!nomEntite) {
        notifyUser("Veuillez indiquer le nom de l'entité.", 'error');
        return;
      }

      const newEnt = createEmptyEntiteEntry(typeEntite, nomEntite);
      const updatedSeance = {
        ...latestSeance,
        entites: [...(Array.isArray(latestSeance.entites) ? latestSeance.entites : []), newEnt]
      };
      await persistSeance(updatedSeance);
      selectedSeanceId = String(updatedSeance.id);
      selectedEntiteId = String(newEnt.id);
      notifyUser("Entité enregistrée dans la séance.", 'success');
      activeTab = 'saisie';
      await render();
    };

    host.querySelector('#btn-confirm-add-entite')?.addEventListener('click', handleAddEntite);

    host.querySelector('#new-ent-nom')?.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await handleAddEntite();
      }
    });

    host.querySelectorAll('.btn-open-entite').forEach((btn) => {
      btn.addEventListener('click', async () => {
        selectedEntiteId = String(btn.dataset.id);
        activeTab = 'saisie';
        await render();
      });
    });

    host.querySelectorAll('.btn-del-entite').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const latestSeance =
          getLocalSeances().find((s) => String(s.id) === String(activeSeance?.id)) || activeSeance;
        if (!latestSeance) return;
        if (!window.confirm('Retirer cette entité de la séance ?')) return;
        const nextEntites = (latestSeance.entites || []).filter(
          (e) => String(e.id) !== String(btn.dataset.id)
        );
        await persistSeance({ ...latestSeance, entites: nextEntites });
        if (String(selectedEntiteId) === String(btn.dataset.id)) selectedEntiteId = '';
        notifyUser('Entité retirée.', 'info');
        await render();
      });
    });
  }

  async function renderSaisieEntiteTab(host, activeSeance) {
    if (!activeSeance || !Array.isArray(activeSeance.entites) || activeSeance.entites.length === 0) {
      host.innerHTML = `
        <div class="card" style="background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;text-align:center;">
          <p style="margin:0 0 10px;color:#334155;">
            Ouvrez d'abord une séance et ajoutez au moins une entité pour commencer le comptage.
          </p>
          <button type="button" id="btn-go-seance" class="btn-primary">📅 Aller à Séance & Entités</button>
        </div>
      `;
      host.querySelector('#btn-go-seance')?.addEventListener('click', async () => {
        activeTab = 'seance';
        await render();
      });
      return;
    }

    const currentEntite =
      activeSeance.entites.find((e) => String(e.id) === String(selectedEntiteId)) ||
      activeSeance.entites[0];
    selectedEntiteId = String(currentEntite.id);

    const resume = computeEntiteSummary(currentEntite);

    const entiteSelectorHtml = activeSeance.entites
      .map(
        (e) =>
          `<option value="${escapeHtml(e.id)}" ${
            String(e.id) === String(currentEntite.id) ? 'selected' : ''
          }>${escapeHtml(`${e.typeEntite || ''} — ${e.nomEntite || ''}`)}</option>`
      )
      .join('');

    const rubTabsHtml = RUBRIQUES_NOMINATIVES.map((rub) => {
      const rSum = resume.rubriquesResume[rub] || { count: 0, fc: 0, usd: 0 };
      const isAct = rub === activeRubriqueNom;
      return `
        <button
          type="button"
          class="tab-btn ${isAct ? 'active' : ''}"
          data-rub-tab="${escapeHtml(rub)}"
          style="font-size:0.76rem;padding:6px 10px;"
        >
          ${escapeHtml(rub)} (${rSum.count})
        </button>
      `;
    }).join('');

    const currentRubList = Array.isArray(currentEntite.nominatifsParRubrique?.[activeRubriqueNom])
      ? currentEntite.nominatifsParRubrique[activeRubriqueNom]
      : [];

    const currentRubResume = resume.rubriquesResume[activeRubriqueNom] || { fc: 0, usd: 0 };

    host.innerHTML = `
      <div class="card" style="background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <h3 style="margin:0;color:#0f172a;">Comptage Entité — ${escapeHtml(activeSeance.mois || '')}${escapeHtml(activeSeance.annee || '')}</h3>
          <select id="select-entite-saisie" aria-label="Choisir l'entité" style="max-width:260px;background:#ffffff;color:#0f172a;border:1px solid #94a3b8;">
            ${entiteSelectorHtml}
          </select>
        </div>

        <form id="form-entite-bases" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;">
            <div class="form-group">
              <label for="ent-env" style="color:#0f172a;">1. Nombre d'enveloppes</label>
              <input id="ent-env" type="number" min="0" value="${resume.enveloppes}" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;" />
            </div>
            <div class="form-group">
              <label for="ent-constr-fc" style="color:#0f172a;">2. Construction (FC)</label>
              <input id="ent-constr-fc" type="number" min="0" step="1" value="${resume.constrFc}" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;" />
            </div>
            <div class="form-group">
              <label for="ent-constr-usd" style="color:#0f172a;">2. Construction (USD)</label>
              <input id="ent-constr-usd" type="number" min="0" step="0.01" value="${resume.constrUsd}" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;" />
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;">
            <div class="form-group">
              <label for="ent-norm-fc" style="color:#0f172a;">3. Offrandes Normales (FC)</label>
              <input id="ent-norm-fc" type="number" min="0" step="1" value="${resume.normFc}" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;" />
            </div>
            <div class="form-group">
              <label for="ent-norm-usd" style="color:#0f172a;">3. Offrandes Normales (USD)</label>
              <input id="ent-norm-usd" type="number" min="0" step="0.01" value="${resume.normUsd}" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;" />
            </div>
          </div>

          <div style="padding:8px 12px;border-radius:8px;background:#f0fdf4;border:1px solid #86efac;font-size:0.8rem;color:#0f172a;">
            <strong>4. Sous-total (Construction + Normales) :</strong><br>
            Francs : <strong>${formatFc(resume.sousTotalCnFc)}</strong><br>
            Dollars : <strong>${formatUsd(resume.sousTotalCnUsd)}</strong>
          </div>

          <button type="submit" class="btn-secondary">💾 Enregistrer Enveloppes, Construction & Normales</button>
        </form>
      </div>

      <div class="card" style="background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;">
        <h3 style="margin:0 0 8px;color:#0f172a;">5. Offrandes Nominatives par Rubrique</h3>
        <div class="tabs-bar" style="flex-wrap:wrap;gap:6px;margin-bottom:10px;">
          ${rubTabsHtml}
        </div>

        <form id="form-add-nominatif" class="form-stack" style="margin-bottom:10px;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;">
            <div class="form-group">
              <label for="nom-donateur" style="color:#0f172a;">Nom du donateur (${escapeHtml(activeRubriqueNom)})</label>
              <input id="nom-donateur" type="text" required placeholder="Nom complet" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;" />
            </div>
            <div class="form-group">
              <label for="nom-montant" style="color:#0f172a;">Montant</label>
              <input id="nom-montant" type="number" min="0.01" step="0.01" required placeholder="0" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;" />
            </div>
            <div class="form-group">
              <label for="nom-devise" style="color:#0f172a;">Devise</label>
              <select id="nom-devise" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;">
                <option value="FC">FC (Francs)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
          <button type="submit" class="btn-primary">➕ Ajouter à ${escapeHtml(activeRubriqueNom)}</button>
        </form>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th style="color:#0f172a;">Donateur</th>
                <th style="color:#0f172a;">Montant</th>
                <th style="color:#0f172a;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                currentRubList.length === 0
                  ? `<tr><td colspan="3" style="text-align:center;color:#475569;">Aucune offrande nominative pour ${escapeHtml(activeRubriqueNom)}.</td></tr>`
                  : currentRubList
                      .map(
                        (item, idx) => `
                        <tr style="background:#ffffff;color:#0f172a;">
                          <td><strong>${escapeHtml(item.donateur || '')}</strong></td>
                          <td>
                            ${
                              item.devise === 'USD'
                                ? `<strong>${formatUsd(item.montant)}</strong>`
                                : `<strong>${formatFc(item.montant)}</strong>`
                            }
                          </td>
                          <td>
                            <button type="button" class="btn-icon btn-del-nom" data-idx="${idx}" title="Supprimer">🗑️</button>
                          </td>
                        </tr>
                      `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>

        <div style="margin-top:10px;padding:8px 12px;border-radius:8px;background:#f8fafc;border:1px solid #cbd5e1;font-size:0.8rem;color:#0f172a;">
          <strong>Sous-total ${escapeHtml(activeRubriqueNom)} :</strong><br>
          Francs : <strong>${formatFc(currentRubResume.fc)}</strong><br>
          Dollars : <strong>${formatUsd(currentRubResume.usd)}</strong>
        </div>
      </div>

      <div class="card" style="background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;">
        <h3 style="margin:0 0 8px;color:#0f172a;">6 à 8. Total des Sous-totaux, Transport & Solde de l'Entité</h3>
        <div style="font-size:0.82rem;margin-bottom:10px;color:#0f172a;">
          <strong>6. Total des sous-totaux :</strong><br>
          Francs : <strong>${formatFc(resume.totalSousTotauxFc)}</strong><br>
          Dollars : <strong>${formatUsd(resume.totalSousTotauxUsd)}</strong>
        </div>

        <form id="form-entite-transport" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;">
            <div class="form-group">
              <label for="ent-trans-fc" style="color:#0f172a;">7. Dépense de transport (FC)</label>
              <input id="ent-trans-fc" type="number" min="0" step="1" value="${resume.transportFc}" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;" />
            </div>
            <div class="form-group">
              <label for="ent-trans-usd" style="color:#0f172a;">7. Dépense de transport (USD)</label>
              <input id="ent-trans-usd" type="number" min="0" step="0.01" value="${resume.transportUsd}" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;" />
            </div>
          </div>
          <button type="submit" class="btn-secondary">💾 Enregistrer la dépense de transport</button>
        </form>

        <div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:#ecfdf5;border:1px solid #86efac;font-size:0.84rem;color:#0f172a;">
          <strong>8. Solde de l'entité (Total sous-totaux − Transport) :</strong><br>
          Solde en francs : <strong style="color:#0a6e2c;">${formatFc(resume.soldeFc)}</strong><br>
          Solde en dollars : <strong style="color:#0a6e2c;">${formatUsd(resume.soldeUsd)}</strong>
        </div>
      </div>
    `;

    host.querySelector('#select-entite-saisie')?.addEventListener('change', async (e) => {
      selectedEntiteId = String(e.target.value);
      await render();
    });

    host.querySelectorAll('[data-rub-tab]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        activeRubriqueNom = btn.dataset.rubTab;
        await render();
      });
    });

    host.querySelector('#form-entite-bases')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const enveloppes = Math.max(0, Number(host.querySelector('#ent-env')?.value) || 0);
      const constructionFc = Math.max(0, Number(host.querySelector('#ent-constr-fc')?.value) || 0);
      const constructionUsd = Math.max(0, Number(host.querySelector('#ent-constr-usd')?.value) || 0);
      const normalesFc = Math.max(0, Number(host.querySelector('#ent-norm-fc')?.value) || 0);
      const normalesUsd = Math.max(0, Number(host.querySelector('#ent-norm-usd')?.value) || 0);

      const updatedEntites = activeSeance.entites.map((ent) =>
        String(ent.id) === String(currentEntite.id)
          ? { ...ent, enveloppes, constructionFc, constructionUsd, normalesFc, normalesUsd }
          : ent
      );
      await persistSeance({ ...activeSeance, entites: updatedEntites });
      notifyUser('Enveloppes, construction et normales enregistrées.', 'success');
      await render();
    });

    host.querySelector('#form-add-nominatif')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const donateur = (host.querySelector('#nom-donateur')?.value || '').trim();
      const montant = Number(host.querySelector('#nom-montant')?.value) || 0;
      const devise = host.querySelector('#nom-devise')?.value || 'FC';

      if (!donateur || montant <= 0) {
        notifyUser('Veuillez saisir le nom du donateur et un montant valide.', 'error');
        return;
      }

      const updatedEntites = activeSeance.entites.map((ent) => {
        if (String(ent.id) !== String(currentEntite.id)) return ent;
        const mapRub = { ...(ent.nominatifsParRubrique || {}) };
        const arr = Array.isArray(mapRub[activeRubriqueNom]) ? [...mapRub[activeRubriqueNom]] : [];
        arr.push({
          id: `nom_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          donateur,
          montant,
          devise
        });
        mapRub[activeRubriqueNom] = arr;
        return { ...ent, nominatifsParRubrique: mapRub };
      });

      await persistSeance({ ...activeSeance, entites: updatedEntites });
      notifyUser(`Offrande ajoutée dans ${activeRubriqueNom}.`, 'success');
      await render();
    });

    host.querySelectorAll('.btn-del-nom').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.dataset.idx);
        const updatedEntites = activeSeance.entites.map((ent) => {
          if (String(ent.id) !== String(currentEntite.id)) return ent;
          const mapRub = { ...(ent.nominatifsParRubrique || {}) };
          const arr = Array.isArray(mapRub[activeRubriqueNom]) ? [...mapRub[activeRubriqueNom]] : [];
          arr.splice(idx, 1);
          mapRub[activeRubriqueNom] = arr;
          return { ...ent, nominatifsParRubrique: mapRub };
        });
        await persistSeance({ ...activeSeance, entites: updatedEntites });
        notifyUser('Ligne nominative supprimée.', 'info');
        await render();
      });
    });

    host.querySelector('#form-entite-transport')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const transportFc = Math.max(0, Number(host.querySelector('#ent-trans-fc')?.value) || 0);
      const transportUsd = Math.max(0, Number(host.querySelector('#ent-trans-usd')?.value) || 0);

      const updatedEntites = activeSeance.entites.map((ent) =>
        String(ent.id) === String(currentEntite.id) ? { ...ent, transportFc, transportUsd } : ent
      );
      await persistSeance({ ...activeSeance, entites: updatedEntites });
      notifyUser('Dépense de transport enregistrée.', 'success');
      await render();
    });
  }

  async function renderDepensesGeneralesTab(host, activeSeance) {
    if (!activeSeance) {
      host.innerHTML = `<div class="card" style="background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;"><p style="color:#334155;">Aucune séance active.</p></div>`;
      return;
    }

    const summary = computeSeanceSummary(activeSeance);
    const depenses = Array.isArray(activeSeance.depensesGenerales)
      ? activeSeance.depensesGenerales
      : [];

    host.innerHTML = `
      <div class="card" style="background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;">
        <h3 style="margin:0 0 8px;color:#0f172a;">Total des Soldes des Entités & Dépenses Générales</h3>
        <div style="font-size:0.82rem;margin-bottom:10px;color:#0f172a;">
          <strong>Total des soldes des entités :</strong><br>
          Francs : <strong>${formatFc(summary.totalSoldesEntitesFc)}</strong><br>
          Dollars : <strong>${formatUsd(summary.totalSoldesEntitesUsd)}</strong>
        </div>

        <form id="form-add-dep-gen" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">
            <div class="form-group">
              <label for="dep-gen-motif" style="color:#0f172a;">Motif de la dépense générale</label>
              <input id="dep-gen-motif" type="text" required placeholder="Ex: Location salle / Fournitures" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;" />
            </div>
            <div class="form-group">
              <label for="dep-gen-montant" style="color:#0f172a;">Montant</label>
              <input id="dep-gen-montant" type="number" min="0.01" step="0.01" required placeholder="0" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;" />
            </div>
            <div class="form-group">
              <label for="dep-gen-devise" style="color:#0f172a;">Devise</label>
              <select id="dep-gen-devise" style="background:#ffffff;color:#0f172a;border:1px solid #94a3b8;">
                <option value="FC">FC (Francs)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
          <button type="submit" class="btn-primary">➕ Ajouter une dépense générale</button>
        </form>
      </div>

      <div class="card" style="background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;">
        <h3 style="margin:0 0 8px;color:#0f172a;">Liste des Dépenses Générales (${depenses.length})</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th style="color:#0f172a;">Motif</th>
                <th style="color:#0f172a;">Montant</th>
                <th style="color:#0f172a;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                depenses.length === 0
                  ? `<tr><td colspan="3" style="text-align:center;color:#475569;">Aucune dépense générale enregistrée.</td></tr>`
                  : depenses
                      .map(
                        (d, idx) => `
                        <tr style="background:#ffffff;color:#0f172a;">
                          <td><strong>${escapeHtml(d.motif || '')}</strong></td>
                          <td>
                            ${
                              d.devise === 'USD'
                                ? `<strong>${formatUsd(d.montant)}</strong>`
                                : `<strong>${formatFc(d.montant)}</strong>`
                            }
                          </td>
                          <td>
                            <button type="button" class="btn-icon btn-del-dep-gen" data-idx="${idx}" title="Supprimer">🗑️</button>
                          </td>
                        </tr>
                      `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>

        <div style="margin-top:12px;padding:10px 12px;border-radius:8px;background:#fffbeb;border:1px solid #fcd34d;font-size:0.84rem;color:#0f172a;">
          <strong>Décaissement (Transport + Dépenses générales — sans conversion) :</strong><br>
          Décaissement en francs : <strong>${formatFc(summary.totalDecaissementFc)}</strong><br>
          Décaissement en dollars : <strong>${formatUsd(summary.totalDecaissementUsd)}</strong>
        </div>

        <div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:#f0fdf4;border:1px solid #86efac;font-size:0.86rem;color:#0f172a;">
          <strong>Solde à transférer à la banque (sans conversion) :</strong><br>
          Banque en francs : <strong style="color:#0a6e2c;">${formatFc(summary.soldeBanqueFc)}</strong><br>
          Banque en dollars : <strong style="color:#0a6e2c;">${formatUsd(summary.soldeBanqueUsd)}</strong>
        </div>
      </div>
    `;

    host.querySelector('#form-add-dep-gen')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const motif = (host.querySelector('#dep-gen-motif')?.value || '').trim();
      const montant = Number(host.querySelector('#dep-gen-montant')?.value) || 0;
      const devise = host.querySelector('#dep-gen-devise')?.value || 'FC';

      if (!motif || montant <= 0) {
        notifyUser('Veuillez saisir le motif et le montant de la dépense générale.', 'error');
        return;
      }

      const nextDep = [
        ...(activeSeance.depensesGenerales || []),
        { id: `dgen_${Date.now()}`, motif, montant, devise }
      ];
      await persistSeance({ ...activeSeance, depensesGenerales: nextDep });
      notifyUser('Dépense générale ajoutée.', 'success');
      await render();
    });

    host.querySelectorAll('.btn-del-dep-gen').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.dataset.idx);
        const nextDep = [...(activeSeance.depensesGenerales || [])];
        nextDep.splice(idx, 1);
        await persistSeance({ ...activeSeance, depensesGenerales: nextDep });
        notifyUser('Dépense générale supprimée.', 'info');
        await render();
      });
    });
  }

  async function renderRapportTab(host, province, activeSeance) {
    if (!activeSeance) {
      host.innerHTML = `<div class="card" style="background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;"><p style="color:#334155;">Aucune séance à afficher dans le rapport.</p></div>`;
      return;
    }

    const summary = computeSeanceSummary(activeSeance);
    const depenses = Array.isArray(activeSeance.depensesGenerales)
      ? activeSeance.depensesGenerales
      : [];

    const entitesBlocksHtml = summary.entitesCalculees
      .map(({ entite, resume }, index) => {
        const nomComplet = `${index + 1}. ${entite.typeEntite || ''} —${entite.nomEntite || ''}`;

        const hasConstr = resume.constrFc > 0 || resume.constrUsd > 0;
        const hasNorm = resume.normFc > 0 || resume.normUsd > 0;
        const hasSousTotalCn = resume.sousTotalCnFc > 0 || resume.sousTotalCnUsd > 0;
        const hasTransport = resume.transportFc > 0 || resume.transportUsd > 0;

        // Afficher uniquement les rubriques nominatives qui ont au moins une offrande enregistrée
        const rubriquesEnregistreesHtml = RUBRIQUES_NOMINATIVES.filter((rub) => {
          const rInfo = resume.rubriquesResume[rub];
          return rInfo && Array.isArray(rInfo.items) && rInfo.items.length > 0;
        })
          .map((rub) => {
            const rInfo = resume.rubriquesResume[rub];
            const donateursHtml = rInfo.items
              .map(
                (it) => `
                <div style="font-size:0.75rem;color:#0f172a;padding-left:10px;">
                  • ${escapeHtml(it.donateur || 'Donateur')} : <strong>${
                  it.devise === 'USD' ? formatUsd(it.montant) : formatFc(it.montant)
                }</strong>
                </div>
              `
              )
              .join('');

            return `
              <div style="margin:6px 0;padding:6px 8px;border-radius:6px;background:#f8fafc;border:1px solid #e2e8f0;color:#0f172a;">
                <div style="font-size:0.78rem;">
                  <strong>Rubrique : ${escapeHtml(rub)}</strong> (${rInfo.count})
                </div>
                ${donateursHtml}
                <div style="font-size:0.75rem;margin-top:4px;color:#0f172a;">
                  Sous-total ${escapeHtml(rub)} : <strong>${formatFc(rInfo.fc)}</strong> • <strong>${formatUsd(rInfo.usd)}</strong>
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <div style="padding:10px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:12px;background:#ffffff;color:#0f172a;">
            <strong style="font-size:0.9rem;color:#0a6e2c;">${escapeHtml(nomComplet)}</strong>
            <div style="font-size:0.78rem;margin-top:6px;line-height:1.55;color:#0f172a;">
              ${resume.enveloppes > 0 ? `• Nombre d'enveloppes : <strong>${formatNum(resume.enveloppes)}</strong><br>` : ''}
              ${hasConstr ? `• Offrandes de construction : <strong>${formatFc(resume.constrFc)}</strong> • <strong>${formatUsd(resume.constrUsd)}</strong><br>` : ''}
              ${hasNorm ? `• Offrandes normales : <strong>${formatFc(resume.normFc)}</strong> • <strong>${formatUsd(resume.normUsd)}</strong><br>` : ''}
              ${hasSousTotalCn ? `• <strong>Sous-total (Construction + Normales) :</strong> <strong>${formatFc(resume.sousTotalCnFc)}</strong> • <strong>${formatUsd(resume.sousTotalCnUsd)}</strong><br>` : ''}
            </div>

            ${
              rubriquesEnregistreesHtml
                ? `
                <div style="margin-top:6px;">
                  <strong style="font-size:0.8rem;color:#0f172a;">Offrandes nominatives enregistrées :</strong>
                  ${rubriquesEnregistreesHtml}
                </div>
              `
                : ''
            }

            <div style="font-size:0.78rem;line-height:1.55;border-top:1px solid #cbd5e1;padding-top:6px;margin-top:6px;color:#
