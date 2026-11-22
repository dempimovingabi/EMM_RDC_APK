// js/config/constants.js
// Constantes métier et référentiels officiels — EMM RD CONGO

export const APP_CONFIG = {
  appName: 'EMM RD CONGO',
  shortName: 'EMM RDC',
  churchName: 'ÉGLISE MESSIANIQUE MONDIALE',
  countryLabel: 'République Démocratique du Congo',
  storageKey: 'emm_rdc_data',
  splashMinDurationMs: 3800
};

export const PROVINCES_RDC = [
  'BAS-UELE',
  'ÉQUATEUR',
  'HAUT-KATANGA',
  'HAUT-LOMAMI',
  'HAUT-UELE',
  'ITURI',
  'KASAÏ',
  'KASAÏ-CENTRAL',
  'KASAÏ-ORIENTAL',
  'KINSHASA',
  'KONGO-CENTRAL',
  'KWANGO',
  'KWILU',
  'LOMAMI',
  'LUALABA',
  'MAÏ-NDOMBE',
  'MANIEMA',
  'MONGALA',
  'NORD-KIVU',
  'NORD-UBANGI',
  'SANKURU',
  'SUD-KIVU',
  'SUD-UBANGI',
  'TANGANYIKA',
  'TSHOPO',
  'TSHUAPA'
];

export const PROVINCE_UNCLASSIFIED = 'À CLASSER / AUTRES PROVINCES';

export const ENTITY_TYPES = [
  'Centre de formation',
  'Johrei Center',
  'Unité religieuse',
  'Foyer de Lumière',
  'Noyau de salut'
];

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN_PROVINCIAL: 'admin_provincial',
  UTILISATEUR: 'utilisateur'
};

export const ROLE_LABELS = {
  super_admin: 'Super Administrateur',
  admin_provincial: 'Administrateur Provincial',
  utilisateur: 'Utilisateur'
};

export const COLLECTIONS = {
  USERS: 'users',
  FREQ_DIFF_JOUR: 'freq_diff_jour',
  FREQ_DIFF_MOIS: 'freq_diff_mois',
  FREQ_NUMERIQUE: 'freq_numerique',
  FREQ_CULTE_NATIONAL: 'freq_culte_national',
  CANDIDATS: 'candidats',
  VERSEMENTS: 'versements',
  DEPOUILLEMENTS: 'depouillements',
  DEPOUILLEMENT_LIGNES: 'depouillement_lignes',
  PATRIMOINE_BIENS: 'patrimoine_biens',
  PATRIMOINE_MOUVEMENTS: 'patrimoine_mouvements',
  DEPENSES: 'depenses',
  ANNONCES: 'annonces'
};

export const FINANCE_MOTIFS = [
  'Initiation',
  'Ré-initiation',
  'Goshintai',
  'Shoku',
  'Kannon',
  'Mitamaya',
  'Sorei',
  'Photo'
];

export const FINANCE_CURRENCIES = ['USD', 'FC'];

export const PREMIUM_PLANS = [
  {
    id: 'mensuel',
    label: 'Forfait Mensuel',
    priceUsd: 5,
    durationDays: 30
  },
  {
    id: 'trimestriel',
    label: 'Forfait Trimestriel',
    priceUsd: 12,
    durationDays: 90
  },
  {
    id: 'annuel',
    label: 'Forfait Annuel',
    priceUsd: 40,
    durationDays: 365
  }
];
