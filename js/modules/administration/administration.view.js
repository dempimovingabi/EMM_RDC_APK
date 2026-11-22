// js/modules/administration/administration.view.js
// Module Administration (Utilisateurs, Annonces & Sauvegarde/Restauration) — EMM RD CONGO

import { COLLECTIONS, USER_ROLES, ROLE_LABELS, PROVINCES_RDC } from '../../config/constants.js';
import { listDocuments, setDocument } from '../../services/firestore.service.js';
import { loadLocalData, saveLocalData } from '../../services/local-db.service.js';
import { store } from '../../core/store.js';
import {
  canManageUsers,
  canBackupRestore,
  canPublishAnnouncement
} from '../../core/permissions.js';
import { escapeHTML } from '../../utils/dom.js';
import { showToast } from '../../ui/toast.js';

export async function renderAdministrationView(container, params = {}) {
  let activeTab = params.tab || 'utilisateurs';

  const render = async () => {
    const { user } = store.getState();
    const allowUsers = canManageUsers(user);
    const allowBackup = canBackupRestore(user);
    const allowAnnonces = canPublishAnnouncement(user);

    const [usersList, annoncesList] = await Promise.all([
      allowUsers ? listDocuments(COLLECTIONS.USERS) : Promise.resolve([]),
      listDocuments(COLLECTIONS.ANNONCES)
    ]);

    const roleOptions = Object.values(USER_ROLES)
      .map((r) => `<option value="${escapeHTML(r)}">${escapeHTML(ROLE_LABELS[r] || r)}</option>`)
      .join('');

    const provOptions = PROVINCES_RDC.map(
      (p) => `<option value="${escapeHTML(p)}">${escapeHTML(p)}</option>`
    ).join('');

    const usersTabHtml = !allowUsers
      ? `<div class="card"><p>Accès réservé aux administrateurs.</p></div>`
      : `
        <div class="card">
          <h3 style="margin:0 0 10px;">Créer / Mettre à jour un Utilisateur</h3>
          <form id="form-admin-user" class="form-stack">
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
              <div class="form-group">
                <label for="adm-uid">UID ou Identifiant document</label>
                <input id="adm-uid" type="text" required placeholder="Ex: uid_utilisateur_01" />
              </div>
              <div class="form-group">
                <label for="adm-email">Adresse e-mail</label>
                <input id="adm-email" type="email" required placeholder="membre@emm-rdc.org" />
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
              <div class="form-group">
                <label for="adm-role">Rôle</label>
                <select id="adm-role">${roleOptions}</select>
              </div>
              <div class="form-group">
                <label for="adm-province">Province</label>
                <select id="adm-province">${provOptions}</select>
              </div>
              <div class="form-group">
                <label for="adm-premium">Statut Premium</label>
                <select id="adm-premium">
                  <option value="false">Standard</option>
                  <option value="true">Premium actif</option>
                </select>
              </div>
            </div>
            <button type="submit" class="btn-primary">Enregistrer le profil utilisateur</button>
          </form>
        </div>

        <div class="card">
          <h3 style="margin:0 0 8px;">Comptes enregistrés (${usersList.length})</h3>
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Rôle</th>
                  <th>Province</th>
                  <th>Premium</th>
                </tr>
              </thead>
              <tbody>
                ${
                  usersList.length === 0
                    ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Aucun profil chargé.</td></tr>`
                    : usersList
                        .map(
                          (u) => `
                            <tr>
                              <td><strong>${escapeHTML(u.email || u.id || '')}</strong></td>
                              <td>${escapeHTML(ROLE_LABELS[u.role] || u.role || 'utilisateur')}</td>
                              <td>${escapeHTML(u.province || '')}</td>
                              <td>${u.premium ? '⭐ Oui' : 'Non'}</td>
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

    const annoncesTabHtml = `
      ${
        allowAnnonces
          ? `
            <div class="card">
              <h3 style="margin:0 0 10px;">Publier une Annonce / Notification</h3>
              <form id="form-admin-annonce" class="form-stack">
                <div class="form-group">
                  <label for="ann-titre">Titre</label>
                  <input id="ann-titre" type="text" required placeholder="Ex: Réunion provinciale des responsables" />
                </div>
                <div class="form-group">
                  <label for="ann-message">Message</label>
                  <textarea id="ann-message" rows="3" required placeholder="Détails de l'annonce..."></textarea>
                </div>
                <button type="submit" class="btn-primary">Publier l'annonce</button>
              </form>
            </div>
          `
          : ''
      }

      <div class="card">
        <h3 style="margin:0 0 8px;">Annonces récentes (${annoncesList.length})</h3>
        ${
          annoncesList.length === 0
            ? `<p style="color:var(--text-muted);">Aucune annonce publiée.</p>`
            : annoncesList
                .slice()
                .reverse()
                .map(
                  (a) => `
                    <div style="padding:10px 0;border-bottom:1px solid var(--border-color);">
                      <strong>${escapeHTML(a.titre || 'Annonce')}</strong>
                      <p style="margin:4px 0 0;font-size:0.88rem;">${escapeHTML(a.message || '')}</p>
                    </div>
                  `
                )
                .join('')
        }
      </div>
    `;

    const backupTabHtml = !allowBackup
      ? `<div class="card"><p>Sauvegarde et restauration JSON réservées au Super Administrateur.</p></div>`
      : `
        <div class="card">
          <h3 style="margin:0 0 10px;">Sauvegarde & Restauration JSON (emm_rdc_data)</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
            <button type="button" id="btn-download-json" class="btn-primary">💾 Exporter la sauvegarde JSON</button>
            <label class="btn-secondary" style="cursor:pointer;">
              📂 Importer un fichier JSON
              <input id="input-restore-json" type="file" accept="application/json" style="display:none;" />
            </label>
          </div>
          <p style="margin:0;font-size:0.82rem;color:var(--text-muted);">
            La restauration remplace le contenu de la base locale <code>emm_rdc_data</code> après confirmation.
          </p>
        </div>
      `;

    container.innerHTML = `
      <section class="module-page admin-page">
        <div class="page-header">
          <h2>Administration</h2>
        </div>

        <div class="tabs-bar">
          <button type="button" class="tab-btn ${activeTab === 'utilisateurs' ? 'active' : ''}" data-atab="utilisateurs">Utilisateurs</button>
          <button type="button" class="tab-btn ${activeTab === 'annonces' ? 'active' : ''}" data-atab="annonces">Annonces</button>
          <button type="button" class="tab-btn ${activeTab === 'sauvegarde' ? 'active' : ''}" data-atab="sauvegarde">Sauvegarde</button>
        </div>

        ${
          activeTab === 'utilisateurs'
            ? usersTabHtml
            : activeTab === 'annonces'
              ? annoncesTabHtml
              : backupTabHtml
        }
      </section>
    `;

    container.querySelectorAll('[data-atab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.atab;
        render();
      });
    });

    container.querySelector('#form-admin-user')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const uid = f['adm-uid'].value.trim();
      await setDocument(COLLECTIONS.USERS, uid, {
        uid,
        email: f['adm-email'].value.trim(),
        role: f['adm-role'].value,
        province: f['adm-province'].value,
        premium: f['adm-premium'].value === 'true'
      });
      showToast('Profil utilisateur enregistré.', 'success');
      render();
    });

    container.querySelector('#form-admin-annonce')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      await setDocument(COLLECTIONS.ANNONCES, null, {
        titre: f['ann-titre'].value.trim(),
        message: f['ann-message'].value.trim(),
        auteur: user?.email || ''
      });
      showToast('Annonce publiée.', 'success');
      render();
    });

    container.querySelector('#btn-download-json')?.addEventListener('click', () => {
      const jsonStr = JSON.stringify(loadLocalData(), null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emm_rdc_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1200);
      showToast('Sauvegarde JSON téléchargée.', 'success');
    });

    container.querySelector('#input-restore-json')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!window.confirm('Restaurer cette sauvegarde et écraser les données locales actuelles ?')) {
        return;
      }
      const text = await file.text();
      const parsed = JSON.parse(text);
      saveLocalData(parsed);
      showToast('Sauvegarde locale restaurée.', 'success');
      render();
    });
  };

  await render();
}
