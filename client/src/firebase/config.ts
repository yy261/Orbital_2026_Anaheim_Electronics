// Firebase initialisation.
//
// All env vars use the VITE_ prefix because we are on Vite (not Create
// React App). Vite only exposes vars that start with VITE_ to client-side
// code — anything else is silently dropped. The actual values live in
// /client/.env which is gitignored. See /client/.env.example for the list.
//
// We guard on apiKey so the app boots cleanly even before the team has
// filled in real Firebase keys. Once you add the keys to .env, restart
// `npm run dev` and the warning disappears.

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} else {
    // eslint-disable-next-line no-console
    console.warn(
        '[firebase] VITE_FIREBASE_API_KEY is not set. Firebase is not initialised. ' +
            'Copy client/.env.example to client/.env and fill in your Firebase config to enable auth and Firestore.'
    );
}

export { app, auth, db };
