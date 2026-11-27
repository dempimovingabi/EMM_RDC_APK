// js/modules/administration/administration.view.js
// Module 7 : Administration Centrale (Profil, Annonces, Utilisateurs, Sauvegarde JSON) — EMM RD CONGO

import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { COLLECTIONS, PROVINCES_RDC, USER_ROLES } from '../../config/constants.js';
import { firebaseConfig } from '../../config/firebase.config.js';
import { listDocuments, setDocument, deleteDocument } from '../../services/firestore.service.js';
import { resetPassword } from '../auth/auth.controller.js';
import { store } from '../../core/store.js';
import { escapeHTML } from '../../utils/dom.js';
import { showToast } from '../../ui/toast.js';

const ROLE_LABELS = {
  [USER_ROLES.SUPER_ADMIN]: 'Super Administrateur (National)',
  [USER_ROLES.ADMIN_PROVINCIAL]: 'Admin Provincial',
  [USER_ROLES.UTILISATEUR]: 'Utilisateur (Entité)'
};

const BACKUP_COLLECTIONS = [
  COLLECTIONS.USERS,
  COLLECTIONS.ANNONCES,
  COLLECTIONS.FREQ_DIFF_JOUR,
  COLLECTIONS.FREQ_DIFF_MOIS,
  COLLECTIONS.FREQ_NUMERIQUE,
  COLLECTIONS.FREQ_CULTE_NATIONAL,
  COLLECTIONS.CANDIDATS,
  COLLECTIONS.VERSEMENTS,
  COLLECTIONS.DEPOUILLEMENTS,
  COLLECTIONS.DEPOUILLEMENT_LIGNES,
  COLLECTIONS.PATRIMOINE_SITES,
  COLLECTIONS.PATRIMOINE_BIENS,
  COLLECTIONS.PATRIMOINE_REPARATIONS,
  COLLECTIONS.ARCHIVES
];

export async function renderAdministrationView(container) {
  let activeTab = 'profil';

  const render = async () => {
    const state = store.getState() || {};
    const currentUser = state.user || state.currentUser || {};
    const activeProvince = state.activeProvince || 'KASAÏ-CENTRAL';

    const tabs = [
      { id: 'profil', label: '👤 Mon Profil' },
      { id: 'annonces', label: '📢 Annonces' },
      { id: 'utilisateurs', label: '👥 Utilisateurs' },
      { id: 'sauvegarde', label: '💾 Sauvegarde JSON' }
    ];

    container.innerHTML = `
      <section class="module-page administration-page">
        <div class="page-header">
          <h2>Administration — EMM RD CONGO</h2>
        </div>

        <div class="tabs-bar" role="tablist">
          ${tabs
            .map(
              (t) => `
              <button
                type="button"
                class="tab-btn ${activeTab === t.id ? 'active' : ''}"
                data-admtab="${t.id}"
              >
                ${escapeHTML(t.label)}
              </button>
            `
            )
            .join('')}
        </div>

        <div id="admin-tab-host"></div>
      </section>
    `;

    container.querySelectorAll('[data-admtab]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        activeTab = btn.dataset.admtab;
        await render();
      });
    });

    const host = container.querySelector('#admin-tab-host');
    if (!host) return;

    if (activeTab === 'profil') {
      await renderProfilTab(host, currentUser, activeProvince);
    } else if (activeTab === 'annonces') {
      await renderAnnoncesTab(host, currentUser);
    } else if (activeTab === 'utilisateurs') {
      await renderUtilisateursTab(host, activeProvince);
    } else if (activeTab === 'sauvegarde') {
      await renderSauvegardeTab(host);
    }
  };

  await render();
}

// 1. Sous-module : Mon Profil
async function renderProfilTab(host, user, activeProvince) {
  const roleCode = user.role || USER_ROLES.UTILISATEUR;
  const roleLabel = ROLE_LABELS[roleCode] || roleCode;

  host.innerHTML = `
    <div class="card">
      <h3 style="margin:0 0 12px;">Mon Profil Utilisateur</h3>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:0.9rem;">
        <div><strong>Adresse e-mail :</strong> ${escapeHTML(user.email || 'Non renseignée')}</div>
        <div><strong>Rôle hiérarchique :</strong> ${escapeHTML(roleLabel)}</div>
        <div><strong>Province de rattachement :</strong> ${escapeHTML(user.province || activeProvince)}</div>
        <div><strong>Province consultée actuellement :</strong> ${escapeHTML(activeProvince)}</div>
      </div>

      <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-color);">
        <button type="button" id="btn-profil-reset-pwd" class="btn-secondary">
          🔑 Envoyer un lien de réinitialisation du mot de passe
        </button>
      </div>
    </div>
  `;

  host.querySelector('#btn-profil-reset-pwd')?.addEventListener('click', async () => {
    if (!user.email) {
      showToast('Aucune adresse e-mail associée à ce compte.', 'error');
      return;
    }
    try {
      await resetPassword(user.email);
      showToast(`E-mail de réinitialisation envoyé à ${user.email}.`, 'success');
    } catch (err) {
      showToast(`Erreur : ${err?.message || 'Impossible d’envoyer le lien'}`, 'error');
    }
  });
}

