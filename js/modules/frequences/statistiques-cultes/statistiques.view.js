// js/modules/frequences/statistiques-cultes/statistiques.view.js
// Sous-module Statistiques Nationales des Cultes & Cartographie (EMM-FREQUENCE-STATISTIQUES) — EMM RD CONGO

import { COLLECTIONS, ENTITY_TYPES, PROVINCES_RDC, PROVINCE_UNCLASSIFIED } from '../../../config/constants.js';
import { loadLocalData, saveLocalData } from '../../../services/local-db.service.js';
import { setDocument } from '../../../services/firestore.service.js';
import { syncService } from '../../../services/sync.service.js';
import { exporterCSV } from '../../../services/export.service.js';
import { isAppOnline } from '../../../core/online-status.js';
import { openModal } from '../../../ui/modal.js';
import { showToast } from '../../../ui/toast.js';
import { openOfficialPrintDialog } from '../../../ui/print-dialog.js';
import { escapeHTML, formatNumberFr } from '../../../utils/dom.js';

function getCulteState() {
  const db = loadLocalData();
  return db.culteNational;
}

async function persistCulteState(culteState, notifyToast = false) {
  culteState.updatedAt = new Date().toISOString();
  const db = loadLocalData();
  db.culteNational = culteState;
  saveLocalData(db);

  const docId = culteState.culteDate ? `culte_${culteState.culteDate}` : 'culte_courant';
  const payload = {
    culteDate: culteState.culteDate || '',
    provinces: culteState.provinces,
    updatedAt: culteState.updatedAt
  };

  if (isAppOnline()) {
    try {
      await setDocument(COLLECTIONS.FREQ_CULTE_NATIONAL, docId, payload);
    } catch (err) {
      syncService.enqueue({ collection: COLLECTIONS.FREQ_CULTE_NATIONAL, docId, payload });
    }
  } else {
    syncService.enqueue({ collection: COLLECTIONS.FREQ_CULTE_NATIONAL, docId, payload });
  }

  if (notifyToast) {
    showToast('Données enregistrées et recalculées.', 'success');
  }
}

function computeMatrixTotals(provinces = []) {
  let grandMb = 0;
  let grandSy = 0;
  let grandNv = 0;

  const byType = new Map(
    ENTITY_TYPES.map((t) => [t, { type: t, count: 0, mb: 0, sy: 0, nv: 0, total: 0 }])
  );

  const provinceSummaries = provinces.map((bloc, pIndex) => {
    let subMb = 0;
    let subSy = 0;
    let subNv = 0;

    const entites = Array.isArray(bloc.entites) ? bloc.entites : [];
    for (const ent of entites) {
      const mb = Math.max(0, Number(ent.mb) || 0);
      const sy = Math.max(0, Number(ent.sy) || 0);
      const nv = Math.max(0, Number(ent.nv) || 0);
      const total = mb + sy + nv;

      subMb += mb;
      subSy += sy;
      subNv += nv;

      const typeKey = ENTITY_TYPES.includes(ent.type) ? ent.type : ENTITY_TYPES[3];
      const bucket = byType.get(typeKey);
      if (bucket) {
        bucket.count += 1;
        bucket.mb += mb;
        bucket.sy += sy;
        bucket.nv += nv;
        bucket.total += total;
      }
    }

    grandMb += subMb;
    grandSy += subSy;
    grandNv += subNv;

    return {
      pIndex,
      province: bloc.province,
      entites,
      subMb,
      subSy,
      subNv,
      subTotal: subMb + subSy + subNv
    };
  });

  return {
    provinceSummaries,
    typeSummaries: Array.from(byType.values()),
    grandMb,
    grandSy,
    grandNv,
    grandTotal: grandMb + grandSy + grandNv
  };
}

