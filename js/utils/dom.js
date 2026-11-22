// js/utils/dom.js
// Utilitaires DOM et protection XSS — EMM RD CONGO

export function escapeHTML(value) {
  const str = value === null || value === undefined ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatNumberFr(num) {
  const n = Number(num) || 0;
  return new Intl.NumberFormat('fr-FR').format(n);
}

export function formatCurrencyUsd(amount) {
  const n = Number(amount) || 0;
  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n)} $`;
}
