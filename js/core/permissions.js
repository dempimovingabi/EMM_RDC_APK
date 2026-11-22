// js/core/permissions.js
// Contrôle d'accès (RBAC) et statut Premium — EMM RD CONGO

import { USER_ROLES } from '../config/constants.js';

export function isSuperAdmin(user) {
  return Boolean(user && user.role === USER_ROLES.SUPER_ADMIN);
}

export function isAdminProvincial(user) {
  return Boolean(user && user.role === USER_ROLES.ADMIN_PROVINCIAL);
}

export function hasPremiumAccess(user) {
  if (!user) return false;
  if (user.role === USER_ROLES.SUPER_ADMIN) return true;
  if (!user.premium) return false;

  if (user.premiumExpire) {
    const expDate = new Date(user.premiumExpire);
    if (!Number.isNaN(expDate.getTime()) && expDate.getTime() < Date.now()) {
      return false;
    }
  }
  return true;
}

export function canAccessRoute(user, routeConfig) {
  if (!routeConfig) return false;
  if (!routeConfig.requiresAuth) return true;
  if (!user) return false;

  if (!Array.isArray(routeConfig.roles) || routeConfig.roles.length === 0) {
    return true;
  }
  return routeConfig.roles.includes(user.role);
}

export function canManageUsers(user) {
  return isSuperAdmin(user) || isAdminProvincial(user);
}

export function canManagePremiumClients(user) {
  return isSuperAdmin(user);
}

export function canBackupRestore(user) {
  return isSuperAdmin(user);
}

export function canPublishAnnouncement(user) {
  return isSuperAdmin(user) || isAdminProvincial(user);
}

export function canExportOrPrintOfficial(user) {
  return hasPremiumAccess(user);
}
