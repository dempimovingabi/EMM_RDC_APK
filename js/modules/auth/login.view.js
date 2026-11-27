// js/modules/auth/login.view.js
// Vue de connexion (LoginView) — EMM RD CONGO

import { APP_CONFIG } from '../../config/constants.js';
import { loginUser, resetPassword } from './auth.controller.js';
import { router } from '../../core/router.js';
import { DEFAULT_AUTHENTICATED_ROUTE } from '../../config/routes.js';
import { showToast } from '../../ui/toast.js';

export async function renderLoginView(container) {
  container.innerHTML = `
    <section class="login-screen">
      <div class="login-card">
        <div class="login-header">
          <img
            src="./assets/icons/logo-emm.png"
            alt="Logo EMM-RDC"
            class="login-logo"
            onerror="this.style.display='none';"
          />
          <h2>${APP_CONFIG.churchName}</h2>
          <p class="login-subtitle">${APP_CONFIG.shortName} — Connexion</p>
        </div>

        <form id="login-form" class="form-stack">
          <div class="form-group">
            <label for="login-email">Adresse e-mail</label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autocomplete="email"
              placeholder="exemple@emm-rdc.org"
            />
          </div>

          <div class="form-group">
            <label for="login-password">Mot de passe</label>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              autocomplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" id="btn-login-submit" class="btn-primary">
            Se connecter
          </button>
        </form>

        <div class="login-actions">
          <button type="button" id="btn-forgot-password" class="btn-link">
            Mot de passe oublié ?
          </button>
        </div>
      </div>
    </section>
  `;

  const form = container.querySelector('#login-form');
  const forgotBtn = container.querySelector('#btn-forgot-password');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value;
    const password = form.password.value;
    const submitBtn = container.querySelector('#btn-login-submit');

    try {
      if (submitBtn) submitBtn.disabled = true;
      await loginUser(email, password);
      showToast('Connexion réussie', 'success');
      router.navigate(DEFAULT_AUTHENTICATED_ROUTE);
    } catch (err) {
      console.error('Erreur connexion :', err);
      const code = err?.code || 'inconnu';
      const detail = err?.message ? ` (${err.message})` : '';
      showToast(`Échec connexion [${code}]${detail}`, 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  forgotBtn?.addEventListener('click', async () => {
    const email = form?.email?.value?.trim();
    if (!email) {
      showToast('Saisissez d’abord votre adresse e-mail ci-dessus.', 'info');
      return;
    }
    try {
      await resetPassword(email);
      showToast('E-mail de réinitialisation envoyé.', 'success');
    } catch (err) {
      console.error('Erreur réinitialisation mot de passe :', err);
      showToast(`Erreur réinitialisation [${err?.code || 'inconnu'}]`, 'error');
    }
  });
}
