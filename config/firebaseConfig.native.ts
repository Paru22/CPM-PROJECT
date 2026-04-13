import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  browserLocalPersistence,
  Auth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyB3aM19r5DSNKsF7xr_AxWcULuCAmlYnUM",
  authDomain: "colg-app-3ac3b.firebaseapp.com",
  projectId: "colg-app-3ac3b",
  storageBucket: "colg-app-3ac3b.firebasestorage.app",
  messagingSenderId: "519153632329",
  appId: "1:519153632329:web:a48b50d752b834358cab98",
};

const app = initializeApp(firebaseConfig);

const auth: Auth = Platform.OS === "web"
  ? initializeAuth(app, { persistence: browserLocalPersistence })
  : (() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getReactNativePersistence } = require("firebase/auth");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    })();

export const db = getFirestore(app);
export { auth, app };