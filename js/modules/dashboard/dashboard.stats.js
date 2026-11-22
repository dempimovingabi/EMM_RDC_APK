// js/modules/dashboard/dashboard.stats.js
// Agrégation des KPI et calcul trimestriel glissant — EMM RD CONGO

import { COLLECTIONS } from '../../config/constants.js';
import { loadLocalData } from '../../services/local-db.service.js';
import { listDocuments } from '../../services/firestore.service.js';
import { getLastThreeMonths } from '../../utils/date.js';

export function computeCulteTotals() {
  const db = loadLocalData();
  const provinces = db?.culteNational?.provinces || [];

  let mb = 0;
  let sy = 0;
  let nv = 0;
  let entitiesCount = 0;

  for (const bloc of provinces) {
    const entites = Array.isArray(bloc.entites) ? bloc.entites : [];
    entitiesCount += entites.length;
    for (const ent of entites) {
      mb += Number(ent.mb) || 0;
      sy += Number(ent.sy) || 0;
      nv += Number(ent.nv) || 0;
    }
  }

  return {
    mb,
    sy,
    nv,
    total: mb + sy + nv,
    entitiesCount,
    culteDate: db?.culteNational?.culteDate || ''
  };
}

function toUsd(amount, currency, rate) {
  const val = Number(amount) || 0;
  if (String(currency || 'USD').toUpperCase() === 'USD') {
    return val;
  }
  const tx = Number(rate) || 0;
  return tx > 0 ? val / tx : 0;
}

export async function computeDashboardMetrics(activeProvince = '') {
  const culte = computeCulteTotals();
  const months = getLastThreeMonths(new Date());

  const [versements, depenses] = await Promise.all([
    listDocuments(COLLECTIONS.VERSEMENTS),
    listDocuments(COLLECTIONS.DEPENSES)
  ]);

  const filterProv = (items) => {
    if (!activeProvince || activeProvince === 'TOUTES') return items;
    return items.filter(
      (i) => !i.province || String(i.province).toUpperCase() === activeProvince.toUpperCase()
    );
  };

  const provVersements = filterProv(versements);
  const provDepenses = filterProv(depenses);

  let totalRecettesUsd = 0;
  for (const v of provVersements) {
    totalRecettesUsd += toUsd(v.montant, v.devise, v.taux);
  }

  const series = months.map((m) => {
    const entrees = provVersements
      .filter((v) => String(v.date || '').startsWith(m.key))
      .reduce((acc, v) => acc + toUsd(v.montant, v.devise, v.taux), 0);

    const sorties = provDepenses
      .filter((d) => String(d.date || '').startsWith(m.key))
      .reduce((acc, d) => acc + toUsd(d.montant, d.devise || 'USD', d.taux || 1), 0);

    return {
      ...m,
      entrees: Math.round(entrees * 100) / 100,
      sorties: Math.round(sorties * 100) / 100
    };
  });

  return {
    culte,
    totalRecettesUsd: Math.round(totalRecettesUsd * 100) / 100,
    series
  };
}
