// js/core/router.js
// Gestionnaire de navigation SPA sans rechargement — EMM RD CONGO

import { ROUTES, DEFAULT_AUTHENTICATED_ROUTE, DEFAULT_GUEST_ROUTE } from '../config/routes.js';
import { canAccessRoute } from './permissions.js';
import { store } from './store.js';

class Router {
  constructor() {
    this.handlers = new Map();
    this.containerSelector = '#app-main';
    this.fallbackHandler = null;
  }

  register(routeId, handler) {
    this.handlers.set(routeId, handler);
  }

  setFallback(handler) {
    this.fallbackHandler = handler;
  }

  getContainer() {
    return document.querySelector(this.containerSelector);
  }

  async navigate(routeId, params = {}) {
    const { user } = store.getState();
    let targetId = ROUTES[routeId]
      ? routeId
      : user
        ? DEFAULT_AUTHENTICATED_ROUTE
        : DEFAULT_GUEST_ROUTE;

    let routeConfig = ROUTES[targetId];

    if (routeConfig.requiresAuth && !user) {
      targetId = DEFAULT_GUEST_ROUTE;
      routeConfig = ROUTES[targetId];
    } else if (!canAccessRoute(user, routeConfig)) {
      targetId = DEFAULT_AUTHENTICATED_ROUTE;
      routeConfig = ROUTES[targetId];
    }

    store.setState({ currentRoute: targetId });

    const container = this.getContainer();
    if (!container) return;

    const handler = this.handlers.get(targetId) || this.fallbackHandler;
    if (!handler) {
      container.innerHTML = `
        <div class="card">
          <h2>${routeConfig.title}</h2>
          <p>Module en cours de préparation (${targetId}).</p>
        </div>
      `;
      return;
    }

    try {
      await handler(container, params, { route: routeConfig, user });
      window.dispatchEvent(
        new CustomEvent('emm:route-changed', {
          detail: { routeId: targetId, route: routeConfig, params }
        })
      );
    } catch (err) {
      console.error(`Erreur lors du rendu de la route "${targetId}" :`, err);
      container.innerHTML = `
        <div class="card">
          <h3>Erreur d'affichage</h3>
          <p>Impossible de charger la vue demandée pour le moment.</p>
        </div>
      `;
    }
  }
}

export const router = new Router();
