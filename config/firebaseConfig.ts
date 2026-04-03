import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB3aM19r5DSNKsF7xr_AxWcULuCAmlYnUM",
  authDomain: "colg-app-3ac3b.firebaseapp.com",
  projectId: "colg-app-3ac3b",
  storageBucket: "colg-app-3ac3b.firebasestorage.app",
  messagingSenderId: "519153632329",
  appId: "1:519153632329:web:a48b50d752b834358cab98",
};
// Initialize app
// Initialize Firebase app only once
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const storage = getStorage(app);

// Note: Auth will be initialized in AuthContext with persistence,
// so we do NOT export auth from here.
export { app };