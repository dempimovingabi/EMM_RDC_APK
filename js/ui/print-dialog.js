// js/ui/print-dialog.js
// Modale d'impression officielle A4 (accès Premium) — EMM RD CONGO

import { canExportOrPrintOfficial } from '../core/permissions.js';
import { store } from '../core/store.js';
import { router } from '../core/router.js';
import { openModal } from './modal.js';
import { showToast } from './toast.js';

const PRINT_FONTS = [
  'Arial',
  'Times New Roman',
  'Roboto',
  'Poppins',
  'Garamond',
  'Georgia',
  'Verdana',
  'Calibri'
];

export function openOfficialPrintDialog(targetSelector = '#app-main') {
  const user = store.getState().user;

  if (!canExportOrPrintOfficial(user)) {
    showToast('Fonctionnalité réservée aux comptes Premium.', 'info');
    router.navigate('premium');
    return;
  }

  const fontOptions = PRINT_FONTS.map(
    (font) => `<option value="${font}">${font}</option>`
  ).join('');

  openModal({
    title: 'Impression Officielle A4 — EMM-RDC',
    content: `
      <div class="form-stack">
        <div class="form-group">
          <label for="print-font-family">Police de caractères</label>
          <select id="print-font-family">${fontOptions}</select>
        </div>
        <div class="form-group">
          <label for="print-font-size">Taille du texte (10 px à 24 px)</label>
          <input id="print-font-size" type="number" min="10" max="24" value="12" />
        </div>
      </div>
    `,
    footer: `
      <button type="button" class="btn-secondary" data-modal-close="true">Annuler</button>
      <button type="button" id="btn-launch-print" class="btn-primary">🖨️ Imprimer en A4</button>
    `,
    onMount: (dialog, close) => {
      dialog.querySelector('#btn-launch-print')?.addEventListener('click', () => {
        const font = dialog.querySelector('#print-font-family')?.value || 'Arial';
        const size = Math.min(24, Math.max(10, Number(dialog.querySelector('#print-font-size')?.value) || 12));
        const target = document.querySelector(targetSelector);

        if (target) {
          target.style.setProperty('--print-font-family', font);
          target.style.setProperty('--print-font-size', `${size}px`);
        }

        close();
        setTimeout(() => window.print(), 150);
      });
    }
  });
}