// 2. Sous-module : Annonces & Notifications
async function renderAnnoncesTab(host, currentUser) {
  const annonces = (await listDocuments(COLLECTIONS.ANNONCES).catch(() => [])).sort((a, b) =>
    String(b.dateCreation || '').localeCompare(String(a.dateCreation || ''))
  );

  host.innerHTML = `
    <div class="card">
      <h3 style="margin:0 0 10px;">Publier une Annonce Officielle</h3>
      <form id="form-admin-annonce" class="form-stack">
        <div class="form-group">
          <label for="ann-titre">Titre de l'annonce</label>
          <input id="ann-titre" type="text" required placeholder="Ex: Convocation Culte Mensuel National" />
        </div>
        <div class="form-group">
          <label for="ann-texte">Message officiel</label>
          <textarea id="ann-texte" rows="3" required placeholder="Contenu du communiqué pour les provinces..."></textarea>
        </div>
        <button type="submit" class="btn-primary">📢 Publier l'annonce</button>
      </form>
    </div>

    <div class="card">
      <h3 style="margin:0 0 10px;">Annonces publiées (${annonces.length})</h3>
      ${
        annonces.length === 0
          ? `<p style="color:var(--text-muted);margin:0;">Aucune annonce publiée pour le moment.</p>`
          : annonces
              .map(
                (a) => `
              <div style="padding:10px 0;border-bottom:1px solid var(--border-color);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                  <div>
                    <strong>${escapeHTML(a.titre || '')}</strong>
                    <div style="font-size:0.75rem;color:var(--text-muted);">
                      Par ${escapeHTML(a.auteur || 'Administration')} • ${escapeHTML((a.dateCreation || '').slice(0, 10))}
                    </div>
                  </div>
                  <button type="button" class="btn-icon btn-del-annonce" data-id="${escapeHTML(a.id)}" title="Supprimer">🗑️</button>
                </div>
                <p style="margin:6px 0 0;font-size:0.86rem;white-space:pre-line;">${escapeHTML(a.texte || '')}</p>
              </div>
            `
              )
              .join('')
      }
    </div>
  `;

  host.querySelector('#form-admin-annonce')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    await setDocument(COLLECTIONS.ANNONCES, null, {
      titre: f['ann-titre'].value.trim(),
      texte: f['ann-texte'].value.trim(),
      auteur: currentUser.email || 'Administration EMM-RDC',
      dateCreation: new Date().toISOString()
    });
    showToast('Annonce officielle publiée.', 'success');
    await renderAnnoncesTab(host, currentUser);
  });

  host.querySelectorAll('.btn-del-annonce').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Supprimer cette annonce ?')) return;
      await deleteDocument(COLLECTIONS.ANNONCES, btn.dataset.id);
      showToast('Annonce supprimée.', 'info');
      await renderAnnoncesTab(host, currentUser);
    });
  });
}

