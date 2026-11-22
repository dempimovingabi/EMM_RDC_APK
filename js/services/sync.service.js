// js/services/sync.service.js
// File d'attente et synchronisation différée hors ligne -> Cloud — EMM RD CONGO

import { loadLocalData, saveLocalData } from './local-db.service.js';
import { store } from '../core/store.js';

class SyncService {
  constructor() {
    this.remoteWriter = null;
    this.isSyncing = false;
  }

  setRemoteWriter(writerFn) {
    this.remoteWriter = typeof writerFn === 'function' ? writerFn : null;
  }

  enqueue(operation) {
    const db = loadLocalData();
    const entry = {
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      ...operation
    };
    db.syncQueue.push(entry);
    saveLocalData(db);
    store.setState({ syncPendingCount: db.syncQueue.length });

    if (store.getState().isOnline) {
      this.flush();
    }
    return entry;
  }

  getPendingCount() {
    return loadLocalData().syncQueue.length;
  }

  async flush() {
    if (this.isSyncing || !this.remoteWriter || !store.getState().isOnline) {
      return { flushed: 0, remaining: this.getPendingCount() };
    }

    this.isSyncing = true;
    let flushed = 0;

    try {
      const db = loadLocalData();
      const remaining = [];

      for (const item of db.syncQueue) {
        try {
          await this.remoteWriter(item);
          flushed += 1;
        } catch (err) {
          console.warn('Échec synchro élément, conservé en file :', item.id, err);
          remaining.push(item);
        }
      }

      db.syncQueue = remaining;
      saveLocalData(db);
      store.setState({ syncPendingCount: remaining.length });

      return { flushed, remaining: remaining.length };
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncService = new SyncService();
