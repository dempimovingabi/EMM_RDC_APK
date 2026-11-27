// js/config/routes.js
// Définition des routes SPA — EMM RD CONGO (sans blocage Premium, avec Tutoriels)

import { USER_ROLES } from './constants.js';

const ALL_ROLES = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ADMIN_PROVINCIAL,
  USER_ROLES.UTILISATEUR
];

export const DEFAULT_GUEST_ROUTE = 'login';
export const DEFAULT_AUTHENTICATED_ROUTE = 'dashboard';

export const ROUTES = {
  login: {
    id: 'login',
    title: 'Connexion',
    icon: '🔐',
    requiresAuth: false,
    roles: [],
    showInBottomNav: false
  },
  dashboard: {
    id: 'dashboard',
    title: 'Tableau de Bord',
    icon: '🏠',
    requiresAuth: true,
    roles: ALL_ROLES,
    showInBottomNav: true,
    navSlot: 'primary'
  },
  frequences: {
    id: 'frequences',
    title: 'Fréquences',
    icon: '📊',
    requiresAuth: true,
    roles: ALL_ROLES,
    showInBottomNav: true,
    navSlot: 'primary'
  },
  finance: {
    id: 'finance',
    title: 'Finance',
    icon: '💰',
    requiresAuth: true,
    roles: ALL_ROLES,
    showInBottomNav: true,
    navSlot: 'primary'
  },
  depouillement: {
    id: 'depouillement',
    title: 'Dépouillement',
    icon: '🧾',
    requiresAuth: true,
    roles: ALL_ROLES,
    showInBottomNav: true,
    navSlot: 'menu'
  },
  patrimoine: {
    id: 'patrimoine',
    title: 'Patrimoine',
    icon: '🏛️',
    requiresAuth: true,
    roles: ALL_ROLES,
    showInBottomNav: true,
    navSlot: 'menu'
  },
  archives: {
    id: 'archives',
    title: 'Archives',
    icon: '🗂️',
    requiresAuth: true,
    roles: ALL_ROLES,
    showInBottomNav: true,
    navSlot: 'menu'
  },
  administration: {
    id: 'administration',
    title: 'Administration',
    icon: '⚙️',
    requiresAuth: true,
    roles: ALL_ROLES,
    showInBottomNav: true,
    navSlot: 'menu'
  },
  tutoriels: {
    id: 'tutoriels',
    title: 'Tutoriels & Guide',
    icon: '🎓',
    requiresAuth: true,
    roles: ALL_ROLES,
    showInBottomNav: false,
    navSlot: 'menu'
  }
};
