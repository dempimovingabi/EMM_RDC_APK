// js/services/local-db.service.js
// Persistance locale résiliente (emm_rdc_data) — EMM RD CONGO

import { APP_CONFIG } from '../config/constants.js';

export const INITIAL_CULTE_REFERENCE = {
  culteDate: '2026-11-15',
  updatedAt: new Date().toISOString(),
  provinces: [
    {
      province: 'KINSHASA',
      entites: [
        { nom: 'KINSHASA — CENTRE DE FORMATION', type: 'Centre de formation', mb: 95, sy: 110, nv: 6, obs: '' },
        { nom: 'KINSHASA — JOHREI CENTER 1', type: 'Johrei Center', mb: 52, sy: 68, nv: 4, obs: '' },
        { nom: 'KINSHASA — JOHREI CENTER 2', type: 'Johrei Center', mb: 35, sy: 45, nv: 2, obs: '' },
        { nom: 'KINSHASA — FOYER 1', type: 'Foyer de Lumière', mb: 16, sy: 26, nv: 2, obs: '' },
        { nom: 'KINSHASA — FOYER 2', type: 'Foyer de Lumière', mb: 14, sy: 24, nv: 1, obs: '' },
        { nom: 'KINSHASA — FOYER 3', type: 'Foyer de Lumière', mb: 12, sy: 20, nv: 1, obs: '' }
      ]
    },
    {
      province: 'KASAÏ-CENTRAL',
      entites: [
        { nom: 'KANANGA — FOYER 1', type: 'Foyer de Lumière', mb: 6, sy: 55, nv: 3, obs: '' },
        { nom: 'KANANGA — FOYER 2', type: 'Foyer de Lumière', mb: 5, sy: 48, nv: 2, obs: '' },
        { nom: 'KANANGA — FOYER 3', type: 'Foyer de Lumière', mb: 5, sy: 45, nv: 2, obs: '' },
        { nom: 'KANANGA — FOYER 4', type: 'Foyer de Lumière', mb: 4, sy: 42, nv: 2, obs: '' },
        { nom: 'KANANGA — FOYER 5', type: 'Foyer de Lumière', mb: 4, sy: 40, nv: 2, obs: '' },
        { nom: 'KANANGA — FOYER 6', type: 'Foyer de Lumière', mb: 4, sy: 38, nv: 2, obs: '' },
        { nom: 'KASAÏ-CENTRAL — FOYER 7', type: 'Foyer de Lumière', mb: 3, sy: 36, nv: 2, obs: '' },
        { nom: 'KASAÏ-CENTRAL — FOYER 8', type: 'Foyer de Lumière', mb: 3, sy: 34, nv: 2, obs: '' },
        { nom: 'KASAÏ-CENTRAL — FOYER 9', type: 'Foyer de Lumière', mb: 3, sy: 32, nv: 2, obs: '' },
        { nom: 'KASAÏ-CENTRAL — FOYER 10', type: 'Foyer de Lumière', mb: 2, sy: 32, nv: 1, obs: '' },
        { nom: 'KASAÏ-CENTRAL — FOYER 11', type: 'Foyer de Lumière', mb: 2, sy: 30, nv: 1, obs: '' },
        { nom: 'KASAÏ-CENTRAL — FOYER 12', type: 'Foyer de Lumière', mb: 1, sy: 31, nv: 1, obs: '' }
      ]
    },
    {
      province: 'KASAÏ',
      entites: [
        { nom: 'TSHIKAPA — JOHREI CENTER', type: 'Johrei Center', mb: 8, sy: 82, nv: 7, obs: '' },
        { nom: 'KASAÏ — FOYER 1', type: 'Foyer de Lumière', mb: 4, sy: 60, nv: 5, obs: '' },
        { nom: 'KASAÏ — FOYER 2', type: 'Foyer de Lumière', mb: 4, sy: 56, nv: 4, obs: '' }
      ]
    },
    {
      province: 'KASAÏ-ORIENTAL',
      entites: [
        { nom: 'MBUJIMAYI — JOHREI CENTER 1', type: 'Johrei Center', mb: 14, sy: 54, nv: 0, obs: '' },
        { nom: 'MBUJIMAYI — JOHREI CENTER 2', type: 'Johrei Center', mb: 10, sy: 42, nv: 0, obs: '' },
        { nom: 'KASAÏ-ORIENTAL — FOYER 1', type: 'Foyer de Lumière', mb: 8, sy: 30, nv: 0, obs: '' }
      ]
    },
    {
      province: 'LOMAMI',
      entites: [
        { nom: 'KABINDA — FOYER 1', type: 'Foyer de Lumière', mb: 4, sy: 61, nv: 1, obs: '' }
      ]
    },
    {
      province: 'HAUT-KATANGA',
      entites: [
        { nom: 'LUBUMBASHI — FOYER 1', type: 'Foyer de Lumière', mb: 10, sy: 30, nv: 0, obs: '' },
        { nom: 'LUBUMBASHI — FOYER 2', type: 'Foyer de Lumière', mb: 9, sy: 28, nv: 0, obs: '' },
        { nom: 'HAUT-KATANGA — FOYER 3', type: 'Foyer de Lumière', mb: 8, sy: 26, nv: 0, obs: '' }
      ]
    },
    {
      province: 'LUALABA',
      entites: [
        { nom: 'KOLWEZI — FOYER 1', type: 'Foyer de Lumière', mb: 20, sy: 84, nv: 3, obs: '' },
        { nom: 'KOLWEZI — FOYER 2', type: 'Foyer de Lumière', mb: 18, sy: 78, nv: 3, obs: '' },
        { nom: 'LUALABA — FOYER 3', type: 'Foyer de Lumière', mb: 17, sy: 72, nv: 2, obs: '' }
      ]
    },
    {
      province: 'KONGO-CENTRAL',
      entites: [
        { nom: 'MATADI — JOHREI CENTER', type: 'Johrei Center', mb: 20, sy: 42, nv: 3, obs: '' },
        { nom: 'KONGO-CENTRAL — FOYER 1', type: 'Foyer de Lumière', mb: 13, sy: 30, nv: 2, obs: '' },
        { nom: 'KONGO-CENTRAL — FOYER 2', type: 'Foyer de Lumière', mb: 11, sy: 26, nv: 1, obs: '' }
      ]
    },
    {
      province: 'KWILU',
      entites: [
        { nom: 'BANDUNDU — FOYER 1', type: 'Foyer de Lumière', mb: 5, sy: 42, nv: 2, obs: '' },
        { nom: 'KIKWIT — FOYER 2', type: 'Foyer de Lumière', mb: 4, sy: 38, nv: 2, obs: '' },
        { nom: 'KWILU — FOYER 3', type: 'Foyer de Lumière', mb: 3, sy: 35, nv: 2, obs: '' },
        { nom: 'KWILU — FOYER 4', type: 'Foyer de Lumière', mb: 3, sy: 33, nv: 1, obs: '' },
        { nom: 'KWILU — FOYER 5', type: 'Foyer de Lumière', mb: 3, sy: 30, nv: 1, obs: '' }
      ]
    },
    {
      province: 'À CLASSER / AUTRES PROVINCES',
      entites: [
        { nom: 'ENTITÉ À CLASSER — JOHREI CENTER', type: 'Johrei Center', mb: 7, sy: 65, nv: 5, obs: '' },
        { nom: 'ENTITÉ À CLASSER — FOYER 1', type: 'Foyer de Lumière', mb: 5, sy: 55, nv: 4, obs: '' },
        { nom: 'ENTITÉ À CLASSER — FOYER 2', type: 'Foyer de Lumière', mb: 5, sy: 52, nv: 4, obs: '' },
        { nom: 'ENTITÉ À CLASSER — FOYER 3', type: 'Foyer de Lumière', mb: 5, sy: 50, nv: 3, obs: '' },
        { nom: 'ENTITÉ À CLASSER — FOYER 4', type: 'Foyer de Lumière', mb: 5, sy: 48, nv: 3, obs: '' },
        { nom: 'ENTITÉ À CLASSER — FOYER 5', type: 'Foyer de Lumière', mb: 4, sy: 45, nv: 3, obs: '' },
        { nom: 'ENTITÉ À CLASSER — FOYER 6', type: 'Foyer de Lumière', mb: 4, sy: 42, nv: 3, obs: '' },
        { nom: 'ENTITÉ À CLASSER — FOYER 7', type: 'Foyer de Lumière', mb: 4, sy: 40, nv: 3, obs: '' },
        { nom: 'ENTITÉ À CLASSER — FOYER 8', type: 'Foyer de Lumière', mb: 4, sy: 37, nv: 3, obs: '' },
        { nom: 'ENTITÉ À CLASSER — FOYER 9', type: 'Foyer de Lumière', mb: 4, sy: 35, nv: 2, obs: '' }
      ]
    }
  ]
};

