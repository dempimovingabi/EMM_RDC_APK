// js/core/store.js
// État global réactif de l'application — EMM RD CONGO

import { APP_CONFIG, PROVINCES_RDC, USER_ROLES } from '../config/constants.js';

const initialState = {
  initialized: false,
  splashDone: false,
  user: null, // { uid, email, role, province, premium, premiumExpire, phone }
  activeProvince: PROVINCES_RDC.includes('KASAÏ-CENTRAL') ? 'KASAÏ-CENTRAL' : PROVINCES_RDC[0],
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  darkMode: false,
  currentRoute: 'login',
  unreadNotifications: 0,
  syncPendingCount: 0,
  cache: {}
};

class Store {
  constructor() {
    this.state = { ...initialState };
    this.listeners = new Set();
    this._loadPreferences();
  }

  _loadPreferences() {
    try {
      const raw = localStorage.getItem(APP_CONFIG.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.activeProvince) {
          this.state.activeProvince = parsed.activeProvince;
        }
        if (typeof parsed.darkMode === 'boolean') {
          this.state.darkMode = parsed.darkMode;
        }
      }
      const savedDark = localStorage.getItem('emm_dark_mode');
      if (savedDark === 'true' || savedDark === 'false') {
        this.state.darkMode = savedDark === 'true';
      }
    } catch (err) {
      console.warn('Lecture préférences locales ignorée :', err);
    }
  }

  _persistPreferences() {
    try {
      localStorage.setItem('emm_dark_mode', String(this.state.darkMode));
      const raw = localStorage.getItem(APP_CONFIG.storageKey);
      const current = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        APP_CONFIG.storageKey,
        JSON.stringify({
          ...current,
          activeProvince: this.state.activeProvince,
          darkMode: this.state.darkMode
        })
      );
    } catch (err) {
      console.warn('Sauvegarde préférences locales ignorée :', err);
    }
  }

  getState() {
    return this.state;
  }

  setState(patch = {}) {
    const prevState = this.state;
    this.state = {
      ...prevState,
      ...patch
    };

    if ('activeProvince' in patch || 'darkMode' in patch) {
      this._persistPreferences();
    }

    this.listeners.forEach((listener) => {
      try {
        listener(this.state, prevState);
      } catch (err) {
        console.error('Erreur listener store :', err);
      }
    });
  }

  setUser(userProfile = null) {
    if (!userProfile) {
      this.setState({ user: null });
      return;
    }

    const normalizedUser = {
      uid: userProfile.uid || '',
      email: userProfile.email || '',
      role: userProfile.role || USER_ROLES.UTILISATEUR,
      province: userProfile.province || this.state.activeProvince,
      premium: Boolean(userProfile.premium) || userProfile.role === USER_ROLES.SUPER_ADMIN,
      premiumExpire: userProfile.premiumExpire || null,
      phone: userProfile.phone || ''
    };

    this.setState({
      user: normalizedUser,
      activeProvince: normalizedUser.province || this.state.activeProvince
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const store = new Store();
