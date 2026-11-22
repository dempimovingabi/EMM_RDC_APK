// js/modules/auth/auth.controller.js
// Contrôleur d'authentification et chargement profil Firestore « users » — EMM RD CONGO

import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { auth, db } from '../../services/firebase.service.js';
import { COLLECTIONS, USER_ROLES } from '../../config/constants.js';
import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { DEFAULT_AUTHENTICATED_ROUTE, DEFAULT_GUEST_ROUTE } from '../../config/routes.js';

export async function fetchUserProfile(firebaseUser) {
  if (!firebaseUser) return null;

  const fallbackProfile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    role: USER_ROLES.UTILISATEUR,
    province: store.getState().activeProvince,
    premium: false,
    premiumExpire: null,
    phone: ''
  };

  try {
    const byUidSnap = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));
    if (byUidSnap.exists()) {
      return { ...fallbackProfile, ...byUidSnap.data(), uid: firebaseUser.uid };
    }

    if (firebaseUser.email) {
      const q = query(
        collection(db, COLLECTIONS.USERS),
        where('email', '==', firebaseUser.email)
      );
      const byEmailSnap = await getDocs(q);
      if (!byEmailSnap.empty) {
        const data = byEmailSnap.docs[0].data();
        return { ...fallbackProfile, ...data, uid: firebaseUser.uid };
      }
    }
  } catch (err) {
    console.warn('Chargement profil Firestore « users » en repli local :', err);
  }

  return fallbackProfile;
}

export async function loginUser(email, password) {
  const cleanEmail = String(email || '').trim();
  const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
  const profile = await fetchUserProfile(credential.user);
  store.setUser(profile);
  return profile;
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } finally {
    store.setUser(null);
    router.navigate(DEFAULT_GUEST_ROUTE);
  }
}

export async function resetPassword(email) {
  const cleanEmail = String(email || '').trim();
  await sendPasswordResetEmail(auth, cleanEmail);
}

export function initAuthListener() {
  return new Promise((resolve) => {
    let resolvedOnce = false;
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await fetchUserProfile(firebaseUser);
        store.setUser(profile);
        if (store.getState().initialized) {
          router.navigate(DEFAULT_AUTHENTICATED_ROUTE);
        }
      } else {
        store.setUser(null);
        if (store.getState().initialized) {
          router.navigate(DEFAULT_GUEST_ROUTE);
        }
      }

      if (!resolvedOnce) {
        resolvedOnce = true;
        resolve(store.getState().user);
      }
    });
  });
}
