// js/modules/frequences/diffusion/diffusion.view.js
// Sous-module Diffusion (Saisie Journalière & Bilan Mensuel) — EMM RD CONGO[span_6](start_span)[span_6](end_span)

import { COLLECTIONS } from '../../../config/constants.js';
import { listDocuments, setDocument } from '../../../services/firestore.service.js';
import { getActiveProvince } from '../../../core/province.context.js';
import { escapeHTML, formatNumberFr } from '../../../utils/dom.js';
import { showToast } from '../../../ui/toast.js';

export async function renderDiffusionView(container) {
  const province = getActiveProvince();
  const todayIso = new Date().toISOString().slice(0, 10);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [joursAll, moisAll] = await Promise.all([
    listDocuments(COLLECTIONS.FREQ_DIFF_JOUR),
    listDocuments(COLLECTIONS.FREQ_DIFF_MOIS)
  ]);

  const joursProv = joursAll.filter(
    (j) => String(j.province || '').toUpperCase() === province.toUpperCase()
  );
  const moisProv = moisAll.filter(
    (m) => String(m.province || '').toUpperCase() === province.toUpperCase()
  );

  container.innerHTML = `
    <div class="card">
      <h3 style="margin:0 0 10px;">Saisie Journalière — ${escapeHTML(province)}</h3>
      <form id="form-diff-jour" class="form-stack">
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
          <div class="form-group">
            <label for="dj-date">Date</label>
            <input id="dj-date" type="date" value="${todayIso}" required />
          </div>
          <div class="form-group">
            <label for="dj-entity">Entité</label>
            <input id="dj-entity" type="text" required placeholder="Ex: KANANGA — FOYER 1" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          <div class="form-group">
            <label for="dj-mb">Membres (MB)</label>
            <input id="dj-mb" type="number" min="0" value="0" required />
          </div>
          <div class="form-group">
            <label for="dj-sy">Sympathisants (SY)</label>
            <input id="dj-sy" type="number" min="0" value="0" required />
          </div>
          <div class="form-group">
            <label for="dj-nv">Nouveaux (NV)</label>
            <input id="dj-nv" type="number" min="0" value="0" required />
          </div>
        </div>
        <button type="submit" class="btn-primary">Enregistrer la saisie journalière</button>
      </form>
    </div>

    <div class="card">
      <h3 style="margin:0 0 10px;">Bilan Mensuel de Diffusion — ${escapeHTML(province)}</h3>
      <form id="form-diff-mois" class="form-stack">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          <div class="form-group">
            <label for="dm-mois">Mois (1-12)</label>
            <input id="dm-mois" type="number" min="1" max="12" value="${currentMonth}" required />
          </div>
          <div class="form-group">
            <label for="dm-annee">Année</label>
            <input id="dm-annee" type="number" min="2020" max="2099" value="${currentYear}" required />
          </div>
          <div class="form-group">
            <label for="dm-entity">Entité</label>
            <input id="dm-entity" type="text" required placeholder="Ex: KANANGA — JOHREI CENTER" />
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          <div class="form-group">
            <label for="dm-mb">Culte MB</label>
            <input id="dm-mb" type="number" min="0" value="0" />
          </div>
          <div class="form-group">
            <label for="dm-sy">Culte SY</label>
            <input id="dm-sy" type="number" min="0" value="0" />
          </div>
          <div class="form-group">
            <label for="dm-nv">Culte NV</label>
            <input id="dm-nv" type="number" min="0" value="0" />
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
          <div class="form-group">
            <label for="dm-foyers">Foyers accompagnés</label>
            <input id="dm-foyers" type="number" min="0" value="0" />
          </div>
          <div class="form-group">
            <label for="dm-goshintai">Goshintai</label>
            <input id="dm-goshintai" type="number" min="0" value="0" />
          </div>
          <div class="form-group">
            <label for="dm-fleurs">Fleurs distribuées</label>
            <input id="dm-fleurs" type="number" min="0" value="0" />
          </div>
          <div class="form-group">
            <label for="dm-potagers">Potagers</label>
            <input id="dm-potagers" type="number" min="0" value="0" />
          </div>
          <div class="form-group">
            <label for="dm-maisons">Maisons ouvertes</label>
            <input id="dm-maisons" type="number" min="0" value="0" />
          </div>
          <div class="form-group">
            <label for="dm-temoignages">Témoignages</label>
            <input id="dm-temoignages" type="number" min="0" value="0" />
          </div>
        </div>

        <div class="form-group">
          <label for="dm-bilan">Bilan qualitatif (grâces reçues)</label>
          <textarea id="dm-bilan" rows="2" placeholder="Observations et grâces du mois..."></textarea>
        </div>

        <button type="submit" class="btn-primary">Enregistrer le bilan mensuel</button>
      </form>
    </div>

    <div class="card">
      <h3 style="margin:0 0 8px;">Saisies journalières enregistrées (${joursProv.length})</h3>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Entité</th>
              <th>MB</th>
              <th>SY</th>
              <th>NV</th>
            </tr>
          </thead>
          <tbody>
            ${
              joursProv.length === 0
                ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Aucune saisie journalière pour ${escapeHTML(province)}.</td></tr>`
                : joursProv
                    .slice(-10)
                    .reverse()
                    .map(
                      (j) => `
                        <tr>
                          <td>${escapeHTML(j.date || '')}</td>
                          <td>${escapeHTML(j.entityName || '')}</td>
                          <td>${formatNumberFr(j.membres)}</td>
                          <td>${formatNumberFr(j.sympathisants)}</td>
                          <td>${formatNumberFr(j.nouveaux)}</td>
                        </tr>
                      `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
      <div style="margin-top:8px;font-size:0.8rem;color:var(--text-muted);">
        Bilans mensuels archivés pour cette province : <strong>${moisProv.length}</strong>
      </div>
    </div>
  `;

  container.querySelector('#form-diff-jour')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    await setDocument(COLLECTIONS.FREQ_DIFF_JOUR, null, {
      province,
      entityName: form['dj-entity'].value.trim().toUpperCase(),
      date: form['dj-date'].value,
      membres: Math.max(0, Number(form['dj-mb'].value) || 0),
      sympathisants: Math.max(0, Number(form['dj-sy'].value) || 0),
      nouveaux: Math.max(0, Number(form['dj-nv'].value) || 0)
    });
    showToast('Saisie journalière enregistrée.', 'success');
    renderDiffusionView(container);
  });

  container.querySelector('#form-diff-mois')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    await setDocument(COLLECTIONS.FREQ_DIFF_MOIS, null, {
      province,
      entityName: form['dm-entity'].value.trim().toUpperCase(),
      mois: Number(form['dm-mois'].value) || currentMonth,
      annee: Number(form['dm-annee'].value) || currentYear,
      culte: {
        membres: Math.max(0, Number(form['dm-mb'].value) || 0),
        sympathisants: Math.max(0, Number(form['dm-sy'].value) || 0),
        nouveaux: Math.max(0, Number(form['dm-nv'].value) || 0)
      },
      activites: {
        foyersAccompagnes: Math.max(0, Number(form['dm-foyers'].value) || 0),
        goshintai: Math.max(0, Number(form['dm-goshintai'].value) || 0),
        fleursDistribuees: Math.max(0, Number(form['dm-fleurs'].value) || 0),
        potagers: Math.max(0, Number(form['dm-potagers'].value) || 0),
        maisonsOuvertes: Math.max(0, Number(form['dm-maisons'].value) || 0),
        temoignages: Math.max(0, Number(form['dm-temoignages'].value) || 0)
      },
      bilanTexte: form['dm-bilan'].value.trim()
    });
    showToast('Bilan mensuel enregistré.', 'success');
    renderDiffusionView(container);
  });
}
