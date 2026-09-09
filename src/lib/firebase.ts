import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import configJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  projectId: configJson.projectId,
  appId: configJson.appId,
  apiKey: configJson.apiKey,
  authDomain: configJson.authDomain,
  firestoreDatabaseId: configJson.firestoreDatabaseId,
  storageBucket: configJson.storageBucket,
  messagingSenderId: configJson.messagingSenderId,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = configJson.firestoreDatabaseId
    ? getFirestore(app, configJson.firestoreDatabaseId)
    : getFirestore(app);
} catch (err) {
  console.warn('Firebase não pôde ser inicializado no ambiente atual (modo offline ativo):', err);
}

export { app, db, firebaseConfig };
