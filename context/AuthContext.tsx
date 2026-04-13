import {
    User as FirebaseUser,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { auth, db } from "../config/firebaseConfig.native"; // ✅ import auth from config

export interface AppUser {
  uid: string;
  email: string | null;
  name: string;
  role: "hod" | "teacher" | "class_teacher" | "exam_coordinator" | "lab_incharge";
  department: string;
  phone?: string;
  photoURL?: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (uid: string): Promise<AppUser | null> => {
    try {
      const teacherDoc = await getDoc(doc(db, "teachers", uid));
      if (teacherDoc.exists()) {
        const data = teacherDoc.data();
        return {
          uid: teacherDoc.id,
          email: data.email || null,
          name: data.name || "",
          role: data.role || "teacher",
          department: data.department || "",
          phone: data.phone || "",
          photoURL: null,
        };
      }
      const adminDoc = await getDoc(doc(db, "admins", uid));
      if (adminDoc.exists()) {
        const data = adminDoc.data();
        return {
          uid: adminDoc.id,
          email: data.email || null,
          name: data.name || "",
          role: data.role || "hod",
          department: data.department || "",
          phone: data.phone || "",
          photoURL: null,
        };
      }
      console.warn("No user document found for uid:", uid);
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (firebaseUser) {
      const userData = await fetchUserData(firebaseUser.uid);
      setUser(userData);
    } else {
      setUser(null);
    }
  }, [firebaseUser, fetchUserData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const userData = await fetchUserData(fbUser.uid);
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [fetchUserData]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const userData = await fetchUserData(credential.user.uid);
      if (!userData) {
        throw new Error("User account not authorized (no role assigned)");
      }
      setUser(userData);
    } catch (error: any) {
      console.error("Login error:", error);
      throw new Error(error.message || "Login failed");
    }
  }, [fetchUserData]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (error: any) {
      console.error("Logout error:", error);
      throw new Error("Logout failed");
    }
  }, []);

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};