function openAddProvinceModal(onDone) {
  const suggestions = PROVINCES_RDC.map((p) => `<option value="${escapeHTML(p)}">`).join('');

  openModal({
    title: 'Ajouter une Province (+ Province)',
    content: `
      <form id="form-add-province" class="form-stack">
        <div class="form-group">
          <label for="new-province-name">Nom de la Province</label>
          <input id="new-province-name" list="rdc-provinces-list" required placeholder="Ex: NORD-KIVU" />
          <datalist id="rdc-provinces-list">${suggestions}</datalist>
        </div>
      </form>
    `,
    footer: `
      <button type="button" class="btn-secondary" data-modal-close="true">Annuler</button>
      <button type="submit" form="form-add-province" class="btn-primary">Créer la Province</button>
    `,
    onMount: (dialog, close) => {
      dialog.querySelector('#form-add-province')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const raw = dialog.querySelector('#new-province-name')?.value || '';
        const cleanProv = raw.trim().replace(/\s+/g, ' ').toUpperCase();
        if (!cleanProv) return;

        const state = getCulteState();
        const exists = state.provinces.some((p) => p.province.toUpperCase() === cleanProv);
        if (exists) {
          showToast('Cette province existe déjà dans le tableau.', 'info');
          close();
          return;
        }

        state.provinces.push({ province: cleanProv, entites: [] });
        await persistCulteState(state, true);
        close();
        onDone();
      });
    }
  });
}

function openEntityModal({ mode = 'add', defaultProvince = '', pIndex = -1, eIndex = -1, onDone }) {
  const state = getCulteState();
  const existing =
    mode === 'edit' && state.provinces[pIndex]?.entites?.[eIndex]
      ? state.provinces[pIndex].entites[eIndex]
      : null;

  const currentProv = existing
    ? state.provinces[pIndex].province
    : defaultProvince || state.provinces[0]?.province || PROVINCES_RDC[0];

  const allProvs = Array.from(
    new Set([
      ...state.provinces.map((p) => p.province),
      ...PROVINCES_RDC,
      PROVINCE_UNCLASSIFIED
    ])
  );

  const provinceOptions = allProvs
    .map(
      (prov) =>
        `<option value="${escapeHTML(prov)}" ${prov === currentProv ? 'selected' : ''}>${escapeHTML(prov)}</option>`
    )
    .join('');

  const typeOptions = ENTITY_TYPES.map(
    (t) =>
      `<option value="${escapeHTML(t)}" ${(existing?.type || 'Foyer de Lumière') === t ? 'selected' : ''}>${escapeHTML(t)}</option>`
  ).join('');

  openModal({
    title: mode === 'edit' ? 'Modifier / Réaffecter l’Entité' : 'Ajouter une Entité (+ Entité)',
    content: `
      <form id="form-entity-crud" class="form-stack">
        <div class="form-group">
          <label for="ent-province">Province de rattachement</label>
          <select id="ent-province" required>${provinceOptions}</select>
        </div>
        <div class="form-group">
          <label for="ent-type">Type d'entité</label>
          <select id="ent-type" required>${typeOptions}</select>
        </div>
        <div class="form-group">
          <label for="ent-nom">Dénomination de l'entité</label>
          <input id="ent-nom" type="text" required value="${escapeHTML(existing?.nom || '')}" placeholder="Ex: KANANGA — JOHREI CENTER" />
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          <div class="form-group">
            <label for="ent-mb">MB</label>
            <input id="ent-mb" type="number" min="0" value="${Number(existing?.mb) || 0}" required />
          </div>
          <div class="form-group">
            <label for="ent-sy">SY</label>
            <input id="ent-sy" type="number" min="0" value="${Number(existing?.sy) || 0}" required />
          </div>
          <div class="form-group">
            <label for="ent-nv">NV</label>
            <input id="ent-nv" type="number" min="0" value="${Number(existing?.nv) || 0}" required />
          </div>
        </div>
        <div class="form-group">
          <label for="ent-obs">Observations (OBS)</label>
          <input id="ent-obs" type="text" value="${escapeHTML(existing?.obs || '')}" placeholder="Ex: DIM. NORMAL ET MERCREDI" />
        </div>
      </form>
    `,
    footer: `
      <button type="button" class="btn-secondary" data-modal-close="true">Annuler</button>
      <button type="submit" form="form-entity-crud" class="btn-primary">Enregistrer</button>
    `,
    onMount: (dialog, close) => {
      dialog.querySelector('#form-entity-crud')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const targetProv = dialog.querySelector('#ent-province').value.trim().toUpperCase();
        const type = dialog.querySelector('#ent-type').value;
        const nom = dialog.querySelector('#ent-nom').value.trim().replace(/\s+/g, ' ').toUpperCase();
        const mb = Math.max(0, Number(dialog.querySelector('#ent-mb').value) || 0);
        const sy = Math.max(0, Number(dialog.querySelector('#ent-sy').value) || 0);
        const nv = Math.max(0, Number(dialog.querySelector('#ent-nv').value) || 0);
        const obs = dialog.querySelector('#ent-obs').value.trim();

        if (!nom) return;

        const freshState = getCulteState();
        const updatedEntity = { nom, type, mb, sy, nv, obs };

        if (mode === 'edit' && freshState.provinces[pIndex]?.entites?.[eIndex]) {
          const oldProv = freshState.provinces[pIndex].province;
          if (oldProv === targetProv) {
            freshState.provinces[pIndex].entites[eIndex] = updatedEntity;
          } else {
            // Réaffectation inter-provinciale
            freshState.provinces[pIndex].entites.splice(eIndex, 1);
            let destBloc = freshState.provinces.find((p) => p.province === targetProv);
            if (!destBloc) {
              destBloc = { province: targetProv, entites: [] };
              freshState.provinces.push(destBloc);
            }
            destBloc.entites.push(updatedEntity);
          }
        } else {
          let destBloc = freshState.provinces.find((p) => p.province === targetProv);
          if (!destBloc) {
            destBloc = { province: targetProv, entites: [] };
            freshState.provinces.push(destBloc);
          }
          destBloc.entites.push(updatedEntity);
        }

        await persistCulteState(freshState, true);
        close();
        onDone();
      });
    }
  });
}

