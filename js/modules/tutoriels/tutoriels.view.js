// js/modules/tutoriels/tutoriels.view.js
// Module Guide Visuel & Tutoriels Vidéo — EMM RD CONGO

import { router } from '../../core/router.js';
import { escapeHTML } from '../../utils/dom.js';

const TUTORIAL_STEPS = [
  {
    id: 'demarrage',
    badge: 'Étape 1',
    icon: '🔐',
    title: 'Connexion & Choix de la Province',
    summary: 'Accédez à votre espace sécurisé et sélectionnez la province de travail parmi les 26 provinces de la RDC.',
    visualDiagram: `
      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:0.78rem;">
        <div style="background:#0a6e2c;color:#fff;padding:6px 10px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;">
          <span>☰ EMM RDC</span>
          <span style="background:#fff;color:#0a6e2c;padding:2px 6px;border-radius:4px;font-weight:700;">📍 KASAÏ-CENTRAL ▾</span>
        </div>
        <div style="margin-top:8px;color:#334155;">
          1. Entrez votre e-mail et mot de passe.<br>
          2. En haut à droite, choisissez votre <strong>Province</strong>.<br>
          3. Toutes les listes s'adaptent automatiquement à cette province.
        </div>
      </div>
    `,
    checklist: [
      'Utilisez le menu déroulant en haut à droite pour basculer d’une province à l’autre.',
      'Le bouton ☰ ouvre le menu complet de tous les modules à tout moment.',
      'Le bouton « ← Tableau de bord » ramène directement à l’écran d’accueil.'
    ]
  },
  {
    id: 'frequences',
    badge: 'Étape 2',
    icon: '📊',
    title: 'Module Fréquences (4 Onglets)',
    summary: 'Saisissez les effectifs Membres (MB), Sympathisants (SY) et Nouveaux venus (NV) et exportez la synthèse nationale.',
    visualDiagram: `
      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:0.78rem;">
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
          <span style="background:#0a6e2c;color:#fff;padding:3px 7px;border-radius:99px;font-weight:700;">1. Diffusion</span>
          <span style="background:#e2e8f0;color:#1e293b;padding:3px 7px;border-radius:99px;">2. Diffusion suite</span>
          <span style="background:#e2e8f0;color:#1e293b;padding:3px 7px;border-radius:99px;">3. Numérique</span>
          <span style="background:#e2e8f0;color:#1e293b;padding:3px 7px;border-radius:99px;">4. Synthèse nationale</span>
        </div>
        <div style="color:#334155;">
          • <strong>Diffusion</strong> : Saisie journalière rapide (MB, SY, NV).<br>
          • <strong>Diffusion suite</strong> : Bilan mensuel & activités (Foyers, Goshintai, Fleurs...).<br>
          • <strong>Numérique</strong> : Rapport mensuel normalisé en 5 sections.<br>
          • <strong>Synthèse nationale</strong> : Calcul automatique RDC + Export Excel (CSV).
        </div>
      </div>
    `,
    checklist: [
      'Les totaux par ligne, sous-totaux provinciaux et total RDC se calculent automatiquement.',
      'Cliquez sur « Exporter Excel (CSV) » dans Synthèse nationale pour obtenir le tableau prêt pour Excel.'
    ]
  },
  {
    id: 'finance',
    badge: 'Étape 3',
    icon: '💰',
    title: 'Module Finance (Candidats & Versements)',
    summary: 'Enregistrez les candidats (Initiation, Goshintai, Mitamaya...) et suivez leurs paiements en USD ou FC.',
    visualDiagram: `
      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:0.78rem;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;text-align:center;">
          <div style="background:#dcfce7;color:#065f46;padding:6px;border-radius:6px;font-weight:700;">1. Créer le Candidat<br><span style="font-weight:400;">Montant prévu en $</span></div>
          <div style="background:#fef3c7;color:#92400e;padding:6px;border-radius:6px;font-weight:700;">2. Saisir Versement<br><span style="font-weight:400;">USD ou FC + Taux du jour</span></div>
        </div>
        <div style="margin-top:6px;color:#334155;">Le reste à payer et le relevé individuel sont calculés automatiquement en USD.</div>
      </div>
    `,
    checklist: [
      'Sélectionnez le motif officiel parmi les 8 catégories (Initiation, Goshintai, Shoku, Kannon, etc.).',
      'En cas de paiement en Francs Congolais (FC), indiquez le taux du jour pour la conversion automatique en USD.'
    ]
  },
  {
    id: 'depouillement',
    badge: 'Étape 4',
    icon: '🧾',
    title: 'Dépouillement des Offrandes',
    summary: 'Ouvrez une séance par phase (Phase 1 à 4), saisissez les enveloppes et les 7 rubriques nominatives.',
    visualDiagram: `
      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:0.78rem;color:#334155;">
        <strong>Séance → Saisie par Entité → Relevé Net</strong><br>
        • Offrandes Construction & Normales (FC / USD)<br>
        • Détail nominatif des 7 rubriques (Initiation, Sorei Saichi, Kannon, Photo Sacrée...)<br>
        • Déduction automatique des frais de transport en FC.
      </div>
    `,
    checklist: [
      'Créez d’abord la séance de dépouillement avec la date et la phase.',
      'Ajoutez ensuite les lignes par entité pour générer le relevé global et individuel.'
    ]
  },
  {
    id: 'patrimoine-archives',
    badge: 'Étape 5',
    icon: '🏛️',
    title: 'Patrimoine, Archives & Hors-Ligne',
    summary: 'Inventoriez les biens par état physique, archivez les exercices clôturés et travaillez même sans Internet.',
    visualDiagram: `
      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:0.78rem;color:#334155;">
        • <strong>Patrimoine</strong> : Sites → Biens (Neuf, Passable, Mauvais, Cassé) → Réparations.<br>
        • <strong>Archives</strong> : Classement par année et restauration possible en 1 clic.<br>
        • <strong>Mode Hors-Ligne</strong> : Vos saisies sont conservées sur le téléphone et synchronisées dès le retour de la connexion.
      </div>
    `,
    checklist: [
      'Installez l’application sur l’écran d’accueil Android via le menu Chrome (⋮) → « Installer l’application ».',
      'Effectuez régulièrement une sauvegarde JSON depuis l’onglet Administration.'
    ]
  }
];

