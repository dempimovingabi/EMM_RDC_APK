// js/core/province.context.js
// Gestion du contexte territorial (26 provinces RDC) — EMM RD CONGO

import { PROVINCES_RDC, PROVINCE_UNCLASSIFIED } from '../config/constants.js';
import { store } from './store.js';

export function getAvailableProvinces(includeUnclassified = false) {
  const list = [...PROVINCES_RDC];
  if (includeUnclassified) {
    list.push(PROVINCE_UNCLASSIFIED);
  }
  return list;
}

export function getActiveProvince() {
  return store.getState().activeProvince;
}

export function setActiveProvince(provinceName) {
  const clean = String(provinceName || '').trim().toUpperCase();
  if (!clean) return;

  store.setState({ activeProvince: clean });
  window.dispatchEvent(
    new CustomEvent('emm:province-changed', {
      detail: { province: clean }
    })
  );
}

export function filterByActiveProvince(items = [], fieldName = 'province') {
  const activeProvince = getActiveProvince();
  if (!activeProvince || activeProvince === 'TOUTES') {
    return items;
  }
  return items.filter(
    (item) => String(item?.[fieldName] || '').trim().toUpperCase() === activeProvince
  );
}
