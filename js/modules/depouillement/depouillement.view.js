// js/modules/depouillement/depouillement.view.js
// Module Dépouillement des Offrandes (Séance multi-entités, nominatifs, transport, dépenses générales & banque)

export const TYPES_ENTITE_OFFRANDES = [
  'Centre de Formation',
  'Johrei Center',
  'Unité religieuse',
  'Foyer de lumière',
  'Noyau de salut'
];

export const RUBRIQUES_NOMINATIVES = [
  'Initiation',
  'Réinitiation',
  'Shoku',
  'Kannon',
  'Photo sacrée',
  'Goshintai familial',
  'Mitamaya'
];

const STORAGE_SEANCES_KEY = 'emm_depouillement_seances_v3';
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

function toFc(montant, devise, taux) {
  const v = Number(montant) || 0;
  const r = Number(taux) || 2800;
  return devise === 'USD' ? v * r : v;
}

function toUsd(montant, devise, taux) {
  const v = Number(montant) || 0;
  const r = Number(taux) || 2800;
  if (devise === 'USD') return v;
  return r > 0 ? v / r : 0;
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
        background:${type === 'error' ? '#991b1b' : type === 'success' ? '#0a6e2c' : '#1e293b'};
        color:#ffffff;padding:10px 14px;border-radius:8px;margin-top:6px;
        font-size:0.84rem;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,0.2);
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
    typeEntite,
    nomEntite,
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

function computeEntiteSummary(entite, taux) {
  const r = Number(taux) || 2800;
  const enveloppes = Math.max(0, Number(entite.enveloppes) || 0);
  const constrFc = Math.max(0, Number(entite.constructionFc) || 0);
  const constrUsd = Math.max(0, Number(entite.constructionUsd) || 0);
  const normFc = Math.max(0, Number(entite.normalesFc) || 0);
  const normUsd = Math.max(0, Number(entite.normalesUsd) || 0);

  // 1. Sous-total Offrandes de construction + Offrandes normales
  const sousTotalCnFc = constrFc + normFc;
  const sousTotalCnUsd = constrUsd + normUsd;

  // 2. Sous-totaux par rubrique nominative
  const rubriquesResume = {};
  let totalNomFc = 0;
  let totalNomUsd = 0;

  RUBRIQUES_NOMINATIVES.forEach((rub) => {
    const entries = Array.isArray(entite.nominatifsParRubrique?.[rub])
      ? entite.nominatifsParRubrique[rub]
      : [];
    let rubFc = 0;
    let rubUsd = 0;
    entries.forEach((item) => {
      const m = Math.max(0, Number(item.montant) || 0);
      if (item.devise === 'USD') {
        rubUsd += m;
      } else {
        rubFc += m;
      }
    });
    rubriquesResume[rub] = {
      count: entries.length,
      fc: rubFc,
      usd: rubUsd
    };
    totalNomFc += rubFc;
    totalNomUsd += rubUsd;
  });

  // 3. Total des sous-totaux de l'entité
  const totalSousTotauxFc = sousTotalCnFc + totalNomFc;
  const totalSousTotauxUsd = sousTotalCnUsd + totalNomUsd;

  // 4. Dépense de transport
  const transportFc = Math.max(0, Number(entite.transportFc) || 0);
  const transportUsd = Math.max(0, Number(entite.transportUsd) || 0);

  // 5. Solde de l'entité = Total des sous-totaux - Dépense de transport
  const soldeFc = totalSousTotauxFc - transportFc;
  const soldeUsd = totalSousTotauxUsd - transportUsd;

  const soldeEquivalentFc = soldeFc + toFc(soldeUsd, 'USD', r);
  const soldeEquivalentUsd = toUsd(soldeFc, 'FC', r) + soldeUsd;

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
    soldeUsd,
    soldeEquivalentFc,
    soldeEquivalentUsd
  };
}

