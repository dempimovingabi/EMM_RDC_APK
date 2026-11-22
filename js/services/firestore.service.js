// js/services/firestore.service.js
// Accès unifié Cloud Firestore avec repli local — EMM RD CONGO

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from './firebase.service.js';
import { getLocalCollection, setLocalCollection } from './local-db.service.js';
import { isAppOnline } from '../core/online-status.js';

export async function listDocuments(collectionName) {
  const localItems = getLocalCollection(collectionName);

  if (!isAppOnline()) {
    return localItems;
  }

  try {
    const snap = await getDocs(collection(db, collectionName));
    const remoteItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setLocalCollection(collectionName, remoteItems);
    return remoteItems;
  } catch (err) {
    console.warn(`Repli cache local pour "${collectionName}" :`, err);
    return localItems;
  }
}

export async function getDocument(collectionName, docId) {
  if (!docId) return null;

  if (isAppOnline()) {
    try {
      const snap = await getDoc(doc(db, collectionName, docId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
    } catch (err) {
      console.warn(`Lecture Firestore "${collectionName}/${docId}" échouée :`, err);
    }
  }

  const localItems = getLocalCollection(collectionName);
  return localItems.find((item) => item.id === docId) || null;
}

export async function setDocument(collectionName, docId, payload) {
  const id = docId || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const record = { ...payload, id, updatedAt: new Date().toISOString() };

  const localItems = getLocalCollection(collectionName);
  const idx = localItems.findIndex((item) => item.id === id);
  if (idx >= 0) {
    localItems[idx] = record;
  } else {
    localItems.push(record);
  }
  setLocalCollection(collectionName, localItems);

  if (isAppOnline()) {
    await setDoc(doc(db, collectionName, id), record, { merge: true });
  }

  return record;
}

export async function updateDocument(collectionName, docId, patch) {
  const updatedPatch = { ...patch, updatedAt: new Date().toISOString() };

  const localItems = getLocalCollection(collectionName);
  const idx = localItems.findIndex((item) => item.id === docId);
  if (idx >= 0) {
    localItems[idx] = { ...localItems[idx], ...updatedPatch };
    setLocalCollection(collectionName, localItems);
  }

  if (isAppOnline()) {
    await updateDoc(doc(db, collectionName, docId), updatedPatch);
  }

  return idx >= 0 ? localItems[idx] : { id: docId, ...updatedPatch };
}

export async function deleteDocument(collectionName, docId) {
  const localItems = getLocalCollection(collectionName).filter((item) => item.id !== docId);
  setLocalCollection(collectionName, localItems);

  if (isAppOnline()) {
    await deleteDoc(doc(db, collectionName, docId));
  }

  return true;
}
