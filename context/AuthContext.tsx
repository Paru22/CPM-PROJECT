import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { auth, db } from "../config/firebaseConfig.native";

export { auth };

// ==================== CONSTANTS ====================

const AUTH_USER_KEY = "@cpm_auth_user";
const AUTH_CREDENTIALS_KEY = "@cpm_auth_credentials";

// ==================== TYPES ====================

export type UserRole = "student" | "teacher" | "hod";

export interface TeacherRole {
  type: "subject_teacher" | "class_teacher" | "lab_incharge";
  department?: string;
  semester?: string;
  subjectCode?: string;
  subjectName?: string;
}

export interface AppUser {
  uid: string;
  email: string | null;
  name: string;
  role: UserRole;
  department: string;
  semester?: string;
  boardRollNo?: string;
  classRollNo?: string;
  phone?: string;
  parentPhoneNo?: string;
  address?: string;
  qualification?: string;
  photoURL?: string | null;
  teacherRoles?: TeacherRole[];
  status?: "pending" | "approved" | "rejected";
}

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsStudent: (boardRollNo: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// ==================== PROVIDER ====================

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isLoggingOut = useRef(false);

  // ==================== STORAGE HELPERS ====================

  const clearAllStorage = async () => {
    try {
      await AsyncStorage.multiRemove([AUTH_USER_KEY, AUTH_CREDENTIALS_KEY]);
      console.log("✅ All auth storage cleared");
    } catch (error) {
      console.error("Error clearing storage:", error);
    }
  };

  const saveUserToStorage = async (appUser: AppUser) => {
    try {
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(appUser));
      console.log("✅ User saved to storage:", appUser.uid);
    } catch (error) {
      console.error("Error saving user:", error);
    }
  };

  const saveCredentials = async (
    type: "teacher" | "student",
    identifier: string,
    password: string
  ) => {
    try {
      await AsyncStorage.setItem(
        AUTH_CREDENTIALS_KEY,
        JSON.stringify({ type, identifier, password })
      );
      console.log("✅ Credentials saved for:", type);
    } catch (error) {
      console.error("Error saving credentials:", error);
    }
  };

  // ==================== FETCH USER DATA ====================

  const fetchUserData = useCallback(async (uid: string): Promise<AppUser | null> => {
    try {
      // Check students collection
      const studentDoc = await getDoc(doc(db, "students", uid));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        return {
          uid: studentDoc.id,
          email: data.email || null,
          name: data.name || "",
          role: "student",
          department: data.department || "",
          semester: data.semester || "",
          boardRollNo: data.boardRollNo || "",
          classRollNo: data.classRollNo || data.rollNo || "",
          phone: data.phone || "",
          parentPhoneNo: data.parentPhone || "",
          address: data.address || "",
          status: data.status || data.requestStatus || "approved",
          photoURL: data.profileImage || null,
        };
      }

      // Check teachers collection
      const teacherDoc = await getDoc(doc(db, "teachers", uid));
      if (teacherDoc.exists()) {
        const data = teacherDoc.data();

        if (data.isActive === false) {
          return null;
        }

        const isHOD = data.role === "hod" || (Array.isArray(data.role) && data.role.includes("hod"));

        return {
          uid: teacherDoc.id,
          email: data.email || null,
          name: data.name || "",
          role: isHOD ? "hod" : "teacher",
          department: data.department || "",
          phone: data.phone || "",
          address: data.address || "",
          qualification: data.qualification || "",
          status: data.status || data.requestStatus || "approved",
          photoURL: data.profileImage || null,
        };
      }

      return null;
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  }, []);

  // ==================== LOGOUT ====================

  const logout = useCallback(async () => {
    console.log("🚪 Starting logout...");
    isLoggingOut.current = true;

    try {
      // 1. Clear AsyncStorage first
      await clearAllStorage();
      
      // 2. Clear Firebase Auth
      if (auth.currentUser) {
        await signOut(auth);
      }
      
      // 3. Reset state
      setUser(null);
      setFirebaseUser(null);
      
      console.log("✅ Logout completed successfully");
    } catch (error) {
      console.error("❌ Logout error:", error);
      setUser(null);
      setFirebaseUser(null);
    } finally {
      isLoggingOut.current = false;
    }
  }, []);

  // ==================== TEACHER LOGIN ====================

  const login = useCallback(async (email: string, password: string) => {
    console.log("🔐 Teacher login started...");
    
    const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const userData = await fetchUserData(credential.user.uid);
    
    if (!userData) {
      await logout();
      throw new Error("Account not found. Contact administrator.");
    }
    
    if (userData.status === "pending") {
      await logout();
      throw new Error("Your account is pending approval.");
    }
    
    if (userData.status === "rejected") {
      await logout();
      throw new Error("Your account has been rejected.");
    }
    
    // ✅ Set user data
    setUser(userData);
    setFirebaseUser(credential.user);
    await saveUserToStorage(userData);
    await saveCredentials("teacher", email.trim().toLowerCase(), password);
    
    console.log("✅ Teacher logged in:", userData.name, "Role:", userData.role);
  }, [fetchUserData, logout]);

  // ==================== STUDENT LOGIN ====================

  const loginAsStudent = useCallback(async (boardRollNo: string, password: string) => {
    console.log("🔐 Student login started...");
    
    const snap = await getDocs(
      query(collection(db, "students"), where("boardRollNo", "==", boardRollNo))
    );
    
    if (snap.empty) {
      throw new Error("No student found with this Board Roll Number.");
    }
    
    const studentDoc = snap.docs[0];
    const studentData = studentDoc.data();
    
    if (studentData.password !== password) {
      throw new Error("Invalid password. Please try again.");
    }
    
    const status = studentData.status || studentData.requestStatus || "approved";
    
    if (status === "pending") {
      throw new Error("Your account is pending approval.");
    }
    
    if (status === "rejected") {
      throw new Error("Your account has been rejected.");
    }
    
    const userData: AppUser = {
      uid: studentDoc.id,
      email: studentData.email || null,
      name: studentData.name || "",
      role: "student",
      department: studentData.department || "",
      semester: studentData.semester || "",
      boardRollNo: studentData.boardRollNo || boardRollNo,
      classRollNo: studentData.classRollNo || "",
      phone: studentData.phone || "",
      parentPhoneNo: studentData.parentPhone || "",
      address: studentData.address || "",
      status,
      photoURL: studentData.profileImage || null,
    };
    
    // ✅ Set user data
    setUser(userData);
    setFirebaseUser(null);
    await saveUserToStorage(userData);
    await saveCredentials("student", boardRollNo, password);
    
    console.log("✅ Student logged in:", userData.name);
  }, []);

  // ==================== AUTO-LOGIN (Only on app start) ====================

  const tryAutoLogin = useCallback(async () => {
    if (isLoggingOut.current) {
      console.log("⏸️ Skipping auto-login - logout in progress");
      return false;
    }
    
    try {
      const credJson = await AsyncStorage.getItem(AUTH_CREDENTIALS_KEY);
      if (!credJson) return false;
      
      const cred = JSON.parse(credJson);
      
      if (cred.type === "teacher") {
        const credential = await signInWithEmailAndPassword(auth, cred.identifier, cred.password);
        const userData = await fetchUserData(credential.user.uid);
        if (userData && userData.status === "approved") {
          setUser(userData);
          setFirebaseUser(credential.user);
          await saveUserToStorage(userData);
          return true;
        }
      } else if (cred.type === "student") {
        const snap = await getDocs(
          query(collection(db, "students"), where("boardRollNo", "==", cred.identifier))
        );
        if (!snap.empty) {
          const studentDoc = snap.docs[0];
          const data = studentDoc.data();
          const status = data.status || data.requestStatus || "approved";
          if (data.password === cred.password && status === "approved") {
            const userData = await fetchUserData(studentDoc.id);
            if (userData) {
              setUser(userData);
              setFirebaseUser(null);
              await saveUserToStorage(userData);
              return true;
            }
          }
        }
      }
      
      await clearAllStorage();
      return false;
    } catch (error) {
      console.log("Auto-login failed:", error);
      await clearAllStorage();
      return false;
    }
  }, [fetchUserData]);

  // ==================== AUTH STATE LISTENER ====================

  useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;
      
      if (isLoggingOut.current) {
        console.log("⏸️ Auth change ignored - logout in progress");
        return;
      }
      
      if (fbUser) {
        const userData = await fetchUserData(fbUser.uid);
        if (userData && userData.status === "approved") {
          setUser(userData);
          setFirebaseUser(fbUser);
          await saveUserToStorage(userData);
        } else {
          await logout();
        }
      } else {
        if (!isLoggingOut.current) {
          await tryAutoLogin();
        }
      }
      setLoading(false);
    });
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [fetchUserData, tryAutoLogin, logout]);

  // ==================== REFRESH USER ====================

  const refreshUser = useCallback(async () => {
    if (firebaseUser) {
      const userData = await fetchUserData(firebaseUser.uid);
      if (userData) {
        setUser(userData);
        await saveUserToStorage(userData);
      }
    }
  }, [firebaseUser, fetchUserData]);

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    login,
    loginAsStudent,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};