function computeSeanceSummary(seance) {
  const r = Number(seance.taux) || 2800;
  const entites = Array.isArray(seance.entites) ? seance.entites : [];
  const depensesGenerales = Array.isArray(seance.depensesGenerales)
    ? seance.depensesGenerales
    : [];

  let totalSoldesEntitesFc = 0;
  let totalSoldesEntitesUsd = 0;
  let totalSoldesEquivalentFc = 0;

  const entitesCalculees = entites.map((ent) => {
    const resume = computeEntiteSummary(ent, r);
    totalSoldesEntitesFc += resume.soldeFc;
    totalSoldesEntitesUsd += resume.soldeUsd;
    totalSoldesEquivalentFc += resume.soldeEquivalentFc;
    return { entite: ent, resume };
  });

  let totalDepGenFc = 0;
  let totalDepGenUsd = 0;
  let totalDepGenEquivalentFc = 0;

  depensesGenerales.forEach((d) => {
    const m = Math.max(0, Number(d.montant) || 0);
    if (d.devise === 'USD') {
      totalDepGenUsd += m;
      totalDepGenEquivalentFc += toFc(m, 'USD', r);
    } else {
      totalDepGenFc += m;
      totalDepGenEquivalentFc += m;
    }
  });

  // Solde à transférer à la banque = Total des soldes des entités - Total des dépenses générales
  const soldeBanqueFc = totalSoldesEntitesFc - totalDepGenFc;
  const soldeBanqueUsd = totalSoldesEntitesUsd - totalDepGenUsd;
  const soldeBanqueEquivalentFc = totalSoldesEquivalentFc - totalDepGenEquivalentFc;
  const soldeBanqueEquivalentUsd = toUsd(soldeBanqueEquivalentFc, 'FC', r);

  return {
    entitesCalculees,
    totalSoldesEntitesFc,
    totalSoldesEntitesUsd,
    totalSoldesEquivalentFc,
    totalSoldesEquivalentUsd: toUsd(totalSoldesEquivalentFc, 'FC', r),
    totalDepGenFc,
    totalDepGenUsd,
    totalDepGenEquivalentFc,
    soldeBanqueFc,
    soldeBanqueUsd,
    soldeBanqueEquivalentFc,
    soldeBanqueEquivalentUsd
  };
}

