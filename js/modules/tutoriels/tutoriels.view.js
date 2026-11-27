// js/modules/tutoriels/tutoriels.view.js
// Module Guide Visuel Interactif Étape par Étape (100% visuel, sans lecteur vidéo) — EMM RD CONGO

import { router } from '../../core/router.js';
import { escapeHTML } from '../../utils/dom.js';

const TUTORIAL_STEPS = [
  {
    id: 'demarrage',
    badge: 'Étape 1 / 6',
    icon: '🔐',
    title: 'Connexion & Sélection de la Province',
    summary:
      'Connectez-vous avec votre compte utilisateur et sélectionnez votre province parmi les 26 provinces de la RDC.',
    targetRoute: 'dashboard',
    targetLabel: 'Voir le Tableau de Bord',
    visualDiagram: `
      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:12px;font-size:0.8rem;">
        <div style="background:#0a6e2c;color:#ffffff;padding:8px 10px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;gap:6px;">
          <span style="font-weight:800;">☰ EMM RDC</span>
          <span style="background:#ffffff;color:#0a6e2c;padding:3px 8px;border-radius:6px;font-weight:800;font-size:0.74rem;">📍 KASAÏ-CENTRAL ▾</span>
          <span style="background:#ffffff;color:#0a6e2c;padding:3px 8px;border-radius:6px;font-weight:800;font-size:0.74rem;">⚙️ Admin</span>
        </div>
        <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #0a6e2c;border-radius:8px;padding:8px;">
            <div style="font-size:0.7rem;color:#64748b;">1. Menu Latéral (☰)</div>
            <div style="font-weight:700;color:#0f172a;">Accès à tous les modules</div>
          </div>
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #d97706;border-radius:8px;padding:8px;">
            <div style="font-size:0.7rem;color:#64748b;">2. Sélecteur Province</div>
            <div style="font-weight:700;color:#0f172a;">Filtre automatique RDC</div>
          </div>
        </div>
      </div>
    `,
    checklist: [
      'En haut à droite, choisissez votre province dans la liste déroulante : tous les tableaux s’actualisent automatiquement.',
      'Appuyez sur ☰ en haut à gauche pour ouvrir le menu latéral complet.',
      'Dans chaque module, utilisez le bouton vert « ← Tableau de bord » en haut pour revenir à l’accueil.'
    ]
  },
  {
    id: 'frequences',
    badge: 'Étape 2 / 6',
    icon: '📊',
    title: 'Module Fréquences (4 Onglets)',
    summary:
      'Enregistrez la participation aux cultes (Membres, Sympathisants, Nouveaux venus) et générez la synthèse nationale.',
    targetRoute: 'frequences',
    targetLabel: 'Ouvrir Fréquences',
    visualDiagram: `
      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:12px;font-size:0.8rem;">
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px;">
          <span style="background:#0a6e2c;color:#ffffff;padding:4px 9px;border-radius:99px;font-weight:700;font-size:0.74rem;">1. Diffusion</span>
          <span style="background:#e2e8f0;color:#1e293b;padding:4px 9px;border-radius:99px;font-weight:600;font-size:0.74rem;">2. Diffusion suite</span>
          <span style="background:#e2e8f0;color:#1e293b;padding:4px 9px;border-radius:99px;font-weight:600;font-size:0.74rem;">3. Numérique</span>
          <span style="background:#e2e8f0;color:#1e293b;padding:4px 9px;border-radius:99px;font-weight:600;font-size:0.74rem;">4. Synthèse nationale</span>
        </div>
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:8px;color:#334155;">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;text-align:center;font-weight:700;font-size:0.74rem;">
            <div style="background:#dcfce7;color:#065f46;padding:6px;border-radius:6px;">MB<br><span style="font-weight:400;">Membres</span></div>
            <div style="background:#dcfce7;color:#065f46;padding:6px;border-radius:6px;">SY<br><span style="font-weight:400;">Sympathisants</span></div>
            <div style="background:#dcfce7;color:#065f46;padding:6px;border-radius:6px;">NV<br><span style="font-weight:400;">Nouveaux</span></div>
            <div style="background:#fef3c7;color:#92400e;padding:6px;border-radius:6px;">TOTAL<br><span style="font-weight:400;">Auto</span></div>
          </div>
        </div>
      </div>
    `,
    checklist: [
      'Onglet Diffusion : saisie rapide par entité et par date de culte.',
      'Onglet Diffusion suite : bilan mensuel et activités (Foyers, Goshintai, Fleurs, Émissions).',
      'Onglet Numérique & Synthèse nationale : consolidation automatique de toute la RDC et export Excel (CSV).'
    ]
  },
  {
    id: 'finance',
    badge: 'Étape 3 / 6',
    icon: '💰',
    title: 'Module Finance (Candidats & Versements)',
    summary:
      'Suivez les candidats aux cérémonies et enregistrez les versements en Dollars (USD) ou Francs Congolais (FC).',
    targetRoute: 'finance',
    targetLabel: 'Ouvrir Finance',
    visualDiagram: `
      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:12px;font-size:0.8rem;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:center;">
          <div style="background:#dcfce7;color:#065f46;padding:10px;border-radius:8px;">
            <div style="font-weight:800;">1. Fiche Candidat</div>
            <div style="font-size:0.74rem;margin-top:3px;">Nom, Motif (8 catégories), Montant prévu ($)</div>
          </div>
          <div style="background:#fef3c7;color:#92400e;padding:10px;border-radius:8px;">
            <div style="font-weight:800;">2. Versements USD / FC</div>
            <div style="font-size:0.74rem;margin-top:3px;">Conversion auto en USD + calcul du solde</div>
          </div>
        </div>
      </div>
    `,
    checklist: [
      'Enregistrez d’abord le candidat avec le motif officiel (Initiation, Goshintai, Shoku, Kannon, etc.).',
      'Lors d’un versement en Francs Congolais (FC), indiquez le taux du jour pour calculer automatiquement l’équivalent en USD.'
    ]
  },
  {
    id: 'depouillement',
    badge: 'Étape 4 / 6',
    icon: '🧾',
    title: 'Dépouillement des Offrandes',
    summary:
      'Créez une séance de dépouillement par phase et saisissez les offrandes et les 7 rubriques nominatives.',
    targetRoute: 'depouillement',
    targetLabel: 'Ouvrir Dépouillement',
    visualDiagram: `
      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:12px;font-size:0.8rem;color:#334155;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;text-align:center;">
          <div style="flex:1;background:#ffffff;border:1px solid #cbd5e1;padding:8px;border-radius:8px;">
            <strong style="color:#0a6e2c;">1. Séance</strong><br><span style="font-size:0.72rem;">Date & Phase (1 à 4)</span>
          </div>
          <span style="font-weight:800;color:#0a6e2c;">→</span>
          <div style="flex:1;background:#ffffff;border:1px solid #cbd5e1;padding:8px;border-radius:8px;">
            <strong style="color:#0a6e2c;">2. Saisie Entité</strong><br><span style="font-size:0.72rem;">Enveloppes & 7 rubriques</span>
          </div>
          <span style="font-weight:800;color:#0a6e2c;">→</span>
          <div style="flex:1;background:#dcfce7;border:1px solid #86efac;padding:8px;border-radius:8px;">
            <strong style="color:#065f46;">3. Relevé Net</strong><br><span style="font-size:0.72rem;">Brut − Transport</span>
          </div>
        </div>
      </div>
    `,
    checklist: [
      'Ouvrez une séance en choisissant la date et la phase mensuelle.',
      'Ajoutez chaque entité : le système déduit automatiquement les frais de transport en FC pour afficher le net à verser.'
    ]
  },
  {
    id: 'patrimoine-archives',
    badge: 'Étape 5 / 6',
    icon: '🏛️',
    title: 'Patrimoine & Archives',
    summary:
      'Inventoriez les biens mobiliers et immobiliers par site et archivez les dossiers annuels en toute sécurité.',
    targetRoute: 'patrimoine',
    targetLabel: 'Ouvrir Patrimoine',
    visualDiagram: `
      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:12px;font-size:0.8rem;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:8px;">
            <strong style="color:#0a6e2c;">🏛️ Patrimoine</strong>
            <div style="font-size:0.74rem;color:#334155;margin-top:4px;">Sites → Inventaire des biens (Neuf, Passable, Mauvais, Cassé) → Suivi des réparations.</div>
          </div>
          <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:8px;">
            <strong style="color:#0a6e2c;">🗂️ Archives</strong>
            <div style="font-size:0.74rem;color:#334155;margin-top:4px;">Classement par année, recherche rapide et restauration en un clic.</div>
          </div>
        </div>
      </div>
    `,
    checklist: [
      'Créez chaque lieu de culte ou bureau dans « Sites », puis rattachez-y les équipements.',
      'Utilisez le module Archives pour consulter les exercices précédents ou restaurer un dossier.'
    ]
  },
  {
    id: 'admin-horsligne',
    badge: 'Étape 6 / 6',
    icon: '⚙️',
    title: 'Administration, Sauvegarde & Mode Hors-Ligne',
    summary:
      'Gérez les utilisateurs, publiez les annonces, téléchargez la sauvegarde JSON et travaillez même sans Internet.',
    targetRoute: 'administration',
    targetLabel: 'Ouvrir Administration',
    visualDiagram: `
      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:12px;font-size:0.8rem;color:#334155;">
        <div style="background:#dcfce7;color:#065f46;padding:8px 10px;border-radius:8px;font-weight:700;margin-bottom:8px;">
          💾 Sauvegarde Intégrale : EMM_BACKUP_AAAA-MM-JJ.json
        </div>
        <div style="background:#fef3c7;color:#92400e;padding:8px 10px;border-radius:8px;font-weight:700;">
          📶 Mode Hors-Ligne : Saisie locale automatique + synchronisation dès le retour du réseau
        </div>
      </div>
    `,
    checklist: [
      'Dans Administration → Sauvegarde JSON, téléchargez régulièrement une copie complète des données.',
      'Sur Android (Chrome), ouvrez le menu ⋮ puis « Installer l’application » pour placer EMM RDC sur votre écran d’accueil.'
    ]
  }
];

