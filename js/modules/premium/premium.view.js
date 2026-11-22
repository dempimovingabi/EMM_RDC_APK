// js/modules/premium/premium.view.js
// Espace Abonnement Premium & confirmation WhatsApp — EMM RD CONGO

import { APP_CONFIG } from '../../config/constants.js';
import { getPremiumPlans, buildWhatsAppConfirmationUrl } from '../../services/premium.service.js';
import { hasPremiumAccess } from '../../core/permissions.js';
import { store } from '../../core/store.js';
import { escapeHTML, formatCurrencyUsd } from '../../utils/dom.js';

const ADMIN_WHATSAPP_NUMBER = '243000000000'; // Remplacez par le numéro WhatsApp de l'administrateur

export async function renderPremiumView(container) {
  const { user, activeProvince } = store.getState();
  const isPremium = hasPremiumAccess(user);
  const plans = getPremiumPlans();

  const plansHtml = plans
    .map((plan) => {
      const waUrl = buildWhatsAppConfirmationUrl(
        ADMIN_WHATSAPP_NUMBER,
        plan.label,
        user?.email || '',
        activeProvince
      );
      return `
        <div class="card" style="margin:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <strong>${escapeHTML(plan.label)}</strong>
            <span style="font-weight:800;color:var(--green-main);">${formatCurrencyUsd(plan.priceUsd)}</span>
          </div>
          <p style="margin:6px 0 12px;font-size:0.82rem;color:var(--text-muted);">
            Accès complet à l'impression officielle A4 et aux exports avancés (${plan.durationDays} jours).
          </p>
          <a
            href="${escapeHTML(waUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-primary"
            style="display:inline-block;text-decoration:none;text-align:center;width:100%;"
          >
            Confirmer sur WhatsApp
          </a>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `
    <section class="module-page premium-page">
      <div class="page-header">
        <h2>Espace Premium — ${escapeHTML(APP_CONFIG.shortName)}</h2>
      </div>

      <div class="card">
        <div style="font-size:0.92rem;">
          Statut de votre compte (<strong>${escapeHTML(user?.email || '')}</strong>) :
          <strong style="color:${isPremium ? 'var(--green-main)' : '#b45309'};">
            ${isPremium ? '⭐ PREMIUM ACTIF' : 'Compte Standard'}
          </strong>
        </div>
        <p style="margin:8px 0 0;font-size:0.84rem;color:var(--text-muted);">
          Paiement Mobile Money (Airtel Money / M-Pesa) : après règlement, cliquez sur le forfait choisi pour envoyer la confirmation directement à l'administrateur sur WhatsApp.
        </p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
        ${plansHtml}
      </div>
    </section>
  `;
}
