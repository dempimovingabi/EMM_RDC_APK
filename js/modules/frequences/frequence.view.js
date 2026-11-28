// js/modules/frequences/frequences.view.js
// Module Fréquences — EMM RD CONGO

export const TYPES_ENTITE_FREQ = [
  'Centre de Formation',
  'Johrei Center',
  'Unité religieuse',
  'Foyer de lumière',
  'Noyau de salut'
];

const STORAGE_DIFF_KEY = 'emm_freq_diffusion_v1';
const STORAGE_SUITE_KEY = 'emm_freq_suite_v1';
const STORAGE_NUM_KEY = 'emm_freq_numerique_v1';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNum(val) {
  return (Number(val) || 0).toLocaleString('fr-FR');
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
  console.log('[EMM Fréquences]', msg);
}

export async function renderFrequencesView(container) {
  let activeTab = 'diffusion';
  let filterTypeEntite = 'ALL';

  const bridge = await getFirestoreBridge();

  async function loadList(localKey, fsCollectionKey) {
    const localList = readLocalList(localKey);
    if (!bridge || !bridge.COLLECTIONS?.[fsCollectionKey]) return localList;
    try {
      const remoteList = await bridge.listDocuments(bridge.COLLECTIONS[fsCollectionKey]);
      if (Array.isArray(remoteList) && remoteList.length > 0) {
        const map = new Map();
        localList.forEach((item) => map.set(item.id, item));
        remoteList.forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }));
        return Array.from(map.values());
      }
    } catch (_) {}
    return localList;
  }

  async function saveRecord(localKey, fsCollectionKey, record) {
    const id = record.id || `freq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fullRecord = { ...record, id };

    const localList = readLocalList(localKey);
    localList.unshift(fullRecord);
    writeLocalList(localKey, localList);

    if (bridge && bridge.COLLECTIONS?.[fsCollectionKey]) {
      try {
        await bridge.setDocument(bridge.COLLECTIONS[fsCollectionKey], id, fullRecord, {
          merge: true
        });
      } catch (_) {}
    }
    return fullRecord;
  }

  async function removeRecord(localKey, fsCollectionKey, id) {
    const localList = readLocalList(localKey).filter((item) => item.id !== id);
    writeLocalList(localKey, localList);

    if (bridge && bridge.COLLECTIONS?.[fsCollectionKey]) {
      try {
        await bridge.deleteDocument(bridge.COLLECTIONS[fsCollectionKey], id);
      } catch (_) {}
    }
  }

  const render = async () => {
    const province = getActiveProvinceSafe();

    const [diffAll, suiteAll, numAll] = await Promise.all([
      loadList(STORAGE_DIFF_KEY, 'FREQ_DIFFUSION'),
      loadList(STORAGE_SUITE_KEY, 'FREQ_SUITE'),
      loadList(STORAGE_NUM_KEY, 'FREQ_NUMERIQUE')
    ]);

    const diffList = diffAll.filter((r) => !r.province || r.province === province);
    const suiteList = suiteAll.filter((r) => !r.province || r.province === province);
    const numList = numAll.filter((r) => !r.province || r.province === province);

    const sumMb = diffList.reduce((s, r) => s + (Number(r.mb) || 0), 0);
    const sumSy = diffList.reduce((s, r) => s + (Number(r.sy) || 0), 0);
    const sumNv = diffList.reduce((s, r) => s + (Number(r.nv) || 0), 0);
    const sumTotal = sumMb + sumSy + sumNv;

    const typeOptionsHtml = TYPES_ENTITE_FREQ.map(
      (t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`
    ).join('');

    container.innerHTML = `
      <section class="module-page frequences-page">
        <div class="page-header">
          <h2>📊 Fréquences — ${escapeHtml(province)}</h2>
        </div>

        <div class="card" style="padding:10px 14px;font-size:0.82rem;color:var(--text-muted);">
          Province active : <strong style="color:var(--green-main);">${escapeHtml(province)}</strong> •
          Entités : <strong>Centre de Formation, Johrei Center, Unité religieuse, Foyer de lumière, Noyau de salut</strong>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Membres (MB)</div>
            <div class="kpi-value">${formatNum(sumMb)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Sympathisants (SY)</div>
            <div class="kpi-value">${formatNum(sumSy)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Nouveaux Venus (NV)</div>
            <div class="kpi-value">${formatNum(sumNv)}</div>
          </div>
          <div class="kpi-card" style="border-left-color:#0d8a38;">
            <div class="kpi-label">Total Diffusion</div>
            <div class="kpi-value" style="color:#0d8a38;">${formatNum(sumTotal)}</div>
          </div>
        </div>

        <div class="tabs-bar" role="tablist">
          <button type="button" class="tab-btn ${activeTab === 'diffusion' ? 'active' : ''}" data-ftab="diffusion">
            📡 Diffusion
          </button>
          <button type="button" class="tab-btn ${activeTab === 'suite' ? 'active' : ''}" data-ftab="suite">
            🔁 Diffusion suite
          </button>
          <button type="button" class="tab-btn ${activeTab === 'numerique' ? 'active' : ''}" data-ftab="numerique">
            💻 Numérique
          </button>
          <button type="button" class="tab-btn ${activeTab === 'synthese' ? 'active' : ''}" data-ftab="synthese">
            📈 Synthèse nationale
          </button>
        </div>

        <div id="freq-tab-host"></div>
      </section>
    `;

    container.querySelectorAll('[data-ftab]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        activeTab = btn.dataset.ftab;
        await render();
      });
    });

    const host = container.querySelector('#freq-tab-host');
    if (!host) return;

    if (activeTab === 'diffusion') {
      await renderEffectifTab(
        host,
        province,
        diffList,
        typeOptionsHtml,
        'Enregistrer une Diffusion',
        'Historique des Diffusions',
        STORAGE_DIFF_KEY,
        'FREQ_DIFFUSION'
      );
    } else if (activeTab === 'suite') {
      await renderEffectifTab(
        host,
        province,
        suiteList,
        typeOptionsHtml,
        'Enregistrer une Diffusion suite',
        'Historique des Diffusions suite',
        STORAGE_SUITE_KEY,
        'FREQ_SUITE'
      );
    } else if (activeTab === 'numerique') {
      await renderNumeriqueTab(host, province, numList, typeOptionsHtml);
    } else if (activeTab === 'synthese') {
      renderSyntheseTab(host, province, diffAll, suiteAll, numAll);
    }
  };

  async function renderEffectifTab(
    host,
    province,
    records,
    typeOptionsHtml,
    formTitle,
    listTitle,
    storageKey,
    fsCollectionKey
  ) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const filtered =
      filterTypeEntite === 'ALL'
        ? records
        : records.filter((r) => r.typeEntite === filterTypeEntite);

    host.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 10px;">${escapeHtml(formTitle)}</h3>
        <form id="form-freq-effectif" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">
            <div class="form-group">
              <label for="freq-date">Date</label>
              <input id="freq-date" type="date" value="${todayStr}" required />
            </div>
            <div class="form-group">
              <label for="freq-type-entite">Type d'entité</label>
              <select id="freq-type-entite" required>
                <option value="">-- Choisir le type d'entité --</option>
                ${typeOptionsHtml}
              </select>
            </div>
            <div class="form-group">
              <label for="freq-nom-entite">Nom de l'entité</label>
              <input id="freq-nom-entite" type="text" required placeholder="Ex: Kananga I" />
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            <div class="form-group">
              <label for="freq-mb">Membres (MB)</label>
              <input id="freq-mb" type="number" min="0" value="0" required />
            </div>
            <div class="form-group">
              <label for="freq-sy">Sympathisants (SY)</label>
              <input id="freq-sy" type="number" min="0" value="0" required />
            </div>
            <div class="form-group">
              <label for="freq-nv">Nouveaux Venus (NV)</label>
              <input id="freq-nv" type="number" min="0" value="0" required />
            </div>
          </div>

          <button type="submit" class="btn-primary">💾 Enregistrer les effectifs</button>
        </form>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <h3 style="margin:0;">${escapeHtml(listTitle)} (${filtered.length})</h3>
          <select id="filter-freq-type" aria-label="Filtrer par type d'entité" style="max-width:210px;">
            <option value="ALL" ${filterTypeEntite === 'ALL' ? 'selected' : ''}>Toutes les entités (5)</option>
            ${TYPES_ENTITE_FREQ.map(
              (t) => `<option value="${escapeHtml(t)}" ${filterTypeEntite === t ? 'selected' : ''}>${escapeHtml(t)}</option>`
            ).join('')}
          </select>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date & Entité</th>
                <th>MB / SY / NV</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                filtered.length === 0
                  ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Aucun enregistrement pour le moment.</td></tr>`
                  : filtered
                      .map((r) => {
                        const mb = Number(r.mb) || 0;
                        const sy = Number(r.sy) || 0;
                        const nv = Number(r.nv) || 0;
                        const total = mb + sy + nv;
                        const entiteLabel = [r.typeEntite, r.nomEntite].filter(Boolean).join(' — ');
                        return `
                        <tr>
                          <td>
                            <strong>${escapeHtml(r.date || '')}</strong>
                            <br><span style="font-size:0.76rem;color:var(--text-muted);">Entité : ${escapeHtml(entiteLabel || '—')}</span>
                          </td>
                          <td style="font-size:0.8rem;">
                            MB : <strong>${formatNum(mb)}</strong> • SY : <strong>${formatNum(sy)}</strong> • NV : <strong>${formatNum(nv)}</strong>
                          </td>
                          <td><strong style="color:#0a6e2c;">${formatNum(total)}</strong></td>
                          <td>
                            <button type="button" class="btn-icon btn-del-freq" data-id="${escapeHtml(r.id)}" title="Supprimer">🗑️</button>
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

    host.querySelector('#filter-freq-type')?.addEventListener('change', async (e) => {
      filterTypeEntite = e.target.value;
      await render();
    });

    host.querySelector('#form-freq-effectif')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const date = f['freq-date'].value;
      const typeEntite = f['freq-type-entite'].value;
      const nomEntite = f['freq-nom-entite'].value.trim();
      const mb = Math.max(0, Number(f['freq-mb'].value) || 0);
      const sy = Math.max(0, Number(f['freq-sy'].value) || 0);
      const nv = Math.max(0, Number(f['freq-nv'].value) || 0);

      if (!date || !typeEntite || !nomEntite) {
        notifyUser('Veuillez renseigner la date, le type d’entité et le nom de l’entité.', 'error');
        return;
      }

      await saveRecord(storageKey, fsCollectionKey, {
        date,
        typeEntite,
        nomEntite,
        mb,
        sy,
        nv,
        total: mb + sy + nv,
        province,
        createdAt: new Date().toISOString()
      });

      notifyUser('Effectifs enregistrés.', 'success');
      await render();
    });

    host.querySelectorAll('.btn-del-freq').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Supprimer cet enregistrement ?')) return;
        await removeRecord(storageKey, fsCollectionKey, btn.dataset.id);
        notifyUser('Enregistrement supprimé.', 'info');
        await render();
      });
    });
  }

  async function renderNumeriqueTab(host, province, numList, typeOptionsHtml) {
    const todayStr = new Date().toISOString().slice(0, 10);

    host.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 10px;">💻 Enregistrer une Participation Numérique</h3>
        <form id="form-freq-num" class="form-stack">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">
            <div class="form-group">
              <label for="num-date">Date</label>
              <input id="num-date" type="date" value="${todayStr}" required />
            </div>
            <div class="form-group">
              <label for="num-type-entite">Type d'entité</label>
              <select id="num-type-entite" required>
                <option value="">-- Choisir le type d'entité --</option>
                ${typeOptionsHtml}
              </select>
            </div>
            <div class="form-group">
              <label for="num-nom-entite">Nom de l'entité</label>
              <input id="num-nom-entite" type="text" required placeholder="Ex: Kananga I" />
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">
            <div class="form-group">
              <label for="num-canal">Canal / Support numérique</label>
              <input id="num-canal" type="text" required placeholder="Ex: YouTube / Zoom / WhatsApp" />
            </div>
            <div class="form-group">
              <label for="num-effectif">Nombre de participants</label>
              <input id="num-effectif" type="number" min="0" value="0" required />
            </div>
          </div>

          <button type="submit" class="btn-primary">💾 Enregistrer la participation numérique</button>
        </form>
      </div>

      <div class="card">
        <h3 style="margin:0 0 10px;">Participations Numériques (${numList.length})</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date & Entité</th>
                <th>Canal</th>
                <th>Effectif</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                numList.length === 0
                  ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Aucune participation numérique enregistrée.</td></tr>`
                  : numList
                      .map((r) => {
                        const entiteLabel = [r.typeEntite, r.nomEntite].filter(Boolean).join(' — ');
                        return `
                        <tr>
                          <td>
                            <strong>${escapeHtml(r.date || '')}</strong>
                            <br><span style="font-size:0.76rem;color:var(--text-muted);">Entité : ${escapeHtml(entiteLabel || '—')}</span>
                          </td>
                          <td>${escapeHtml(r.canal || '')}</td>
                          <td><strong style="color:#0a6e2c;">${formatNum(r.effectif)}</strong></td>
                          <td>
                            <button type="button" class="btn-icon btn-del-num" data-id="${escapeHtml(r.id)}" title="Supprimer">🗑️</button>
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

    host.querySelector('#form-freq-num')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const date = f['num-date'].value;
      const typeEntite = f['num-type-entite'].value;
      const nomEntite = f['num-nom-entite'].value.trim();
      const canal = f['num-canal'].value.trim();
      const effectif = Math.max(0, Number(f['num-effectif'].value) || 0);

      if (!date || !typeEntite || !nomEntite || !canal) {
        notifyUser('Veuillez remplir tous les champs numériques.', 'error');
        return;
      }

      await saveRecord(STORAGE_NUM_KEY, 'FREQ_NUMERIQUE', {
        date,
        typeEntite,
        nomEntite,
        canal,
        effectif,
        province,
        createdAt: new Date().toISOString()
      });

      notifyUser('Participation numérique enregistrée.', 'success');
      await render();
    });

    host.querySelectorAll('.btn-del-num').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Supprimer cette participation numérique ?')) return;
        await removeRecord(STORAGE_NUM_KEY, 'FREQ_NUMERIQUE', btn.dataset.id);
        notifyUser('Participation supprimée.', 'info');
        await render();
      });
    });
  }

  function renderSyntheseTab(host, province, diffAll, suiteAll, numAll) {
    const byType = TYPES_ENTITE_FREQ.map((typeEntite) => {
      const items = diffAll.filter(
        (r) => (!r.province || r.province === province) && r.typeEntite === typeEntite
      );
      const mb = items.reduce((s, r) => s + (Number(r.mb) || 0), 0);
      const sy = items.reduce((s, r) => s + (Number(r.sy) || 0), 0);
      const nv = items.reduce((s, r) => s + (Number(r.nv) || 0), 0);
      return { typeEntite, mb, sy, nv, total: mb + sy + nv };
    });

    const suiteProvince = suiteAll.filter((r) => !r.province || r.province === province);
    const numProvince = numAll.filter((r) => !r.province || r.province === province);
    const totalSuite = suiteProvince.reduce(
      (s, r) => s + (Number(r.mb) || 0) + (Number(r.sy) || 0) + (Number(r.nv) || 0),
      0
    );
    const totalNum = numProvince.reduce((s, r) => s + (Number(r.effectif) || 0), 0);

    host.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <h3 style="margin:0;">Synthèse par Type d'Entité — ${escapeHtml(province)}</h3>
          <button type="button" id="btn-export-freq-csv" class="btn-secondary">📥 Exporter CSV</button>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Type d'entité</th>
                <th>MB</th>
                <th>SY</th>
                <th>NV</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${byType
                .map(
                  (row) => `
                  <tr>
                    <td><strong>${escapeHtml(row.typeEntite)}</strong></td>
                    <td>${formatNum(row.mb)}</td>
                    <td>${formatNum(row.sy)}</td>
                    <td>${formatNum(row.nv)}</td>
                    <td><strong style="color:#0a6e2c;">${formatNum(row.total)}</strong></td>
                  </tr>
                `
                )
                .join('')}
            </tbody>
          </table>
        </div>

        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border-color);font-size:0.84rem;">
          Total Diffusion suite (${escapeHtml(province)}) : <strong>${formatNum(totalSuite)}</strong> •
          Total Numérique (${escapeHtml(province)}) : <strong>${formatNum(totalNum)}</strong>
        </div>
      </div>
    `;

    host.querySelector('#btn-export-freq-csv')?.addEventListener('click', () => {
      const headers = ['Type Entite', 'Province', 'MB', 'SY', 'NV', 'Total'];
      const lines = [headers.join(';')];
      byType.forEach((row) => {
        lines.push(
          [
            `"${String(row.typeEntite).replace(/"/g, '""')}"`,
            `"${String(province).replace(/"/g, '""')}"`,
            row.mb,
            row.sy,
            row.nv,
            row.total
          ].join(';')
        );
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FREQUENCES_${province}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notifyUser('Synthèse CSV exportée.', 'success');
    });
  }

  await render();
}