// 3. Sous-module : Gestion des Utilisateurs (Instance secondaire FirebaseApp pour ne pas déconnecter l'admin)
async function renderUtilisateursTab(host, activeProvince) {
  const users = (await listDocuments(COLLECTIONS.USERS).catch(() => [])).sort((a, b) =>
    String(a.email || '').localeCompare(String(b.email || ''))
  );

  const provOptions = PROVINCES_RDC.map(
    (p) => `<option value="${escapeHTML(p)}" ${p === activeProvince ? 'selected' : ''}>${escapeHTML(p)}</option>`
  ).join('');

  host.innerHTML = `
    <div class="card">
      <h3 style="margin:0 0 10px;">Créer un Compte Utilisateur</h3>
      <form id="form-admin-user" class="form-stack">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;">
          <div class="form-group">
            <label for="usr-email">Adresse e-mail</label>
            <input id="usr-email" type="email" required placeholder="responsable@emm-rdc.org" />
          </div>
          <div class="form-group">
            <label for="usr-pwd">Mot de passe initial (6 car. min)</label>
            <input id="usr-pwd" type="password" minlength="6" required placeholder="••••••••" />
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;">
          <div class="form-group">
            <label for="usr-role">Rôle</label>
            <select id="usr-role" required>
              <option value="${USER_ROLES.UTILISATEUR}">Utilisateur (Entité)</option>
              <option value="${USER_ROLES.ADMIN_PROVINCIAL}">Admin Provincial</option>
              <option value="${USER_ROLES.SUPER_ADMIN}">Super Administrateur</option>
            </select>
          </div>
          <div class="form-group">
            <label for="usr-province">Province assignée</label>
            <select id="usr-province" required>${provOptions}</select>
          </div>
          <div class="form-group">
            <label for="usr-phone">Téléphone (optionnel)</label>
            <input id="usr-phone" type="tel" placeholder="+243..." />
          </div>
        </div>

        <button type="submit" id="btn-create-user" class="btn-primary">➕ Créer le compte utilisateur</button>
      </form>
    </div>

    <div class="card">
      <h3 style="margin:0 0 10px;">Comptes enregistrés (${users.length})</h3>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>E-mail</th>
              <th>Rôle</th>
              <th>Province</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${
              users.length === 0
                ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Aucun profil utilisateur trouvé dans Firestore.</td></tr>`
                : users
                    .map(
                      (u) => `
                    <tr>
                      <td><strong>${escapeHTML(u.email || '')}</strong>${
                        u.phone ? `<br><span style="font-size:0.75rem;color:var(--text-muted);">${escapeHTML(u.phone)}</span>` : ''
                      }</td>
                      <td>
                        <select class="sel-user-role" data-id="${escapeHTML(u.id)}" style="padding:4px 6px;font-size:0.78rem;">
                          <option value="${USER_ROLES.UTILISATEUR}" ${u.role === USER_ROLES.UTILISATEUR ? 'selected' : ''}>Utilisateur</option>
                          <option value="${USER_ROLES.ADMIN_PROVINCIAL}" ${u.role === USER_ROLES.ADMIN_PROVINCIAL ? 'selected' : ''}>Admin Provincial</option>
                          <option value="${USER_ROLES.SUPER_ADMIN}" ${u.role === USER_ROLES.SUPER_ADMIN ? 'selected' : ''}>Super Admin</option>
                        </select>
                      </td>
                      <td>
                        <select class="sel-user-prov" data-id="${escapeHTML(u.id)}" style="padding:4px 6px;font-size:0.78rem;">
                          ${PROVINCES_RDC.map(
                            (p) => `<option value="${escapeHTML(p)}" ${u.province === p ? 'selected' : ''}>${escapeHTML(p)}</option>`
                          ).join('')}
                        </select>
                      </td>
                      <td>
                        <button type="button" class="btn-icon btn-del-user" data-id="${escapeHTML(u.id)}" title="Supprimer le profil">🗑️</button>
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

  host.querySelector('#form-admin-user')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const submitBtn = host.querySelector('#btn-create-user');
    const email = f['usr-email'].value.trim().toLowerCase();
    const password = f['usr-pwd'].value;
    const role = f['usr-role'].value;
    const province = f['usr-province'].value;
    const phone = f['usr-phone'].value.trim();

    let secondaryApp = null;
    try {
      if (submitBtn) submitBtn.disabled = true;
      // Instance secondaire pour créer l'utilisateur sans déconnecter l'admin actuel
      secondaryApp = initializeApp(firebaseConfig, `emm-admin-create-${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const uid = cred.user.uid;

      await setDocument(COLLECTIONS.USERS, uid, {
        uid,
        email,
        role,
        province,
        phone,
        premium: role === USER_ROLES.SUPER_ADMIN,
        createdAt: new Date().toISOString()
      });

      await signOut(secondaryAuth);
      showToast(`Compte ${email} créé avec succès.`, 'success');
      await renderUtilisateursTab(host, activeProvince);
    } catch (err) {
      console.error('Erreur création utilisateur :', err);
      showToast(`Erreur création compte : ${err?.message || err?.code || 'échec'}`, 'error');
    } finally {
      if (secondaryApp) {
        await deleteApp(secondaryApp).catch(() => {});
      }
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  host.querySelectorAll('.sel-user-role').forEach((sel) => {
    sel.addEventListener('change', async () => {
      await setDocument(COLLECTIONS.USERS, sel.dataset.id, { role: sel.value }, { merge: true });
      showToast('Rôle utilisateur mis à jour.', 'success');
    });
  });

  host.querySelectorAll('.sel-user-prov').forEach((sel) => {
    sel.addEventListener('change', async () => {
      await setDocument(COLLECTIONS.USERS, sel.dataset.id, { province: sel.value }, { merge: true });
      showToast('Province assignée mise à jour.', 'success');
    });
  });

  host.querySelectorAll('.btn-del-user').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Supprimer ce profil utilisateur de la base ?')) return;
      await deleteDocument(COLLECTIONS.USERS, btn.dataset.id);
      showToast('Profil utilisateur supprimé.', 'info');
      await renderUtilisateursTab(host, activeProvince);
    });
  });
}

