// js/services/premium.service.js
// Gestion des abonnements Premium et confirmation WhatsApp — EMM RD CONGO

import { PREMIUM_PLANS } from '../config/constants.js';
import { hasPremiumAccess } from '../core/permissions.js';
import { store } from '../core/store.js';

export function getPremiumPlans() {
  return PREMIUM_PLANS;
}

export function isCurrentUserPremium() {
  return hasPremiumAccess(store.getState().user);
}

export function buildWhatsAppConfirmationUrl(adminPhoneDigits, planLabel, userEmail, province) {
  const cleanPhone = String(adminPhoneDigits || '').replace(/\D+/g, '');
  const message = [
    'Bonjour Administrateur EMM RDC,',
    `Je souhaite activer/confirmer mon accès Premium (${planLabel}).`,
    `Compte : ${userEmail || 'Non précisé'}`,
    `Province : ${province || 'Non précisée'}`
  ].join('\n');

  const encoded = encodeURIComponent(message);
  return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}
