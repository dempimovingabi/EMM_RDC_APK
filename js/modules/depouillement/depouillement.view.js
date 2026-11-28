// js/modules/depouillement/depouillement.view.js
// Module Dépouillement — EMM RD CONGO

export const TYPES_ENTITE_DEPOUILLEMENT = [
  'Centre de Formation',
  'Johrei Center',
  'Unité religieuse',
  'Foyer de lumière',
  'Noyau de salut'
];

export const RUBRIQUES_DEPOUILLEMENT = [
  'Offrande ordinaire',
  'Dîme',
  'Action de grâce',
  'Johrei / Mission',
  'Construction / Entretien',
  'Œuvres sociales',
  'Autres offrandes'
];

const STORAGE_DEPOUILLEMENT_KEY = 'emm_depouillement_seances_v1';
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

function formatUsd(val) {
  return `${(Number(val) || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} $`;
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

export async function renderDepouillementView(container) {
  let activeTab = 'saisie';
  let filterTypeEntite = 'ALL';

  const bridge = await getFirestoreBridge();

  async function loadSeances() {
    const localList = readLocalList(STORAGE_DEPOUILLEMENT_KEY);
    if (!bridge || !bridge.COLLECTIONS?.DEPOUILLEMENTS) {
      return localList.filter((s) => !s.archived);
    }
    try {
      const remoteList = await bridge.listDocuments(bridge.COLLECTIONS.DEPOUILLEMENTS);
      if (Array.isArray(remoteList) && remoteList.length > 0) {
        const map = new Map();
        localList.forEach((item) => map.set(item.id, item));
        remoteList.forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }));
        return Array.from(map.values()).filter((s) => !s.archived);
      }
    } catch (_) {}
    return localList.filter((s) => !s.archived);
  }

  async function saveSeance(record) {
    const id = record.id || `dep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fullRecord = { ...record, id, archived: false };

    const localList = readLocalList(STORAGE_DEPOUILLEMENT_KEY);
    localList.unshift(fullRecord);
    writeLocalList(STORAGE_DEPOUILLEMENT_KEY, localList);

    if (bridge && bridge.COLLECTIONS?.DEPOUILLEMENTS) {
      try {
        await bridge.setDocument(bridge.COLLECTIONS.DEPOUILLEMENTS, id, fullRecord, {
          merge: true
        });
      } catch (_) {}
    }
    return fullRecord;
  }

  async function archiveSeance(seance) {
    const archivedItem = {
      id: `arch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'depouillement',
      titre: `Dépouillement ${seance.date || ''} — ${formatEntiteLabel(
        seance.typeEntite,
        seance.nomEntite
      )}`,
      province: seance.province || getActiveProvinceSafe(),
      annee: Number(String(seance.date || '').slice(0, 4)) || new Date().getFullYear(),
      dateArchivage: new Date().toISOString(),
      totalUsd: Number(seance.totalUsd) || 0,
      data: seance
    };

    const archives = readLocalList(STORAGE_ARCHIVES_KEY);
    archives.unshift(archivedItem);
    writeLocalList(STORAGE_ARCHIVES_KEY, archives);

    const localList = readLocalList(STORAGE_DEPOUILLEMENT_KEY).map((item) =>
      item.id === seance.id ? { ...item, archived: true } : item
    );
    writeLocalList(STORAGE_DEPOUILLEMENT_KEY, localList);

    if (bridge) {
      try {
        if (bridge.COLLECTIONS?.ARCHIVES) {
          await bridge.setDocument(bridge.COLLECTIONS.ARCHIVES, archivedItem.id, archivedItem, {
            merge: true
          });
        }
        if (bridge.COLLECTIONS?.DEPOUILLEMENTS) {
          await bridge.setDocument(
            bridge.COLLECTIONS.DEPOUILLEMENTS,
            seance.id,
            { archived: true },
            { merge: true }
          );
        }
      } catch (_) {}
    }
  }

  async function removeSeance(id) {
    const localList = readLocalList(STORAGE_DEPOUILLEMENT_KEY).filter((item) => item.id !== id);
    writeLocalList(STORAGE_DEPOUILLEMENT_KEY, localList);

    if (bridge && bridge.COLLECTIONS?.DEPOUILLEMENTS) {
      try {
        await bridge.deleteDocument(bridge.COLLECTIONS.DEPOUILLEMENTS, id);
      } catch (_) {}
    }
  }

  const render = async () => {
    const province = getActiveProvinceSafe();
    const allSeances = await loadSeances();
    const seances = allSeances.filter((s) => !s.province || s.province === province);

    const totalUsdAll = seances.reduce((s, item) => s + (Number(item.totalUsd) || 0), 0);
    const totalUsdSaisieUsd = seances.reduce(
      (s, item) => s + (Number(item.totalSaisiUsd) || 0),
      0
    );
    const totalUsdSaisiFc = seances.reduce(
      (s, item) =>
        s + toUsd(item.totalSaisiFc || 0, 'FC', item.taux || 2800),
      0
    );

    container.innerHTML = `
      <section class="module-page depouillement-page">
        <div class="page-header">
          <h2>🧾 Dépouillement — ${escapeHtml(province)}</h2>
        </div>

        <div class="card" style="padding:10px 14px;font-size:0.82rem;color:var(--text-muted);">
          Province active : <strong style="color:var(--green-main);">${escapeHtml(province)}</strong> •
          Entités : <strong>Centre de Formation, Johrei Center, Unité religieuse, Foyer de lumière, Noyau de salut</strong>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Séances Enregistrées</div>
            <div class="kpi-value">${seances.length}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Part Saisie en USD</div>
            <div class="kpi-value">${formatUsd(totalUsdSaisieUsd)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Part Saisie en FC (éq. $)</div>
            <div class="kpi-value">${formatUsd(totalUsdSaisiFc)}</div>
          </div>
          <div class="kpi-card" style="border-left-color:#0d8a38;">
            <div class="kpi-label">Total Général (USD)</div>
            <div class="kpi-value" style="color:#0d8a38;">${formatUsd(totalUsdAll)}</div>
          </div>
        </div>

        <div class="tabs-bar" role="tablist">
          <button type="button" class="tab-btn ${activeTab === 'saisie' ? 'active' : ''}" data-dtab="saisie">
            ✍️ Nouvelle Séance (7 Rubriques)
          </button>
          <button type="button" class="tab-btn ${activeTab === 'historique' ? 'active' : ''}" data-dtab="historique">
            📋 Séances & Synthèse
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

    if (activeTab === 'saisie') {
      await renderSaisieTab(host, province);
    } else {
      await renderHistoriqueTab(host, province, seances);
    }
  };

  async function renderSaisieTab(host, province) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const typeOptionsHtml = TYPES_ENTITE_DEPOUILLEMENT.map(
      (t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`
    ).join('');

    const rubriquesRowsHtml = RUBRIQUES_DEPOUILLEMENT.map(
      (rub, idx) => `
      <tr>
        <td><strong>${escapeHtml(rub)}</strong></td>
        <td>
          <input
            type="number"
            step="0.01"
            min="0"
            value="0"
            class="dep-usd-input"
            data-idx="${idx}"
            aria-label="${escapeHtml(rub)} en USD"
            style="width:100%;max-width:110px;padding:5px 7px;border-radius:6px;border:1px solid var(--border-color);"
          />
        </td>
        <td>
          <input
            type="number"
            step="1"
            min="0"
            value="0"
            class="dep-fc-input"
            data-idx="${idx}"
            aria-label="${escapeHtml(rub)} en FC"
            style="width:100%;max-width:125px;padding:5px 7px;border-radius:6px;border:1px solid var(--border-color);"
          />
        </td>
      </tr>
    `
    ).join('');

    host.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 10px;">Comptage des 7 Rubriques (USD & FC)</h3>
        <form id="form-depouillement" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">
            <div class="form-group">
              <label for="dep-date">Date de la séance</label>
              <input id="dep-date" type="date" value="${todayStr}" required />
            </div>
            <div class="form-group">
              <label for="dep-type-entite">Type d'entité</label>
              <select id="dep-type-entite" required>
                <option value="">-- Choisir le type d'entité --</option>
                ${typeOptionsHtml}
              </select>
            </div>
            <div class="form-group">
              <label for="dep-nom-entite">Nom de l'entité</label>
              <input id="dep-nom-entite" type="text" required placeholder="Ex: Kananga I" />
            </div>
            <div class="form-group">
              <label for="dep-taux">Taux du jour (FC / 1 USD)</label>
              <input id="dep-taux" type="number" step="1" min="1" value="2800" required />
            </div>
          </div>

          <div class="table-responsive" style="margin-top:8px;">
            <table>
              <thead>
                <tr>
                  <th>Rubrique (7)</th>
                  <th>Montant USD ($)</th>
                  <th>Montant FC</th>
                </tr>
              </thead>
              <tbody>
                ${rubriquesRowsHtml}
              </tbody>
            </table>
          </div>

          <div id="dep-live-totals" style="margin-top:10px;padding:10px 12px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;font-size:0.84rem;color:#14532d;">
            Total USD : <strong>0,00 $</strong> • Total FC : <strong>0 FC</strong> •
            Équivalent Total : <strong>0,00 $</strong>
          </div>

          <div class="form-group" style="margin-top:8px;">
            <label for="dep-obs">Procès-verbal / Observations (optionnel)</label>
            <input id="dep-obs" type="text" placeholder="Ex: Commission de comptage validée" />
          </div>

          <button type="submit" class="btn-primary" style="margin-top:6px;">
            💾 Enregistrer la séance de dépouillement
          </button>
        </form>
      </div>
    `;

    const computeLiveTotals = () => {
      const taux = Number(host.querySelector('#dep-taux')?.value) || 2800;
      let sumUsd = 0;
      let sumFc = 0;

      host.querySelectorAll('.dep-usd-input').forEach((inp) => {
        sumUsd += Math.max(0, Number(inp.value) || 0);
      });
      host.querySelectorAll('.dep-fc-input').forEach((inp) => {
        sumFc += Math.max(0, Number(inp.value) || 0);
      });

      const eqTotalUsd = sumUsd + toUsd(sumFc, 'FC', taux);
      const box = host.querySelector('#dep-live-totals');
      if (box) {
        box.innerHTML = `
          Total USD : <strong>${formatUsd(sumUsd)}</strong> •
          Total FC : <strong>${formatNum(sumFc)} FC</strong> •
          Équivalent Total : <strong style="color:#0a6e2c;">${formatUsd(eqTotalUsd)}</strong>
        `;
      }
      return { sumUsd, sumFc, eqTotalUsd, taux };
    };

    host.querySelectorAll('.dep-usd-input, .dep-fc-input, #dep-taux').forEach((el) => {
      el.addEventListener('input', computeLiveTotals);
    });

    host.querySelector('#form-depouillement')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const date = f['dep-date'].value;
      const typeEntite = f['dep-type-entite'].value;
      const nomEntite = f['dep-nom-entite'].value.trim();
      const obs = f['dep-obs'].value.trim();

      if (!date || !typeEntite || !nomEntite) {
        notifyUser('Veuillez renseigner la date, le type d’entité et le nom de l’entité.', 'error');
        return;
      }

      const usdInputs = Array.from(host.querySelectorAll('.dep-usd-input'));
      const fcInputs = Array.from(host.querySelectorAll('.dep-fc-input'));
      const { sumUsd, sumFc, eqTotalUsd, taux } = computeLiveTotals();

      const rubriques = RUBRIQUES_DEPOUILLEMENT.map((label, idx) => {
        const mUsd = Math.max(0, Number(usdInputs[idx]?.value) || 0);
        const mFc = Math.max(0, Number(fcInputs[idx]?.value) || 0);
        return {
          rubrique: label,
          montantUsd: mUsd,
          montantFc: mFc,
          totalUsd: mUsd + toUsd(mFc, 'FC', taux)
        };
      });

      await saveSeance({
        date,
        typeEntite,
        nomEntite,
        taux,
        rubriques,
        totalSaisiUsd: sumUsd,
        totalSaisiFc: sumFc,
        totalUsd: eqTotalUsd,
        obs,
        province,
        createdAt: new Date().toISOString()
      });

      notifyUser('Séance de dépouillement enregistrée.', 'success');
      activeTab = 'historique';
      await render();
    });
  }

  async function renderHistoriqueTab(host, province, seances) {
    const filtered =
      filterTypeEntite === 'ALL'
        ? seances
        : seances.filter((s) => s.typeEntite === filterTypeEntite);

    host.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <h3 style="margin:0;">Séances de Dépouillement (${filtered.length})</h3>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <select id="filter-dep-type" aria-label="Filtrer par type d'entité" style="max-width:205px;">
              <option value="ALL" ${filterTypeEntite === 'ALL' ? 'selected' : ''}>Toutes les entités (5)</option>
              ${TYPES_ENTITE_DEPOUILLEMENT.map(
                (t) => `<option value="${escapeHtml(t)}" ${filterTypeEntite === t ? 'selected' : ''}>${escapeHtml(t)}</option>`
              ).join('')}
            </select>
            <button type="button" id="btn-export-dep-csv" class="btn-secondary">📥 Exporter CSV</button>
          </div>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date & Entité</th>
                <th>Détail USD / FC</th>
                <th>Total (USD)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                filtered.length === 0
                  ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Aucune séance enregistrée.</td></tr>`
                  : filtered
                      .map((s) => {
                        const entiteLabel = formatEntiteLabel(s.typeEntite, s.nomEntite);
                        return `
                        <tr>
                          <td>
                            <strong>${escapeHtml(s.date || '')}</strong>
                            <br><span style="font-size:0.76rem;color:var(--text-muted);">Entité : ${escapeHtml(entiteLabel)}</span>
                            ${s.obs ? `<br><span style="font-size:0.72rem;color:#4b5563;">${escapeHtml(s.obs)}</span>` : ''}
                          </td>
                          <td style="font-size:0.78rem;">
                            USD : <strong>${formatUsd(s.totalSaisiUsd)}</strong><br>
                            FC : <strong>${formatNum(s.totalSaisiFc)} FC</strong> (taux ${formatNum(s.taux || 2800)})
                          </td>
                          <td><strong style="color:#0a6e2c;">${formatUsd(s.totalUsd)}</strong></td>
                          <td>
                            <div style="display:flex;gap:5px;flex-wrap:wrap;">
                              <button type="button" class="btn-secondary btn-arch-dep" data-id="${escapeHtml(s.id)}" style="padding:5px 8px;font-size:0.75rem;">🗂️ Archiver</button>
                              <button type="button" class="btn-icon btn-del-dep" data-id="${escapeHtml(s.id)}" title="Supprimer">🗑️</button>
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

    host.querySelector('#filter-dep-type')?.addEventListener('change', async (e) => {
      filterTypeEntite = e.target.value;
      await render();
    });

    host.querySelectorAll('.btn-arch-dep').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const item = seances.find((s) => s.id === btn.dataset.id);
        if (!item) return;
        if (!window.confirm(`Archiver la séance du ${item.date || ''} ?`)) return;
        await archiveSeance(item);
        notifyUser('Séance archivée.', 'info');
        await render();
      });
    });

    host.querySelectorAll('.btn-del-dep').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Supprimer cette séance de dépouillement ?')) return;
        await removeSeance(btn.dataset.id);
        notifyUser('Séance supprimée.', 'info');
        await render();
      });
    });

    host.querySelector('#btn-export-dep-csv')?.addEventListener('click', () => {
      const headers = [
        'Date',
        'Type Entite',
        'Nom Entite',
        'Province',
        'Total Saisi USD',
        'Total Saisi FC',
        'Taux',
        'Total Equivalent USD'
      ];
      const lines = [headers.join(';')];
      filtered.forEach((s) => {
        lines.push(
          [
            `"${String(s.date || '').replace(/"/g, '""')}"`,
            `"${String(s.typeEntite || '').replace(/"/g, '""')}"`,
            `"${String(s.nomEntite || '').replace(/"/g, '""')}"`,
            `"${String(province).replace(/"/g, '""')}"`,
            (Number(s.totalSaisiUsd) || 0).toFixed(2),
            (Number(s.totalSaisiFc) || 0).toFixed(0),
            Number(s.taux) || 2800,
            (Number(s.totalUsd) || 0).toFixed(2)
          ].join(';')
        );
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DEPOUILLEMENT_${province}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notifyUser('Export CSV effectué.', 'success');
    });
  }

  await render();
}