export function renderStatistiquesCultesView(container) {
  let subView = 'province'; // 'province' | 'type'

  const render = () => {
    const state = getCulteState();
    const {
      provinceSummaries,
      typeSummaries,
      grandMb,
      grandSy,
      grandNv,
      grandTotal
    } = computeMatrixTotals(state.provinces);

    const provinceBlocksHtml = provinceSummaries
      .map(
        (bloc) => `
          <div class="card" style="padding:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
              <strong style="color:var(--green-main);font-size:0.96rem;">📍 ${escapeHTML(bloc.province)} (${bloc.entites.length})</strong>
              <button type="button" class="btn-secondary btn-add-ent-prov" data-province="${escapeHTML(bloc.province)}" style="padding:5px 10px;font-size:0.78rem;">
                + Entité
              </button>
            </div>

            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Dénomination</th>
                    <th>Type</th>
                    <th style="width:66px;">MB</th>
                    <th style="width:66px;">SY</th>
                    <th style="width:66px;">NV</th>
                    <th>Total</th>
                    <th>OBS</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    bloc.entites.length === 0
                      ? `<tr><td colspan="8" style="color:var(--text-muted);text-align:center;">Aucune entité enregistrée dans cette province.</td></tr>`
                      : bloc.entites
                          .map((ent, eIndex) => {
                            const rowTotal = (Number(ent.mb) || 0) + (Number(ent.sy) || 0) + (Number(ent.nv) || 0);
                            return `
                              <tr>
                                <td><strong>${escapeHTML(ent.nom)}</strong></td>
                                <td>${escapeHTML(ent.type)}</td>
                                <td><input type="number" min="0" class="inline-stat-input" data-p="${bloc.pIndex}" data-e="${eIndex}" data-field="mb" value="${Number(ent.mb) || 0}" style="padding:4px 6px;width:62px;" /></td>
                                <td><input type="number" min="0" class="inline-stat-input" data-p="${bloc.pIndex}" data-e="${eIndex}" data-field="sy" value="${Number(ent.sy) || 0}" style="padding:4px 6px;width:62px;" /></td>
                                <td><input type="number" min="0" class="inline-stat-input" data-p="${bloc.pIndex}" data-e="${eIndex}" data-field="nv" value="${Number(ent.nv) || 0}" style="padding:4px 6px;width:62px;" /></td>
                                <td><strong>${formatNumberFr(rowTotal)}</strong></td>
                                <td style="font-size:0.78rem;color:var(--text-muted);">${escapeHTML(ent.obs || '')}</td>
                                <td style="white-space:nowrap;">
                                  <button type="button" class="btn-icon btn-edit-ent" data-p="${bloc.pIndex}" data-e="${eIndex}" title="Modifier">✏️</button>
                                  <button type="button" class="btn-icon btn-del-ent" data-p="${bloc.pIndex}" data-e="${eIndex}" title="Supprimer">🗑️</button>
                                </td>
                              </tr>
                            `;
                          })
                          .join('')
                  }
                </tbody>
                <tfoot>
                  <tr style="background:rgba(10,110,44,0.1);font-weight:700;">
                    <td colspan="2">SOUS-TOTAL ${escapeHTML(bloc.province)}</td>
                    <td>${formatNumberFr(bloc.subMb)}</td>
                    <td>${formatNumberFr(bloc.subSy)}</td>
                    <td>${formatNumberFr(bloc.subNv)}</td>
                    <td>${formatNumberFr(bloc.subTotal)}</td>
                    <td colspan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        `
      )
      .join('');

    const typeTableHtml = `
      <div class="card">
        <h3 style="margin:0 0 10px;font-size:1rem;">Synthèse Nationale par Type d'Entité</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Type d'entité</th>
                <th>Nb Unités</th>
                <th>MB</th>
                <th>SY</th>
                <th>NV</th>
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${typeSummaries
                .map(
                  (row) => `
                    <tr>
                      <td><strong>${escapeHTML(row.type)}</strong></td>
                      <td>${formatNumberFr(row.count)}</td>
                      <td>${formatNumberFr(row.mb)}</td>
                      <td>${formatNumberFr(row.sy)}</td>
                      <td>${formatNumberFr(row.nv)}</td>
                      <td><strong>${formatNumberFr(row.total)}</strong></td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
            <tfoot>
              <tr style="background:rgba(10,110,44,0.14);font-weight:800;">
                <td>TOTAL NATIONAL</td>
                <td>${formatNumberFr(typeSummaries.reduce((a, b) => a + b.count, 0))}</td>
                <td>${formatNumberFr(grandMb)}</td>
                <td>${formatNumberFr(grandSy)}</td>
                <td>${formatNumberFr(grandNv)}</td>
                <td>${formatNumberFr(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = `
      <div id="statistiques-cultes-printable">
        <!-- En-tête contextuel & date du culte -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
            <div>
              <strong style="font-size:1.02rem;color:var(--green-main);">EMM-RDC — Fréquence Culte</strong>
              <div style="font-size:0.78rem;color:var(--text-muted);">Consolidation nationale en temps réel (4 niveaux)</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <label for="culte-date-input" style="font-size:0.84rem;font-weight:600;white-space:nowrap;">Culte du :</label>
              <input id="culte-date-input" type="date" value="${escapeHTML(state.culteDate || '')}" style="width:auto;" />
            </div>
          </div>

          <!-- Barre d'actions globales -->
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            <button type="button" id="btn-stat-add-entity" class="btn-primary" style="padding:8px 12px;font-size:0.82rem;">+ Ajouter une Entité</button>
            <button type="button" id="btn-stat-add-province" class="btn-secondary" style="padding:8px 12px;font-size:0.82rem;">+ Province</button>
            <button type="button" id="btn-stat-export-csv" class="btn-secondary" style="padding:8px 12px;font-size:0.82rem;">📥 Exporter Excel (CSV)</button>
            <button type="button" id="btn-stat-print-a4" class="btn-secondary" style="padding:8px 12px;font-size:0.82rem;">🖨️ Imprimer A4</button>
            <button type="button" id="btn-stat-reset-zero" class="btn-secondary" style="padding:8px 12px;font-size:0.82rem;">🔄 Réinitialiser à 0</button>
          </div>
        </div>

        <!-- Bascule Vue 1 (Saisie par Province) / Vue 2 (Synthèse Nationale par Type) -->
        <div class="tabs-bar">
          <button type="button" class="tab-btn ${subView === 'province' ? 'active' : ''}" data-subview="province">
            Vue 1 : Saisie par Province
          </button>
          <button type="button" class="tab-btn ${subView === 'type' ? 'active' : ''}" data-subview="type">
            Vue 2 : Synthèse Nationale par Type
          </button>
        </div>

        ${subView === 'province' ? provinceBlocksHtml : typeTableHtml}

        <!-- Bandeau récapitulatif Total Général RDC -->
        <div class="card" style="background:linear-gradient(90deg,#0a6e2c,#043c16);color:#ffffff;border:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <strong style="font-size:1rem;">TOTAL GÉNÉRAL RDC</strong>
            <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:0.9rem;">
              <span>MB : <strong>${formatNumberFr(grandMb)}</strong></span>
              <span>SY : <strong>${formatNumberFr(grandSy)}</strong></span>
              <span>NV : <strong>${formatNumberFr(grandNv)}</strong></span>
              <span style="background:rgba(255,255,255,0.18);padding:2px 10px;border-radius:999px;">
                TOTAL : <strong>${formatNumberFr(grandTotal)}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Événements : changement de date du culte
    container.querySelector('#culte-date-input')?.addEventListener('change', async (e) => {
      const fresh = getCulteState();
      fresh.culteDate = e.target.value;
      await persistCulteState(fresh, true);
    });

    // Actions globales
    container.querySelector('#btn-stat-add-entity')?.addEventListener('click', () => {
      openEntityModal({ mode: 'add', onDone: render });
    });

    container.querySelector('#btn-stat-add-province')?.addEventListener('click', () => {
      openAddProvinceModal(render);
    });

    container.querySelector('#btn-stat-export-csv')?.addEventListener('click', () => {
      exporterCSV(getCulteState().provinces, 'Frequence_EMM_RDC.csv');
      showToast('Export Frequence_EMM_RDC.csv généré.', 'success');
    });

    container.querySelector('#btn-stat-print-a4')?.addEventListener('click', () => {
      openOfficialPrintDialog('#statistiques-cultes-printable');
    });

    container.querySelector('#btn-stat-reset-zero')?.addEventListener('click', async () => {
      if (!window.confirm('Remettre tous les compteurs (MB, SY, NV) à 0 pour un nouveau culte ?')) {
        return;
      }
      const fresh = getCulteState();
      fresh.provinces.forEach((p) => {
        p.entites.forEach((ent) => {
          ent.mb = 0;
          ent.sy = 0;
          ent.nv = 0;
        });
      });
      await persistCulteState(fresh, true);
      render();
    });

    // Bascule sous-vues
    container.querySelectorAll('[data-subview]').forEach((btn) => {
      btn.addEventListener('click', () => {
        subView = btn.dataset.subview;
        render();
      });
    });

    // Bouton + Entité par bloc provincial
    container.querySelectorAll('.btn-add-ent-prov').forEach((btn) => {
      btn.addEventListener('click', () => {
        openEntityModal({ mode: 'add', defaultProvince: btn.dataset.province, onDone: render });
      });
    });

    // Saisie directe MB / SY / NV en ligne
    container.querySelectorAll('.inline-stat-input').forEach((input) => {
      input.addEventListener('change', async (e) => {
        const p = Number(e.target.dataset.p);
        const idx = Number(e.target.dataset.e);
        const field = e.target.dataset.field;
        const val = Math.max(0, Number(e.target.value) || 0);

        const fresh = getCulteState();
        if (fresh.provinces[p]?.entites?.[idx]) {
          fresh.provinces[p].entites[idx][field] = val;
          await persistCulteState(fresh, false);
          render();
        }
      });
    });

    // Bouton Modifier (✏️)
    container.querySelectorAll('.btn-edit-ent').forEach((btn) => {
      btn.addEventListener('click', () => {
        openEntityModal({
          mode: 'edit',
          pIndex: Number(btn.dataset.p),
          eIndex: Number(btn.dataset.e),
          onDone: render
        });
      });
    });

    // Bouton Supprimer (🗑️)
    container.querySelectorAll('.btn-del-ent').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const p = Number(btn.dataset.p);
        const idx = Number(btn.dataset.e);
        const fresh = getCulteState();
        const target = fresh.provinces[p]?.entites?.[idx];
        if (!target) return;

        if (!window.confirm(`Supprimer définitivement "${target.nom}" ?`)) {
          return;
        }
        fresh.provinces[p].entites.splice(idx, 1);
        await persistCulteState(fresh, true);
        render();
      });
    });
  };

  render();
}