function createDefaultStoreData() {
  return {
    culteNational: structuredClone
      ? structuredClone(INITIAL_CULTE_REFERENCE)
      : JSON.parse(JSON.stringify(INITIAL_CULTE_REFERENCE)),
    syncQueue: [],
    collections: {}
  };
}

export function loadLocalData() {
  try {
    const raw = localStorage.getItem(APP_CONFIG.storageKey);
    if (!raw) {
      const fresh = createDefaultStoreData();
      saveLocalData(fresh);
      return fresh;
    }
    const parsed = JSON.parse(raw);
    const fallback = createDefaultStoreData();
    return {
      ...fallback,
      ...parsed,
      culteNational: parsed.culteNational || fallback.culteNational,
      syncQueue: Array.isArray(parsed.syncQueue) ? parsed.syncQueue : [],
      collections: parsed.collections && typeof parsed.collections === 'object' ? parsed.collections : {}
    };
  } catch (err) {
    console.error('Erreur lecture localStorage emm_rdc_data :', err);
    return createDefaultStoreData();
  }
}

export function saveLocalData(data) {
  try {
    localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Erreur écriture localStorage emm_rdc_data :', err);
    return false;
  }
}

export function getLocalCollection(collectionName) {
  const db = loadLocalData();
  return Array.isArray(db.collections[collectionName]) ? db.collections[collectionName] : [];
}

export function setLocalCollection(collectionName, items = []) {
  const db = loadLocalData();
  db.collections[collectionName] = items;
  return saveLocalData(db);
}