export async function renderTutorielsView(container) {
  let selectedStepIndex = 0;

  const render = () => {
    const activeStep = TUTORIAL_STEPS[selectedStepIndex] || TUTORIAL_STEPS[0];
    const progressPercent = Math.round(((selectedStepIndex + 1) / TUTORIAL_STEPS.length) * 100);

    container.innerHTML = `
      <section class="module-page tutoriels-page">
        <div class="page-header">
          <h2>🎓 Guide Visuel d'Utilisation — EMM RD CONGO</h2>
        </div>

        <!-- Barre de progression visuelle -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:0.84rem;">
            <strong>Progression du guide visuel</strong>
            <span style="color:var(--green-main);font-weight:800;">${escapeHTML(activeStep.badge)} (${progressPercent}%)</span>
          </div>
          <div style="width:100%;height:9px;background:#e2e8f0;border-radius:99px;overflow:hidden;margin-bottom:12px;">
            <div style="width:${progressPercent}%;height:100%;background:var(--green-main);transition:width 0.25s ease;"></div>
          </div>

          <!-- Sélecteur d'étapes -->
          <div class="tabs-bar" role="tablist">
            ${TUTORIAL_STEPS.map(
              (step, idx) => `
              <button
                type="button"
                class="tab-btn ${idx === selectedStepIndex ? 'active' : ''}"
                data-tstep-idx="${idx}"
              >
                ${step.icon} Étape ${idx + 1}
              </button>
            `
            ).join('')}
          </div>

          <!-- Contenu illustré de l'étape sélectionnée -->
          <div style="padding-top:6px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="background:var(--green-main);color:#ffffff;padding:3px 10px;border-radius:99px;font-size:0.76rem;font-weight:800;">
                ${escapeHTML(activeStep.badge)}
              </span>
              <h3 style="margin:0;font-size:1.05rem;">${activeStep.icon} ${escapeHTML(activeStep.title)}</h3>
            </div>

            <p style="font-size:0.88rem;color:var(--text-muted);margin:0 0 12px;">
              ${escapeHTML(activeStep.summary)}
            </p>

            <!-- Schéma visuel interactif -->
            <div style="margin-bottom:14px;">
              ${activeStep.visualDiagram}
            </div>

            <div style="font-weight:800;font-size:0.86rem;margin-bottom:6px;color:var(--green-main);">
              Mode opératoire étape par étape :
            </div>
            <ul style="margin:0;padding-left:18px;font-size:0.86rem;display:flex;flex-direction:column;gap:6px;">
              ${activeStep.checklist.map((item) => `<li>${escapeHTML(item)}</li>`).join('')}
            </ul>

            <div style="margin-top:14px;">
              <button type="button" class="btn-secondary" data-tut-go="${escapeHTML(activeStep.targetRoute)}">
                🚀 ${escapeHTML(activeStep.targetLabel)}
              </button>
            </div>

            <div style="display:flex;justify-content:space-between;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid var(--border-color);">
              <button type="button" id="btn-prev-tstep" class="btn-secondary">← Étape précédente</button>
              <button type="button" id="btn-next-tstep" class="btn-primary">Étape suivante →</button>
            </div>
          </div>
        </div>

        <!-- Carte récapitulative de tous les modules -->
        <div class="card">
          <h3 style="margin:0 0 8px;">⚡ Accès Direct aux Modules</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn-secondary" data-tut-go="dashboard">🏠 Tableau de Bord</button>
            <button type="button" class="btn-secondary" data-tut-go="frequences">📊 Fréquences</button>
            <button type="button" class="btn-secondary" data-tut-go="finance">💰 Finance</button>
            <button type="button" class="btn-secondary" data-tut-go="depouillement">🧾 Dépouillement</button>
            <button type="button" class="btn-secondary" data-tut-go="patrimoine">🏛️ Patrimoine</button>
            <button type="button" class="btn-secondary" data-tut-go="archives">🗂️ Archives</button>
            <button type="button" class="btn-secondary" data-tut-go="administration">⚙️ Administration</button>
          </div>
        </div>
      </section>
    `;

    container.querySelectorAll('[data-tstep-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedStepIndex = Number(btn.dataset.tstepIdx) || 0;
        render();
      });
    });

    container.querySelector('#btn-prev-tstep')?.addEventListener('click', () => {
      selectedStepIndex = (selectedStepIndex - 1 + TUTORIAL_STEPS.length) % TUTORIAL_STEPS.length;
      render();
    });

    container.querySelector('#btn-next-tstep')?.addEventListener('click', () => {
      selectedStepIndex = (selectedStepIndex + 1) % TUTORIAL_STEPS.length;
      render();
    });

    container.querySelectorAll('[data-tut-go]').forEach((btn) => {
      btn.addEventListener('click', () => {
        router.navigate(btn.dataset.tutGo);
      });
    });
  };

  render();
}
