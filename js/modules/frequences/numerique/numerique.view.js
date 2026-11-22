// js/modules/frequences/numerique/numerique.view.js
// Sous-module Rapport Numérique Mensuel (5 sections) — EMM RD CONGO[span_8](start_span)[span_8](end_span)

import { COLLECTIONS } from '../../../config/constants.js';
import { listDocuments, setDocument } from '../../../services/firestore.service.js';
import { getActiveProvince } from '../../../core/province.context.js';
import { escapeHTML } from '../../../utils/dom.js';
import { showToast } from '../../../ui/toast.js';

export async function renderNumeriqueView(container) {
  const province = getActiveProvince();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const existingRapports = (await listDocuments(COLLECTIONS.FREQ_NUMERIQUE)).filter(
    (r) => String(r.province || '').toUpperCase() === province.toUpperCase()
  );

  container.innerHTML = `
    <div class="card">
      <h3 style="margin:0 0 10px;">Rapport Numérique Mensuel — ${escapeHTML(province)}</h3>
      <form id="form-numerique" class="form-stack">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          <div class="form-group">
            <label for="num-entity">Entité</label>
            <input id="num-entity" type="text" required placeholder="Nom de l'entité" />
          </div>
          <div class="form-group">
            <label for="num-mois">Mois</label>
            <input id="num-mois" type="number" min="1" max="12" value="${currentMonth}" required />
          </div>
          <div class="form-group">
            <label for="num-annee">Année</label>
            <input id="num-annee" type="number" min="2020" max="2099" value="${currentYear}" required />
          </div>
        </div>

        <h4>1. Situation des Membres</h4>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">
          <div class="form-group"><label>Baptisés</label><input name="baptises" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Actifs</label><input name="actifs" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Inactifs</label><input name="inactifs" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Initiés</label><input name="inities" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Entrés</label><input name="entres" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Sortis</label><input name="sortis" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Récupérés</label><input name="recuperes" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Décédés</label><input name="decedes" type="number" min="0" value="0" /></div>
        </div>

        <h4>2. Fréquentation Mensuelle</h4>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
          <div class="form-group"><label>Membres</label><input name="freq_mb" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Sympathisants</label><input name="freq_sy" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Nouveaux</label><input name="freq_nv" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Personnes acheminées</label><input name="acheminees" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Restés</label><input name="restes" type="number" min="0" value="0" /></div>
        </div>

        <h4>3. Culte Mensuel (Total)</h4>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
          <div class="form-group"><label>Membres</label><input name="culte_mb" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Sympathisants</label><input name="culte_sy" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Nouveaux venus</label><input name="culte_nv" type="number" min="0" value="0" /></div>
        </div>

        <h4>4. Activités Spirituelles & Sociales</h4>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
          <div class="form-group"><label>Johrei</label><input name="johrei" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Sanguetsu</label><input name="sanguetsu" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Fleurs</label><input name="fleurs" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Champs</label><input name="champs" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Agriculteurs</label><input name="agriculteurs" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Potagers (Anciens)</label><input name="potagers_anciens" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Potagers (Nouveaux)</label><input name="potagers_nouveaux" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Autels</label><input name="autels" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Mitamaya</label><input name="mitamaya" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Sorei Saishi</label><input name="sorei_saishi" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Shinrei Saichi</label><input name="shinrei_saichi" type="number" min="0" value="0" /></div>
        </div>

        <h4>5. Assistance & Nettoyage</h4>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;">
          <div class="form-group"><label>Maisons assistées (Membres)</label><input name="maisons_mb" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Maisons assistées (Sympathisants)</label><input name="maisons_sy" type="number" min="0" value="0" /></div>
        </div>

        <button type="submit" class="btn-primary">Enregistrer le rapport numérique</button>
      </form>
    </div>

    <div class="card">
      <strong>Rapports numériques enregistrés (${escapeHTML(province)}) : ${existingRapports.length}</strong>
    </div>
  `;

  container.querySelector('#form-numerique')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const num = (name) => Math.max(0, Number(f[name]?.value) || 0);

    await setDocument(COLLECTIONS.FREQ_NUMERIQUE, null, {
      province,
      entityName: f['num-entity'].value.trim().toUpperCase(),
      mois: Number(f['num-mois'].value) || currentMonth,
      annee: Number(f['num-annee'].value) || currentYear,
      membres: {
        baptises: num('baptises'),
        actifs: num('actifs'),
        inactifs: num('inactifs'),
        inities: num('inities'),
        entres: num('entres'),
        sortis: num('sortis'),
        recuperes: num('recuperes'),
        decedes: num('decedes')
      },
      frequentation: {
        membres: num('freq_mb'),
        sympathisants: num('freq_sy'),
        nouveaux: num('freq_nv'),
        acheminees: num('acheminees'),
        restes: num('restes')
      },
      culte: {
        membres: num('culte_mb'),
        sympathisants: num('culte_sy'),
        nouveaux: num('culte_nv')
      },
      activites: {
        johrei: num('johrei'),
        sanguetsu: num('sanguetsu'),
        fleurs: num('fleurs'),
        champs: num('champs'),
        agriculteurs: num('agriculteurs'),
        potagersAnciens: num('potagers_anciens'),
        potagersNouveaux: num('potagers_nouveaux'),
        autels: num('autels'),
        mitamaya: num('mitamaya'),
        soreiSaishi: num('sorei_saishi'),
        shinreiSaichi: num('shinrei_saichi')
      },
      assistance: {
        maisonsMembres: num('maisons_mb'),
        maisonsSympathisants: num('maisons_sy')
      }
    });

    showToast('Rapport numérique mensuel enregistré.', 'success');
    renderNumeriqueView(container);
  });
}
