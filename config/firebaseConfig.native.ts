import { initializeApp } from "firebase/app";

import {
  initializeAuth,
  browserLocalPersistence,
  getAuth,
  type Auth,
} from "firebase/auth";

import { getFirestore } from "firebase/firestore";

import { getStorage } from "firebase/storage";

import { Platform } from "react-native";

// ================= FIREBASE CONFIG =================

const firebaseConfig = {
  apiKey:
    "AIzaSyB3aM19r5DSNKsF7xr_AxWcULuCAmlYnUM",

  authDomain:
    "colg-app-3ac3b.firebaseapp.com",

  projectId:
    "colg-app-3ac3b",

  storageBucket:
    "colg-app-3ac3b.appspot.com",

  messagingSenderId:
    "519153632329",

  appId:
    "1:519153632329:web:a48b50d752b834358cab98",
};

// ================= INITIALIZE APP =================

const app = initializeApp(firebaseConfig);

// ================= AUTH =================

let auth: Auth;

if (Platform.OS === "web") {
  auth = initializeAuth(app, {
    persistence:
      browserLocalPersistence,
  });
} else {
  auth = getAuth(app);
}

// ================= FIRESTORE =================

const db = getFirestore(app);

// ================= STORAGE =================

const storage = getStorage(app);

// ================= EXPORTS =================

export {
  app,
  auth,
  db,
  storage,
};