// 4. Sous-module : Sauvegarde & Restauration Intégrale JSON (EMM_BACKUP_AAAA-MM-JJ.json)
async function renderSauvegardeTab(host) {
  host.innerHTML = `
    <div class="card">
      <h3 style="margin:0 0 8px;">Sauvegarde Intégrale des Données (JSON)</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin:0 0 12px;">
        Exporte toutes les collections Cloud Firestore ainsi que le cache local des statistiques nationales (<code>emm_rdc_data</code>) dans un fichier unique daté.
      </p>
      <button type="button" id="btn-export-json-backup" class="btn-primary">
        ⬇️ Télécharger la sauvegarde (EMM_BACKUP_${new Date().toISOString().slice(0, 10)}.json)
      </button>
    </div>

    <div class="card">
      <h3 style="margin:0 0 8px;">Restauration depuis un Fichier JSON</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin:0 0 12px;">
        Sélectionnez un fichier <code>EMM_BACKUP_AAAA-MM-JJ.json</code> valide pour restaurer les données.
      </p>
      <div class="form-stack">
        <input type="file" id="input-restore-json" accept=".json,application/json" />
        <button type="button" id="btn-restore-json-backup" class="btn-secondary">
          ⬆️ Restaurer la sauvegarde sélectionnée
        </button>
      </div>
    </div>
  `;

  host.querySelector('#btn-export-json-backup')?.addEventListener('click', async () => {
    try {
      const collectionsData = {};
      for (const col of BACKUP_COLLECTIONS) {
        if (!col) continue;
        collectionsData[col] = await listDocuments(col).catch(() => []);
      }

      let localCultes = null;
      try {
        const raw = localStorage.getItem('emm_rdc_data');
        if (raw) localCultes = JSON.parse(raw);
      } catch (_) {}

      const backupPayload = {
        app: 'EMM RD CONGO',
        version: '2.1',
        exportedAt: new Date().toISOString(),
        localData: { emm_rdc_data: localCultes },
        collections: collectionsData
      };

      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EMM_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Sauvegarde JSON téléchargée avec succès.', 'success');
    } catch (err) {
      console.error('Erreur sauvegarde JSON :', err);
      showToast('Erreur lors de la génération de la sauvegarde.', 'error');
    }
  });

  host.querySelector('#btn-restore-json-backup')?.addEventListener('click', async () => {
    const fileInput = host.querySelector('#input-restore-json');
    const file = fileInput?.files?.[0];
    if (!file) {
      showToast('Veuillez d’abord sélectionner un fichier JSON.', 'info');
      return;
    }

    if (!window.confirm('Confirmer la restauration de ce fichier de sauvegarde ? Les enregistrements existants portant le même identifiant seront mis à jour.')) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed?.localData?.emm_rdc_data) {
        localStorage.setItem('emm_rdc_data', JSON.stringify(parsed.localData.emm_rdc_data));
      }

      const cols = parsed?.collections || {};
      let restoredCount = 0;
      for (const [colName, docs] of Object.entries(cols)) {
        if (!Array.isArray(docs)) continue;
        for (const docItem of docs) {
          const docId = docItem.id || null;
          await setDocument(colName, docId, docItem, { merge: true });
          restoredCount += 1;
        }
      }

      showToast(`Restauration terminée (${restoredCount} enregistrements restaurés).`, 'success');
    } catch (err) {
      console.error('Erreur restauration JSON :', err);
      showToast('Fichier JSON invalide ou erreur lors de la restauration.', 'error');
    }
  });
}
