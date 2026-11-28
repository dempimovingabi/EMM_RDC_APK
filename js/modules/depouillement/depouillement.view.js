// js/modules/depouillement/depouillement.view.js
// Module 4 : Dépouillement des Offrandes — EMM RD CONGO

export const TYPES_ENTITE_OFFRANDES = [
  'Centre de formation',
  'Johrei Center',
  'Unité religieuse',
  'Foyer de Lumière',
  'Noyau de salut'
];

export const PHASES_DEPOUILLEMENT = [
  'Phase 1',
  'Phase 2',
  'Phase 3',
  'Phase 4'
];

export const RUBRIQUES_OFFRANDES = [
  'Initiation',
  'Sorei Saichi',
  'Kannon',
  'Photo Sacrée',
  'Shinrei Saichi',
  'Goshintai Familial',
  'Mitamaya'
];

const STORAGE_SEANCES_KEY = 'emm_depouillements_seances_v2';
const STORAGE_LIGNES_KEY = 'emm_depouillement_lignes_v2';
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

function toFcFromUsd(usdVal, taux) {
  return (Number(usdVal) || 0) * (Number(taux) || 2800);
}

function toUsdFromFc(fcVal, taux) {
  const rate = Number(taux) || 2800;
  return rate > 0 ? (Number(fcVal) || 0) / rate : 0;
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

function computeLigneTotals(ligne, taux) {
  const rate = Number(taux) || 2800;
  const enveloppes = Math.max(0, Number(ligne.enveloppes) || 0);
  const constrFc = Math.max(0, Number(ligne.constructionFc) || 0);
  const constrUsd = Math.max(0, Number(ligne.constructionUsd) || 0);
  const normFc = Math.max(0, Number(ligne.normalesFc) || 0);
  const normUsd = Math.max(0, Number(ligne.normalesUsd) || 0);
  const transportFc = Math.max(0, Number(ligne.transportFc) || 0);

  const nominatifs = Array.isArray(ligne.nominatifs) ? ligne.nominatifs : [];
  let nomFc = 0;
  let nomUsd = 0;
  const sousTotauxRubriques = {};
  RUBRIQUES_OFFRANDES.forEach((r) => {
    sousTotauxRubriques[r] = { fc: 0, usd: 0, totalFc: 0 };
  });

  nominatifs.forEach((item) => {
    const mFc = Math.max(0, Number(item.montantFc) || 0);
    const mUsd = Math.max(0, Number(item.montantUsd) || 0);
    nomFc += mFc;
    nomUsd += mUsd;
    if (sousTotauxRubriques[item.rubrique]) {
      sousTotauxRubriques[item.rubrique].fc += mFc;
      sousTotauxRubriques[item.rubrique].usd += mUsd;
      sousTotauxRubriques[item.rubrique].totalFc += mFc + toFcFromUsd(mUsd, rate);
    }
  });

  const brutFc =
    constrFc +
    toFcFromUsd(constrUsd, rate) +
    normFc +
    toFcFromUsd(normUsd, rate) +
    nomFc +
    toFcFromUsd(nomUsd, rate);

  const brutUsd =
    constrUsd +
    toUsdFromFc(constrFc, rate) +
    normUsd +
    toUsdFromFc(normFc, rate) +
    nomUsd +
    toUsdFromFc(nomFc, rate);

  const soldeNetFc = brutFc - transportFc;
  const soldeNetUsd = toUsdFromFc(soldeNetFc, rate);

  return {
    enveloppes,
    constrFc,
    constrUsd,
    normFc,
    normUsd,
    nomFc,
    nomUsd,
    sousTotauxRubriques,
    transportFc,
    brutFc,
    brutUsd,
    soldeNetFc,
    soldeNetUsd
  };
}

export async function renderDepouillementView(container) {
  let activeTab = 'seances';
  let selectedSeanceId = '';
  let draftNominatifs = [
    {
      rubrique: RUBRIQUES_OFFRANDES[0],
      donateur: '',
      montantFc: 0,
      montantUsd: 0
    }
  ];

  const bridge = await getFirestoreBridge();
  const colSeances = bridge?.COLLECTIONS?.DEPOUILLEMENTS || 'depouillements';
  const colLignes = bridge?.COLLECTIONS?.DEPOUILLEMENT_LIGNES || 'depouillement_lignes';
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

  async function loadLignes() {
    const localList = readLocalList(STORAGE_LIGNES_KEY);
    if (!bridge) return localList.filter((l) => !l.archived);
    try {
      const remoteList = await bridge.listDocuments(colLignes);
      if (Array.isArray(remoteList) && remoteList.length > 0) {
        const map = new Map();
        localList.forEach((item) => map.set(item.id, item));
        remoteList.forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }));
        return Array.from(map.values()).filter((l) => !l.archived);
      }
    } catch (_) {}
    return localList.filter((l) => !l.archived);
  }

  async function saveSeance(record) {
    const id = record.id || `seance_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fullRecord = { ...record, id, archived: false };

    const localList = readLocalList(STORAGE_SEANCES_KEY);
    localList.unshift(fullRecord);
    writeLocalList(STORAGE_SEANCES_KEY, localList);

    if (bridge) {
      try {
        await bridge.setDocument(colSeances, id, fullRecord, { merge: true });
      } catch (_) {}
    }
    return fullRecord;
  }

  async function saveLigne(record) {
    const id = record.id || `ligne_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fullRecord = { ...record, id, archived: false };

    const localList = readLocalList(STORAGE_LIGNES_KEY);
    localList.unshift(fullRecord);
    writeLocalList(STORAGE_LIGNES_KEY, localList);

    if (bridge) {
      try {
        await bridge.setDocument(colLignes, id, fullRecord, { merge: true });
      } catch (_) {}
    }
    return fullRecord;
  }

  async function removeLigne(id) {
    const localList = readLocalList(STORAGE_LIGNES_KEY).filter((item) => item.id !== id);
    writeLocalList(STORAGE_LIGNES_KEY, localList);

    if (bridge) {
      try {
        await bridge.deleteDocument(colLignes, id);
      } catch (_) {}
    }
  }

  async function archiveSeance(seance, lignesAssociees) {
    const taux = Number(seance.taux) || 2800;
    const totalSoldeNetFc = lignesAssociees.reduce(
      (s, l) => s + computeLigneTotals(l, taux).soldeNetFc,
      0
    );

    const archivedItem = {
      id: `arch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'depouillement_offrandes',
      titre: `Séance ${seance.phase || ''} (${seance.mois || ''} ${seance.annee || ''}) — ${formatEntiteLabel(
        seance.typeEntite,
        seance.nomEntite
      )}`,
      province: seance.province || getActiveProvinceSafe(),
      annee: Number(seance.annee) || new Date().getFullYear(),
      dateArchivage: new Date().toISOString(),
      soldeNetFc: totalReposFc(totalSoldeNetFc),
      data: { seance, lignes: lignesAssociees }
    };

    const archives = readLocalList(STORAGE_ARCHIVES_KEY);
    archives.unshift(archivedItem);
    writeLocalList(STORAGE_ARCHIVES_KEY, archives);

    const localSeances = readLocalList(STORAGE_SEANCES_KEY).map((s) =>
      s.id === seance.id ? { ...s, archived: true } : s
    );
    writeLocalList(STORAGE_SEANCES_KEY, localSeances);

    if (bridge) {
      try {
        await bridge.setDocument(colArchives, archivedItem.id, archivedItem, { merge: true });
        await bridge.setDocument(colSeances, seance.id, { archived: true }, { merge: true });
      } catch (_) {}
    }
  }

  function totalReposFc(v) {
    return Number(v) || 0;
  }

  const render = async () => {
    const province = getActiveProvinceSafe();
    const [allSeances, allLignes] = await Promise.all([loadSeances(), loadLignes()]);

    const seances = allSeances.filter((s) => !s.province || s.province === province);
    if (!selectedSeanceId && seances[0]) {
      selectedSeanceId = seances[0].id;
    }

    const seanceIds = new Set(seances.map((s) => s.id));
    const lignes = allLignes.filter(
      (l) => !l.province || l.province === province || (l.seanceId && seanceIds.has(l.seanceId))
    );

    const activeSeance = seances.find((s) => s.id === selectedSeanceId) || seances[0] || null;
    const tauxCourant = Number(activeSeance?.taux) || 2800;

    const lignesActiveSeance = activeSeance
      ? lignes.filter((l) => l.seanceId === activeSeance.id)
      : lignes;

    const totauxSeance = lignesActiveSeance.reduce(
      (acc, l) => {
        const calc = computeLigneTotals(l, Number(l.taux) || tauxCourant);
        acc.enveloppes += calc.enveloppes;
        acc.brutFc += calc.brutFc;
        acc.transportFc += calc.transportFc;
        acc.soldeNetFc += calc.soldeNetFc;
        return acc;
      },
      { enveloppes: 0, brutFc: 0, transportFc: 0, soldeNetFc: 0 }
    );

    container.innerHTML = `
      <section class="module-page depouillement-page">
        <div class="page-header">
          <h2>🧾 Dépouillement des Offrandes — ${escapeHtml(province)}</h2>
        </div>

        <div class="card" style="padding:10px 14px;font-size:0.82rem;color:var(--text-muted);">
          Province : <strong style="color:var(--green-main);">${escapeHtml(province)}</strong> •
          Entités : <strong>Centre de formation, Johrei Center, Unité religieuse, Foyer de Lumière, Noyau de salut</strong>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Séances Ouvertes</div>
            <div class="kpi-value">${seances.length}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Enveloppes (Séance)</div>
            <div class="kpi-value">${formatNum(totauxSeance.enveloppes)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Transport (FC)</div>
            <div class="kpi-value">${formatFc(totauxSeance.transportFc)}</div>
          </div>
          <div class="kpi-card" style="border-left-color:#0d8a38;">
            <div class="kpi-label">Solde Net (FC)</div>
            <div class="kpi-value" style="color:#0d8a38;">${formatFc(totauxSeance.soldeNetFc)}</div>
          </div>
        </div>

        <div class="tabs-bar" role="tablist">
          <button type="button" class="tab-btn ${activeTab === 'seances' ? 'active' : ''}" data-dtab="seances">
            📂 Ouverture de Séance
          </button>
          <button type="button" class="tab-btn ${activeTab === 'saisie' ? 'active' : ''}" data-dtab="saisie">
            ✍️ Saisie par Entité (7 Rubriques)
          </button>
          <button type="button" class="tab-btn ${activeTab === 'rapports' ? 'active' : ''}" data-dtab="rapports">
            📄 Rapports de Dépouillement
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

    if (activeTab === 'seances') {
      await renderSeancesTab(host, province, seances, lignes);
    } else if (activeTab === 'saisie') {
      await renderSaisieEntiteTab(host, province, seances, activeSeance, lignesActiveSeance);
    } else {
      await renderRapportsTab(host, province, seances, activeSeance, lignes);
    }
  };

  async function renderSeancesTab(host, province, seances, lignes) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const currentYear = now.getFullYear();
    const currentMonth = now.toLocaleString('fr-FR', { month: 'long' });

    const typeOptions = TYPES_ENTITE_OFFRANDES.map(
      (t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`
    ).join('');

    const phaseOptions = PHASES_DEPOUILLEMENT.map(
      (p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`
    ).join('');

    host.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 10px;">Ouverture de Séance de Dépouillement</h3>
        <form id="form-ouvrir-seance" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;">
            <div class="form-group">
              <label for="seance-annee">Année</label>
              <input id="seance-annee" type="number" min="2020" max="2099" value="${currentYear}" required />
            </div>
            <div class="form-group">
              <label for="seance-mois">Mois</label>
              <input id="seance-mois" type="text" value="${escapeHtml(currentMonth)}" required />
            </div>
            <div class="form-group">
              <label for="seance-phase">Phase</label>
              <select id="seance-phase" required>
                ${phaseOptions}
              </select>
            </div>
            <div class="form-group">
              <label for="seance-date">Date</label>
              <input id="seance-date" type="date" value="${todayStr}" required />
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">
            <div class="form-group">
              <label for="seance-type-entite">Type d'entité</label>
              <select id="seance-type-entite" required>
                <option value="">-- Choisir le type d'entité --</option>
                ${typeOptions}
              </select>
            </div>
            <div class="form-group">
              <label for="seance-nom-entite">Nom de l'entité</label>
              <input id="seance-nom-entite" type="text" required placeholder="Ex: Kananga I" />
            </div>
            <div class="form-group">
              <label for="seance-responsable">Responsable de séance</label>
              <input id="seance-responsable" type="text" required placeholder="Nom du responsable" />
            </div>
            <div class="form-group">
              <label for="seance-taux">Taux du jour (FC / 1 USD)</label>
              <input id="seance-taux" type="number" min="1" step="1" value="2800" required />
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:6px;">
            <span class="badge">Statut initial : Ouverte</span>
            <button type="submit" class="btn-primary">➕ Ouvrir la séance</button>
          </div>
        </form>
      </div>

      <div class="card">
        <h3 style="margin:0 0 10px;">Séances Enregistrées (${seances.length})</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Séance & Phase</th>
                <th>Entité & Responsable</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                seances.length === 0
                  ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Aucune séance ouverte pour ${escapeHtml(province)}.</td></tr>`
                  : seances
                      .map((s) => {
                        const isSelected = s.id === selectedSeanceId;
                        const entiteText = formatEntiteLabel(s.typeEntite, s.nomEntite);
                        return `
                        <tr style="${isSelected ? 'background:#f0fdf4;' : ''}">
                          <td>
                            <strong>${escapeHtml(s.phase || 'Phase 1')}</strong> — ${escapeHtml(s.date || '')}
                            <br><span style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(s.mois || '')} ${escapeHtml(s.annee || '')} • ${escapeHtml(s.province || province)}</span>
                          </td>
                          <td>
                            <strong>${escapeHtml(entiteText)}</strong>
                            <br><span style="font-size:0.75rem;color:var(--text-muted);">Resp. : ${escapeHtml(s.responsable || '—')}</span>
                          </td>
                          <td><span class="badge">${escapeHtml(s.statut || 'Ouverte')}</span></td>
                          <td>
                            <div style="display:flex;gap:5px;flex-wrap:wrap;">
                              <button type="button" class="btn-primary btn-select-seance" data-id="${escapeHtml(s.id)}" style="padding:5px 8px;font-size:0.75rem;">✍️ Saisir</button>
                              <button type="button" class="btn-secondary btn-arch-seance" data-id="${escapeHtml(s.id)}" style="padding:5px 8px;font-size:0.75rem;">🗂️ Archiver</button>
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

    host.querySelector('#form-ouvrir-seance')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const annee = Number(f['seance-annee'].value) || currentYear;
      const mois = f['seance-mois'].value.trim();
      const phase = f['seance-phase'].value;
      const date = f['seance-date'].value;
      const typeEntite = f['seance-type-entite'].value;
      const nomEntite = f['seance-nom-entite'].value.trim();
      const responsable = f['seance-responsable'].value.trim();
      const taux = Math.max(1, Number(f['seance-taux'].value) || 2800);

      if (!mois || !phase || !date || !typeEntite || !nomEntite || !responsable) {
        notifyUser('Veuillez remplir tous les champs d’ouverture de séance.', 'error');
        return;
      }

      const created = await saveSeance({
        province,
        annee,
        mois,
        phase,
        date,
        typeEntite,
        nomEntite,
        responsable,
        taux,
        statut: 'Ouverte',
        createdAt: new Date().toISOString()
      });

      selectedSeanceId = created.id;
      notifyUser('Séance ouverte avec succès.', 'success');
      activeTab = 'saisie';
      await render();
    });

    host.querySelectorAll('.btn-select-seance').forEach((btn) => {
      btn.addEventListener('click', async () => {
        selectedSeanceId = btn.dataset.id;
        activeTab = 'saisie';
        await render();
      });
    });

    host.querySelectorAll('.btn-arch-seance').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const s = seances.find((item) => item.id === btn.dataset.id);
        if (!s) return;
        if (!window.confirm('Archiver cette séance et ses lignes de dépouillement ?')) return;
        const associees = lignes.filter((l) => l.seanceId === s.id);
        await archiveSeance(s, associees);
        if (selectedSeanceId === s.id) selectedSeanceId = '';
        notifyUser('Séance archivée.', 'info');
        await render();
      });
    });
  }

  async function renderSaisieEntiteTab(host, province, seances, activeSeance, lignesActiveSeance) {
    if (!activeSeance) {
      host.innerHTML = `
        <div class="card" style="text-align:center;">
          <p style="margin:0 0 10px;color:var(--text-muted);">Aucune séance n'est encore ouverte pour ${escapeHtml(province)}.</p>
          <button type="button" id="btn-go-open-seance" class="btn-primary">📂 Ouvrir une séance</button>
        </div>
      `;
      host.querySelector('#btn-go-open-seance')?.addEventListener('click', async () => {
        activeTab = 'seances';
        await render();
      });
      return;
    }

    const seanceOptions = seances
      .map(
        (s) =>
          `<option value="${escapeHtml(s.id)}" ${s.id === activeSeance.id ? 'selected' : ''}>${escapeHtml(
            `${s.phase || ''} • ${s.date || ''} • ${formatEntiteLabel(s.typeEntite, s.nomEntite)}`
          )}</option>`
      )
      .join('');

    const typeEntiteOptions = TYPES_ENTITE_OFFRANDES.map(
      (t) =>
        `<option value="${escapeHtml(t)}" ${
          t === activeSeance.typeEntite ? 'selected' : ''
        }>${escapeHtml(t)}</option>`
    ).join('');

    const rubriqueOptions = RUBRIQUES_OFFRANDES.map(
      (r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`
    ).join('');

    const nominatifsHtml = draftNominatifs
      .map(
        (row, idx) => `
        <div class="nom-row" data-idx="${idx}" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px;align-items:end;padding:8px;border:1px solid var(--border-color);border-radius:8px;background:#f9fafb;">
          <div class="form-group" style="margin-bottom:0;">
            <label>Rubrique (7)</label>
            <select class="nom-rubrique">
              ${RUBRIQUES_OFFRANDES.map(
                (r) => `<option value="${escapeHtml(r)}" ${r === row.rubrique ? 'selected' : ''}>${escapeHtml(r)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>Nom du donateur</label>
            <input type="text" class="nom-donateur" value="${escapeHtml(row.donateur || '')}" placeholder="Nom complet" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>Montant FC</label>
            <input type="number" min="0" step="1" class="nom-fc" value="${Number(row.montantFc) || 0}" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>Montant USD</label>
            <input type="number" min="0" step="0.01" class="nom-usd" value="${Number(row.montantUsd) || 0}" />
          </div>
          <div>
            ${
              draftNominatifs.length > 1
                ? `<button type="button" class="btn-icon btn-remove-nom-row" data-idx="${idx}" title="Retirer ligne">✕</button>`
                : ''
            }
          </div>
        </div>
      `
      )
      .join('');

    host.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <h3 style="margin:0;">Saisie Détaillée par Entité</h3>
          <select id="select-active-seance" aria-label="Séance active" style="max-width:300px;">
            ${seanceOptions}
          </select>
        </div>

        <form id="form-saisie-ligne" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">
            <div class="form-group">
              <label for="ligne-type-entite">Type d'entité</label>
              <select id="ligne-type-entite" required>
                ${typeEntiteOptions}
              </select>
            </div>
            <div class="form-group">
              <label for="ligne-nom-entite">Nom de l'entité</label>
              <input id="ligne-nom-entite" type="text" value="${escapeHtml(activeSeance.nomEntite || '')}" required />
            </div>
            <div class="form-group">
              <label for="ligne-enveloppes">Nombre d'enveloppes</label>
              <input id="ligne-enveloppes" type="number" min="0" value="0" required />
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;">
            <div class="form-group">
              <label for="ligne-constr-fc">Construction (FC)</label>
              <input id="ligne-constr-fc" type="number" min="0" step="1" value="0" />
            </div>
            <div class="form-group">
              <label for="ligne-constr-usd">Construction (USD)</label>
              <input id="ligne-constr-usd" type="number" min="0" step="0.01" value="0" />
            </div>
            <div class="form-group">
              <label for="ligne-norm-fc">Offrandes Normales (FC)</label>
              <input id="ligne-norm-fc" type="number" min="0" step="1" value="0" />
            </div>
            <div class="form-group">
              <label for="ligne-norm-usd">Offrandes Normales (USD)</label>
              <input id="ligne-norm-usd" type="number" min="0" step="0.01" value="0" />
            </div>
          </div>

          <div style="margin-top:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;">
              <strong style="font-size:0.86rem;">Détail Nominatif par Rubrique (7 rubriques)</strong>
              <button type="button" id="btn-add-nom-row" class="btn-secondary" style="padding:5px 10px;font-size:0.76rem;">
                ➕ Ajouter un donateur
              </button>
            </div>
            <div id="nominatifs-list" style="display:flex;flex-direction:column;gap:6px;">
              ${nominatifsHtml}
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-top:8px;">
            <div class="form-group">
              <label for="ligne-transport-fc">Dépenses de transport (FC)</label>
              <input id="ligne-transport-fc" type="number" min="0" step="1" value="0" />
            </div>
          </div>

          <div id="ligne-live-preview" style="padding:10px 12px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;font-size:0.82rem;color:#14532d;"></div>

          <button type="submit" class="btn-primary" style="margin-top:6px;">
            💾 Enregistrer la saisie de l'entité
          </button>
        </form>
      </div>

      <div class="card">
        <h3 style="margin:0 0 10px;">Lignes Saisies pour la Séance (${lignesActiveSeance.length})</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Entité & Enveloppes</th>
                <th>Construction & Normales</th>
                <th>Nominatifs / Transport / Solde Net</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                lignesActiveSeance.length === 0
                  ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Aucune ligne enregistrée pour cette séance.</td></tr>`
                  : lignesActiveSeance
                      .map((l) => {
                        const calc = computeLigneTotals(l, Number(l.taux) || Number(activeSeance.taux) || 2800);
                        const entiteLabel = formatEntiteLabel(l.typeEntite, l.nomEntite);
                        return `
                        <tr>
                          <td>
                            <strong>${escapeHtml(entiteLabel)}</strong>
                            <br><span style="font-size:0.75rem;color:var(--text-muted);">Enveloppes : ${formatNum(calc.enveloppes)}</span>
                          </td>
                          <td style="font-size:0.76rem;">
                            Constr. : <strong>${formatFc(calc.constrFc)}</strong> / <strong>${formatUsd(calc.constrUsd)}</strong><br>
                            Normales : <strong>${formatFc(calc.normFc)}</strong> / <strong>${formatUsd(calc.normUsd)}</strong>
                          </td>
                          <td style="font-size:0.76rem;">
                            Nominatifs : <strong>${formatFc(calc.nomFc)}</strong> / <strong>${formatUsd(calc.nomUsd)}</strong><br>
                            Transport : <strong>${formatFc(calc.transportFc)}</strong><br>
                            Solde net : <strong style="color:#0a6e2c;">${formatFc(calc.soldeNetFc)}</strong> (${formatUsd(calc.soldeNetUsd)})
                          </td>
                          <td>
                            <button type="button" class="btn-icon btn-del-ligne" data-id="${escapeHtml(l.id)}" title="Supprimer">🗑️</button>
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

    const syncDraftFromDom = () => {
      draftNominatifs = Array.from(host.querySelectorAll('.nom-row')).map((rowEl) => ({
        rubrique: rowEl.querySelector('.nom-rubrique')?.value || RUBRIQUES_OFFRANDES[0],
        donateur: rowEl.querySelector('.nom-donateur')?.value || '',
        montantFc: Number(rowEl.querySelector('.nom-fc')?.value) || 0,
        montantUsd: Number(rowEl.querySelector('.nom-usd')?.value) || 0
      }));
    };

    const refreshPreview = () => {
      syncDraftFromDom();
      const taux = Number(activeSeance.taux) || 2800;
      const tempLigne = {
        enveloppes: Number(host.querySelector('#ligne-enveloppes')?.value) || 0,
        constructionFc: Number(host.querySelector('#ligne-constr-fc')?.value) || 0,
        constructionUsd: Number(host.querySelector('#ligne-constr-usd')?.value) || 0,
        normalesFc: Number(host.querySelector('#ligne-norm-fc')?.value) || 0,
        normalesUsd: Number(host.querySelector('#ligne-norm-usd')?.value) || 0,
        nominatifs: draftNominatifs,
        transportFc: Number(host.querySelector('#ligne-transport-fc')?.value) || 0
      };
      const calc = computeLigneTotals(tempLigne, taux);
      const preview = host.querySelector('#ligne-live-preview');
      if (preview) {
        preview.innerHTML = `
          Sous-total nominatif : <strong>${formatFc(calc.nomFc)}</strong> + <strong>${formatUsd(calc.nomUsd)}</strong> •
          Transport : <strong>${formatFc(calc.transportFc)}</strong> •
          Solde Net : <strong style="color:#0a6e2c;">${formatFc(calc.soldeNetFc)}</strong> (${formatUsd(calc.soldeNetUsd)})
        `;
      }
      return tempLigne;
    };

    refreshPreview();

    host.querySelector('#select-active-seance')?.addEventListener('change', async (e) => {
      selectedSeanceId = e.target.value;
      await render();
    });

    host.querySelector('#btn-add-nom-row')?.addEventListener('click', async () => {
      syncDraftFromDom();
      draftNominatifs.push({
        rubrique: RUBRIQUES_OFFRANDES[0],
        donateur: '',
        montantFc: 0,
        montantUsd: 0
      });
      await render();
    });

    host.querySelectorAll('.btn-remove-nom-row').forEach((btn) => {
      btn.addEventListener('click', async () => {
        syncDraftFromDom();
        const idx = Number(btn.dataset.idx);
        draftNominatifs.splice(idx, 1);
        if (draftNominatifs.length === 0) {
          draftNominatifs.push({ rubrique: RUBRIQUES_OFFRANDES[0], donateur: '', montantFc: 0, montantUsd: 0 });
        }
        await render();
      });
    });

    host.querySelectorAll('input, select').forEach((el) => {
      if (el.id !== 'select-active-seance') {
        el.addEventListener('input', refreshPreview);
        el.addEventListener('change', refreshPreview);
      }
    });

    host.querySelector('#form-saisie-ligne')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const draftData = refreshPreview();
      const typeEntite = host.querySelector('#ligne-type-entite')?.value || activeSeance.typeEntite;
      const nomEntite = (host.querySelector('#ligne-nom-entite')?.value || '').trim();

      if (!typeEntite || !nomEntite) {
        notifyUser('Veuillez renseigner le type et le nom de l’entité.', 'error');
        return;
      }

      const taux = Number(activeSeance.taux) || 2800;
      const calc = computeLigneTotals(draftData, taux);

      await saveLigne({
        seanceId: activeSeance.id,
        province,
        typeEntite,
        nomEntite,
        taux,
        enveloppes: calc.enveloppes,
        constructionFc: calc.constrFc,
        constructionUsd: calc.constrUsd,
        normalesFc: calc.normFc,
        normalesUsd: calc.normUsd,
        nominatifs: draftData.nominatifs,
        sousTotauxRubriques: calc.sousTotauxRubriques,
        transportFc: calc.transportFc,
        brutFc: calc.brutFc,
        brutUsd: calc.brutUsd,
        soldeNetFc: calc.soldeNetFc,
        soldeNetUsd: calc.soldeNetUsd,
        createdAt: new Date().toISOString()
      });

      draftNominatifs = [{ rubrique: RUBRIQUES_OFFRANDES[0], donateur: '', montantFc: 0, montantUsd: 0 }];
      notifyUser('Saisie de l’entité enregistrée.', 'success');
      await render();
    });

    host.querySelectorAll('.btn-del-ligne').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Supprimer cette ligne de dépouillement ?')) return;
        await removeLigne(btn.dataset.id);
        notifyUser('Ligne supprimée.', 'info');
        await render();
      });
    });
  }

  async function renderRapportsTab(host, province, seances, activeSeance, lignes) {
    const taux = Number(activeSeance?.taux) || 2800;
    const lignesSeance = activeSeance
      ? lignes.filter((l) => l.seanceId === activeSeance.id)
      : lignes;

    const rubriquesCumul = {};
    RUBRIQUES_OFFRANDES.forEach((r) => {
      rubriquesCumul[r] = { fc: 0, usd: 0, totalFc: 0 };
    });

    let totalEnv = 0;
    let totalConstrFc = 0;
    let totalConstrUsd = 0;
    let totalNormFc = 0;
    let totalNormUsd = 0;
    let totalTransportFc = 0;
    let totalSoldeNetFc = 0;

    const individuRows = lignesSeance.map((l) => {
      const calc = computeLigneTotals(l, Number(l.taux) || taux);
      totalEnv += calc.enveloppes;
      totalConstrFc += calc.constrFc;
      totalConstrUsd += calc.constrUsd;
      totalNormFc += calc.normFc;
      totalNormUsd += calc.normUsd;
      totalTransportFc += calc.transportFc;
      totalSoldeNetFc += calc.soldeNetFc;

      RUBRIQUES_OFFRANDES.forEach((r) => {
        rubriquesCumul[r].fc += calc.sousTotauxRubriques[r]?.fc || 0;
        rubriquesCumul[r].usd += calc.sousTotauxRubriques[r]?.usd || 0;
        rubriquesCumul[r].totalFc += calc.sousTotauxRubriques[r]?.totalFc || 0;
      });

      return {
        id: l.id,
        entiteLabel: formatEntiteLabel(l.typeEntite, l.nomEntite),
        enveloppes: calc.enveloppes,
        brutFc: calc.brutFc,
        transportFc: calc.transportFc,
        soldeNetFc: calc.soldeNetFc,
        soldeNetUsd: calc.soldeNetUsd
      };
    });

    host.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 8px;">Relevé Global de Séance — ${escapeHtml(province)}</h3>
        ${
          activeSeance
            ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:10px;">
                Séance : <strong>${escapeHtml(activeSeance.phase || '')}</strong> (${escapeHtml(activeSeance.date || '')}) •
                Statut : <strong>${escapeHtml(activeSeance.statut || 'Ouverte')}</strong> •
                Taux : <strong>${formatNum(taux)} FC / $</strong>
               </div>`
            : `<p style="color:var(--text-muted);">Consolidation globale sur ${seances.length} séance(s).</p>`
        }
        <div style="font-size:0.82rem;line-height:1.6;">
          • Enveloppes : <strong>${formatNum(totalEnv)}</strong><br>
          • Construction : <strong>${formatFc(totalConstrFc)}</strong> & <strong>${formatUsd(totalConstrUsd)}</strong><br>
          • Offrandes Normales : <strong>${formatFc(totalNormFc)}</strong> & <strong>${formatUsd(totalNormUsd)}</strong><br>
          • Dépenses de transport : <strong>${formatFc(totalTransportFc)}</strong><br>
          • Solde Net Consolidé : <strong style="color:#0a6e2c;">${formatFc(totalSoldeNetFc)}</strong> (${formatUsd(toUsdFromFc(totalSoldeNetFc, taux))})
        </div>

        <div class="table-responsive" style="margin-top:10px;">
          <table>
            <thead>
              <tr>
                <th>Rubrique (7)</th>
                <th>Sous-total FC</th>
                <th>Sous-total USD</th>
                <th>Total Éq. FC</th>
              </tr>
            </thead>
            <tbody>
              ${RUBRIQUES_OFFRANDES.map(
                (r) => `
                <tr>
                  <td><strong>${escapeHtml(r)}</strong></td>
                  <td>${formatFc(rubriquesCumul[r].fc)}</td>
                  <td>${formatUsd(rubriquesCumul[r].usd)}</td>
                  <td><strong>${formatFc(rubriquesCumul[r].totalFc)}</strong></td>
                </tr>
              `
              ).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h3 style="margin:0 0 8px;">Relevé Individuel par Entité (Solde Net après Transport)</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Entité</th>
                <th>Brut (FC)</th>
                <th>Transport (FC)</th>
                <th>Solde Net (FC / USD)</th>
              </tr>
            </thead>
            <tbody>
              ${
                individuRows.length === 0
                  ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Aucune ligne à restituer.</td></tr>`
                  : individuRows
                      .map(
                        (row) => `
                        <tr>
                          <td><strong>${escapeHtml(row.entiteLabel)}</strong></td>
                          <td>${formatFc(row.brutFc)}</td>
                          <td style="color:#b45309;">${formatFc(row.transportFc)}</td>
                          <td>
                            <strong style="color:#0a6e2c;">${formatFc(row.soldeNetFc)}</strong>
                            <br><span style="font-size:0.75rem;color:var(--text-muted);">${formatUsd(row.soldeNetUsd)}</span>
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
  }

  await render();
}