export async function renderDepouillementView(container) {
  let activeTab = 'seance';
  let selectedSeanceId = '';
  let selectedEntiteId = '';
  let activeRubriqueNom = RUBRIQUES_NOMINATIVES[0];

  const bridge = await getFirestoreBridge();
  const colSeances = bridge?.COLLECTIONS?.DEPOUILLEMENTS || 'depouillements';
  const colArchives = bridge?.COLLECTIONS?.ARCHIVES || 'archives';

  async function loadSeances() {
    const localList = readLocalList(STORAGE_SEANCES_KEY);
    if (!bridge) return localList.filter((s) => !s.archived);
    try {
      const remoteList = await bridge.listDocuments(colSeances);
      if (Array.isArray(remoteList) && remoteList.length > 0) {
        const map = new Map();
        localList.forEach((item) => map.set(item.id, item));
        remoteList.forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }));
        return Array.from(map.values()).filter((s) => !s.archived);
      }
    } catch (_) {}
    return localList.filter((s) => !s.archived);
  }

  async function persistSeance(seance) {
    const id = seance.id || `seance_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const full = { ...seance, id, archived: false };

    const localList = readLocalList(STORAGE_SEANCES_KEY);
    const idx = localList.findIndex((s) => s.id === id);
    if (idx >= 0) {
      localList[idx] = { ...localList[idx], ...full };
    } else {
      localList.unshift(full);
    }
    writeLocalList(STORAGE_SEANCES_KEY, localList);

    if (bridge) {
      try {
        await bridge.setDocument(colSeances, id, full, { merge: true });
      } catch (_) {}
    }
    return full;
  }

  async function archiveSeance(seance) {
    const summary = computeSeanceSummary(seance);
    const archivedItem = {
      id: `arch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'depouillement_seance',
      titre: `Dépouillement ${seance.mois || ''} ${seance.annee || ''} (${seance.phase || ''})`,
      province: seance.province || getActiveProvinceSafe(),
      annee: Number(seance.annee) || new Date().getFullYear(),
      dateArchivage: new Date().toISOString(),
      soldeBanqueEquivalentFc: summary.soldeBanqueEquivalentFc,
      data: seance
    };

    const archives = readLocalList(STORAGE_ARCHIVES_KEY);
    archives.unshift(archivedItem);
    writeLocalList(STORAGE_ARCHIVES_KEY, archives);

    const localList = readLocalList(STORAGE_SEANCES_KEY).map((s) =>
      s.id === seance.id ? { ...s, archived: true } : s
    );
    writeLocalList(STORAGE_SEANCES_KEY, localList);

    if (bridge) {
      try {
        await bridge.setDocument(colArchives, archivedItem.id, archivedItem, { merge: true });
        await bridge.setDocument(colSeances, seance.id, { archived: true }, { merge: true });
      } catch (_) {}
    }
  }

  const render = async () => {
    const province = getActiveProvinceSafe();
    const allSeances = await loadSeances();
    const seances = allSeances.filter((s) => !s.province || s.province === province);

    if (!selectedSeanceId && seances[0]) {
      selectedSeanceId = seances[0].id;
    }

    const activeSeance = seances.find((s) => s.id === selectedSeanceId) || seances[0] || null;
    if (activeSeance && !selectedEntiteId && Array.isArray(activeSeance.entites) && activeSeance.entites[0]) {
      selectedEntiteId = activeSeance.entites[0].id;
    }

    const summary = activeSeance ? computeSeanceSummary(activeSeance) : null;

    container.innerHTML = `
      <section class="module-page depouillement-page">
        <div class="page-header">
          <h2>🧾 Dépouillement — ${escapeHtml(province)}</h2>
        </div>

        <div class="card" style="padding:10px 14px;font-size:0.82rem;color:var(--text-muted);">
          Province : <strong style="color:var(--green-main);">${escapeHtml(province)}</strong> •
          Entités : <strong>Centre de Formation, Johrei Center, Unité religieuse, Foyer de lumière, Noyau de salut</strong>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Entités dans la Séance</div>
            <div class="kpi-value">${summary ? summary.entitesCalculees.length : 0}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Soldes Entités</div>
            <div class="kpi-value">${summary ? formatFc(summary.totalSoldesEquivalentFc) : '0 FC'}</div>
          </div>
          <div class="kpi-card" style="border-left-color:#b45309;">
            <div class="kpi-label">Dépenses Générales</div>
            <div class="kpi-value" style="color:#b45309;">${summary ? formatFc(summary.totalDepGenEquivalentFc) : '0 FC'}</div>
          </div>
          <div class="kpi-card" style="border-left-color:#0d8a38;">
            <div class="kpi-label">Solde à Transférer (Banque)</div>
            <div class="kpi-value" style="color:#0d8a38;">${summary ? formatFc(summary.soldeBanqueEquivalentFc) : '0 FC'}</div>
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

        <div id="dep-tab-host"></div>
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
      await renderSaisieEntiteTab(host, province, seances, activeSeance);
    } else if (activeTab === 'depenses') {
      await renderDepensesGeneralesTab(host, province, seances, activeSeance);
    } else {
      await renderRapportTab(host, province, seances, activeSeance);
    }
  };

  async function renderSeanceTab(host, province, seances, activeSeance) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.toLocaleString('fr-FR', { month: 'long' });
    const todayStr = now.toISOString().slice(0, 10);

    const seanceOptions = seances
      .map(
        (s) =>
          `<option value="${escapeHtml(s.id)}" ${
            activeSeance && s.id === activeSeance.id ? 'selected' : ''
          }>${escapeHtml(`${s.mois || ''} ${s.annee || ''} — ${s.phase || ''} (${s.date || ''})`)}</option>`
      )
      .join('');

    const typeOptions = TYPES_ENTITE_OFFRANDES.map(
      (t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`
    ).join('');

    const currentSummary = activeSeance ? computeSeanceSummary(activeSeance) : null;

    host.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 10px;">Ouvrir une Séance de Dépouillement (Toutes Entités)</h3>
        <form id="form-new-seance" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;">
            <div class="form-group">
              <label for="s-mois">Mois</label>
              <input id="s-mois" type="text" value="${escapeHtml(currentMonth)}" required placeholder="Ex: novembre" />
            </div>
            <div class="form-group">
              <label for="s-annee">Année</label>
              <input id="s-annee" type="number" min="2020" max="2099" value="${currentYear}" required />
            </div>
            <div class="form-group">
              <label for="s-phase">Phase</label>
              <input id="s-phase" type="text" value="Phase 1" required placeholder="Ex: Phase 1" />
            </div>
            <div class="form-group">
              <label for="s-date">Date</label>
              <input id="s-date" type="date" value="${todayStr}" required />
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;">
            <div class="form-group">
              <label for="s-responsable">Responsable de séance</label>
              <input id="s-responsable" type="text" required placeholder="Nom du responsable" />
            </div>
            <div class="form-group">
              <label for="s-taux">Taux du jour (FC pour 1 USD)</label>
              <input id="s-taux" type="number" min="1" step="1" value="2800" required />
            </div>
          </div>

          <button type="submit" class="btn-primary">➕ Créer la séance de dépouillement</button>
        </form>
      </div>

      ${
        activeSeance
          ? `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
              <h3 style="margin:0;">Séance active : ${escapeHtml(activeSeance.mois || '')} ${escapeHtml(activeSeance.annee || '')}</h3>
              <select id="select-seance-courante" aria-label="Sélectionner une séance" style="max-width:260px;">
                ${seanceOptions}
              </select>
            </div>

            <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;">
              Phase : <strong>${escapeHtml(activeSeance.phase || '')}</strong> •
              Date : <strong>${escapeHtml(activeSeance.date || '')}</strong> •
              Responsable : <strong>${escapeHtml(activeSeance.responsable || '—')}</strong> •
              Taux : <strong>${formatNum(activeSeance.taux || 2800)} FC/$</strong>
            </div>

            <form id="form-add-entite-seance" class="form-stack" style="padding:10px;border:1px solid var(--border-color);border-radius:8px;background:#f9fafb;margin-bottom:12px;">
              <strong style="font-size:0.84rem;">Ajouter une entité à cette séance</strong>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label for="new-ent-type">Type d'entité</label>
                  <select id="new-ent-type" required>
                    ${typeOptions}
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label for="new-ent-nom">Nom de l'entité</label>
                  <input id="new-ent-nom" type="text" required placeholder="Ex: Kananga I" />
                </div>
              </div>
              <button type="submit" class="btn-secondary">➕ Ajouter l'entité à la séance</button>
            </form>

            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Entité</th>
                    <th>Total Sous-totaux</th>
                    <th>Transport</th>
                    <th>Solde Entité</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    currentSummary.entitesCalculees.length === 0
                      ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Ajoutez les entités concernées par cette séance.</td></tr>`
                      : currentSummary.entitesCalculees
                          .map(({ entite, resume }) => {
                            const label = `${entite.typeEntite || ''} — ${entite.nomEntite || ''}`;
                            return `
                            <tr>
                              <td><strong>${escapeHtml(label)}</strong></td>
                              <td style="font-size:0.78rem;">
                                ${formatFc(resume.totalSousTotauxFc)}<br>
                                <span style="color:var(--text-muted);">${formatUsd(resume.totalSousTotauxUsd)}</span>
                              </td>
                              <td style="font-size:0.78rem;color:#b45309;">
                                ${formatFc(resume.transportFc)}<br>
                                <span style="color:var(--text-muted);">${formatUsd(resume.transportUsd)}</span>
                              </td>
                              <td style="font-size:0.78rem;">
                                <strong style="color:#0a6e2c;">${formatFc(resume.soldeFc)}</strong><br>
                                <span style="color:var(--text-muted);">${formatUsd(resume.soldeUsd)}</span>
                              </td>
                              <td>
                                <button type="button" class="btn-primary btn-open-entite" data-id="${escapeHtml(entite.id)}" style="padding:5px 8px;font-size:0.75rem;">
                                  ✍️ Saisir
                                </button>
                              </td>
                            </tr>
                          `;
                          })
                          .join('')
                  }
                </tbody>
              </table>
            </div>

            <div style="display:flex;justify-content:flex-end;margin-top:12px;">
              <button type="button" id="btn-archive-seance" class="btn-secondary">🗂️ Archiver la séance</button>
            </div>
          </div>
        `
          : ''
      }
    `;

    host.querySelector('#form-new-seance')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const mois = f['s-mois'].value.trim();
      const annee = Number(f['s-annee'].value) || currentYear;
      const phase = f['s-phase'].value.trim();
      const date = f['s-date'].value;
      const responsable = f['s-responsable'].value.trim();
      const taux = Math.max(1, Number(f['s-taux'].value) || 2800);

      if (!mois || !phase || !date || !responsable) {
        notifyUser('Veuillez renseigner tous les champs de la séance.', 'error');
        return;
      }

      const created = await persistSeance({
        province,
        mois,
        annee,
        phase,
        date,
        responsable,
        taux,
        statut: 'Ouverte',
        entites: [],
        depensesGenerales: [],
        createdAt: new Date().toISOString()
      });

      selectedSeanceId = created.id;
      selectedEntiteId = '';
      notifyUser('Séance de dépouillement créée.', 'success');
      await render();
    });

    host.querySelector('#select-seance-courante')?.addEventListener('change', async (e) => {
      selectedSeanceId = e.target.value;
      selectedEntiteId = '';
      await render();
    });

    host.querySelector('#form-add-entite-seance')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeSeance) return;
      const typeEntite = host.querySelector('#new-ent-type')?.value || TYPES_ENTITE_OFFRANDES[0];
      const nomEntite = (host.querySelector('#new-ent-nom')?.value || '').trim();
      if (!nomEntite) {
        notifyUser("Veuillez indiquer le nom de l'entité.", 'error');
        return;
      }

      const newEnt = createEmptyEntiteEntry(typeEntite, nomEntite);
      const updatedSeance = {
        ...activeSeance,
        entites: [...(activeSeance.entites || []), newEnt]
      };
      await persistSeance(updatedSeance);
      selectedEntiteId = newEnt.id;
      notifyUser('Entité ajoutée à la séance.', 'success');
      activeTab = 'saisie';
      await render();
    });

    host.querySelectorAll('.btn-open-entite').forEach((btn) => {
      btn.addEventListener('click', async () => {
        selectedEntiteId = btn.dataset.id;
        activeTab = 'saisie';
        await render();
      });
    });

    host.querySelector('#btn-archive-seance')?.addEventListener('click', async () => {
      if (!activeSeance) return;
      if (!window.confirm('Archiver cette séance de dépouillement ?')) return;
      await archiveSeance(activeSeance);
      selectedSeanceId = '';
      selectedEntiteId = '';
      notifyUser('Séance archivée.', 'info');
      await render();
    });
  }

  async function renderSaisieEntiteTab(host, province, seances, activeSeance) {
    if (!activeSeance || !Array.isArray(activeSeance.entites) || activeSeance.entites.length === 0) {
      host.innerHTML = `
        <div class="card" style="text-align:center;">
          <p style="margin:0 0 10px;color:var(--text-muted);">
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
      activeSeance.entites.find((e) => e.id === selectedEntiteId) || activeSeance.entites[0];
    selectedEntiteId = currentEntite.id;

    const taux = Number(activeSeance.taux) || 2800;
    const resume = computeEntiteSummary(currentEntite, taux);

    const entiteSelectorHtml = activeSeance.entites
      .map(
        (e) =>
          `<option value="${escapeHtml(e.id)}" ${
            e.id === currentEntite.id ? 'selected' : ''
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
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <h3 style="margin:0;">Comptage Entité — ${escapeHtml(activeSeance.mois || '')} ${escapeHtml(activeSeance.annee || '')}</h3>
          <select id="select-entite-saisie" aria-label="Choisir l'entité" style="max-width:260px;">
            ${entiteSelectorHtml}
          </select>
        </div>

        <!-- Étape 1 à 4 : Enveloppes, Construction, Normales, Sous-total -->
        <form id="form-entite-bases" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;">
            <div class="form-group">
              <label for="ent-env">1. Nombre d'enveloppes</label>
              <input id="ent-env" type="number" min="0" value="${resume.enveloppes}" />
            </div>
            <div class="form-group">
              <label for="ent-constr-fc">2. Construction (FC)</label>
              <input id="ent-constr-fc" type="number" min="0" step="1" value="${resume.constrFc}" />
            </div>
            <div class="form-group">
              <label for="ent-constr-usd">2. Construction (USD)</label>
              <input id="ent-constr-usd" type="number" min="0" step="0.01" value="${resume.constrUsd}" />
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;">
            <div class="form-group">
              <label for="ent-norm-fc">3. Offrandes Normales (FC)</label>
              <input id="ent-norm-fc" type="number" min="0" step="1" value="${resume.normFc}" />
            </div>
            <div class="form-group">
              <label for="ent-norm-usd">3. Offrandes Normales (USD)</label>
              <input id="ent-norm-usd" type="number" min="0" step="0.01" value="${resume.normUsd}" />
            </div>
          </div>

          <div style="padding:8px 12px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;font-size:0.8rem;color:#14532d;">
            <strong>4. Sous-total (Construction + Normales) :</strong>
            <strong>${formatFc(resume.sousTotalCnFc)}</strong> et <strong>${formatUsd(resume.sousTotalCnUsd)}</strong>
          </div>

          <button type="submit" class="btn-secondary">💾 Enregistrer Enveloppes, Construction & Normales</button>
        </form>
      </div>

      <!-- Étape 5 : Offrandes Nominatives par Rubrique + Sous-totaux FC & USD -->
      <div class="card">
        <h3 style="margin:0 0 8px;">5. Offrandes Nominatives par Rubrique</h3>
        <div class="tabs-bar" style="flex-wrap:wrap;gap:6px;margin-bottom:10px;">
          ${rubTabsHtml}
        </div>

        <form id="form-add-nominatif" class="form-stack" style="margin-bottom:10px;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;">
            <div class="form-group">
              <label for="nom-donateur">Nom du donateur (${escapeHtml(activeRubriqueNom)})</label>
              <input id="nom-donateur" type="text" required placeholder="Nom complet" />
            </div>
            <div class="form-group">
              <label for="nom-montant">Montant</label>
              <input id="nom-montant" type="number" min="0.01" step="0.01" required placeholder="0" />
            </div>
            <div class="form-group">
              <label for="nom-devise">Devise</label>
              <select id="nom-devise">
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
                <th>Donateur</th>
                <th>Montant</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                currentRubList.length === 0
                  ? `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">Aucune offrande nominative pour ${escapeHtml(activeRubriqueNom)}.</td></tr>`
                  : currentRubList
                      .map(
                        (item, idx) => `
                        <tr>
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

        <div style="margin-top:10px;padding:8px 12px;border-radius:8px;background:#f8fafc;border:1px solid var(--border-color);font-size:0.8rem;">
          <strong>Sous-total ${escapeHtml(activeRubriqueNom)} :</strong>
          <strong>${formatFc(currentRubResume.fc)}</strong> • <strong>${formatUsd(currentRubResume.usd)}</strong>
        </div>
      </div>

      <!-- Étape 6 à 8 : Total des sous-totaux, Transport, Solde de l'entité -->
      <div class="card">
        <h3 style="margin:0 0 8px;">6 à 8. Total des Sous-totaux, Transport & Solde de l'Entité</h3>
        <div style="font-size:0.82rem;margin-bottom:10px;">
          <strong>6. Total des sous-totaux :</strong>
          <strong>${formatFc(resume.totalSousTotauxFc)}</strong> • <strong>${formatUsd(resume.totalSousTotauxUsd)}</strong>
        </div>

        <form id="form-entite-transport" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;">
            <div class="form-group">
              <label for="ent-trans-fc">7. Dépense de transport (FC)</label>
              <input id="ent-trans-fc" type="number" min="0" step="1" value="${resume.transportFc}" />
            </div>
            <div class="form-group">
              <label for="ent-trans-usd">7. Dépense de transport (USD)</label>
              <input id="ent-trans-usd" type="number" min="0" step="0.01" value="${resume.transportUsd}" />
            </div>
          </div>
          <button type="submit" class="btn-secondary">💾 Enregistrer la dépense de transport</button>
        </form>

        <div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:#ecfdf5;border:1px solid #a7f3d0;font-size:0.84rem;color:#065f46;">
          <strong>8. Solde de l'entité (Total sous-totaux − Transport) :</strong><br>
          En FC : <strong>${formatFc(resume.soldeFc)}</strong> • En USD : <strong>${formatUsd(resume.soldeUsd)}</strong>
        </div>
      </div>
    `;

    host.querySelector('#select-entite-saisie')?.addEventListener('change', async (e) => {
      selectedEntiteId = e.target.value;
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
        ent.id === currentEntite.id
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
        if (ent.id !== currentEntite.id) return ent;
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
          if (ent.id !== currentEntite.id) return ent;
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
        ent.id === currentEntite.id ? { ...ent, transportFc, transportUsd } : ent
      );
      await persistSeance({ ...activeSeance, entites: updatedEntites });
      notifyUser('Dépense de transport enregistrée.', 'success');
      await render();
    });
  }

  async function renderDepensesGeneralesTab(host, province, seances, activeSeance) {
    if (!activeSeance) {
      host.innerHTML = `<div class="card"><p style="color:var(--text-muted);">Aucune séance active.</p></div>`;
      return;
    }

    const summary = computeSeanceSummary(activeSeance);
    const depenses = Array.isArray(activeSeance.depensesGenerales)
      ? activeSeance.depensesGenerales
      : [];

    host.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 8px;">Total des Soldes des Entités & Dépenses Générales</h3>
        <div style="font-size:0.82rem;margin-bottom:10px;">
          <strong>Total des soldes des entités :</strong>
          <strong>${formatFc(summary.totalSoldesEquivalentFc)}</strong>
          (${formatFc(summary.totalSoldesEntitesFc)} • ${formatUsd(summary.totalSoldesEntitesUsd)})
        </div>

        <form id="form-add-dep-gen" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">
            <div class="form-group">
              <label for="dep-gen-motif">Motif de la dépense générale</label>
              <input id="dep-gen-motif" type="text" required placeholder="Ex: Location salle / Fournitures" />
            </div>
            <div class="form-group">
              <label for="dep-gen-montant">Montant</label>
              <input id="dep-gen-montant" type="number" min="0.01" step="0.01" required placeholder="0" />
            </div>
            <div class="form-group">
              <label for="dep-gen-devise">Devise</label>
              <select id="dep-gen-devise">
                <option value="FC">FC (Francs)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
          <button type="submit" class="btn-primary">➕ Ajouter une dépense générale</button>
        </form>
      </div>

      <div class="card">
        <h3 style="margin:0 0 8px;">Liste des Dépenses Générales (${depenses.length})</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Motif</th>
                <th>Montant</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                depenses.length === 0
                  ? `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">Aucune dépense générale enregistrée.</td></tr>`
                  : depenses
                      .map(
                        (d, idx) => `
                        <tr>
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

        <div style="margin-top:12px;padding:10px 12px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;font-size:0.86rem;color:#14532d;">
          <strong>Solde à transférer à la banque (Total soldes entités − Total dépenses générales) :</strong><br>
          Équivalent FC : <strong style="color:#0a6e2c;">${formatFc(summary.soldeBanqueEquivalentFc)}</strong> •
          Équivalent USD : <strong style="color:#0a6e2c;">${formatUsd(summary.soldeBanqueEquivalentUsd)}</strong>
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

  async function renderRapportTab(host, province, seances, activeSeance) {
    if (!activeSeance) {
      host.innerHTML = `<div class="card"><p style="color:var(--text-muted);">Aucune séance à afficher dans le rapport.</p></div>`;
      return;
    }

    const summary = computeSeanceSummary(activeSeance);
    const depenses = Array.isArray(activeSeance.depensesGenerales)
      ? activeSeance.depensesGenerales
      : [];

    const entitesBlocksHtml = summary.entitesCalculees
      .map(({ entite, resume }) => {
        const nomComplet = `${entite.typeEntite || ''} — ${entite.nomEntite || ''}`;
        const rubDetails = RUBRIQUES_NOMINATIVES.map((rub) => {
          const rInfo = resume.rubriquesResume[rub] || { count: 0, fc: 0, usd: 0 };
          return `<li>${escapeHtml(rub)} (${rInfo.count}) : <strong>${formatFc(rInfo.fc)}</strong> • <strong>${formatUsd(rInfo.usd)}</strong></li>`;
        }).join('');

        return `
          <div style="padding:10px;border:1px solid var(--border-color);border-radius:8px;margin-bottom:10px;background:#fff;">
            <strong style="font-size:0.88rem;color:var(--green-main);">${escapeHtml(nomComplet)}</strong>
            <div style="font-size:0.78rem;margin-top:4px;line-height:1.55;">
              • Enveloppes : <strong>${formatNum(resume.enveloppes)}</strong><br>
              • Offrandes de construction : <strong>${formatFc(resume.constrFc)}</strong> • <strong>${formatUsd(resume.constrUsd)}</strong><br>
              • Offrandes normales : <strong>${formatFc(resume.normFc)}</strong> • <strong>${formatUsd(resume.normUsd)}</strong><br>
              • <strong>Sous-total (Construction + Normales) :</strong> <strong>${formatFc(resume.sousTotalCnFc)}</strong> • <strong>${formatUsd(resume.sousTotalCnUsd)}</strong>
            </div>
            <ul style="margin:6px 0;padding-left:18px;font-size:0.76rem;">
              ${rubDetails}
            </ul>
            <div style="font-size:0.78rem;line-height:1.55;border-top:1px dashed var(--border-color);padding-top:6px;">
              • <strong>Total des sous-totaux :</strong> <strong>${formatFc(resume.totalSousTotauxFc)}</strong> • <strong>${formatUsd(resume.totalSousTotauxUsd)}</strong><br>
              • Dépense de transport : <strong style="color:#b45309;">${formatFc(resume.transportFc)}</strong> • <strong style="color:#b45309;">${formatUsd(resume.transportUsd)}</strong><br>
              • <strong>Solde de l'entité :</strong> <strong style="color:#0a6e2c;">${formatFc(resume.soldeFc)}</strong> • <strong style="color:#0a6e2c;">${formatUsd(resume.soldeUsd)}</strong>
            </div>
          </div>
        `;
      })
      .join('');

    const depensesRowsHtml =
      depenses.length === 0
        ? `<tr><td colspan="2" style="text-align:center;color:var(--text-muted);">Aucune dépense générale enregistrée.</td></tr>`
        : depenses
            .map(
              (d) => `
              <tr>
                <td><strong>${escapeHtml(d.motif || '')}</strong></td>
                <td>${d.devise === 'USD' ? `<strong>${formatUsd(d.montant)}</strong>` : `<strong>${formatFc(d.montant)}</strong>`}</td>
              </tr>
            `
            )
            .join('');

    host.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 6px;">Rapport de Dépouillement — ${escapeHtml(activeSeance.mois || '')} ${escapeHtml(activeSeance.annee || '')}</h3>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;">
          Province : <strong>${escapeHtml(province)}</strong> •
          Phase : <strong>${escapeHtml(activeSeance.phase || '')}</strong> •
          Date : <strong>${escapeHtml(activeSeance.date || '')}</strong> •
          Responsable : <strong>${escapeHtml(activeSeance.responsable || '—')}</strong>
        </div>

        ${entitesBlocksHtml || '<p style="color:var(--text-muted);">Aucune entité saisie.</p>'}

        <div style="padding:10px 12px;border-radius:8px;background:#f8fafc;border:1px solid var(--border-color);font-size:0.84rem;margin-bottom:12px;">
          <strong>Total des soldes des entités :</strong>
          <strong>${formatFc(summary.totalSoldesEquivalentFc)}</strong> (${formatUsd(summary.totalSoldesEquivalentUsd)})
        </div>

        <h4 style="margin:0 0 8px;">Dépenses Générales (Motif & Montant)</h4>
        <div class="table-responsive" style="margin-bottom:12px;">
          <table>
            <thead>
              <tr>
                <th>Motif</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              ${depensesRowsHtml}
            </tbody>
          </table>
        </div>

        <div style="padding:12px;border-radius:8px;background:#ecfdf5;border:1px solid #a7f3d0;font-size:0.88rem;color:#065f46;">
          <strong>Solde à transférer à la banque :</strong><br>
          <strong>${formatFc(summary.soldeBanqueEquivalentFc)}</strong> (${formatUsd(summary.soldeBanqueEquivalentUsd)})
        </div>
      </div>
    `;
  }

  await render();
}