export async function renderTutorielsView(container) {
  let selectedStepId = TUTORIAL_STEPS[0].id;
  let customVideoUrl = localStorage.getItem('emm_tutorial_video_url') || './assets/videos/tutoriel-emm.mp4';

  const render = () => {
    const activeStep = TUTORIAL_STEPS.find((s) => s.id === selectedStepId) || TUTORIAL_STEPS[0];

    container.innerHTML = `
      <section class="module-page tutoriels-page">
        <div class="page-header">
          <h2>🎓 Guide d'Utilisation & Tutoriels</h2>
        </div>

        <!-- Espace Tutoriel Vidéo -->
        <div class="card">
          <h3 style="margin:0 0 8px;">🎬 Démonstration Vidéo</h3>
          <p style="font-size:0.84rem;color:var(--text-muted);margin:0 0 10px;">
            Regardez la présentation vidéo de prise en main ou chargez un lien vidéo de formation.
          </p>

          <div id="video-player-wrapper" style="background:#0f172a;border-radius:10px;overflow:hidden;margin-bottom:10px;">
            <video
              id="emm-tutorial-video"
              controls
              playsinline
              poster="./assets/icons/logo-emm.png"
              style="width:100%;max-height:260px;display:block;background:#000;"
              src="${escapeHTML(customVideoUrl)}"
            >
              Votre navigateur ne supporte pas la lecture vidéo HTML5.
            </video>
            <div id="video-fallback-notice" class="hidden" style="padding:14px;color:#f8fafc;font-size:0.82rem;text-align:center;">
              Aucune vidéo locale trouvée à <code>${escapeHTML(customVideoUrl)}</code>.<br>
              Placez votre fichier MP4 dans <code>assets/videos/tutoriel-emm.mp4</code> sur GitHub ou collez un lien vidéo ci-dessous.
            </div>
          </div>

          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <input
              type="url"
              id="input-tutorial-video-url"
              value="${escapeHTML(customVideoUrl)}"
              placeholder="Chemin local (./assets/videos/tutoriel-emm.mp4) ou URL MP4"
              style="flex:1;min-width:200px;"
            />
            <button type="button" id="btn-save-video-url" class="btn-secondary">Charger la vidéo</button>
          </div>
        </div>

        <!-- Guide Visuel Interactif Étape par Étape -->
        <div class="card">
          <h3 style="margin:0 0 10px;">🧭 Tutoriel Visuel Étape par Étape</h3>
          <div class="tabs-bar" role="tablist">
            ${TUTORIAL_STEPS.map(
              (step) => `
              <button
                type="button"
                class="tab-btn ${step.id === selectedStepId ? 'active' : ''}"
                data-tstep="${step.id}"
              >
                ${step.icon} ${escapeHTML(step.badge)}
              </button>
            `
            ).join('')}
          </div>

          <div style="padding:6px 0;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="background:var(--green-main);color:#fff;padding:3px 9px;border-radius:99px;font-size:0.75rem;font-weight:700;">
                ${escapeHTML(activeStep.badge)}
              </span>
              <strong style="font-size:1rem;">${activeStep.icon} ${escapeHTML(activeStep.title)}</strong>
            </div>

            <p style="font-size:0.86rem;color:var(--text-muted);margin:0 0 10px;">
              ${escapeHTML(activeStep.summary)}
            </p>

            <!-- Schéma visuel intégré -->
            <div style="margin-bottom:12px;">
              ${activeStep.visualDiagram}
            </div>

            <div style="font-weight:700;font-size:0.84rem;margin-bottom:6px;">Points essentiels à retenir :</div>
            <ul style="margin:0;padding-left:18px;font-size:0.84rem;display:flex;flex-direction:column;gap:4px;">
              ${activeStep.checklist.map((item) => `<li>${escapeHTML(item)}</li>`).join('')}
            </ul>

            <div style="display:flex;justify-content:space-between;gap:8px;margin-top:14px;padding-top:10px;border-top:1px solid var(--border-color);">
              <button type="button" id="btn-prev-tstep" class="btn-secondary">← Étape précédente</button>
              <button type="button" id="btn-next-tstep" class="btn-primary">Étape suivante →</button>
            </div>
          </div>
        </div>

        <!-- Raccourcis de test rapide -->
        <div class="card">
          <h3 style="margin:0 0 8px;">⚡ Accès Rapide aux Modules</h3>
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

    const videoEl = container.querySelector('#emm-tutorial-video');
    const fallbackNotice = container.querySelector('#video-fallback-notice');
    videoEl?.addEventListener('error', () => {
      videoEl.style.display = 'none';
      fallbackNotice?.classList.remove('hidden');
    });

    container.querySelector('#btn-save-video-url')?.addEventListener('click', () => {
      const val = container.querySelector('#input-tutorial-video-url')?.value?.trim();
      if (!val) return;
      customVideoUrl = val;
      localStorage.setItem('emm_tutorial_video_url', val);
      render();
    });

    container.querySelectorAll('[data-tstep]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedStepId = btn.dataset.tstep;
        render();
      });
    });

    const currentIdx = TUTORIAL_STEPS.findIndex((s) => s.id === selectedStepId);
    container.querySelector('#btn-prev-tstep')?.addEventListener('click', () => {
      const prevIdx = (currentIdx - 1 + TUTORIAL_STEPS.length) % TUTORIAL_STEPS.length;
      selectedStepId = TUTORIAL_STEPS[prevIdx].id;
      render();
    });

    container.querySelector('#btn-next-tstep')?.addEventListener('click', () => {
      const nextIdx = (currentIdx + 1) % TUTORIAL_STEPS.length;
      selectedStepId = TUTORIAL_STEPS[nextIdx].id;
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
