// js/utils/date.js
// Utilitaires de dates en français et périodes glissantes — EMM RD CONGO

export function formatTodayFr(date = new Date()) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

export function formatDateFr(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return String(isoDate);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(d);
}

/**
 * Retourne les 3 derniers mois glissants (ex. Nov, Déc, Jan) avec gestion du passage d'année
 */
export function getLastThreeMonths(referenceDate = new Date()) {
  const months = [];
  for (let offset = 2; offset >= 0; offset -= 1) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - offset, 1);
    const label = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(d);
    months.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: label.charAt(0).toUpperCase() + label.slice(1)
    });
  }
  return months;
}
